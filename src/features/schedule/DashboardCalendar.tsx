import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { cn } from '@/lib/cn';
import { Button, IconButton } from '@/components/ui';
import { useEvents, useLabels } from '@/api/hooks';
import { useDialogs } from '@/stores/dialogs';
import { m } from '@/i18n';
import { MONTHS, addDays, sameDay, startOfDay } from './dateUtils';
import { TimeGrid } from './TimeGrid';

const WEEKDAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/**
 * Dashboard-only calendar: a 7-day strip centred on today plus the selected
 * day's hourly grid (shared TimeGrid, day mode). Hovering a slot previews it
 * and clicking opens the event form pre-filled for that hour.
 */
export function DashboardCalendar() {
  const navigate = useNavigate();
  const { data: events } = useEvents();
  const { data: labels } = useLabels();
  const openEventForm = useDialogs((s) => s.openEventForm);

  const [now, setNow] = useState(() => new Date());
  const [anchor, setAnchor] = useState(() => startOfDay(new Date()));
  const [selected, setSelected] = useState(() => startOfDay(new Date()));

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const week = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(anchor, i - 3)), [anchor]);

  const eventDays = useMemo(
    () => new Set((events ?? []).map((e) => new Date(e.start).toDateString())),
    [events]
  );

  const scrollRef = useRef<HTMLDivElement>(null);

  const isTodaySelected = sameDay(selected, now);
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

      {/* selected-day label + see calendar */}
      <div className="mt-3 mb-1 flex items-center justify-between">
        <span className="t-body font-bold text-fg">{dayLabel}</span>
        <Button variant="ghost-link" size="sm" asChild className="p-0">
          <Link to="/schedule" preload="intent">
            {m.schedule_see_calendar()}
          </Link>
        </Button>
      </div>

      {/* hourly grid for the selected day */}
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
        <TimeGrid
          days={[selected]}
          events={events ?? []}
          labels={labels ?? []}
          selectedId={null}
          onSelectEvent={() => navigate({ to: '/schedule' })}
          onCreateSlot={(start, end) =>
            openEventForm({ start: start.toISOString(), end: end.toISOString() })
          }
          scrollContainerRef={scrollRef}
        />
      </div>
    </div>
  );
}
