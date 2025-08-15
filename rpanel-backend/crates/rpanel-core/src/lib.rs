//! rpanel-core
//! 核心数据模型 + 采集器接口 + 线程安全的快照存储。

#![deny(unused_imports, unused_must_use)]
#![forbid(unsafe_code)]

use parking_lot::RwLock;
use serde::{Deserialize, Serialize};
use std::{sync::Arc, time::{SystemTime, UNIX_EPOCH}};
use tokio::task::JoinHandle as TokioJoinHandle;
use tokio_util::sync::CancellationToken; // 直接使用原类型，不再对外 re-export

// --------- 对外导出：类型别名 ----------
pub type JoinHandle<T> = TokioJoinHandle<T>;

// --------- 工具函数 ----------
#[inline]
pub fn now_ms() -> u128 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis()
}

// --------- 数据模型 ----------
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct CpuSummary {
    pub usage_percent: f32, // 0.0 ~ 100.0
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct MemorySummary {
    pub total_bytes: u64,
    pub used_bytes: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct DiskSummary {
    pub mount: String,   // 目前固定 "/"，后续可扩展
    pub total_bytes: u64,
    pub used_bytes: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct NetIfStat {
    pub iface: String,
    pub rx_bps: u64,                // bit/s
    pub tx_bps: u64,                // bit/s
    pub link_mbps: Option<u64>,     // 物理链路速率（Mb/s）
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct MetricsSummary {
    pub cpu: CpuSummary,
    pub memory: MemorySummary,
    pub disk: DiskSummary,
    pub net: Vec<NetIfStat>,
    pub ts: u128,           // 采样时间戳（ms）
    pub cpu_cores: u32,     // 服务器逻辑核心数
}

// --------- 线程安全快照存储 ----------
#[derive(Clone, Default)]
pub struct SnapshotStore(Arc<RwLock<MetricsSummary>>);

impl SnapshotStore {
    pub fn new() -> Self { Self::default() }
    pub fn get(&self) -> MetricsSummary { self.0.read().clone() }
    pub fn set(&self, snap: MetricsSummary) { *self.0.write() = snap; }
}

// --------- 采集器接口（原生 2024 写法） ----------
pub trait Collector: Send + Sync + 'static {
    /// 启动后台采集任务：
    /// - `store`：写入最新快照
    /// - `cancel`：外部可调用 `cancel.cancel()` 来优雅结束任务
    fn spawn(self: Box<Self>, store: SnapshotStore, cancel: CancellationToken) -> JoinHandle<()>;
}
