import { useRef, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useClerk } from '@clerk/react';
import { cn } from '@/lib/cn';
import { userColorPair } from '@/lib/userColor';
import { useDebounced } from '@/lib/useDebounced';
import { useOutsideClick } from '@/lib/useOutsideClick';
import {
  Avatar,
  Card,
  Icon,
  IconButton,
  Input,
  Menu,
  SkeletonList,
  DialogClose,
  DialogContent,
  DialogTitle,
  Popover,
  PopoverTrigger,
  Dialog,
  PopoverContent,
} from '@/components/ui';
import { useMe, useNotifications, useSearch, useMarkNotificationsRead } from '@/api/hooks';
import { USE_MSW } from '@/api/auth';
import type { SearchKind } from '@/api/types';
import { m } from '@/i18n';
import { MobileNav } from './Sidebar';
import { useDialogs } from '@/stores/dialogs';
import { VisuallyHidden } from 'radix-ui';

const KIND_ICON: Record<SearchKind, Parameters<typeof Icon>[0]['name']> = {
  workspace: 'workspaces',
  file: 'files',
  event: 'schedule',
  flashcards: 'flashcards',
  thinking: 'notes',
};

export function SearchDialog({
  open,
  setOpen,
}: {
  open: boolean;
  setOpen: (open: boolean) => void;
}) {
  const [q, setQ] = useState('');
  const debounced = useDebounced(q, 400);
  const { data, isFetching } = useSearch(debounced);
  const navigate = useNavigate();
  const query = debounced.trim();

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        setOpen(isOpen);
        if (isOpen) setQ('');
      }}
    >
      <DialogContent
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          (e.currentTarget as HTMLElement).querySelector('input')?.focus();
        }}
        className="top-[12vh] translate-y-0"
        showCloseButton={false}
        cardScrollContainerClassName="p-0"
      >
        <VisuallyHidden.Root asChild>
          <DialogTitle>{m.search_placeholder()}</DialogTitle>
        </VisuallyHidden.Root>
        <div className="flex max-h-[70vh] flex-col">
          <div className="flex items-center gap-2.5 border-b border-divider px-4 py-3">
            <Icon name="search" size={18} />
            <Input
              variant="transparent"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={m.search_placeholder()}
              wrapperClassName="flex-1 translate-y-px"
            />
            <DialogClose asChild>
              <IconButton icon="x" variant="ghost" size="sm" label="Close" />
            </DialogClose>
          </div>
          <div className="relative min-h-40 flex-1 overflow-auto py-1">
            {isFetching && <SkeletonList count={5} rowHeight={48} className="p-1" />}
            {!isFetching && !query && (
              <div className="t-body absolute inset-0 flex items-center justify-center text-center text-fg-muted">
                <span className="-translate-y-1/2">{m.search_result_placeholder()}</span>
              </div>
            )}
            {!isFetching && query && !data?.length && (
              <div className="t-body absolute inset-0 flex items-center justify-center text-center text-fg-muted">
                <span className="-translate-y-1/2">No matches for "{query}".</span>
              </div>
            )}
            {!isFetching &&
              data?.map((r) => {
                const c = r.color ? userColorPair(r.color) : null;
                return (
                  <button
                    key={`${r.kind}-${r.id}`}
                    onClick={() => {
                      setOpen(false);
                      navigate({ to: r.href });
                    }}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-surface-hover-bg"
                  >
                    <span
                      className="flex h-8 w-8 items-center justify-center rounded-row bg-surface-hover-bg text-fg-secondary"
                      style={c ? { background: c.bg, color: c.fg } : undefined}
                    >
                      <Icon name={KIND_ICON[r.kind]} size={16} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-fg">{r.title}</span>
                      {r.subtitle && (
                        <span className="block truncate text-xs text-fg-muted">{r.subtitle}</span>
                      )}
                    </span>
                  </button>
                );
              })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SearchButton() {
  const setTopBarSearchOpen = useDialogs((s) => s.setTopBarSearchOpen);
  return (
    <IconButton
      icon="search"
      size="md"
      variant="dark"
      className="shrink-0"
      label={m.search_placeholder()}
      onClick={() => setTopBarSearchOpen(true)}
    />
  );
}

function NotificationsBell() {
  const { data } = useNotifications();
  const markRead = useMarkNotificationsRead();
  const unread = data?.some((n) => !n.read);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <IconButton
          icon="bell"
          variant="neutral"
          size="md"
          dot={unread}
          label="Notifications"
          onClick={() => {
            if (unread) markRead.mutate();
          }}
          className="shrink-0"
        />
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <Card radius="card" border="solid" className="block p-1">
          <div className="t-label border-b border-divider px-4 py-3 text-fg-muted">
            {m.notifications_title()}
          </div>
          <div className="max-h-96 overflow-auto">
            {!data?.length && (
              <div className="t-body px-4 py-6 text-center text-fg-muted">
                {m.notifications_empty()}
              </div>
            )}
            {data?.map((n) => (
              <div
                key={n.id}
                className="flex gap-3 border-b border-divider px-4 py-3 last:border-0"
              >
                <span className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-row text-solid-accent-1">
                  <Icon
                    name={n.kind === 'event' ? 'schedule' : n.kind === 'quiz' ? 'quiz' : 'bell'}
                    size={20}
                  />
                </span>
                <div className="t-body flex flex-col">
                  <p className="m-0 font-semibold">{n.title}</p>
                  <p className="m-0 text-fg-secondary">{n.body}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </PopoverContent>
    </Popover>
  );
}

function ProfilePillInner({ onLogout }: { onLogout?: () => void }) {
  const { data: me } = useMe();
  const navigate = useNavigate();

  return (
    <Menu
      align="end"
      trigger={
        <button className="flex items-center gap-2.5 rounded-card bg-surface py-1 pr-3 pl-1 hover:bg-surface-hover-bg lg:rounded-pill">
          <Avatar name={me?.name} src={me?.avatarUrl} size="md" />
          <span className="text-left">
            <span className="block font-bold">{me?.name ?? '—'}</span>
          </span>
          <Icon name="chevronDown" size={16} className="text-fg-muted" />
        </button>
      }
      items={[
        {
          label: m.profile_menu_profile(),
          icon: 'profile',
          onClick: () => navigate({ to: '/profile' }),
        },
        {
          label: m.profile_menu_subscription(),
          icon: 'settings',
          onClick: () => navigate({ to: '/subscription' }),
        },
        {
          label: m.profile_menu_settings(),
          icon: 'settings',
          onClick: () => navigate({ to: '/settings' }),
        },
        {
          label: m.profile_menu_logout(),
          icon: 'logout',
          danger: true,
          onClick: onLogout,
        },
      ]}
    />
  );
}

function ClerkProfilePill() {
  const { signOut } = useClerk();
  return <ProfilePillInner onLogout={() => void signOut()} />;
}

function ProfilePill() {
  if (USE_MSW) return <ProfilePillInner />;
  return <ClerkProfilePill />;
}

export function TopInsetBar({ className }: { className?: string }) {
  return (
    // the border radius should match the large panel/panel with inverted radius
    <Card
      theme="gray"
      radius="unset"
      className={cn(
        'top-inset-bar-shape flex-row items-center justify-between gap-2.5 py-1.5 pr-3 pl-4',
        className
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2.5">
        <MobileNav className="lg:hidden" />
        <div className="hidden lg:block">
          <SearchButton />
        </div>
        <NotificationsBell />
      </div>
      <ProfilePill />
    </Card>
  );
}
