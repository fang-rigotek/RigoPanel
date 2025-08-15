//! rpanel-api
//! - 提供 HTTP 服务，暴露 JSON API。
//! - 与核心的 SnapshotStore 解耦，只负责把当前快照返回给前端。

use axum::{extract::State, http::Method, routing::get, Json, Router};
use rpanel_core::{MetricsSummary, SnapshotStore};
use tower_http::cors::{Any, CorsLayer};

#[derive(Clone)]
pub struct ApiState {
    pub store: SnapshotStore,
}

pub fn app(state: ApiState) -> Router {
    // CORS：允许前端 dev 源访问（5173）
    // 生产可改为具体域名与 HTTPS
    let cors = CorsLayer::new()
        .allow_origin(Any) // 开发阶段先放开，生产建议收紧
        .allow_methods([Method::GET])
        .allow_headers(Any);

    Router::new()
        .route("/api/v1/metrics/summary", get(get_summary))
        .with_state(state)
        .layer(cors)
}

async fn get_summary(State(state): State<ApiState>) -> Json<MetricsSummary> {
    Json(state.store.get())
}
