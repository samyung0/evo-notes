import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Button, Skeleton, Text, userToast } from '@/components/ui';
import { useQuiz, useUpdateQuiz } from '@/api/hooks';
import { QuestionRunner } from '@/features/quizzes/QuestionRunner';
import { emptyAnswer } from '@/features/quizzes/grade';
import { QuizForm } from '@/features/quizzes/QuizForm';
import type { Question } from '@/api/types';
import { FileError, FileLoading } from './CenterContent';

/** In-pane, read-only preview of a quiz: shows every question with its correct
 * answer and explanations (review mode), plus Edit / Start actions. */
export function QuizPreview({ quizId, readOnly = false }: { quizId: string; readOnly?: boolean }) {
  const { data: quiz, isLoading, isError } = useQuiz(quizId);
  const update = useUpdateQuiz();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [questions, setQuestions] = useState<Question[]>([]);

  if (isLoading) return <FileLoading />;
  if (!isLoading && (isError || !quiz)) return <FileError />;

  function beginEdit() {
    if (!quiz) return;
    setName(quiz.name);
    setQuestions(structuredClone(quiz.questions));
    setEditing(true);
  }

  async function save() {
    try {
      await update.mutateAsync({ id: quizId, name, questions });
      setEditing(false);
      userToast({
        title: 'Quiz saved',
        description: 'Your changes were saved.',
        button: { label: 'Dismiss', onClick: () => {} },
      });
    } catch (error) {
      userToast({
        title: 'Could not save quiz',
        description: error instanceof Error ? error.message : 'Something went wrong.',
        button: { label: 'Dismiss', onClick: () => {} },
      });
    }
  }

  if (editing) {
    return (
      <div className="flex h-full min-h-0 flex-col p-6">
        <div className="flex items-center justify-end gap-2 border-b border-divider px-1 pb-3">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setEditing(false)}
            disabled={update.isPending}
          >
            Cancel
          </Button>
          <Button size="sm" iconLeft="check" onClick={save} disabled={update.isPending}>
            {update.isPending ? 'Saving…' : 'Save'}
          </Button>
        </div>
        <div className="min-h-0 flex-1 overflow-auto pt-4">
          <div className="mx-auto max-w-2xl">
            <QuizForm
              name={name}
              questions={questions}
              onNameChange={setName}
              onQuestionsChange={setQuestions}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col p-6">
      <div className="flex items-center gap-2 border-b border-divider px-1 pb-3">
        <div className="flex-1">
          <Text variant="meta" tone="muted">
            {quiz!.questions.length} questions
          </Text>
        </div>
        {!readOnly && quiz!.isOwner !== false && (
          <Button size="sm" variant="outline" iconLeft="notes" onClick={beginEdit}>
            Edit
          </Button>
        )}
        <Button
          size="sm"
          variant="accent"
          iconRight="arrowRight"
          onClick={() => navigate({ to: '/quizzes/$quizId/attempt', params: { quizId } })}
        >
          Start quiz
        </Button>
      </div>

      <div className="flex flex-col gap-4 overflow-auto pt-4">
        {quiz!.questions.map((q, i) => (
          <div key={q.id} className="rounded-card border border-line bg-surface p-4">
            <p className="t-meta mb-2 text-fg-muted">Question {i + 1}</p>
            <QuestionRunner question={q} answer={emptyAnswer(q)} onChange={() => {}} review />
            {q.explanation && (
              <p className="t-meta mt-3 border-t border-divider pt-3 text-fg-muted">
                {q.explanation}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
