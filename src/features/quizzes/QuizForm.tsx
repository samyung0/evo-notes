import { Button, Checkbox, Icon, Input, Text } from '@/components/ui';
import { LEVELS, LEVEL_LABEL } from '@/lib/levels';
import { cn } from '@/lib/cn';
import type { CognitiveLevel, Question, QuestionType } from '@/api/types';

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

/** Build a blank question of the given type, preserving any shared fields. */
export function createBlankQuestion(
  type: QuestionType = 'mcq',
  base?: { id?: string; level?: CognitiveLevel; prompt?: string; explanation?: string }
): Question {
  const shared = {
    id: base?.id ?? newId(),
    level: base?.level ?? ('recall' as const),
    prompt: base?.prompt ?? '',
    ...(base?.explanation ? { explanation: base.explanation } : {}),
  };
  switch (type) {
    case 'mcq':
      return { ...shared, type: 'mcq', options: [{ value: '' }, { value: '' }], correct: [] };
    case 'multi':
      return { ...shared, type: 'multi', options: [{ value: '' }, { value: '' }], correct: [] };
    case 'boolean':
      return { ...shared, type: 'boolean', correct: true };
    case 'fill':
      return { ...shared, type: 'fill', accepted: [{ value: '' }] };
    case 'short':
      return { ...shared, type: 'short', accepted: [{ value: '' }] };
    case 'ordering':
      return { ...shared, type: 'ordering', items: [{ value: '' }, { value: '' }] };
    case 'matching':
      return {
        ...shared,
        type: 'matching',
        pairs: [
          { left: '', right: '' },
          { left: '', right: '' },
        ],
      };
  }
}

export function isCompleteQuestion(question: Question): boolean {
  if (!question.prompt.trim()) return false;
  switch (question.type) {
    case 'mcq':
    case 'multi':
      return (
        question.options.length >= 2 &&
        question.options.every((option) => option.value.trim()) &&
        question.correct.length >= 1 &&
        (question.type === 'multi' || question.correct.length === 1) &&
        question.correct.every((index) => index >= 0 && index < question.options.length)
      );
    case 'boolean':
      return true;
    case 'fill':
    case 'short':
      return (
        question.accepted.length > 0 &&
        question.accepted.every((answer) => answer.value.trim())
      );
    case 'ordering':
      return question.items.length >= 2 && question.items.every((item) => item.value.trim());
    case 'matching':
      return (
        question.pairs.length >= 2 &&
        question.pairs.every((pair) => pair.left.trim() && pair.right.trim())
      );
  }
}

const selectClass =
  'rounded-row border border-line bg-surface px-2 py-1.5 text-xs text-fg outline-none focus:border-line-strong';

/**
 * Controlled quiz editor: name field + a list of type-specific question
 * editors. The parent owns the `name`/`questions` state so it can drive save
 * and navigation. Extracted from the old QuizEditModal so it can back a full
 * page.
 */
export function QuizForm({
  name,
  questions,
  onNameChange,
  onQuestionsChange,
  showName = true,
}: {
  name: string;
  questions: Question[];
  onNameChange: (name: string) => void;
  onQuestionsChange: (questions: Question[]) => void;
  showName?: boolean;
}) {
  function update(i: number, next: Question) {
    onQuestionsChange(questions.map((q, idx) => (idx === i ? next : q)));
  }
  function changeType(i: number, type: QuestionType) {
    const q = questions[i];
    if (q.type === type) return;
    update(
      i,
      createBlankQuestion(type, {
        id: q.id,
        level: q.level,
        prompt: q.prompt,
        explanation: q.explanation,
      })
    );
  }
  function addQuestion() {
    onQuestionsChange([
      ...questions,
      createBlankQuestion(),
    ]);
  }
  function removeQuestion(i: number) {
    onQuestionsChange(questions.filter((_, idx) => idx !== i));
  }

  return (
    <div className="flex flex-col gap-5">
      {showName && (
        <label className="flex flex-col gap-1.5">
          <Text variant="label" tone="muted">
            Quiz name
          </Text>
          <Input value={name} onChange={(e) => onNameChange(e.target.value)} />
        </label>
      )}

      {questions.map((q, i) => (
        <div key={q.id} className="rounded-card border border-line bg-surface-hover-bg p-4">
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
            <div className="mt-3 flex flex-col gap-3">
              {q.options.map((opt, oi) => (
                <div key={oi} className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2">
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
                      value={opt.value}
                      onChange={(e) => {
                        const options = [...q.options];
                        options[oi] = { ...options[oi], value: e.target.value };
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
                  <Input
                    value={opt.explanation ?? ''}
                    onChange={(e) => {
                      const options = [...q.options];
                      options[oi] = { ...options[oi], explanation: e.target.value };
                      update(i, { ...q, options });
                    }}
                    placeholder={`Why option ${oi + 1} is right / wrong (optional)`}
                    wrapperClassName="ml-7"
                  />
                </div>
              ))}
              <AddRowButton
                label="Add option"
                onClick={() => update(i, { ...q, options: [...q.options, { value: '' }] })}
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
                value={q.accepted.map((a) => a.value).join(', ')}
                onChange={(e) =>
                  update(i, {
                    ...q,
                    accepted: e.target.value.split(',').map((s) => ({ value: s.trim() })),
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
                    value={item.value}
                    onChange={(e) => {
                      const items = [...q.items];
                      items[oi] = { value: e.target.value };
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
                onClick={() => update(i, { ...q, items: [...q.items, { value: '' }] })}
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
