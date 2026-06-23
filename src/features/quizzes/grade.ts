import type { Question } from '@/api/types';

export type Answer = number[] | boolean | string | string[] | Record<string, string>;

const norm = (s: string) => s.trim().toLowerCase();
const setEq = (a: number[], b: number[]) =>
  a.length === b.length && [...a].sort().every((v, i) => v === [...b].sort()[i]);

export function gradeQuestion(q: Question, answer: Answer | undefined): boolean {
  if (answer == null) return false;
  switch (q.type) {
    case 'mcq':
    case 'multi':
      return (
        Array.isArray(answer) &&
        typeof answer[0] !== 'string' &&
        setEq(answer as number[], q.correct)
      );
    case 'boolean':
      return answer === q.correct;
    case 'fill':
    case 'short':
      return typeof answer === 'string' && q.accepted.some((a) => norm(a) === norm(answer));
    case 'ordering':
      return Array.isArray(answer) && (answer as string[]).join('|') === q.items.join('|');
    case 'matching': {
      if (typeof answer !== 'object' || Array.isArray(answer)) return false;
      return q.pairs.every((p) => (answer as Record<string, string>)[p.left] === p.right);
    }
    default:
      return false;
  }
}

export function emptyAnswer(q: Question): Answer {
  switch (q.type) {
    case 'mcq':
    case 'multi':
      return [];
    case 'boolean':
      return false;
    case 'fill':
    case 'short':
      return '';
    case 'ordering':
      return [...q.items].sort(() => Math.random() - 0.5);
    case 'matching':
      return {};
    default:
      return '';
  }
}
