import { useMemo } from 'react';
import { MarkdownPlugin } from '@platejs/markdown';
import { createSlateEditor } from 'platejs';
import { PlateStatic } from 'platejs/static';
import { cn } from '@/lib/cn';
import { StaticMaterialKit } from './staticPlugins';
import { staticNoteComponents } from './staticNodeComponents';
import {
  createMaterialDocument,
  parseMaterialDocument,
  type MaterialDocument,
  type MaterialValue,
} from './document';

/**
 * Universal read-only material renderer. Accepts a versioned material document
 * or raw Markdown (file previews) and renders it with a static, non-editable
 * Plate surface: base (non-React) plugins, hook-free components, no Plate
 * store. Visual parity with the editor comes from the shared nodeStyles.
 */
export function MaterialPreview({
  content,
  className,
}: {
  content: string | MaterialDocument;
  className?: string;
}) {
  const editor = useMemo(
    () => createSlateEditor({ plugins: StaticMaterialKit, components: staticNoteComponents }),
    []
  );

  const value = useMemo(() => {
    const document = parseMaterialDocument(content);
    if (document) return document.value;
    try {
      if (typeof content !== 'string') return content.value;
      const imported = editor.getApi(MarkdownPlugin).markdown.deserialize(content) as MaterialValue;
      return createMaterialDocument(imported).value;
    } catch (cause) {
      if (import.meta.env.DEV) {
        console.error('MaterialPreview: markdown deserialization failed', cause);
      }
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
