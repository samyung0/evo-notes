import { upsertLink, type UpsertLinkOptions } from '@platejs/link';

type LinkEditor = Parameters<typeof upsertLink>[0];
export type LinkSelection = NonNullable<LinkEditor['selection']>;

export function cloneLinkSelection(selection: LinkEditor['selection']): LinkSelection | null {
  if (!selection) return null;

  return {
    anchor: {
      path: [...selection.anchor.path],
      offset: selection.anchor.offset,
    },
    focus: {
      path: [...selection.focus.path],
      offset: selection.focus.offset,
    },
  };
}

export function upsertLinkAtSelection(
  editor: LinkEditor,
  selection: LinkSelection | null,
  options: UpsertLinkOptions
) {
  if (!selection) return false;

  editor.tf.select(selection);
  return Boolean(upsertLink(editor, options));
}
