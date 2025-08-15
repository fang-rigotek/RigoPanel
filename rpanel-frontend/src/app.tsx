import { useEffect, useState } from "react";

// 后端返回的数据类型（和 Rust MetricsSummary 对应）
interface CpuSummary {
  usage_percent: number;
}

interface MemorySummary {
  total_bytes: number;
  used_bytes: number;
}

interface DiskSummary {
  mount: string;
  total_bytes: number;
  used_bytes: number;
}

interface NetIfStat {
  iface: string;
  rx_bps: number;
  tx_bps: number;
  link_mbps?: number | null;
}

interface MetricsSummary {
  cpu: CpuSummary;
  memory: MemorySummary;
  disk: DiskSummary;
  net: NetIfStat[];
  ts: number;
}

// 格式化字节（例如：1073741824 → "1.0 GB"）
function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return (bytes / Math.pow(k, i)).toFixed(1) + " " + sizes[i];
}

// 格式化速率（bit/s 转 Mbps）
function formatBps(bps: number): string {
  if (bps < 1_000) return `${bps} bps`;
  if (bps < 1_000_000) return `${(bps / 1_000).toFixed(1)} Kbps`;
  if (bps < 1_000_000_000) return `${(bps / 1_000_000).toFixed(1)} Mbps`;
  return `${(bps / 1_000_000_000).toFixed(1)} Gbps`;
}

export default function App() {
  const [metrics, setMetrics] = useState<MetricsSummary | null>(null);

  useEffect(() => {
    const fetchData = () => {
      fetch("/api/v1/metrics/summary") // 同域访问
        .then((res) => res.json())
        .then((data: MetricsSummary) => setMetrics(data))
        .catch((err) => console.error("API fetch error:", err));
    };

    fetchData(); // 立即请求一次
    const timer = setInterval(fetchData, 2000); // 每 2 秒更新
    return () => clearInterval(timer);
  }, []);

  if (!metrics) {
    return <div style={{ padding: "20px" }}>Loading...</div>;
  }

  return (
    <div style={{ padding: "20px", fontFamily: "sans-serif" }}>
      <h1>RPanel 系统概览</h1>

      {/* CPU */}
      <div style={cardStyle}>
        <h2>CPU 使用率</h2>
        <p>{metrics.cpu.usage_percent.toFixed(1)}%</p>
      </div>

      {/* 内存 */}
      <div style={cardStyle}>
        <h2>内存</h2>
        <p>
          已用 {formatBytes(metrics.memory.used_bytes)} /{" "}
          {formatBytes(metrics.memory.total_bytes)}
        </p>
      </div>

      {/* 磁盘 */}
      <div style={cardStyle}>
        <h2>磁盘（{metrics.disk.mount}）</h2>
        <p>
          已用 {formatBytes(metrics.disk.used_bytes)} /{" "}
          {formatBytes(metrics.disk.total_bytes)}
        </p>
      </div>

      {/* 网络 */}
      <div style={cardStyle}>
        <h2>网络</h2>
        {metrics.net.length === 0 ? (
          <p>无活跃网卡</p>
        ) : (
          metrics.net.map((iface) => (
            <div key={iface.iface}>
              <strong>{iface.iface}</strong> ↓ {formatBps(iface.rx_bps)} ↑{" "}
              {formatBps(iface.tx_bps)}
              {iface.link_mbps && (
                <span>（链路 {iface.link_mbps} Mbps）</span>
              )}
            </div>
          ))
        )}
      </div>

      <div style={{ marginTop: "20px", fontSize: "12px", color: "#666" }}>
        数据时间戳: {new Date(metrics.ts).toLocaleString()}
      </div>
    </div>
  );
}

// 卡片样式
const cardStyle: React.CSSProperties = {
  border: "1px solid #ccc",
  padding: "10px",
  borderRadius: "8px",
  marginBottom: "10px",
};
