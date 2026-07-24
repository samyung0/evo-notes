import { useState } from 'react';
import { Button, Input, InputTitle, SimpleDialog, Text } from '@/components/ui';
import { cn } from '@/lib/cn';
import { userColorPair } from '@/lib/userColor';
import type { Label } from '@/api/types';

export interface EventFormValues {
  title: string;
  start: string;
  end: string;
  location?: string;
  labelIds: string[];
}

export interface EventDraft {
  // present when editing an existing event; absent when creating.
  id?: string;
  title?: string;
  start?: string;
  end?: string;
  location?: string;
  labelIds?: string[];
}

const pad = (n: number) => String(n).padStart(2, '0');
const toDateValue = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const toTimeValue = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
const combine = (dateStr: string, timeStr: string) =>
  new Date(`${dateStr}T${timeStr}`).toISOString();

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
  const isEdit = !!draft?.id;
  const start = draft?.start ? new Date(draft.start) : defaultStart();
  const end = draft?.end ? new Date(draft.end) : new Date(start.getTime() + 60 * 60 * 1000);

  // TODO: use react-hook-form and zod-resolver, refer to workspaceFormEditDialog, relevant schema should be auto generated already

  const [title, setTitle] = useState(draft?.title ?? '');
  const [date, setDate] = useState(toDateValue(start));
  const [startTime, setStartTime] = useState(toTimeValue(start));
  const [endTime, setEndTime] = useState(toTimeValue(end));
  const [location, setLocation] = useState(draft?.location ?? '');
  const [labelIds, setLabelIds] = useState<string[]>(draft?.labelIds ?? []);

  const toggleLabel = (id: string) =>
    setLabelIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const valid = title.trim() && date && startTime && endTime && endTime > startTime;

  return (
    <SimpleDialog
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit event' : 'New event'}
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
            {isEdit ? 'Save' : 'Create'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <InputTitle>Title</InputTitle>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Event title"
            autoFocus
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <InputTitle>Date</InputTitle>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>

        <div className="flex gap-3">
          <label className="flex flex-1 flex-col gap-1.5">
            <InputTitle>Start</InputTitle>
            <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
          </label>
          <label className="flex flex-1 flex-col gap-1.5">
            <InputTitle>End</InputTitle>
            <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
          </label>
        </div>

        <label className="flex flex-col gap-1.5">
          <InputTitle>Location</InputTitle>
          <Input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Optional"
          />
        </label>

        {labels.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <InputTitle>Labels</InputTitle>
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
    </SimpleDialog>
  );
}
