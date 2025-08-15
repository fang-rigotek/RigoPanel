import type { JSX } from 'preact';

export type MenuKey =
  | 'overview'
  | 'performance'
  | 'terminal'
  | 'files'
  | 'security'
  | 'user'
  | 'settings';

interface SidebarProps {
  activeKey: MenuKey;
  onSelect: (key: MenuKey) => void;
}

const items: { key: MenuKey; label: string; icon: string }[] = [
  { key: 'overview',    label: '概览', icon: 'i-mdi-view-dashboard' },
  { key: 'performance', label: '性能', icon: 'i-mdi-pulse' }, // ← 只显示“性能”
  { key: 'terminal',    label: '终端', icon: 'i-tabler-terminal-2' },
  { key: 'files',       label: '文件', icon: 'i-tabler-folder' },
  { key: 'security',    label: '安全', icon: 'i-tabler-shield-lock' },
  { key: 'user',        label: '用户', icon: 'i-tabler-user' },
  { key: 'settings',    label: '设置', icon: 'i-tabler-settings' },
];

export function Sidebar({ activeKey, onSelect }: SidebarProps): JSX.Element {
  return (
    <aside class="w-[240px] shrink-0 bg-card border-r border-line h-[100vh] overflow-y-auto p-[12px]">
      <div class="text-[18px] font-700 text-text mb-[12px]">RigoPanel</div>
      <nav class="flex flex-col gap-[6px]">
        {items.map(it => (
          <button
            key={it.key}
            class={[
              'flex items-center gap-[10px] px-[12px] py-[10px] rounded-card text-left',
              activeKey === it.key ? 'bg-[#e5f0ff] text-[#1d4ed8]' : 'text-text',
            ].join(' ')}
            onClick={() => onSelect(it.key)}
          >
            <span class={[it.icon, 'text-[18px]'].join(' ')}></span>
            <span class="text-[14px]">{it.label}</span>
          </button>
        ))}
      </nav>
    </aside>
  );
}
