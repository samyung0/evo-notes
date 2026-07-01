import { Outlet, useRouterState } from '@tanstack/react-router';
import { Sidebar } from './Sidebar';
import { GlobalDialogs } from './GlobalDialogs';
import { cn } from '@/lib/cn';

export function AppShell() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  // Opened-workspace view collapses the nav to the icon rail to relieve crowding.
  const hidden = /^\/workspaces\/[^/]+$/.test(pathname);

  return (
    <div className="flex h-screen overflow-hidden bg-page text-fg">
      <div className={cn('hidden lg:flex', hidden && 'hidden!')}>
        <Sidebar collapsed={false} />
      </div>
      <main className="min-w-0 flex-1 overflow-hidden p-1.5 sm:p-2.5">
        <Outlet />
      </main>
      <GlobalDialogs />
    </div>
  );
}
