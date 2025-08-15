//! rpanel-core
//! -----------------------------
//! 角色：平台核心库（Core）
//! - 定义跨模块共享的数据模型（会被序列化为 JSON 返回给前端）。
//! - 提供线程安全的快照存储 `SnapshotStore`（采集器写，API 读）。
//! - 定义采集器接口 `Collector`（无 async-trait）：返回 `JoinHandle<()>`，并支持取消令牌。
//!
//! 设计说明：
//! - 平台（可执行程序）只负责注册采集器、启动/停止、组合 API，不直接处理采样细节。
//! - 采集器实现方（各独立 crate/模块）通过实现 `Collector::spawn` 把自身作为独立任务运行，
//!   定期将最新快照写入 `SnapshotStore`。
//! - 将来可把某些采集器升级为独立进程，通过 IPC/HTTP 注册到平台；核心接口不变。

use parking_lot::RwLock;                // 轻量级读写锁，内存占用与性能更优
use serde::{Deserialize, Serialize};     // 序列化/反序列化，用于对外 JSON
use std::sync::Arc;                      // 线程安全共享指针
use std::time::SystemTime;               // 时间戳使用
pub use tokio::task::JoinHandle;         // 向外导出 JoinHandle，调用方无需再引 tokio
use tokio_util::sync::CancellationToken; // 取消令牌，用于优雅停止任务

// ======================
// =   数据模型定义     =
// ======================
// 这些结构会被序列化为 JSON，字段名与前端的 `src/types.ts` 一致或等价。
// 注意：字段名采用 snake_case（Rust 惯例），前端会按相同字段名解析。

/// CPU 概览（百分比 0~100）
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct CpuSummary {
    /// CPU 使用率（百分比 0~100）
    pub usage_percent: f32,
}

/// 内存概览（字节）
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct MemorySummary {
    /// 总内存（字节）
    pub total_bytes: u64,
    /// 已用内存（字节）
    pub used_bytes: u64,
}

/// 磁盘概览（以某挂载点为单位，这里 MVP 固定为根分区 "/"）
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct DiskSummary {
    /// 挂载点（例如 "/"）
    pub mount: String,
    /// 总容量（字节）
    pub total_bytes: u64,
    /// 已用容量（字节）
    pub used_bytes: u64,
}

/// 网卡单项统计
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NetIfStat {
    /// 网卡名（例如 "eth0"）
    pub iface: String,
    /// 下行速率（bit/s）
    pub rx_bps: u64,
    /// 上行速率（bit/s）
    pub tx_bps: u64,
    /// 链路速率（Mbps，可选；未知时为 None）
    pub link_mbps: Option<u64>,
}

impl Default for NetIfStat {
    fn default() -> Self {
        Self {
            iface: String::new(),
            rx_bps: 0,
            tx_bps: 0,
            link_mbps: None,
        }
    }
}

/// 整体指标快照（首页所需）
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct MetricsSummary {
    /// CPU 概览
    pub cpu: CpuSummary,
    /// 内存概览
    pub memory: MemorySummary,
    /// 磁盘概览（当前仅根分区）
    pub disk: DiskSummary,
    /// 网络概览（多网卡）
    pub net: Vec<NetIfStat>,
    /// 采样时间戳（毫秒）
    pub ts: u128,
}

// ==================================
// =   线程安全快照存储 Snapshot    =
// ==================================
// - 内部用 Arc<RwLock<MetricsSummary>> 实现，读多写少的场景性能好、内存占用低。
// - 采集器每次采样完成后调用 `set` 写入；API 每次请求调用 `get` 读取。

/// 快照存储（读写锁封装）
#[derive(Clone)]
pub struct SnapshotStore(Arc<RwLock<MetricsSummary>>);

impl SnapshotStore {
    /// 新建一个空存储（内部初始化为默认快照）
    pub fn new() -> Self {
        Self(Arc::new(RwLock::new(MetricsSummary::default())))
    }

    /// 读取当前快照（返回克隆后的结构体，避免持锁时间过长）
    pub fn get(&self) -> MetricsSummary {
        self.0.read().clone()
    }

    /// 写入最新快照（一次替换）
    pub fn set(&self, snap: MetricsSummary) {
        *self.0.write() = snap;
    }
}

// ==============================
// =   采集器接口（无宏版本）   =
// ==============================
// 设计思想：
// - 不使用 async-trait 宏，避免额外依赖与编译负担；
// - 要求实现方提供 `spawn` 方法，内部自行 `tokio::spawn` 启动异步循环；
// - 平台持有返回的 `JoinHandle<()>`，在退出时可 `abort()` 或通过 `CancellationToken` 优雅停止。

/// 采集器接口：将自身作为独立任务运行，周期采样并写入 `SnapshotStore`。
pub trait Collector: Send + Sync + 'static {
    /// 启动采集器任务：
    /// - `store`：共享快照存储（写入点）
    /// - `cancel`：取消令牌（平台可用来通知任务退出）
    /// - 返回：任务句柄 `JoinHandle<()>`，平台可记录以便控制/监控
    fn spawn(self: Box<Self>, store: SnapshotStore, cancel: CancellationToken) -> JoinHandle<()>;
}

// ======================
// =   错误与工具函数   =
// ======================

/// 统一错误类型（可扩展）
#[derive(thiserror::Error, Debug)]
pub enum RpanelError {
    /// IO 错误（例如读取 /proc /sys 失败）
    #[error("io error: {0}")]
    Io(#[from] std::io::Error),

    /// 解析错误（例如字符串转数字失败）
    #[error("parse error: {0}")]
    Parse(String),
}

/// 工具：获取当前毫秒时间戳（Unix 时间）
pub fn now_ms() -> u128 {
    SystemTime::now()
        .duration_since(SystemTime::UNIX_EPOCH)
        .unwrap()
        .as_millis()
}
