import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Button, Icon, Spinner, Text } from '@/components/ui';
import { cn } from '@/lib/cn';
import { useGenerate } from '@/api/hooks';
import type { Chapter, GenerateOptions, Quiz, QuestionType, Difficulty } from '@/api/types';
import { m } from '@/i18n';

type Mode = 'summary' | 'flashcards' | 'quiz';
const Q_TYPES: QuestionType[] = [
  'mcq',
  'multi',
  'boolean',
  'fill',
  'short',
  'matching',
  'ordering',
];
const Q_TYPE_LABEL: Record<QuestionType, string> = {
  mcq: 'Multiple choice',
  multi: 'Multi-select',
  boolean: 'True / false',
  fill: 'Fill blank',
  short: 'Short answer',
  matching: 'Matching',
  ordering: 'Ordering',
};
const DIFFS: Difficulty[] = ['easy', 'medium', 'hard'];

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

export function GeneratePanel({
  workspaceId,
  chapters,
}: {
  workspaceId: string;
  chapters: Chapter[];
}) {
  const [mode, setMode] = useState<Mode | null>(null);
  const gen = useGenerate(workspaceId);
  const [result, setResult] = useState<unknown>(null);

  // shared
  const [scope, setScope] = useState<string[]>([]);
  // summary
  const [length, setLength] = useState<'brief' | 'standard' | 'detailed'>('standard');
  const [format, setFormat] = useState<'bullets' | 'outline' | 'prose'>('bullets');
  // flashcards
  const [count, setCount] = useState(10);
  const [style, setStyle] = useState<'term-def' | 'qa' | 'cloze'>('term-def');
  // quiz
  const [types, setTypes] = useState<QuestionType[]>(['mcq', 'boolean']);
  const [diffs, setDiffs] = useState<Difficulty[]>(['easy', 'medium']);

  function run() {
    if (!mode) return;
    const chapterNames = scope.length ? scope : chapters.map((c) => c.name);
    let opts: GenerateOptions;
    if (mode === 'summary') opts = { kind: 'summary', length, format, chapters: chapterNames };
    else if (mode === 'flashcards')
      opts = { kind: 'flashcards', count, style, chapters: chapterNames };
    else
      opts = {
        kind: 'quiz',
        count,
        types,
        difficulty: diffs,
        chapters: chapterNames,
      };
    gen.mutate(opts, { onSuccess: (r) => setResult(r) });
  }

  if (!mode) {
    return (
      <div className="p-4">
        <Text variant="subtitle" className="mb-3">
          {m.generate_title()}
        </Text>
        <div className="grid grid-cols-3 gap-3">
          {(
            [
              ['summary', 'message', m.generate_summary()],
              ['flashcards', 'flashcards', m.generate_flashcards()],
              ['quiz', 'quiz', m.generate_quiz()],
            ] as const
          ).map(([k, icon, label]) => (
            <button
              key={k}
              onClick={() => {
                setMode(k);
                setResult(null);
              }}
              className="flex aspect-square flex-col items-center justify-center gap-2 rounded-card border border-line bg-surface text-fg transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-card"
            >
              <Icon name={icon} size={22} />
              <span className="text-xs font-semibold">{label}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 overflow-auto p-4">
      <button
        onClick={() => {
          setMode(null);
          setResult(null);
        }}
        className="flex items-center gap-1 text-sm font-semibold text-link"
      >
        <Icon name="chevronLeft" size={15} /> Back
      </button>

      {!result && (
        <>
          <Text variant="subtitle" className="capitalize">
            {mode}
          </Text>

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
                  Difficulty
                </Text>
                <div className="flex flex-wrap gap-1.5">
                  {DIFFS.map((d) => (
                    <Chip
                      key={d}
                      active={diffs.includes(d)}
                      onClick={() =>
                        setDiffs((s) => (s.includes(d) ? s.filter((x) => x !== d) : [...s, d]))
                      }
                    >
                      {d}
                    </Chip>
                  ))}
                </div>
              </div>
            </>
          )}

          <Button
            iconLeft="sparkles"
            onClick={run}
            disabled={gen.isPending || (mode === 'quiz' && !types.length)}
            fullWidth
          >
            {gen.isPending ? 'Generating…' : `Generate ${mode}`}
          </Button>
          {gen.isPending && (
            <div className="grid place-items-center py-2">
              <Spinner />
            </div>
          )}
        </>
      )}

      {result != null && <GenerateResult mode={mode} result={result} />}
    </div>
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

function GenerateResult({ mode, result }: { mode: Mode; result: unknown }) {
  const r = result as {
    kind: string;
    title?: string;
    body?: string;
    cards?: unknown[];
    quiz?: Quiz;
  };
  return (
    <div className="bg-surface-hover-bg rounded-card border border-line p-4">
      {mode === 'summary' && (
        <>
          <Text variant="subtitle" className="mb-2">
            {r.title}
          </Text>
          <p className="text-sm whitespace-pre-wrap text-fg">{r.body}</p>
        </>
      )}
      {mode === 'flashcards' && (
        <Text variant="body">
          Generated {r.cards?.length ?? 0} flashcards. Find them in your Flashcards library.
        </Text>
      )}
      {mode === 'quiz' && r.quiz && (
        <div className="flex flex-col gap-2">
          <Text variant="subtitle">{r.quiz.name}</Text>
          <Text variant="meta" tone="muted">
            {r.quiz.questions.length} questions ready.
          </Text>
          <Link to="/quizzes" preload="intent">
            <Button size="sm" variant="accent" iconRight="arrowRight">
              Open in Quizzes
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
