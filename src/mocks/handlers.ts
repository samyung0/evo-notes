import type {
  Chapter,
  Deck,
  Flashcard,
  GenerateOptions,
  Material,
  MaterialRef,
  MaterialRefType,
  Question,
  Quiz,
  SearchResult,
  SourceFile,
  Tag,
  TagInput,
  Task,
  UserColor,
  Workspace,
} from '@/api/types';
import { isKnown, newSrsState } from '@/lib/srs';
import { flashcardsMarkdown, parseFlashcardsBlock, quizMarkdown } from '@/features/materials/blocks';
import { delay, http, HttpResponse } from 'msw';
import * as db from './db';
import { uid } from './db';

/** Map a material's storage kind to the legacy left-panel ref type. */
const refType = (kind: Material['kind']): MaterialRefType => (kind === 'flashcards' ? 'deck' : kind);

const latency = () => delay(180 + Math.random() * 220);

/** Resolve incoming tag refs against the catalog: reuse by id (preserving the
 * row), else match by value, else create a new catalog entry. Mirrors the
 * backend's resolveTag + syncEntityTags so dev mode matches prod behavior. */
function resolveTags(kind: string, refs: TagInput[] | null | undefined): Tag[] {
  const out: Tag[] = [];
  const seen = new Set<string>();
  for (const r of refs ?? []) {
    const value = (r.value ?? '').trim();
    if (!value) continue;
    let entry = r.id ? db.tagCatalog.find((t) => t.id === r.id && t.kind === kind) : undefined;
    if (!entry)
      entry = db.tagCatalog.find(
        (t) => t.kind === kind && t.value.toLowerCase() === value.toLowerCase()
      );
    if (!entry) {
      entry = { id: uid('tag'), kind, value };
      db.tagCatalog.push(entry);
    }
    if (seen.has(entry.id)) continue;
    seen.add(entry.id);
    out.push({ id: entry.id, value: entry.value });
  }
  return out;
}

function sortWorkspaces(list: Workspace[], sort: string | null): Workspace[] {
  const copy = [...list];
  switch (sort) {
    case 'created':
      return copy.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
    case 'chapters':
      return copy.sort((a, b) => b.chapterCount - a.chapterCount);
    case 'files':
      return copy.sort((a, b) => b.fileCount - a.fileCount);
    case 'accessed':
    default:
      return copy.sort((a, b) => +new Date(b.lastAccessedAt) - +new Date(a.lastAccessedAt));
  }
}

export const handlers = [
  /* ---------------- me ---------------- */
  http.get('/api/me', async () => {
    await latency();
    return HttpResponse.json(db.user);
  }),

  /* ---------------- global search ---------------- */
  http.get('/api/search', async ({ request }) => {
    await latency();
    const q = (new URL(request.url).searchParams.get('q') ?? '').toLowerCase().trim();
    if (!q) return HttpResponse.json([] as SearchResult[]);
    const results: SearchResult[] = [];
    for (const w of db.workspaces)
      if (w.name.toLowerCase().includes(q) || w.tags.some((t) => t.value.toLowerCase().includes(q)))
        results.push({
          id: w.id,
          kind: 'workspace',
          title: w.name,
          subtitle: w.tags.map((t) => t.value).join(' · '),
          href: `/workspaces/${w.id}`,
          color: w.color,
        });
    for (const f of db.files)
      if (f.name.toLowerCase().includes(q)) {
        const ws = db.workspaces.find((w) => w.id === f.workspaceId);
        results.push({
          id: f.id,
          kind: 'file',
          title: f.name,
          subtitle: ws?.name,
          href: `/workspaces/${f.workspaceId}?file=${f.id}`,
          color: ws?.color,
        });
      }
    for (const e of db.events)
      if (e.title.toLowerCase().includes(q))
        results.push({
          id: e.id,
          kind: 'event',
          title: e.title,
          subtitle: e.location,
          href: '/schedule',
          color: db.labels.find((l) => l.id === e.labelIds[0])?.color,
        });
    for (const mt of db.deckMaterials())
      if (mt.title.toLowerCase().includes(q))
        results.push({
          id: mt.id,
          kind: 'flashcards',
          title: mt.title,
          subtitle: mt.workspaceName,
          href: `/flashcards/${mt.id}`,
          color: mt.color,
        });
    for (const c of db.canvases)
      if (c.name.toLowerCase().includes(q))
        results.push({
          id: c.id,
          kind: 'thinking',
          title: c.name,
          href: `/thinking/${c.id}`,
        });
    return HttpResponse.json(results.slice(0, 20));
  }),

  /* ---------------- notifications ---------------- */
  http.get('/api/notifications', async () => {
    await latency();
    return HttpResponse.json(db.notifications);
  }),
  http.post('/api/notifications/read', async () => {
    db.notifications.forEach((n) => (n.read = true));
    return new HttpResponse(null, { status: 204 });
  }),

  /* ---------------- tags ---------------- */
  http.get('/api/tags', async ({ request }) => {
    await latency();
    const kind = new URL(request.url).searchParams.get('kind') ?? 'workspace';
    const list = db.tagCatalog
      .filter((t) => t.kind === kind)
      .map((t) => ({ id: t.id, value: t.value }))
      .sort((a, b) => a.value.localeCompare(b.value));
    return HttpResponse.json(list as Tag[]);
  }),

  /* ---------------- workspaces ---------------- */
  // TODO response/request/schema model is different
  http.get('/api/workspaces', async ({ request }) => {
    await latency();
    const url = new URL(request.url);
    const q = (url.searchParams.get('q') ?? '').toLowerCase().trim();
    const color = url.searchParams.get('color');
    const tag = url.searchParams.get('tag');
    const sort = url.searchParams.get('sort');
    let list = [...db.workspaces];
    if (q)
      list = list.filter(
        (w) =>
          w.name.toLowerCase().includes(q) || w.tags.some((t) => t.value.toLowerCase().includes(q))
      );
    if (color) list = list.filter((w) => w.color === color);
    if (tag) list = list.filter((w) => w.tags.some((t) => t.value === tag));
    return HttpResponse.json(sortWorkspaces(list, sort));
  }),
  http.get('/api/workspaces/:id', async ({ params }) => {
    await latency();
    const ws = db.workspaces.find((w) => w.id === params.id);
    if (!ws) return new HttpResponse(null, { status: 404 });
    ws.lastAccessedAt = new Date().toISOString();
    return HttpResponse.json(ws);
  }),
  http.get('/api/workspaces/:id/stats', async ({ params }) => {
    await latency();
    const ws = db.workspaces.find((w) => w.id === params.id);
    if (!ws) return new HttpResponse(null, { status: 404 });
    const wsQuizIds = new Set(db.quizMaterials().filter((m) => m.workspaceId === ws.id).map((m) => m.id));
    const att = db.attempts.filter((a) => wsQuizIds.has(a.quizId));
    const avg = att.length ? Math.round(att.reduce((s, a) => s + a.pct, 0) / att.length) : 0;
    return HttpResponse.json({
      chapters: ws.chapterCount,
      files: ws.fileCount,
      quizzes: wsQuizIds.size,
      attempts: att.length,
      avgScore: avg,
    });
  }),
  http.post('/api/workspaces', async ({ request }) => {
    const body = (await request.json()) as Partial<Workspace> & { tags?: TagInput[] };
    const ws: Workspace = {
      id: uid('ws'),
      name: body.name ?? 'Untitled workspace',
      color: (body.color as UserColor) ?? 'green',
      privacy: body.privacy ?? 'private',
      tags: resolveTags('workspace', body.tags),
      chapterCount: 0,
      fileCount: 0,
      createdAt: new Date().toISOString(),
      lastAccessedAt: new Date().toISOString(),
    };
    db.workspaces.unshift(ws);
    return HttpResponse.json(ws, { status: 201 });
  }),
  http.patch('/api/workspaces/:id', async ({ params, request }) => {
    const ws = db.workspaces.find((w) => w.id === params.id);
    if (!ws) return new HttpResponse(null, { status: 404 });
    const body = (await request.json()) as Partial<Workspace> & { tags?: TagInput[] };
    if (body.tags !== undefined) ws.tags = resolveTags('workspace', body.tags);
    const { tags: _tags, ...rest } = body;
    Object.assign(ws, rest);
    return HttpResponse.json(ws);
  }),
  http.delete('/api/workspaces/:id', async ({ params }) => {
    const i = db.workspaces.findIndex((w) => w.id === params.id);
    if (i >= 0) db.workspaces.splice(i, 1);
    return new HttpResponse(null, { status: 204 });
  }),

  /* ---------------- chapters & files ---------------- */
  http.get('/api/workspaces/:id/chapters', async ({ params }) => {
    await latency();
    return HttpResponse.json(
      db.chapters.filter((c) => c.workspaceId === params.id).sort((a, b) => a.order - b.order)
    );
  }),
  http.post('/api/workspaces/:id/chapters', async ({ params, request }) => {
    const body = (await request.json()) as { name: string };
    const order = db.chapters.filter((c) => c.workspaceId === params.id).length;
    const ch: Chapter = {
      id: uid('ch'),
      workspaceId: String(params.id),
      name: body.name,
      order,
      fileIds: [],
    };
    db.chapters.push(ch);
    const ws = db.workspaces.find((w) => w.id === params.id);
    if (ws) ws.chapterCount += 1;
    return HttpResponse.json(ch, { status: 201 });
  }),
  http.patch('/api/chapters/:id', async ({ params, request }) => {
    const ch = db.chapters.find((c) => c.id === params.id);
    if (!ch) return new HttpResponse(null, { status: 404 });
    Object.assign(ch, await request.json());
    return HttpResponse.json(ch);
  }),
  http.post('/api/workspaces/:id/chapters/reorder', async ({ request }) => {
    const body = (await request.json()) as { ids: string[] };
    body.ids.forEach((id, idx) => {
      const ch = db.chapters.find((c) => c.id === id);
      if (ch) ch.order = idx;
    });
    return new HttpResponse(null, { status: 204 });
  }),
  http.delete('/api/chapters/:id', async ({ params }) => {
    const i = db.chapters.findIndex((c) => c.id === params.id);
    if (i >= 0) {
      // keep files — just unfile them
      db.files.forEach((f) => {
        if (f.chapterId === params.id) f.chapterId = null;
      });
      db.chapters.splice(i, 1);
    }
    return new HttpResponse(null, { status: 204 });
  }),
  http.get('/api/files', async () => {
    await latency();
    return HttpResponse.json(db.files);
  }),
  http.get('/api/workspaces/:id/files', async ({ params }) => {
    await latency();
    return HttpResponse.json(db.files.filter((f) => f.workspaceId === params.id));
  }),
  http.get('/api/files/:id', async ({ params }) => {
    await latency();
    const f = db.files.find((x) => x.id === params.id);
    return f ? HttpResponse.json(f) : new HttpResponse(null, { status: 404 });
  }),
  http.patch('/api/files/:id', async ({ params, request }) => {
    const f = db.files.find((x) => x.id === params.id);
    if (!f) return new HttpResponse(null, { status: 404 });
    const body = (await request.json()) as Partial<Pick<SourceFile, 'name' | 'chapterId'>>;
    if (body.name !== undefined) f.name = body.name;
    if (body.chapterId !== undefined) {
      // Empty-string sentinel unfiles (mirrors the Go gateway).
      const next = body.chapterId === '' ? null : body.chapterId;
      for (const c of db.chapters) c.fileIds = c.fileIds.filter((id) => id !== f.id);
      f.chapterId = next;
      if (next) db.chapters.find((c) => c.id === next)?.fileIds.push(f.id);
    }
    return HttpResponse.json(f);
  }),
  http.delete('/api/files/:id', async ({ params }) => {
    const i = db.files.findIndex((x) => x.id === params.id);
    if (i >= 0) {
      const [removed] = db.files.splice(i, 1);
      const ws = db.workspaces.find((w) => w.id === removed.workspaceId);
      if (ws) ws.fileCount = Math.max(0, ws.fileCount - 1);
      for (const ch of db.chapters) ch.fileIds = ch.fileIds.filter((id) => id !== removed.id);
    }
    return new HttpResponse(null, { status: 204 });
  }),

  /* ---------------- study materials ---------------- */
  http.get('/api/workspaces/:id/materials', async ({ params }) => {
    await latency();
    const wsId = String(params.id);
    const refs: MaterialRef[] = db.materials
      .filter((mt) => mt.workspaceId === wsId)
      .map((mt) => ({
        id: mt.id,
        type: refType(mt.kind),
        title: mt.title,
        chapterId: mt.chapterId ?? null,
        createdAt: mt.createdAt,
      }))
      .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
    return HttpResponse.json(refs);
  }),
  http.post('/api/workspaces/:id/materials', async ({ params, request }) => {
    await latency();
    const wsId = String(params.id);
    const ws = db.workspaces.find((w) => w.id === wsId);
    const body = (await request.json().catch(() => ({}))) as {
      kind?: Material['kind'];
      title?: string;
      content?: string;
      scopeChapters?: string[];
      scopeFileIds?: string[];
    };
    const mt: Material = {
      id: uid('mat'),
      workspaceId: wsId,
      workspaceName: ws?.name ?? '',
      kind: body.kind ?? 'note',
      title: body.title || 'Untitled note',
      content: body.content ?? '',
      chapterId: null,
      scopeChapters: body.scopeChapters ?? [],
      scopeFileIds: body.scopeFileIds ?? [],
      privacy: 'private',
      createdAt: new Date().toISOString(),
    };
    db.materials.unshift(mt);
    return HttpResponse.json(mt, { status: 201 });
  }),
  http.get('/api/materials/:id', async ({ params }) => {
    await latency();
    const mt = db.materials.find((x) => x.id === params.id);
    return mt ? HttpResponse.json(mt) : new HttpResponse(null, { status: 404 });
  }),
  http.patch('/api/materials/:id', async ({ params, request }) => {
    await latency();
    const mt = db.materials.find((x) => x.id === params.id);
    if (!mt) return new HttpResponse(null, { status: 404 });
    const body = (await request.json().catch(() => ({}))) as {
      title?: string;
      content?: string;
      chapterId?: string;
      scopeChapters?: string[];
      scopeFileIds?: string[];
    };
    if (body.title != null) mt.title = body.title;
    if (body.content != null) mt.content = body.content;
    // Empty-string sentinel unfiles; a real id files it; omitted leaves it.
    if (body.chapterId != null) mt.chapterId = body.chapterId === '' ? null : body.chapterId;
    if (body.scopeChapters != null) mt.scopeChapters = body.scopeChapters;
    if (body.scopeFileIds != null) mt.scopeFileIds = body.scopeFileIds;
    return HttpResponse.json(mt);
  }),
  http.delete('/api/materials/:id', async ({ params }) => {
    const i = db.materials.findIndex((x) => x.id === params.id);
    if (i >= 0) db.materials.splice(i, 1);
    return new HttpResponse(null, { status: 204 });
  }),
  http.post('/api/workspaces/:id/sources', async ({ params, request }) => {
    await delay(500);
    // Real uploads are multipart (file bytes); fall back to JSON for any
    // legacy/metadata-only callers.
    let name = '';
    let kind: SourceKindFix = 'pdf';
    let chapterId: string | null = null;
    const ct = request.headers.get('content-type') ?? '';
    if (ct.includes('multipart/form-data')) {
      const form = await request.formData();
      const file = form.get('file');
      name = String(form.get('name') || (file instanceof File ? file.name : '') || 'Untitled');
      kind = (String(form.get('kind') || '') || 'pdf') as SourceKindFix;
      chapterId = (form.get('chapterId') as string) || null;
    } else {
      const body = (await request.json()) as {
        name: string;
        kind: SourceKindFix;
        chapterId?: string | null;
      };
      name = body.name;
      kind = body.kind ?? 'pdf';
      chapterId = body.chapterId ?? null;
    }
    const f: (typeof db.files)[number] = {
      id: uid('f'),
      workspaceId: String(params.id),
      chapterId,
      name,
      kind,
      sizeKb: Math.round(200 + Math.random() * 3000),
      addedAt: new Date().toISOString(),
      // Mirror the real backend: uploads start 'processing' and the client
      // animates progress (useUploadSource) before flipping to 'ready'.
      status: 'processing',
    };
    db.files.push(f);
    const ws = db.workspaces.find((w) => w.id === params.id);
    if (ws) ws.fileCount += 1;
    if (f.chapterId) db.chapters.find((c) => c.id === f.chapterId)?.fileIds.push(f.id);
    // Eventually mark ready so later refetches reflect a finished ingest.
    setTimeout(() => {
      f.status = 'ready';
    }, 2600);
    return HttpResponse.json(f, { status: 201 });
  }),

  /* ---------------- chat & generate ---------------- */
  http.post('/api/workspaces/:id/chat', async ({ request }) => {
    await delay(700);
    const body = (await request.json()) as { text: string };
    const sources = db.files.slice(0, 2);
    return HttpResponse.json({
      id: uid('m'),
      role: 'assistant',
      text: `Based on your sources, ${body.text.replace(/\?$/, '')} relates to the key ideas in your materials. In short: the cell membrane regulates transport, and energy is produced in the mitochondria.`,
      citations: sources.map((f) => ({
        fileId: f.id,
        fileName: f.name,
        snippet: 'Relevant passage from your source…',
      })),
    });
  }),

  /* ---------------- conversations ---------------- */
  http.get('/api/workspaces/:id/conversations', async ({ params }) => {
    await latency();
    const list = db.conversations
      .filter((c) => c.workspaceId === params.id)
      .sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt));
    return HttpResponse.json(list);
  }),
  http.post('/api/workspaces/:id/conversations', async ({ params, request }) => {
    await latency();
    const body = (await request.json().catch(() => ({}))) as { title?: string };
    const now = new Date().toISOString();
    const conv = {
      id: uid('conv'),
      workspaceId: params.id as string,
      title: body.title ?? '',
      createdAt: now,
      updatedAt: now,
    };
    db.conversations.push(conv);
    return HttpResponse.json(conv, { status: 201 });
  }),
  http.get('/api/conversations/:id/messages', async ({ params }) => {
    await latency();
    const list = db.chatMessages.filter(
      (msg) => msg.conversationId === params.id && msg.status !== 'streaming'
    );
    return HttpResponse.json(list);
  }),
  http.delete('/api/conversations/:id', async ({ params }) => {
    await latency();
    const i = db.conversations.findIndex((c) => c.id === params.id);
    if (i >= 0) db.conversations.splice(i, 1);
    for (let j = db.chatMessages.length - 1; j >= 0; j--) {
      if (db.chatMessages[j].conversationId === params.id) db.chatMessages.splice(j, 1);
    }
    return new HttpResponse(null, { status: 204 });
  }),

  /* ---------------- chat streaming (SSE) ----------------
     Mirrors the Go gateway: persists the user turn, streams the answer
     token-by-token as `data: {type,...}` events, then saves the assistant
     turn. Honors the client AbortController so Stop works in dev. */
  http.post('/api/workspaces/:id/chat/stream', async ({ params, request }) => {
    const body = (await request.json()) as { conversationId?: string; text: string };
    const now = new Date().toISOString();

    let conv = body.conversationId
      ? db.conversations.find((c) => c.id === body.conversationId)
      : undefined;
    if (!conv) {
      conv = {
        id: uid('conv'),
        workspaceId: params.id as string,
        title: '',
        createdAt: now,
        updatedAt: now,
      };
      db.conversations.push(conv);
    }
    if (!conv.title) conv.title = body.text.slice(0, 60);
    db.chatMessages.push({
      id: uid('m'),
      conversationId: conv.id,
      role: 'user',
      content: body.text,
      status: 'complete',
      citations: null,
      createdAt: now,
    });

    const convId = conv.id;
    const assistantId = uid('m');
    const citations = db.files.slice(0, 2).map((f) => ({
      fileId: f.id,
      fileName: f.name,
      snippet: 'Relevant passage from your source…',
    }));
    const answer =
      `Based on your sources, **${body.text.replace(/\?$/, '')}** connects to the key ideas in your materials.\n\n` +
      '- The cell membrane regulates transport\n' +
      '- Energy is produced in the **mitochondria**\n' +
      '- Genetic information lives in the nucleus';
    const words = answer.split(' ');

    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const send = (o: unknown) =>
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(o)}\n\n`));
        send({ type: 'start', messageId: assistantId, conversationId: convId });
        await delay(120);
        send({ type: 'citations', citations });
        let acc = '';
        for (const w of words) {
          if (request.signal.aborted) break;
          await delay(35);
          acc += w + ' ';
          send({ type: 'token', text: w + ' ' });
        }
        const aborted = request.signal.aborted;
        db.chatMessages.push({
          id: assistantId,
          conversationId: convId,
          role: 'assistant',
          content: acc.trim(),
          status: aborted ? 'aborted' : 'complete',
          citations,
          createdAt: new Date().toISOString(),
        });
        conv!.updatedAt = new Date().toISOString();
        if (!aborted) send({ type: 'done', status: 'complete', tokenCount: words.length });
        controller.close();
      },
    });
    return new HttpResponse(stream, {
      headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
    });
  }),

  http.post('/api/workspaces/:id/complete/stream', async ({ request }) => {
    const body = (await request.json().catch(() => ({}))) as {
      mode?: 'command' | 'continue';
      prompt?: string;
    };
    const text =
      body.mode === 'continue'
        ? ' and this continues the thought with a few more grounded sentences drawn from your notes.'
        : `Here is an AI response${body.prompt ? ` to "${body.prompt}"` : ''}: the key ideas are summarized clearly and concisely for study.`;
    const words = text.split(' ');
    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const send = (o: unknown) =>
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(o)}\n\n`));
        for (const w of words) {
          if (request.signal.aborted) break;
          await delay(40);
          send({ type: 'token', text: w + ' ' });
        }
        if (!request.signal.aborted) send({ type: 'done' });
        controller.close();
      },
    });
    return new HttpResponse(stream, {
      headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
    });
  }),

  http.post('/api/transcribe', async () => {
    await delay(600);
    return HttpResponse.json({ text: 'This is a mock voice transcription.' });
  }),

  http.post('/api/workspaces/:id/generate', async ({ params, request }) => {
    await delay(900);
    const opts = (await request.json()) as GenerateOptions;
    const wsId = String(params.id);
    const wsName = db.workspaces.find((w) => w.id === wsId)?.name ?? 'Workspace';
    // Chapters arrive as ids; resolve to names for display + storage parity
    // with the Go backend.
    const scopeChapterNames = opts.chapters
      .map((cid) => db.chapters.find((c) => c.id === cid)?.name)
      .filter(Boolean) as string[];
    // Human-readable scope, for material titles / bodies.
    const scopeFileNames = ('fileIds' in opts ? opts.fileIds : [])
      .map((fid) => db.files.find((f) => f.id === fid)?.name)
      .filter(Boolean) as string[];
    const scopeLabel =
      scopeChapterNames.length || scopeFileNames.length
        ? [...scopeChapterNames, ...scopeFileNames].join(', ')
        : 'the whole workspace';

    if (opts.kind === 'flashcards') {
      // Persist a flashcards markdown material; per-card FSRS lives in cardStats.
      const id = uid('dk');
      const name = `${wsName} flashcards`;
      const cardContents = Array.from({ length: opts.count }, (_, i) => ({
        id: uid('c'),
        front: `Term ${i + 1}`,
        back: `Definition for term ${i + 1}.`,
      }));
      const material: Material = {
        id,
        workspaceId: wsId,
        workspaceName: wsName,
        kind: 'flashcards',
        title: name,
        color: 'green',
        content: flashcardsMarkdown(name, cardContents),
        chapterId: null,
        scopeChapters: scopeChapterNames,
        scopeFileIds: opts.fileIds,
        privacy: 'private',
        createdAt: new Date().toISOString(),
      };
      db.materials.unshift(material);
      for (const c of cardContents)
        db.cardStats[c.id] = { materialId: id, srs: newSrsState(), known: false };
      return HttpResponse.json({
        kind: 'flashcards',
        deck: db.deckFromMaterial(material),
        cards: db.cardsFromMaterial(material),
      });
    }

    if (opts.kind === 'mindmap' || opts.kind === 'diagram') {
      const material: Material = {
        id: uid('mat'),
        workspaceId: wsId,
        workspaceName: wsName,
        kind: opts.kind,
        title: `${wsName} ${opts.kind}`,
        content:
          opts.kind === 'mindmap'
            ? [
                `# ${wsName} mindmap`,
                '',
                `Generated from ${scopeLabel}.`,
                '',
                '```mermaid',
                'mindmap',
                '  root((Topic))',
                '    Key idea A',
                '      Detail 1',
                '      Detail 2',
                '    Key idea B',
                '      Detail 3',
                '```',
              ].join('\n')
            : [
                `# ${wsName} diagram`,
                '',
                `Generated from ${scopeLabel}.`,
                '',
                '```mermaid',
                'flowchart LR',
                '  A[Start] --> B[Process]',
                '  B --> C{Decision}',
                '  C -->|Yes| D[Outcome 1]',
                '  C -->|No| E[Outcome 2]',
                '```',
              ].join('\n'),
        chapterId: null,
        scopeChapters: scopeChapterNames,
        scopeFileIds: opts.fileIds,
        privacy: 'private',
        createdAt: new Date().toISOString(),
      };
      db.materials.unshift(material);
      return HttpResponse.json({ kind: opts.kind, material });
    }

    // quiz
    const qs: Question[] = Array.from({ length: opts.count }, (_, i) => {
      const type = opts.types[i % opts.types.length] ?? 'mcq';
      const level = opts.levels[i % opts.levels.length] ?? 'application';
      const base = {
        id: uid('q'),
        level,
        prompt: `Generated ${type} question ${i + 1}?`,
      };
      switch (type) {
        case 'boolean':
          return {
            ...base,
            type: 'boolean',
            correct: true,
            explanation: 'This statement is true based on your sources.',
          } as Question;
        case 'fill':
        case 'short':
          return {
            ...base,
            type,
            accepted: [{ value: 'answer' }],
            explanation: 'The accepted answer follows from the source material.',
          } as Question;
        case 'ordering':
          return {
            ...base,
            type: 'ordering',
            items: [{ value: 'First' }, { value: 'Second' }, { value: 'Third' }],
          } as Question;
        case 'matching':
          return {
            ...base,
            type: 'matching',
            pairs: [
              { left: 'A', right: '1' },
              { left: 'B', right: '2' },
            ],
          } as Question;
        case 'multi':
          return {
            ...base,
            type: 'multi',
            options: [
              { value: 'A', explanation: 'Correct — supported by the material.' },
              { value: 'B', explanation: 'Incorrect for this question.' },
              { value: 'C', explanation: 'Correct — also supported.' },
              { value: 'D', explanation: 'Incorrect for this question.' },
            ],
            correct: [0, 2],
          } as Question;
        default:
          return {
            ...base,
            type: 'mcq',
            options: [
              { value: 'A', explanation: 'Correct — this is the best answer.' },
              { value: 'B', explanation: 'Incorrect — a common distractor.' },
              { value: 'C', explanation: 'Incorrect for this question.' },
              { value: 'D', explanation: 'Incorrect for this question.' },
            ],
            correct: [0],
          } as Question;
      }
    });
    const name = `${wsName} quiz`;
    const quizMat: Material = {
      id: uid('qz'),
      workspaceId: wsId,
      workspaceName: wsName,
      kind: 'quiz',
      title: name,
      content: quizMarkdown(name, { questions: qs, timeLimitMin: opts.timeLimitMin }),
      chapterId: null,
      scopeChapters: scopeChapterNames,
      scopeFileIds: opts.fileIds,
      privacy: 'private',
      createdAt: new Date().toISOString(),
    };
    db.materials.unshift(quizMat);
    return HttpResponse.json({ kind: 'quiz', quiz: db.quizFromMaterial(quizMat) });
  }),

  /* ---------------- quizzes & attempts ---------------- */
  http.get('/api/quizzes', async () => {
    await latency();
    return HttpResponse.json(db.quizMaterials().map(db.quizFromMaterial));
  }),
  http.post('/api/quizzes', async ({ request }) => {
    const body = (await request.json()) as Partial<Quiz>;
    const ws = db.workspaces.find((w) => w.id === body.workspaceId) ?? db.workspaces[0];
    const name = body.name ?? 'Untitled quiz';
    const material: Material = {
      id: uid('qz'),
      workspaceId: body.workspaceId ?? ws?.id ?? '',
      workspaceName: ws?.name ?? '',
      kind: 'quiz',
      title: name,
      content: quizMarkdown(name, {
        questions: body.questions ?? [],
        timeLimitMin: body.timeLimitMin,
      }),
      chapterId: null,
      scopeChapters: body.chapters ?? [],
      scopeFileIds: [],
      privacy: body.privacy ?? 'private',
      createdAt: new Date().toISOString(),
    };
    db.materials.unshift(material);
    return HttpResponse.json(db.quizFromMaterial(material), { status: 201 });
  }),
  /** Ad-hoc quiz built from the recently-missed question pool. */
  http.get('/api/mistakes', async () => {
    await latency();
    const quiz: Quiz = {
      id: 'review_mistakes',
      name: 'Review mistakes',
      workspaceId: '',
      workspaceName: 'From your missed questions',
      chapters: [],
      questions: db.mistakes,
      createdAt: new Date().toISOString(),
      privacy: 'private',
    };
    return HttpResponse.json(quiz);
  }),
  http.get('/api/quizzes/:id', async ({ params }) => {
    await latency();
    if (params.id === 'review_mistakes') {
      return HttpResponse.json({
        id: 'review_mistakes',
        name: 'Review mistakes',
        workspaceId: '',
        workspaceName: 'From your missed questions',
        chapters: [],
        questions: db.mistakes,
        createdAt: new Date().toISOString(),
        privacy: 'private',
      } satisfies Quiz);
    }
    const mt = db.materials.find((x) => x.id === params.id && x.kind === 'quiz');
    return mt ? HttpResponse.json(db.quizFromMaterial(mt)) : new HttpResponse(null, { status: 404 });
  }),
  http.patch('/api/quizzes/:id', async ({ params, request }) => {
    const mt = db.materials.find((x) => x.id === params.id && x.kind === 'quiz');
    if (!mt) return new HttpResponse(null, { status: 404 });
    const body = (await request.json()) as Partial<Quiz>;
    const cur = db.quizFromMaterial(mt);
    const name = body.name ?? cur.name;
    const chapters = body.chapters ?? cur.chapters;
    const questions = body.questions ?? cur.questions;
    const timeLimitMin = body.timeLimitMin ?? cur.timeLimitMin;
    if (body.privacy !== undefined) mt.privacy = body.privacy;
    mt.title = name;
    mt.scopeChapters = chapters;
    mt.content = quizMarkdown(name, { questions, timeLimitMin });
    return HttpResponse.json(db.quizFromMaterial(mt));
  }),
  http.delete('/api/quizzes/:id', async ({ params }) => {
    const i = db.materials.findIndex((x) => x.id === params.id && x.kind === 'quiz');
    if (i >= 0) db.materials.splice(i, 1);
    return new HttpResponse(null, { status: 204 });
  }),
  http.get('/api/attempts', async () => {
    await latency();
    return HttpResponse.json(
      [...db.attempts].sort((a, b) => +new Date(b.takenAt) - +new Date(a.takenAt))
    );
  }),
  http.get('/api/attempts/:id', async ({ params }) => {
    await latency();
    const at = db.attempts.find((a) => a.id === params.id);
    if (!at) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json({
      ...at,
      answers: at.answers ?? {},
      questions: at.questions ?? [],
    });
  }),
  http.post('/api/quizzes/:id/attempts', async ({ params, request }) => {
    const body = (await request.json()) as {
      correct: number;
      total: number;
      wrong?: Question[];
      answers?: Record<string, unknown>;
      questions?: Question[];
    };
    const quizMt = db.materials.find((x) => x.id === params.id && x.kind === 'quiz');
    const quiz = quizMt ? db.quizFromMaterial(quizMt) : undefined;
    // Fold any missed questions into the review-mistakes pool (deduped by id).
    if (body.wrong?.length) {
      for (const q of body.wrong) {
        const i = db.mistakes.findIndex((m) => m.id === q.id);
        if (i >= 0) db.mistakes[i] = q;
        else db.mistakes.push(q);
      }
    }
    // Correctly answered review-mistakes questions leave the pool.
    if (params.id === 'review_mistakes') {
      const wrongIds = new Set((body.wrong ?? []).map((q) => q.id));
      for (let i = db.mistakes.length - 1; i >= 0; i--) {
        if (!wrongIds.has(db.mistakes[i].id)) db.mistakes.splice(i, 1);
      }
    }
    const at = {
      id: uid('at'),
      quizId: String(params.id),
      quizName: quiz?.name ?? 'Quiz',
      workspaceName: quiz?.workspaceName ?? '',
      chapters: quiz?.chapters ?? [],
      correct: body.correct,
      total: body.total,
      pct: Math.round((body.correct / Math.max(1, body.total)) * 100),
      takenAt: new Date().toISOString(),
      answers: body.answers ?? {},
      questions: body.questions ?? [],
    };
    db.attempts.unshift(at);
    return HttpResponse.json(at, { status: 201 });
  }),

  /* ---------------- flashcards ---------------- */
  http.get('/api/decks', async () => {
    await latency();
    return HttpResponse.json(db.deckMaterials().map(db.deckFromMaterial));
  }),
  http.post('/api/decks', async ({ request }) => {
    const body = (await request.json()) as Partial<Deck>;
    const ws = db.workspaces.find((w) => w.id === body.workspaceId);
    const name = body.name ?? 'Untitled deck';
    const material: Material = {
      id: uid('dk'),
      workspaceId: body.workspaceId ?? '',
      workspaceName: ws?.name ?? body.workspaceName ?? '',
      kind: 'flashcards',
      title: name,
      color: body.color ?? 'green',
      content: flashcardsMarkdown(name, []),
      chapterId: null,
      scopeChapters: [],
      scopeFileIds: [],
      privacy: 'private',
      createdAt: new Date().toISOString(),
    };
    db.materials.unshift(material);
    return HttpResponse.json(db.deckFromMaterial(material), { status: 201 });
  }),
  http.get('/api/decks/:id', async ({ params }) => {
    await latency();
    const mt = db.materials.find((x) => x.id === params.id && x.kind === 'flashcards');
    return mt ? HttpResponse.json(db.deckFromMaterial(mt)) : new HttpResponse(null, { status: 404 });
  }),
  http.get('/api/decks/:id/cards', async ({ params }) => {
    await latency();
    const mt = db.materials.find((x) => x.id === params.id && x.kind === 'flashcards');
    return mt ? HttpResponse.json(db.cardsFromMaterial(mt)) : new HttpResponse(null, { status: 404 });
  }),
  http.post('/api/decks/:id/cards', async ({ params, request }) => {
    const mt = db.materials.find((x) => x.id === params.id && x.kind === 'flashcards');
    if (!mt) return new HttpResponse(null, { status: 404 });
    const body = (await request.json()) as { front: string; back: string };
    const id = uid('c');
    const cards = parseFlashcardsBlock(mt.content).cards;
    cards.push({ id, front: body.front ?? '', back: body.back ?? '' });
    mt.content = flashcardsMarkdown(mt.title, cards);
    db.cardStats[id] = { materialId: mt.id, srs: newSrsState(), known: false };
    return HttpResponse.json(db.cardsFromMaterial(mt).find((c) => c.id === id)!, { status: 201 });
  }),
  http.patch('/api/cards/:id', async ({ params, request }) => {
    const stat = db.cardStats[String(params.id)];
    if (!stat) return new HttpResponse(null, { status: 404 });
    const mt = db.materials.find((x) => x.id === stat.materialId && x.kind === 'flashcards');
    if (!mt) return new HttpResponse(null, { status: 404 });
    const body = (await request.json()) as Partial<Pick<Flashcard, 'front' | 'back' | 'known' | 'srs'>>;
    if (body.front !== undefined || body.back !== undefined) {
      const cards = parseFlashcardsBlock(mt.content).cards;
      const card = cards.find((c) => c.id === params.id);
      if (card) {
        if (body.front !== undefined) card.front = body.front;
        if (body.back !== undefined) card.back = body.back;
        mt.content = flashcardsMarkdown(mt.title, cards);
      }
    }
    if (body.srs !== undefined) stat.srs = body.srs;
    if (body.known !== undefined) stat.known = body.known;
    else if (body.srs !== undefined) stat.known = isKnown(body.srs);
    const cards = db.cardsFromMaterial(mt);
    const out = cards.find((c) => c.id === params.id);
    return out ? HttpResponse.json(out) : new HttpResponse(null, { status: 404 });
  }),
  http.delete('/api/cards/:id', async ({ params }) => {
    const stat = db.cardStats[String(params.id)];
    if (!stat) return new HttpResponse(null, { status: 404 });
    const mt = db.materials.find((x) => x.id === stat.materialId && x.kind === 'flashcards');
    if (!mt) return new HttpResponse(null, { status: 404 });
    const kept = parseFlashcardsBlock(mt.content).cards.filter((c) => c.id !== params.id);
    mt.content = flashcardsMarkdown(mt.title, kept);
    delete db.cardStats[String(params.id)];
    return new HttpResponse(null, { status: 204 });
  }),

  /* ---------------- schedule ---------------- */
  http.get('/api/events', async () => {
    await latency();
    return HttpResponse.json(db.events);
  }),
  http.post('/api/events', async ({ request }) => {
    const body = (await request.json()) as Omit<(typeof db.events)[number], 'id'>;
    const ev = { ...body, id: uid('ev') };
    db.events.push(ev);
    return HttpResponse.json(ev, { status: 201 });
  }),
  http.patch('/api/events/:id', async ({ params, request }) => {
    const ev = db.events.find((x) => x.id === params.id);
    if (!ev) return new HttpResponse(null, { status: 404 });
    Object.assign(ev, await request.json());
    return HttpResponse.json(ev);
  }),
  http.delete('/api/events/:id', async ({ params }) => {
    const i = db.events.findIndex((x) => x.id === params.id);
    if (i >= 0) db.events.splice(i, 1);
    return new HttpResponse(null, { status: 204 });
  }),
  http.get('/api/labels', async () => {
    await latency();
    return HttpResponse.json(db.labels);
  }),
  http.patch('/api/labels/:id', async ({ params, request }) => {
    const label = db.labels.find((x) => x.id === params.id);
    if (!label) return new HttpResponse(null, { status: 404 });
    Object.assign(label, await request.json());
    return HttpResponse.json(label);
  }),
  http.delete('/api/labels/:id', async ({ params }) => {
    const i = db.labels.findIndex((x) => x.id === params.id);
    if (i >= 0) db.labels.splice(i, 1);
    // keep events consistent — strip the deleted label from any event.
    for (const ev of db.events) {
      ev.labelIds = ev.labelIds.filter((id) => id !== params.id);
    }
    return new HttpResponse(null, { status: 204 });
  }),

  /* ---------------- tasks ---------------- */
  http.get('/api/tasks', async () => {
    await latency();
    // simulate day-end cleanup: drop tasks completed before today
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const visible = db.tasks.filter((t) => !(t.done && +new Date(t.dueDate) < +startOfToday));
    return HttpResponse.json(visible);
  }),
  http.patch('/api/tasks/:id', async ({ params, request }) => {
    const t = db.tasks.find((x) => x.id === params.id) as Task | undefined;
    if (!t) return new HttpResponse(null, { status: 404 });
    Object.assign(t, await request.json());
    return HttpResponse.json(t);
  }),
  http.delete('/api/tasks/:id', async ({ params }) => {
    await latency();
    const i = db.tasks.findIndex((x) => x.id === params.id);
    if (i >= 0) db.tasks.splice(i, 1);
    return new HttpResponse(null, { status: 204 });
  }),

  /* ---------------- thinking space ---------------- */
  http.get('/api/thinking', async () => {
    await latency();
    return HttpResponse.json(db.canvases);
  }),
  http.get('/api/thinking/:id', async ({ params }) => {
    await latency();
    const c = db.canvases.find((x) => x.id === params.id);
    return c ? HttpResponse.json(c) : new HttpResponse(null, { status: 404 });
  }),
  http.post('/api/thinking', async ({ request }) => {
    const body = (await request.json()) as { name: string };
    const c = {
      id: uid('cv'),
      name: body.name,
      updatedAt: new Date().toISOString(),
    };
    db.canvases.unshift(c);
    return HttpResponse.json(c, { status: 201 });
  }),
  http.put('/api/thinking/:id', async ({ params, request }) => {
    const c = db.canvases.find((x) => x.id === params.id);
    if (!c) return new HttpResponse(null, { status: 404 });
    const body = (await request.json()) as { scene?: unknown; name?: string };
    if (body.scene !== undefined) c.scene = body.scene;
    if (body.name) c.name = body.name;
    c.updatedAt = new Date().toISOString();
    return HttpResponse.json(c);
  }),

  /* ---------------- explore ---------------- */
  http.get('/api/explore/workspaces', async () => {
    await latency();
    return HttpResponse.json(db.publicWorkspaces);
  }),
  http.get('/api/explore/quizzes', async () => {
    await latency();
    return HttpResponse.json(db.publicQuizzes);
  }),

  /* ---------------- billing ---------------- */
  http.get('/api/billing', async () => {
    await latency();
    return HttpResponse.json({
      planTier: db.user.planTier,
      subscriptionStatus: db.user.subscriptionStatus,
    });
  }),
  http.post('/api/billing/checkout', async ({ request }) => {
    await latency();
    const body = (await request.json()) as { planTier: string };
    return HttpResponse.json({ url: `/subscription?mock_checkout=${body.planTier}` });
  }),
  http.post('/api/billing/portal', async () => {
    await latency();
    return HttpResponse.json({ url: '/subscription?mock_portal=1' });
  }),

  /* ---------------- integrations ---------------- */
  http.get('/api/integrations', async () => {
    await latency();
    return HttpResponse.json({ google: false, microsoft: false });
  }),
  http.get('/api/integrations/google/picker-token', async () => {
    await latency();
    return HttpResponse.json({ accessToken: 'mock-google-token' });
  }),
  http.get('/api/integrations/microsoft/recent', async () => {
    await latency();
    return HttpResponse.json([
      { id: 'ms_file_1', name: 'Biology Notes.docx' },
      { id: 'ms_file_2', name: 'Lab Report.pdf' },
    ]);
  }),
  http.post('/api/workspaces/:id/sources/import', async ({ params, request }) => {
    await latency();
    const wsId = params.id as string;
    const body = (await request.json()) as {
      provider: string;
      fileIds: string[];
      chapterId?: string | null;
    };
    const created = body.fileIds.map((fid, i) => {
      const f = {
        id: uid('f'),
        workspaceId: wsId,
        chapterId: body.chapterId ?? null,
        name: `${body.provider}-import-${i + 1}.pdf`,
        kind: 'pdf' as const,
        sizeKb: 512,
        addedAt: new Date().toISOString(),
        status: 'processing' as const,
        ingestPct: 0,
      };
      db.files.unshift(f);
      return f;
    });
    return HttpResponse.json(created, { status: 201 });
  }),
];

type SourceKindFix = 'pdf' | 'doc' | 'md' | 'image' | 'txt';
