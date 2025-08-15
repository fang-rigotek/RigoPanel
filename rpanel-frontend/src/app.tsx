import { useState } from 'preact/hooks';
import { Topbar } from './components/Topbar';
import { Sidebar, type MenuKey } from './components/Sidebar';
import OverviewPage from './pages/Overview';

function labelOf(k: MenuKey): string {
  switch (k) {
    case 'overview': return '概览';
    case 'performance': return '性能';
    case 'terminal': return '终端';
    case 'files': return '文件';
    case 'security': return '安全';
    case 'user': return '用户';
    case 'settings': return '设置';
  }
}

export default function App() {
  const [active, setActive] = useState<MenuKey>('overview');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const title = labelOf(active);

  return (
    <div class="w-full min-h-screen bg-bg overflow-x-auto">
      <div class="mx-auto max-w-[2560px] min-w-[320px]">
        {/* 顶部栏：仅手机/平板显示；标题为当前标签页名称 */}
        <Topbar onMenuClick={() => setDrawerOpen(true)} title={title} />

        <div class="flex">
          {/* 左侧栏：PC 固定显示（≥1024px） */}
          <div class="hidden md:block">
            <Sidebar activeKey={active} onSelect={setActive} />
          </div>

          {/* 主内容区 */}
          <main class="flex-1 p-[12px]">
            {active === 'overview' && <OverviewPage />}

            {active !== 'overview' && (
              <div class="bg-card border border-line rounded-card p-[12px] text-[14px] text-sub">
                「{title}」模块暂未开发（占位）。
              </div>
            )}
          </main>
        </div>

        {/* 抽屉（仅手机/平板） */}
        <div
          class={[
            'fixed top-0 left-0 h-[100vh] w-[260px] bg-card border-r border-line z-50',
            'transition-all duration-300 ease-[cubic-bezier(0.22,0.61,0.36,1)]',
            drawerOpen ? 'translate-x-0' : '-translate-x-[260px]',
            'md:hidden',
          ].join(' ')}
        >
          <Sidebar activeKey={active} onSelect={(k)=>{ setActive(k); setDrawerOpen(false); }} />
        </div>
        {drawerOpen && (
          <div class="fixed inset-0 bg-black/40 z-40 md:hidden" onClick={() => setDrawerOpen(false)} />
        )}
      </div>
    </div>
  );
}
