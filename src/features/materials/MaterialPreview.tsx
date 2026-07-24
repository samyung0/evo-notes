import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { MarkdownPlugin } from '@platejs/markdown';
import { createSlateEditor, createSlatePlugin } from 'platejs';
import { PlateStatic } from 'platejs/static';
import type { MaterialSuggestion } from '@/api/types';
import { cn } from '@/lib/cn';
import { SubmittedSuggestionChanges } from '@/features/notes/SubmittedSuggestionChanges';
import {
  suggestionAnchorBlockId,
  suggestionAnchorTopLevelIndex,
} from '@/features/notes/suggestions';
import { StaticMaterialKit } from './staticPlugins';
import { staticNoteComponents } from './staticNodeComponents';
import {
  createMaterialDocument,
  parseMaterialDocument,
  type MaterialDocument,
  type MaterialValue,
} from './document';

const StaticSuggestionContext = createContext<Map<string, MaterialSuggestion[]>>(new Map());

function StaticSuggestionAnnotation({
  blockId,
  children,
}: {
  blockId: string;
  children: ReactNode;
}) {
  const suggestions = useContext(StaticSuggestionContext).get(blockId) ?? [];
  if (suggestions.length === 0) return <>{children}</>;

  return (
    <>
      {children}
      <SubmittedSuggestionChanges suggestions={suggestions} className="mx-6" />
    </>
  );
}

const StaticSuggestionAnnotationPlugin = createSlatePlugin({
  key: 'static-submitted-suggestions',
  render: {
    aboveNodes: ({ element }) => {
      const blockId = typeof element.id === 'string' ? element.id : null;
      if (!blockId) return;
      return ({ children }) => (
        <StaticSuggestionAnnotation blockId={blockId}>{children}</StaticSuggestionAnnotation>
      );
    },
  },
});

/**
 * Universal read-only material renderer. Accepts a versioned material document
 * or raw Markdown (file previews) and renders it with a static, non-editable
 * Plate surface: base (non-React) plugins, hook-free components, no Plate
 * store. Visual parity with the editor comes from the shared nodeStyles.
 */
export function MaterialPreview({
  content,
  className,
  suggestions = [],
}: {
  content: string | MaterialDocument;
  className?: string;
  suggestions?: MaterialSuggestion[];
}) {
  const editor = useMemo(
    () =>
      createSlateEditor({
        plugins: [...StaticMaterialKit, StaticSuggestionAnnotationPlugin],
        components: staticNoteComponents,
      }),
    []
  );

  const value = useMemo<MaterialValue>(() => {
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
  const suggestionsByBlockId = useMemo(() => {
    const result = new Map<string, MaterialSuggestion[]>();
    for (const suggestion of suggestions) {
      const anchorIndex = suggestionAnchorTopLevelIndex(suggestion.anchor);
      // Older persisted materials may not contain IDs. Parsing assigns fresh
      // IDs, so map the durable anchor path onto this preview's normalized
      // value before falling back to a stored blockId.
      const previewId =
        anchorIndex === null || typeof value[anchorIndex]?.id !== 'string'
          ? suggestionAnchorBlockId(suggestion)
          : value[anchorIndex].id;
      if (!previewId) continue;
      result.set(previewId, [...(result.get(previewId) ?? []), suggestion]);
    }
    return result;
  }, [suggestions, value]);

  return (
    <StaticSuggestionContext.Provider value={suggestionsByBlockId}>
      <PlateStatic
        editor={editor}
        value={value}
        className={cn('note-editor p-6 text-[0.95rem] whitespace-break-spaces', className)}
      />
    </StaticSuggestionContext.Provider>
  );
}
