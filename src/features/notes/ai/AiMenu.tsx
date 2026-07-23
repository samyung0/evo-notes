import { useEffect, useMemo, useState } from 'react';
import { AIChatPlugin, AIPlugin } from '@platejs/ai/react';
import { BlockMenuPlugin, BlockSelectionPlugin } from '@platejs/selection/react';
import {
  FloatingPortal,
  flip,
  getRangeBoundingClientRect,
  offset,
  shift,
  useVirtualFloating,
} from '@platejs/floating';
import { useEditorRef, useEditorSelector, usePluginOption } from 'platejs/react';
import {
  Check,
  Feather,
  ListMinus,
  ListPlus,
  LoaderCircle,
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
];

export function AiMenu() {
  const editor = useEditorRef();
  const open = usePluginOption(AIChatPlugin, 'open');
  const chat = usePluginOption(AIChatPlugin, 'chat');
  const chatSelection = usePluginOption(AIChatPlugin, 'chatSelection');
  const mode = usePluginOption(AIChatPlugin, 'mode');
  const toolName = usePluginOption(AIChatPlugin, 'toolName');
  const streaming = usePluginOption(AIChatPlugin, 'streaming');
  const [input, setInput] = useState('');
  const loading = chat.status === 'streaming' || chat.status === 'submitted' || streaming;

  useEffect(() => {
    if (!open) return;

    editor.getApi(BlockMenuPlugin).blockMenu.hide();
    const close = () => editor.getApi(AIChatPlugin).aiChat.hide({ focus: false });
    window.addEventListener('pointerdown', close);
    window.addEventListener('blur', close);
    return () => {
      window.removeEventListener('pointerdown', close);
      window.removeEventListener('blur', close);
    };
  }, [editor, open]);

  const floating = useVirtualFloating({
    open,
    strategy: 'fixed',
    placement: 'bottom-start',
    middleware: [
      offset(4),
      flip({
        fallbackPlacements: ['top-start'],
        padding: 12,
      }),
      shift({ padding: 12 }),
    ],
    getBoundingClientRect: () => {
      const blocks = editor.getApi(BlockSelectionPlugin).blockSelection.getNodes();
      const range =
        blocks.length > 0
          ? (editor.api.nodesRange(blocks) ?? null)
          : (chatSelection ?? editor.selection ?? null);
      return getRangeBoundingClientRect(editor, range);
    },
  });

  useEditorSelector(() => {
    floating.update?.();
  }, [floating.update]);

  useEffect(() => {
    floating.update?.();
  }, [floating.update, open]);

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
    const savedSelection = editor.getOption(AIChatPlugin, 'chatSelection');
    const selectedBlocks = editor.getApi(BlockSelectionPlugin).blockSelection.getNodes();
    const contextSelection =
      selectedBlocks.length > 0
        ? (editor.api.nodesRange(selectedBlocks) ?? null)
        : (savedSelection ?? null);
    const toolName = options.toolName ?? 'generate';

    if (savedSelection && selectedBlocks.length === 0) {
      editor.tf.select(structuredClone(savedSelection));
    }
    void editor.getApi(AIChatPlugin).aiChat.submit('', {
      prompt,
      toolName,
      mode: options.mode,
      // Plate normally reads editor.selection here. The native input owns focus,
      // so pass the opening snapshot explicitly instead of relying on focus state.
      options: {
        body: {
          ctx: {
            children: editor.children,
            selection: contextSelection,
            toolName,
          },
        },
      },
    });
    setInput('');
  };

  return (
    <FloatingPortal>
      <div
        ref={floating.refs.setFloating}
        style={floating.style}
        role="dialog"
        aria-label="AI commands"
        className="z-50 w-[min(360px,calc(100vw-32px))] overflow-hidden rounded-row border border-line bg-surface shadow-pop"
        onPointerDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-center border-b border-divider px-2">
          <Sparkles className="size-4 text-action-accent" />
          <input
            autoFocus
            data-plate-focus="true"
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
    </FloatingPortal>
  );
}
