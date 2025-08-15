// 顶部导航栏：仅手机/平板显示（< 1024px）
// 显示当前标签页名称（如“概览”）；左侧为菜单按钮可打开抽屉侧栏。
import type { JSX } from 'preact';

interface TopbarProps {
  onMenuClick: () => void; // 点击左上角菜单按钮
  title: string;           // 当前标签页名称（如“概览”）
}

export function Topbar({ onMenuClick, title }: TopbarProps): JSX.Element {
  return (
    <div class="md:hidden flex items-center justify-between px-[16px] py-[12px] bg-card border-b border-line">
      {/* 左侧菜单按钮（抽屉） */}
      <button
        class="i-mdi-menu text-[22px] text-text"
        aria-label="打开菜单"
        onClick={onMenuClick}
      />
      {/* 中间标题：只显示标签页名称 */}
      <div class="text-text font-700 text-[16px]">{title}</div>
      {/* 右侧占位：保持三段式对齐（不显示用户名） */}
      <div class="w-[24px] h-[24px]" aria-hidden="true"></div>
    </div>
  );
}
