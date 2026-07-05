/**
 * Low-level SSE consumer for the chat streaming endpoint.
 *
 * The Go gateway streams `data: {json}\n\n` events (type: start | token |
 * citations | done | error). We use fetch + ReadableStream (not EventSource,
 * which can't POST) so the request carries a JSON body and can be aborted via an
 * AbortController — the abort propagates all the way to the LLM provider.
 */
import { API_BASE } from './client';
import { authHeaders } from './auth';
import type { Citation, ChatStatus } from './types';

export interface StreamStart {
  messageId: string;
  conversationId: string;
}
export interface StreamDone {
  status: ChatStatus;
  tokenCount?: number;
  generationId?: string;
}
export interface ChatStreamHandlers {
  onStart?: (e: StreamStart) => void;
  onToken?: (text: string) => void;
  onCitations?: (citations: Citation[]) => void;
  onDone?: (e: StreamDone) => void;
  onError?: (message: string) => void;
}

export interface ChatStreamBody {
  conversationId?: string;
  text: string;
  model?: string;
}

/** POST to the workspace chat stream and dispatch parsed SSE events. Resolves
 * when the stream ends (naturally, on error, or on abort). */
export async function streamChat(
  workspaceId: string,
  body: ChatStreamBody,
  handlers: ChatStreamHandlers,
  signal?: AbortSignal
): Promise<void> {
  const auth = await authHeaders();
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/workspaces/${workspaceId}/chat/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream', ...auth },
      body: JSON.stringify(body),
      signal,
    });
  } catch (e) {
    if ((e as Error).name === 'AbortError') return;
    handlers.onError?.((e as Error).message);
    return;
  }

  if (!res.ok || !res.body) {
    handlers.onError?.(`${res.status} ${res.statusText}`);
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  const dispatch = (raw: string) => {
    // An SSE event may span multiple `data:` lines; join their payloads.
    const data = raw
      .split('\n')
      .filter((l) => l.startsWith('data:'))
      .map((l) => l.slice(5).trim())
      .join('\n');
    if (!data) return;
    let ev: {
      type: string;
      messageId?: string;
      conversationId?: string;
      text?: string;
      citations?: Citation[];
      status?: ChatStatus;
      tokenCount?: number;
      generationId?: string;
      message?: string;
    };
    try {
      ev = JSON.parse(data);
    } catch {
      return;
    }
    switch (ev.type) {
      case 'start':
        handlers.onStart?.({ messageId: ev.messageId!, conversationId: ev.conversationId! });
        break;
      case 'token':
        handlers.onToken?.(ev.text ?? '');
        break;
      case 'citations':
        handlers.onCitations?.(ev.citations ?? []);
        break;
      case 'done':
        handlers.onDone?.({
          status: ev.status ?? 'complete',
          tokenCount: ev.tokenCount,
          generationId: ev.generationId,
        });
        break;
      case 'error':
        handlers.onError?.(ev.message ?? 'stream error');
        break;
    }
  };

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      // Events are separated by a blank line.
      let sep: number;
      while ((sep = buffer.indexOf('\n\n')) !== -1) {
        const chunk = buffer.slice(0, sep);
        buffer = buffer.slice(sep + 2);
        dispatch(chunk);
      }
    }
    if (buffer.trim()) dispatch(buffer);
  } catch (e) {
    if ((e as Error).name !== 'AbortError') handlers.onError?.((e as Error).message);
  }
}
