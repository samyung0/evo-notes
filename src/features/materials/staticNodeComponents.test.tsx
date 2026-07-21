import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { Question } from '@/api/types';
import { MaterialPreview } from './MaterialPreview';
import { createMaterialDocument, flashcardsNode, quizNode, type MaterialValue } from './document';

function renderMaterial(value: MaterialValue): string {
  return renderToStaticMarkup(<MaterialPreview content={createMaterialDocument(value)} />);
}

describe('static study-block renderers', () => {
  it('renders task lists with read-only checked state', () => {
    const html = renderMaterial([
      {
        type: 'p',
        listStyleType: 'todo',
        checked: true,
        indent: 1,
        children: [{ text: 'Completed task' }],
      },
    ]);

    expect(html).toContain('type="checkbox"');
    expect(html).toContain('checked=""');
    expect(html).toContain('line-through');
    expect(html).toContain('Completed task');
  });

  it('omits unsafe link URLs from static previews', () => {
    const html = renderMaterial([
      {
        type: 'p',
        children: [
          {
            type: 'a',
            url: 'javascript:alert(1)',
            children: [{ text: 'Unsafe link' }],
          },
        ],
      },
    ]);

    expect(html).toContain('Unsafe link');
    expect(html).not.toContain('href="javascript:');
  });

  it('renders persisted font style marks in material previews', () => {
    const html = renderMaterial([
      {
        type: 'p',
        children: [
          {
            text: 'Styled text',
            fontSize: '24px',
            color: '#dc2626',
            backgroundColor: '#fef9c3',
          },
        ],
      },
    ]);

    expect(html).toContain('font-size:24px');
    expect(html).toContain('color:#dc2626');
    expect(html).toContain('background-color:#fef9c3');
    expect(html).toContain('Styled text');
  });

  it('renders semantic callout variants and code language labels in previews', () => {
    const html = renderMaterial([
      {
        type: 'callout',
        variant: 'warning',
        children: [{ type: 'p', children: [{ text: 'Check this first' }] }],
      },
      {
        type: 'code_block',
        lang: 'typescript',
        children: [{ type: 'code_line', children: [{ text: 'const ready = true;' }] }],
      },
    ]);

    expect(html).toContain('data-slate-variant="warning"');
    expect(html).toContain('border-solid-warning');
    expect(html).toContain('Check this first');
    expect(html).toContain('TypeScript');
    expect(html).toContain('const');
    expect(html).toContain(' ready = ');
    expect(html).toContain('true');
  });

  it('preserves persisted column ratios in previews', () => {
    const html = renderMaterial([
      {
        type: 'column_group',
        children: [
          {
            type: 'column',
            width: '66.667%',
            children: [{ type: 'p', children: [{ text: 'Wide' }] }],
          },
          {
            type: 'column',
            width: '33.333%',
            children: [{ type: 'p', children: [{ text: 'Narrow' }] }],
          },
        ],
      },
    ]);

    expect(html).toContain('--column-width:66.667%');
    expect(html).toContain('--column-width:33.333%');
    expect(html).toContain('Wide');
    expect(html).toContain('Narrow');
  });

  it('renders every quiz question shape as a read-only answer review', () => {
    const questions: Question[] = [
      {
        id: 'mcq',
        type: 'mcq',
        level: 'recall',
        prompt: 'Pick one',
        options: [{ value: 'Correct', explanation: 'This is why.' }, { value: 'Distractor' }],
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
        correct: true,
      },
      {
        id: 'fill',
        type: 'fill',
        level: 'application',
        prompt: 'Fill this',
        accepted: [{ value: 'Accepted answer' }],
      },
      {
        id: 'short',
        type: 'short',
        level: 'analysis',
        prompt: 'Explain briefly',
        accepted: [{ value: 'Short answer' }],
      },
      {
        id: 'ordering',
        type: 'ordering',
        level: 'application',
        prompt: 'Put these in order',
        items: [{ value: 'First item' }, { value: 'Second item' }],
      },
      {
        id: 'matching',
        type: 'matching',
        level: 'analysis',
        prompt: 'Match these',
        pairs: [{ left: 'Left', right: 'Right' }],
        explanation: 'Pairs are shown in their correct arrangement.',
      },
    ];

    const html = renderMaterial([quizNode({ questions, timeLimitMin: 15 }, 'quiz')]);

    expect(html).toContain('Question 1');
    expect(html).toContain('Question 7');
    expect(html).toContain('Multiple choice');
    expect(html).toContain('Multiple response');
    expect(html).toContain('True or false');
    expect(html).toContain('Fill in the blank');
    expect(html).toContain('Short answer');
    expect(html).toContain('Ordering');
    expect(html).toContain('Matching');
    expect(html).toContain('This is why.');
    expect(html).toContain('Accepted answer');
    expect(html).toContain('First item');
    expect(html).toContain('Left → Right');
    expect(html).toContain('Pairs are shown in their correct arrangement.');
    expect(html).toContain('border-solid-success');
    expect(html).toContain('Time limit: 15 min');
  });

  it('renders flashcard fronts and backs as side-by-side rows', () => {
    const html = renderMaterial([
      flashcardsNode(
        [
          { id: 'card-1', front: 'Front one', back: 'Back one' },
          { id: 'card-2', front: 'Front two', back: 'Back two' },
        ],
        'deck'
      ),
    ]);

    expect(html).toContain('data-block-id="card-1"');
    expect(html).toContain('data-block-id="card-2"');
    expect(html).toContain('Front one');
    expect(html).toContain('Back two');
    expect(html).toContain('grid-cols-[minmax(0,1fr)_minmax(0,1fr)]');
  });
});
