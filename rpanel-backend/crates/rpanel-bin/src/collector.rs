//! 采集器生命周期：启动/停止/等待

use rpanel_collector_sys::SysCollector;
use rpanel_core::{Collector, JoinHandle, SnapshotStore};
use tokio_util::sync::CancellationToken;
use tracing::info;

pub fn start_collector(store: SnapshotStore) -> (CancellationToken, JoinHandle<()>) {
    let cancel = CancellationToken::new();
    // 关键：Collector::spawn 定义为 self: Box<Self> —— 需要装箱
    let handle = Box::new(SysCollector::new()).spawn(store.clone(), cancel.clone());
    info!("SysCollector started.");
    (cancel, handle)
}

pub async fn join_with_timeout(handle: JoinHandle<()>, timeout: std::time::Duration) {
    let _ = tokio::time::timeout(timeout, handle).await;
}
