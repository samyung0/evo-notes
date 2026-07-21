import { describe, expect, it } from 'vitest';
import type { ChoiceQuestion, Question } from '@/api/types';
import { parseQuizFenceBody } from '@/features/materials/blocks';
import { quizFenceBody } from '@/features/notes/blocks/shared';
import { createBlankQuestion, isCompleteQuestion } from './QuizForm';

const questions: Question[] = [
  {
    id: 'mcq',
    type: 'mcq',
    level: 'recall',
    prompt: 'Pick one',
    options: [
      { value: 'Correct', explanation: 'Because it is.' },
      { value: 'Wrong', explanation: 'Because it is not.' },
    ],
    correct: [0],
  },
  {
    id: 'multi',
    type: 'multi',
    level: 'application',
    prompt: 'Pick several',
    options: [{ value: 'First' }, { value: 'Second' }],
    correct: [0, 1],
  },
  {
    id: 'boolean',
    type: 'boolean',
    level: 'recall',
    prompt: 'True or false?',
    correct: false,
  },
  {
    id: 'fill',
    type: 'fill',
    level: 'application',
    prompt: 'Fill this',
    accepted: [{ value: 'Accepted' }],
  },
  {
    id: 'short',
    type: 'short',
    level: 'analysis',
    prompt: 'Explain briefly',
    accepted: [{ value: 'Short answer' }],
    explanation: 'A concise explanation.',
  },
  {
    id: 'ordering',
    type: 'ordering',
    level: 'application',
    prompt: 'Order these',
    items: [{ value: 'First' }, { value: 'Second' }],
  },
  {
    id: 'matching',
    type: 'matching',
    level: 'analysis',
    prompt: 'Match these',
    pairs: [
      { left: 'A', right: 'One' },
      { left: 'B', right: 'Two' },
    ],
  },
];

describe('QuizForm question helpers', () => {
  it('validates complete questions for every supported type', () => {
    const incompleteChoice = structuredClone(questions[0]) as ChoiceQuestion;
    incompleteChoice.correct = [];

    expect(questions.every(isCompleteQuestion)).toBe(true);
    expect(isCompleteQuestion(createBlankQuestion('mcq'))).toBe(false);
    expect(isCompleteQuestion(incompleteChoice)).toBe(false);
  });

  it('round-trips every question type without losing typed fields', () => {
    const parsed = parseQuizFenceBody(quizFenceBody({ questions, timeLimitMin: 20 }));

    expect(parsed).toEqual({ questions, timeLimitMin: 20 });
  });
});
