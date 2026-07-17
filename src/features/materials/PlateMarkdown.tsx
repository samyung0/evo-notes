import { useMemo } from 'react';
import { MarkdownPlugin } from '@platejs/markdown';
import { usePlateEditor } from 'platejs/react';
import { PlateStatic } from 'platejs/static';
import { cn } from '@/lib/cn';
import { MaterialKit } from '@/features/notes/plugins';
import { noteComponents } from '@/features/notes/nodeComponents';
import { createMaterialDocument, parseMaterialDocument, type MaterialValue } from './document';

/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
type MarkdownApi = {
  markdown: { deserialize: (source: string) => MaterialValue };
};

/**
 * Universal read-only material renderer. JSON documents and Markdown imports
 * use the same plugin registry and components as the editable note surface.
 *
 * The legacy name remains because file previews still pass Markdown here.
 */
export function PlateMarkdown({
  content,
  className,
}: {
  content: string | import('./document').MaterialDocument;
  className?: string;
}) {
  const editor = usePlateEditor({
    plugins: MaterialKit,
    components: noteComponents,
  });

  const value = useMemo(() => {
    const document = parseMaterialDocument(content);
    if (document) return document.value;
    try {
      if (typeof content !== 'string') return content.value;
      const imported = editor.getApi(MarkdownPlugin).markdown.deserialize(content) as MaterialValue;
      return createMaterialDocument(imported).value;
    } catch {
      return [
        { type: 'p', children: [{ text: typeof content === 'string' ? content : '' }] },
      ] satisfies MaterialValue;
    }
  }, [content, editor]);

  return (
    <PlateStatic
      editor={editor}
      value={value}
      className={cn('note-editor p-6 text-[0.95rem] whitespace-break-spaces', className)}
    />
  );
}
