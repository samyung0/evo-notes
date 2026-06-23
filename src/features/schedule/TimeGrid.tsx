import { cn } from '@/lib/cn';
import { colorPair } from '@/lib/workspaceColor';
import type { CalendarEvent, Label } from '@/api/types';
import { fmtTime, hourOf, sameDay } from './dateUtils';

const HOUR_H = 48;
const WEEKDAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function TimeGrid({
  days,
  events,
  labels,
  selectedId,
  onSelectEvent,
}: {
  days: Date[];
  events: CalendarEvent[];
  labels: Label[];
  selectedId: string | null;
  onSelectEvent: (ev: CalendarEvent, anchor: { x: number; y: number }) => void;
}) {
  const today = new Date();
  const nowTop = (today.getHours() + today.getMinutes() / 60) * HOUR_H;

  function colorFor(ev: CalendarEvent) {
    const first = labels.find((l) => l.id === ev.labelIds[0]);
    return first
      ? colorPair(first.color)
      : {
          bg: 'var(--surface-inset-bg)',
          fg: 'var(--text-secondary)',
          fgMuted: 'var(--text-muted)',
          solid: 'var(--text-muted)',
        };
  }

  return (
    <div className="flex flex-col">
      {/* header row */}
      <div className="sticky top-0 z-10 flex border-b border-divider bg-surface">
        <div className="w-14 shrink-0" />
        {days.map((d) => {
          const isToday = sameDay(d, today);
          return (
            <div key={d.toISOString()} className="flex-1 py-2 text-center">
              <div className="text-[0.7rem] font-semibold text-fg-muted">
                {WEEKDAY_SHORT[(d.getDay() + 6) % 7]}
              </div>
              <div
                className={cn(
                  'mx-auto mt-0.5 flex h-7 w-7 items-center justify-center rounded-pill text-sm',
                  isToday ? 'bg-action font-bold text-action-fg' : 'text-fg'
                )}
              >
                {d.getDate()}
              </div>
            </div>
          );
        })}
      </div>

      {/* scroll body */}
      <div className="relative flex" style={{ height: HOUR_H * 24 }}>
        {/* hour gutter */}
        <div className="w-14 shrink-0">
          {Array.from({ length: 24 }, (_, h) => (
            <div key={h} className="relative" style={{ height: HOUR_H }}>
              <span className="absolute -top-2 right-2 text-[0.66rem] text-fg-muted">
                {h === 0 ? '' : `${h}:00`}
              </span>
            </div>
          ))}
        </div>

        {days.map((d) => {
          const isToday = sameDay(d, today);
          const dayEvents = events.filter((e) => sameDay(new Date(e.start), d));
          return (
            <div
              key={d.toISOString()}
              className={cn(
                'relative flex-1 border-l border-divider',
                isToday && 'bg-surface-hover-bg/40'
              )}
            >
              {/* gridlines */}
              {Array.from({ length: 24 }, (_, h) => (
                <div key={h} className="border-b border-divider" style={{ height: HOUR_H }} />
              ))}
              {/* events */}
              {dayEvents.map((ev) => {
                const c = colorFor(ev);
                const top = hourOf(ev.start) * HOUR_H;
                const height = Math.max(24, (hourOf(ev.end) - hourOf(ev.start)) * HOUR_H);
                return (
                  <button
                    key={ev.id}
                    onClick={(e) => onSelectEvent(ev, { x: e.clientX, y: e.clientY })}
                    className={cn(
                      'absolute right-1 left-1 overflow-hidden rounded-row px-2 py-1 text-left',
                      selectedId === ev.id && 'ring-2 ring-fg'
                    )}
                    style={{ top, height, background: c.bg, color: c.fg }}
                  >
                    <span className="block truncate text-[0.72rem] font-bold">{ev.title}</span>
                    <span className="block truncate text-[0.62rem] opacity-80">
                      {fmtTime(ev.start)}
                    </span>
                  </button>
                );
              })}
              {/* current time line */}
              {isToday && (
                <div
                  className="pointer-events-none absolute right-0 left-0 z-10"
                  style={{ top: nowTop }}
                >
                  <div className="relative border-t-2 border-solid-error">
                    <span className="absolute -top-1 -left-1 h-2 w-2 rounded-full bg-solid-error" />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
