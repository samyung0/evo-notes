import { useState } from 'react';
import { Button, Icon, Text } from '@/components/ui';
import { useGenerate } from '@/api/hooks';
import type {
  Chapter,
  Deck,
  GenerateOptions,
  Material,
  Quiz,
  SourceFile,
} from '@/api/types';
import { m } from '@/i18n';
import { GenerateFormDialog, type GenerateMode } from './GenerateFormDialog';
import type { OpenItem } from '@/features/materials/openItem';

type GenerateResultData =
  | { kind: 'flashcards'; deck?: Deck; cards?: unknown[] }
  | { kind: 'quiz'; quiz?: Quiz }
  | { kind: 'mindmap' | 'diagram'; material?: Material };

const TILES: [GenerateMode, Parameters<typeof Icon>[0]['name'], string][] = [
  ['flashcards', 'flashcards', m.generate_flashcards()],
  ['quiz', 'quiz', m.generate_quiz()],
  ['mindmap', 'workspaces', 'Mindmap'],
  ['diagram', 'grid', 'Diagram'],
];

export function GeneratePanel({
  workspaceId,
  chapters,
  files,
  onOpenItem,
}: {
  workspaceId: string;
  chapters: Chapter[];
  files: SourceFile[];
  onOpenItem?: (item: OpenItem) => void;
}) {
  const gen = useGenerate(workspaceId);
  const [mode, setMode] = useState<GenerateMode | null>(null);
  const [result, setResult] = useState<GenerateResultData | null>(null);

  async function handleGenerate(opts: GenerateOptions) {
    const r = (await gen.mutateAsync(opts)) as GenerateResultData;
    setResult(r);
    setMode(null);
    // Reveal the freshly-generated artifact in the center pane.
    const materialId =
      r.kind === 'quiz'
        ? r.quiz?.id
        : r.kind === 'flashcards'
          ? r.deck?.id
          : r.material?.id;
    if (materialId) onOpenItem?.({ kind: 'material', id: materialId });
  }

  return (
    <div className="flex flex-col gap-4 overflow-auto p-4">
      <Text variant="subtitle">{m.generate_title()}</Text>
      <div className="grid grid-cols-2 gap-3">
        {TILES.map(([k, icon, label]) => (
          <button
            key={k}
            onClick={() => {
              setResult(null);
              setMode(k);
            }}
            className="flex aspect-square flex-col items-center justify-center gap-2 rounded-card border border-line bg-surface text-fg transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-card"
          >
            <Icon name={icon} size={22} />
            <span className="text-xs font-semibold">{label}</span>
          </button>
        ))}
      </div>

      {result && <GenerateResult result={result} onOpenItem={onOpenItem} />}

      {mode && (
        <GenerateFormDialog
          key={mode}
          open
          setOpen={(o) => {
            if (!o) setMode(null);
          }}
          mode={mode}
          chapters={chapters}
          files={files}
          pending={gen.isPending}
          onGenerate={handleGenerate}
        />
      )}
    </div>
  );
}

function GenerateResult({
  result,
  onOpenItem,
}: {
  result: GenerateResultData;
  onOpenItem?: (item: OpenItem) => void;
}) {
  let label = '';
  let open: OpenItem | null = null;
  if (result.kind === 'quiz') {
    if (result.quiz) {
      label = `Quiz "${result.quiz.name}" ready — ${result.quiz.questions.length} questions.`;
      open = { kind: 'material', id: result.quiz.id };
    }
  } else if (result.kind === 'flashcards') {
    label = `Deck ready — ${result.cards?.length ?? 0} cards.`;
    if (result.deck) open = { kind: 'material', id: result.deck.id };
  } else if (result.material) {
    label = `${result.kind === 'mindmap' ? 'Mindmap' : 'Diagram'} "${result.material.title}" ready.`;
    open = { kind: 'material', id: result.material.id };
  }

  return (
    <div className="bg-surface-hover-bg flex flex-col gap-2 rounded-card border border-line p-4">
      <Text variant="body">{label}</Text>
      {open && onOpenItem && (
        <Button size="sm" variant="accent" iconRight="arrowRight" onClick={() => onOpenItem(open!)}>
          Open in view
        </Button>
      )}
    </div>
  );
}
