import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Panel, PageHeader, PanelWithInvertedRadius } from '@/components/app/layout';
import {
  Badge,
  Button,
  Card,
  Icon,
  IconButton,
  Menu,
  Modal,
  SkeletonCardGrid,
  SkeletonList,
  Tabs,
  Text,
} from '@/components/ui';
import { useAttempts, useDeleteQuiz, useQuizzes } from '@/api/hooks';
import { useDialogs } from '@/stores/dialogs';
import type { Attempt, Quiz } from '@/api/types';
import { m } from '@/i18n';

function scoreTone(pct: number): 'success' | 'warning' | 'error' {
  return pct >= 70 ? 'success' : pct >= 55 ? 'warning' : 'error';
}

function AllQuizzes() {
  const { data, isLoading } = useQuizzes();
  const navigate = useNavigate();
  const del = useDeleteQuiz();
  const openQuizEdit = useDialogs((s) => s.openQuizEdit);
  const openConfirm = useDialogs((s) => s.openConfirm);
  const [info, setInfo] = useState<Quiz | null>(null);

  if (isLoading) return <SkeletonCardGrid count={6} cardHeight={150} />;

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data?.map((q) => (
          <Card
            key={q.id}
            interactive
            border="solid"
            className="relative gap-3 p-4.5 xl:p-5.5"
            onClick={() => setInfo(q)}
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-card bg-tint-accent-1 text-tint-accent-1-fg">
              <Icon name="quiz" size={20} />
            </span>
            <Text variant="card-title" className="mt-3 truncate">
              {q.name}
            </Text>
            <span className="mt-1 flex items-center gap-1 text-xs text-fg-muted">
              <Icon name="book" size={13} /> {q.workspaceName}
            </span>
            <Text variant="meta" tone="muted" className="mt-1">
              {q.questions.length} questions · {q.chapters.join(', ') || 'All chapters'}
            </Text>
            <div className="absolute top-3 right-3" onClick={(e) => e.stopPropagation()}>
              <Menu
                items={[
                  {
                    label: m.action_edit(),
                    icon: 'settings',
                    onClick: () => openQuizEdit(q),
                  },
                  {
                    label: 'Start quiz',
                    icon: 'quiz',
                    onClick: () =>
                      navigate({
                        to: '/quizzes/$quizId/attempt',
                        params: { quizId: q.id },
                      }),
                  },
                  {
                    label: m.action_delete(),
                    icon: 'trash',
                    danger: true,
                    onClick: () =>
                      openConfirm({
                        title: m.confirm_delete_title({ name: q.name }),
                        body: m.confirm_delete_body(),
                        onConfirm: () => del.mutate(q.id),
                      }),
                  },
                ]}
              />
            </div>
          </Card>
        ))}
      </div>

      <Modal
        open={!!info}
        onClose={() => setInfo(null)}
        title={info?.name}
        width={460}
        footer={
          info && (
            <>
              <Button variant="ghost" onClick={() => setInfo(null)}>
                Cancel
              </Button>
              <Button
                iconRight="arrowRight"
                onClick={() =>
                  navigate({
                    to: '/quizzes/$quizId/attempt',
                    params: { quizId: info.id },
                  })
                }
              >
                {m.quiz_start()}
              </Button>
            </>
          )
        }
      >
        {info && (
          <div className="flex flex-col gap-2">
            <Text variant="body">
              <b>{info.questions.length}</b> questions across {info.chapters.length || 'all'}{' '}
              chapters.
            </Text>
            <Text variant="body" tone="secondary">
              Workspace: {info.workspaceName}
            </Text>
            {info.timeLimitMin && (
              <Text variant="body" tone="secondary">
                Time limit: {info.timeLimitMin} min
              </Text>
            )}
            <div className="mt-2 flex flex-wrap gap-1">
              {[...new Set(info.questions.map((q) => q.type))].map((t) => (
                <Badge key={t} tone="neutral" size="sm">
                  {t}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}

function PastAttempts() {
  const { data, isLoading } = useAttempts();
  if (isLoading) return <SkeletonList count={6} rowHeight={52} />;
  if (!data?.length)
    return (
      <Text variant="body" tone="muted" className="py-8 text-center">
        No attempts yet.
      </Text>
    );

  return (
    <div className="overflow-hidden rounded-card border border-line">
      {/* desktop header */}
      <div className="hidden bg-surface-hover-bg px-4 py-3 text-xs font-bold tracking-wide text-fg-muted uppercase md:flex">
        <div className="flex-[2.2]">{m.quiz_col_quiz()}</div>
        <div className="flex-[1.8]">{m.quiz_col_workspace()}</div>
        <div className="flex-1 text-center">{m.quiz_col_score()}</div>
        <div className="flex-[1.3]">{m.quiz_col_date()}</div>
        <div className="w-28" />
      </div>
      {data.map((a: Attempt) => (
        <div
          key={a.id}
          className="flex flex-col gap-2 border-t border-divider px-4 py-3 first:border-t-0 md:flex-row md:items-center"
        >
          <div className="flex-[2.2] font-semibold text-fg">{a.quizName}</div>
          <div className="flex-[1.8] text-sm text-fg-secondary">{a.workspaceName}</div>
          <div className="flex-1 md:text-center">
            <Badge tone={scoreTone(a.pct)}>
              {a.correct}/{a.total} · {a.pct}%
            </Badge>
          </div>
          <div className="flex-[1.3] text-sm text-fg-muted">
            {new Date(a.takenAt).toLocaleDateString()}
          </div>
          <div className="md:w-28">
            <Button size="sm" variant="outline">
              Check result
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Quizzes() {
  const [tab, setTab] = useState('all');
  return (
    <PanelWithInvertedRadius>
      <PageHeader
        title={m.nav_quizzes()}
        actions={<IconButton icon="plus" variant="gray" size="lg" label={m.action_new_quiz()} />}
      />
      <div className="px-6 pt-4">
        <Tabs
          tabs={[
            { value: 'all', label: m.quiz_tab_all() },
            { value: 'attempts', label: m.quiz_tab_attempts() },
          ]}
          value={tab}
          onChange={setTab}
        />
      </div>
      <div className="min-h-0 flex-1 overflow-auto px-6 py-5">
        {tab === 'all' ? <AllQuizzes /> : <PastAttempts />}
      </div>
    </PanelWithInvertedRadius>
  );
}
