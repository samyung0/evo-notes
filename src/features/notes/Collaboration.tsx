import { createContext, useContext, useState } from 'react';
import { BaseCommentPlugin, getCommentKey } from '@platejs/comment';
import { BaseSuggestionPlugin } from '@platejs/suggestion';
import {
  KEYS,
  NodeApi,
  TextApi,
  type TElement,
  type TInlineSuggestionData,
  type TSuggestionData,
  type TSuggestionText,
} from 'platejs';
import {
  PlateLeaf,
  type PlateElementProps,
  type PlateLeafProps,
  type RenderNodeWrapper,
  createPlatePlugin,
  toTPlatePlugin,
  useEditorRef,
} from 'platejs/react';
import { CornerDownLeft, MessageSquarePlus, MessagesSquare } from 'lucide-react';
import {
  useCreateMaterialComment,
  useCreateMaterialDiscussion,
  useCreateMaterialSuggestion,
  useMaterialSuggestions,
  useResolveMaterialDiscussion,
  useUpdateMaterialSuggestionStatus,
} from '@/api/hooks';
import type { MaterialDiscussion, MaterialSuggestion, WorkspaceMember } from '@/api/types';
import { Button, SimpleDialog, Textarea } from '@/components/ui';
import { cn } from '@/lib/cn';
import {
  createMaterialDocument,
  type MaterialDocument,
  type MaterialValue,
} from '@/features/materials/document';
import { useEditorRuntime } from './EditorRuntime';
import type { NoteEditorMode } from './editorMode';
import { finalizeSuggestionValue, materialValueText } from './suggestions';

export interface EditorCollaborationOptions {
  currentUserId: string | null;
  discussions: MaterialDiscussion[];
  users: Record<string, WorkspaceMember>;
  mode: NoteEditorMode;
}

export const discussionPlugin = createPlatePlugin({
  key: 'evo-discussions',
  options: {
    currentUserId: null as string | null,
    discussions: [] as MaterialDiscussion[],
    users: {} as Record<string, WorkspaceMember>,
  },
});

export const commentPlugin = toTPlatePlugin(BaseCommentPlugin, {
  options: {
    activeId: null as string | null,
    commentingBlock: null,
    hoverId: null as string | null,
  },
  render: { node: CommentLeaf },
  shortcuts: { setDraft: { keys: 'mod+shift+m' } },
});

export function buildCollaborationPlugins(options: EditorCollaborationOptions) {
  const currentUserId = options.currentUserId?.trim() || 'current-user';
  return [
    discussionPlugin.configure({ options: { ...options, currentUserId } }),
    commentPlugin,
    suggestionPlugin.configure({
      options: {
        // Suggestion normalization drops marks without an author. Interactive
        // modes are authenticated, but keep a stable fallback while /me data
        // is unavailable so the first keystroke is not discarded.
        currentUserId,
        isSuggesting: options.mode === 'suggestion',
      },
    }),
  ];
}

function CommentLeaf(props: PlateLeafProps) {
  return (
    <PlateLeaf
      {...props}
      className="rounded-sm bg-tint-accent-2 underline decoration-action-accent/50 decoration-2 underline-offset-2"
    >
      {props.children}
    </PlateLeaf>
  );
}

function getInlineSuggestionData(editor: any, element: TElement) {
  const api = editor.getApi(BaseSuggestionPlugin).suggestion;
  const direct = api.suggestionData(element) as TSuggestionData | TInlineSuggestionData | undefined;
  if (direct) return direct;
  if (typeof api.dataList !== 'function') return;
  for (const child of element.children) {
    if (!TextApi.isText(child)) continue;
    const data = api.dataList(child as TSuggestionText).at(-1);
    if (data) return data;
  }
}

function SuggestionLeaf(props: PlateLeafProps<TSuggestionText>) {
  const editor = useEditorRef();
  const dataList = editor.getApi(BaseSuggestionPlugin).suggestion.dataList(props.leaf);
  const hasRemove = dataList.some((data) => data.type === 'remove');
  return (
    <PlateLeaf
      {...props}
      as={hasRemove ? 'del' : 'ins'}
      className={cn(
        'rounded-sm bg-tint-accent-2 text-tint-accent-2-fg no-underline',
        hasRemove && 'bg-tint-error text-solid-error line-through decoration-solid-error'
      )}
    >
      {props.children}
    </PlateLeaf>
  );
}

const SuggestionLineBreak: RenderNodeWrapper = ({ api, element }) => {
  if (!(api as any).suggestion.isBlockSuggestion(element)) return;
  const data = (element as TElement & { suggestion: TSuggestionData }).suggestion;
  return ({ children }) => {
    const remove = data.type === 'remove';
    if (data.isLineBreak) {
      return (
        <>
          {children}
          <span
            contentEditable={false}
            className={cn(
              'inline-flex h-[calc(1lh+2px)] w-[1lh] items-center justify-center',
              remove ? 'text-solid-error' : 'text-tint-accent-2-fg'
            )}
          >
            <CornerDownLeft className="size-4" />
          </span>
        </>
      );
    }
    return (
      <div
        data-block-suggestion={data.type}
        className={cn(
          'rounded-sm bg-tint-accent-2 text-tint-accent-2-fg',
          remove && 'bg-tint-error text-solid-error line-through decoration-solid-error'
        )}
      >
        {children}
      </div>
    );
  };
};

function VoidRemoveSuggestionOverlay({ editor, element }: PlateElementProps) {
  const data = editor.getApi(BaseSuggestionPlugin).suggestion.suggestionData(element);
  if (!editor.api.isVoid(element) || editor.api.isInline(element) || data?.type !== 'remove') {
    return null;
  }
  return (
    <div
      contentEditable={false}
      data-slot="void-remove-suggestion"
      className="pointer-events-none absolute inset-0 z-20 rounded-[inherit] border border-solid-error bg-tint-error/55 after:absolute after:top-1/2 after:left-1/2 after:-translate-x-1/2 after:-translate-y-1/2 after:text-2xl after:font-semibold after:text-solid-error after:content-['×']"
    />
  );
}

// Everything structural (node/render/inject) must live in this extend config,
// NOT a chained `.configure()`: Plate keeps a single configuration slot per
// plugin, so a later `.configure({ options })` in buildCollaborationPlugins
// would silently replace an earlier `.configure({ render, ... })` — dropping
// the ins/del renderers. The same slot rule means currentUserId/isSuggesting
// must come from that one runtime configure, never from a lazy function here
// (a creation-time function would reset currentUserId to '', and the base
// plugin's normalizer deletes authorless suggestion marks on every keystroke).
export const suggestionPlugin = toTPlatePlugin(BaseSuggestionPlugin, {
  options: {
    activeId: null as string | null,
    hoverId: null as string | null,
  },
  inject: {
    isElement: true,
    nodeProps: {
      nodeKey: '',
      styleKey: 'cssText',
      transformProps: ({ editor, element, props }) => {
        if (!element) return props;
        const data = getInlineSuggestionData(editor, element);
        if (!data) return props;
        return {
          ...props,
          'data-inline-suggestion': data.type,
          className: cn(
            (props as { className?: string }).className,
            'rounded-sm bg-tint-accent-2 text-tint-accent-2-fg',
            data.type === 'remove' &&
              'bg-tint-error text-solid-error line-through decoration-solid-error'
          ),
        };
      },
      transformStyle: () => ({}) as CSSStyleDeclaration,
    },
    targetPlugins: [KEYS.inlineEquation, KEYS.link, KEYS.mention],
  },
  render: {
    belowNodes: SuggestionLineBreak,
    belowRootNodes: VoidRemoveSuggestionOverlay,
    node: SuggestionLeaf,
  },
});

interface CollaborationActions {
  openComment: () => void;
  openThreads: () => void;
  submitSuggestion: () => void;
  discardSuggestion: () => void;
  suggestionDirty: boolean;
  suggestionPending: boolean;
}

const CollaborationActionsContext = createContext<CollaborationActions | null>(null);

export function useCollaborationActions() {
  return useContext(CollaborationActionsContext);
}

function richComment(text: string): MaterialValue {
  return [{ type: 'p', children: [{ text }] }];
}

export async function reviewSuggestionAtomically({
  suggestion,
  accept,
  currentRevision,
  updateStatus,
}: {
  suggestion: MaterialSuggestion;
  accept: boolean;
  currentRevision: number;
  updateStatus: (variables: {
    suggestionId: string;
    status: 'accepted' | 'rejected';
    finalizedContent?: MaterialDocument;
    expectedBaseRevision?: number;
  }) => Promise<MaterialSuggestion>;
}): Promise<MaterialDocument | null> {
  if (accept) {
    if (suggestion.baseRevision !== currentRevision) {
      throw new Error('This suggestion is based on a stale material revision.');
    }
    if (!suggestion.proposedFragment) throw new Error('Suggestion has no proposed content');
    const finalizedContent = createMaterialDocument(
      finalizeSuggestionValue(suggestion.proposedFragment, 'accept')
    );
    await updateStatus({
      suggestionId: suggestion.id,
      status: 'accepted',
      finalizedContent,
      expectedBaseRevision: suggestion.baseRevision,
    });
    return finalizedContent;
  }
  await updateStatus({
    suggestionId: suggestion.id,
    status: 'rejected',
  });
  return null;
}

export function CollaborationProvider({
  children,
  baseDocument,
  baseRevision,
  currentDocument,
  currentRevision,
  discussions,
  suggestionDirty,
  onSuggestionReset,
  onBaseDocumentChange,
  replaceEditorDocument,
}: {
  children: React.ReactNode;
  baseDocument: MaterialDocument;
  baseRevision: number;
  currentDocument: MaterialDocument;
  currentRevision: number;
  discussions: MaterialDiscussion[];
  suggestionDirty: boolean;
  onSuggestionReset: () => void;
  onBaseDocumentChange: (document: MaterialDocument, revision: number) => void;
  replaceEditorDocument: (value: MaterialValue) => void;
}) {
  const editor = useEditorRef();
  const { materialId, mode: editorMode, canEdit, canComment } = useEditorRuntime();
  const { data: suggestions = [] } = useMaterialSuggestions(materialId);
  const createDiscussion = useCreateMaterialDiscussion(materialId);
  const addComment = useCreateMaterialComment(materialId);
  const resolveDiscussion = useResolveMaterialDiscussion(materialId);
  const createSuggestion = useCreateMaterialSuggestion(materialId);
  const updateSuggestion = useUpdateMaterialSuggestionStatus(materialId);
  const [mode, setMode] = useState<'new' | 'threads' | null>(null);
  const [comment, setComment] = useState('');
  const [replyByDiscussion, setReplyByDiscussion] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  function resetSuggestionDraft() {
    const resetDocument = currentRevision === baseRevision ? baseDocument : currentDocument;
    replaceEditorDocument(resetDocument.value);
    if (currentRevision !== baseRevision) {
      onBaseDocumentChange(currentDocument, currentRevision);
    }
    onSuggestionReset();
  }

  async function submitSuggestion() {
    if (editorMode !== 'suggestion' || (!canEdit && !canComment) || !suggestionDirty) {
      return;
    }
    setError(null);
    if (baseRevision !== currentRevision) {
      setError('This material changed since the suggestion draft began. Discard and try again.');
      return;
    }
    try {
      await createSuggestion.mutateAsync({
        baseRevision,
        anchor: { selection: editor.selection ?? null, scope: 'document' },
        originalFragment: structuredClone(baseDocument.value),
        proposedFragment: structuredClone(editor.children as MaterialValue),
      });
      resetSuggestionDraft();
      setMode('threads');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to submit suggestion');
    }
  }

  async function reviewSuggestion(suggestion: MaterialSuggestion, accept: boolean) {
    setError(null);
    try {
      const saved = await reviewSuggestionAtomically({
        suggestion,
        accept,
        currentRevision,
        updateStatus: updateSuggestion.mutateAsync,
      });
      if (saved) {
        replaceEditorDocument(saved.value);
        onBaseDocumentChange(saved, currentRevision + 1);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to review suggestion');
    }
  }

  const actions: CollaborationActions = {
    openComment: () => {
      if (!canComment) return;
      setComment('');
      setError(null);
      setMode('new');
    },
    openThreads: () => setMode('threads'),
    submitSuggestion: () => void submitSuggestion(),
    discardSuggestion: () => resetSuggestionDraft(),
    suggestionDirty,
    suggestionPending: createSuggestion.isPending,
  };

  async function submitNewComment() {
    const text = comment.trim();
    if (!text || !editor.selection) return;
    const savedSelection = { ...editor.selection };
    let documentContent = '';
    let blockId: string | undefined;
    try {
      const fragment = editor.api.fragment(editor.selection);
      documentContent = fragment.map((node) => NodeApi.string(node)).join('\n');
      blockId = editor.api.block()?.[0]?.id as string | undefined;
      const discussion = await createDiscussion.mutateAsync({
        blockId,
        documentContent,
        anchor: savedSelection,
        contentRich: richComment(text),
      });
      editor.tf.setNodes(
        {
          [KEYS.comment]: true,
          [getCommentKey(discussion.id)]: true,
        },
        { at: savedSelection, match: TextApi.isText, split: true }
      );
      setMode(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to add comment');
    }
  }

  async function submitReply(discussionId: string) {
    const text = replyByDiscussion[discussionId]?.trim();
    if (!text) return;
    await addComment.mutateAsync({ discussionId, contentRich: richComment(text) });
    setReplyByDiscussion((current) => ({ ...current, [discussionId]: '' }));
  }

  return (
    <CollaborationActionsContext.Provider value={actions}>
      {children}
      <SimpleDialog
        open={mode === 'new'}
        onClose={() => setMode(null)}
        title="Add comment"
        footer={
          <>
            <Button variant="ghost-hover" onClick={() => setMode(null)}>
              Cancel
            </Button>
            <Button
              variant="accent"
              disabled={!comment.trim() || createDiscussion.isPending}
              onClick={() => void submitNewComment()}
            >
              Add comment
            </Button>
          </>
        }
      >
        <label className="flex flex-col gap-2">
          <span className="t-label text-fg-muted">Comment</span>
          <Textarea
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            placeholder="Share feedback on the selection"
            rows={4}
          />
        </label>
        {error && <p className="mt-2 text-sm text-solid-error">{error}</p>}
      </SimpleDialog>
      <SimpleDialog
        open={mode === 'threads'}
        onClose={() => setMode(null)}
        title={`Collaboration (${discussions.filter((thread) => !thread.isResolved).length + suggestions.filter((item) => item.status === 'pending').length})`}
        width={680}
      >
        <div className="flex max-h-[65vh] flex-col gap-3 overflow-auto pr-1">
          {suggestions.map((suggestion) => (
            <SuggestionCard
              key={suggestion.id}
              suggestion={suggestion}
              canReview={canEdit}
              pending={updateSuggestion.isPending}
              onAccept={() => void reviewSuggestion(suggestion, true)}
              onReject={() => void reviewSuggestion(suggestion, false)}
            />
          ))}
          {!discussions.length && !suggestions.length && (
            <div className="rounded-card border border-dashed border-line p-6 text-center text-sm text-fg-muted">
              No discussions yet.
            </div>
          )}
          {discussions.map((thread) => (
            <DiscussionThread
              key={thread.id}
              discussion={thread}
              reply={replyByDiscussion[thread.id] ?? ''}
              onReplyChange={(value) =>
                setReplyByDiscussion((current) => ({ ...current, [thread.id]: value }))
              }
              onReply={() => void submitReply(thread.id)}
              onResolve={() =>
                resolveDiscussion.mutate({
                  discussionId: thread.id,
                  isResolved: !thread.isResolved,
                })
              }
              canComment={canComment}
            />
          ))}
          {error && <p className="text-sm text-solid-error">{error}</p>}
        </div>
      </SimpleDialog>
    </CollaborationActionsContext.Provider>
  );
}

function SuggestionCard({
  suggestion,
  canReview,
  pending,
  onAccept,
  onReject,
}: {
  suggestion: MaterialSuggestion;
  canReview: boolean;
  pending: boolean;
  onAccept: () => void;
  onReject: () => void;
}) {
  const preview = materialValueText(suggestion.proposedFragment);
  return (
    <section className="rounded-card border border-line p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-fg-muted">Suggestion from {suggestion.userId}</p>
        <span className="rounded-full bg-surface-hover-bg px-2 py-0.5 text-xs text-fg-muted">
          {suggestion.status}
        </span>
      </div>
      <p className="mt-2 line-clamp-4 text-sm whitespace-pre-wrap text-fg">
        {preview || 'Document edit'}
      </p>
      {canReview && suggestion.status === 'pending' && (
        <div className="mt-3 flex gap-2">
          <Button variant="accent" size="sm" disabled={pending} onClick={onAccept}>
            Accept
          </Button>
          <Button variant="outline" size="sm" disabled={pending} onClick={onReject}>
            Reject
          </Button>
        </div>
      )}
    </section>
  );
}

function DiscussionThread({
  discussion,
  reply,
  onReply,
  onReplyChange,
  onResolve,
  canComment,
}: {
  discussion: MaterialDiscussion;
  reply: string;
  onReply: () => void;
  onReplyChange: (value: string) => void;
  onResolve: () => void;
  canComment: boolean;
}) {
  return (
    <section
      className={cn('rounded-card border border-line p-3', discussion.isResolved && 'opacity-65')}
    >
      {discussion.documentContent && (
        <blockquote className="mb-3 border-l-2 border-line-strong pl-3 text-sm text-fg-muted">
          {discussion.documentContent}
        </blockquote>
      )}
      <div className="flex flex-col gap-2">
        {discussion.comments.map((entry) => (
          <div key={entry.id} className="rounded-row bg-surface-hover-bg px-3 py-2">
            <p className="text-xs font-medium text-fg-muted">{entry.userId}</p>
            <p className="text-sm text-fg">
              {entry.contentRich.map((node) => NodeApi.string(node)).join('\n')}
            </p>
          </div>
        ))}
      </div>
      {canComment && (
        <div className="mt-3 flex gap-2">
          <Textarea
            value={reply}
            onChange={(event) => onReplyChange(event.target.value)}
            placeholder="Reply"
            rows={2}
            className="min-h-16 flex-1"
          />
          <Button variant="outline" size="sm" disabled={!reply.trim()} onClick={onReply}>
            Reply
          </Button>
        </div>
      )}
      {canComment && (
        <Button variant="ghost" size="sm" className="mt-2" onClick={onResolve}>
          {discussion.isResolved ? 'Reopen' : 'Resolve'}
        </Button>
      )}
    </section>
  );
}

export function CommentToolbarActions() {
  const actions = useCollaborationActions();
  const { canComment, mode } = useEditorRuntime();
  if (!actions) return null;
  return (
    <>
      {canComment && (
        <Button variant="ghost" size="sm" onClick={actions.openComment}>
          <MessageSquarePlus className="size-4" />
          Comment
        </Button>
      )}
      <Button variant="ghost" size="sm" onClick={actions.openThreads}>
        <MessagesSquare className="size-4" />
        Threads
      </Button>
      {mode === 'suggestion' && (
        <>
          <Button
            variant="accent"
            size="sm"
            disabled={!actions.suggestionDirty || actions.suggestionPending}
            onClick={actions.submitSuggestion}
          >
            Submit suggestion
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={!actions.suggestionDirty || actions.suggestionPending}
            onClick={actions.discardSuggestion}
          >
            Discard
          </Button>
        </>
      )}
    </>
  );
}
