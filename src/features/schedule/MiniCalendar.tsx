import { useState } from 'react';
import { cn } from '@/lib/cn';
import { Icon } from '@/components/ui';
import { MONTHS, WEEKDAYS, addMonths, monthGrid, sameDay } from './dateUtils';

export interface MiniCalendarProps {
  month: Date;
  onMonthChange: (d: Date) => void;
  selected: Date;
  onSelect: (d: Date) => void;
  /** ISO dates that have events — rendered with a dot. */
  eventDays?: Set<string>;
}

export function MiniCalendar({
  month,
  onMonthChange,
  selected,
  onSelect,
  eventDays,
}: MiniCalendarProps) {
  const [picking, setPicking] = useState(false);
  const today = new Date();
  const grid = monthGrid(month);

  return (
    <div className="rounded-card border border-line bg-surface p-3.5 shadow-card">
      <div className="mb-2 flex items-center justify-between">
        <button
          onClick={() => setPicking((p) => !p)}
          className="hover:bg-surface-hover-bg rounded-row px-2 py-1 text-sm font-bold text-fg"
        >
          {MONTHS[month.getMonth()]} {month.getFullYear()}
        </button>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onMonthChange(addMonths(month, -1))}
            className="hover:bg-surface-hover-bg rounded-row p-1 text-fg-muted"
            aria-label="Previous month"
          >
            <Icon name="chevronLeft" size={16} />
          </button>
          <button
            onClick={() => onMonthChange(addMonths(month, 1))}
            className="hover:bg-surface-hover-bg rounded-row p-1 text-fg-muted"
            aria-label="Next month"
          >
            <Icon name="chevronRight" size={16} />
          </button>
        </div>
      </div>

      {picking ? (
        <div className="py-1">
          <div className="mb-2 flex items-center justify-between">
            <button
              onClick={() => onMonthChange(new Date(month.getFullYear() - 1, month.getMonth(), 1))}
              className="hover:bg-surface-hover-bg rounded-row p-1 text-fg-muted"
              aria-label="Previous year"
            >
              <Icon name="chevronLeft" size={16} />
            </button>
            <span className="text-sm font-bold">{month.getFullYear()}</span>
            <button
              onClick={() => onMonthChange(new Date(month.getFullYear() + 1, month.getMonth(), 1))}
              className="hover:bg-surface-hover-bg rounded-row p-1 text-fg-muted"
              aria-label="Next year"
            >
              <Icon name="chevronRight" size={16} />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-1">
            {MONTHS.map((mo, i) => (
              <button
                key={mo}
                onClick={() => {
                  onMonthChange(new Date(month.getFullYear(), i, 1));
                  setPicking(false);
                }}
                className={cn(
                  'hover:bg-surface-hover-bg rounded-row py-1.5 text-xs font-medium',
                  i === month.getMonth() ? 'bg-action text-action-fg' : 'text-fg'
                )}
              >
                {mo.slice(0, 3)}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-7 gap-0.5">
            {WEEKDAYS.map((w) => (
              <div key={w} className="py-1 text-center text-[0.68rem] font-semibold text-fg-muted">
                {w[0]}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-0.5">
            {grid.map((day, i) => {
              const inMonth = day.getMonth() === month.getMonth();
              const isToday = sameDay(day, today);
              const isSel = sameDay(day, selected);
              const hasEvent = eventDays?.has(day.toDateString());
              return (
                <button
                  key={i}
                  onClick={() => onSelect(day)}
                  className={cn(
                    'relative mx-auto flex h-8 w-8 items-center justify-center rounded-row text-[0.8rem] transition-colors',
                    isToday && 'bg-action font-bold text-action-fg',
                    !isToday && isSel && 'ring-[1.5px] ring-action',
                    !isToday &&
                      (inMonth
                        ? 'hover:bg-surface-hover-bg text-fg'
                        : 'hover:bg-surface-hover-bg text-fg-muted')
                  )}
                >
                  {day.getDate()}
                  {hasEvent && !isToday && (
                    <span className="absolute bottom-1 h-1 w-1 rounded-full bg-solid-purple" />
                  )}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
