import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Plate, PlateContent, usePlateEditor } from 'platejs/react';
import { EmptyState, Spinner } from '@/components/ui';
import { cn } from '@/lib/cn';
import { useMaterial, useUpdateMaterial } from '@/api/hooks';
import { NoteBlockDialogsProvider } from './blocks/dialogContext';
import { NoteToolbar } from './NoteToolbar';
import { AiMenu } from './ai/AiMenu';
import { VoiceButton } from './ai/VoiceButton';
import { buildPlugins } from './plugins';
import { noteComponents } from './nodeComponents';
import { enabledKey, useNoteEditorPrefs } from './noteEditorPrefs';

/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
type MdApi = { markdown: { deserialize: (s: string) => any[]; serialize: () => string } };
/** MarkdownPlugin augments editor.api at runtime but not in the base type. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mdApi = (editor: { api: unknown }): MdApi => editor.api as any;

/** Editable Plate note. Loads the note material, mounts a full Plate editor with
 * the user's enabled widgets, and autosaves title/content (markdown) with a
 * debounce. Remounts when the enabled widget set changes. */
export function NoteEditor({ materialId }: { materialId: string }) {
  const { data: material, isLoading } = useMaterial(materialId);
  const enabled = useNoteEditorPrefs((s) => s.enabled);
  const key = useMemo(() => enabledKey(enabled), [enabled]);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner />
      </div>
    );
  }
  if (!material) {
    return <EmptyState title="Note not found" body="This note may have been deleted." />;
  }

  return (
    <NoteEditorInner
      // Remount on note switch or widget-set change so the plugin list rebuilds.
      key={`${material.id}:${key}`}
      materialId={material.id}
      workspaceId={material.workspaceId}
      initialTitle={material.title}
      initialContent={material.content}
    />
  );
}

function NoteEditorInner({
  materialId,
  workspaceId,
  initialTitle,
  initialContent,
}: {
  materialId: string;
  workspaceId: string;
  initialTitle: string;
  initialContent: string;
}) {
  const enabled = useNoteEditorPrefs((s) => s.enabled);
  const update = useUpdateMaterial(workspaceId);
  const [title, setTitle] = useState(initialTitle);

  const editor = usePlateEditor({
    plugins: buildPlugins(enabled),
    components: noteComponents,
    value: (ed) => {
      try {
        // markdown api is added by MarkdownPlugin (untyped on the base editor).
        return mdApi(ed).markdown.deserialize(initialContent);
      } catch {
        return [{ type: 'p', children: [{ text: initialContent }] }];
      }
    },
  });

  // Debounced autosave. Keeps the newest title/content and flushes on unmount.
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<{ title?: string; content?: string }>({});

  const flush = useCallback(() => {
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
    const patch = pending.current;
    if (patch.title == null && patch.content == null) return;
    pending.current = {};
    update.mutate({ id: materialId, patch });
  }, [materialId, update]);

  const schedule = useCallback(
    (patch: { title?: string; content?: string }) => {
      pending.current = { ...pending.current, ...patch };
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(flush, 800);
    },
    [flush]
  );

  useEffect(() => () => flush(), [flush]);

  function onEditorChange() {
    try {
      const md = mdApi(editor).markdown.serialize();
      schedule({ content: md });
    } catch {
      /* serialize can throw mid-edit; skip this tick */
    }
  }

  function onTitleChange(next: string) {
    setTitle(next);
    schedule({ title: next.trim() || 'Untitled note' });
  }

  return (
    <NoteBlockDialogsProvider>
      <div className="flex h-full flex-col">
        <input
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="Untitled note"
          className="bg-transparent px-4 pt-4 pb-2 text-2xl font-bold text-fg outline-none placeholder:text-placeholder"
        />
        <Plate editor={editor} onChange={onEditorChange}>
          <NoteToolbar
            right={
              <>
                <VoiceButton />
                <AiMenu workspaceId={workspaceId} />
              </>
            }
          />
          <div className="min-h-0 flex-1 overflow-auto">
            <PlateContent
              className={cn(
                'note-editor mx-auto max-w-3xl px-4 py-4 text-[0.95rem] outline-none',
                'min-h-[300px]'
              )}
              placeholder="Start writing…"
            />
          </div>
        </Plate>
      </div>
    </NoteBlockDialogsProvider>
  );
}
