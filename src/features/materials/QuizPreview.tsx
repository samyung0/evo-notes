import { useNavigate } from '@tanstack/react-router';
import { Button, Skeleton, Text } from '@/components/ui';
import { useQuiz } from '@/api/hooks';
import { QuestionRunner } from '@/features/quizzes/QuestionRunner';
import { emptyAnswer } from '@/features/quizzes/grade';

/** In-pane, read-only preview of a quiz: shows every question with its correct
 * answer and explanations (review mode), plus Edit / Start actions. */
export function QuizPreview({ quizId }: { quizId: string }) {
  const { data: quiz, isLoading } = useQuiz(quizId);
  const navigate = useNavigate();

  if (isLoading || !quiz) return <Skeleton className="h-full min-h-[40vh] w-full" />;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-divider px-1 pb-3">
        <div className="flex-1">
          <Text variant="meta" tone="muted">
            {quiz.questions.length} questions
          </Text>
        </div>
        <Button
          size="sm"
          variant="outline"
          iconLeft="notes"
          onClick={() => navigate({ to: '/quizzes/$quizId/edit', params: { quizId } })}
        >
          Edit
        </Button>
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
        {quiz.questions.map((q, i) => (
          <div key={q.id} className="rounded-card border border-line bg-surface p-4">
            <Text variant="meta" tone="muted" className="mb-2">
              Question {i + 1}
            </Text>
            <QuestionRunner question={q} answer={emptyAnswer(q)} onChange={() => {}} review />
            {q.explanation && (
              <Text variant="meta" tone="muted" className="mt-3 border-t border-divider pt-3">
                {q.explanation}
              </Text>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
