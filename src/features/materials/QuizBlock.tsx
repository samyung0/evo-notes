import type { ReactNode } from 'react';
import type { CognitiveLevel, QuestionType } from '@/api/types';
import { Badge, Icon } from '@/components/ui';
import { cn } from '@/lib/cn';
import { LEVEL_LABEL, LEVEL_TONE } from '@/lib/levels';
import {
  QUIZ_REVIEW_OPTION_CLASS,
  QUIZ_REVIEW_OPTION_CORRECT_CLASS,
  QUIZ_REVIEW_OPTION_NEUTRAL_CLASS,
  QUIZ_REVIEW_PROMPT_CLASS,
} from '@/features/notes/nodeStyles';

export type QuizOptionRole = 'accepted-answer' | 'matching-pair' | 'ordering-item';

export function QuizQuestionHeader({
  questionNumber,
  questionType,
  level,
}: {
  questionNumber?: number;
  questionType: QuestionType;
  level: CognitiveLevel;
}) {
  return (
    <>
      <div contentEditable={false} className="mb-3 flex items-center gap-2">
        <Badge tone={LEVEL_TONE[level]} className="-translate-y-px" size="sm">
          {LEVEL_LABEL[level]}
        </Badge>
        <div className={cn(QUIZ_REVIEW_PROMPT_CLASS, 'mb-0')}>{questionNumber}.</div>
      </div>
    </>
  );
}

export function quizOptionClassName(correct: boolean, role?: QuizOptionRole): string {
  return cn(
    'col-span-2',
    QUIZ_REVIEW_OPTION_CLASS,
    correct || role === 'accepted-answer'
      ? QUIZ_REVIEW_OPTION_CORRECT_CLASS
      : QUIZ_REVIEW_OPTION_NEUTRAL_CLASS
  );
}

export function QuizOptionView({
  children,
  correct,
  role,
  optionNumber,
  explanation,
}: {
  children: ReactNode;
  correct: boolean;
  role?: QuizOptionRole;
  optionNumber?: number;
  explanation?: string;
}) {
  const highlighted = correct || role === 'accepted-answer';
  const orderedItem = role === 'ordering-item';
  const matchingPair = role === 'matching-pair';

  return (
    <>
      <span className="flex items-center gap-3">
        <span
          contentEditable={false}
          className={cn(
            'flex h-5 w-5 shrink-0 items-center justify-center rounded-pill border',
            highlighted
              ? 'border-solid-success bg-solid-success text-white'
              : orderedItem
                ? 'border-0 bg-surface-hover-bg text-xs font-bold text-fg-secondary'
                : matchingPair
                  ? 'border-line-strong text-fg-muted'
                  : 'border-line-strong'
          )}
        >
          {highlighted ? (
            <Icon name="check" size={13} strokeWidth={2.5} />
          ) : orderedItem ? (
            optionNumber
          ) : matchingPair ? (
            '↔'
          ) : null}
        </span>
        <span className="min-w-0 wrap-break-word">{children}</span>
      </span>
      {explanation && (
        <span contentEditable={false} className="pl-8 text-xs text-fg-muted">
          {explanation}
        </span>
      )}
    </>
  );
}
