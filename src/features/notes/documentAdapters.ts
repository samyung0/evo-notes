import { MarkdownPlugin } from '@platejs/markdown';
import type { SlatePlugin } from 'platejs';
import type { PlateEditor } from 'platejs/react';
import {
  createMaterialDocument,
  type MaterialDocument,
  type MaterialValue,
} from '@/features/materials/document';

type MarkdownEditor = PlateEditor & {
  getApi: (plugin: typeof MarkdownPlugin) => {
    markdown: {
      deserialize: (source: string) => MaterialValue;
      serialize: () => string;
    };
  };
};

/** Loaded only when the user imports/exports a .docx — keeps mammoth/jszip/xml
 * out of the initial editor chunk. */
function loadDocxIo() {
  return import('@platejs/docx-io');
}

export function importMarkdownDocument(editor: PlateEditor, source: string): MaterialDocument {
  const value = (editor as MarkdownEditor).getApi(MarkdownPlugin).markdown.deserialize(source);
  return createMaterialDocument(value);
}

export function exportMarkdownDocument(editor: PlateEditor): string {
  return (editor as MarkdownEditor).getApi(MarkdownPlugin).markdown.serialize();
}

export async function importDocxDocument(
  editor: PlateEditor,
  buffer: ArrayBuffer
): Promise<MaterialDocument> {
  const { importDocx } = await loadDocxIo();
  const result = await importDocx(editor, buffer);
  return createMaterialDocument(result.nodes as MaterialValue);
}

export async function exportDocxDocument(
  editor: PlateEditor,
  plugins: SlatePlugin[]
): Promise<Blob> {
  const { exportToDocx } = await loadDocxIo();
  return exportToDocx(editor.children, { editorPlugins: plugins });
}

export function downloadEditorFile(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function downloadEditorText(text: string, filename: string, type: string) {
  downloadEditorFile(new Blob([text], { type }), filename);
}
