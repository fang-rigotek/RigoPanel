#!/usr/bin/env bash
set -euo pipefail

# 确保 rustup/cargo 在 PATH 里
export PATH="$HOME/.cargo/bin:/usr/local/bin:/usr/bin:/bin"

# 后端监听配置（按需改）
export RPANEL_HOST="0.0.0.0"
export RPANEL_PORT="8080"
export RUST_LOG="info"

cd "$HOME/projects/rpanel/rpanel-backend"
exec cargo run -p rpanel
