//! 运行配置：监听地址/端口等

use std::{env, net::SocketAddr};

#[derive(Clone, Debug)]
pub struct Config {
    pub addr: SocketAddr,
}

pub fn load() -> Config {
    let host = env::var("RPANEL_HOST").unwrap_or_else(|_| "0.0.0.0".to_string());
    let port = env::var("RPANEL_PORT")
        .ok()
        .and_then(|s| s.parse::<u16>().ok())
        .unwrap_or(8080);

    let addr: SocketAddr = format!("{}:{}", host, port)
        .parse()
        .expect("invalid RPANEL_HOST/RPANEL_PORT");

    Config { addr }
}
