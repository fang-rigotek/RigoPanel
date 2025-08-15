import type { ComponentChildren } from "preact"; // 仅导入类型，编译后不会生成运行时代码
import { useMemo } from "preact/hooks";

interface Props {
  title: string;              // 卡片标题，例如 "CPU"
  value: string;              // 主展示值，例如 "23%"
  subvalue?: string;          // 次要信息，例如 "4/8 GiB"
  rightTop?: ComponentChildren;// 右上角可插入自定义节点（如百分比/图标）
  footer?: ComponentChildren; // 底部区域（我们放 sparkline）
}

// 一个极简风格卡片，避免引入 UI 框架，减小体积与内存占用
export function ResourceCard({ title, value, subvalue, rightTop, footer }: Props) {
  // 说明：为了减轻运行时开销，样式直接内联，避免 CSS-in-JS 的运行时成本
  const style = useMemo(
    () => ({
      card: {
        border: "1px solid #e5e7eb",
        borderRadius: "8px",
        padding: "12px",
        display: "flex",
        flexDirection: "column" as const,
        gap: "8px",
        background: "#fff",
      },
      header: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        fontSize: "14px",
        color: "#374151",
      },
      valueRow: {
        display: "flex",
        alignItems: "baseline",
        justifyContent: "space-between",
      },
      value: {
        fontSize: "24px",
        fontWeight: 600,
        color: "#111827",
      },
      sub: {
        fontSize: "12px",
        color: "#6b7280",
      },
      footer: { marginTop: "6px" },
    }),
    []
  );

  return (
    <div style={style.card}>
      <div style={style.header}>
        <div>{title}</div>
        <div>{rightTop}</div>
      </div>
      <div style={style.valueRow}>
        <div style={style.value}>{value}</div>
        {subvalue && <div style={style.sub}>{subvalue}</div>}
      </div>
      {footer && <div style={style.footer}>{footer}</div>}
    </div>
  );
}
