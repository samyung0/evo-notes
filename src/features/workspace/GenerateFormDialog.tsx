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
import type {
  Chapter,
  CognitiveLevel,
  DiagramType,
  GenerateOptions,
  QuestionType,
  SourceFile,
} from '@/api/types';
import { m } from '@/i18n';

export type GenerateMode = 'flashcards' | 'quiz' | 'mindmap' | 'diagram';

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

const DIAGRAM_TYPES: DiagramType[] = ['auto', 'flowchart', 'sequence', 'class', 'state', 'er'];
const DIAGRAM_LABEL: Record<DiagramType, string> = {
  auto: 'Auto',
  flowchart: 'Flowchart',
  sequence: 'Sequence',
  class: 'Class',
  state: 'State',
  er: 'Entity-relation',
};

const MODE_LABEL: Record<GenerateMode, string> = {
  flashcards: 'flashcards',
  quiz: 'quiz',
  mindmap: 'mindmap',
  diagram: 'diagram',
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
          ? 'text-action-accent-fg bg-action-accent border-accent'
          : 'border-line bg-surface text-fg-secondary hover:bg-surface-hover-bg'
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
 *
 * Scope is dual: chapters (by id) and/or individual files (by id). Empty
 * scope means the whole workspace.
 */
export function GenerateFormDialog({
  open,
  setOpen,
  mode,
  chapters,
  files,
  pending,
  onGenerate,
}: {
  open: boolean;
  setOpen: (open: boolean) => void;
  mode: GenerateMode;
  chapters: Chapter[];
  files: SourceFile[];
  pending: boolean;
  onGenerate: (opts: GenerateOptions) => Promise<unknown>;
}) {
  const [chapterScope, setChapterScope] = useState<string[]>([]);
  const [fileScope, setFileScope] = useState<string[]>([]);
  const [count, setCount] = useState(10);
  const [style, setStyle] = useState<'term-def' | 'qa' | 'cloze'>('term-def');
  const [types, setTypes] = useState<QuestionType[]>(['mcq', 'boolean']);
  const [levels, setLevels] = useState<CognitiveLevel[]>(['recall', 'application']);
  const [detail, setDetail] = useState<'brief' | 'standard' | 'detailed'>('standard');
  const [diagramType, setDiagramType] = useState<DiagramType>('auto');

  const readyFiles = files.filter((f) => f.status !== 'processing' && f.status !== 'failed');

  async function run() {
    const scope = { chapters: chapterScope, fileIds: fileScope };
    let opts: GenerateOptions;
    if (mode === 'flashcards') opts = { kind: 'flashcards', count, style, ...scope };
    else if (mode === 'quiz') opts = { kind: 'quiz', count, types, levels, ...scope };
    else if (mode === 'mindmap') opts = { kind: 'mindmap', detail, ...scope };
    else opts = { kind: 'diagram', diagramType, ...scope };
    await onGenerate(opts);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="top-1/2 -translate-y-1/2">
        <DialogTitle className="capitalize">
          {m.generate_title()} · {MODE_LABEL[mode]}
        </DialogTitle>

        <div className="flex max-h-[70vh] flex-col gap-5 overflow-auto">
          <div className="flex flex-col gap-1.5">
            <Text variant="label" tone="muted">
              Chapter scope
            </Text>
            <div className="flex flex-wrap gap-1.5">
              {chapters.map((c) => (
                <Chip
                  key={c.id}
                  active={chapterScope.includes(c.id)}
                  onClick={() =>
                    setChapterScope((s) =>
                      s.includes(c.id) ? s.filter((x) => x !== c.id) : [...s, c.id]
                    )
                  }
                >
                  {c.name}
                </Chip>
              ))}
              {!chapters.length && (
                <Text variant="meta" tone="muted">
                  No chapters
                </Text>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Text variant="label" tone="muted">
              File scope
            </Text>
            <div className="flex flex-wrap gap-1.5">
              {readyFiles.map((f) => (
                <Chip
                  key={f.id}
                  active={fileScope.includes(f.id)}
                  onClick={() =>
                    setFileScope((s) =>
                      s.includes(f.id) ? s.filter((x) => x !== f.id) : [...s, f.id]
                    )
                  }
                >
                  {f.name}
                </Chip>
              ))}
              {!readyFiles.length && (
                <Text variant="meta" tone="muted">
                  No files
                </Text>
              )}
            </div>
            {!chapterScope.length && !fileScope.length && (
              <Text variant="meta" tone="muted">
                Nothing selected — the whole workspace will be used.
              </Text>
            )}
          </div>

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
          {mode === 'mindmap' && (
            <OptionRow
              label="Detail"
              options={['brief', 'standard', 'detailed']}
              value={detail}
              onChange={(v) => setDetail(v as typeof detail)}
            />
          )}
          {mode === 'diagram' && (
            <div className="flex flex-col gap-1.5">
              <Text variant="label" tone="muted">
                Diagram type
              </Text>
              <div className="flex flex-wrap gap-1.5">
                {DIAGRAM_TYPES.map((t) => (
                  <Chip key={t} active={diagramType === t} onClick={() => setDiagramType(t)}>
                    {DIAGRAM_LABEL[t]}
                  </Chip>
                ))}
              </div>
            </div>
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
            {pending ? <Spinner /> : `Generate ${MODE_LABEL[mode]}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
