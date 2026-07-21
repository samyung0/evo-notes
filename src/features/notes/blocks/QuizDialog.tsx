import { useEffect, useState } from 'react';
import { Button, Input, SimpleDialog, Text } from '@/components/ui';
import { parseQuizFenceBody } from '@/features/materials/blocks';
import type { Question } from '@/api/types';
import {
  createBlankQuestion,
  isCompleteQuestion,
  QuizForm,
} from '@/features/quizzes/QuizForm';
import { quizFenceBody } from './shared';

/** Popup to author a typed ```quiz block inline in a note. */
export function QuizDialog({
  open,
  initialCode,
  onSave,
  onClose,
}: {
  open: boolean;
  initialCode?: string;
  onSave: (code: string) => void;
  onClose: () => void;
}) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [timeLimit, setTimeLimit] = useState<string>('');

  useEffect(() => {
    if (!open) return;
    const parsed = initialCode
      ? parseQuizFenceBody(initialCode)
      : { questions: [], timeLimitMin: undefined };
    setQuestions(parsed.questions.length ? structuredClone(parsed.questions) : [createBlankQuestion()]);
    setTimeLimit(parsed.timeLimitMin != null ? String(parsed.timeLimitMin) : '');
  }, [open, initialCode]);

  const canSave = questions.length > 0 && questions.every(isCompleteQuestion);

  function save() {
    const tl = parseInt(timeLimit, 10);
    onSave(
      quizFenceBody({
        questions,
        timeLimitMin: Number.isFinite(tl) && tl > 0 ? tl : undefined,
      })
    );
  }

  return (
    <SimpleDialog
      open={open}
      onClose={onClose}
      title="Quiz"
      width={640}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} disabled={!canSave}>
            {initialCode ? 'Save' : 'Insert'}
          </Button>
        </>
      }
    >
      <div className="flex max-h-[62vh] flex-col gap-4 overflow-auto pr-1">
        <label className="flex items-center gap-2">
          <Text variant="label" tone="muted">
            Time limit (min, optional)
          </Text>
          <Input
            type="number"
            className="w-24"
            value={timeLimit}
            onChange={(e) => setTimeLimit(e.target.value)}
          />
        </label>
        <QuizForm
          name=""
          questions={questions}
          onNameChange={() => {}}
          onQuestionsChange={setQuestions}
          showName={false}
        />
        {!canSave && (
          <Text variant="meta" tone="muted">
            Complete every question and mark its correct answer before saving.
          </Text>
        )}
      </div>
    </SimpleDialog>
  );
}
