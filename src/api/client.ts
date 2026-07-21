/**
 * Thin fetch wrapper around the API. One base URL so the real
 * backend can be dropped in later by changing `API_BASE`.
 */
import { authHeaders } from './auth';

export const API_BASE = '/api';

/** Typed HTTP failure so callers can branch on status (404 private, 401, …). */
export class ApiError extends Error {
  readonly status: number;
  readonly statusText: string;

  constructor(status: number, statusText: string, detail?: string) {
    super(`${status} ${statusText}${detail ? ` — ${detail}` : ''}`);
    this.name = 'ApiError';
    this.status = status;
    this.statusText = statusText;
  }
}

export function isApiError(err: unknown): err is ApiError {
  return err instanceof ApiError;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const auth = await authHeaders();
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...auth, ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    let detail = '';
    try {
      detail = (await res.json())?.message ?? '';
    } catch {
      /* ignore */
    }
    throw new ApiError(res.status, res.statusText, detail || undefined);
  }
  if (res.status === 204) return undefined as T;
  const body = await res.text();
  return (body ? JSON.parse(body) : undefined) as T;
}

/** Multipart upload (real file bytes). Lets the browser set the multipart
 * boundary — never send a JSON Content-Type here. */
async function upload<T>(path: string, form: FormData): Promise<T> {
  const auth = await authHeaders();
  const res = await fetch(`${API_BASE}${path}`, { method: 'POST', headers: auth, body: form });
  if (!res.ok) {
    let detail = '';
    try {
      detail = (await res.json())?.message ?? '';
    } catch {
      /* ignore */
    }
    throw new ApiError(res.status, res.statusText, detail || undefined);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

/** Upload bytes to a storage-provider URL without adding API auth headers.
 * XHR is used because fetch still has no upload-progress events. */
function putFile(
  url: string,
  file: File,
  headers: Record<string, string>,
  onProgress?: (pct: number) => void,
  signal?: AbortSignal
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const abort = () => xhr.abort();
    const cleanup = () => signal?.removeEventListener('abort', abort);
    const succeed = () => {
      cleanup();
      onProgress?.(100);
      resolve();
    };
    const fail = (error: Error) => {
      cleanup();
      reject(error);
    };
    xhr.open('PUT', url);
    for (const [name, value] of Object.entries(headers)) xhr.setRequestHeader(name, value);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress?.(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) succeed();
      else fail(new Error(`B2 upload failed: ${xhr.status} ${xhr.statusText}`));
    };
    xhr.onerror = () => fail(new Error('B2 upload failed: network error'));
    xhr.onabort = () => fail(new DOMException('Upload cancelled', 'AbortError'));
    if (signal) {
      if (signal.aborted) {
        fail(new DOMException('Upload cancelled', 'AbortError'));
        return;
      }
      signal.addEventListener('abort', abort, { once: true });
    }
    xhr.send(file);
  });
}

type RequestOptions = Pick<RequestInit, 'signal'>;

export const api = {
  get: <T>(path: string, options?: RequestOptions) => request<T>(path, options),
  upload: <T>(path: string, form: FormData) => upload<T>(path, form),
  putFile,
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, {
      ...options,
      method: 'POST',
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, {
      ...options,
      method: 'PATCH',
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  put: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, {
      ...options,
      method: 'PUT',
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  del: <T>(path: string, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'DELETE' }),
};

/** Central query-key registry for TanStack Query. */
export const qk = {
  me: ['me'] as const,
  search: (q: string) => ['search', q] as const,
  notifications: ['notifications'] as const,
  billing: ['billing'] as const,
  integrations: ['integrations'] as const,
  workspaces: (params?: unknown) => ['workspaces', params ?? null] as const,
  workspace: (id: string) => ['workspace', id] as const,
  workspaceStats: (id: string) => ['workspace', id, 'stats'] as const,
  chapters: (wsId: string) => ['workspace', wsId, 'chapters'] as const,
  files: (wsId: string) => ['workspace', wsId, 'files'] as const,
  file: (id: string) => ['file', id] as const,
  quizzes: ['quizzes'] as const,
  quiz: (id: string) => ['quiz', id] as const,
  materials: (wsId: string) => ['workspace', wsId, 'materials'] as const,
  material: (id: string) => ['material', id] as const,
  materialRevisions: (id: string) => ['material', id, 'revisions'] as const,
  materialDiscussions: (id: string) => ['material', id, 'discussions'] as const,
  materialSuggestions: (id: string) => ['material', id, 'suggestions'] as const,
  workspaceMembers: (id: string) => ['workspace', id, 'members'] as const,
  attempts: ['attempts'] as const,
  attempt: (id: string) => ['attempt', id] as const,
  mistakes: ['mistakes'] as const,
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
  exploreDecks: ['explore', 'decks'] as const,
  tags: (kind: string) => ['tags', kind] as const,
  conversations: (wsId: string) => ['workspace', wsId, 'conversations'] as const,
  messages: (convId: string) => ['conversation', convId, 'messages'] as const,
};
