import { Icon, SimpleDialog } from '@/components/ui';
import { cn } from '@/lib/cn';
import type { Chapter } from '@/api/types';

/** Chapter picker for moving a file or material into a chapter (membership).
 * Selecting a row calls onSelect and closes; "No chapter" unfiles (null). */
export function MoveToChapterDialog({
  open,
  onClose,
  chapters,
  currentChapterId,
  onSelect,
  title = 'Move to chapter',
}: {
  open: boolean;
  onClose: () => void;
  chapters: Chapter[];
  currentChapterId: string | null;
  onSelect: (chapterId: string | null) => void;
  title?: string;
}) {
  function choose(id: string | null) {
    onSelect(id);
    onClose();
  }
  const rowCls = (active: boolean) =>
    cn(
      'flex w-full items-center gap-2 rounded-row px-2.5 py-2 text-left text-sm transition-colors',
      active ? 'bg-action-accent text-action-accent-fg' : 'text-fg-secondary hover:bg-surface-hover-bg'
    );
  return (
    <SimpleDialog open={open} onClose={onClose} title={title}>
      <div className="flex max-h-[60vh] flex-col gap-0.5 overflow-auto">
        <button type="button" className={rowCls(currentChapterId === null)} onClick={() => choose(null)}>
          <Icon name="chevronLeft" size={15} className="shrink-0" />
          <span className="flex-1 truncate">No chapter (unfiled)</span>
          {currentChapterId === null && <Icon name="check" size={15} className="shrink-0" />}
        </button>
        {chapters.map((c) => {
          const active = c.id === currentChapterId;
          return (
            <button key={c.id} type="button" className={rowCls(active)} onClick={() => choose(c.id)}>
              <Icon name="files" size={15} className="shrink-0" />
              <span className="flex-1 truncate">{c.name}</span>
              {active && <Icon name="check" size={15} className="shrink-0" />}
            </button>
          );
        })}
        {chapters.length === 0 && (
          <div className="px-2.5 py-3 text-sm text-fg-muted">
            No chapters yet. Create a chapter first.
          </div>
        )}
      </div>
    </SimpleDialog>
  );
}
