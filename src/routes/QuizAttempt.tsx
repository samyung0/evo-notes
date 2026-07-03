import { useMemo, useState } from 'react';
import { Link, useParams } from '@tanstack/react-router';
import { Panel, PanelWithInvertedRadius } from '@/components/app/layout';
import { Button, Icon, ProgressBar, Skeleton, Text } from '@/components/ui';
import { useQuiz, useSubmitAttempt } from '@/api/hooks';
import { QuestionRunner } from '@/features/quizzes/QuestionRunner';
import { emptyAnswer, gradeQuestion, type Answer } from '@/features/quizzes/grade';
import { m } from '@/i18n';

export default function QuizAttempt() {
  const params = useParams({ strict: false });
  const quizId = (params as { quizId: string }).quizId;
  const { data: quiz, isLoading } = useQuiz(quizId);
  const submit = useSubmitAttempt();

  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [done, setDone] = useState(false);

  const score = useMemo(() => {
    if (!quiz) return { correct: 0, total: 0 };
    const correct = quiz.questions.filter((q) => gradeQuestion(q, answers[q.id])).length;
    return { correct, total: quiz.questions.length };
  }, [quiz, answers]);

  if (isLoading || !quiz) {
    return (
      <PanelWithInvertedRadius>
        <div className="h-full p-6">
          <Skeleton className="h-full w-full" />
        </div>
      </PanelWithInvertedRadius>
    );
  }

  if (!quiz.questions.length) {
    return (
      <PanelWithInvertedRadius>
        <div className="mx-auto flex h-full max-w-2xl flex-col items-center justify-center gap-4 px-6 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-card-lg bg-tint-success text-tint-success-fg">
            <Icon name="check" size={30} />
          </span>
          <Text variant="section">{m.quiz_no_questions()}</Text>
          <Link to="/quizzes" preload="intent">
            <Button iconLeft="chevronLeft">{m.quiz_back()}</Button>
          </Link>
        </div>
      </PanelWithInvertedRadius>
    );
  }

  const q = quiz.questions[idx];
  const answer = answers[q.id] ?? emptyAnswer(q);

  function finish() {
    if (!quiz) return;
    const wrong = quiz.questions.filter((qq) => !gradeQuestion(qq, answers[qq.id]));
    submit.mutate({
      quizId,
      correct: score.correct,
      total: score.total,
      wrong,
      answers,
      questions: quiz.questions,
    });
    setDone(true);
  }

  if (done) {
    const pct = Math.round((score.correct / Math.max(1, score.total)) * 100);
    return (
      <PanelWithInvertedRadius>
        <div className="mx-auto flex h-full max-w-2xl flex-col items-center justify-center gap-5 px-6 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-card-lg bg-tint-accent-1 text-tint-accent-1-fg">
            <Icon name="quiz" size={30} />
          </span>
          <Text variant="page-title">
            {score.correct} / {score.total}
          </Text>
          <Text variant="body" tone="secondary">
            You scored {pct}% on {quiz.name}.
          </Text>
          <div className="w-full max-w-sm">
            <ProgressBar
              value={pct}
              tone={pct >= 70 ? 'green' : pct >= 55 ? 'amber' : 'coral'}
              height={8}
            />
          </div>
          <div className="mt-4 flex w-full max-w-md flex-col gap-2 text-left">
            {quiz.questions.map((qq, i) => {
              const ok = gradeQuestion(qq, answers[qq.id]);
              return (
                <div
                  key={qq.id}
                  className="flex items-start gap-2 rounded-card border border-line bg-surface px-3 py-2"
                >
                  <Icon
                    name={ok ? 'check' : 'x'}
                    size={16}
                    className={ok ? 'text-tint-success-fg' : 'text-tint-error-fg'}
                  />
                  <div className="flex-1">
                    <Text variant="meta">
                      {i + 1}. {qq.prompt}
                    </Text>
                    {!ok && qq.explanation && (
                      <Text variant="meta" tone="muted" className="mt-1">
                        {qq.explanation}
                      </Text>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <Link to="/quizzes" preload="intent">
            <Button iconLeft="chevronLeft">Back to quizzes</Button>
          </Link>
        </div>
      </PanelWithInvertedRadius>
    );
  }

  return (
    <PanelWithInvertedRadius>
      <div className="mx-auto flex h-full w-full max-w-2xl flex-col px-6 py-6">
        <div className="mb-4 flex items-center gap-3">
          <Link to="/quizzes" preload="intent" className="text-fg-muted hover:text-fg">
            <Icon name="x" size={20} />
          </Link>
          <div className="flex-1">
            <ProgressBar value={((idx + 1) / quiz.questions.length) * 100} tone="purple" />
          </div>
          <Text variant="meta" tone="muted" className="tabular-nums">
            {idx + 1} / {quiz.questions.length}
          </Text>
        </div>

        <div className="min-h-0 flex-1 overflow-auto py-4">
          <QuestionRunner
            question={q}
            answer={answer}
            onChange={(a) => setAnswers((s) => ({ ...s, [q.id]: a }))}
          />
        </div>

        <div className="flex items-center justify-between border-t border-divider pt-4">
          <Button
            variant="ghost"
            disabled={idx === 0}
            onClick={() => setIdx((i) => i - 1)}
            iconLeft="chevronLeft"
          >
            Previous
          </Button>
          {idx < quiz.questions.length - 1 ? (
            <Button onClick={() => setIdx((i) => i + 1)} iconRight="chevronRight">
              Next
            </Button>
          ) : (
            <Button variant="accent" onClick={finish} iconRight="check">
              Finish
            </Button>
          )}
        </div>
      </div>
    </PanelWithInvertedRadius>
  );
}
