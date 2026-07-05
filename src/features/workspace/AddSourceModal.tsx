import { useRef, useState } from 'react';
import { SimpleDialog, Button, Icon, Text } from '@/components/ui';
import { useImportSources, useIntegrations, useMicrosoftRecentFiles } from '@/api/hooks';
import { API_BASE, integrationConnectUrl } from '@/api/client';
import { USE_MSW } from '@/api/auth';
import type { Chapter, FileKind, PlanTier } from '@/api/types';

const KIND_BY_EXT: Record<string, FileKind> = {
  pdf: 'pdf',
  doc: 'doc',
  docx: 'doc',
  md: 'md',
  markdown: 'md',
  txt: 'txt',
  png: 'image',
  jpg: 'image',
  jpeg: 'image',
};

interface GooglePickerBuilder {
  addView: (v: unknown) => GooglePickerBuilder;
  setOAuthToken: (t: string) => GooglePickerBuilder;
  setCallback: (
    cb: (data: { action: string; docs?: { id: string }[] }) => void
  ) => GooglePickerBuilder;
  build: () => { setVisible: (v: boolean) => void };
}

declare global {
  interface Window {
    google?: {
      picker: {
        ViewId: { DOCS: string };
        DocsView: new (viewId: string) => { setIncludeFolders: (v: boolean) => unknown };
        PickerBuilder: new () => GooglePickerBuilder;
      };
    };
  }
}

function loadGooglePicker(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.google?.picker) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://apis.google.com/js/api.js';
    script.onload = () => {
      (window as unknown as { gapi: { load: (n: string, cb: () => void) => void } }).gapi.load(
        'picker',
        () => resolve()
      );
    };
    script.onerror = () => reject(new Error('failed to load google picker'));
    document.head.appendChild(script);
  });
}

export function AddSourceModal({
  open,
  onClose,
  workspaceId,
  chapters,
  onAdd,
}: {
  open: boolean;
  onClose: () => void;
  workspaceId: string;
  chapters: Chapter[];
  onAdd: (files: { file: File; kind: FileKind; chapterId: string | null }[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [chapterId, setChapterId] = useState<string | null>(null);
  const [msOpen, setMsOpen] = useState(false);
  const { data: integrations } = useIntegrations();
  const importSources = useImportSources(workspaceId);
  const { data: msFiles } = useMicrosoftRecentFiles(msOpen && !!integrations?.microsoft);

  function handleFiles(list: FileList | null) {
    if (!list?.length) return;
    const files = Array.from(list).map((f) => {
      const ext = f.name.split('.').pop()?.toLowerCase() ?? '';
      return { file: f, kind: KIND_BY_EXT[ext] ?? 'txt', chapterId };
    });
    onAdd(files);
    onClose();
  }

  function connect(provider: 'google' | 'microsoft') {
    if (USE_MSW) {
      importSources.mutate({
        provider,
        fileIds: ['mock_drive_file'],
        chapterId,
      });
      onClose();
      return;
    }
    window.location.href = integrationConnectUrl(provider);
  }

  async function openGooglePicker() {
    if (USE_MSW) {
      importSources.mutate({ provider: 'google', fileIds: ['mock_drive_file'], chapterId });
      onClose();
      return;
    }
    const { accessToken } = await fetch(`${API_BASE}/integrations/google/picker-token`).then((r) =>
      r.json()
    );
    await loadGooglePicker();
    const g = window.google!.picker;
    const view = new g.DocsView(g.ViewId.DOCS);
    view.setIncludeFolders(true);
    const picker = new g.PickerBuilder()
      .addView(view)
      .setOAuthToken(accessToken)
      .setCallback((data: { action: string; docs?: { id: string }[] }) => {
        if (data.action === 'picked' && data.docs?.length) {
          importSources.mutate({
            provider: 'google',
            fileIds: data.docs.map((d: { id: string }) => d.id),
            chapterId,
          });
          onClose();
        }
      })
      .build() as { setVisible: (v: boolean) => void };
    picker.setVisible(true);
  }

  async function onGoogleClick() {
    if (!integrations?.google && !USE_MSW) {
      connect('google');
      return;
    }
    await openGooglePicker();
  }

  function onMicrosoftClick() {
    if (!integrations?.microsoft && !USE_MSW) {
      connect('microsoft');
      return;
    }
    setMsOpen(true);
  }

  function importMicrosoft(ids: string[]) {
    importSources.mutate({ provider: 'microsoft', fileIds: ids, chapterId });
    setMsOpen(false);
    onClose();
  }

  return (
    <>
      <SimpleDialog open={open} onClose={onClose} title="Add source" width={520}>
        <div className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <Text variant="label" tone="muted">
              Add to chapter
            </Text>
            <select
              value={chapterId ?? ''}
              onChange={(e) => setChapterId(e.target.value || null)}
              className="rounded-row border border-line bg-surface px-3 py-2.5 text-sm text-fg"
            >
              <option value="">No chapter</option>
              {chapters.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>

          <button
            onClick={() => inputRef.current?.click()}
            className="flex flex-col items-center gap-2 rounded-card border-[1.5px] border-dashed border-line-strong px-6 py-8 text-fg-secondary transition-colors hover:bg-surface-hover-bg"
          >
            <Icon name="upload" size={28} />
            <Text variant="subtitle">Upload from your computer</Text>
            <Text variant="meta" tone="muted">
              PDF, Word, Markdown, text or images
            </Text>
          </button>
          <input
            ref={inputRef}
            type="file"
            multiple
            hidden
            onChange={(e) => handleFiles(e.target.files)}
          />

          <div className="flex items-center gap-2">
            <span className="h-px flex-1 bg-divider" />
            <Text variant="meta" tone="muted">
              or import from
            </Text>
            <span className="h-px flex-1 bg-divider" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              iconLeft="files"
              onClick={onGoogleClick}
              disabled={importSources.isPending}
            >
              Google Drive
            </Button>
            <Button
              variant="outline"
              iconLeft="files"
              onClick={onMicrosoftClick}
              disabled={importSources.isPending}
            >
              OneDrive
            </Button>
          </div>
          {!integrations?.google && !integrations?.microsoft && !USE_MSW && (
            <Text variant="meta" tone="muted" className="text-center">
              Connect your cloud account on first use.
            </Text>
          )}
        </div>
      </SimpleDialog>

      <SimpleDialog
        open={msOpen}
        onClose={() => setMsOpen(false)}
        title="OneDrive files"
        width={480}
      >
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
          {!msFiles?.length && (
            <Text variant="meta" tone="muted">
              No recent files found.
            </Text>
          )}
        </div>
      </SimpleDialog>
    </>
  );
}
