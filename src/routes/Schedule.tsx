import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { PageHeader, PanelWithInvertedRadius } from '@/components/app/layout';
import { Card, HoverActions, Icon, IconButton, SegmentedControl, Skeleton } from '@/components/ui';
import { userColorPair } from '@/lib/userColor';
import { useDeleteLabel, useEvents, useLabels } from '@/api/hooks';
import type { CalendarEvent } from '@/api/types';
import { useDialogs } from '@/stores/dialogs';
import { m } from '@/i18n';
import { MiniCalendar } from '@/features/schedule/MiniCalendar';
import { TimeGrid } from '@/features/schedule/TimeGrid';
import { MonthView } from '@/features/schedule/MonthView';
import { MONTHS, weekDays } from '@/features/schedule/dateUtils';
import { scheduleAutoScroll } from '@/features/schedule/scrollState';

type View = 'month' | 'week' | 'day';

const LABEL_LIMIT = 7;

export default function Schedule() {
  const navigate = useNavigate();
  const { event: eventParam } = useSearch({ from: '/auth-shell/schedule' });
  const { data: events, isLoading } = useEvents();
  const { data: labels } = useLabels();
  const deleteLabel = useDeleteLabel();
  const openLabelEdit = useDialogs((s) => s.openLabelEdit);
  const openConfirm = useDialogs((s) => s.openConfirm);
  const openEventForm = useDialogs((s) => s.openEventForm);
  const openEventDetail = useDialogs((s) => s.openEventDetail);
  const eventDetail = useDialogs((s) => s.eventDetail);
  const [view, setView] = useState<View>('week');
  const [month, setMonth] = useState(() => new Date());
  const [selected, setSelected] = useState(() => new Date());
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [labelsOpen, setLabelsOpen] = useState(true);
  const [showAllLabels, setShowAllLabels] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  // track whether the open detail dialog originated from the ?event= param so
  // we only strip the param from the URL when that specific dialog closes.
  const openedFromParam = useRef(false);

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

  // open the details dialog when navigated here with an ?event=<id> param
  // (e.g. from the dashboard calendar). Jumps the grid to that day too.
  useEffect(() => {
    if (!eventParam || !events) return;
    const ev = events.find((e) => e.id === eventParam);
    if (!ev) return;
    const day = new Date(ev.start);
    // only move the grid when the event day isn't already visible — avoids
    // re-rendering TimeGrid's day columns on every in-page event click.
    setSelected((prev) => {
      if (view === 'week') {
        const visible = weekDays(prev);
        return visible.some((d) => d.toDateString() === day.toDateString()) ? prev : day;
      }
      if (view === 'day') {
        return prev.toDateString() === day.toDateString() ? prev : day;
      }
      return day;
    });
    openedFromParam.current = true;
    openEventDetail(ev);
  }, [eventParam, events, openEventDetail, view]);

  // once a param-opened dialog is dismissed, drop the ?event= param from the URL.
  // guard on a truthy→null transition so we don't strip on the initial mount,
  // where the open effect sets eventDetail but this render still sees it null.
  const prevDetail = useRef(eventDetail);
  useEffect(() => {
    const wasOpen = prevDetail.current;
    prevDetail.current = eventDetail;
    if (openedFromParam.current && wasOpen && !eventDetail) {
      openedFromParam.current = false;
      scheduleAutoScroll.rememberPosition(scrollRef.current?.scrollTop);
      navigate({ to: '/schedule', search: {}, replace: true });
    }
  }, [eventDetail, navigate]);

  const days = view === 'week' ? weekDays(selected) : [selected];

  const createAt = (start: Date, end: Date) =>
    openEventForm({ start: start.toISOString(), end: end.toISOString() });
  const selectEvent = (event: CalendarEvent) => {
    scheduleAutoScroll.rememberPosition(scrollRef.current?.scrollTop);
    openedFromParam.current = true;
    openEventDetail(event);
    navigate({ to: '/schedule', search: { event: event.id } });
  };
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
                          icon: 'write',
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
              size="lg"
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
                onCreate={createOnDay}
                onSelectEvent={selectEvent}
              />
            </div>
          ) : (
            <TimeGrid
              days={days}
              events={visibleEvents}
              labels={labels ?? []}
              selectedId={eventDetail?.id ?? null}
              onCreateSlot={createAt}
              onSelectEvent={selectEvent}
              autoScrollTracker={scheduleAutoScroll}
              scrollContainerRef={scrollRef}
            />
          )}
        </div>
      </PanelWithInvertedRadius>
    </div>
  );
}
