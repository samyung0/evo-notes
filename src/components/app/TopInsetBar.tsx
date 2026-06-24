import { useRef, useState } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { Dialog } from 'radix-ui';
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

function SearchButton() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const debounced = useDebounced(q, 400);
  const { data, isFetching } = useSearch(debounced);
  const navigate = useNavigate();
  const query = debounced.trim();

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setQ('');
      }}
    >
      <Dialog.Trigger asChild>
        <IconButton
          icon="search"
          size="sm"
          label={m.search_placeholder()}
          className="bg-[#222222] text-white hover:bg-[#222222]/90"
        />
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay data-slot="dialog-overlay" className="fixed inset-0 z-50 bg-black/50" />
        <Dialog.Content
          data-slot="dialog-content"
          aria-describedby={undefined}
          className="fixed top-[12vh] left-1/2 z-50 w-full max-w-xl px-4 outline-none transform-[translateX(-50%)]"
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            (e.currentTarget as HTMLElement).querySelector('input')?.focus();
          }}
        >
          <Dialog.Title className="sr-only">{m.search_placeholder()}</Dialog.Title>
          <Card radius="card-lg" raised className="w-full items-stretch gap-0 overflow-hidden p-0">
            <div className="flex max-h-[70vh] flex-col">
              <div className="flex items-center gap-2.5 border-b border-divider px-4 py-3">
                <Icon name="search" size={18} className="text-fg-muted" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder={m.search_placeholder()}
                  className="min-w-0 flex-1 border-none bg-transparent text-sm text-fg outline-none placeholder:text-placeholder"
                />
                <Dialog.Close asChild>
                  <IconButton icon="x" variant="ghost" size="sm" label="Close" />
                </Dialog.Close>
              </div>
              <div className="relative min-h-40 flex-1 overflow-auto py-1">
                {isFetching && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Spinner size={22} />
                  </div>
                )}
                {!isFetching && !query && (
                  <div className="absolute inset-0 flex items-center justify-center text-center text-sm text-fg-muted">
                    {m.search_placeholder()}
                  </div>
                )}
                {!isFetching && query && !data?.length && (
                  <div className="px-4 py-8 text-center text-sm text-fg-muted">
                    No matches for "{query}".
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
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
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
        <SearchButton />
        <NotificationsBell />
      </div>
      <ProfilePill />
    </Card>
  );
}
