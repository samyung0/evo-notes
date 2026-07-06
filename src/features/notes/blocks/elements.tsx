import { PlateElement, type PlateElementProps, useEditorRef } from 'platejs/react';
import { Button } from '@/components/ui';
import { QuizBlock } from '@/features/materials/QuizBlock';
import { FlashcardsBlock } from '@/features/materials/FlashcardsBlock';
import { Mermaid } from '@/features/materials/Mermaid';
import { useNoteBlockDialogs } from './dialogContext';
import type { CustomBlockElement } from './shared';

function elementCode(props: PlateElementProps): string {
  return String((props.element as unknown as CustomBlockElement).code ?? '');
}

/** Void wrapper shared by the custom blocks: renders read-only content plus an
 * optional edit toolbar, and keeps the caret out of the widget body. */
function BlockShell({
  props,
  onEdit,
  label,
  children,
}: {
  props: PlateElementProps;
  onEdit?: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <PlateElement {...props} className="my-3">
      <div
        contentEditable={false}
        className="group/block relative rounded-card border border-line bg-surface/40 p-2"
      >
        <div className="mb-1 flex items-center justify-between">
          <span className="t-label text-fg-muted">{label}</span>
          {onEdit && (
            <Button variant="ghost" size="sm" onClick={onEdit} className="opacity-70 hover:opacity-100">
              Edit
            </Button>
          )}
        </div>
        {children}
      </div>
      {props.children}
    </PlateElement>
  );
}

export function QuizElement(props: PlateElementProps) {
  const editor = useEditorRef();
  const dialogs = useNoteBlockDialogs();
  const code = elementCode(props);
  function edit() {
    dialogs.openQuiz(code, (next) => {
      const at = editor.api.findPath(props.element);
      if (at) editor.tf.setNodes({ code: next } as Partial<CustomBlockElement>, { at });
    });
  }
  return (
    <BlockShell props={props} onEdit={edit} label="Quiz">
      <QuizBlock body={code} />
    </BlockShell>
  );
}

export function FlashcardsElement(props: PlateElementProps) {
  const editor = useEditorRef();
  const dialogs = useNoteBlockDialogs();
  const code = elementCode(props);
  function edit() {
    dialogs.openFlashcards(code, (next) => {
      const at = editor.api.findPath(props.element);
      if (at) editor.tf.setNodes({ code: next } as Partial<CustomBlockElement>, { at });
    });
  }
  return (
    <BlockShell props={props} onEdit={edit} label="Flashcards">
      <FlashcardsBlock body={code} />
    </BlockShell>
  );
}

export function MermaidElement(props: PlateElementProps) {
  const editor = useEditorRef();
  const code = elementCode(props);
  function edit() {
    const next = window.prompt('Mermaid diagram source', code);
    if (next == null) return;
    const at = editor.api.findPath(props.element);
    if (at) editor.tf.setNodes({ code: next } as Partial<CustomBlockElement>, { at });
  }
  return (
    <BlockShell props={props} onEdit={edit} label="Diagram">
      <Mermaid code={code} />
    </BlockShell>
  );
}
