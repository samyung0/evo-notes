import { useRef, useState } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { cn } from '@/lib/cn';
import { useDebounced } from '@/lib/useDebounced';
import { useOutsideClick } from '@/lib/useOutsideClick';
import {
  Avatar,
  Card,
  Icon,
  IconButton,
  Input,
  Spinner,
  DialogClose,
  DialogContent,
  DialogTitle,
  DialogTrigger,
  Popover,
  PopoverTrigger,
  Dialog,
  PopoverContent,
} from '@/components/ui';
import { useMe, useNotifications, useSearch, useMarkNotificationsRead } from '@/api/hooks';
import type { SearchKind } from '@/api/types';
import { m } from '@/i18n';
import { MobileNav } from './Sidebar';

const KIND_ICON: Record<SearchKind, Parameters<typeof Icon>[0]['name']> = {
  workspace: 'workspaces',
  file: 'files',
  event: 'schedule',
  flashcards: 'flashcards',
  thinking: 'notes',
};

function SearchButton() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const debounced = useDebounced(q, 400);
  const { data, isFetching } = useSearch(debounced);
  const navigate = useNavigate();
  const query = debounced.trim();

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setQ('');
      }}
    >
      <DialogTrigger asChild>
        <IconButton
          icon="search"
          size="md"
          variant="dark"
          className="shrink-0"
          label={m.search_placeholder()}
        />
      </DialogTrigger>
      <DialogContent
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          (e.currentTarget as HTMLElement).querySelector('input')?.focus();
        }}
        className="top-[12vh] translate-y-0"
        showCloseButton={false}
      >
        <DialogTitle className="sr-only">{m.search_placeholder()}</DialogTitle>
        <Card radius="card-lg" raised className="w-full items-stretch gap-0 overflow-hidden p-0">
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
              {isFetching && (
                <div className="absolute inset-0 flex items-center justify-center text-center text-sm text-fg-muted">
                  <Spinner size={22} className="-translate-y-1/2" />
                </div>
              )}
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
                data?.map((r) => (
                  <button
                    key={`${r.kind}-${r.id}`}
                    onClick={() => {
                      setOpen(false);
                      navigate({ to: r.href });
                    }}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-surface-hover-bg"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-row bg-surface-hover-bg text-fg-secondary">
                      <Icon name={KIND_ICON[r.kind]} size={16} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-fg">{r.title}</span>
                      {r.subtitle && (
                        <span className="block truncate text-xs text-fg-muted">{r.subtitle}</span>
                      )}
                    </span>
                  </button>
                ))}
            </div>
          </div>
        </Card>
      </DialogContent>
    </Dialog>
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

function ProfilePill() {
  const [open, setOpen] = useState(false);
  const { data: me } = useMe();

  return (
    <Popover open={open} onOpenChange={(next) => setOpen(next)}>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-2.5 rounded-card bg-surface py-1 pr-3 pl-1 hover:bg-surface-hover-bg lg:rounded-pill">
          <Avatar name={me?.name} src={me?.avatarUrl} size="md" />
          <span className="text-left">
            <span className="block font-bold">{me?.name ?? '—'}</span>
            {/* <span className="block text-[11px] leading-tight text-fg-muted">{me?.classLabel}</span> */}
          </span>
          <Icon name="chevronDown" size={16} className="text-fg-muted" />
        </button>
      </PopoverTrigger>
      <PopoverContent alignWidthToTrigger>
        <Card radius="row" border="solid" className="block p-1">
          <Link
            to="/profile"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 rounded-row px-3 py-2 hover:bg-surface-hover-bg"
          >
            <Icon name="profile" size={16} /> {m.profile_menu_profile()}
          </Link>
          <Link
            to="/settings"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 rounded-row px-3 py-2 hover:bg-surface-hover-bg"
          >
            <Icon name="settings" size={16} /> {m.profile_menu_settings()}
          </Link>
          <button className="flex w-full items-center gap-2.5 rounded-row px-3 py-2 text-tint-error-fg hover:bg-tint-error">
            <Icon name="logout" size={16} /> {m.profile_menu_logout()}
          </button>
        </Card>
      </PopoverContent>
    </Popover>
  );
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
