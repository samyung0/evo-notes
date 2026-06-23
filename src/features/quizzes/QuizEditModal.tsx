import { useState } from 'react';
import { Modal, Button, Checkbox, Icon, Input, Text } from '@/components/ui';
import type { Question, Quiz } from '@/api/types';

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
            <div className="mb-2 flex items-center gap-2">
              <span className="t-label text-fg-muted">
                Q{i + 1} · {q.type} · {q.difficulty}
              </span>
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
                      wrapperClassName="flex-1"
                    />
                  </div>
                ))}
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

            {(q.type === 'ordering' || q.type === 'matching') && (
              <Text variant="meta" tone="muted" className="mt-2 flex items-center gap-1">
                <Icon name="settings" size={12} /> Edit items in the full editor.
              </Text>
            )}
          </div>
        ))}
      </div>
    </Modal>
  );
}
