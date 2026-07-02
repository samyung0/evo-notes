import { useEffect, useMemo, useRef, useState } from 'react';
import { Panel, PageHeader, PanelWithInvertedRadius } from '@/components/app/layout';
import {
  Badge,
  Card,
  HoverActions,
  Icon,
  IconButton,
  SegmentedControl,
  Skeleton,
} from '@/components/ui';
import { userColorPair } from '@/lib/userColor';
import { useDeleteLabel, useEvents, useLabels } from '@/api/hooks';
import { useDialogs } from '@/stores/dialogs';
import { m } from '@/i18n';
import { MiniCalendar } from '@/features/schedule/MiniCalendar';
import { TimeGrid } from '@/features/schedule/TimeGrid';
import { MonthView } from '@/features/schedule/MonthView';
import { MONTHS, fmtTime, weekDays } from '@/features/schedule/dateUtils';
import type { CalendarEvent } from '@/api/types';

type View = 'month' | 'week' | 'day';

const LABEL_LIMIT = 7;

export default function Schedule() {
  const { data: events, isLoading } = useEvents();
  const { data: labels } = useLabels();
  const deleteLabel = useDeleteLabel();
  const openLabelEdit = useDialogs((s) => s.openLabelEdit);
  const openConfirm = useDialogs((s) => s.openConfirm);
  const openEventForm = useDialogs((s) => s.openEventForm);
  const [view, setView] = useState<View>('week');
  const [month, setMonth] = useState(() => new Date());
  const [selected, setSelected] = useState(() => new Date());
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [labelsOpen, setLabelsOpen] = useState(true);
  const [showAllLabels, setShowAllLabels] = useState(false);
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

  const createAt = (start: Date, end: Date) =>
    openEventForm({ start: start.toISOString(), end: end.toISOString() });
  const createOnDay = (day: Date) => {
    const start = new Date(day);
    start.setHours(9, 0, 0, 0);
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    createAt(start, end);
  };

  // Range mirrored in the mini calendar — whatever the main grid is showing.
  const range = useMemo(() => {
    if (view === 'month') {
      return {
        start: new Date(month.getFullYear(), month.getMonth(), 1),
        end: new Date(month.getFullYear(), month.getMonth() + 1, 0),
      };
    }
    if (view === 'week') {
      const wd = weekDays(selected);
      return { start: wd[0], end: wd[6] };
    }
    return { start: selected, end: selected };
  }, [view, month, selected]);

  return (
    <div className="flex h-full min-h-0 gap-2.5">
      {/* left rail */}
      <div className="flex h-full w-70 shrink-0 flex-col gap-3 overflow-auto">
        <Card className="gap-0 p-3.5">
          <MiniCalendar
            month={month}
            onMonthChange={setMonth}
            selected={selected}
            onSelect={(d) => {
              setSelected(d);
              setMonth(d);
            }}
            eventDays={eventDays}
            rangeStart={range.start}
            rangeEnd={range.end}
          />
        </Card>

        <Card className="h-full flex-1 gap-0 p-3.5">
          <button
            onClick={() => setLabelsOpen((o) => !o)}
            className="flex w-full items-center gap-1.5 text-left"
            aria-expanded={labelsOpen}
          >
            <Icon
              name={labelsOpen ? 'chevronDown' : 'chevronRight'}
              size={16}
              className="text-fg-muted"
            />
            <span className="t-card-title font-semibold">Labels</span>
          </button>
          {labelsOpen && (
            <div className="flex flex-col py-1.5 pl-4">
              {(showAllLabels ? labels : labels?.slice(0, LABEL_LIMIT))?.map((l) => {
                const on = !hidden.has(l.id);
                return (
                  <div
                    key={l.id}
                    className="group relative flex items-center rounded-row py-1.5 pr-8 hover:bg-surface-hover-bg"
                  >
                    <button
                      onClick={() =>
                        setHidden((s) => {
                          const n = new Set(s);
                          on ? n.add(l.id) : n.delete(l.id);
                          return n;
                        })
                      }
                      className="flex min-w-0 flex-1 items-center gap-2.5 px-1.5 text-left"
                    >
                      <span
                        className="h-3.5 w-3.5 shrink-0 rounded-[4px]"
                        style={{
                          background: on ? userColorPair(l.color).bg : 'transparent',
                          border: on ? 'none' : '1.5px solid var(--border-strong)',
                        }}
                      />
                      <span
                        className={
                          on ? 'truncate text-sm text-fg' : 'truncate text-sm text-fg-muted'
                        }
                      >
                        {l.name}
                      </span>
                    </button>
                    <HoverActions
                      className="absolute top-1/2 right-1 -translate-y-1/2"
                      items={[
                        {
                          label: m.action_edit(),
                          icon: 'notes',
                          onClick: () => openLabelEdit(l),
                        },
                        {
                          label: m.action_delete(),
                          icon: 'trash',
                          danger: true,
                          onClick: () =>
                            openConfirm({
                              title: m.confirm_delete_title({ name: l.name }),
                              body: m.confirm_delete_body(),
                              onConfirm: () => deleteLabel.mutate(l.id),
                            }),
                        },
                      ]}
                    />
                  </div>
                );
              })}
              {(labels?.length ?? 0) > LABEL_LIMIT && (
                <button
                  onClick={() => setShowAllLabels((s) => !s)}
                  className="mt-1 self-start rounded-row px-1.5 py-1 text-sm font-medium text-fg-muted hover:bg-surface-hover-bg hover:text-fg"
                >
                  {showAllLabels ? 'Show less' : `Show all (${labels?.length})`}
                </button>
              )}
            </div>
          )}
        </Card>
      </div>

      {/* main calendar */}
      <PanelWithInvertedRadius className="flex-1">
        <PageHeader
          title={`${MONTHS[month.getMonth()]} ${month.getFullYear()}`}
          actions={
            <IconButton
              icon="plus"
              variant="gray"
              label="New event"
              onClick={() => openEventForm()}
            />
          }
          showTopBar
        />
        <div className="flex items-center gap-3 px-6 pb-3">
          <SegmentedControl
            size="sm"
            variant="ghost"
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
            <Skeleton className="h-full min-h-[560px] w-full" />
          ) : view === 'month' ? (
            <div className="h-full min-h-[560px]">
              <MonthView
                month={month}
                events={visibleEvents}
                labels={labels ?? []}
                onSelectEvent={(ev, a) => setActive({ ev, ...a })}
                onCreate={createOnDay}
              />
            </div>
          ) : (
            <TimeGrid
              days={days}
              events={visibleEvents}
              labels={labels ?? []}
              selectedId={active?.ev.id ?? null}
              onSelectEvent={(ev, a) => setActive({ ev, ...a })}
              onCreateSlot={createAt}
              scrollContainerRef={scrollRef}
            />
          )}
        </div>
      </PanelWithInvertedRadius>

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
    <Card className="fixed z-50 w-[300px] gap-0 p-4 shadow-pop" style={{ left, top }}>
      <div className="flex items-start justify-between gap-2">
        <h3 className="t-card-title flex-1">{ev.title}</h3>
        <div className="flex gap-1">
          <IconButton icon="notes" variant="ghost" size="sm" label="Edit" />
          <IconButton icon="x" variant="ghost" size="sm" onClick={onClose} label="Close" />
        </div>
      </div>
      <div className="t-body mt-2 flex items-center gap-2 text-fg-secondary">
        <Icon name="clock" size={15} /> {fmtTime(ev.start)} – {fmtTime(ev.end)}
      </div>
      {ev.location && (
        <div className="t-body mt-1 flex items-center gap-2 text-fg-secondary">
          <Icon name="location" size={15} /> {ev.location}
        </div>
      )}
      {ev.labelIds.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {ev.labelIds.map((id) => {
            const l = labels.find((x) => x.id === id);
            return l ? (
              <Badge key={id} tone="neutral" size="sm">
                {l.name}
              </Badge>
            ) : null;
          })}
        </div>
      )}
    </Card>
  );
}
