import { useMemo } from 'react';
import { createSlateEditor } from 'platejs';
import { MarkdownPlugin } from '@platejs/markdown';
import { BasicBlocksPlugin, BasicMarksPlugin, HeadingPlugin } from '@platejs/basic-nodes/react';
import { cn } from '@/lib/cn';
import { Mermaid } from './Mermaid';
import { QuizBlock } from './QuizBlock';
import { FlashcardsBlock } from './FlashcardsBlock';
import { parseQuizFenceBody, parseFlashcardsFenceBody } from './blocks';

/** A read-only markdown renderer. Uses PlateJS to deserialize markdown into a
 * node tree (the same pipeline the editor would use), then renders it as static
 * React. Mermaid code fences become live diagrams. */

// One shared, stateless editor used only for markdown -> node deserialization.
let sharedEditor: ReturnType<typeof createSlateEditor> | null = null;
function getEditor() {
  if (!sharedEditor) {
    sharedEditor = createSlateEditor({
      plugins: [HeadingPlugin, BasicBlocksPlugin, BasicMarksPlugin, MarkdownPlugin],
    });
  }
  return sharedEditor;
}

type Node = { text?: string; type?: string; children?: Node[]; [k: string]: unknown };

const HEADING_CLASS: Record<string, string> = {
  h1: 'mt-6 mb-3 text-2xl font-bold text-fg first:mt-0',
  h2: 'mt-5 mb-2.5 text-xl font-bold text-fg first:mt-0',
  h3: 'mt-4 mb-2 text-lg font-semibold text-fg first:mt-0',
  h4: 'mt-3 mb-2 text-base font-semibold text-fg first:mt-0',
  h5: 'mt-3 mb-1.5 text-sm font-semibold text-fg first:mt-0',
  h6: 'mt-3 mb-1.5 text-xs font-semibold tracking-wide text-fg-muted uppercase first:mt-0',
};

function renderLeaf(node: Node, key: number) {
  let el: React.ReactNode = node.text === '' ? '\u200b' : node.text;
  if (node.bold) el = <strong className="font-semibold">{el}</strong>;
  if (node.italic) el = <em className="italic">{el}</em>;
  if (node.underline) el = <u>{el}</u>;
  if (node.strikethrough) el = <s>{el}</s>;
  if (node.code)
    el = (
      <code className="rounded bg-surface-hover-bg px-1 py-0.5 font-mono text-[0.85em]">{el}</code>
    );
  return <span key={key}>{el}</span>;
}

function renderChildren(children: Node[] | undefined) {
  return (children ?? []).map((c, i) =>
    c.type ? <RenderNode key={i} node={c} /> : renderLeaf(c, i)
  );
}

function codeText(node: Node): string {
  return (node.children ?? [])
    .map((line) => (line.children ?? []).map((t) => t.text ?? '').join(''))
    .join('\n');
}

function RenderNode({ node }: { node: Node }) {
  const type = node.type;
  if (!type) return <>{renderLeaf(node, 0)}</>;

  if (type in HEADING_CLASS) {
    const Tag = type as keyof React.JSX.IntrinsicElements;
    return <Tag className={HEADING_CLASS[type]}>{renderChildren(node.children)}</Tag>;
  }

  switch (type) {
    case 'p':
      return <p className="my-2 leading-relaxed text-fg">{renderChildren(node.children)}</p>;
    case 'blockquote':
      return (
        <blockquote className="my-3 border-l-2 border-line-strong pl-4 text-fg-secondary italic">
          {renderChildren(node.children)}
        </blockquote>
      );
    case 'ul':
      return <ul className="my-2 ml-5 list-disc space-y-1">{renderChildren(node.children)}</ul>;
    case 'ol':
      return <ol className="my-2 ml-5 list-decimal space-y-1">{renderChildren(node.children)}</ol>;
    case 'li':
      return <li className="text-fg">{renderChildren(node.children)}</li>;
    case 'lic':
      return <>{renderChildren(node.children)}</>;
    case 'a':
      return (
        <a
          href={String(node.url ?? '#')}
          target="_blank"
          rel="noreferrer"
          className="text-action-accent underline underline-offset-2"
        >
          {renderChildren(node.children)}
        </a>
      );
    case 'hr':
      return <hr className="my-5 border-divider" />;
    case 'code_block': {
      const code = codeText(node);
      const lang = String(node.lang ?? '');
      if (lang === 'mermaid') return <Mermaid code={code} />;
      if (lang === 'quiz') {
        try {
          parseQuizFenceBody(code);
          return <QuizBlock body={code} />;
        } catch {
          /* fall through to raw pre */
        }
      }
      if (lang === 'flashcards') {
        try {
          parseFlashcardsFenceBody(code);
          return <FlashcardsBlock body={code} />;
        } catch {
          /* fall through to raw pre */
        }
      }
      return (
        <pre className="my-3 overflow-auto rounded-card border border-line bg-surface-hover-bg p-3 text-xs">
          <code className="font-mono text-fg">{code}</code>
        </pre>
      );
    }
    case 'code_line':
      return <>{renderChildren(node.children)}</>;
    default:
      return <div>{renderChildren(node.children)}</div>;
  }
}

export function PlateMarkdown({ content, className }: { content: string; className?: string }) {
  const value = useMemo(() => {
    const editor = getEditor();
    try {
      return editor.getApi(MarkdownPlugin).markdown.deserialize(content) as Node[];
    } catch {
      return [{ type: 'p', children: [{ text: content }] }] as Node[];
    }
  }, [content]);

  return (
    <div className={cn('text-[0.95rem]', className)}>
      {value.map((node, i) => (
        <RenderNode key={i} node={node} />
      ))}
    </div>
  );
}
