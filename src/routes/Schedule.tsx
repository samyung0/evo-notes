import { useEffect, useMemo, useRef, useState } from 'react';
import { Panel, PageHeader } from '@/components/app/layout';
import {
  Button,
  Checkbox,
  Icon,
  IconButton,
  SegmentedControl,
  Spinner,
  Text,
} from '@/components/ui';
import { colorPair } from '@/lib/workspaceColor';
import { useEvents, useLabels } from '@/api/hooks';
import { MiniCalendar } from '@/features/schedule/MiniCalendar';
import { TimeGrid } from '@/features/schedule/TimeGrid';
import { MonthView } from '@/features/schedule/MonthView';
import { MONTHS, fmtTime, weekDays } from '@/features/schedule/dateUtils';
import type { CalendarEvent } from '@/api/types';

type View = 'month' | 'week' | 'day';

export default function Schedule() {
  const { data: events, isLoading } = useEvents();
  const { data: labels } = useLabels();
  const [view, setView] = useState<View>('week');
  const [month, setMonth] = useState(() => new Date());
  const [selected, setSelected] = useState(() => new Date());
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [active, setActive] = useState<{
    ev: CalendarEvent;
    x: number;
    y: number;
  } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const visibleEvents = useMemo(
    () =>
      (events ?? []).filter(
        (e) => e.labelIds.length === 0 || e.labelIds.some((id) => !hidden.has(id))
      ),
    [events, hidden]
  );
  const eventDays = useMemo(
    () => new Set((events ?? []).map((e) => new Date(e.start).toDateString())),
    [events]
  );

  // popup disappears when the calendar scrolls
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => setActive(null);
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  const days = view === 'week' ? weekDays(selected) : [selected];

  return (
    <div className="flex h-full min-h-0 gap-2.5">
      {/* left rail */}
      <div className="flex w-[268px] shrink-0 flex-col gap-3 overflow-auto">
        <MiniCalendar
          month={month}
          onMonthChange={setMonth}
          selected={selected}
          onSelect={(d) => {
            setSelected(d);
            setMonth(d);
          }}
          eventDays={eventDays}
        />
        <div className="rounded-card border border-line bg-surface p-3.5">
          <div className="mb-2 flex items-center gap-2">
            <Icon name="filter" size={16} className="text-fg-muted" />
            <Text variant="subtitle">Labels</Text>
          </div>
          <div className="flex flex-col gap-1">
            {labels?.map((l) => {
              const on = !hidden.has(l.id);
              return (
                <button
                  key={l.id}
                  onClick={() =>
                    setHidden((s) => {
                      const n = new Set(s);
                      on ? n.add(l.id) : n.delete(l.id);
                      return n;
                    })
                  }
                  className="hover:bg-surface-hover-bg flex items-center gap-2.5 rounded-row px-1.5 py-1.5"
                >
                  <span
                    className="h-3.5 w-3.5 rounded-[4px]"
                    style={{
                      background: on ? colorPair(l.color).solid : 'transparent',
                      border: on ? 'none' : '1.5px solid var(--border-strong)',
                    }}
                  />
                  <span className={on ? 'text-sm text-fg' : 'text-sm text-fg-muted'}>{l.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* main calendar */}
      <Panel className="flex-1">
        <PageHeader
          title={`${MONTHS[month.getMonth()]} ${month.getFullYear()}`}
          actions={<IconButton icon="plus" variant="dark" label="New event" />}
          showTopBar
        />
        <div className="flex items-center gap-3 px-6 pb-3">
          <SegmentedControl
            size="sm"
            options={[
              { value: 'month', label: 'Month' },
              { value: 'week', label: 'Week' },
              { value: 'day', label: 'Day' },
            ]}
            value={view}
            onChange={(v) => setView(v as View)}
          />
        </div>

        <div ref={scrollRef} className="min-h-0 flex-1 overflow-auto px-3 pb-4">
          {isLoading ? (
            <div className="grid place-items-center py-16">
              <Spinner />
            </div>
          ) : view === 'month' ? (
            <div className="h-full min-h-[560px]">
              <MonthView
                month={month}
                events={visibleEvents}
                labels={labels ?? []}
                onSelectEvent={(ev, a) => setActive({ ev, ...a })}
              />
            </div>
          ) : (
            <TimeGrid
              days={days}
              events={visibleEvents}
              labels={labels ?? []}
              selectedId={active?.ev.id ?? null}
              onSelectEvent={(ev, a) => setActive({ ev, ...a })}
            />
          )}
        </div>
      </Panel>

      {active && <EventPopup data={active} labels={labels ?? []} onClose={() => setActive(null)} />}
    </div>
  );
}

function EventPopup({
  data,
  labels,
  onClose,
}: {
  data: { ev: CalendarEvent; x: number; y: number };
  labels: { id: string; name: string }[];
  onClose: () => void;
}) {
  const { ev, x, y } = data;
  const left = Math.min(x, window.innerWidth - 320);
  const top = Math.min(y, window.innerHeight - 220);
  return (
    <div
      className="fixed z-50 w-[300px] rounded-card border border-line bg-surface p-4 shadow-pop"
      style={{ left, top }}
    >
      <div className="flex items-start justify-between">
        <Text variant="subtitle" className="flex-1">
          {ev.title}
        </Text>
        <div className="flex gap-1">
          <IconButton icon="notes" variant="ghost" size="sm" label="Edit" />
          <IconButton icon="x" variant="ghost" size="sm" onClick={onClose} label="Close" />
        </div>
      </div>
      <div className="mt-2 flex items-center gap-2 text-sm text-fg-secondary">
        <Icon name="clock" size={15} /> {fmtTime(ev.start)} – {fmtTime(ev.end)}
      </div>
      {ev.location && (
        <div className="mt-1 flex items-center gap-2 text-sm text-fg-secondary">
          <Icon name="location" size={15} /> {ev.location}
        </div>
      )}
      <div className="mt-2 flex flex-wrap gap-1">
        {ev.labelIds.map((id) => {
          const l = labels.find((x) => x.id === id);
          return l ? (
            <span
              key={id}
              className="bg-surface-hover-bg rounded-pill px-2 py-0.5 text-[11px] font-medium text-fg-secondary"
            >
              {l.name}
            </span>
          ) : null;
        })}
      </div>
      <Button size="sm" fullWidth className="mt-3">
        Add note
      </Button>
    </div>
  );
}
