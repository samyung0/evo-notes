import { cn } from '@/lib/cn';
import { colorPair } from '@/lib/workspaceColor';
import type { CalendarEvent, Label } from '@/api/types';
import { WEEKDAYS, monthGrid, sameDay } from './dateUtils';

export function MonthView({
  month,
  events,
  labels,
  onSelectEvent,
}: {
  month: Date;
  events: CalendarEvent[];
  labels: Label[];
  onSelectEvent: (ev: CalendarEvent, anchor: { x: number; y: number }) => void;
}) {
  const grid = monthGrid(month);
  const today = new Date();

  function colorFor(ev: CalendarEvent) {
    const first = labels.find((l) => l.id === ev.labelIds[0]);
    return first
      ? colorPair(first.color)
      : { bg: 'var(--surface-inset-bg)', fg: 'var(--text-secondary)' };
  }

  return (
    <div className="flex h-full flex-col">
      <div className="grid grid-cols-7 border-b border-divider">
        {WEEKDAYS.map((w) => (
          <div key={w} className="py-2 text-center text-[0.7rem] font-semibold text-fg-muted">
            {w}
          </div>
        ))}
      </div>
      <div className="grid flex-1 grid-cols-7 grid-rows-6">
        {grid.map((day, i) => {
          const inMonth = day.getMonth() === month.getMonth();
          const isToday = sameDay(day, today);
          const dayEvents = events.filter((e) => sameDay(new Date(e.start), day));
          return (
            <div key={i} className="min-h-0 overflow-hidden border-r border-b border-divider p-1">
              <div
                className={cn(
                  'mb-1 flex h-6 w-6 items-center justify-center rounded-pill text-xs',
                  isToday
                    ? 'bg-action font-bold text-action-fg'
                    : inMonth
                      ? 'text-fg'
                      : 'text-fg-muted'
                )}
              >
                {day.getDate()}
              </div>
              <div className="flex flex-col gap-0.5">
                {dayEvents.slice(0, 3).map((ev) => {
                  const c = colorFor(ev);
                  return (
                    <button
                      key={ev.id}
                      onClick={(e) => onSelectEvent(ev, { x: e.clientX, y: e.clientY })}
                      className="truncate rounded px-1.5 py-0.5 text-left text-[0.66rem] font-medium"
                      style={{ background: c.bg, color: c.fg }}
                    >
                      {ev.title}
                    </button>
                  );
                })}
                {dayEvents.length > 3 && (
                  <span className="px-1 text-[0.62rem] text-fg-muted">
                    +{dayEvents.length - 3} more
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
