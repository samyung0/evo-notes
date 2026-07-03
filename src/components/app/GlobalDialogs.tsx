import { ConfirmDialog, Modal, Text } from '@/components/ui';
import {
  useChapters,
  useCreateEvent,
  useCreateWorkspace,
  useLabels,
  useUpdateLabel,
  useUpdateTask,
  useUpdateWorkspace,
  useUploadSource,
  useWorkspaceStats,
} from '@/api/hooks';
import { WorkspaceFormCreateDialog } from '@/features/workspaces/WorkspaceFormCreateDialog';
import { TaskEditModal } from '@/features/tasks/TaskEditModal';
import { LabelEditModal } from '@/features/schedule/LabelEditModal';
import { EventFormModal } from '@/features/schedule/EventFormModal';
import { AddSourceModal } from '@/features/workspace/AddSourceModal';
import { useDialogs } from '@/stores/dialogs';
import { SearchDialog } from './TopInsetBar';
import { WorkspaceFormEditDialog } from '@/features/workspaces/WorkspaceFormEditDialog';

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
  const workspaceCreate = useDialogs((s) => s.workspaceCreate);
  const workspaceEdit = useDialogs((s) => s.workspaceEdit);
  const workspaceId = useDialogs((s) => s.workspaceId);
  const workspaceStatsId = useDialogs((s) => s.workspaceStatsId);
  const taskEdit = useDialogs((s) => s.taskEdit);
  const labelEdit = useDialogs((s) => s.labelEdit);
  const eventForm = useDialogs((s) => s.eventForm);
  const addSource = useDialogs((s) => s.addSource);
  const confirm = useDialogs((s) => s.confirm);
  const openWorkspaceCreate = useDialogs((s) => s.openWorkspaceCreate);
  const openWorkspaceEdit = useDialogs((s) => s.openWorkspaceEdit);
  const closeWorkspaceCreate = useDialogs((s) => s.closeWorkspaceCreate);
  const closeWorkspaceEdit = useDialogs((s) => s.closeWorkspaceEdit);
  const closeWorkspaceStats = useDialogs((s) => s.closeWorkspaceStats);
  const closeTaskEdit = useDialogs((s) => s.closeTaskEdit);
  const closeLabelEdit = useDialogs((s) => s.closeLabelEdit);
  const closeEventForm = useDialogs((s) => s.closeEventForm);
  const closeAddSource = useDialogs((s) => s.closeAddSource);
  const closeConfirm = useDialogs((s) => s.closeConfirm);

  const createWorkspace = useCreateWorkspace();
  const updateWorkspace = useUpdateWorkspace();
  const updateTask = useUpdateTask();
  const updateLabel = useUpdateLabel();
  const createEvent = useCreateEvent();
  const { data: labels } = useLabels();

  // Hooks must run unconditionally; the workspace-scoped queries are gated on an
  // id internally, so they stay idle until a workspace add-source dialog opens.
  const addSourceWsId = addSource?.workspaceId ?? '';
  const { data: addSourceChapters } = useChapters(addSourceWsId);
  const uploadSource = useUploadSource(addSourceWsId);

  const isTopBarSearchOpen = useDialogs((s) => s.isTopBarSearchOpen);
  const setTopBarSearchOpen = useDialogs((s) => s.setTopBarSearchOpen);

  return (
    <>
      {workspaceCreate && (
        <WorkspaceFormCreateDialog
          open
          workspace={workspaceCreate}
          setOpen={(open) => {
            if (!open) closeWorkspaceCreate();
            if (open && !workspaceCreate) openWorkspaceCreate();
          }}
          onSubmit={async (v) => {
            return await createWorkspace.mutateAsync(v);
          }}
        />
      )}

      {workspaceEdit && (
        <WorkspaceFormEditDialog
          open
          workspace={workspaceEdit}
          setOpen={(open) => {
            if (!open) closeWorkspaceEdit();
            if (open && workspaceId && !workspaceEdit)
              openWorkspaceEdit(workspaceEdit, workspaceId);
          }}
          onSubmit={async (v) => {
            if (!workspaceId) {
              // todo: throw error
              return;
            }
            return await updateWorkspace.mutateAsync({ id: workspaceId, ...v });
          }}
        />
      )}

      {workspaceStatsId && (
        <WorkspaceStatsModal id={workspaceStatsId} onClose={closeWorkspaceStats} />
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

      <SearchDialog open={isTopBarSearchOpen} setOpen={setTopBarSearchOpen} />
    </>
  );
}
