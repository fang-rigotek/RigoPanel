// 数值格式化工具

export function formatBytes(b: number): string {
  const units = ['B','KB','MB','GB','TB'];
  let v = b, i = 0;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(1)} ${units[i]}`;
}

// 自适应带宽单位（十进制 1000 进位）
export function formatBps(bps: number): string {
  if (bps < 1_000) return `${bps} bps`;
  if (bps < 1_000_000) return `${(bps/1_000).toFixed(1)} Kbps`;
  if (bps < 1_000_000_000) return `${(bps/1_000_000).toFixed(1)} Mbps`;
  return `${(bps/1_000_000_000).toFixed(1)} Gbps`;
}
