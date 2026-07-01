import { ConfirmDialog, Modal, Text } from '@/components/ui';
import {
  useChapters,
  useCreateEvent,
  useCreateWorkspace,
  useLabels,
  useUpdateLabel,
  useUpdateQuiz,
  useUpdateTask,
  useUpdateWorkspace,
  useUploadSource,
  useWorkspaceStats,
} from '@/api/hooks';
import { WorkspaceFormModal } from '@/features/workspaces/WorkspaceFormModal';
import { QuizEditModal } from '@/features/quizzes/QuizEditModal';
import { TaskEditModal } from '@/features/tasks/TaskEditModal';
import { LabelEditModal } from '@/features/schedule/LabelEditModal';
import { EventFormModal } from '@/features/schedule/EventFormModal';
import { AddSourceModal } from '@/features/workspace/AddSourceModal';
import { useDialogs } from '@/stores/dialogs';

function WorkspaceStatsModal({ id, onClose }: { id: string; onClose: () => void }) {
  const { data } = useWorkspaceStats(id);
  const rows = [
    ['Chapters', data?.chapters],
    ['Files', data?.files],
    ['Quizzes', data?.quizzes],
    ['Attempts', data?.attempts],
    ['Average score', data ? `${data.avgScore}%` : undefined],
  ] as const;
  return (
    <Modal open onClose={onClose} title="Workspace statistics" width={420}>
      <div className="grid grid-cols-2 gap-3">
        {rows.map(([label, val]) => (
          <div
            key={label}
            className="rounded-card border border-line bg-surface-hover-bg px-4 py-3"
          >
            <Text variant="label" tone="muted">
              {label}
            </Text>
            <Text variant="section" className="mt-1">
              {val ?? '—'}
            </Text>
          </div>
        ))}
      </div>
    </Modal>
  );
}

export function GlobalDialogs() {
  const workspaceForm = useDialogs((s) => s.workspaceForm);
  const workspaceStatsId = useDialogs((s) => s.workspaceStatsId);
  const quizEdit = useDialogs((s) => s.quizEdit);
  const taskEdit = useDialogs((s) => s.taskEdit);
  const labelEdit = useDialogs((s) => s.labelEdit);
  const eventForm = useDialogs((s) => s.eventForm);
  const addSource = useDialogs((s) => s.addSource);
  const confirm = useDialogs((s) => s.confirm);
  const closeWorkspaceForm = useDialogs((s) => s.closeWorkspaceForm);
  const closeWorkspaceStats = useDialogs((s) => s.closeWorkspaceStats);
  const closeQuizEdit = useDialogs((s) => s.closeQuizEdit);
  const closeTaskEdit = useDialogs((s) => s.closeTaskEdit);
  const closeLabelEdit = useDialogs((s) => s.closeLabelEdit);
  const closeEventForm = useDialogs((s) => s.closeEventForm);
  const closeAddSource = useDialogs((s) => s.closeAddSource);
  const closeConfirm = useDialogs((s) => s.closeConfirm);

  const createWorkspace = useCreateWorkspace();
  const updateWorkspace = useUpdateWorkspace();
  const updateQuiz = useUpdateQuiz();
  const updateTask = useUpdateTask();
  const updateLabel = useUpdateLabel();
  const createEvent = useCreateEvent();
  const { data: labels } = useLabels();

  // Hooks must run unconditionally; the workspace-scoped queries are gated on an
  // id internally, so they stay idle until a workspace add-source dialog opens.
  const addSourceWsId = addSource?.workspaceId ?? '';
  const { data: addSourceChapters } = useChapters(addSourceWsId);
  const uploadSource = useUploadSource(addSourceWsId);

  return (
    <>
      {workspaceForm && (
        <WorkspaceFormModal
          key={workspaceForm.workspace?.id ?? 'new'}
          open
          initial={workspaceForm.workspace}
          onClose={closeWorkspaceForm}
          onSubmit={(v) => {
            if (workspaceForm.workspace) {
              updateWorkspace.mutate({ id: workspaceForm.workspace.id, ...v });
            } else {
              createWorkspace.mutate(v);
            }
            closeWorkspaceForm();
          }}
        />
      )}

      {workspaceStatsId && (
        <WorkspaceStatsModal id={workspaceStatsId} onClose={closeWorkspaceStats} />
      )}

      {quizEdit && (
        <QuizEditModal
          quiz={quizEdit}
          open
          onClose={closeQuizEdit}
          onSave={(patch) => updateQuiz.mutate({ id: quizEdit.id, ...patch })}
        />
      )}

      {taskEdit && (
        <TaskEditModal
          task={taskEdit}
          open
          onClose={closeTaskEdit}
          onSave={(patch) => updateTask.mutate({ id: taskEdit.id, ...patch })}
        />
      )}

      {labelEdit && (
        <LabelEditModal
          key={labelEdit.id}
          label={labelEdit}
          open
          onClose={closeLabelEdit}
          onSave={(patch) => updateLabel.mutate({ id: labelEdit.id, ...patch })}
        />
      )}

      {eventForm && (
        <EventFormModal
          key={`${eventForm.start ?? ''}-${eventForm.end ?? ''}`}
          open
          labels={labels ?? []}
          draft={eventForm}
          onClose={closeEventForm}
          onSubmit={(v) => createEvent.mutate(v)}
        />
      )}

      {addSource && (
        <AddSourceModal
          open
          onClose={closeAddSource}
          workspaceId={addSource.workspaceId}
          chapters={addSourceChapters ?? []}
          onAdd={(list) => list.forEach((f) => uploadSource.mutate(f))}
        />
      )}

      <ConfirmDialog
        open={!!confirm}
        onClose={closeConfirm}
        onConfirm={() => confirm?.onConfirm()}
        title={confirm?.title ?? ''}
        body={confirm?.body}
        confirmLabel={confirm?.confirmLabel}
        danger={confirm?.danger ?? true}
      />
    </>
  );
}
