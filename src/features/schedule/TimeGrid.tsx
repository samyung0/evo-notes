import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/cn';
import { userColorPair } from '@/lib/userColor';
import type { CalendarEvent, Label } from '@/api/types';
import { fmtHour, fmtTime, hourOf, sameDay } from './dateUtils';

export const HOUR_H = 48;
const WEEKDAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function TimeGrid({
  days,
  events,
  labels,
  selectedId,
  onSelectEvent,
  onCreateSlot,
  scrollContainerRef,
}: {
  days: Date[];
  events: CalendarEvent[];
  labels: Label[];
  selectedId: string | null;
  onSelectEvent: (ev: CalendarEvent, anchor: { x: number; y: number }) => void;
  onCreateSlot?: (start: Date, end: Date) => void;
  scrollContainerRef?: React.RefObject<HTMLDivElement | null>;
}) {
  const today = new Date();
  const nowTop = (today.getHours() + today.getMinutes() / 60) * HOUR_H;
  const todayIdx = days.findIndex((d) => sameDay(d, today));
  const isWeek = days.length > 1;

  const nowRef = useRef<HTMLDivElement>(null);
  const [pendingSlot, setPendingSlot] = useState<{ day: string; hour: number } | null>(null);

  // auto-scroll so the now-line sits ~30% from the top of the viewport.
  useEffect(() => {
    if (todayIdx < 0) return;
    const c = scrollContainerRef?.current;
    const n = nowRef.current;
    if (!c || !n) return;
    const cr = c.getBoundingClientRect();
    const nr = n.getBoundingClientRect();
    c.scrollTop += nr.top - cr.top - cr.height * 0.3;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days.map((d) => d.toDateString()).join()]);

  // drop the pending highlight once the data updates (e.g. event created).
  useEffect(() => setPendingSlot(null), [events]);

  function colorFor(ev: CalendarEvent) {
    const first = labels.find((l) => l.id === ev.labelIds[0]);
    return first
      ? userColorPair(first.color)
      : {
          bg: 'var(--surface-inset-bg)',
          fg: 'var(--text-secondary)',
          fgMuted: 'var(--text-muted)',
          solid: 'var(--text-muted)',
        };
  }

  function handleSlotClick(d: Date, e: React.MouseEvent<HTMLDivElement>) {
    if (!onCreateSlot) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const hour = Math.max(0, Math.min(23, Math.floor((e.clientY - rect.top) / HOUR_H)));
    const start = new Date(d);
    start.setHours(hour, 0, 0, 0);
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    setPendingSlot({ day: d.toDateString(), hour });
    onCreateSlot(start, end);
  }

  return (
    <div className="flex flex-col">
      {/* header row */}
      <div className="sticky top-0 z-10 flex border-b border-divider bg-surface">
        <div className="w-14 shrink-0" />
        {days.map((d) => {
          const isToday = sameDay(d, today);
          return (
            <div
              key={d.toISOString()}
              className={cn(
                'flex-1 py-2 text-center',
                isToday && isWeek && 'rounded-t-xl bg-page/70'
              )}
            >
              <div className="text-sm font-semibold text-fg-muted">
                {WEEKDAY_SHORT[(d.getDay() + 6) % 7]}
              </div>
              <div className="mt-0.5 font-semibold">{d.getDate()}</div>
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
              <span className="absolute -top-2 right-2 text-xs font-medium text-fg-muted">
                {h === 0 ? '' : fmtHour(h)}
              </span>
            </div>
          ))}
        </div>

        {/* day columns */}
        <div className="relative flex flex-1">
          {days.map((d) => {
            const isToday = sameDay(d, today);
            const dayEvents = events.filter((e) => sameDay(new Date(e.start), d));
            return (
              <div
                key={d.toISOString()}
                onClick={(e) => handleSlotClick(d, e)}
                className={cn(
                  'relative flex-1 cursor-pointer',
                  isToday && isWeek && 'overflow-hidden rounded-b-xl bg-page/70'
                )}
              >
                {/* gridlines */}
                {Array.from({ length: 24 }, (_, h) => (
                  <div key={h} className="border-b border-divider" style={{ height: HOUR_H }} />
                ))}
                {/* pending new-event highlight */}
                {pendingSlot?.day === d.toDateString() && (
                  <div
                    className="pointer-events-none absolute right-1 left-1 z-1 rounded-row bg-page/70 ring-1 ring-action"
                    style={{ top: pendingSlot.hour * HOUR_H, height: HOUR_H }}
                  />
                )}
                {/* events */}
                {dayEvents.map((ev) => {
                  const c = colorFor(ev);
                  const top = hourOf(ev.start) * HOUR_H;
                  const height = Math.max(24, (hourOf(ev.end) - hourOf(ev.start)) * HOUR_H);
                  return (
                    <button
                      key={ev.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectEvent(ev, { x: e.clientX, y: e.clientY });
                      }}
                      className={cn(
                        'absolute right-1 left-1 z-2 flex flex-col overflow-hidden rounded-row px-2 py-1.5 text-left shadow-xs',
                        selectedId === ev.id && 'ring-2 ring-fg'
                      )}
                      style={{ top, height, background: c.bg, color: c.fg }}
                    >
                      <span className="block truncate text-xs font-bold">{ev.title}</span>
                      <span className="block truncate text-xs font-semibold opacity-80">
                        {fmtTime(ev.start)}
                      </span>
                    </button>
                  );
                })}
              </div>
            );
          })}

          {/* current-time line — dashed across the whole grid, solid over today */}
          {todayIdx >= 0 && (
            <div
              ref={nowRef}
              className="pointer-events-none absolute inset-x-0 z-10"
              style={{ top: nowTop }}
            >
              <div className="border-t-2 border-dashed border-solid-error/70" />
              <div
                className="absolute top-0 border-t-2 border-solid-error"
                style={{
                  left: `${(todayIdx / days.length) * 100}%`,
                  width: `${100 / days.length}%`,
                }}
              >
                <span className="absolute top-[-5px] -left-1 h-2 w-2 rounded-full bg-solid-error" />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
