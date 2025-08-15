//! HTTP 服务器：监听 + 优雅关闭

use axum::Router;
use std::net::SocketAddr;
use tokio::net::TcpListener;
use tracing::info;

pub async fn serve(addr: SocketAddr, app: Router) -> anyhow::Result<()> {
    let listener = TcpListener::bind(addr).await?;
    let bound = listener.local_addr()?;
    info!("rpanel API listening on http://{}", bound);

    let server = axum::serve(listener, app.into_make_service())
        .with_graceful_shutdown(async {
            // Ctrl-C 触发优雅退出
            let _ = tokio::signal::ctrl_c().await;
        });

    server.await?;
    Ok(())
}
