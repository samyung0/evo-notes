import { useEffect, useState } from 'react';
import { Link, useRouterState } from '@tanstack/react-router';
import { cn } from '@/lib/cn';
import { features } from '@/lib/features';
import { Icon, type IconName } from '@/components/ui/Icon';
import { ThemeSwitcher } from './ThemeSwitcher';
import { m } from '@/i18n';
import { Card, Drawer, DrawerContent, DrawerTrigger, IconButton, LogoMark } from '../ui';

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
      { to: '/schedule', label: m.nav_schedule(), icon: 'schedule' },
      ...(features.explore
        ? [{ to: '/explore', label: m.nav_explore(), icon: 'globe' as IconName }]
        : []),
    ],
    tools: [
      { to: '/quizzes', label: m.nav_quizzes(), icon: 'quiz' },
      { to: '/flashcards', label: m.nav_flashcards(), icon: 'flashcards' },
      { to: '/files', label: m.nav_files(), icon: 'files' },
      { to: '/tasks', label: m.nav_tasks(), icon: 'tasks' },
      ...(features.thinking
        ? [{ to: '/thinking', label: m.nav_thinking(), icon: 'notes' as IconName }]
        : []),
    ],
  };
}

function isActive(pathname: string, item: NavItem): boolean {
  if (item.exact) return pathname === item.to;
  return pathname === item.to || pathname.startsWith(item.to + '/');
}

function Row({
  item,
  active,
  collapsed,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  return (
    <Link
      to={item.to}
      preload="intent"
      onClick={onNavigate}
      title={collapsed ? item.label : undefined}
      className={cn(
        'flex items-center rounded-button transition-colors',
        collapsed ? 'h-10 w-10 justify-center' : 'w-full gap-3 px-3 py-2',
        active
          ? 'bg-action font-bold text-action-fg'
          : 'font-medium text-fg hover:bg-surface-dark-hover-bg'
      )}
    >
      <Icon name={item.icon} size={19} />
      {!collapsed && <span className={cn('translate-y-px font-semibold')}>{item.label}</span>}
    </Link>
  );
}

function SectionLabel({ children }: { children: string }) {
  return <div className="t-label px-3 pt-0 pb-1.5 text-fg-muted">{children}</div>;
}

export function Sidebar({
  collapsed = false,
  className,
  onNavigate,
}: {
  collapsed?: boolean;
  className?: string;
  onNavigate?: () => void;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const nav = items();

  if (collapsed) {
    return (
      <Card
        asChild
        theme="gray"
        radius="row"
        className="m-2.5 mr-0 flex w-15 shrink-0 items-stretch gap-0 overflow-y-auto px-2.5 py-4"
      >
        <nav>
          <LogoMark size={36} />
          <div className="h-2" />
          {nav.general.map((i) => (
            <Row key={i.to} item={i} active={isActive(pathname, i)} collapsed />
          ))}
          <div className="h-2" />
          {nav.tools.map((i) => (
            <Row key={i.to} item={i} active={isActive(pathname, i)} collapsed />
          ))}
          <div className="mt-auto" />
          <ThemeSwitcher collapsed />
          <Link
            to="/support"
            preload="intent"
            title={m.nav_support()}
            className="flex h-10 w-10 items-center justify-center rounded-button text-fg hover:bg-surface-hover-bg"
          >
            <Icon name="help" size={19} />
          </Link>
        </nav>
      </Card>
    );
  }

  return (
    <Card
      asChild
      theme="page"
      radius="card-xl"
      className={cn(
        'm-2.5 mr-0 ml-1 flex w-52 shrink-0 items-stretch gap-0 overflow-y-auto px-2.5 py-4',
        className
      )}
    >
      <nav>
        <div className="flex items-center justify-between px-2 pt-1 pb-6">
          <div className="flex items-center gap-3">
            <LogoMark size={36} />
            <h1 className={cn('t-card-title translate-y-px font-extrabold tracking-[-0.02rem]')}>
              {m.app_name()}
            </h1>
          </div>
          <IconButton
            icon="x"
            variant="ghost"
            size="sm"
            label="Close"
            className="lg:hidden"
            onClick={onNavigate}
          />
        </div>

        <SectionLabel>{m.nav_section_general()}</SectionLabel>
        <div className="flex flex-col gap-1">
          {nav.general.map((i) => (
            <Row
              key={i.to}
              item={i}
              active={isActive(pathname, i)}
              collapsed={false}
              onNavigate={onNavigate}
            />
          ))}
        </div>

        <div className="h-4" />
        <SectionLabel>{m.nav_section_tools()}</SectionLabel>
        <div className="flex flex-col gap-1">
          {nav.tools.map((i) => (
            <Row
              key={i.to}
              item={i}
              active={isActive(pathname, i)}
              collapsed={false}
              onNavigate={onNavigate}
            />
          ))}
        </div>

        <div className="mt-auto" />
        <div className="mt-3 border-t border-divider pt-2">
          <ThemeSwitcher />
          <Link
            to="/support"
            preload="intent"
            onClick={onNavigate}
            className={cn(
              'flex items-center gap-3 rounded-button px-3 py-2.5 text-[0.95rem] font-medium transition-colors',
              isActive(pathname, { to: '/support', label: '', icon: 'help' })
                ? 'bg-action text-action-fg'
                : 'text-fg hover:bg-surface-hover-bg'
            )}
          >
            <Icon name="help" size={21} />
            <span>{m.nav_support()}</span>
          </Link>
        </div>
      </nav>
    </Card>
  );
}

/**
 * Mobile-only hamburger that slides the full nav in from the left.
 * The trigger is meant to live in the top inset bar; the drawer closes
 * itself whenever the route changes.
 */
export function MobileNav({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <Drawer direction="left" open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <IconButton
          icon="menu"
          variant="dark"
          size="md"
          aria-label="Open navigation"
          className={className}
        />
      </DrawerTrigger>
      <DrawerContent className="border-0 bg-transparent p-0">
        <Sidebar
          className="m-0 h-full w-[40vw] min-w-62 rounded-none bg-surface text-surface-fg"
          onNavigate={() => setOpen(false)}
        />
      </DrawerContent>
    </Drawer>
  );
}
