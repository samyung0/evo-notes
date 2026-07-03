import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Button, Icon, Text } from '@/components/ui';
import { useGenerate } from '@/api/hooks';
import type { Chapter, GenerateOptions, Quiz } from '@/api/types';
import { m } from '@/i18n';
import { GenerateFormDialog, type GenerateMode } from './GenerateFormDialog';

export function GeneratePanel({
  workspaceId,
  chapters,
}: {
  workspaceId: string;
  chapters: Chapter[];
}) {
  const gen = useGenerate(workspaceId);
  const [mode, setMode] = useState<GenerateMode | null>(null);
  const [resultMode, setResultMode] = useState<GenerateMode | null>(null);
  const [result, setResult] = useState<unknown>(null);

  async function handleGenerate(opts: GenerateOptions) {
    const r = await gen.mutateAsync(opts);
    setResult(r);
    setResultMode(mode);
    setMode(null);
  }

  return (
    <div className="flex flex-col gap-4 overflow-auto p-4">
      <Text variant="subtitle">{m.generate_title()}</Text>
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
              setResult(null);
              setResultMode(null);
              setMode(k);
            }}
            className="flex aspect-square flex-col items-center justify-center gap-2 rounded-card border border-line bg-surface text-fg transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-card"
          >
            <Icon name={icon} size={22} />
            <span className="text-xs font-semibold">{label}</span>
          </button>
        ))}
      </div>

      {result != null && resultMode && <GenerateResult mode={resultMode} result={result} />}

      {mode && (
        <GenerateFormDialog
          key={mode}
          open
          setOpen={(o) => {
            if (!o) setMode(null);
          }}
          mode={mode}
          chapters={chapters}
          pending={gen.isPending}
          onGenerate={handleGenerate}
        />
      )}
    </div>
  );
}

function GenerateResult({ mode, result }: { mode: GenerateMode; result: unknown }) {
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
