import { useMemo } from "preact/hooks";

interface SparklineProps {
  data: number[];   // 数值序列（例如最近 30 次采样）
  width?: number;   // SVG 宽度，默认 200
  height?: number;  // SVG 高度，默认 40
}

// 极简火花线：只用原生 SVG polyline，不引第三方库，降低体积与内存
export function Sparkline({ data, width = 200, height = 40 }: SparklineProps) {
  // 预计算 path，减少渲染时开销
  const points = useMemo(() => {
    if (data.length === 0) return "";
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1; // 防止除以 0
    const stepX = width / (data.length - 1 || 1);

    return data
      .map((v, i) => {
        // 归一化到 [0, height]，越大越高
        const y = height - ((v - min) / range) * height;
        const x = i * stepX;
        return `${x},${y}`;
      })
      .join(" ");
  }, [data, width, height]);

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      {/* 背景参考线（可选） */}
      <line x1="0" y1={height} x2={width} y2={height} stroke="#e5e7eb" strokeWidth="1" />
      {/* 主折线 */}
      <polyline
        fill="none"
        stroke="#3b82f6"   // 蓝色线条；如需进一步减小 CSS，可直接用默认颜色
        stroke-width="2"
        points={points}
      />
    </svg>
  );
}
