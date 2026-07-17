import { USE_MSW } from '@/api/auth';
import { api } from '@/api/client';
import {
  useAddChapter,
  useChapters,
  useImportSources,
  useIntegrations,
  useUploadSource,
} from '@/api/hooks';
import type { Chapter, FileKind, SourceFile } from '@/api/types';
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
  userToast,
} from '@/components/ui';
import { m } from '@/i18n';
import { cn } from '@/lib/cn';
import { useProviderConnect } from '@/lib/useProviderConnect';
import { useDialogs } from '@/stores/dialogs';
import { useRef, useState } from 'react';
import { toast } from 'sonner';

const KIND_BY_EXT: Record<string, FileKind> = {
  pdf: 'pdf',
  doc: 'doc',
  docx: 'doc',
  md: 'md',
  markdown: 'md',
  mdx: 'md',
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
  json: 'json',
  map: 'json',
};

const TEXT_EXT = [
  '3dml',
  'appcache',
  'asm',
  'c',
  'cc',
  'coffee',
  'conf',
  'cpp',
  'css',
  'csv',
  'curl',
  'cxx',
  'dcurl',
  'def',
  'dic',
  'dsc',
  'etx',
  'f',
  'f77',
  'f90',
  'flx',
  'fly',
  'for',
  'ged',
  'gv',
  'h',
  'hbs',
  'hh',
  'htm',
  'html',
  'htc',
  'ics',
  'ifb',
  'in',
  'ini',
  'jad',
  'jade',
  'java',
  'js',
  'jsx',
  'less',
  'list',
  'litcoffee',
  'log',
  'lua',
  'man',
  'manifest',
  'markdown',
  'mcurl',
  'md',
  'mdx',
  'me',
  'mjs',
  'mkd',
  'mml',
  'ms',
  'n3',
  'nfo',
  'opml',
  'org',
  'p',
  'pas',
  'pde',
  'roff',
  'rtf',
  'rtx',
  's',
  'sass',
  'scss',
  'scurl',
  'sgm',
  'sgml',
  'shex',
  'shtml',
  'slim',
  'slm',
  'spdx',
  'spot',
  'styl',
  'stylus',
  'sub',
  't',
  'text',
  'tr',
  'tsv',
  'ttl',
  'txt',
  'uri',
  'uris',
  'urls',
  'uu',
  'vcard',
  'vcf',
  'vcs',
  'vtt',
  'wgsl',
  'wml',
  'wmls',
  'xml',
  'yaml',
  'yml',
];

function getFileKind(name: string): FileKind {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  if (Object.prototype.hasOwnProperty.call(KIND_BY_EXT, ext)) return KIND_BY_EXT[ext];
  if (TEXT_EXT.includes(ext)) return 'txt';
  return 'unknown';
}

/* ------------------------------------------------------------ parse modes */

type ParseMode = 'advanced' | 'normal' | 'none';

const ADVANCED_MAX_MB = 100;
const NORMAL_MAX_MB = 10;
const NORMAL_MAX_PAGES = 20;

// Advanced = Modal MinerU hybrid backend (pipeline _MODAL_SUFFIXES allowlist).
const ADVANCED_EXTS = new Set([
  'pdf',
  'doc',
  'docx',
  'ppt',
  'pptx',
  'xls',
  'xlsx',
  'png',
  'jpg',
  'jpeg',
  'jp2',
  'webp',
  'gif',
  'bmp',
]);
// Normal = free MinerU lightweight cloud API: PDF, images, docx/pptx/xlsx
// only, ≤ 10 MB and ≤ 20 pages (page count enforced by the API).
const NORMAL_EXTS = new Set([
  'pdf',
  'png',
  'jpg',
  'jpeg',
  'jp2',
  'webp',
  'gif',
  'bmp',
  'docx',
  'pptx',
  'xlsx',
]);
// Plain text is indexed directly by the worker — no parse step involved.
const TEXT_KINDS = new Set<FileKind>(['txt', 'md', 'json']);

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
  if (!issues.normal) return 'normal';
  if (!issues.advanced) return 'advanced';
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
      <SelectTrigger size="sm" variant="underline" className="w-fit">
        <div className="w-fit max-w-36 min-w-28">
          <SelectValue></SelectValue>
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
  parseMode: ParseMode;
  /** PDF page count via pdfjs; undefined = still counting, null = unknown. */
  pageCount?: number | null;
  uploadPct?: number;
}

function ParseModeSelect({
  pending,
  onChange,
}: {
  pending: PendingFile;
  onChange: (mode: ParseMode) => void;
}) {
  if (pending.kind === 'unknown') return;
  if (TEXT_KINDS.has(pending.kind)) return;
  const issues = parseModeIssues(pending.file, pending.pageCount);
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

// TODO: two-pass upload: check storage size againts upload request on first pass and validate (make sure that the file format etc is valid for normal (ocr) or advanced (vlm) parsing)
// TODO: show file upload progress on confirm upload
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
  const addChapter = useAddChapter(workspaceId);
  const { data: chapters } = useChapters(workspaceId);
  const inputRef = useRef<HTMLInputElement>(null);
  const uploadControllers = useRef(new Map<string, AbortController>());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [files, setFiles] = useState<PendingFile[]>([]);
  // Row currently typing a new chapter name (replaces its chapter select).
  const [creatingKey, setCreatingKey] = useState<string | null>(null);
  const [newChapterName, setNewChapterName] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);

  function handleFiles(list: FileList | null) {
    if (!list?.length) return;
    const added = Array.from(list).map((f, i) => ({
      key: `${Date.now()}-${i}-${f.name}`,
      file: f,
      kind: getFileKind(f.name),
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

  // TODO: dont create the chapter in the dialog directly, send alongside the file to create in the backend
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
      userToast({
        title: `Some files failed to upload`,
        button: { label: 'Dismiss', onClick: () => {} },
      });
    }
  }

  const handleUpload = async () => {
    if (isSubmitting || files.length === 0) return;
    setIsSubmitting(true);
    const results = await Promise.allSettled(
      files.map((f) => {
        const controller = new AbortController();
        uploadControllers.current.set(f.key, controller);
        return uploadSource
          .mutateAsync({
            file: f.file,
            kind: f.kind,
            chapterId: f.chapterId,
            parseMode: f.parseMode,
            signal: controller.signal,
            onUploadProgress: (uploadPct) => patchFile(f.key, { uploadPct }),
          })
          .then(() => {
            setFiles((prev) => prev.filter((pf) => pf.key !== f.key));
          })
          .finally(() => uploadControllers.current.delete(f.key));
      })
    );
    setIsSubmitting(false);
    if (results.every((r) => r.status === 'fulfilled')) {
      onClose?.();
    } else {
      userToast({
        title: `Some files failed to upload`,
        button: { label: 'Dismiss', onClick: () => {} },
      });
    }
  };
  const formatFileSizes = () => {
    const totalBytes = files.reduce((acc, file) => acc + file.file.size, 0);
    if (totalBytes < 1024) return `${totalBytes} bytes`;
    if (totalBytes < 1024 * 1024) return `${(totalBytes / 1024).toFixed(1)} KB`;
    return `${(totalBytes / 1024 / 1024).toFixed(1)} MB`;
  };

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      <button
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
                            disabled={!newChapterName.trim() || addChapter.isPending}
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
                          onChange={(v) => patchFile(f.key, { chapterId: v })}
                          onCreateRequest={() => {
                            setCreatingKey(f.key);
                            setNewChapterName('');
                          }}
                        />
                      )}
                    </div>
                    <div className="min-w-0">
                      <ParseModeSelect
                        pending={f}
                        onChange={(mode) => patchFile(f.key, { parseMode: mode })}
                      />
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
        OCR parsing (default) supports English and Chinese documents only (up to {NORMAL_MAX_MB} MB
        / 20 pages). VLM parsing accepts files up to {ADVANCED_MAX_MB} MB.
      </p>
      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleUpload}
        danger={false}
        isSubmitting={isSubmitting}
        disabled={files.length === 0 || isSubmitting}
        title={`Confirm Upload?`}
        body={`This will upload ${files.length} files, total size ${formatFileSizes()}.`}
      />
      <DialogFooter>
        <DialogClose asChild>
          <Button variant="ghost-hover" onClick={onClose}>
            Cancel
          </Button>
        </DialogClose>
        <Button disabled={files.length === 0 || isSubmitting} onClick={() => setConfirmOpen(true)}>
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
        button: { label: 'Dismiss', onClick: () => {} },
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
