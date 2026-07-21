import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/* ============================================================
   Per-user note-editor widget preferences. Users choose which optional Plate
   widget groups are visible in command surfaces. All parser and renderer
   plugins remain registered so hiding a command can never hide document data.
   ============================================================ */

export type WidgetGroupId =
  | 'table'
  | 'callout'
  | 'columns'
  | 'math'
  | 'media'
  | 'toc'
  | 'fontStyles'
  | 'quiz'
  | 'flashcards'
  | 'mermaid';

export interface WidgetGroupMeta {
  id: WidgetGroupId;
  label: string;
  description: string;
}

/** Display metadata for the settings popover. Order here = order in the UI.
 * These are the *optional* widgets; core editing (paragraphs, headings, marks,
 * lists, links, code, images, markdown, history, AI) is always available. */
export const WIDGET_GROUPS: WidgetGroupMeta[] = [
  { id: 'table', label: 'Tables', description: 'Grid tables with header rows' },
  { id: 'callout', label: 'Callouts', description: 'Highlighted note boxes' },
  { id: 'columns', label: 'Columns', description: 'Multi-column layouts' },
  { id: 'math', label: 'Math', description: 'Inline and block equations (KaTeX)' },
  { id: 'media', label: 'Media', description: 'Image embeds' },
  { id: 'toc', label: 'Table of contents', description: 'Document outline block' },
  { id: 'fontStyles', label: 'Font styling', description: 'Color, size, alignment' },
  { id: 'quiz', label: 'Quiz blocks', description: 'Embedded quizzes' },
  { id: 'flashcards', label: 'Flashcard blocks', description: 'Embedded flashcards' },
  { id: 'mermaid', label: 'Diagrams', description: 'Mermaid diagrams' },
];

type EnabledMap = Record<WidgetGroupId, boolean>;

const ALL_ENABLED: EnabledMap = WIDGET_GROUPS.reduce((acc, g) => {
  acc[g.id] = true;
  return acc;
}, {} as EnabledMap);

interface NoteEditorPrefsState {
  enabled: EnabledMap;
  toggle: (id: WidgetGroupId) => void;
  setAll: (value: boolean) => void;
  setEnabled: (enabled: EnabledMap) => void;
}

export const useNoteEditorPrefs = create<NoteEditorPrefsState>()(
  persist(
    (set) => ({
      enabled: { ...ALL_ENABLED },
      toggle: (id) => set((s) => ({ enabled: { ...s.enabled, [id]: !s.enabled[id] } })),
      setAll: (value) =>
        set(() => ({
          enabled: WIDGET_GROUPS.reduce((acc, g) => {
            acc[g.id] = value;
            return acc;
          }, {} as EnabledMap),
        })),
      setEnabled: (enabled) => set({ enabled: { ...enabled } }),
    }),
    {
      name: 'evo-note-editor-prefs',
      // Merge persisted state with any newly-added groups (default on).
      merge: (persisted, current) => {
        const p = (persisted as Partial<NoteEditorPrefsState>) ?? {};
        return {
          ...current,
          ...p,
          enabled: { ...ALL_ENABLED, ...(p.enabled ?? {}) },
        };
      },
    }
  )
);

/** Stable preference summary used by diagnostics and tests. */
export function enabledKey(enabled: EnabledMap): string {
  return WIDGET_GROUPS.filter((g) => enabled[g.id])
    .map((g) => g.id)
    .join(',');
}
