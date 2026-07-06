/**
 * Low-level SSE consumer for the note AI completion endpoint. Mirrors
 * chatStream.ts but is stateless (no conversation/citations) — it streams a
 * plain token completion the editor inserts inline. Used for both the AI command
 * menu and Copilot-style "continue writing".
 */
import { API_BASE } from './client';
import { authHeaders } from './auth';

export interface CompleteStreamBody {
  /** 'command' runs an instruction over optional context; 'continue' extends the
   * given prefix. */
  mode: 'command' | 'continue';
  prompt?: string;
  context?: string;
  model?: string;
}

export interface CompleteStreamHandlers {
  onToken?: (text: string) => void;
  onDone?: () => void;
  onError?: (message: string) => void;
}

/** POST to the workspace completion stream and dispatch parsed SSE token events.
 * Resolves when the stream ends (naturally, on error, or on abort). */
export async function streamComplete(
  workspaceId: string,
  body: CompleteStreamBody,
  handlers: CompleteStreamHandlers,
  signal?: AbortSignal
): Promise<void> {
  const auth = await authHeaders();
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/workspaces/${workspaceId}/complete/stream`, {
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
    const data = raw
      .split('\n')
      .filter((l) => l.startsWith('data:'))
      .map((l) => l.slice(5).trim())
      .join('\n');
    if (!data) return;
    let ev: { type: string; text?: string; message?: string };
    try {
      ev = JSON.parse(data);
    } catch {
      return;
    }
    switch (ev.type) {
      case 'token':
        handlers.onToken?.(ev.text ?? '');
        break;
      case 'done':
        handlers.onDone?.();
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
