import { useEffect } from 'react';
import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { QueryClient } from '@tanstack/react-query';
import { API_BASE, api, qk } from './client';
import { USE_MSW } from './auth';
import type {
  CreateDeckReq,
  CreateEventReq,
  CreateQuizReq,
  CreateWorkspaceReq,
  MaterialUpdateResult,
  UpdateCardReq,
  UpdateChapterReq,
  UpdateQuizReq,
  UpdateWorkspaceReq,
  UpdateWorkspaceSharingReq,
} from './gen/model';
import type {
  Attempt,
  AttemptDetail,
  BillingInfo,
  CalendarEvent,
  Chapter,
  Conversation,
  WireMessage,
  Deck,
  FileStatus,
  Flashcard,
  GenerateOptions,
  IntegrationsStatus,
  Label,
  Material,
  MaterialRef,
  AppNotification,
  PlanTier,
  Question,
  Quiz,
  SearchResult,
  SourceFile,
  SourceUploadPolicy,
  Tag,
  Task,
  ThinkingCanvas,
  User,
  Workspace,
  PublicDeck,
  PublicQuiz,
  PublicWorkspace,
  CloneWorkspaceResult,
  MaterialDiscussion,
  MaterialRevision,
  MaterialSuggestion,
  Privacy,
  SuggestionStatus,
  WorkspaceMember,
  WorkspaceRole,
} from './types';
import type { MaterialDocument, MaterialValue } from '@/features/materials/document';

const USE_DIRECT_B2_UPLOAD = import.meta.env.VITE_DIRECT_B2_UPLOAD !== 'false';

/* ---------------- account / shell ---------------- */
export const meQuery = () => queryOptions({ queryKey: qk.me, queryFn: () => api.get<User>('/me') });
export const useMe = () => useQuery(meQuery());

export const useSearch = (q: string) =>
  useQuery({
    queryKey: qk.search(q),
    queryFn: () => api.get<SearchResult[]>(`/search?q=${encodeURIComponent(q)}`),
    enabled: q.trim().length > 0,
  });

export const useNotifications = () =>
  useQuery({
    queryKey: qk.notifications,
    queryFn: () => api.get<AppNotification[]>('/notifications'),
    refetchInterval: 30_000,
  });

export function useMarkNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<void>('/notifications/read'),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.notifications }),
  });
}

export const billingQuery = () =>
  queryOptions({
    queryKey: qk.billing,
    queryFn: () => api.get<BillingInfo>('/billing'),
  });
export const useBilling = () => useQuery(billingQuery());

export function useBillingCheckout() {
  return useMutation({
    mutationFn: (planTier: PlanTier) =>
      api.post<{ url: string }>('/billing/checkout', { planTier }),
  });
}

export function useBillingPortal() {
  return useMutation({
    mutationFn: async () => {
      const { url } = await api.post<{ url: string }>('/billing/portal');
      window.location.href = url;
    },
  });
}

export const integrationsQuery = () =>
  queryOptions({
    queryKey: qk.integrations,
    queryFn: () => api.get<IntegrationsStatus>('/integrations'),
  });
export const useIntegrations = () => useQuery(integrationsQuery());

export function useImportSources(workspaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      provider: 'google' | 'microsoft';
      fileIds: string[];
      chapterId?: string | null;
    }) => api.post<SourceFile[]>(`/workspaces/${workspaceId}/sources/import`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.files(workspaceId) });
      qc.invalidateQueries({ queryKey: qk.workspaceStats(workspaceId) });
    },
  });
}

export function useMicrosoftRecentFiles(enabled: boolean) {
  return useQuery({
    queryKey: ['integrations', 'microsoft', 'recent'],
    queryFn: () => api.get<{ id: string; name: string }[]>('/integrations/microsoft/recent'),
    enabled,
  });
}

/* ---------------- tags ---------------- */
/** The user's tag catalog for one kind — feeds the reuse-existing autocomplete.
 * Loaded once and filtered client-side (no per-keystroke request). */
export const tagsQuery = (kind = 'workspace') =>
  queryOptions({
    queryKey: qk.tags(kind),
    queryFn: () => api.get<Tag[]>(`/tags?kind=${encodeURIComponent(kind)}`),
  });
export const useTags = (kind = 'workspace') => useQuery(tagsQuery(kind));

/* ---------------- workspaces ---------------- */
export interface WorkspaceQuery {
  q?: string;
  sort?: string;
  /** One or more colors; OR-matched with tags on the server. */
  color?: string | string[];
  /** One or more tag values; OR-matched with colors on the server. */
  tag?: string | string[];
}
export const workspacesQuery = (params: WorkspaceQuery = {}) => {
  const search = new URLSearchParams();
  if (params.q) search.set('q', params.q);
  if (params.sort) search.set('sort', params.sort);
  const colors = Array.isArray(params.color) ? params.color : params.color ? [params.color] : [];
  const tags = Array.isArray(params.tag) ? params.tag : params.tag ? [params.tag] : [];
  if (colors.length) search.set('color', colors.join(','));
  if (tags.length) search.set('tag', tags.join(','));
  const qs = search.toString();
  return queryOptions({
    queryKey: qk.workspaces(params),
    queryFn: () => api.get<Workspace[]>(`/workspaces${qs ? `?${qs}` : ''}`),
  });
};
export const useWorkspaces = (params: WorkspaceQuery = {}) => useQuery(workspacesQuery(params));

export const workspaceQuery = (id: string) =>
  queryOptions({
    queryKey: qk.workspace(id),
    queryFn: () => api.get<Workspace>(`/workspaces/${id}`),
    enabled: !!id,
  });
export const useWorkspace = (id: string) => useQuery(workspaceQuery(id));

export const workspaceStatsQuery = (id: string) =>
  queryOptions({
    queryKey: qk.workspaceStats(id),
    queryFn: () =>
      api.get<{
        chapters: number;
        files: number;
        quizzes: number;
        attempts: number;
        avgScore: number;
      }>(`/workspaces/${id}/stats`),
    enabled: !!id,
  });
export const useWorkspaceStats = (id: string) => useQuery(workspaceStatsQuery(id));

export function useCreateWorkspace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateWorkspaceReq) => api.post<Workspace>('/workspaces', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workspaces'] });
      qc.invalidateQueries({ queryKey: ['tags'] });
    },
  });
}
export function useUpdateWorkspace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...body
    }: UpdateWorkspaceReq & {
      id: string;
      shareRole?: Exclude<WorkspaceRole, 'owner'>;
    }) => api.patch<Workspace>(`/workspaces/${id}`, body),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['workspaces'] });
      qc.invalidateQueries({ queryKey: qk.workspace(v.id) });
      qc.invalidateQueries({ queryKey: ['tags'] });
    },
  });
}
export function useUpdateWorkspaceSharing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: UpdateWorkspaceSharingReq & { id: string }) =>
      api.patch<Workspace>(`/workspaces/${id}/sharing`, body),
    // Await invalidation so mutateAsync (and ShareDialog's savingField) stay
    // pending until active workspace queries finish refetching.
    onSuccess: async (_d, v) => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['workspaces'] }),
        qc.invalidateQueries({ queryKey: qk.workspace(v.id) }),
      ]);
    },
  });
}
export function useDeleteWorkspace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del<void>(`/workspaces/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workspaces'] }),
  });
}

/* ---------------- chapters & files ---------------- */
export const sourceUploadPolicyQuery = () =>
  queryOptions({
    queryKey: qk.sourceUploadPolicy,
    queryFn: () => api.get<SourceUploadPolicy>('/source-upload-policy'),
  });
export const useSourceUploadPolicy = () => useQuery(sourceUploadPolicyQuery());

export const chaptersQuery = (wsId: string) =>
  queryOptions({
    queryKey: qk.chapters(wsId),
    queryFn: () => api.get<Chapter[]>(`/workspaces/${wsId}/chapters`),
    enabled: !!wsId,
  });
export const useChapters = (wsId: string) => useQuery(chaptersQuery(wsId));

export const filesQuery = (wsId: string) =>
  queryOptions({
    queryKey: qk.files(wsId),
    queryFn: () => api.get<SourceFile[]>(`/workspaces/${wsId}/files`),
    enabled: !!wsId,
  });
export const useFiles = (wsId: string) => useQuery(filesQuery(wsId));

export const useFile = (id: string | null) =>
  useQuery({
    queryKey: qk.file(id ?? ''),
    queryFn: () => api.get<SourceFile>(`/files/${id}`),
    enabled: !!id,
  });

export const allFilesQuery = () =>
  queryOptions({
    queryKey: ['files', 'all'],
    queryFn: () => api.get<SourceFile[]>('/files'),
  });
export const useAllFiles = () => useQuery(allFilesQuery());

export function useUpdateFile(wsId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string; name?: string; chapterId?: string | null }) =>
      api.patch<SourceFile>(`/files/${id}`, body),
    onSuccess: (file) => {
      qc.invalidateQueries({ queryKey: qk.files(wsId) });
      qc.invalidateQueries({ queryKey: qk.file(file.id) });
      qc.invalidateQueries({ queryKey: qk.chapters(wsId) });
    },
  });
}
/** File a source under a chapter (membership), or unfile it (chapterId=null).
 * The API uses an empty-string sentinel to unfile; null maps to "". Optimistic:
 * patches the files cache, rolls back on error, reconciles chapters on settle. */
export function useMoveFile(wsId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, chapterId }: { id: string; chapterId: string | null }) =>
      api.patch<SourceFile>(`/files/${id}`, { chapterId: chapterId ?? '' }),
    onMutate: async ({ id, chapterId }) => {
      await qc.cancelQueries({ queryKey: qk.files(wsId) });
      const prev = qc.getQueryData<SourceFile[]>(qk.files(wsId));
      qc.setQueryData<SourceFile[]>(qk.files(wsId), (list) =>
        list?.map((f) => (f.id === id ? { ...f, chapterId } : f))
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(qk.files(wsId), ctx.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: qk.files(wsId) });
      qc.invalidateQueries({ queryKey: qk.chapters(wsId) });
    },
  });
}
export function useDeleteFile(wsId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del<void>(`/files/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.files(wsId) });
      qc.invalidateQueries({ queryKey: qk.chapters(wsId) });
      qc.invalidateQueries({ queryKey: qk.workspaceStats(wsId) });
    },
  });
}

export function useAddChapter(wsId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => api.post<Chapter>(`/workspaces/${wsId}/chapters`, { name }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.chapters(wsId) }),
  });
}
export function useUpdateChapter(wsId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: UpdateChapterReq & { id: string }) =>
      api.patch<Chapter>(`/chapters/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.chapters(wsId) }),
  });
}
export function useReorderChapters(wsId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => api.post<void>(`/workspaces/${wsId}/chapters/reorder`, { ids }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.chapters(wsId) }),
  });
}

export interface ContentOrderItem {
  id: string;
  type: 'file' | 'material';
}

/** Move and reorder the mixed file/material rows in one destination bucket. */
export function useReorderContent(wsId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ chapterId, items }: { chapterId: string | null; items: ContentOrderItem[] }) =>
      api.post<void>(`/workspaces/${wsId}/content/reorder`, { chapterId, items }),
    onMutate: async ({ chapterId, items }) => {
      await Promise.all([
        qc.cancelQueries({ queryKey: qk.files(wsId) }),
        qc.cancelQueries({ queryKey: qk.materials(wsId) }),
      ]);
      const prevFiles = qc.getQueryData<SourceFile[]>(qk.files(wsId));
      const prevMaterials = qc.getQueryData<MaterialRef[]>(qk.materials(wsId));
      const positions = new Map(
        items.map((item, position) => [`${item.type}:${item.id}`, position])
      );
      qc.setQueryData<SourceFile[]>(qk.files(wsId), (list) =>
        list?.map((file) => {
          const position = positions.get(`file:${file.id}`);
          return position === undefined ? file : { ...file, chapterId, position };
        })
      );
      qc.setQueryData<MaterialRef[]>(qk.materials(wsId), (list) =>
        list?.map((material) => {
          const position = positions.get(`material:${material.id}`);
          return position === undefined ? material : { ...material, chapterId, position };
        })
      );
      return { prevFiles, prevMaterials };
    },
    onError: (_error, _variables, context) => {
      if (context?.prevFiles) qc.setQueryData(qk.files(wsId), context.prevFiles);
      if (context?.prevMaterials) qc.setQueryData(qk.materials(wsId), context.prevMaterials);
    },
    onSettled: () =>
      Promise.all([
        qc.invalidateQueries({ queryKey: qk.files(wsId) }),
        qc.invalidateQueries({ queryKey: qk.materials(wsId) }),
        qc.invalidateQueries({ queryKey: qk.chapters(wsId) }),
      ]),
  });
}

export function useDeleteChapter(wsId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del<void>(`/chapters/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.chapters(wsId) });
      qc.invalidateQueries({ queryKey: qk.files(wsId) });
    },
  });
}
/** Patch a single file across both the workspace list cache and its detail cache. */
function patchFileInCache(
  qc: QueryClient,
  wsId: string,
  fileId: string,
  patch: Partial<SourceFile>
) {
  qc.setQueryData<SourceFile[]>(qk.files(wsId), (prev) =>
    prev ? prev.map((f) => (f.id === fileId ? { ...f, ...patch } : f)) : prev
  );
  qc.setQueryData<SourceFile>(qk.file(fileId), (prev) => (prev ? { ...prev, ...patch } : prev));
}

// MSW has no SSE channel, so fake the progress animation client-side in dev.
function simulateMswProgress(qc: QueryClient, wsId: string, fileId: string) {
  let pct = 0;
  const timer = setInterval(() => {
    pct = Math.min(100, pct + 20);
    patchFileInCache(qc, wsId, fileId, { status: 'processing', ingestPct: pct });
    if (pct >= 100) {
      clearInterval(timer);
      patchFileInCache(qc, wsId, fileId, { status: 'ready', ingestPct: 100 });
    }
  }, 450);
}

/** Reserve a B2 object, upload it directly, then ask the gateway to verify and
 * enqueue it. File bytes never traverse the Go gateway. */
export function useUploadSource(wsId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      file,
      kind,
      chapterId,
      chapterName,
      parseMode,
      onUploadProgress,
      signal,
    }: {
      file: File;
      kind: SourceFile['kind'];
      chapterId?: string | null;
      chapterName?: string | null;
      /** advanced = Modal MinerU hybrid backend, normal = free MinerU
       * lightweight cloud API, none = store only (no parsing/indexing). */
      parseMode?: 'advanced' | 'normal' | 'none';
      onUploadProgress?: (pct: number) => void;
      signal?: AbortSignal;
    }) => {
      if (USE_MSW || !USE_DIRECT_B2_UPLOAD) {
        const form = new FormData();
        form.append('file', file, file.name);
        form.append('name', file.name);
        form.append('kind', kind);
        if (chapterId) form.append('chapterId', chapterId);
        if (chapterName) form.append('chapterName', chapterName);
        if (parseMode) form.append('parseMode', parseMode);
        return api.upload<SourceFile>(
          `/workspaces/${wsId}/sources`,
          form,
          onUploadProgress,
          signal
        );
      }
      return api
        .post<{
          uploadId: string;
          url: string;
          method: 'PUT';
          headers: Record<string, string>;
          expiresAt: string;
        }>(`/workspaces/${wsId}/sources/uploads`, {
          name: file.name,
          kind,
          chapterId: chapterId ?? null,
          chapterName: chapterName ?? null,
          parseMode,
          sizeBytes: file.size,
          contentType: file.type || 'application/octet-stream',
        })
        .then(async (reservation) => {
          await api.putFile(reservation.url, file, reservation.headers, onUploadProgress, signal);
          onUploadProgress?.(100);
          return api.post<SourceFile>(
            `/workspaces/${wsId}/sources/uploads/${reservation.uploadId}/complete`
          );
        });
    },
    onSuccess: (file) => {
      // Insert immediately so the row (with its progress bar) shows up at once.
      qc.setQueryData<SourceFile[]>(qk.files(wsId), (prev) => {
        const next = prev ? [...prev] : [];
        if (!next.some((f) => f.id === file.id)) {
          next.push({ ...file, status: file.status ?? 'processing', ingestPct: 0 });
        }
        return next;
      });
      qc.invalidateQueries({ queryKey: qk.chapters(wsId) });
      if (USE_MSW) simulateMswProgress(qc, wsId, file.id);
    },
  });
}

/** Subscribe to live ingest progress for a workspace (SSE) and patch the file
 * caches as events arrive. No-op under MSW (dev mock has no event stream). */
export function useIngestProgress(wsId: string, enabled = true) {
  const qc = useQueryClient();
  useEffect(() => {
    if (!wsId || !enabled || USE_MSW) return;
    const es = new EventSource(`${API_BASE}/workspaces/${wsId}/ingest-events`);
    es.onmessage = (e) => {
      try {
        const ev = JSON.parse(e.data) as { fileId: string; pct: number; status: FileStatus };
        patchFileInCache(qc, wsId, ev.fileId, { status: ev.status, ingestPct: ev.pct });
        if (ev.status === 'ready' || ev.status === 'failed') {
          qc.invalidateQueries({ queryKey: qk.files(wsId) });
          qc.invalidateQueries({ queryKey: qk.file(ev.fileId) });
        }
      } catch {
        /* ignore malformed events */
      }
    };
    return () => es.close();
  }, [wsId, enabled, qc]);
}

/* ---------------- chat & generate ---------------- */

export const conversationsQuery = (wsId: string) =>
  queryOptions({
    queryKey: qk.conversations(wsId),
    queryFn: () => api.get<Conversation[]>(`/workspaces/${wsId}/conversations`),
    enabled: !!wsId,
  });
export const useConversations = (wsId: string) => useQuery(conversationsQuery(wsId));

export const messagesQuery = (convId: string | null) =>
  queryOptions({
    queryKey: qk.messages(convId ?? ''),
    queryFn: () => api.get<WireMessage[]>(`/conversations/${convId}/messages`),
    enabled: !!convId,
  });
export const useMessages = (convId: string | null) => useQuery(messagesQuery(convId));

export function useDeleteConversation(wsId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (convId: string) => api.del<void>(`/conversations/${convId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.conversations(wsId) }),
  });
}
export function useGenerate(wsId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (opts: GenerateOptions) => api.post<unknown>(`/workspaces/${wsId}/generate`, opts),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: qk.quizzes }),
        qc.invalidateQueries({ queryKey: qk.decks }),
        qc.invalidateQueries({ queryKey: qk.materials(wsId) }),
      ]);
    },
  });
}

/* ---------------- study materials ---------------- */
/** Unified, workspace-scoped list of study materials (mindmaps, diagrams,
 * quizzes, decks) for the left panel. Not chapter-scoped. */
export const materialsQuery = (wsId: string) =>
  queryOptions({
    queryKey: qk.materials(wsId),
    queryFn: () => api.get<MaterialRef[]>(`/workspaces/${wsId}/materials`),
    enabled: !!wsId,
  });
export const useMaterials = (wsId: string) => useQuery(materialsQuery(wsId));

export const materialQuery = (id: string | null) =>
  queryOptions({
    queryKey: qk.material(id ?? ''),
    queryFn: () => api.get<Material>(`/materials/${id}`),
    enabled: !!id,
  });
export const useMaterial = (id: string | null) => useQuery(materialQuery(id));

export function useDeleteMaterial(wsId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del<void>(`/materials/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.materials(wsId) });
      qc.invalidateQueries({ queryKey: qk.quizzes });
      qc.invalidateQueries({ queryKey: qk.decks });
    },
  });
}

/** Create a user-authored note (markdown) material and reveal it in-pane. */
export interface CreateNoteInput {
  title?: string;
  content?: MaterialDocument;
  scopeChapters?: string[];
  scopeFileIds?: string[];
}
export function useCreateNote(wsId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateNoteInput = {}) =>
      api.post<Material>(`/workspaces/${wsId}/materials`, { kind: 'note', ...input }),
    onSuccess: (mt) => {
      qc.invalidateQueries({ queryKey: qk.materials(wsId) });
      qc.setQueryData(qk.material(mt.id), mt);
    },
  });
}

/** Patch a material's title/content/scope (used by the note editor autosave). */
export interface UpdateMaterialInput {
  title?: string;
  content?: MaterialDocument;
  expectedRevision?: number;
  scopeChapters?: string[];
  scopeFileIds?: string[];
}
export function useUpdateMaterial(wsId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: UpdateMaterialInput }) =>
      api.patch<MaterialUpdateResult>(`/materials/${id}`, patch),
    onSuccess: (result, { id, patch }) => {
      // PATCH returns only persistence metadata. The client already owns the
      // exact document it sent, so merge that immutable snapshot into cache
      // instead of downloading and JSON-parsing the whole document again.
      qc.setQueryData<Material>(qk.material(id), (current) =>
        current
          ? {
              ...current,
              ...(patch.title === undefined ? {} : { title: patch.title }),
              ...(patch.content === undefined ? {} : { content: patch.content }),
              ...(patch.scopeChapters === undefined ? {} : { scopeChapters: patch.scopeChapters }),
              ...(patch.scopeFileIds === undefined ? {} : { scopeFileIds: patch.scopeFileIds }),
              revision: result.revision,
              contentBytes: result.contentBytes,
              updatedAt: result.updatedAt,
            }
          : current
      );
      // Content/revision/byte-count are absent from MaterialRef rows, so an
      // autosave cannot make the workspace material list stale. Avoid a
      // pointless list refetch after every save; metadata patches still need
      // one because they can change titles or grouping.
      if (
        patch.title !== undefined ||
        patch.scopeChapters !== undefined ||
        patch.scopeFileIds !== undefined
      ) {
        qc.invalidateQueries({ queryKey: qk.materials(wsId) });
      }
    },
  });
}

/* ---------------- editor collaboration ---------------- */
export const workspaceMembersQuery = (workspaceId: string, enabled = true) =>
  queryOptions({
    queryKey: qk.workspaceMembers(workspaceId),
    queryFn: () => api.get<WorkspaceMember[]>(`/workspaces/${workspaceId}/members`),
    enabled: !!workspaceId && enabled,
  });

export const useWorkspaceMembers = (workspaceId: string, enabled = true) =>
  useQuery(workspaceMembersQuery(workspaceId, enabled));

export function useCreateWorkspaceInvite(workspaceId: string) {
  return useMutation({
    mutationFn: (body: { identifier: string; role: Exclude<WorkspaceRole, 'owner'> }) =>
      api.post<void>(`/workspaces/${workspaceId}/invites`, body),
  });
}

export function useAcceptWorkspaceInvite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (token: string) =>
      api.post<WorkspaceMember>(`/workspace-invites/${encodeURIComponent(token)}/accept`),
    onSuccess: (member) => {
      qc.invalidateQueries({ queryKey: ['workspaces'] });
      qc.invalidateQueries({ queryKey: qk.workspace(member.workspaceId) });
      qc.invalidateQueries({ queryKey: qk.workspaceMembers(member.workspaceId) });
      qc.invalidateQueries({ queryKey: qk.notifications });
    },
  });
}

export function useUpdateWorkspaceMember(workspaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: Exclude<WorkspaceRole, 'owner'> }) =>
      api.patch<void>(`/workspaces/${workspaceId}/members/${userId}`, { role }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.workspaceMembers(workspaceId) }),
  });
}

export function useRemoveWorkspaceMember(workspaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => api.del<void>(`/workspaces/${workspaceId}/members/${userId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.workspaceMembers(workspaceId) }),
  });
}

export const materialDiscussionsQuery = (materialId: string) =>
  queryOptions({
    queryKey: qk.materialDiscussions(materialId),
    queryFn: () => api.get<MaterialDiscussion[]>(`/materials/${materialId}/discussions`),
    enabled: !!materialId,
  });

export const useMaterialDiscussions = (materialId: string) =>
  useQuery(materialDiscussionsQuery(materialId));

export function useCreateMaterialDiscussion(materialId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      blockId?: string;
      documentContent?: string;
      anchor?: Record<string, unknown>;
      contentRich: MaterialValue;
    }) => api.post<MaterialDiscussion>(`/materials/${materialId}/discussions`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.materialDiscussions(materialId) }),
  });
}

export function useCreateMaterialComment(materialId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      discussionId,
      contentRich,
    }: {
      discussionId: string;
      contentRich: MaterialValue;
    }) => api.post(`/discussions/${discussionId}/comments`, { contentRich }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.materialDiscussions(materialId) }),
  });
}

export function useResolveMaterialDiscussion(materialId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ discussionId, isResolved }: { discussionId: string; isResolved: boolean }) =>
      api.patch<void>(`/discussions/${discussionId}`, { isResolved }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.materialDiscussions(materialId) }),
  });
}

export const materialRevisionsQuery = (materialId: string) =>
  queryOptions({
    queryKey: qk.materialRevisions(materialId),
    queryFn: () => api.get<MaterialRevision[]>(`/materials/${materialId}/revisions`),
    enabled: !!materialId,
  });

export const useMaterialRevisions = (materialId: string) =>
  useQuery(materialRevisionsQuery(materialId));

export const materialSuggestionsQuery = (materialId: string) =>
  queryOptions({
    queryKey: qk.materialSuggestions(materialId),
    queryFn: () => api.get<MaterialSuggestion[]>(`/materials/${materialId}/suggestions`),
    enabled: !!materialId,
  });

export const useMaterialSuggestions = (materialId: string) =>
  useQuery(materialSuggestionsQuery(materialId));

export function useCreateMaterialSuggestion(materialId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      baseRevision: number;
      anchor: Record<string, unknown>;
      originalFragment: MaterialValue;
      proposedFragment: MaterialValue;
    }) => api.post<MaterialSuggestion>(`/materials/${materialId}/suggestions`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.materialSuggestions(materialId) }),
  });
}

export function useUpdateMaterialSuggestionStatus(materialId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      suggestionId,
      status,
      finalizedContent,
      expectedBaseRevision,
    }: {
      suggestionId: string;
      status: SuggestionStatus;
      finalizedContent?: MaterialDocument;
      expectedBaseRevision?: number;
    }) =>
      api.patch<MaterialSuggestion>(`/material-suggestions/${suggestionId}`, {
        status,
        finalizedContent,
        expectedBaseRevision,
      }),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: qk.materialSuggestions(materialId) }),
        qc.invalidateQueries({ queryKey: qk.material(materialId) }),
        qc.invalidateQueries({ queryKey: qk.materialRevisions(materialId) }),
      ]);
    },
  });
}

/** File a material under a chapter (membership), or unfile it (chapterId=null).
 * The API uses an empty-string sentinel to unfile; null maps to "". Optimistic:
 * patches the materials list + single-material caches, rolls back on error. */
export function useMoveMaterial(wsId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, chapterId }: { id: string; chapterId: string | null }) =>
      api.patch<Material>(`/materials/${id}`, { chapterId: chapterId ?? '' }),
    onMutate: async ({ id, chapterId }) => {
      await qc.cancelQueries({ queryKey: qk.materials(wsId) });
      const prevList = qc.getQueryData<MaterialRef[]>(qk.materials(wsId));
      qc.setQueryData<MaterialRef[]>(qk.materials(wsId), (prev) =>
        prev?.map((r) => (r.id === id ? { ...r, chapterId } : r))
      );
      qc.setQueryData<Material>(qk.material(id), (prev) => (prev ? { ...prev, chapterId } : prev));
      return { prevList };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prevList) qc.setQueryData(qk.materials(wsId), ctx.prevList);
    },
    onSuccess: (mt) => qc.setQueryData(qk.material(mt.id), mt),
    onSettled: () => qc.invalidateQueries({ queryKey: qk.materials(wsId) }),
  });
}

/* ---------------- quizzes ---------------- */
export const quizzesQuery = () =>
  queryOptions({
    queryKey: qk.quizzes,
    queryFn: () => api.get<Quiz[]>('/quizzes'),
  });
export const useQuizzes = () => useQuery(quizzesQuery());

export const quizQuery = (id: string) =>
  queryOptions({
    queryKey: qk.quiz(id),
    queryFn: () => api.get<Quiz>(`/quizzes/${id}`),
    enabled: !!id,
  });
export const useQuiz = (id: string) => useQuery(quizQuery(id));

export const attemptsQuery = () =>
  queryOptions({
    queryKey: qk.attempts,
    queryFn: () => api.get<Attempt[]>('/attempts'),
  });
export const useAttempts = () => useQuery(attemptsQuery());

export const attemptQuery = (id: string) =>
  queryOptions({
    queryKey: qk.attempt(id),
    queryFn: () => api.get<AttemptDetail>(`/attempts/${id}`),
    enabled: !!id,
  });
export const useAttempt = (id: string) => useQuery(attemptQuery(id));

/** Ad-hoc quiz built from recently-missed questions. */
export const mistakesQuery = () =>
  queryOptions({
    queryKey: qk.mistakes,
    queryFn: () => api.get<Quiz>('/mistakes'),
  });
export const useMistakes = () => useQuery(mistakesQuery());

/** Invalidate every workspace's materials list (quiz/deck edits change titles
 * shown in the left panel but don't carry a workspace id). */
function invalidateAllMaterials(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({
    predicate: (q) =>
      Array.isArray(q.queryKey) && q.queryKey[0] === 'workspace' && q.queryKey[2] === 'materials',
  });
}

export function useCreateQuiz() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Omit<CreateQuizReq, 'questions'> & { questions?: Question[] }) =>
      api.post<Quiz>('/quizzes', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.quizzes });
      invalidateAllMaterials(qc);
    },
  });
}
export function useUpdateQuiz() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...body
    }: Omit<UpdateQuizReq, 'questions'> & { id: string; questions?: Question[] }) =>
      api.patch<Quiz>(`/quizzes/${id}`, body),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: qk.quizzes });
      qc.invalidateQueries({ queryKey: qk.quiz(v.id) });
      invalidateAllMaterials(qc);
    },
  });
}
export function useDeleteQuiz() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del<void>(`/quizzes/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.quizzes });
      invalidateAllMaterials(qc);
    },
  });
}
export function useSubmitAttempt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      quizId,
      correct,
      total,
      wrong,
      answers,
      questions,
    }: {
      quizId: string;
      correct: number;
      total: number;
      wrong?: Question[];
      answers?: Record<string, unknown>;
      questions?: Question[];
    }) =>
      api.post<Attempt>(`/quizzes/${quizId}/attempts`, {
        correct,
        total,
        wrong,
        answers,
        questions,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.attempts });
      qc.invalidateQueries({ queryKey: qk.mistakes });
    },
  });
}

/* ---------------- flashcards ---------------- */
export const decksQuery = () =>
  queryOptions({ queryKey: qk.decks, queryFn: () => api.get<Deck[]>('/decks') });
export const useDecks = () => useQuery(decksQuery());

export function useCreateDeck() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateDeckReq) => api.post<Deck>('/decks', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.decks });
      invalidateAllMaterials(qc);
    },
  });
}
export function useCreateCard(deckId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { front: string; back: string }) =>
      api.post<Flashcard>(`/decks/${deckId}/cards`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.cards(deckId) });
      qc.invalidateQueries({ queryKey: qk.deck(deckId) });
      qc.invalidateQueries({ queryKey: qk.decks });
    },
  });
}
export function useDeleteCard(deckId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del<void>(`/cards/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.cards(deckId) });
      qc.invalidateQueries({ queryKey: qk.deck(deckId) });
      qc.invalidateQueries({ queryKey: qk.decks });
    },
  });
}

export const deckQuery = (id: string) =>
  queryOptions({
    queryKey: qk.deck(id),
    queryFn: () => api.get<Deck>(`/decks/${id}`),
    enabled: !!id,
  });
export const useDeck = (id: string) => useQuery(deckQuery(id));

export const cardsQuery = (deckId: string) =>
  queryOptions({
    queryKey: qk.cards(deckId),
    queryFn: () => api.get<Flashcard[]>(`/decks/${deckId}/cards`),
    enabled: !!deckId,
  });
export const useCards = (deckId: string) => useQuery(cardsQuery(deckId));
export function useUpdateCard(deckId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: UpdateCardReq & { id: string }) =>
      api.patch<Flashcard>(`/cards/${id}`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.cards(deckId) });
      qc.invalidateQueries({ queryKey: qk.deck(deckId) });
      qc.invalidateQueries({ queryKey: qk.decks });
    },
  });
}
/** Persist an SRS review result for a card (updates scheduling + known flag). */
export function useReviewCard(deckId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, srs, known }: Pick<Flashcard, 'id' | 'srs' | 'known'>) =>
      api.patch<Flashcard>(`/cards/${id}`, { srs, known }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.deck(deckId) });
      qc.invalidateQueries({ queryKey: qk.decks });
    },
  });
}

/* ---------------- schedule ---------------- */
export const eventsQuery = () =>
  queryOptions({
    queryKey: qk.events,
    queryFn: () => api.get<CalendarEvent[]>('/events'),
  });
export const useEvents = () => useQuery(eventsQuery());

export const labelsQuery = () =>
  queryOptions({ queryKey: qk.labels, queryFn: () => api.get<Label[]>('/labels') });
export const useLabels = () => useQuery(labelsQuery());
export function useUpdateLabel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: Partial<Label> & { id: string }) =>
      api.patch<Label>(`/labels/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.labels }),
  });
}
export function useDeleteLabel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del<void>(`/labels/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.labels });
      qc.invalidateQueries({ queryKey: qk.events });
    },
  });
}
export function useCreateEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateEventReq) => api.post<CalendarEvent>('/events', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.events }),
  });
}
export function useUpdateEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: Partial<CreateEventReq> & { id: string }) =>
      api.patch<CalendarEvent>(`/events/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.events }),
  });
}

/* ---------------- tasks ---------------- */
export const tasksQuery = () =>
  queryOptions({ queryKey: qk.tasks, queryFn: () => api.get<Task[]>('/tasks') });
export const useTasks = () => useQuery(tasksQuery());

interface TasksMutationContext {
  prev?: Task[];
}

function patchTasksCache(qc: ReturnType<typeof useQueryClient>, mutate: (tasks: Task[]) => Task[]) {
  const prev = qc.getQueryData<Task[]>(qk.tasks);
  if (prev) qc.setQueryData<Task[]>(qk.tasks, mutate(prev));
  return prev;
}

export function useToggleTask() {
  const qc = useQueryClient();
  return useMutation<Task, Error, { id: string; done: boolean }, TasksMutationContext>({
    mutationFn: ({ id, done }) => api.patch<Task>(`/tasks/${id}`, { done }),
    onMutate: async ({ id, done }) => {
      await qc.cancelQueries({ queryKey: qk.tasks });
      const prev = patchTasksCache(qc, (tasks) =>
        tasks.map((t) => (t.id === id ? { ...t, done } : t))
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(qk.tasks, ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: qk.tasks }),
  });
}
export function useUpdateTask() {
  const qc = useQueryClient();
  return useMutation<
    Task,
    Error,
    { id: string } & Partial<Pick<Task, 'title' | 'meta' | 'done'>>,
    TasksMutationContext
  >({
    mutationFn: ({ id, ...patch }) => api.patch<Task>(`/tasks/${id}`, patch),
    onMutate: async ({ id, ...patch }) => {
      await qc.cancelQueries({ queryKey: qk.tasks });
      const prev = patchTasksCache(qc, (tasks) =>
        tasks.map((t) => (t.id === id ? { ...t, ...patch } : t))
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(qk.tasks, ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: qk.tasks }),
  });
}
export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation<void, Error, string, TasksMutationContext>({
    mutationFn: (id) => api.del<void>(`/tasks/${id}`),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: qk.tasks });
      const prev = patchTasksCache(qc, (tasks) => tasks.filter((t) => t.id !== id));
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(qk.tasks, ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: qk.tasks }),
  });
}

/* ---------------- thinking ---------------- */
export const canvasesQuery = () =>
  queryOptions({
    queryKey: qk.thinking,
    queryFn: () => api.get<ThinkingCanvas[]>('/thinking'),
  });
export const useCanvases = () => useQuery(canvasesQuery());

export const canvasQuery = (id: string) =>
  queryOptions({
    queryKey: qk.canvas(id),
    queryFn: () => api.get<ThinkingCanvas>(`/thinking/${id}`),
    enabled: !!id,
  });
export const useCanvas = (id: string) => useQuery(canvasQuery(id));
export function useCreateCanvas() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => api.post<ThinkingCanvas>('/thinking', { name }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.thinking }),
  });
}
export function useSaveCanvas(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { scene?: unknown; name?: string }) =>
      api.put<ThinkingCanvas>(`/thinking/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.thinking }),
  });
}

/* ---------------- explore ---------------- */
export const exploreWorkspacesQuery = () =>
  queryOptions({
    queryKey: qk.exploreWorkspaces,
    queryFn: () => api.get<PublicWorkspace[]>('/explore/workspaces'),
  });
export const useExploreWorkspaces = () => useQuery(exploreWorkspacesQuery());

export const exploreQuizzesQuery = () =>
  queryOptions({
    queryKey: qk.exploreQuizzes,
    queryFn: () => api.get<PublicQuiz[]>('/explore/quizzes'),
  });
export const useExploreQuizzes = () => useQuery(exploreQuizzesQuery());

export const exploreDecksQuery = () =>
  queryOptions({
    queryKey: qk.exploreDecks,
    queryFn: () => api.get<PublicDeck[]>('/explore/decks'),
  });
export const useExploreDecks = () => useQuery(exploreDecksQuery());

/* ---------------- sharing & cloning ---------------- */

/** Deep-copy a shared workspace (chapters, files, materials and — via the
 * pipeline — the parsed knowledge graph) into the caller's account. */
export function useCloneWorkspace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<CloneWorkspaceResult>(`/workspaces/${id}/clone`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workspaces'] });
      qc.invalidateQueries({ queryKey: qk.quizzes });
      qc.invalidateQueries({ queryKey: qk.decks });
      qc.invalidateQueries({ queryKey: qk.exploreWorkspaces });
    },
  });
}

/** Copy a shared quiz into the caller's library (most recent workspace). */
export function useCloneQuiz() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<Quiz>(`/quizzes/${id}/clone`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.quizzes });
      qc.invalidateQueries({ queryKey: qk.exploreQuizzes });
      invalidateAllMaterials(qc);
    },
  });
}

/** Copy a shared deck (with reset SRS state) into the caller's library. */
export function useCloneDeck() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<Deck>(`/decks/${id}/clone`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.decks });
      qc.invalidateQueries({ queryKey: qk.exploreDecks });
      invalidateAllMaterials(qc);
    },
  });
}

/** Rename / recolor a deck or change its visibility (share standalone). */
export function useUpdateDeck() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...body
    }: {
      id: string;
      name?: string;
      color?: string;
      privacy?: Privacy;
    }) => api.patch<Deck>(`/decks/${id}`, body),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: qk.decks });
      qc.invalidateQueries({ queryKey: qk.deck(v.id) });
      invalidateAllMaterials(qc);
    },
  });
}
