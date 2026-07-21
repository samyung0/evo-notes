import { useEffect, useMemo, useRef } from 'react';
import { useChat as useBaseChat } from '@ai-sdk/react';
import { BaseAIPlugin, withAIBatch } from '@platejs/ai';
import {
  AIChatPlugin,
  AIPlugin,
  CopilotPlugin,
  aiCommentToRange,
  applyAISuggestions,
  applyTableCellSuggestion,
  getInsertPreviewStart,
  streamInsertChunk,
  useChatChunk,
} from '@platejs/ai/react';
import { getCommentKey } from '@platejs/comment';
import { serializeMd, stripMarkdown } from '@platejs/markdown';
import { BlockSelectionPlugin } from '@platejs/selection/react';
import { ElementApi, KEYS, PathApi, TextApi, type TElement } from 'platejs';
import {
  PlateElement,
  PlateText,
  type PlateElementProps,
  type PlateTextProps,
  useEditorRef,
  useElement,
  usePluginOption,
} from 'platejs/react';
import { createPlateAiTransport, plateAiCopilotUrl, plateAiFetch } from '@/api/plateAiTransport';
import { useCreateMaterialDiscussion } from '@/api/hooks';
import { createMaterialDocument, type MaterialValue } from '@/features/materials/document';
import { useEditorRuntime } from '../EditorRuntime';

/* The AI SDK data parts emitted by the Go adapter. */
type PlateToolName = 'comment' | 'edit' | 'generate';
type PlateDataPart = {
  toolName: PlateToolName;
  table?: {
    status: 'finished' | 'streaming';
    cellUpdate: { id: string; content: string } | null;
  };
  comment?: {
    status: 'finished' | 'streaming';
    comment: { blockId: string; comment: string; content: string } | null;
  };
};

function usePlateChat(workspaceId: string) {
  const editor = useEditorRef();
  const { materialId } = useEditorRuntime();
  const createDiscussion = useCreateMaterialDiscussion(materialId);
  const transport = useMemo(() => createPlateAiTransport(workspaceId), [workspaceId]);
  const chat = useBaseChat<import('ai').UIMessage<Record<string, never>, PlateDataPart>>({
    id: `plate-${materialId}`,
    transport,
    onData(part) {
      if (part.type === 'data-toolName') {
        editor.setOption(AIChatPlugin, 'toolName', part.data as PlateToolName);
        return;
      }
      if (part.type === 'data-table' && part.data) {
        const data = part.data as PlateDataPart['table'];
        if (data?.status === 'streaming' && data.cellUpdate) {
          withAIBatch(editor, () => applyTableCellSuggestion(editor, data.cellUpdate!));
        }
        return;
      }
      if (part.type === 'data-comment' && part.data) {
        const data = part.data as PlateDataPart['comment'];
        if (!data?.comment || data.status !== 'streaming') return;
        const range = aiCommentToRange(editor, data.comment);
        if (!range) return;
        void createDiscussion
          .mutateAsync({
            blockId: data.comment.blockId,
            documentContent: data.comment.content,
            contentRich: [{ type: 'p', children: [{ text: data.comment.comment }] }],
          })
          .then((discussion) => {
            editor.tf.setNodes(
              {
                [KEYS.comment]: true,
                [getCommentKey(discussion.id)]: true,
              },
              { at: range, match: TextApi.isText, split: true }
            );
          });
      }
    },
  });
  // AI SDK v4 returns a new helpers object on every render. Plate stores plugin
  // options externally, so writing that changing reference causes a render loop.
  const stableChatRef = useRef({ ...chat });
  Object.assign(stableChatRef.current, chat);

  useEffect(() => {
    if (editor.getOption(AIChatPlugin, 'chat') !== stableChatRef.current) {
      editor.setOption(AIChatPlugin, 'chat', stableChatRef.current as never);
    }
  }, [editor]);

  return stableChatRef.current;
}

function createAiChatPlugin(workspaceId: string) {
  return AIChatPlugin.extend({
    options: {
      chatOptions: {
        api: `/api/workspaces/${encodeURIComponent(workspaceId)}/ai/command`,
        body: {},
      },
    },
    render: {
      afterContainer: AiLoadingBar,
      node: AiAnchorElement,
    },
    shortcuts: { show: { keys: 'mod+j' } },
    useHooks: ({ editor, getOption }) => {
      usePlateChat(workspaceId);
      const mode = usePluginOption(AIChatPlugin, 'mode');
      const toolName = usePluginOption(AIChatPlugin, 'toolName');
      useChatChunk({
        onChunk: ({ chunk, isFirst, nodes, text }) => {
          if (isFirst && mode === 'insert') {
            const { startBlock, startInEmptyParagraph } = getInsertPreviewStart(editor);
            editor.getTransforms(BaseAIPlugin).ai.beginPreview({
              originalBlocks:
                startInEmptyParagraph && startBlock && ElementApi.isElement(startBlock)
                  ? [structuredClone(startBlock)]
                  : [],
            });
            editor.tf.withoutSaving(() => {
              editor.tf.insertNodes(
                {
                  children: [{ text: '' }],
                  type: editor.getType(KEYS.aiChat),
                },
                { at: PathApi.next(editor.selection!.focus.path.slice(0, 1)) }
              );
            });
            editor.setOption(AIChatPlugin, 'streaming', true);
          }
          if (mode === 'insert' && nodes.length > 0) {
            editor.tf.withoutSaving(() => {
              if (!getOption('streaming')) return;
              editor.tf.withScrolling(() =>
                streamInsertChunk(editor, chunk, {
                  textProps: { [editor.getType(KEYS.ai)]: true },
                })
              );
            });
          }
          if (toolName === 'edit' && mode === 'chat') {
            withAIBatch(editor, () => applyAISuggestions(editor, text), { split: isFirst });
          }
        },
        onFinish: () => editor.getApi(AIChatPlugin).aiChat.stop(),
      });
    },
  });
}

const COPILOT_INSTRUCTIONS =
  'Continue naturally to the next punctuation mark. Preserve tone, do not repeat text, and do not start a new block. Return 0 when no useful continuation exists.';

function createCopilotPlugin(workspaceId: string) {
  return CopilotPlugin.configure(({ api }) => ({
    options: {
      completeOptions: {
        api: plateAiCopilotUrl(workspaceId),
        body: { instructions: COPILOT_INSTRUCTIONS },
        fetch: plateAiFetch,
        onFinish: (_, completion) => {
          if (completion && completion !== '0') {
            api.copilot.setBlockSuggestion({ text: stripMarkdown(completion) });
          }
        },
      },
      debounceDelay: 500,
      renderGhostText: GhostText,
      getPrompt: ({ editor }) => {
        const context = editor.api.block({ highest: true });
        if (!context) return '';
        return serializeMd(editor, { value: [context[0] as TElement] });
      },
    },
    shortcuts: {
      accept: { keys: 'tab' },
      acceptNextWord: { keys: 'mod+right' },
      reject: { keys: 'escape' },
      triggerSuggestion: { keys: 'ctrl+space' },
    },
  }));
}

export function buildAiPlugins(workspaceId: string) {
  return [
    createCopilotPlugin(workspaceId),
    AIPlugin.withComponent(AiLeaf),
    createAiChatPlugin(workspaceId),
  ];
}

function AiLoadingBar() {
  const streaming = usePluginOption(AIChatPlugin, 'streaming');
  if (!streaming) return null;
  return (
    <div
      role="progressbar"
      aria-label="AI is writing"
      className="h-0.5 w-full overflow-hidden bg-tint-accent-1"
    >
      <div className="h-full w-1/3 animate-pulse bg-action-accent" />
    </div>
  );
}

function AiLeaf(props: PlateTextProps) {
  return (
    <PlateText
      {...props}
      className="rounded-sm bg-tint-accent-1 text-tint-accent-1-fg underline decoration-action-accent/50"
    />
  );
}

function AiAnchorElement(props: PlateElementProps) {
  return (
    <PlateElement {...props}>
      <span className="h-px" />
      {props.children}
    </PlateElement>
  );
}

function GhostText() {
  const editor = useEditorRef();
  const element = useElement();
  const isSuggested = usePluginOption(CopilotPlugin, 'isSuggested', element.id as string);
  const suggestionText = usePluginOption(CopilotPlugin, 'suggestionText');
  if (!isSuggested || !suggestionText) return null;
  return (
    <span className="pointer-events-auto text-fg-muted/70 max-sm:hidden" contentEditable={false}>
      {suggestionText}
      {/* <span className="ml-2 inline-flex gap-1 align-middle text-[10px]">
        <button
          type="button"
          className="rounded-row border border-line bg-surface px-1.5 py-0.5 text-fg"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => editor.getTransforms(CopilotPlugin).copilot.accept()}
        >
          Accept
        </button>
        <button
          type="button"
          className="rounded-row border border-line bg-surface px-1.5 py-0.5 text-fg-muted"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => editor.getApi(CopilotPlugin).copilot.reject()}
        >
          Reject
        </button>
      </span> */}
    </span>
  );
}

/** Snapshot helper used by tests and command payload diagnostics. */
export function editorValueDocument(value: MaterialValue) {
  return createMaterialDocument(value);
}
