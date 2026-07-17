import { createContext, useContext, useMemo, useState } from 'react';
import { BaseCommentPlugin, getCommentKey } from '@platejs/comment';
import { BaseSuggestionPlugin } from '@platejs/suggestion';
import { KEYS, NodeApi, TextApi, type TSuggestionData } from 'platejs';
import {
  PlateLeaf,
  type PlateLeafProps,
  createPlatePlugin,
  toTPlatePlugin,
  useEditorRef,
} from 'platejs/react';
import { MessageSquarePlus, MessagesSquare } from 'lucide-react';
import {
  useCreateMaterialComment,
  useCreateMaterialDiscussion,
  useCreateMaterialSuggestion,
  useMaterialDiscussions,
  useMaterialSuggestions,
  useResolveMaterialDiscussion,
  useUpdateMaterial,
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
import { finalizeSuggestionValue, materialValueText } from './suggestions';

export interface EditorCollaborationOptions {
  currentUserId: string | null;
  discussions: MaterialDiscussion[];
  users: Record<string, WorkspaceMember>;
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
}).configure({
  node: { component: CommentLeaf },
  shortcuts: { setDraft: { keys: 'mod+shift+m' } },
});

export const suggestionPlugin = toTPlatePlugin(BaseSuggestionPlugin, ({ editor }) => ({
  options: {
    activeId: null as string | null,
    currentUserId: editor.getOption(discussionPlugin, 'currentUserId') ?? '',
    hoverId: null as string | null,
  },
})).configure({
  node: { component: SuggestionLeaf },
});

export function buildCollaborationPlugins(options: EditorCollaborationOptions) {
  return [
    discussionPlugin.configure({ options }),
    commentPlugin,
    suggestionPlugin.configure({
      options: { currentUserId: options.currentUserId ?? '' },
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

function SuggestionLeaf(props: PlateLeafProps) {
  const data = Object.entries(props.leaf)
    .filter(([key]) => key.startsWith('suggestion_'))
    .map(([, value]) => value)
    .find(Boolean) as TSuggestionData | undefined;
  return (
    <PlateLeaf
      {...props}
      className={cn(
        data?.type === 'remove' && 'bg-tint-error text-fg-muted line-through',
        data?.type === 'insert' && 'bg-tint-success underline decoration-solid-success'
      )}
    >
      {props.children}
    </PlateLeaf>
  );
}

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

export function CollaborationProvider({
  children,
  baseDocument,
  baseRevision,
  suggestionDirty,
  onSuggestionReset,
}: {
  children: React.ReactNode;
  baseDocument: MaterialDocument;
  baseRevision: number;
  suggestionDirty: boolean;
  onSuggestionReset: () => void;
}) {
  const editor = useEditorRef();
  const { materialId, workspaceId, role, canEdit, canComment } = useEditorRuntime();
  const { data: discussions = [] } = useMaterialDiscussions(materialId);
  const { data: suggestions = [] } = useMaterialSuggestions(materialId);
  const createDiscussion = useCreateMaterialDiscussion(materialId);
  const addComment = useCreateMaterialComment(materialId);
  const resolveDiscussion = useResolveMaterialDiscussion(materialId);
  const createSuggestion = useCreateMaterialSuggestion(materialId);
  const updateSuggestion = useUpdateMaterialSuggestionStatus(materialId);
  const updateMaterial = useUpdateMaterial(workspaceId);
  const [mode, setMode] = useState<'new' | 'threads' | null>(null);
  const [comment, setComment] = useState('');
  const [replyByDiscussion, setReplyByDiscussion] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  function resetSuggestionDraft(value = baseDocument.value) {
    editor.tf.setValue(structuredClone(value));
    onSuggestionReset();
  }

  async function submitSuggestion() {
    if (role !== 'commenter' || !suggestionDirty) return;
    setError(null);
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
      if (accept) {
        if (!suggestion.proposedFragment) throw new Error('Suggestion has no proposed content');
        const finalValue = finalizeSuggestionValue(suggestion.proposedFragment, 'accept');
        const saved = await updateMaterial.mutateAsync({
          id: materialId,
          patch: {
            content: createMaterialDocument(finalValue),
            expectedRevision: suggestion.baseRevision,
          },
        });
        editor.tf.setValue(structuredClone(saved.content.value));
      }
      await updateSuggestion.mutateAsync({
        suggestionId: suggestion.id,
        status: accept ? 'accepted' : 'rejected',
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to review suggestion');
    }
  }

  const actions = useMemo(
    () => ({
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
    }),
    // Editor transforms are stable for this provider's lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [canComment, createSuggestion.isPending, suggestionDirty]
  );

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
              pending={updateSuggestion.isPending || updateMaterial.isPending}
              onAccept={() => void reviewSuggestion(suggestion, true)}
              onReject={() => void reviewSuggestion(suggestion, false)}
            />
          ))}
          {!discussions.length && (
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
  const { canComment, role } = useEditorRuntime();
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
      {role === 'commenter' && (
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
