import { useRef, useState } from 'react';
import { Modal, Button, Icon, Text } from '@/components/ui';
import type { Chapter, FileKind } from '@/api/types';

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

export function AddSourceModal({
  open,
  onClose,
  chapters,
  onAdd,
}: {
  open: boolean;
  onClose: () => void;
  chapters: Chapter[];
  onAdd: (files: { name: string; kind: FileKind; chapterId: string | null }[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [chapterId, setChapterId] = useState<string | null>(null);

  function handleFiles(list: FileList | null) {
    if (!list?.length) return;
    const files = Array.from(list).map((f) => {
      const ext = f.name.split('.').pop()?.toLowerCase() ?? '';
      return { name: f.name, kind: KIND_BY_EXT[ext] ?? 'txt', chapterId };
    });
    onAdd(files);
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Add source" width={520}>
      <div className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <Text variant="label" tone="muted">
            Add to chapter
          </Text>
          <select
            value={chapterId ?? ''}
            onChange={(e) => setChapterId(e.target.value || null)}
            className="rounded-input border border-line bg-surface px-3 py-2.5 text-sm text-fg"
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
          className="hover:bg-surface-hover-bg flex flex-col items-center gap-2 rounded-card border-[1.5px] border-dashed border-line-strong px-6 py-8 text-fg-secondary transition-colors"
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
          <Button variant="outline" iconLeft="files" disabled>
            Google Drive
          </Button>
          <Button variant="outline" iconLeft="files" disabled>
            OneDrive
          </Button>
        </div>
        <Text variant="meta" tone="muted" className="text-center">
          Drive import connects once the backend OAuth is set up.
        </Text>
      </div>
    </Modal>
  );
}
