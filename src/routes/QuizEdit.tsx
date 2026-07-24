import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from '@tanstack/react-router';
import { PageHeader, PanelWithInvertedRadius } from '@/components/app/layout';
import { Button, Skeleton, Text } from '@/components/ui';
import { userToast } from '@/components/ui/userToast';
import { useQuiz, useUpdateQuiz } from '@/api/hooks';
import { QuizForm } from '@/features/quizzes/QuizForm';
import type { Question } from '@/api/types';

export default function QuizEdit() {
  const params = useParams({ strict: false });
  const quizId = (params as { quizId: string }).quizId;
  const navigate = useNavigate();
  const { data: quiz, isLoading } = useQuiz(quizId);
  const update = useUpdateQuiz();

  const [name, setName] = useState('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const seeded = useRef(false);

  // Seed local editor state once the quiz loads (subsequent edits stay local).
  useEffect(() => {
    if (quiz && !seeded.current) {
      setName(quiz.name);
      setQuestions(structuredClone(quiz.questions));
      seeded.current = true;
    }
  }, [quiz]);

  function back() {
    navigate({ to: '/quizzes' });
  }

  async function save() {
    try {
      await update.mutateAsync({ id: quizId, name, questions });
      back();
    } catch (err) {
      userToast({
        title: 'Could not save quiz',
        description: err instanceof Error ? err.message : 'Something went wrong.',
        variant: 'error',
      });
    }
  }

  return (
    <PanelWithInvertedRadius>
      <PageHeader
        title="Edit quiz"
        actions={
          <>
            <Button
              variant="ghost"
              iconLeft="chevronLeft"
              onClick={back}
              disabled={update.isPending}
            >
              Back
            </Button>
            <Button iconLeft="check" onClick={save} disabled={update.isPending || !seeded.current}>
              {update.isPending ? 'Saving…' : 'Save'}
            </Button>
          </>
        }
      />
      <div className="min-h-0 flex-1 overflow-auto px-6 py-5">
        {isLoading || !seeded.current ? (
          <Skeleton className="h-64 w-full" />
        ) : !quiz ? (
          <Text variant="body" tone="muted" className="py-8 text-center">
            Quiz not found.
          </Text>
        ) : (
          <div className="mx-auto max-w-2xl">
            <QuizForm
              name={name}
              questions={questions}
              onNameChange={setName}
              onQuestionsChange={setQuestions}
            />
          </div>
        )}
      </div>
    </PanelWithInvertedRadius>
  );
}
