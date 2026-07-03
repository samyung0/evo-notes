import { Link, useParams } from '@tanstack/react-router';
import { PanelWithInvertedRadius } from '@/components/app/layout';
import { Badge, Button, Icon, ProgressBar, Skeleton, Text } from '@/components/ui';
import { useAttempt } from '@/api/hooks';
import { QuestionRunner } from '@/features/quizzes/QuestionRunner';
import { emptyAnswer, gradeQuestion, type Answer } from '@/features/quizzes/grade';

function scoreTone(pct: number): 'green' | 'amber' | 'coral' {
  return pct >= 70 ? 'green' : pct >= 55 ? 'amber' : 'coral';
}

export default function AttemptResult() {
  const params = useParams({ strict: false });
  const attemptId = (params as { attemptId: string }).attemptId;
  const { data: attempt, isLoading, isError } = useAttempt(attemptId);

  if (isLoading) {
    return (
      <PanelWithInvertedRadius>
        <div className="h-full p-6">
          <Skeleton className="h-full w-full" />
        </div>
      </PanelWithInvertedRadius>
    );
  }

  if (isError || !attempt) {
    return (
      <PanelWithInvertedRadius>
        <div className="mx-auto flex h-full max-w-2xl flex-col items-center justify-center gap-4 px-6 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-card-lg bg-tint-error text-tint-error-fg">
            <Icon name="x" size={30} />
          </span>
          <Text variant="section">This attempt is unavailable.</Text>
          <Link to="/quizzes" preload="intent">
            <Button iconLeft="chevronLeft">Back to quizzes</Button>
          </Link>
        </div>
      </PanelWithInvertedRadius>
    );
  }

  const answers = attempt.answers as Record<string, Answer>;
  const hasBreakdown = attempt.questions.length > 0;

  return (
    <PanelWithInvertedRadius>
      <div className="mx-auto flex h-full w-full max-w-2xl flex-col overflow-auto px-6 py-6">
        <div className="mb-4 flex items-center gap-3">
          <Link to="/quizzes" preload="intent" className="text-fg-muted hover:text-fg">
            <Icon name="chevronLeft" size={20} />
          </Link>
          <div className="flex-1">
            <Text variant="section">{attempt.quizName}</Text>
            <Text variant="meta" tone="muted">
              {attempt.workspaceName} · {new Date(attempt.takenAt).toLocaleString()}
            </Text>
          </div>
          <Badge tone={attempt.pct >= 70 ? 'success' : attempt.pct >= 55 ? 'warning' : 'error'}>
            {attempt.correct}/{attempt.total} · {attempt.pct}%
          </Badge>
        </div>

        <div className="mb-6">
          <ProgressBar value={attempt.pct} tone={scoreTone(attempt.pct)} height={8} />
        </div>

        {!hasBreakdown ? (
          <Text variant="body" tone="muted" className="py-8 text-center">
            No per-question breakdown was recorded for this attempt.
          </Text>
        ) : (
          <div className="flex flex-col gap-4">
            {attempt.questions.map((q, i) => {
              const a = answers?.[q.id] ?? emptyAnswer(q);
              const ok = gradeQuestion(q, a);
              return (
                <div key={q.id} className="rounded-card border border-line bg-surface p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <span
                      className={cnBadge(ok)}
                      aria-label={ok ? 'correct' : 'incorrect'}
                    >
                      <Icon name={ok ? 'check' : 'x'} size={13} strokeWidth={2.5} />
                    </span>
                    <Text variant="meta" tone="muted">
                      Question {i + 1}
                    </Text>
                  </div>
                  <QuestionRunner question={q} answer={a} onChange={() => {}} review />
                  {q.explanation && (
                    <Text variant="meta" tone="muted" className="mt-3 border-t border-divider pt-3">
                      {q.explanation}
                    </Text>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-6">
          <Link to="/quizzes" preload="intent">
            <Button iconLeft="chevronLeft">Back to quizzes</Button>
          </Link>
        </div>
      </div>
    </PanelWithInvertedRadius>
  );
}

function cnBadge(ok: boolean) {
  return [
    'flex h-6 w-6 items-center justify-center rounded-pill text-white',
    ok ? 'bg-solid-success' : 'bg-solid-error',
  ].join(' ');
}
