import { useState } from 'react';
import { Modal, Button, Checkbox, Icon, Input, Text } from '@/components/ui';
import { LEVELS, LEVEL_LABEL } from '@/lib/levels';
import { cn } from '@/lib/cn';
import type { CognitiveLevel, Question, QuestionType, Quiz } from '@/api/types';

const Q_TYPES: QuestionType[] = [
  'mcq',
  'multi',
  'boolean',
  'fill',
  'short',
  'matching',
  'ordering',
];
const Q_TYPE_LABEL: Record<QuestionType, string> = {
  mcq: 'Multiple choice',
  multi: 'Multi-select',
  boolean: 'True / false',
  fill: 'Fill blank',
  short: 'Short answer',
  matching: 'Matching',
  ordering: 'Ordering',
};

const newId = () => `q_${Math.random().toString(36).slice(2, 9)}`;

/** Build a blank question of the given type, preserving shared fields. */
function blankQuestion(
  type: QuestionType,
  base: { id: string; level: CognitiveLevel; prompt: string; explanation?: string }
): Question {
  switch (type) {
    case 'mcq':
      return { ...base, type: 'mcq', options: ['', ''], correct: [] };
    case 'multi':
      return { ...base, type: 'multi', options: ['', ''], correct: [] };
    case 'boolean':
      return { ...base, type: 'boolean', correct: true };
    case 'fill':
      return { ...base, type: 'fill', accepted: [''] };
    case 'short':
      return { ...base, type: 'short', accepted: [''] };
    case 'ordering':
      return { ...base, type: 'ordering', items: ['', ''] };
    case 'matching':
      return {
        ...base,
        type: 'matching',
        pairs: [
          { left: '', right: '' },
          { left: '', right: '' },
        ],
      };
  }
}

const selectClass =
  'rounded-input border border-line bg-surface px-2 py-1.5 text-xs text-fg outline-none focus:border-line-strong';

export function QuizEditModal({
  quiz,
  open,
  onClose,
  onSave,
}: {
  quiz: Quiz;
  open: boolean;
  onClose: () => void;
  onSave: (patch: Partial<Quiz>) => void;
}) {
  const [name, setName] = useState(quiz.name);
  const [questions, setQuestions] = useState<Question[]>(structuredClone(quiz.questions));

  function update(i: number, next: Question) {
    setQuestions((qs) => qs.map((q, idx) => (idx === i ? next : q)));
  }
  function changeType(i: number, type: QuestionType) {
    const q = questions[i];
    if (q.type === type) return;
    update(i, blankQuestion(type, { id: q.id, level: q.level, prompt: q.prompt, explanation: q.explanation }));
  }
  function addQuestion() {
    setQuestions((qs) => [
      ...qs,
      blankQuestion('mcq', { id: newId(), level: 'recall', prompt: '' }),
    ]);
  }
  function removeQuestion(i: number) {
    setQuestions((qs) => qs.filter((_, idx) => idx !== i));
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Edit quiz"
      width={640}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              onSave({ name, questions });
              onClose();
            }}
          >
            Save
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <label className="flex flex-col gap-1.5">
          <Text variant="label" tone="muted">
            Quiz name
          </Text>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </label>

        {questions.map((q, i) => (
          <div key={q.id} className="bg-surface-hover-bg rounded-card border border-line p-4">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="t-label text-fg-muted">Q{i + 1}</span>
              <select
                value={q.type}
                onChange={(e) => changeType(i, e.target.value as QuestionType)}
                className={selectClass}
              >
                {Q_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {Q_TYPE_LABEL[t]}
                  </option>
                ))}
              </select>
              <select
                value={q.level}
                onChange={(e) => update(i, { ...q, level: e.target.value as CognitiveLevel })}
                className={selectClass}
              >
                {LEVELS.map((lvl) => (
                  <option key={lvl} value={lvl}>
                    {LEVEL_LABEL[lvl]}
                  </option>
                ))}
              </select>
              <button
                onClick={() => removeQuestion(i)}
                className="ml-auto text-fg-muted hover:text-tint-error-fg"
                aria-label="Delete question"
              >
                <Icon name="trash" size={16} />
              </button>
            </div>

            <Input
              value={q.prompt}
              onChange={(e) => update(i, { ...q, prompt: e.target.value })}
              placeholder="Question prompt"
            />

            {(q.type === 'mcq' || q.type === 'multi') && (
              <div className="mt-3 flex flex-col gap-2">
                {q.options.map((opt, oi) => (
                  <div key={oi} className="flex items-center gap-2">
                    <Checkbox
                      checked={q.correct.includes(oi)}
                      tone="green"
                      size={20}
                      onChange={(c) => {
                        const correct = c ? [...q.correct, oi] : q.correct.filter((x) => x !== oi);
                        update(i, {
                          ...q,
                          correct: q.type === 'mcq' ? (c ? [oi] : []) : correct,
                        });
                      }}
                    />
                    <Input
                      value={opt}
                      onChange={(e) => {
                        const options = [...q.options];
                        options[oi] = e.target.value;
                        update(i, { ...q, options });
                      }}
                      placeholder={`Option ${oi + 1}`}
                      wrapperClassName="flex-1"
                    />
                    <button
                      onClick={() => {
                        const options = q.options.filter((_, x) => x !== oi);
                        const correct = q.correct
                          .filter((x) => x !== oi)
                          .map((x) => (x > oi ? x - 1 : x));
                        update(i, { ...q, options, correct });
                      }}
                      disabled={q.options.length <= 2}
                      className="text-fg-muted hover:text-fg disabled:opacity-30"
                      aria-label="Remove option"
                    >
                      <Icon name="x" size={15} />
                    </button>
                  </div>
                ))}
                <AddRowButton
                  label="Add option"
                  onClick={() => update(i, { ...q, options: [...q.options, ''] })}
                />
              </div>
            )}

            {q.type === 'boolean' && (
              <div className="mt-3 flex items-center gap-2">
                <Text variant="meta" tone="muted">
                  Correct answer:
                </Text>
                <Button
                  size="sm"
                  variant={q.correct ? 'accent' : 'outline'}
                  onClick={() => update(i, { ...q, correct: true })}
                >
                  True
                </Button>
                <Button
                  size="sm"
                  variant={!q.correct ? 'accent' : 'outline'}
                  onClick={() => update(i, { ...q, correct: false })}
                >
                  False
                </Button>
              </div>
            )}

            {(q.type === 'fill' || q.type === 'short') && (
              <label className="mt-3 flex flex-col gap-1.5">
                <Text variant="label" tone="muted">
                  Accepted answers (comma separated)
                </Text>
                <Input
                  value={q.accepted.join(', ')}
                  onChange={(e) =>
                    update(i, {
                      ...q,
                      accepted: e.target.value.split(',').map((s) => s.trim()),
                    })
                  }
                />
              </label>
            )}

            {q.type === 'ordering' && (
              <div className="mt-3 flex flex-col gap-2">
                <Text variant="label" tone="muted">
                  Items (listed in correct order)
                </Text>
                {q.items.map((item, oi) => (
                  <div key={oi} className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-pill bg-surface text-xs font-bold text-fg-secondary">
                      {oi + 1}
                    </span>
                    <Input
                      value={item}
                      onChange={(e) => {
                        const items = [...q.items];
                        items[oi] = e.target.value;
                        update(i, { ...q, items });
                      }}
                      placeholder={`Item ${oi + 1}`}
                      wrapperClassName="flex-1"
                    />
                    <button
                      onClick={() => update(i, { ...q, items: q.items.filter((_, x) => x !== oi) })}
                      disabled={q.items.length <= 2}
                      className="text-fg-muted hover:text-fg disabled:opacity-30"
                      aria-label="Remove item"
                    >
                      <Icon name="x" size={15} />
                    </button>
                  </div>
                ))}
                <AddRowButton
                  label="Add item"
                  onClick={() => update(i, { ...q, items: [...q.items, ''] })}
                />
              </div>
            )}

            {q.type === 'matching' && (
              <div className="mt-3 flex flex-col gap-2">
                <Text variant="label" tone="muted">
                  Pairs
                </Text>
                {q.pairs.map((p, oi) => (
                  <div key={oi} className="flex items-center gap-2">
                    <Input
                      value={p.left}
                      onChange={(e) => {
                        const pairs = q.pairs.map((x, xi) =>
                          xi === oi ? { ...x, left: e.target.value } : x
                        );
                        update(i, { ...q, pairs });
                      }}
                      placeholder="Left"
                      wrapperClassName="flex-1"
                    />
                    <Icon name="arrowRight" size={14} className="text-fg-muted" />
                    <Input
                      value={p.right}
                      onChange={(e) => {
                        const pairs = q.pairs.map((x, xi) =>
                          xi === oi ? { ...x, right: e.target.value } : x
                        );
                        update(i, { ...q, pairs });
                      }}
                      placeholder="Right"
                      wrapperClassName="flex-1"
                    />
                    <button
                      onClick={() => update(i, { ...q, pairs: q.pairs.filter((_, x) => x !== oi) })}
                      disabled={q.pairs.length <= 2}
                      className="text-fg-muted hover:text-fg disabled:opacity-30"
                      aria-label="Remove pair"
                    >
                      <Icon name="x" size={15} />
                    </button>
                  </div>
                ))}
                <AddRowButton
                  label="Add pair"
                  onClick={() => update(i, { ...q, pairs: [...q.pairs, { left: '', right: '' }] })}
                />
              </div>
            )}

            <label className="mt-3 flex flex-col gap-1.5">
              <Text variant="label" tone="muted">
                Explanation (optional)
              </Text>
              <Input
                value={q.explanation ?? ''}
                onChange={(e) => update(i, { ...q, explanation: e.target.value })}
                placeholder="Shown after answering"
              />
            </label>
          </div>
        ))}

        <Button variant="outline" iconLeft="plus" onClick={addQuestion}>
          Add question
        </Button>
      </div>
    </Modal>
  );
}

function AddRowButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-1 self-start rounded-pill border border-dashed border-line px-2.5 py-1',
        'text-xs font-medium text-fg-secondary hover:bg-surface'
      )}
    >
      <Icon name="plus" size={13} /> {label}
    </button>
  );
}
