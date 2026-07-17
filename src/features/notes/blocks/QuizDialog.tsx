import { useEffect, useState } from 'react';
import { Button, IconButton, Input, SimpleDialog, Text } from '@/components/ui';
import { parseQuizFenceBody } from '@/features/materials/blocks';
import type { ChoiceQuestion, Question } from '@/api/types';
import { quizFenceBody } from './shared';
import { uid } from '@/lib/id';

interface DraftQuestion {
  id: string;
  prompt: string;
  options: string[];
  correct: number;
}

function toDraft(q: Question): DraftQuestion {
  if (q.type === 'mcq' || q.type === 'multi') {
    const c = q as ChoiceQuestion;
    return {
      id: c.id,
      prompt: c.prompt,
      options: c.options.map((o) => o.value),
      correct: c.correct[0] ?? 0,
    };
  }
  // Non-choice questions are shown as a single-prompt placeholder row.
  return { id: q.id, prompt: q.prompt, options: ['', ''], correct: 0 };
}

function newDraft(): DraftQuestion {
  return { id: uid('q'), prompt: '', options: ['', '', '', ''], correct: 0 };
}

function toQuestion(d: DraftQuestion): ChoiceQuestion {
  const options = d.options
    .map((v) => v.trim())
    .filter(Boolean)
    .map((value) => ({ value }));
  return {
    id: d.id,
    type: 'mcq',
    level: 'recall',
    prompt: d.prompt.trim(),
    options,
    correct: [Math.min(d.correct, Math.max(0, options.length - 1))],
  };
}

/** Small popup to author a ```quiz block inline in a note. Supports quick
 * multiple-choice questions; emits the fence body (YAML) via onSave. */
export function QuizDialog({
  open,
  initialCode,
  onSave,
  onClose,
}: {
  open: boolean;
  initialCode?: string;
  onSave: (code: string) => void;
  onClose: () => void;
}) {
  const [questions, setQuestions] = useState<DraftQuestion[]>([]);
  const [timeLimit, setTimeLimit] = useState<string>('');

  useEffect(() => {
    if (!open) return;
    const parsed = initialCode
      ? parseQuizFenceBody(initialCode)
      : { questions: [], timeLimitMin: undefined };
    setQuestions(parsed.questions.length ? parsed.questions.map(toDraft) : [newDraft()]);
    setTimeLimit(parsed.timeLimitMin != null ? String(parsed.timeLimitMin) : '');
  }, [open, initialCode]);

  function updateQ(i: number, patch: Partial<DraftQuestion>) {
    setQuestions((qs) => qs.map((q, idx) => (idx === i ? { ...q, ...patch } : q)));
  }
  function updateOption(qi: number, oi: number, value: string) {
    setQuestions((qs) =>
      qs.map((q, idx) =>
        idx === qi ? { ...q, options: q.options.map((o, j) => (j === oi ? value : o)) } : q
      )
    );
  }

  const clean = questions.filter((q) => q.prompt.trim() && q.options.some((o) => o.trim()));
  const canSave = clean.length > 0;

  function save() {
    const tl = parseInt(timeLimit, 10);
    onSave(
      quizFenceBody({
        questions: clean.map(toQuestion),
        timeLimitMin: Number.isFinite(tl) && tl > 0 ? tl : undefined,
      })
    );
  }

  return (
    <SimpleDialog
      open={open}
      onClose={onClose}
      title="Quiz"
      width={640}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} disabled={!canSave}>
            Insert
          </Button>
        </>
      }
    >
      <div className="flex max-h-[62vh] flex-col gap-4 overflow-auto pr-1">
        <label className="flex items-center gap-2">
          <Text variant="label" tone="muted">
            Time limit (min, optional)
          </Text>
          <Input
            type="number"
            className="w-24"
            value={timeLimit}
            onChange={(e) => setTimeLimit(e.target.value)}
          />
        </label>
        {questions.map((q, qi) => (
          <div key={q.id} className="flex flex-col gap-2 rounded-card border border-line p-3">
            <div className="flex items-center gap-2">
              <Text variant="label" tone="muted" className="flex-1">
                Question {qi + 1}
              </Text>
              <IconButton
                icon="trash"
                variant="ghost"
                size="sm"
                label="Remove question"
                onClick={() => setQuestions((qs) => qs.filter((_, idx) => idx !== qi))}
              />
            </div>
            <Input
              placeholder="Prompt"
              value={q.prompt}
              onChange={(e) => updateQ(qi, { prompt: e.target.value })}
            />
            <div className="flex flex-col gap-1.5">
              {q.options.map((o, oi) => (
                <label key={oi} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name={`correct-${q.id}`}
                    checked={q.correct === oi}
                    onChange={() => updateQ(qi, { correct: oi })}
                    aria-label={`Mark option ${oi + 1} correct`}
                  />
                  <Input
                    placeholder={`Option ${oi + 1}`}
                    value={o}
                    onChange={(e) => updateOption(qi, oi, e.target.value)}
                  />
                </label>
              ))}
            </div>
          </div>
        ))}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setQuestions((qs) => [...qs, newDraft()])}
          className="self-start"
        >
          Add question
        </Button>
        {!canSave && (
          <Text variant="meta" tone="muted">
            Add at least one question with a prompt and options.
          </Text>
        )}
      </div>
    </SimpleDialog>
  );
}
