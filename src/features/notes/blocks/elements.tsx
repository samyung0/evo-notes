import { PlateElement, type PlateElementProps, useEditorRef, useReadOnly } from 'platejs/react';
import { Button } from '@/components/ui';
import { Mermaid } from '@/features/materials/Mermaid';
import {
  flashcardsElementToCards,
  flashcardsNodeFromFence,
  quizElementToBlock,
  quizNodeFromFence,
  type FlashcardElement as FlashcardNode,
  type FlashcardsElement as FlashcardsNode,
  type MermaidElement as MermaidNode,
  type QuizElement as QuizNode,
  type QuizOptionElement as QuizOptionNode,
  type QuizQuestionElement as QuizQuestionNode,
} from '@/features/materials/document';
import {
  BLOCK_SHELL_CLASS,
  FLASHCARD_BACK_CLASS,
  FLASHCARD_CLASS,
  FLASHCARD_FRONT_CLASS,
  MERMAID_CAPTION_CLASS,
  QUIZ_EXPLANATION_CLASS,
  QUIZ_OPTION_CLASS,
  QUIZ_PROMPT_CLASS,
  QUIZ_QUESTION_CLASS,
} from '../nodeStyles';
import { useOptionalNoteBlockDialogs } from './dialogContext';
import { flashcardsFenceBody, quizFenceBody } from './shared';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyEditor = any;

function replaceElement(editor: AnyEditor, current: object, next: object) {
  const at = editor.api.findPath(current);
  if (!at) return;
  editor.tf.replaceNodes(next, { at });
}

function BlockShell({
  props,
  onEdit,
  label,
  children,
}: {
  props: PlateElementProps;
  onEdit?: () => void;
  label: string;
  children?: React.ReactNode;
}) {
  const readOnly = useReadOnly();
  return (
    <PlateElement {...props} className={BLOCK_SHELL_CLASS}>
      <div contentEditable={false}>
        <div className="mb-1 flex items-center justify-between">
          <span className="t-label text-fg-muted">{label}</span>
          {!readOnly && onEdit && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onEdit}
              className="opacity-70 hover:opacity-100"
            >
              Edit
            </Button>
          )}
        </div>
      </div>
      {children}
      {props.children}
    </PlateElement>
  );
}

export function QuizElement(props: PlateElementProps) {
  const editor = useEditorRef();
  const dialogs = useOptionalNoteBlockDialogs();
  const element = props.element as unknown as QuizNode;
  function edit() {
    dialogs?.openQuiz(quizFenceBody(quizElementToBlock(element)), (code) => {
      replaceElement(editor, props.element, quizNodeFromFence(code, element.id));
    });
  }
  return (
    <BlockShell props={props} onEdit={dialogs ? edit : undefined} label="Quiz">
      {element.timeLimitMin != null && (
        <div contentEditable={false} className="mb-2 text-xs text-fg-muted">
          Time limit: {element.timeLimitMin} min
        </div>
      )}
    </BlockShell>
  );
}

export function FlashcardsElement(props: PlateElementProps) {
  const editor = useEditorRef();
  const dialogs = useOptionalNoteBlockDialogs();
  const element = props.element as unknown as FlashcardsNode;
  function edit() {
    dialogs?.openFlashcards(flashcardsFenceBody(flashcardsElementToCards(element)), (code) => {
      replaceElement(editor, props.element, flashcardsNodeFromFence(code, element.id));
    });
  }
  return <BlockShell props={props} onEdit={dialogs ? edit : undefined} label="Flashcards" />;
}

export function MermaidElement(props: PlateElementProps) {
  const editor = useEditorRef();
  const readOnly = useReadOnly();
  const element = props.element as unknown as MermaidNode;
  function edit() {
    const next = window.prompt('Mermaid diagram source', element.source);
    if (next == null) return;
    const at = editor.api.findPath(props.element);
    if (at) editor.tf.setNodes({ source: next } as Partial<MermaidNode>, { at });
  }
  return (
    <BlockShell props={props} onEdit={readOnly ? undefined : edit} label="Diagram">
      <div contentEditable={false}>
        <Mermaid code={element.source} />
      </div>
    </BlockShell>
  );
}

export function QuizQuestionElement(props: PlateElementProps) {
  const element = props.element as unknown as QuizQuestionNode;
  return (
    <PlateElement {...props} className={QUIZ_QUESTION_CLASS}>
      <div contentEditable={false} className="mb-2 text-xs font-medium text-fg-muted">
        {element.questionType.toUpperCase()}
      </div>
      {props.children}
    </PlateElement>
  );
}

export function QuizPromptElement(props: PlateElementProps) {
  return (
    <PlateElement {...props} as="p" className={QUIZ_PROMPT_CLASS}>
      {props.children}
    </PlateElement>
  );
}

export function QuizOptionElement(props: PlateElementProps) {
  const element = props.element as unknown as QuizOptionNode;
  const question = editorParentQuestion(useEditorRef(), props.element);
  const correct = question?.correctOptionIds?.includes(element.id);
  return (
    <PlateElement {...props} as="p" className={QUIZ_OPTION_CLASS}>
      <span contentEditable={false} className="mr-2 text-xs text-fg-muted">
        {correct ? '✓' : '○'}
      </span>
      {props.children}
    </PlateElement>
  );
}

function editorParentQuestion(editor: AnyEditor, element: object): QuizQuestionNode | undefined {
  const path = editor.api.findPath(element);
  if (!path || path.length < 1) return undefined;
  const parent = editor.api.node(path.slice(0, -1))?.[0];
  return parent?.type === 'quiz_question' ? (parent as QuizQuestionNode) : undefined;
}

export function QuizExplanationElement(props: PlateElementProps) {
  return (
    <PlateElement {...props} as="p" className={QUIZ_EXPLANATION_CLASS}>
      {props.children}
    </PlateElement>
  );
}

export function FlashcardElement(props: PlateElementProps) {
  const element = props.element as unknown as FlashcardNode;
  return (
    <PlateElement {...props} className={FLASHCARD_CLASS} data-card-id={element.id}>
      {props.children}
    </PlateElement>
  );
}

export function FlashcardFrontElement(props: PlateElementProps) {
  return (
    <PlateElement {...props} as="p" className={FLASHCARD_FRONT_CLASS}>
      {props.children}
    </PlateElement>
  );
}

export function FlashcardBackElement(props: PlateElementProps) {
  return (
    <PlateElement {...props} as="p" className={FLASHCARD_BACK_CLASS}>
      {props.children}
    </PlateElement>
  );
}

export function MermaidCaptionElement(props: PlateElementProps) {
  return (
    <PlateElement {...props} as="p" className={MERMAID_CAPTION_CLASS}>
      {props.children}
    </PlateElement>
  );
}
