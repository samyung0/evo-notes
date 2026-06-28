import { useState } from 'react';
import { cn } from '@/lib/cn';
import { Icon, IconButton } from '@/components/ui';
import { MONTHS, WEEKDAYS, addMonths, monthGrid, sameDay, startOfDay } from './dateUtils';

export interface MiniCalendarProps {
  month: Date;
  onMonthChange: (d: Date) => void;
  selected: Date;
  onSelect: (d: Date) => void;
  /** ISO dates that have events — rendered with a dot. */
  eventDays?: Set<string>;
  /**
   * Inclusive range to highlight with a grey band — mirrors the span shown in
   * the main calendar. When omitted, falls back to a ring on `selected`.
   */
  rangeStart?: Date;
  rangeEnd?: Date;
}

export function MiniCalendar({
  month,
  onMonthChange,
  selected,
  onSelect,
  eventDays,
  rangeStart,
  rangeEnd,
}: MiniCalendarProps) {
  const [picking, setPicking] = useState(false);
  const today = new Date();
  const grid = monthGrid(month);
  const hasRange = !!(rangeStart && rangeEnd);
  const rs = rangeStart ? startOfDay(rangeStart).getTime() : 0;
  const re = rangeEnd ? startOfDay(rangeEnd).getTime() : 0;
  const inRange = (d: Date) => {
    const t = startOfDay(d).getTime();
    return t >= rs && t <= re;
  };

  return (
    <div className="">
      <div className="mb-2 flex items-center justify-between">
        <button
          onClick={() => setPicking((p) => !p)}
          className="t-card-title translate-y-px rounded-row px-2.5 py-1 text-left text-fg hover:bg-surface-hover-bg"
        >
          {MONTHS[month.getMonth()]} {month.getFullYear()}
        </button>
        <div className="flex items-center gap-1">
          <IconButton
            icon="chevronLeft"
            variant="ghost"
            size="sm"
            className="text-fg-muted hover:bg-surface-hover-bg"
            onClick={() => onMonthChange(addMonths(month, -1))}
            label="Previous month"
          />
          <IconButton
            icon="chevronRight"
            variant="ghost"
            size="sm"
            className="text-fg-muted hover:bg-surface-hover-bg"
            onClick={() => onMonthChange(addMonths(month, 1))}
            label="Next month"
          />
        </div>
      </div>

      {picking ? (
        <div className="py-1">
          <div className="mb-2 flex items-center justify-between">
            <button
              onClick={() => onMonthChange(new Date(month.getFullYear() - 1, month.getMonth(), 1))}
              className="rounded-row p-1 text-fg-muted hover:bg-surface-hover-bg"
              aria-label="Previous year"
            >
              <Icon name="chevronLeft" size={16} />
            </button>
            <span className="text-sm font-bold">{month.getFullYear()}</span>
            <button
              onClick={() => onMonthChange(new Date(month.getFullYear() + 1, month.getMonth(), 1))}
              className="rounded-row p-1 text-fg-muted hover:bg-surface-hover-bg"
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
                  'rounded-row py-1.5 text-xs font-medium hover:bg-surface-hover-bg',
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
          <div className="grid grid-cols-7 gap-x-0">
            {WEEKDAYS.map((w) => (
              <div key={w} className="py-1 text-center text-[0.68rem] font-semibold text-fg-muted">
                {w[0]}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-x-0 gap-y-0.5">
            {grid.map((day, i) => {
              const inMonth = day.getMonth() === month.getMonth();
              const isToday = sameDay(day, today);
              const isSel = sameDay(day, selected);
              const isRange = hasRange && inRange(day);
              const isRangeStart = !!rangeStart && sameDay(day, rangeStart);
              const isRangeEnd = !!rangeEnd && sameDay(day, rangeEnd);
              const hasEvent = eventDays?.has(day.toDateString());
              return (
                <button
                  key={i}
                  onClick={() => onSelect(day)}
                  className={cn(
                    'relative flex h-8 items-center justify-center transition-colors',
                    // connected range band — spans the full cell so adjacent days touch
                    isRange && 'bg-page',
                    isRange && isRangeStart && 'rounded-l-row',
                    isRange && isRangeEnd && 'rounded-r-row'
                  )}
                >
                  <span
                    className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-row text-[0.8rem]',
                      isToday && 'bg-action font-bold text-action-fg',
                      !isToday && isRange && 'font-semibold text-fg',
                      !isToday && !isRange && hasRange && 'hover:bg-surface-hover-bg',
                      !isToday && !hasRange && isSel && 'ring-[1.5px] ring-action',
                      !isToday &&
                        !isRange &&
                        (inMonth
                          ? 'text-fg hover:bg-surface-hover-bg'
                          : 'text-fg-muted hover:bg-surface-hover-bg')
                    )}
                  >
                    {day.getDate()}
                  </span>
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
