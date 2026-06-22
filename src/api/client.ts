/**
 * Thin fetch wrapper around the mock API. One base URL so the real
 * backend can be dropped in later by changing `API_BASE`.
 */
export const API_BASE = '/api';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    ...init,
  });
  if (!res.ok) {
    let detail = '';
    try {
      detail = (await res.json())?.message ?? '';
    } catch {
      /* ignore */
    }
    throw new Error(
      `${res.status} ${res.statusText}${detail ? ` — ${detail}` : ''}`
    );
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    }),
  del: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};

/** Central query-key registry for TanStack Query. */
export const qk = {
  me: ['me'] as const,
  search: (q: string) => ['search', q] as const,
  notifications: ['notifications'] as const,
  workspaces: (params?: unknown) => ['workspaces', params ?? null] as const,
  workspace: (id: string) => ['workspace', id] as const,
  workspaceStats: (id: string) => ['workspace', id, 'stats'] as const,
  chapters: (wsId: string) => ['workspace', wsId, 'chapters'] as const,
  files: (wsId: string) => ['workspace', wsId, 'files'] as const,
  file: (id: string) => ['file', id] as const,
  quizzes: ['quizzes'] as const,
  quiz: (id: string) => ['quiz', id] as const,
  attempts: ['attempts'] as const,
  decks: ['decks'] as const,
  deck: (id: string) => ['deck', id] as const,
  cards: (deckId: string) => ['deck', deckId, 'cards'] as const,
  events: ['events'] as const,
  labels: ['labels'] as const,
  tasks: ['tasks'] as const,
  thinking: ['thinking'] as const,
  canvas: (id: string) => ['canvas', id] as const,
  exploreWorkspaces: ['explore', 'workspaces'] as const,
  exploreQuizzes: ['explore', 'quizzes'] as const,
};
