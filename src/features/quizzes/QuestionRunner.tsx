import { cn } from '@/lib/cn';
import { Badge, Icon, Text } from '@/components/ui';
import { LEVEL_LABEL, LEVEL_TONE } from '@/lib/levels';
import type { Question } from '@/api/types';
import type { Answer } from './grade';

export function QuestionRunner({
  question,
  answer,
  onChange,
}: {
  question: Question;
  answer: Answer;
  onChange: (a: Answer) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start gap-2">
        <Badge tone={LEVEL_TONE[question.level]} size="sm">
          {LEVEL_LABEL[question.level]}
        </Badge>
        <Text variant="subtitle" className="flex-1">
          {question.prompt}
        </Text>
      </div>

      {(question.type === 'mcq' || question.type === 'multi') && (
        <div className="flex flex-col gap-2">
          {question.options.map((opt, i) => {
            const selected = (answer as number[]).includes(i);
            return (
              <button
                key={i}
                onClick={() => {
                  const cur = answer as number[];
                  if (question.type === 'mcq') onChange([i]);
                  else onChange(selected ? cur.filter((x) => x !== i) : [...cur, i]);
                }}
                className={cn(
                  'flex items-center gap-3 rounded-card border px-4 py-3 text-left text-sm transition-colors',
                  selected
                    ? 'border-accent bg-tint-accent-1 text-fg'
                    : 'border-line bg-surface text-fg hover:bg-surface-hover-bg'
                )}
              >
                <span
                  className={cn(
                    'flex h-5 w-5 items-center justify-center rounded-pill border',
                    selected ? 'border-accent bg-accent text-accent-fg' : 'border-line-strong'
                  )}
                >
                  {selected && <Icon name="check" size={13} strokeWidth={2.5} />}
                </span>
                {opt.value}
              </button>
            );
          })}
        </div>
      )}

      {question.type === 'boolean' && (
        <div className="flex gap-3">
          {[true, false].map((v) => (
            <button
              key={String(v)}
              onClick={() => onChange(v)}
              className={cn(
                'flex-1 rounded-card border px-4 py-3 text-sm font-semibold transition-colors',
                answer === v
                  ? 'border-accent bg-tint-accent-1'
                  : 'border-line bg-surface hover:bg-surface-hover-bg'
              )}
            >
              {v ? 'True' : 'False'}
            </button>
          ))}
        </div>
      )}

      {(question.type === 'fill' || question.type === 'short') && (
        <input
          value={answer as string}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Type your answer"
          className="rounded-row border border-line bg-surface px-3 py-2.5 text-sm text-fg outline-none focus:border-line-strong"
        />
      )}

      {question.type === 'ordering' && (
        <div className="flex flex-col gap-2">
          {(answer as string[]).map((item, i) => (
            <div
              key={item}
              className="flex items-center gap-2 rounded-card border border-line bg-surface px-3 py-2 text-sm"
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-pill bg-surface-hover-bg text-xs font-bold text-fg-secondary">
                {i + 1}
              </span>
              <span className="flex-1">{item}</span>
              <button
                disabled={i === 0}
                onClick={() => {
                  const a = [...(answer as string[])];
                  [a[i - 1], a[i]] = [a[i], a[i - 1]];
                  onChange(a);
                }}
                className="text-fg-muted disabled:opacity-30"
              >
                <Icon name="chevronLeft" size={16} style={{ transform: 'rotate(90deg)' }} />
              </button>
              <button
                disabled={i === (answer as string[]).length - 1}
                onClick={() => {
                  const a = [...(answer as string[])];
                  [a[i + 1], a[i]] = [a[i], a[i + 1]];
                  onChange(a);
                }}
                className="text-fg-muted disabled:opacity-30"
              >
                <Icon name="chevronRight" size={16} style={{ transform: 'rotate(90deg)' }} />
              </button>
            </div>
          ))}
        </div>
      )}

      {question.type === 'matching' && (
        <div className="flex flex-col gap-2">
          {question.pairs.map((p) => (
            <div key={p.left} className="flex items-center gap-3">
              <span className="w-1/2 text-sm font-medium text-fg">{p.left}</span>
              <select
                value={(answer as Record<string, string>)[p.left] ?? ''}
                onChange={(e) =>
                  onChange({
                    ...(answer as Record<string, string>),
                    [p.left]: e.target.value,
                  })
                }
                className="w-1/2 rounded-row border border-line bg-surface px-2 py-2 text-sm text-fg"
              >
                <option value="">Choose…</option>
                {question.pairs.map((opt) => (
                  <option key={opt.right} value={opt.right}>
                    {opt.right}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
