import { USE_MSW } from '@/api/auth';
import { api } from '@/api/client';
import {
  useChapters,
  useImportSources,
  useIntegrations,
  useSourceUploadPolicy,
  useUploadSource,
} from '@/api/hooks';
import type { Chapter, SourceFile, SourceUploadPolicy } from '@/api/types';
import {
  Button,
  ConfirmDialog,
  DialogClose,
  DialogFooter,
  Icon,
  IconButton,
  Input,
  ProgressBar,
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
  SimpleDialog,
  Spinner,
  Tabs,
  Text,
} from '@/components/ui';
import { userToast } from '@/components/ui/userToast';
import { m } from '@/i18n';
import { cn } from '@/lib/cn';
import { useProviderConnect } from '@/lib/useProviderConnect';
import { useDialogs } from '@/stores/dialogs';
import { useEffect, useRef, useState } from 'react';
import {
  aggregateUploadPct,
  defaultParseMode,
  fileExt,
  getFileKind,
  isTextKind,
  parseModeIssues,
  type ParseMode,
} from './sourceUpload';

/** Count a PDF's pages with pdfjs (already bundled via react-pdf, loaded on
 * demand). Returns null for non-PDFs and unreadable/encrypted files. */
async function pdfPageCount(file: File): Promise<number | null> {
  if (fileExt(file.name) !== 'pdf') return null;
  try {
    const { pdfjs } = await import('react-pdf');
    if (!pdfjs.GlobalWorkerOptions.workerSrc) {
      pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;
    }
    const doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
    const n = doc.numPages;
    void doc.destroy();
    return n;
  } catch {
    return null;
  }
}

function formatSize(bytes: number) {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

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

const NO_CHAPTER = '__none__';
const CREATE_CHAPTER = '__create__';

function ChapterSelect({
  chapters,
  value,
  chapterName,
  onChange,
  onCreateRequest,
}: {
  chapters: Chapter[];
  value: string | null;
  chapterName?: string | null;
  onChange: (v: string | null) => void;
  onCreateRequest?: () => void;
}) {
  return (
    <Select
      value={value ?? NO_CHAPTER}
      onValueChange={(v) => {
        if (v === CREATE_CHAPTER) {
          onCreateRequest?.();
          return;
        }
        onChange(v === NO_CHAPTER ? null : v);
      }}
    >
      <SelectTrigger size="sm" variant="underline" className="w-fit">
        <div className="w-fit max-w-36 min-w-28">
          {chapterName ? (
            <span className="line-clamp-1 translate-y-px">{chapterName}</span>
          ) : (
            <SelectValue />
          )}
        </div>
      </SelectTrigger>
      <SelectContent className="max-w-47">
        <SelectGroup>
          <SelectItem size="sm" value={NO_CHAPTER}>
            <span className="text-fg-muted">No chapter</span>
          </SelectItem>
          {chapters.map((o) => (
            <SelectItem size="sm" key={o.id} value={o.id}>
              <span className="line-clamp-1 translate-y-px">{o.name}</span>
            </SelectItem>
          ))}
        </SelectGroup>
        {onCreateRequest && (
          <>
            <SelectSeparator />
            <SelectGroup>
              <SelectItem size="sm" value={CREATE_CHAPTER}>
                <span className="flex items-center gap-1.5">
                  <Icon name="plus" size={14} />
                  New chapter…
                </span>
              </SelectItem>
            </SelectGroup>
          </>
        )}
      </SelectContent>
    </Select>
  );
}

interface PendingFile {
  key: string;
  file: File;
  kind: SourceFile['kind'];
  chapterId: string | null;
  chapterName: string | null;
  parseMode: ParseMode;
  /** PDF page count via pdfjs; undefined = still counting, null = unknown. */
  pageCount?: number | null;
  uploadPct?: number;
}

function ParseModeSelect({
  pending,
  policy,
  onChange,
}: {
  pending: PendingFile;
  policy: SourceUploadPolicy;
  onChange: (mode: ParseMode) => void;
}) {
  if (pending.kind === 'unknown') return;
  if (isTextKind(pending.kind, policy)) return;
  const issues = parseModeIssues(pending.file, pending.kind, policy, pending.pageCount);
  if (issues.advanced && issues.normal) return;
  return (
    <Select value={pending.parseMode} onValueChange={(v) => onChange(v as ParseMode)}>
      <SelectTrigger size="sm" variant="underline" className="w-fit">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectItem size="sm" value="advanced" disabled={!!issues.advanced}>
            Advanced parsing{issues.advanced ? ` (${issues.advanced})` : ''}
          </SelectItem>
          <SelectItem size="sm" value="normal" disabled={!!issues.normal}>
            Normal parsing{issues.normal ? ` (${issues.normal})` : ''}
          </SelectItem>
          <SelectItem size="sm" value="none">
            No parsing
          </SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}

function UploadFiles({
  workspaceId,
  onClose,
  className,
}: {
  workspaceId: string;
  onClose?: () => void;
  className?: string;
}) {
  const uploadSource = useUploadSource(workspaceId);
  const { data: uploadPolicy } = useSourceUploadPolicy();
  const { data: chapters } = useChapters(workspaceId);
  const inputRef = useRef<HTMLInputElement>(null);
  const uploadControllers = useRef(new Map<string, AbortController>());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [files, setFiles] = useState<PendingFile[]>([]);
  // Row currently typing a new chapter name (replaces its chapter select).
  const [creatingKey, setCreatingKey] = useState<string | null>(null);
  const [newChapterName, setNewChapterName] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(
    () => () => {
      for (const controller of uploadControllers.current.values()) controller.abort();
    },
    []
  );

  function handleFiles(list: FileList | null) {
    if (!list?.length) return;
    if (!uploadPolicy) {
      userToast({
        title: `Upload formats are still loading`,
        description: `Please try again in a moment.`,
        variant: 'error',
      });
      return;
    }
    const candidates = Array.from(list).map((f, i) => {
      const kind = getFileKind(f.name, uploadPolicy);
      return {
        key: `${Date.now()}-${i}-${f.name}`,
        file: f,
        kind,
        chapterId: null,
        chapterName: null,
        parseMode: defaultParseMode(f, kind, uploadPolicy),
      };
    });
    const added = candidates.filter((file) => file.kind !== 'unknown');
    const rejected = candidates.filter((file) => file.kind === 'unknown');
    if (rejected.length) {
      userToast({
        title: `Unsupported file format`,
        description: rejected.map((file) => file.file.name).join(', '),
        variant: 'error',
      });
    }
    if (!added.length) {
      if (inputRef.current) inputRef.current.value = '';
      return;
    }
    setFiles((prev) => [...prev, ...added]);
    if (inputRef.current) inputRef.current.value = '';
    // Count PDF pages in the background; if the count invalidates the row's
    // current mode (normal + >20 pages), fall back to the best valid one.
    for (const row of added) {
      if (fileExt(row.file.name) !== 'pdf') continue;
      void pdfPageCount(row.file).then((n) => {
        setFiles((prev) =>
          prev.map((f) => {
            if (f.key !== row.key) return f;
            const next: PendingFile = { ...f, pageCount: n };
            if (
              f.parseMode !== 'none' &&
              parseModeIssues(f.file, f.kind, uploadPolicy, n)[f.parseMode]
            ) {
              next.parseMode = defaultParseMode(f.file, f.kind, uploadPolicy, n);
            }
            return next;
          })
        );
      });
    }
  }

  function patchFile(key: string, patch: Partial<PendingFile>) {
    setFiles((prev) => prev.map((f) => (f.key === key ? { ...f, ...patch } : f)));
  }

  function confirmCreateChapter(key: string) {
    const name = newChapterName.trim();
    if (!name) return;
    // Reuse an existing chapter when it is already loaded. New names travel
    // with the upload and are resolved atomically by the backend.
    const existing = chapters?.find((c) => c.name.toLowerCase() === name.toLowerCase());
    patchFile(key, {
      chapterId: existing?.id ?? null,
      chapterName: existing ? null : name,
    });
    setCreatingKey(null);
    setNewChapterName('');
  }

  const handleUpload = async () => {
    if (isSubmitting || files.length === 0) return;
    setIsSubmitting(true);
    const batch = [...files];
    setFiles((prev) => prev.map((file) => ({ ...file, uploadPct: 0 })));
    const results = await Promise.allSettled(
      batch.map((f) => {
        const controller = new AbortController();
        uploadControllers.current.set(f.key, controller);
        return uploadSource
          .mutateAsync({
            file: f.file,
            kind: f.kind,
            chapterId: f.chapterId,
            chapterName: f.chapterName,
            parseMode: f.parseMode,
            signal: controller.signal,
            onUploadProgress: (uploadPct) => patchFile(f.key, { uploadPct }),
          })
          .finally(() => uploadControllers.current.delete(f.key));
      })
    );
    setIsSubmitting(false);
    if (results.every((r) => r.status === 'fulfilled')) {
      setFiles([]);
      setConfirmOpen(false);
      onClose?.();
    } else {
      const succeededKeys = new Set(
        batch.filter((_, index) => results[index]?.status === 'fulfilled').map((file) => file.key)
      );
      setFiles((prev) => prev.filter((file) => !succeededKeys.has(file.key)));
      userToast({
        title: `Some files failed to upload`,
        variant: 'error',
      });
    }
  };
  const formatFileSizes = () => {
    const totalBytes = files.reduce((acc, file) => acc + file.file.size, 0);
    if (totalBytes < 1024) return `${totalBytes} bytes`;
    if (totalBytes < 1024 * 1024) return `${(totalBytes / 1024).toFixed(1)} KB`;
    return `${(totalBytes / 1024 / 1024).toFixed(1)} MB`;
  };
  const normalParse = uploadPolicy?.parseModes.find((mode) => mode.mode === 'normal');
  const advancedParse = uploadPolicy?.parseModes.find((mode) => mode.mode === 'advanced');
  const aggregateProgress = aggregateUploadPct(
    files.map((file) => ({ size: file.file.size, uploadPct: file.uploadPct }))
  );
  const completedUploads = files.filter((file) => file.uploadPct === 100).length;

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      <button
        disabled={!uploadPolicy}
        onClick={() => inputRef.current?.click()}
        className={cn(
          'flex flex-col items-center gap-2 rounded-card border-2 border-dashed border-line px-6 py-8 transition-colors hover:bg-surface-hover-bg',
          files.length > 0 && 'py-4'
        )}
      >
        <Icon name="upload" className="size-7" />
        <p className="t-subtitle">Upload from your computer</p>
        <p className="t-meta text-fg-muted">PDF, Office, Markdown, text, images, audio or video</p>
      </button>
      <input
        ref={inputRef}
        type="file"
        multiple
        hidden
        accept={uploadPolicy?.accept}
        onChange={(e) => handleFiles(e.target.files)}
      />

      {files.length > 0 && (
        <ul className="flex max-h-88 flex-col gap-2 overflow-y-auto pr-1">
          {files.map((f) => (
            <li key={f.key} className="flex flex-col gap-2 px-1.5 pt-0.5">
              <div className="flex flex-col gap-0">
                <div className="flex flex-1 justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Icon name="files" className="size-4 shrink-0 -translate-y-px" />
                    <span className="t-subtitle min-w-0 flex-1 truncate" title={f.file.name}>
                      {f.file.name}
                    </span>
                  </div>
                  <IconButton
                    icon="x"
                    size="xs"
                    variant="ghost-hover"
                    label="Remove file"
                    onClick={() => {
                      uploadControllers.current.get(f.key)?.abort();
                      setFiles((prev) => prev.filter((pf) => pf.key !== f.key));
                    }}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="t-meta shrink-0 text-fg-muted">
                    {formatSize(f.file.size)}
                    {f.pageCount != null &&
                      ` · ${f.pageCount} ${f.pageCount === 1 ? 'page' : 'pages'}`}
                    {` · ${f.kind.toUpperCase()}`}
                  </span>
                  <div className="flex flex-1 items-center justify-end gap-2">
                    <div className="min-w-0">
                      {creatingKey === f.key ? (
                        <div className="flex items-center gap-0">
                          <Input
                            autoFocus
                            variant="underline"
                            size="sm"
                            value={newChapterName}
                            placeholder="New chapter name"
                            onChange={(e) => setNewChapterName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') void confirmCreateChapter(f.key);
                              if (e.key === 'Escape') setCreatingKey(null);
                            }}
                          />
                          <IconButton
                            icon="check"
                            size="xs"
                            variant="ghost-hover"
                            label="Create chapter"
                            className="p-1.5"
                            disabled={!newChapterName.trim()}
                            onClick={() => void confirmCreateChapter(f.key)}
                          />
                          <IconButton
                            icon="x"
                            size="xs"
                            variant="ghost-hover"
                            className="p-1.5"
                            label="Cancel"
                            onClick={() => setCreatingKey(null)}
                          />
                        </div>
                      ) : (
                        <ChapterSelect
                          chapters={chapters ?? []}
                          value={f.chapterId}
                          chapterName={f.chapterName}
                          onChange={(v) => patchFile(f.key, { chapterId: v, chapterName: null })}
                          onCreateRequest={() => {
                            setCreatingKey(f.key);
                            setNewChapterName('');
                          }}
                        />
                      )}
                    </div>
                    <div className="min-w-0">
                      {uploadPolicy && (
                        <ParseModeSelect
                          pending={f}
                          policy={uploadPolicy}
                          onChange={(mode) => patchFile(f.key, { parseMode: mode })}
                        />
                      )}
                    </div>
                  </div>
                </div>
                {f.uploadPct != null && (
                  <ProgressBar value={f.uploadPct} height={4} className="mt-1.5 w-full" />
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="t-meta pt-3 text-fg-muted">
        OCR parsing (default) supports English and Chinese documents only (up to{' '}
        {normalParse ? Math.round(normalParse.maxBytes / 1024 / 1024) : 10} MB /{' '}
        {normalParse?.maxPages ?? 20} pages). VLM parsing accepts files up to{' '}
        {advancedParse ? Math.round(advancedParse.maxBytes / 1024 / 1024) : 100} MB.
      </p>
      <ConfirmDialog
        open={confirmOpen}
        onClose={() => {
          if (!isSubmitting) setConfirmOpen(false);
        }}
        onConfirm={handleUpload}
        danger={false}
        closeOnConfirm={false}
        isSubmitting={isSubmitting}
        disabled={!uploadPolicy || files.length === 0 || isSubmitting}
        title={`Confirm Upload?`}
        body={`This will upload ${files.length} files, total size ${formatFileSizes()}.`}
      >
        {isSubmitting && (
          <div className="mt-3 flex flex-col gap-1.5">
            <ProgressBar value={aggregateProgress} showLabel />
            <p className="t-meta text-fg-muted">
              Uploading {completedUploads} of {files.length} files…
            </p>
          </div>
        )}
      </ConfirmDialog>
      <DialogFooter>
        <DialogClose asChild>
          <Button variant="ghost-hover" disabled={isSubmitting} onClick={onClose}>
            Cancel
          </Button>
        </DialogClose>
        <Button
          disabled={!uploadPolicy || files.length === 0 || isSubmitting}
          onClick={() => setConfirmOpen(true)}
        >
          <span>{m.action_upload()}</span>
        </Button>
      </DialogFooter>
    </div>
  );
}

function ImportFiles({
  workspaceId,
  onClose,
  className,
}: {
  workspaceId: string;
  onClose: () => void;
  className?: string;
}) {
  // const [chapterId, setChapterId] = useState<string | null>(null);
  const openMsImport = useDialogs((s) => s.openMsImport);
  const { data: integrations } = useIntegrations();
  const importSources = useImportSources(workspaceId);
  // const { data: msFiles } = useMicrosoftRecentFiles(msOpen && !!integrations?.microsoft);

  const connectProvider = useProviderConnect();

  async function connect(provider: 'google' | 'microsoft') {
    if (USE_MSW) {
      importSources.mutate({
        provider,
        fileIds: ['mock_drive_file'],
        chapterId: null,
      });
      onClose();
      return;
    }
    try {
      // Clerk links the external account, then redirects to the provider's
      // consent screen and back here.
      await connectProvider(provider);
    } catch (err) {
      userToast({
        title: `Could not connect ${provider}`,
        description: err instanceof Error ? err.message : `Something went wrong. Please try again.`,
        variant: 'error',
      });
    }
  }

  async function openGooglePicker() {
    if (USE_MSW) {
      importSources.mutate({ provider: 'google', fileIds: ['mock_drive_file'], chapterId: null });
      onClose();
      return;
    }
    const { accessToken } = await api.get<{ accessToken: string }>(
      '/integrations/google/picker-token'
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
            chapterId: null,
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
    openMsImport(workspaceId);
  }
  return (
    <div className={cn(className)}>
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
  );
}

function CreateFile({
  workspaceId,
  onClose,
  className,
}: {
  workspaceId: string;
  onClose: () => void;
  className?: string;
}) {
  const uploadSource = useUploadSource(workspaceId);
  const [chapterId, setChapterId] = useState<string | null>(null);

  return <div className={cn(className)}>dummy</div>;
}

export function AddSourceModal({
  open,
  onClose,
  workspaceId,
}: {
  open: boolean;
  onClose: () => void;
  workspaceId: string;
}) {
  // TODO: i18n
  const [mode, setMode] = useState('upload');
  return (
    <SimpleDialog className="max-w-3xl" open={open} onClose={onClose} title="Add file">
      <div className="flex flex-col gap-4">
        <Tabs
          tabs={[
            { value: 'upload', label: 'Upload' },
            { value: 'import', label: 'Import' },
            { value: 'create', label: 'Create' },
          ]}
          value={mode}
          onChange={setMode}
        />
        <div className="h-full flex-1 overflow-hidden">
          <UploadFiles
            className={cn({ hidden: mode !== 'upload' })}
            workspaceId={workspaceId}
            onClose={onClose}
          />
          <ImportFiles
            className={cn({ hidden: mode !== 'import' })}
            workspaceId={workspaceId}
            onClose={onClose}
          />
          <CreateFile
            className={cn({ hidden: mode !== 'create' })}
            workspaceId={workspaceId}
            onClose={onClose}
          />
        </div>
      </div>
    </SimpleDialog>
  );
}
