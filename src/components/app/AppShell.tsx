import { Outlet, useRouterState } from '@tanstack/react-router';
import { Sidebar } from './Sidebar';
import { GlobalDialogs } from './GlobalDialogs';

export function AppShell() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  // Opened-workspace view collapses the nav to the icon rail to relieve crowding.
  const collapsed = /^\/workspaces\/[^/]+$/.test(pathname);

  return (
    <div className="flex h-screen overflow-hidden bg-page text-fg">
      <div className="hidden lg:flex">
        <Sidebar collapsed={collapsed} />
      </div>
      <main className="min-w-0 flex-1 overflow-hidden p-1.5 sm:p-2.5">
        <Outlet />
      </main>
      <GlobalDialogs />
    </div>
  );
}
