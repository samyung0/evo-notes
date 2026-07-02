import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { cn } from '@/lib/cn';
import { Button, Icon, IconButton } from '@/components/ui';
import { userColorPair } from '@/lib/userColor';
import { useEvents, useLabels } from '@/api/hooks';
import type { CalendarEvent, Label } from '@/api/types';
import { m } from '@/i18n';
import { MONTHS, addDays, sameDay, startOfDay } from './dateUtils';

const WEEKDAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/** Compact 12-hour clock — "8:30", "2:00", "12:15". */
function clock(iso: string): string {
  const d = new Date(iso);
  const m = d.getMinutes();
  const h = d.getHours() % 12 === 0 ? 12 : d.getHours() % 12;
  return m === 0 ? `${h}:00` : `${h}:${String(m).padStart(2, '0')}`;
}

/** Resolves an event's color from its first label — mirrors TimeGrid. */
function colorFor(ev: CalendarEvent, labels: Label[]) {
  const first = labels.find((l) => l.id === ev.labelIds[0]);
  return first ? userColorPair(first.color) : null;
}

/**
 * Dashboard-only calendar: a 7-day strip centred on today plus the selected
 * day's agenda. The current-time line is parked ~20% from the top so upcoming
 * items sit in view without a scrollbar.
 */
export function DashboardCalendar() {
  const navigate = useNavigate();
  const { data: events } = useEvents();
  const { data: labels } = useLabels();

  const [now, setNow] = useState(() => new Date());
  // Centre of the visible strip — today by default ("today in the middle").
  const [anchor, setAnchor] = useState(() => startOfDay(new Date()));
  const [selected, setSelected] = useState(() => startOfDay(new Date()));

  // Keep the now-line honest as the day rolls on.
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const week = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(anchor, i - 3)), [anchor]);

  const eventDays = useMemo(
    () => new Set((events ?? []).map((e) => new Date(e.start).toDateString())),
    [events]
  );

  const dayEvents = useMemo(
    () =>
      (events ?? [])
        .filter((e) => sameDay(new Date(e.start), selected))
        .sort((a, b) => +new Date(a.start) - +new Date(b.start)),
    [events, selected]
  );

  const isTodaySelected = sameDay(selected, now);
  // Index of the first event that starts after "now" — where the line lands.
  const nowIndex = isTodaySelected ? dayEvents.findIndex((e) => +new Date(e.start) > +now) : -1;
  const showNow = isTodaySelected;
  const nowAt = showNow ? (nowIndex === -1 ? dayEvents.length : nowIndex) : -1;

  const scrollRef = useRef<HTMLDivElement>(null);
  const nowRef = useRef<HTMLDivElement>(null);

  // Park the now-line ~20% down so what's next is immediately visible.
  useLayoutEffect(() => {
    const c = scrollRef.current;
    if (!c) return;
    const n = nowRef.current;
    c.scrollTop = n ? Math.max(0, n.offsetTop - c.clientHeight * 0.2) : 0;
  }, [selected, dayEvents, nowAt]);

  const dayLabel = isTodaySelected
    ? `Today, ${WEEKDAY_SHORT[(selected.getDay() + 6) % 7]}`
    : `${WEEKDAY_SHORT[(selected.getDay() + 6) % 7]}, ${MONTHS[selected.getMonth()].slice(0, 3)} ${selected.getDate()}`;

  function shiftWeek(dir: number) {
    const next = addDays(anchor, dir * 7);
    setAnchor(next);
    setSelected(next);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* month + week navigation */}
      <div className="mb-2 flex items-center justify-between">
        <span className="t-card-title">
          {MONTHS[anchor.getMonth()].slice(0, 3)} {anchor.getFullYear()}
        </span>
        <div className="flex items-center gap-1">
          <IconButton
            icon="chevronLeft"
            variant="ghost"
            size="sm"
            className="text-fg-muted hover:bg-surface-hover-bg"
            onClick={() => shiftWeek(-1)}
            label="Previous week"
          />
          <IconButton
            icon="chevronRight"
            variant="ghost"
            size="sm"
            className="text-fg-muted hover:bg-surface-hover-bg"
            onClick={() => shiftWeek(1)}
            label="Next week"
          />
        </div>
      </div>

      {/* 7-day strip */}
      <div className="grid grid-cols-7 gap-0.5">
        {week.map((day) => {
          const isToday = sameDay(day, now);
          const isSel = sameDay(day, selected);
          const hasEvent = eventDays.has(day.toDateString());
          return (
            <button
              key={day.toISOString()}
              onClick={() => setSelected(startOfDay(day))}
              className="flex flex-col items-center gap-1 py-1"
            >
              <span className="text-[0.68rem] font-semibold text-fg-muted">
                {WEEKDAY_SHORT[(day.getDay() + 6) % 7][0]}
              </span>
              <span
                className={cn(
                  'relative flex h-8 w-8 items-center justify-center rounded-full text-[0.8rem] font-semibold transition-colors',
                  isToday && 'bg-action font-bold text-action-fg',
                  !isToday && isSel && 'text-fg ring-[1.5px] ring-action',
                  !isToday && !isSel && 'text-fg hover:bg-surface-hover-bg'
                )}
              >
                {day.getDate()}
                {hasEvent && !isToday && (
                  <span className="absolute bottom-0.5 h-1 w-1 rounded-full bg-fg-muted" />
                )}
              </span>
            </button>
          );
        })}
      </div>

      {/* selected-day label + see calendar — sits between strip and agenda */}
      <div className="mt-3 mb-1 flex items-center justify-between">
        <span className="t-body font-bold text-fg">{dayLabel}</span>
        <Button variant="ghost-link" size="sm" asChild className="p-0">
          <Link to="/schedule" preload="intent">
            {m.schedule_see_calendar()}
          </Link>
        </Button>
      </div>

      {/* agenda — overflow hidden so no scrollbar; now-line parked at ~20% */}
      <div ref={scrollRef} className="relative min-h-0 flex-1 overflow-hidden">
        {dayEvents.length === 0 ? (
          <EmptyDay />
        ) : (
          <div className="flex flex-col gap-1.5 pt-0.5 pb-1">
            {dayEvents.map((ev, i) => (
              <div key={ev.id}>
                {showNow && nowAt === i && (
                  <div ref={nowRef}>
                    <NowLine />
                  </div>
                )}
                <EventRow
                  ev={ev}
                  labels={labels ?? []}
                  onOpen={() => navigate({ to: '/schedule' })}
                />
              </div>
            ))}
            {showNow && nowAt === dayEvents.length && (
              <div ref={nowRef}>
                <NowLine />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function EventRow({
  ev,
  labels,
  onOpen,
}: {
  ev: CalendarEvent;
  labels: Label[];
  onOpen: () => void;
}) {
  const c = colorFor(ev, labels);
  return (
    <button onClick={onOpen} className="flex w-full items-stretch gap-2 text-left">
      <span className="w-10 shrink-0 pt-2.5 text-right text-[0.7rem] font-semibold text-fg-muted">
        {clock(ev.start)}
      </span>
      <span className="flex flex-1 items-center gap-2.5 rounded-row bg-page px-2.5 py-2 transition-[filter] hover:brightness-95">
        <span
          className="flex size-8 shrink-0 items-center justify-center rounded-full"
          style={
            c
              ? { background: c.bg, color: c.fg }
              : { background: 'var(--color-surface-hover-bg)', color: 'var(--color-fg-muted)' }
          }
        >
          <Icon name="book" size={16} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[0.82rem] font-bold text-fg">{ev.title}</span>
          {ev.location && (
            <span className="block truncate text-[0.72rem] text-fg-muted">{ev.location}</span>
          )}
          <span className="block truncate text-[0.72rem] text-fg-muted">
            {clock(ev.start)} – {clock(ev.end)}
          </span>
        </span>
        <Icon name="chevronRight" size={15} className="shrink-0 text-fg-muted" />
      </span>
    </button>
  );
}

function NowLine() {
  return (
    <div className="flex items-center gap-2 py-1.5">
      <span className="w-10 shrink-0 text-right text-[0.7rem] font-bold text-solid-error">
        {m.schedule_now()}
      </span>
      <span className="relative flex-1">
        <span className="block border-t-2 border-solid-error" />
        <span className="absolute top-1/2 -left-1 h-2 w-2 -translate-y-1/2 rounded-full bg-solid-error" />
      </span>
    </div>
  );
}

function EmptyDay() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center text-fg-muted">
      <Icon name="schedule" size={22} />
      <span className="t-body">{m.schedule_empty_day()}</span>
    </div>
  );
}
