//! rpanel-bin
//! 组装：配置 + 采集器 + HTTP 服务

#![deny(unused_imports, unused_must_use)]
#![forbid(unsafe_code)]

mod config;
mod collector;
mod server;

use axum::Router;
use rpanel_api::{build_router, ApiState};
use rpanel_core::SnapshotStore;
use tracing::{info, Level};

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // 日志
    tracing_subscriber::fmt()
        .with_max_level(Level::INFO)
        .with_target(false)
        .compact()
        .init();

    // 配置
    let cfg = config::load();

    // 共享快照
    let store = SnapshotStore::new();

    // 启动采集器（内部已正确装箱）
    let (cancel, handle) = collector::start_collector(store.clone());

    // HTTP 路由
    let state = ApiState { store };
    let app: Router = build_router(state);

    // 启动服务器（Ctrl-C 优雅退出）
    server::serve(cfg.addr, app).await?;

    // 关闭采集器
    cancel.cancel();
    collector::join_with_timeout(handle, std::time::Duration::from_secs(1)).await;

    info!("RPanel shutdown complete.");
    Ok(())
}
