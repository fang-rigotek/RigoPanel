import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { formatBps, formatBytes } from '../utils/format';

// —— 后端类型
interface CpuSummary { usage_percent: number; }
interface MemorySummary { total_bytes: number; used_bytes: number; }
interface DiskSummary { mount: string; total_bytes: number; used_bytes: number; }
interface NetIfStat { iface: string; rx_bps: number; tx_bps: number; link_mbps?: number | null; }
interface MetricsSummary {
  cpu: CpuSummary; memory: MemorySummary; disk: DiskSummary; net: NetIfStat[]; ts: number;
  cpu_cores: number;
}

function pushLine(arr: number[], v: number, max: number) { arr.push(v); if (arr.length > max) arr.shift(); }

export default function OverviewPage() {
  const [snap, setSnap] = useState<MetricsSummary | null>(null);
  const cpuLine = useRef<number[]>([]);
  const memLine = useRef<number[]>([]);
  const diskLine = useRef<number[]>([]);
  const netLine = useRef<number[]>([]);
  const MAX_POINTS = 60;

  useEffect(() => {
    let timer: number | undefined;
    const tick = async () => {
      try {
        const res = await fetch('/api/v1/metrics/summary', { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: MetricsSummary = await res.json();
        setSnap(data);
        pushLine(cpuLine.current, data.cpu.usage_percent, MAX_POINTS);
        const memPct = data.memory.total_bytes>0 ? (data.memory.used_bytes/data.memory.total_bytes)*100 : 0;
        pushLine(memLine.current, memPct, MAX_POINTS);
        const diskPct = data.disk.total_bytes>0 ? (data.disk.used_bytes/data.disk.total_bytes)*100 : 0;
        pushLine(diskLine.current, diskPct, MAX_POINTS);
        const totalBps = data.net.reduce((a,n)=>a+n.rx_bps+n.tx_bps,0);
        pushLine(netLine.current, totalBps, MAX_POINTS);
      } catch (e) {
        console.error('summary fetch error:', e);
      }
    };
    tick();
    timer = window.setInterval(tick, 1000);
    return () => { if (timer) clearInterval(timer); };
  }, []);

  const derived = useMemo(() => {
    if (!snap) return null;
    const totalRxBps = snap.net.reduce((a,n)=>a+n.rx_bps,0);
    const totalTxBps = snap.net.reduce((a,n)=>a+n.tx_bps,0);
    const totalBps   = totalRxBps + totalTxBps;
    return { totalBps, totalRxBps, totalTxBps };
  }, [snap]);

  return (
    <section class="flex flex-col gap-[12px]">
      {/* 卡片 1：性能 */}
      <div class="bg-card border border-line rounded-card p-[12px]">
        <div class="flex items-center gap-[8px] mb-[10px]">
          <span class="i-mdi-speedometer text-[20px] text-brand"></span>
          <span class="text-[16px] font-700 text-text">性能</span>
        </div>

        <div class="grid gap-[12px] sm:grid-cols-2 md:grid-cols-4">
          {/* CPU（无图标） */}
          <div class="bg-card border border-line rounded-card p-[12px]">
            <div class="flex items-center gap-[8px] mb-[8px]">
              <span class="text-[14px] text-text">CPU</span>
            </div>
            <div class="text-[20px] font-700 text-text">
              {snap ? `${snap.cpu.usage_percent.toFixed(1)}%` : '--'}
            </div>
            <div class="text-[12px] text-sub mt-[4px]">
              {snap ? `${snap.cpu_cores} 个逻辑核心（服务器）` : '—'}
            </div>
          </div>

          {/* 内存（无图标） */}
          <div class="bg-card border border-line rounded-card p-[12px]">
            <div class="flex items-center gap-[8px] mb-[8px]">
              <span class="text-[14px] text-text">内存</span>
            </div>
            <div class="text-[20px] font-700 text-text">
              {snap ? `${((snap.memory.used_bytes/snap.memory.total_bytes)*100).toFixed(1)}%` : '--'}
            </div>
            <div class="text-[12px] text-sub mt-[4px]">
              {snap ? `${formatBytes(snap.memory.used_bytes)} / ${formatBytes(snap.memory.total_bytes)}` : ''}
            </div>
          </div>

          {/* 磁盘（无图标，标题“磁盘”） */}
          <div class="bg-card border border-line rounded-card p-[12px]">
            <div class="flex items-center gap-[8px] mb-[8px]">
              <span class="text-[14px] text-text">磁盘</span>
            </div>
            <div class="text-[20px] font-700 text-text">
              {snap ? `${((snap.disk.used_bytes/snap.disk.total_bytes)*100).toFixed(1)}%` : '--'}
            </div>
            <div class="text-[12px] text-sub mt-[4px]">
              {snap ? `${formatBytes(snap.disk.used_bytes)} / ${formatBytes(snap.disk.total_bytes)}` : ''}
            </div>
          </div>

          {/* 网络（无图标，标题“网络”；自动单位） */}
          <div class="bg-card border border-line rounded-card p-[12px]">
            <div class="flex items-center gap-[8px] mb-[8px]">
              <span class="text-[14px] text-text">网络</span>
            </div>
            <div class="text-[20px] font-700 text-text">
              {derived ? formatBps(derived.totalBps) : '--'}
            </div>
            <div class="text-[12px] text-sub mt-[4px]">
              {derived ? `上传 ${formatBps(derived.totalTxBps)} / 下载 ${formatBps(derived.totalRxBps)}` : '上传 0 bps / 下载 0 bps'}
            </div>
          </div>
        </div>
      </div>

      {/* 卡片 2：用户（占位 UI） */}
      <div class="bg-card border border-line rounded-card p-[12px]">
        <div class="flex items-center gap-[8px] mb-[10px]">
          <span class="i-mdi-account text-[20px] text-brand"></span>
          <span class="text-[16px] font-700 text-text">用户</span>
        </div>

        {/* 当前登录设备（占位数据） */}
        <div class="mb-[8px]">
          <div class="text-[14px] font-600 text-text mb-[4px]">当前登录设备</div>
          <div class="text-[12px] text-sub">
            IP：203.0.113.10 （示例城市，示例国家）<br />
            自动登录有效期至：2025-09-15 12:00
          </div>
        </div>

        {/* 自动登录设备（占位数据） */}
        <div>
          <div class="text-[14px] font-600 text-text mb-[4px]">自动登录设备</div>
          <div class="text-[12px] text-sub">
            IP：203.0.113.5 （示例城市，示例国家）<br />
            自动登录有效期至：2025-09-20 08:30
          </div>
        </div>
      </div>
    </section>
  );
}
