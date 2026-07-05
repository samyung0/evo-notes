import { useMemo } from 'react';
import { Text } from '@/components/ui';
import { QuestionRunner } from '@/features/quizzes/QuestionRunner';
import { emptyAnswer } from '@/features/quizzes/grade';
import { parseQuizFenceBody } from './blocks';

/** Read-only renderer for a ```quiz fenced block (YAML payload). */
export function QuizBlock({ body }: { body: string }) {
  const { questions, timeLimitMin } = useMemo(() => parseQuizFenceBody(body), [body]);

  if (!questions.length) {
    return (
      <pre className="my-3 overflow-auto rounded-card border border-line bg-surface-hover-bg p-3 text-xs">
        <code className="font-mono text-fg-muted">Empty quiz block</code>
      </pre>
    );
  }

  return (
    <div className="my-4 flex flex-col gap-4">
      {timeLimitMin != null && (
        <Text variant="meta" tone="muted">
          Time limit: {timeLimitMin} min
        </Text>
      )}
      {questions.map((q, i) => (
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
  );
}
