import { Link, useRouterState } from '@tanstack/react-router';
import { cn } from '@/lib/cn';
import { Icon, type IconName } from '@/components/ui/Icon';
import { ThemeSwitcher } from './ThemeSwitcher';
import { m } from '@/i18n';

interface NavItem {
  to: string;
  label: string;
  icon: IconName;
  exact?: boolean;
}

function items(): { general: NavItem[]; tools: NavItem[] } {
  return {
    general: [
      { to: '/', label: m.nav_dashboard(), icon: 'dashboard', exact: true },
      { to: '/workspaces', label: m.nav_workspaces(), icon: 'workspaces' },
      { to: '/quizzes', label: m.nav_quizzes(), icon: 'quiz' },
      { to: '/schedule', label: m.nav_schedule(), icon: 'schedule' },
      { to: '/explore', label: m.nav_explore(), icon: 'globe' },
    ],
    tools: [
      { to: '/flashcards', label: m.nav_flashcards(), icon: 'flashcards' },
      { to: '/files', label: m.nav_files(), icon: 'files' },
      { to: '/tasks', label: m.nav_tasks(), icon: 'tasks' },
      { to: '/thinking', label: m.nav_thinking(), icon: 'notes' },
    ],
  };
}

function LogoMark({ size = 36 }: { size?: number }) {
  const u = size / 36;
  return (
    <span
      className="flex items-center justify-center"
      style={{ width: size, height: size, flex: `0 0 ${size}px`, borderRadius: 10 * u, background: 'var(--action-primary-bg)' }}
    >
      <svg width={size * 0.62} height={size * 0.62} viewBox="0 0 36 36" fill="none">
        <rect x="9" y="9" width="14" height="3.6" rx="1.8" fill="var(--action-primary-fg)" />
        <rect x="9" y="16.2" width="10" height="3.6" rx="1.8" fill="#aef07f" />
        <rect x="9" y="23.4" width="14" height="3.6" rx="1.8" fill="var(--action-primary-fg)" />
        <circle cx="25.5" cy="18" r="2.1" fill="#8c7bd9" />
      </svg>
    </span>
  );
}

function isActive(pathname: string, item: NavItem): boolean {
  if (item.exact) return pathname === item.to;
  return pathname === item.to || pathname.startsWith(item.to + '/');
}

function Row({ item, active, collapsed }: { item: NavItem; active: boolean; collapsed: boolean }) {
  return (
    <Link
      to={item.to}
      preload="intent"
      title={collapsed ? item.label : undefined}
      className={cn(
        'flex items-center rounded-button transition-colors',
        collapsed ? 'h-10 w-10 justify-center' : 'w-full gap-3 px-3 py-2.5 text-[0.95rem]',
        active ? 'bg-action font-bold text-action-fg' : 'font-medium text-fg hover:bg-inset',
      )}
    >
      <Icon name={item.icon} size={collapsed ? 19 : 21} />
      {!collapsed && <span>{item.label}</span>}
    </Link>
  );
}

function SectionLabel({ children }: { children: string }) {
  return <div className="t-label px-3 pb-1.5 pt-0 text-fg-muted">{children}</div>;
}

export function Sidebar({ collapsed = false }: { collapsed?: boolean }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const nav = items();

  if (collapsed) {
    return (
      <nav className="m-2.5 mr-0 flex w-[60px] shrink-0 flex-col items-center gap-1.5 rounded-frame bg-sidebar py-4">
        <LogoMark size={36} />
        <div className="h-2" />
        {nav.general.map((i) => (
          <Row key={i.to} item={i} active={isActive(pathname, i)} collapsed />
        ))}
        <div className="my-1.5 h-px w-6 bg-divider" />
        {nav.tools.map((i) => (
          <Row key={i.to} item={i} active={isActive(pathname, i)} collapsed />
        ))}
        <div className="mt-auto" />
        <ThemeSwitcher collapsed />
        <Link to="/support" preload="intent" title={m.nav_support()} className="flex h-10 w-10 items-center justify-center rounded-button text-fg hover:bg-inset">
          <Icon name="help" size={19} />
        </Link>
      </nav>
    );
  }

  return (
    <nav className="m-2.5 mr-0 flex w-[222px] shrink-0 flex-col rounded-frame bg-sidebar px-2.5 py-4">
      <div className="flex items-center gap-3 px-2 pb-4 pt-1">
        <LogoMark size={36} />
        <span className="text-lg font-extrabold tracking-[-0.01em] text-fg">{m.app_name()}</span>
      </div>

      <SectionLabel>{m.nav_section_general()}</SectionLabel>
      <div className="flex flex-col gap-[3px]">
        {nav.general.map((i) => (
          <Row key={i.to} item={i} active={isActive(pathname, i)} collapsed={false} />
        ))}
      </div>

      <div className="h-4" />
      <SectionLabel>{m.nav_section_tools()}</SectionLabel>
      <div className="flex flex-col gap-[3px]">
        {nav.tools.map((i) => (
          <Row key={i.to} item={i} active={isActive(pathname, i)} collapsed={false} />
        ))}
      </div>

      <div className="mt-auto" />
      <div className="mt-3 border-t border-divider pt-2">
        <ThemeSwitcher />
        <Link
          to="/support"
          preload="intent"
          className={cn(
            'flex items-center gap-3 rounded-button px-3 py-2.5 text-[0.95rem] font-medium transition-colors',
            isActive(pathname, { to: '/support', label: '', icon: 'help' }) ? 'bg-action text-action-fg' : 'text-fg hover:bg-inset',
          )}
        >
          <Icon name="help" size={21} />
          <span>{m.nav_support()}</span>
        </Link>
      </div>
    </nav>
  );
}
