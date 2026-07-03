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
  UpdateCardReq,
  UpdateChapterReq,
  UpdateQuizReq,
  UpdateWorkspaceReq,
} from './gen/model';
import type {
  Attempt,
  AttemptDetail,
  BillingInfo,
  CalendarEvent,
  Chapter,
  Deck,
  FileStatus,
  Flashcard,
  GenerateOptions,
  IntegrationsStatus,
  Label,
  AppNotification,
  PlanTier,
  Question,
  Quiz,
  SearchResult,
  SourceFile,
  Task,
  ThinkingCanvas,
  User,
  Workspace,
  PublicQuiz,
  PublicWorkspace,
} from './types';

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
    mutationFn: (body: { provider: 'google' | 'microsoft'; fileIds: string[]; chapterId?: string | null }) =>
      api.post<SourceFile[]>(`/workspaces/${workspaceId}/sources/import`, body),
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

/* ---------------- workspaces ---------------- */
export interface WorkspaceQuery {
  q?: string;
  sort?: string;
  color?: string;
  tag?: string;
}
export const workspacesQuery = (params: WorkspaceQuery = {}) => {
  const search = new URLSearchParams();
  if (params.q) search.set('q', params.q);
  if (params.sort) search.set('sort', params.sort);
  if (params.color) search.set('color', params.color);
  if (params.tag) search.set('tag', params.tag);
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
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workspaces'] }),
  });
}
export function useUpdateWorkspace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: UpdateWorkspaceReq & { id: string }) =>
      api.patch<Workspace>(`/workspaces/${id}`, body),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['workspaces'] });
      qc.invalidateQueries({ queryKey: qk.workspace(v.id) });
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

/** Real multipart upload: sends the file bytes, which triggers the async ingest
 * pipeline (file lands `processing`; progress arrives via SSE / useIngestProgress). */
export function useUploadSource(wsId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      file,
      kind,
      chapterId,
    }: {
      file: File;
      kind: SourceFile['kind'];
      chapterId?: string | null;
    }) => {
      const form = new FormData();
      form.append('file', file, file.name);
      form.append('name', file.name);
      form.append('kind', kind);
      if (chapterId) form.append('chapterId', chapterId);
      return api.upload<SourceFile>(`/workspaces/${wsId}/sources`, form);
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
export function useIngestProgress(wsId: string) {
  const qc = useQueryClient();
  useEffect(() => {
    if (!wsId || USE_MSW) return;
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
  }, [wsId, qc]);
}

/* ---------------- chat & generate ---------------- */
export function useChat(wsId: string) {
  return useMutation({
    mutationFn: (text: string) =>
      api.post<import('./types').ChatMessage>(`/workspaces/${wsId}/chat`, {
        text,
      }),
  });
}
export function useGenerate(wsId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (opts: GenerateOptions) => api.post<unknown>(`/workspaces/${wsId}/generate`, opts),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.quizzes }),
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

export function useCreateQuiz() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Omit<CreateQuizReq, 'questions'> & { questions?: Question[] }) =>
      api.post<Quiz>('/quizzes', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.quizzes }),
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
    },
  });
}
export function useDeleteQuiz() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del<void>(`/quizzes/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.quizzes }),
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
    }) => api.post<Attempt>(`/quizzes/${quizId}/attempts`, { correct, total, wrong, answers, questions }),
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
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.decks }),
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
