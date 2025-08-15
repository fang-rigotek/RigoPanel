use rpanel_api::{app, ApiState};
use rpanel_collector_sys::SysCollector;
use rpanel_core::{Collector, SnapshotStore};
use std::net::SocketAddr;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};
use tokio_util::sync::CancellationToken; // ← 新增

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // 日志初始化（同前）
    tracing_subscriber::registry()
        .with(tracing_subscriber::EnvFilter::new(
            std::env::var("RUST_LOG").unwrap_or_else(|_| "info,tower_http=info".into()),
        ))
        .with(tracing_subscriber::fmt::layer())
        .init();

    let store = SnapshotStore::new();

    // 采集器取消令牌集合（平台可统一停止）
    let cancel = CancellationToken::new();
    let mut _handles = Vec::new();

    // 注册系统采集器
    let sys = SysCollector::new();
    _handles.push(Box::new(sys).spawn(store.clone(), cancel.child_token()));

    // HTTP API
    let state = ApiState { store };
    let app = app(state);

    let host = std::env::var("RPANEL_HOST").unwrap_or_else(|_| "0.0.0.0".into());
    let port: u16 = std::env::var("RPANEL_PORT").ok().and_then(|s| s.parse().ok()).unwrap_or(8080);
    let addr: SocketAddr = format!("{}:{}", host, port).parse().unwrap();

    tracing::info!("rpanel API listening on http://{}", addr);

    // 优雅退出：当 serve 返回（出错或被关闭）后，取消所有采集器
    let res = axum::serve(
        tokio::net::TcpListener::bind(addr).await?,
        app.into_make_service_with_connect_info::<SocketAddr>(),
    )
    .await;

    // 触发取消
    cancel.cancel();

    // 结束：可等待所有采集器完成（可选）
    for h in _handles {
        let _ = h.abort(); // 简化处理：直接 abort；也可以改成等待 join
    }

    res?;
    Ok(())
}
