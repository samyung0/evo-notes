import { useRef, useState } from 'react';
import {
  SimpleDialog,
  Button,
  Icon,
  IconButton,
  Text,
  Tabs,
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
  DialogClose,
  DialogFooter,
  Spinner,
  Input,
} from '@/components/ui';
import { toast } from 'sonner';
import {
  useAddChapter,
  useChapters,
  useImportSources,
  useIntegrations,
  useMicrosoftRecentFiles,
  useUploadSource,
} from '@/api/hooks';
import { api } from '@/api/client';
import { USE_MSW } from '@/api/auth';
import { useProviderConnect } from '@/lib/useProviderConnect';
import type { Chapter, FileKind, PlanTier, SourceFile } from '@/api/types';
import { useDialogs } from '@/stores/dialogs';
import { InputTitle } from '@/components/ui/Input';
import { useForm } from 'react-hook-form';
import { m } from '@/i18n';

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
  jp2: 'image',
  webp: 'image',
  gif: 'image',
  bmp: 'image',
  svg: 'image',
  avif: 'image',
  xls: 'sheet',
  xlsx: 'sheet',
  csv: 'sheet',
  ppt: 'slides',
  pptx: 'slides',
  mp4: 'video',
  webm: 'video',
  mov: 'video',
  mkv: 'video',
  avi: 'video',
  m4v: 'video',
  mp3: 'audio',
  wav: 'audio',
  m4a: 'audio',
  ogg: 'audio',
  flac: 'audio',
  aac: 'audio',
};

/* ------------------------------------------------------------ parse modes */

type ParseMode = 'advanced' | 'normal' | 'none';

const ADVANCED_MAX_MB = 100;
const NORMAL_MAX_MB = 10;
const NORMAL_MAX_PAGES = 20;

// Advanced = Modal MinerU hybrid backend (pipeline _MODAL_SUFFIXES allowlist).
const ADVANCED_EXTS = new Set([
  'pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx',
  'png', 'jpg', 'jpeg', 'jp2', 'webp', 'gif', 'bmp',
]);
// Normal = free MinerU lightweight cloud API: PDF, images, docx/pptx/xlsx
// only, ≤ 10 MB and ≤ 20 pages (page count enforced by the API).
const NORMAL_EXTS = new Set([
  'pdf', 'png', 'jpg', 'jpeg', 'jp2', 'webp', 'gif', 'bmp', 'docx', 'pptx', 'xlsx',
]);
// Plain text is indexed directly by the worker — no parse step involved.
const TEXT_KINDS = new Set<FileKind>(['txt', 'md']);

function fileExt(name: string) {
  return name.includes('.') ? (name.split('.').pop()?.toLowerCase() ?? '') : '';
}

/** Per-mode disabled reason for a file, or null when the mode is usable.
 * pageCount is best-effort (PDFs only, null while counting / on failure);
 * MinerU enforces its 20-page limit server-side regardless. */
function parseModeIssues(
  file: File,
  pageCount?: number | null
): { advanced: string | null; normal: string | null } {
  const ext = fileExt(file.name);
  return {
    advanced: !ADVANCED_EXTS.has(ext)
      ? 'format not supported'
      : file.size > ADVANCED_MAX_MB * 1024 * 1024
        ? `over ${ADVANCED_MAX_MB} MB`
        : null,
    normal: !NORMAL_EXTS.has(ext)
      ? 'format not supported'
      : file.size > NORMAL_MAX_MB * 1024 * 1024
        ? `over ${NORMAL_MAX_MB} MB`
        : pageCount != null && pageCount > NORMAL_MAX_PAGES
          ? `over ${NORMAL_MAX_PAGES} pages`
          : null,
  };
}

function defaultParseMode(file: File, pageCount?: number | null): ParseMode {
  const issues = parseModeIssues(file, pageCount);
  if (!issues.advanced) return 'advanced';
  if (!issues.normal) return 'normal';
  return 'none';
}

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
  onChange,
  onCreateRequest,
}: {
  chapters: Chapter[];
  value: string | null;
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
      <SelectTrigger size="sm">
        <SelectValue placeholder="No chapter"></SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectItem value={NO_CHAPTER}>
            <span className="text-fg-muted">No chapter</span>
          </SelectItem>
          {chapters.map((o) => (
            <SelectItem key={o.id} value={o.id}>
              <span className="translate-y-px">{o.name}</span>
            </SelectItem>
          ))}
        </SelectGroup>
        {onCreateRequest && (
          <>
            <SelectSeparator />
            <SelectGroup>
              <SelectItem value={CREATE_CHAPTER}>
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
  parseMode: ParseMode;
  /** PDF page count via pdfjs; undefined = still counting, null = unknown. */
  pageCount?: number | null;
}

function ParseModeSelect({
  pending,
  onChange,
}: {
  pending: PendingFile;
  onChange: (mode: ParseMode) => void;
}) {
  if (TEXT_KINDS.has(pending.kind)) {
    return <Text variant="meta" tone="muted">Indexed as text</Text>;
  }
  const issues = parseModeIssues(pending.file, pending.pageCount);
  if (issues.advanced && issues.normal) {
    return <Text variant="meta" tone="muted">Parsing not supported</Text>;
  }
  return (
    <Select value={pending.parseMode} onValueChange={(v) => onChange(v as ParseMode)}>
      <SelectTrigger size="sm">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectItem value="advanced" disabled={!!issues.advanced}>
            Advanced parsing{issues.advanced ? ` (${issues.advanced})` : ''}
          </SelectItem>
          <SelectItem value="normal" disabled={!!issues.normal}>
            Normal parsing{issues.normal ? ` (${issues.normal})` : ''}
          </SelectItem>
          <SelectItem value="none">No parsing</SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}

function UploadFiles({ workspaceId, onClose }: { workspaceId: string; onClose?: () => void }) {
  const uploadSource = useUploadSource(workspaceId);
  const addChapter = useAddChapter(workspaceId);
  const { data: chapters } = useChapters(workspaceId);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [files, setFiles] = useState<PendingFile[]>([]);
  // Row currently typing a new chapter name (replaces its chapter select).
  const [creatingKey, setCreatingKey] = useState<string | null>(null);
  const [newChapterName, setNewChapterName] = useState('');

  function handleFiles(list: FileList | null) {
    if (!list?.length) return;
    const added = Array.from(list).map((f, i) => ({
      key: `${Date.now()}-${i}-${f.name}`,
      file: f,
      kind: KIND_BY_EXT[fileExt(f.name)] ?? ('txt' as const),
      chapterId: null,
      parseMode: defaultParseMode(f),
    }));
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
            if (f.parseMode !== 'none' && parseModeIssues(f.file, n)[f.parseMode]) {
              next.parseMode = defaultParseMode(f.file, n);
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

  async function confirmCreateChapter(key: string) {
    const name = newChapterName.trim();
    if (!name) return;
    try {
      // Reuse an existing chapter with the same name instead of duplicating.
      const existing = chapters?.find((c) => c.name.toLowerCase() === name.toLowerCase());
      const chapter = existing ?? (await addChapter.mutateAsync(name));
      patchFile(key, { chapterId: chapter.id });
      setCreatingKey(null);
      setNewChapterName('');
    } catch {
      toast.error('Could not create chapter');
    }
  }

  const handleUpload = async () => {
    if (isSubmitting || files.length === 0) return;
    setIsSubmitting(true);
    const results = await Promise.allSettled(
      files.map((f) =>
        uploadSource
          .mutateAsync({
            file: f.file,
            kind: f.kind,
            chapterId: f.chapterId,
            parseMode: f.parseMode,
          })
          .then(() => {
            setFiles((prev) => prev.filter((pf) => pf.key !== f.key));
          })
      )
    );
    setIsSubmitting(false);
    if (results.every((r) => r.status === 'fulfilled')) {
      onClose?.();
    } else {
      toast.error('Some files failed to upload');
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <button
        onClick={() => inputRef.current?.click()}
        className="flex flex-col items-center gap-2 rounded-card border-[1.5px] border-dashed border-line-strong px-6 py-8 text-fg-secondary transition-colors hover:bg-surface-hover-bg"
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
        onChange={(e) => handleFiles(e.target.files)}
      />

      {files.length > 0 && (
        <ul className="flex max-h-72 flex-col gap-2 overflow-y-auto pr-1">
          {files.map((f) => (
            <li key={f.key} className="flex flex-col gap-2 rounded-card border border-line p-3">
              <div className="flex items-center gap-2">
                <Icon name="files" size={16} className="shrink-0 text-fg-muted" />
                <span className="t-subtitle min-w-0 flex-1 truncate" title={f.file.name}>
                  {f.file.name}
                </span>
                <span className="t-meta shrink-0 text-fg-muted">
                  {formatSize(f.file.size)}
                  {f.pageCount != null && ` · ${f.pageCount} ${f.pageCount === 1 ? 'page' : 'pages'}`}
                </span>
                <IconButton
                  icon="x"
                  size="xs"
                  variant="ghost-hover"
                  label="Remove file"
                  onClick={() => setFiles((prev) => prev.filter((pf) => pf.key !== f.key))}
                />
              </div>
              <div className="flex items-center gap-2">
                <div className="min-w-0 flex-1">
                  {creatingKey === f.key ? (
                    <div className="flex items-center gap-1">
                      <Input
                        autoFocus
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
                        disabled={!newChapterName.trim() || addChapter.isPending}
                        onClick={() => void confirmCreateChapter(f.key)}
                      />
                      <IconButton
                        icon="x"
                        size="xs"
                        variant="ghost-hover"
                        label="Cancel"
                        onClick={() => setCreatingKey(null)}
                      />
                    </div>
                  ) : (
                    <ChapterSelect
                      chapters={chapters ?? []}
                      value={f.chapterId}
                      onChange={(v) => patchFile(f.key, { chapterId: v })}
                      onCreateRequest={() => {
                        setCreatingKey(f.key);
                        setNewChapterName('');
                      }}
                    />
                  )}
                </div>
                <div className="flex min-w-0 flex-1 justify-end">
                  <ParseModeSelect
                    pending={f}
                    onChange={(mode) => patchFile(f.key, { parseMode: mode })}
                  />
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Text variant="meta" tone="muted">
        Normal parsing supports English and Chinese documents only (up to {NORMAL_MAX_MB} MB / 20
        pages). Advanced parsing accepts files up to {ADVANCED_MAX_MB} MB.
      </Text>
      <DialogFooter>
        <DialogClose asChild>
          <Button variant="ghost-hover" onClick={onClose}>
            Cancel
          </Button>
        </DialogClose>
        <Button disabled={files.length === 0 || isSubmitting} onClick={handleUpload}>
          {!isSubmitting && <span>{m.action_confirm()}</span>}
          {isSubmitting && (
            <span>
              <Spinner />
            </span>
          )}
        </Button>
      </DialogFooter>
    </div>
  );
}

function ImportFiles({ workspaceId, onClose }: { workspaceId: string; onClose: () => void }) {
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
      toast.error(err instanceof Error ? err.message : `Could not connect ${provider}`);
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
    <div>
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

function CreateFile({ workspaceId, onClose }: { workspaceId: string; onClose: () => void }) {
  const uploadSource = useUploadSource(workspaceId);
  const [chapterId, setChapterId] = useState<string | null>(null);

  return <div>dummy</div>;
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
    <SimpleDialog open={open} onClose={onClose} title="Add file">
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
          {mode === 'upload' && <UploadFiles workspaceId={workspaceId} onClose={onClose} />}
          {mode === 'import' && <ImportFiles workspaceId={workspaceId} onClose={onClose} />}
          {mode === 'create' && <CreateFile workspaceId={workspaceId} onClose={onClose} />}
        </div>
      </div>
    </SimpleDialog>
  );
}
