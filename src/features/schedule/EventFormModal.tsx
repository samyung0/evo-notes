import { useState } from 'react';
import { Button, Input, Modal, Text } from '@/components/ui';
import { cn } from '@/lib/cn';
import { userColorPair } from '@/lib/workspaceColor';
import type { Label } from '@/api/types';

export interface EventFormValues {
  title: string;
  start: string;
  end: string;
  location?: string;
  labelIds: string[];
}

export interface EventDraft {
  start?: string;
  end?: string;
}

const pad = (n: number) => String(n).padStart(2, '0');
const toDateValue = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const toTimeValue = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
const combine = (dateStr: string, timeStr: string) => new Date(`${dateStr}T${timeStr}`).toISOString();

function defaultStart() {
  const d = new Date();
  d.setHours(9, 0, 0, 0);
  return d;
}

export function EventFormModal({
  open,
  onClose,
  labels,
  draft,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  labels: Label[];
  draft?: EventDraft;
  onSubmit: (v: EventFormValues) => void;
}) {
  const start = draft?.start ? new Date(draft.start) : defaultStart();
  const end = draft?.end
    ? new Date(draft.end)
    : new Date(start.getTime() + 60 * 60 * 1000);

  const [title, setTitle] = useState('');
  const [date, setDate] = useState(toDateValue(start));
  const [startTime, setStartTime] = useState(toTimeValue(start));
  const [endTime, setEndTime] = useState(toTimeValue(end));
  const [location, setLocation] = useState('');
  const [labelIds, setLabelIds] = useState<string[]>([]);

  const toggleLabel = (id: string) =>
    setLabelIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const valid = title.trim() && date && startTime && endTime && endTime > startTime;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New event"
      width={460}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={!valid}
            onClick={() => {
              onSubmit({
                title: title.trim(),
                start: combine(date, startTime),
                end: combine(date, endTime),
                location: location.trim() || undefined,
                labelIds,
              });
              onClose();
            }}
          >
            Create
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <Text variant="label" tone="muted">
            Title
          </Text>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Event title" autoFocus />
        </label>

        <label className="flex flex-col gap-1.5">
          <Text variant="label" tone="muted">
            Date
          </Text>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>

        <div className="flex gap-3">
          <label className="flex flex-1 flex-col gap-1.5">
            <Text variant="label" tone="muted">
              Start
            </Text>
            <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
          </label>
          <label className="flex flex-1 flex-col gap-1.5">
            <Text variant="label" tone="muted">
              End
            </Text>
            <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
          </label>
        </div>

        <label className="flex flex-col gap-1.5">
          <Text variant="label" tone="muted">
            Location
          </Text>
          <Input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Optional"
          />
        </label>

        {labels.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <Text variant="label" tone="muted">
              Labels
            </Text>
            <div className="flex flex-wrap gap-1.5">
              {labels.map((l) => {
                const on = labelIds.includes(l.id);
                const p = userColorPair(l.color);
                return (
                  <button
                    key={l.id}
                    onClick={() => toggleLabel(l.id)}
                    className={cn(
                      'flex items-center gap-1.5 rounded-pill border px-3 py-1 text-sm font-medium transition-colors',
                      on ? 'border-transparent' : 'border-line text-fg-muted hover:text-fg'
                    )}
                    style={on ? { background: p.bg, color: p.fg } : undefined}
                  >
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ background: on ? p.fg : p.bg }}
                    />
                    {l.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
