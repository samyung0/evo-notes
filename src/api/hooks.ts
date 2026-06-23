import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, qk } from './client';
import type {
  Attempt,
  CalendarEvent,
  Chapter,
  Deck,
  Flashcard,
  GenerateOptions,
  Label,
  AppNotification,
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
export const useMe = () => useQuery({ queryKey: qk.me, queryFn: () => api.get<User>('/me') });

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

/* ---------------- workspaces ---------------- */
export interface WorkspaceQuery {
  q?: string;
  sort?: string;
  color?: string;
  tag?: string;
}
export function useWorkspaces(params: WorkspaceQuery = {}) {
  const search = new URLSearchParams();
  if (params.q) search.set('q', params.q);
  if (params.sort) search.set('sort', params.sort);
  if (params.color) search.set('color', params.color);
  if (params.tag) search.set('tag', params.tag);
  const qs = search.toString();
  return useQuery({
    queryKey: qk.workspaces(params),
    queryFn: () => api.get<Workspace[]>(`/workspaces${qs ? `?${qs}` : ''}`),
  });
}
export const useWorkspace = (id: string) =>
  useQuery({
    queryKey: qk.workspace(id),
    queryFn: () => api.get<Workspace>(`/workspaces/${id}`),
    enabled: !!id,
  });

export const useWorkspaceStats = (id: string) =>
  useQuery({
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

export function useCreateWorkspace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<Workspace>) => api.post<Workspace>('/workspaces', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workspaces'] }),
  });
}
export function useUpdateWorkspace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: Partial<Workspace> & { id: string }) =>
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
export const useChapters = (wsId: string) =>
  useQuery({
    queryKey: qk.chapters(wsId),
    queryFn: () => api.get<Chapter[]>(`/workspaces/${wsId}/chapters`),
    enabled: !!wsId,
  });
export const useFiles = (wsId: string) =>
  useQuery({
    queryKey: qk.files(wsId),
    queryFn: () => api.get<SourceFile[]>(`/workspaces/${wsId}/files`),
    enabled: !!wsId,
  });
export const useFile = (id: string | null) =>
  useQuery({
    queryKey: qk.file(id ?? ''),
    queryFn: () => api.get<SourceFile>(`/files/${id}`),
    enabled: !!id,
  });
export const useAllFiles = () =>
  useQuery({
    queryKey: ['files', 'all'],
    queryFn: () => api.get<SourceFile[]>('/files'),
  });

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
    mutationFn: ({ id, ...body }: Partial<Chapter> & { id: string }) =>
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
export function useAddSource(wsId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { name: string; kind: SourceFile['kind']; chapterId?: string | null }) =>
      api.post<SourceFile>(`/workspaces/${wsId}/sources`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.files(wsId) });
      qc.invalidateQueries({ queryKey: qk.chapters(wsId) });
    },
  });
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
export const useQuizzes = () =>
  useQuery({
    queryKey: qk.quizzes,
    queryFn: () => api.get<Quiz[]>('/quizzes'),
  });
export const useQuiz = (id: string) =>
  useQuery({
    queryKey: qk.quiz(id),
    queryFn: () => api.get<Quiz>(`/quizzes/${id}`),
    enabled: !!id,
  });
export const useAttempts = () =>
  useQuery({
    queryKey: qk.attempts,
    queryFn: () => api.get<Attempt[]>('/attempts'),
  });
export function useUpdateQuiz() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: Partial<Quiz> & { id: string }) =>
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
    mutationFn: ({ quizId, correct, total }: { quizId: string; correct: number; total: number }) =>
      api.post<Attempt>(`/quizzes/${quizId}/attempts`, { correct, total }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.attempts }),
  });
}

/* ---------------- flashcards ---------------- */
export const useDecks = () =>
  useQuery({ queryKey: qk.decks, queryFn: () => api.get<Deck[]>('/decks') });
export const useDeck = (id: string) =>
  useQuery({
    queryKey: qk.deck(id),
    queryFn: () => api.get<Deck>(`/decks/${id}`),
    enabled: !!id,
  });
export const useCards = (deckId: string) =>
  useQuery({
    queryKey: qk.cards(deckId),
    queryFn: () => api.get<Flashcard[]>(`/decks/${deckId}/cards`),
    enabled: !!deckId,
  });
export function useUpdateCard(deckId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: Partial<Flashcard> & { id: string }) =>
      api.patch<Flashcard>(`/cards/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.cards(deckId) }),
  });
}

/* ---------------- schedule ---------------- */
export const useEvents = () =>
  useQuery({
    queryKey: qk.events,
    queryFn: () => api.get<CalendarEvent[]>('/events'),
  });
export const useLabels = () =>
  useQuery({ queryKey: qk.labels, queryFn: () => api.get<Label[]>('/labels') });
export function useCreateEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Omit<CalendarEvent, 'id'>) => api.post<CalendarEvent>('/events', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.events }),
  });
}

/* ---------------- tasks ---------------- */
export const useTasks = () =>
  useQuery({ queryKey: qk.tasks, queryFn: () => api.get<Task[]>('/tasks') });
export function useToggleTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, done }: { id: string; done: boolean }) =>
      api.patch<Task>(`/tasks/${id}`, { done }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.tasks }),
  });
}

/* ---------------- thinking ---------------- */
export const useCanvases = () =>
  useQuery({
    queryKey: qk.thinking,
    queryFn: () => api.get<ThinkingCanvas[]>('/thinking'),
  });
export const useCanvas = (id: string) =>
  useQuery({
    queryKey: qk.canvas(id),
    queryFn: () => api.get<ThinkingCanvas>(`/thinking/${id}`),
    enabled: !!id,
  });
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
export const useExploreWorkspaces = () =>
  useQuery({
    queryKey: qk.exploreWorkspaces,
    queryFn: () => api.get<PublicWorkspace[]>('/explore/workspaces'),
  });
export const useExploreQuizzes = () =>
  useQuery({
    queryKey: qk.exploreQuizzes,
    queryFn: () => api.get<PublicQuiz[]>('/explore/quizzes'),
  });
