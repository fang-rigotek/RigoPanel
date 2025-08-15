// 这是一个“假数据源”，用来在没有后端 API 时驱动 UI。
// 原理：用随机/缓慢变化的数值模拟真实波动。
// 注意：这些函数会返回“快照”，并不保存全局状态。

import type { MetricsSummary } from "../types";

// 工具：把 [min, max] 范围内的小幅波动叠加到基准值上
function wobble(base: number, range: number): number {
  // Math.random() ∈ [0,1)，(rand - 0.5) ∈ [-0.5, 0.5)
  const delta = (Math.random() - 0.5) * range * 2;
  const v = base + delta;
  return Math.max(0, v); // 不允许出现负数
}

let memTotal = 8 * 1024 * 1024 * 1024; // 模拟 8 GiB
let diskTotal = 60 * 1024 * 1024 * 1024; // 模拟 60 GiB

// 生成一次快照
export function genMockMetrics(now: number = Date.now()): MetricsSummary {
  // CPU：在 22% 附近轻微波动
  const cpuUsage = Math.min(100, wobble(22, 8));

  // 内存：基于总量，做缓慢抖动（模拟有程序在分配/释放）
  const usedMem = Math.min(memTotal * 0.95, wobble(memTotal * 0.42, memTotal * 0.02));

  // 磁盘：模拟根分区，使用率 35% 左右
  const usedDisk = Math.min(diskTotal * 0.98, wobble(diskTotal * 0.35, diskTotal * 0.03));

  // 网络：假设 eth0 为 1 Gbps，lo 忽略，另加一个容器虚拟网卡 veth0 100 Mbps
  const eth0Rx = wobble(80_000_000, 40_000_000); // 约 80 Mbps，单位 bit/s
  const eth0Tx = wobble(40_000_000, 30_000_000); // 约 40 Mbps
  const veth0Rx = wobble(8_000_000, 4_000_000);  // 约 8 Mbps
  const veth0Tx = wobble(5_000_000, 3_000_000);  // 约 5 Mbps

  return {
    cpu: { usagePercent: cpuUsage },
    memory: { totalBytes: memTotal, usedBytes: usedMem },
    disk: { mount: "/", totalBytes: diskTotal, usedBytes: usedDisk },
    net: [
      { iface: "eth0", rxBps: eth0Rx, txBps: eth0Tx, linkMbps: 1000 },
      { iface: "veth0", rxBps: veth0Rx, txBps: veth0Tx, linkMbps: 100 },
    ],
    ts: now,
  };
}
