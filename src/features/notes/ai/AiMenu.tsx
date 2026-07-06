import { useRef, useState } from 'react';
import { NodeApi } from 'platejs';
import { useEditorRef } from 'platejs/react';
import {
  Button,
  Icon,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Spinner,
  Text,
} from '@/components/ui';
import { streamComplete } from '@/api/completeStream';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyEditor = any;

const MAX_CONTEXT = 6000;

function docText(editor: AnyEditor): string {
  try {
    return editor.children
      .map((n: unknown) => NodeApi.string(n as Parameters<typeof NodeApi.string>[0]))
      .join('\n')
      .slice(-MAX_CONTEXT);
  } catch {
    return '';
  }
}

function selectionText(editor: AnyEditor): string {
  try {
    if (!editor.selection || editor.api.isCollapsed()) return '';
    const frag = editor.api.fragment(editor.selection) as unknown[];
    return frag
      .map((n) => NodeApi.string(n as Parameters<typeof NodeApi.string>[0]))
      .join('\n');
  } catch {
    return '';
  }
}

/** Backend-powered AI menu for the note editor: run an instruction over the
 * document/selection, or continue writing from the cursor. Streams tokens and
 * inserts them inline; Esc/Stop aborts. */
export function AiMenu({ workspaceId }: { workspaceId: string }) {
  const editor = useEditorRef();
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const savedSel = useRef<unknown>(null);

  function stop() {
    abortRef.current?.abort();
    abortRef.current = null;
    setRunning(false);
  }

  async function run(mode: 'command' | 'continue') {
    if (running) return;
    setError(null);
    const selText = selectionText(editor);
    const context = mode === 'continue' ? docText(editor) : selText || docText(editor);
    if (mode === 'command' && !prompt.trim()) return;

    editor.tf.focus();
    if (savedSel.current) {
      try {
        editor.tf.select(savedSel.current as Parameters<typeof editor.tf.select>[0]);
      } catch {
        /* stale selection; insert at current caret */
      }
    }
    // Command over a selection replaces it.
    if (mode === 'command' && selText && !editor.api.isCollapsed()) {
      editor.tf.delete();
    }

    const controller = new AbortController();
    abortRef.current = controller;
    setRunning(true);

    await streamComplete(
      workspaceId,
      { mode, prompt: prompt.trim() || undefined, context },
      {
        onToken: (t) => {
          try {
            editor.tf.insertText(t);
          } catch {
            /* selection gone; ignore token */
          }
        },
        onDone: () => {
          setRunning(false);
          abortRef.current = null;
          setOpen(false);
          setPrompt('');
        },
        onError: (m) => {
          setError(m);
          setRunning(false);
          abortRef.current = null;
        },
      },
      controller.signal
    );
  }

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        if (o) savedSel.current = editor.selection;
        if (!o) stop();
        setOpen(o);
      }}
    >
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" title="AI">
          <Icon name="sparkles" size={15} /> AI
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 border border-line bg-surface shadow-pop">
        <Text variant="label" tone="muted">
          Ask AI
        </Text>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="e.g. Summarize this, or improve the writing…"
          rows={3}
          disabled={running}
          className="w-full resize-none rounded-input border border-line bg-transparent px-2 py-1.5 text-sm text-fg outline-none placeholder:text-placeholder"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) run('command');
          }}
        />
        {error && (
          <Text variant="meta" className="text-solid-error">
            {error}
          </Text>
        )}
        <div className="flex items-center justify-between gap-2">
          <Button variant="outline" size="sm" onClick={() => run('continue')} disabled={running}>
            Continue writing
          </Button>
          {running ? (
            <Button variant="ghost" size="sm" onClick={stop}>
              <Spinner /> Stop
            </Button>
          ) : (
            <Button size="sm" onClick={() => run('command')} disabled={!prompt.trim()}>
              Run
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
