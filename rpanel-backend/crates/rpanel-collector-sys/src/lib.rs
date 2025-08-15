use rpanel_core::{
    now_ms, Collector, CpuSummary, DiskSummary, MemorySummary, MetricsSummary, NetIfStat,
    SnapshotStore, JoinHandle,
};
use std::fs;
use std::path::Path;
use std::time::{Duration, Instant};
use tokio_util::sync::CancellationToken;

// ------- 采集器定义 -------
#[derive(Clone, Default)]
pub struct SysCollector {}

impl SysCollector { pub fn new() -> Self { Self::default() } }

// ------- 实现 Collector：interval + 取消令牌 + 实时 dt -------
impl Collector for SysCollector {
    fn spawn(self: Box<Self>, store: SnapshotStore, cancel: CancellationToken) -> JoinHandle<()> {
        tokio::spawn(async move {
            let mut prev_cpu = read_proc_stat_totals().ok();
            let mut prev_net = read_net_counters().ok();

            // 更稳的采样时钟（避免漂移）
            let mut ticker = tokio::time::interval(Duration::from_secs(1));
            let mut last = Instant::now();

            loop {
                tokio::select! {
                    _ = ticker.tick() => {
                        let now = Instant::now();
                        let dt = now.duration_since(last).as_secs_f64().max(1e-3); // 秒
                        last = now;

                        // CPU
                        let cpu = match read_proc_stat_totals() {
                            Ok(b) => {
                                let usage = if let Some(a) = prev_cpu {
                                    cpu_usage_between(&a, &b)
                                } else { 0.0 };
                                prev_cpu = Some(b);
                                CpuSummary { usage_percent: usage }
                            }
                            Err(_) => CpuSummary { usage_percent: 0.0 },
                        };

                        // 内存 / 磁盘
                        let memory = read_meminfo().unwrap_or(MemorySummary { total_bytes: 0, used_bytes: 0 });
                        let disk   = read_root_statvfs().unwrap_or(DiskSummary { mount: "/".into(), total_bytes: 0, used_bytes: 0 });

                        // 网络（按真实 dt 计算 bps）
                        let net_details = match read_net_counters() {
                            Ok(b) => {
                                let delta = prev_net.as_ref()
                                    .map(|a| net_delta_bps(a.as_slice(), b.as_slice(), dt))
                                    .unwrap_or_default();
                                prev_net = Some(b);
                                delta
                            }
                            Err(_) => vec![],
                        };

                        let snap = MetricsSummary { cpu, memory, disk, net: net_details, ts: now_ms() };
                        store.set(snap);
                    }

                    // 可控停：平台调用 cancel.cancel() 后，这里退出循环
                    _ = cancel.cancelled() => {
                        break;
                    }
                }
            }
        })
    }
}

// ------- CPU (/proc/stat) -------
#[derive(Clone, Copy)]
struct CpuTotals {
    user: u64, nice: u64, system: u64, idle: u64, iowait: u64, irq: u64, softirq: u64, steal: u64,
}
fn read_proc_stat_totals() -> std::io::Result<CpuTotals> {
    let s = fs::read_to_string("/proc/stat")?;
    if let Some(line) = s.lines().find(|l| l.starts_with("cpu ")) {
        let mut it = line.split_ascii_whitespace().skip(1);
        let nums: Vec<u64> = (0..8).map(|_| it.next().unwrap_or("0").parse().unwrap_or(0)).collect();
        Ok(CpuTotals {
            user: nums[0], nice: nums[1], system: nums[2], idle: nums[3],
            iowait: *nums.get(4).unwrap_or(&0), irq: *nums.get(5).unwrap_or(&0),
            softirq: *nums.get(6).unwrap_or(&0), steal: *nums.get(7).unwrap_or(&0),
        })
    } else {
        Err(std::io::Error::new(std::io::ErrorKind::Other, "no cpu line"))
    }
}
fn cpu_usage_between(a: &CpuTotals, b: &CpuTotals) -> f32 {
    let idle_a = a.idle + a.iowait;
    let idle_b = b.idle + b.iowait;
    let non_idle_a = a.user + a.nice + a.system + a.irq + a.softirq + a.steal;
    let non_idle_b = b.user + b.nice + b.system + b.irq + b.softirq + b.steal;
    let total_a = idle_a + non_idle_a;
    let total_b = idle_b + non_idle_b;

    let totald = total_b.saturating_sub(total_a) as f32;
    let idled  = (idle_b.saturating_sub(idle_a)) as f32;
    if totald <= 0.0 { 0.0 } else { ((totald - idled) / totald * 100.0).clamp(0.0, 100.0) }
}

// ------- 内存 (/proc/meminfo) -------
fn read_meminfo() -> std::io::Result<MemorySummary> {
    let s = fs::read_to_string("/proc/meminfo")?;
    let mut total = 0u64;
    let mut available = 0u64;
    for line in s.lines() {
        if line.starts_with("MemTotal:") {
            total = parse_kb_line(line);
        } else if line.starts_with("MemAvailable:") {
            available = parse_kb_line(line);
        }
    }
    let used = total.saturating_sub(available);
    Ok(MemorySummary { total_bytes: total * 1024, used_bytes: used * 1024 })
}
fn parse_kb_line(line: &str) -> u64 {
    line.split_whitespace().nth(1).and_then(|v| v.parse().ok()).unwrap_or(0)
}

// ------- 磁盘（rustix::fs::statvfs 安全封装） -------
fn read_root_statvfs() -> std::io::Result<DiskSummary> {
    use rustix::fs;

    // 1.x: statvfs 只接收“路径”一个参数；错误类型是 rustix::io::Errno，
    // 这里转换成 std::io::Error，使用操作系统错误码。
    let s = fs::statvfs("/")
    .map_err(|e| std::io::Error::from_raw_os_error(e.raw_os_error()))?;

    // 1.x: StatVfs 的成员是“字段”，不是方法
    let total = s.f_blocks as u64 * s.f_frsize as u64;
    let free  = s.f_bavail as u64 * s.f_frsize as u64;
    let used  = total.saturating_sub(free);

    Ok(DiskSummary {
        mount: "/".into(),
        total_bytes: total,
        used_bytes: used,
    })
}

// ------- 网络 (/sys/class/net/*/statistics) -------
#[derive(Clone, Copy, Default)]
struct IfCounters { rx_bytes: u64, tx_bytes: u64, link_mbps: Option<u64> }

fn read_net_counters() -> std::io::Result<Vec<(String, IfCounters)>> {
    let mut v = Vec::new();
    for entry in fs::read_dir("/sys/class/net")? {
        let entry = entry?;
        let name = entry.file_name().to_string_lossy().to_string();
        if name == "lo" { continue; }
        let path = entry.path();
        let rx = read_u64(path.join("statistics/rx_bytes")).unwrap_or(0);
        let tx = read_u64(path.join("statistics/tx_bytes")).unwrap_or(0);
        let speed = read_speed_opt(path.join("speed"));
        v.push((name, IfCounters { rx_bytes: rx, tx_bytes: tx, link_mbps: speed }));
    }
    Ok(v)
}

fn read_speed_opt<P: AsRef<Path>>(p: P) -> Option<u64> {
    let s = fs::read_to_string(p).ok()?;
    let s = s.trim();
    if s.starts_with('-') { return None; }
    s.parse::<u64>().ok()
}
fn read_u64<P: AsRef<Path>>(p: P) -> std::io::Result<u64> {
    let s = fs::read_to_string(p)?;
    let s = s.trim();
    if s.starts_with('-') { return Ok(u64::MAX); }
    s.parse::<u64>().map_err(|e| std::io::Error::new(std::io::ErrorKind::InvalidData, e))
}

fn net_delta_bps(a: &[(String, IfCounters)], b: &[(String, IfCounters)], interval_sec: f64) -> Vec<NetIfStat> {
    use std::collections::HashMap;
    let map_a: HashMap<_, _> = a.iter().cloned().collect();
    let mut out = Vec::new();
    for (name, nb) in b.iter() {
        if let Some(na) = map_a.get(name) {
            let rx = nb.rx_bytes.saturating_sub(na.rx_bytes) as f64;
            let tx = nb.tx_bytes.saturating_sub(na.tx_bytes) as f64;
            let rx_bps = (rx * 8.0 / interval_sec).max(0.0) as u64;
            let tx_bps = (tx * 8.0 / interval_sec).max(0.0) as u64;
            out.push(NetIfStat { iface: name.clone(), rx_bps, tx_bps, link_mbps: nb.link_mbps });
        }
    }
    out
}
