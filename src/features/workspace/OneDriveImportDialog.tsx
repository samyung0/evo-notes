import { useImportSources, useIntegrations, useMicrosoftRecentFiles } from '@/api/hooks';
import { Chapter, FileKind } from '@/api/types';
import { SimpleDialog } from '@/components/ui';
import { useState } from 'react';

export function OneDriveImportDialog({
  open,
  onClose,
  workspaceId,
}: {
  open: boolean;
  onClose: () => void;
  workspaceId: string;
}) {
  const [chapterId, setChapterId] = useState<string | null>(null);
  const importSources = useImportSources(workspaceId);
  const { data: integrations } = useIntegrations();
  const { data: msFiles } = useMicrosoftRecentFiles(!!integrations?.microsoft);

  function importMicrosoft(ids: string[]) {
    importSources.mutate({ provider: 'microsoft', fileIds: ids, chapterId });
    onClose();
  }

  //  TODO: i18n, select chapters
  return (
    <SimpleDialog open={open} onClose={onClose} title="OneDrive files">
      <div className="flex max-h-64 flex-col gap-1 overflow-auto">
        {(msFiles ?? []).map((f) => (
          <button
            key={f.id}
            type="button"
            className="rounded-row px-3 py-2 text-left text-sm hover:bg-surface-hover-bg"
            onClick={() => importMicrosoft([f.id])}
          >
            {f.name}
          </button>
        ))}
        {!msFiles?.length && <p className="t-meta text-fg-muted">No recent files found.</p>}
      </div>
    </SimpleDialog>
  );
}
