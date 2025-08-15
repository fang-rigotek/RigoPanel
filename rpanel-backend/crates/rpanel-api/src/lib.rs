//! rpanel-api
//! 提供 Axum Router：/api/v1/metrics/summary

#![deny(unused_imports, unused_must_use)]
#![forbid(unsafe_code)]

use axum::{routing::get, Router};
use rpanel_core::SnapshotStore;

#[derive(Clone)]
pub struct ApiState {
    pub store: SnapshotStore,
}

pub fn build_router(state: ApiState) -> Router {
    Router::new()
        .route("/api/v1/metrics/summary", get(summary))
        .with_state(state)
}

async fn summary(axum::extract::State(state): axum::extract::State<ApiState>) -> axum::Json<rpanel_core::MetricsSummary> {
    axum::Json(state.store.get())
}
