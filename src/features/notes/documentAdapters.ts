import { importDocx, exportToDocx } from '@platejs/docx-io';
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
  const result = await importDocx(editor, buffer);
  return createMaterialDocument(result.nodes as MaterialValue);
}

export function exportDocxDocument(editor: PlateEditor, plugins: SlatePlugin[]): Promise<Blob> {
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
