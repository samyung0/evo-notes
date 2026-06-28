import { useState } from 'react';
import { Button, Input, Modal, Text } from '@/components/ui';
import type { Task } from '@/api/types';
import { m } from '@/i18n';

export function TaskEditModal({
  task,
  open,
  onClose,
  onSave,
}: {
  task: Task;
  open: boolean;
  onClose: () => void;
  onSave: (patch: Pick<Task, 'title'>) => void;
}) {
  const [title, setTitle] = useState(task.title);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={m.action_edit()}
      width={440}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={!title.trim()}
            onClick={() => {
              onSave({ title: title.trim() });
              onClose();
            }}
          >
            Save
          </Button>
        </>
      }
    >
      <label className="flex flex-col gap-1.5">
        <Text variant="label" tone="muted">
          Title
        </Text>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
      </label>
    </Modal>
  );
}
