import { useState } from 'react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogTitle,
  Spinner,
  Text,
} from '@/components/ui';
import { cn } from '@/lib/cn';
import { LEVELS, LEVEL_LABEL } from '@/lib/levels';
import type { Chapter, CognitiveLevel, GenerateOptions, QuestionType } from '@/api/types';
import { m } from '@/i18n';

export type GenerateMode = 'summary' | 'flashcards' | 'quiz';

const Q_TYPES: QuestionType[] = ['mcq', 'multi', 'boolean', 'fill', 'short', 'matching', 'ordering'];
const Q_TYPE_LABEL: Record<QuestionType, string> = {
  mcq: 'Multiple choice',
  multi: 'Multi-select',
  boolean: 'True / false',
  fill: 'Fill blank',
  short: 'Short answer',
  matching: 'Matching',
  ordering: 'Ordering',
};

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-pill border px-2.5 py-1 text-xs font-medium transition-colors',
        active
          ? 'border-accent bg-accent text-accent-fg'
          : 'hover:bg-surface-hover-bg border-line bg-surface text-fg-secondary'
      )}
    >
      {children}
    </button>
  );
}

function OptionRow({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Text variant="label" tone="muted">
        {label}
      </Text>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => (
          <Chip key={o} active={value === o} onClick={() => onChange(o)}>
            {o}
          </Chip>
        ))}
      </div>
    </div>
  );
}

function CountRow({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div className="flex items-center justify-between">
      <Text variant="label" tone="muted">
        Count
      </Text>
      <div className="flex items-center gap-2">
        {[5, 10, 15, 20].map((n) => (
          <Chip key={n} active={value === n} onClick={() => onChange(n)}>
            {n}
          </Chip>
        ))}
      </div>
    </div>
  );
}

/**
 * Config dialog for a single generate mode. State is local and short-lived —
 * the parent mounts this with `key={mode}` so each open starts fresh. On a
 * successful generate the parent closes the dialog and shows the result.
 */
export function GenerateFormDialog({
  open,
  setOpen,
  mode,
  chapters,
  pending,
  onGenerate,
}: {
  open: boolean;
  setOpen: (open: boolean) => void;
  mode: GenerateMode;
  chapters: Chapter[];
  pending: boolean;
  onGenerate: (opts: GenerateOptions) => Promise<unknown>;
}) {
  const [scope, setScope] = useState<string[]>([]);
  const [length, setLength] = useState<'brief' | 'standard' | 'detailed'>('standard');
  const [format, setFormat] = useState<'bullets' | 'outline' | 'prose'>('bullets');
  const [count, setCount] = useState(10);
  const [style, setStyle] = useState<'term-def' | 'qa' | 'cloze'>('term-def');
  const [types, setTypes] = useState<QuestionType[]>(['mcq', 'boolean']);
  const [levels, setLevels] = useState<CognitiveLevel[]>(['recall', 'application']);

  async function run() {
    const chapterNames = scope.length ? scope : chapters.map((c) => c.name);
    let opts: GenerateOptions;
    if (mode === 'summary') opts = { kind: 'summary', length, format, chapters: chapterNames };
    else if (mode === 'flashcards')
      opts = { kind: 'flashcards', count, style, chapters: chapterNames };
    else opts = { kind: 'quiz', count, types, levels, chapters: chapterNames };
    await onGenerate(opts);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="top-1/2 -translate-y-1/2">
        <DialogTitle className="capitalize">
          {m.generate_title()} · {mode}
        </DialogTitle>

        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <Text variant="label" tone="muted">
              Chapter scope
            </Text>
            <div className="flex flex-wrap gap-1.5">
              {chapters.map((c) => (
                <Chip
                  key={c.id}
                  active={scope.includes(c.name)}
                  onClick={() =>
                    setScope((s) =>
                      s.includes(c.name) ? s.filter((x) => x !== c.name) : [...s, c.name]
                    )
                  }
                >
                  {c.name}
                </Chip>
              ))}
              {!chapters.length && (
                <Text variant="meta" tone="muted">
                  Whole workspace
                </Text>
              )}
            </div>
          </div>

          {mode === 'summary' && (
            <>
              <OptionRow
                label="Length"
                options={['brief', 'standard', 'detailed']}
                value={length}
                onChange={(v) => setLength(v as typeof length)}
              />
              <OptionRow
                label="Format"
                options={['bullets', 'outline', 'prose']}
                value={format}
                onChange={(v) => setFormat(v as typeof format)}
              />
            </>
          )}
          {mode === 'flashcards' && (
            <>
              <CountRow value={count} onChange={setCount} />
              <OptionRow
                label="Style"
                options={['term-def', 'qa', 'cloze']}
                value={style}
                onChange={(v) => setStyle(v as typeof style)}
              />
            </>
          )}
          {mode === 'quiz' && (
            <>
              <CountRow value={count} onChange={setCount} />
              <div className="flex flex-col gap-1.5">
                <Text variant="label" tone="muted">
                  Question types
                </Text>
                <div className="flex flex-wrap gap-1.5">
                  {Q_TYPES.map((t) => (
                    <Chip
                      key={t}
                      active={types.includes(t)}
                      onClick={() =>
                        setTypes((s) => (s.includes(t) ? s.filter((x) => x !== t) : [...s, t]))
                      }
                    >
                      {Q_TYPE_LABEL[t]}
                    </Chip>
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <Text variant="label" tone="muted">
                  Cognitive level
                </Text>
                <div className="flex flex-wrap gap-1.5">
                  {LEVELS.map((lvl) => (
                    <Chip
                      key={lvl}
                      active={levels.includes(lvl)}
                      onClick={() =>
                        setLevels((s) =>
                          s.includes(lvl) ? s.filter((x) => x !== lvl) : [...s, lvl]
                        )
                      }
                    >
                      {LEVEL_LABEL[lvl]}
                    </Chip>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter className="mt-6">
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
            Cancel
          </Button>
          <Button
            iconLeft={pending ? undefined : 'sparkles'}
            onClick={run}
            disabled={pending || (mode === 'quiz' && !types.length)}
          >
            {pending ? <Spinner /> : `Generate ${mode}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
