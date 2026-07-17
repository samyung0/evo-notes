import { useEffect, useMemo, useState } from 'react';
import { AIChatPlugin, AIPlugin } from '@platejs/ai/react';
import { useEditorRef, usePluginOption } from 'platejs/react';
import {
  Check,
  Feather,
  ListMinus,
  ListPlus,
  LoaderCircle,
  MessageSquareText,
  PenLine,
  RotateCcw,
  Sparkles,
  WandSparkles,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui';
import { cn } from '@/lib/cn';

interface AiAction {
  id: string;
  label: string;
  icon: typeof Sparkles;
  prompt: string;
  toolName: 'comment' | 'edit' | 'generate';
  mode?: 'chat' | 'insert';
}

const ACTIONS: AiAction[] = [
  {
    id: 'continue',
    label: 'Continue writing',
    icon: PenLine,
    prompt: 'Continue writing after the current block with one concise sentence.',
    toolName: 'generate',
    mode: 'insert',
  },
  {
    id: 'improve',
    label: 'Improve writing',
    icon: WandSparkles,
    prompt: 'Improve clarity and flow without changing the meaning or adding new information.',
    toolName: 'edit',
  },
  {
    id: 'grammar',
    label: 'Fix spelling and grammar',
    icon: Check,
    prompt: 'Fix spelling, grammar, and punctuation without changing the meaning or tone.',
    toolName: 'edit',
  },
  {
    id: 'shorter',
    label: 'Make shorter',
    icon: ListMinus,
    prompt: 'Reduce verbosity while preserving all essential information.',
    toolName: 'edit',
  },
  {
    id: 'longer',
    label: 'Make longer',
    icon: ListPlus,
    prompt: 'Elaborate on existing ideas without introducing unsupported information.',
    toolName: 'edit',
  },
  {
    id: 'simplify',
    label: 'Simplify language',
    icon: Feather,
    prompt: 'Use clearer, more direct language while preserving the meaning.',
    toolName: 'edit',
  },
  {
    id: 'comment',
    label: 'Add AI feedback',
    icon: MessageSquareText,
    prompt: 'Add a concise, constructive comment to the selected content.',
    toolName: 'comment',
    mode: 'insert',
  },
];

export function AiMenu() {
  const editor = useEditorRef();
  const open = usePluginOption(AIChatPlugin, 'open');
  const chat = usePluginOption(AIChatPlugin, 'chat');
  const mode = usePluginOption(AIChatPlugin, 'mode');
  const toolName = usePluginOption(AIChatPlugin, 'toolName');
  const streaming = usePluginOption(AIChatPlugin, 'streaming');
  const [input, setInput] = useState('');
  const [position, setPosition] = useState({ left: 24, top: 96 });
  const loading = chat.status === 'streaming' || chat.status === 'submitted' || streaming;

  useEffect(() => {
    if (!open) return;
    const selection = window.getSelection();
    const rect =
      selection && selection.rangeCount > 0
        ? selection.getRangeAt(0).getBoundingClientRect()
        : undefined;
    setPosition({
      left: Math.min(window.innerWidth - 360, Math.max(16, rect?.left ?? 24)),
      top: Math.min(window.innerHeight - 420, Math.max(72, (rect?.bottom ?? 80) + 8)),
    });
  }, [open]);

  const hasPreview = useMemo(
    () =>
      editor.getTransforms(AIPlugin).ai.hasPreview() ||
      (!loading && toolName === 'edit' && mode === 'chat' && chat.messages.length > 0),
    [chat.messages.length, editor, loading, mode, toolName]
  );

  if (!open) return null;

  const submit = (
    prompt: string,
    options: { toolName?: AiAction['toolName']; mode?: AiAction['mode'] } = {}
  ) => {
    if (!prompt.trim() || loading) return;
    void editor.getApi(AIChatPlugin).aiChat.submit('', {
      prompt,
      toolName: options.toolName ?? 'generate',
      mode: options.mode,
    });
    setInput('');
  };

  return (
    <div
      role="dialog"
      aria-label="AI commands"
      className="fixed z-50 w-[min(360px,calc(100vw-32px))] overflow-hidden rounded-card border border-line bg-surface shadow-pop"
      style={position}
      onMouseDown={(event) => event.stopPropagation()}
    >
      <div className="flex items-center border-b border-divider px-2">
        <Sparkles className="size-4 text-action-accent" />
        <input
          autoFocus
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Ask AI anything"
          disabled={loading}
          className="h-10 min-w-0 flex-1 bg-transparent px-2 text-sm text-fg outline-none placeholder:text-placeholder"
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              submit(input);
            }
            if (event.key === 'Escape') editor.getApi(AIChatPlugin).aiChat.hide();
          }}
        />
        <button
          type="button"
          aria-label="Close AI commands"
          className="rounded-row p-1 text-fg-muted hover:bg-surface-hover-bg"
          onClick={() => editor.getApi(AIChatPlugin).aiChat.hide()}
        >
          <X className="size-4" />
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-between gap-2 p-3 text-sm text-fg-muted">
          <span className="flex items-center gap-2">
            <LoaderCircle className="size-4 animate-spin" />
            {chat.status === 'submitted' ? 'Thinking…' : 'Writing…'}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.getApi(AIChatPlugin).aiChat.stop()}
          >
            Stop
          </Button>
        </div>
      ) : hasPreview ? (
        <div className="flex items-center justify-between gap-2 p-2">
          <span className="px-1 text-sm text-fg-muted">Review the AI preview</span>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                editor.getTransforms(AIPlugin).ai.undo();
                editor.getApi(AIChatPlugin).aiChat.hide();
              }}
            >
              Reject
            </Button>
            <Button
              variant="accent"
              size="sm"
              onClick={() => {
                editor.getTransforms(AIChatPlugin).aiChat.accept();
                editor.getTransforms(AIPlugin).ai.acceptPreview();
                editor.getApi(AIChatPlugin).aiChat.hide();
              }}
            >
              Accept
            </Button>
          </div>
        </div>
      ) : (
        <div className="max-h-72 overflow-auto p-1">
          {ACTIONS.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.id}
                type="button"
                className={cn(
                  'flex w-full items-center gap-2 rounded-row px-2 py-2 text-left text-sm text-fg',
                  'hover:bg-surface-hover-bg'
                )}
                onClick={() =>
                  submit(action.prompt, { toolName: action.toolName, mode: action.mode })
                }
              >
                <Icon className="size-4 text-fg-muted" />
                {action.label}
              </button>
            );
          })}
          {chat.messages.length > 0 && (
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-row px-2 py-2 text-left text-sm text-fg hover:bg-surface-hover-bg"
              onClick={() => void editor.getApi(AIChatPlugin).aiChat.reload()}
            >
              <RotateCcw className="size-4 text-fg-muted" />
              Try again
            </button>
          )}
        </div>
      )}
    </div>
  );
}
