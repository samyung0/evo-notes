import { useRef, useState } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { cn } from '@/lib/cn';
import { useDebounced } from '@/lib/useDebounced';
import { useOutsideClick } from '@/lib/useOutsideClick';
import { Avatar, Card, Icon, IconButton, Spinner } from '@/components/ui';
import { useMe, useNotifications, useSearch, useMarkNotificationsRead } from '@/api/hooks';
import type { SearchKind } from '@/api/types';
import { m } from '@/i18n';

const KIND_ICON: Record<SearchKind, Parameters<typeof Icon>[0]['name']> = {
  workspace: 'workspaces',
  file: 'files',
  event: 'schedule',
  flashcards: 'flashcards',
  thinking: 'notes',
};

function SearchBox() {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const debounced = useDebounced(q, 250);
  const { data, isFetching } = useSearch(debounced);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  useOutsideClick(ref, () => setOpen(false), open);

  return (
    <div ref={ref} className="relative min-w-0 flex-1">
      <div className="flex items-center gap-2 rounded-input bg-surface px-3 py-2.5">
        <Icon name="search" size={18} className="text-fg-muted" />
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={m.search_placeholder()}
          className="min-w-0 flex-1 border-none bg-transparent text-sm text-fg outline-none placeholder:text-placeholder"
        />
        {isFetching && <Spinner size={14} />}
      </div>
      {open && debounced.trim() && (
        <div className="absolute top-full right-0 left-0 z-30 mt-1.5 max-h-80 overflow-auto rounded-card border border-line bg-surface py-1 shadow-pop">
          {!data?.length && (
            <div className="px-3 py-3 text-sm text-fg-muted">No matches for “{debounced}”.</div>
          )}
          {data?.map((r) => (
            <button
              key={`${r.kind}-${r.id}`}
              onClick={() => {
                setOpen(false);
                setQ('');
                navigate({ to: r.href });
              }}
              className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-surface-hover-bg"
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
      )}
    </div>
  );
}

function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { data } = useNotifications();
  const markRead = useMarkNotificationsRead();
  useOutsideClick(ref, () => setOpen(false), open);
  const unread = data?.some((n) => !n.read);

  return (
    <div ref={ref} className="relative">
      <IconButton
        icon="bell"
        variant="outline"
        size="sm"
        dot={unread}
        label="Notifications"
        onClick={() => {
          setOpen((o) => !o);
          if (!open && unread) markRead.mutate();
        }}
      />
      {open && (
        <div className="absolute top-full right-0 z-30 mt-1.5 w-80 overflow-hidden rounded-card border border-line bg-surface shadow-pop">
          <div className="t-label border-b border-divider px-4 py-3 text-fg-muted">
            {m.notifications_title()}
          </div>
          <div className="max-h-96 overflow-auto">
            {!data?.length && (
              <div className="px-4 py-6 text-center text-sm text-fg-muted">
                {m.notifications_empty()}
              </div>
            )}
            {data?.map((n) => (
              <div
                key={n.id}
                className="flex gap-3 border-b border-divider px-4 py-3 last:border-0"
              >
                <span className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-row bg-tint-accent-1 text-tint-accent-1-fg">
                  <Icon
                    name={n.kind === 'event' ? 'schedule' : n.kind === 'quiz' ? 'quiz' : 'bell'}
                    size={14}
                  />
                </span>
                <div className="min-w-0">
                  <p className="m-0 text-sm font-semibold text-fg">{n.title}</p>
                  <p className="m-0 text-xs text-fg-secondary">{n.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ProfilePill() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { data: me } = useMe();
  useOutsideClick(ref, () => setOpen(false), open);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2.5 rounded-pill bg-surface py-1 pr-3 pl-1 hover:bg-surface-hover-bg"
      >
        <Avatar name={me?.name} src={me?.avatarUrl} size="md" />
        <span className="hidden text-left sm:block">
          <span className="block text-sm leading-tight font-bold text-fg">{me?.name ?? '—'}</span>
          <span className="block text-[11px] leading-tight text-fg-muted">{me?.classLabel}</span>
        </span>
        <Icon name="chevronDown" size={16} className="text-fg-muted" />
      </button>
      {open && (
        <div className="absolute top-full right-0 z-30 mt-1.5 w-48 overflow-hidden rounded-card border border-line bg-surface py-1 shadow-pop">
          <Link
            to="/profile"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-3 py-2 text-sm text-fg hover:bg-surface-hover-bg"
          >
            <Icon name="profile" size={16} /> {m.profile_menu_profile()}
          </Link>
          <Link
            to="/settings"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-3 py-2 text-sm text-fg hover:bg-surface-hover-bg"
          >
            <Icon name="settings" size={16} /> {m.profile_menu_settings()}
          </Link>
          <button className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-tint-error-fg hover:bg-tint-error">
            <Icon name="logout" size={16} /> {m.profile_menu_logout()}
          </button>
        </div>
      )}
    </div>
  );
}

export function TopInsetBar({ className }: { className?: string }) {
  return (
    <Card
      theme="gray"
      radius="card-xl"
      className={cn('flex h-14 flex-row items-center justify-between gap-2.5 px-4', className)}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2.5">
        <SearchBox />
        <NotificationsBell />
      </div>
      <ProfilePill />
    </Card>
  );
}
