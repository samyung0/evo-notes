import { http, HttpResponse, delay } from 'msw';
import * as db from './db';
import { uid } from './db';
import type {
  Chapter,
  Flashcard,
  GenerateOptions,
  Question,
  Quiz,
  SearchResult,
  Task,
  Workspace,
  WorkspaceColor,
} from '@/api/types';

const latency = () => delay(180 + Math.random() * 220);

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
      if (w.name.toLowerCase().includes(q) || w.tags.some((t) => t.toLowerCase().includes(q)))
        results.push({
          id: w.id,
          kind: 'workspace',
          title: w.name,
          subtitle: w.tags.join(' · '),
          href: `/workspaces/${w.id}`,
        });
    for (const f of db.files)
      if (f.name.toLowerCase().includes(q))
        results.push({
          id: f.id,
          kind: 'file',
          title: f.name,
          subtitle: db.workspaces.find((w) => w.id === f.workspaceId)?.name,
          href: `/workspaces/${f.workspaceId}?file=${f.id}`,
        });
    for (const e of db.events)
      if (e.title.toLowerCase().includes(q))
        results.push({
          id: e.id,
          kind: 'event',
          title: e.title,
          subtitle: e.location,
          href: '/schedule',
        });
    for (const d of db.decks)
      if (d.name.toLowerCase().includes(q))
        results.push({
          id: d.id,
          kind: 'flashcards',
          title: d.name,
          subtitle: d.workspaceName,
          href: `/flashcards/${d.id}`,
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

  /* ---------------- workspaces ---------------- */
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
        (w) => w.name.toLowerCase().includes(q) || w.tags.some((t) => t.toLowerCase().includes(q))
      );
    if (color) list = list.filter((w) => w.color === color);
    if (tag) list = list.filter((w) => w.tags.includes(tag));
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
    const quizCount = db.quizzes.filter((q) => q.workspaceId === ws.id).length;
    const att = db.attempts.filter(
      (a) => db.quizzes.find((q) => q.id === a.quizId)?.workspaceId === ws.id
    );
    const avg = att.length ? Math.round(att.reduce((s, a) => s + a.pct, 0) / att.length) : 0;
    return HttpResponse.json({
      chapters: ws.chapterCount,
      files: ws.fileCount,
      quizzes: quizCount,
      attempts: att.length,
      avgScore: avg,
    });
  }),
  http.post('/api/workspaces', async ({ request }) => {
    const body = (await request.json()) as Partial<Workspace>;
    const ws: Workspace = {
      id: uid('ws'),
      name: body.name ?? 'Untitled workspace',
      color: (body.color as WorkspaceColor) ?? 'green',
      privacy: body.privacy ?? 'private',
      tags: body.tags ?? [],
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
    Object.assign(ws, await request.json());
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
  http.post('/api/workspaces/:id/sources', async ({ params, request }) => {
    await delay(500);
    const body = (await request.json()) as {
      name: string;
      kind: SourceKindFix;
      chapterId?: string | null;
    };
    const f: (typeof db.files)[number] = {
      id: uid('f'),
      workspaceId: String(params.id),
      chapterId: body.chapterId ?? null,
      name: body.name,
      kind: body.kind ?? 'pdf',
      sizeKb: Math.round(200 + Math.random() * 3000),
      addedAt: new Date().toISOString(),
    };
    db.files.push(f);
    const ws = db.workspaces.find((w) => w.id === params.id);
    if (ws) ws.fileCount += 1;
    if (f.chapterId) db.chapters.find((c) => c.id === f.chapterId)?.fileIds.push(f.id);
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
  http.post('/api/workspaces/:id/generate', async ({ params, request }) => {
    await delay(900);
    const opts = (await request.json()) as GenerateOptions;
    const wsName = db.workspaces.find((w) => w.id === params.id)?.name ?? 'Workspace';
    if (opts.kind === 'summary') {
      return HttpResponse.json({
        kind: 'summary',
        title: `${wsName} summary`,
        body: '• The cell is the basic unit of life.\n• Mitochondria produce ATP.\n• Membranes control transport via diffusion and osmosis.',
      });
    }
    if (opts.kind === 'flashcards') {
      const seed: Flashcard[] = Array.from({ length: opts.count }, (_, i) => ({
        id: uid('c'),
        deckId: 'generated',
        front: `Term ${i + 1}`,
        back: `Definition for term ${i + 1}.`,
        known: false,
      }));
      return HttpResponse.json({ kind: 'flashcards', cards: seed });
    }
    // quiz
    const qs: Question[] = Array.from({ length: opts.count }, (_, i) => {
      const type = opts.types[i % opts.types.length] ?? 'mcq';
      const difficulty = opts.difficulty[i % opts.difficulty.length] ?? 'medium';
      const base = {
        id: uid('q'),
        difficulty,
        prompt: `Generated ${type} question ${i + 1}?`,
      };
      switch (type) {
        case 'boolean':
          return { ...base, type: 'boolean', correct: true } as Question;
        case 'fill':
        case 'short':
          return { ...base, type, accepted: ['answer'] } as Question;
        case 'ordering':
          return {
            ...base,
            type: 'ordering',
            items: ['First', 'Second', 'Third'],
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
            options: ['A', 'B', 'C', 'D'],
            correct: [0, 2],
          } as Question;
        default:
          return {
            ...base,
            type: 'mcq',
            options: ['A', 'B', 'C', 'D'],
            correct: [0],
          } as Question;
      }
    });
    const quiz: Quiz = {
      id: uid('qz'),
      name: `${wsName} quiz`,
      workspaceId: String(params.id),
      workspaceName: wsName,
      chapters: opts.chapters,
      questions: qs,
      createdAt: new Date().toISOString(),
      privacy: 'private',
      timeLimitMin: opts.timeLimitMin,
    };
    db.quizzes.unshift(quiz);
    return HttpResponse.json({ kind: 'quiz', quiz });
  }),

  /* ---------------- quizzes & attempts ---------------- */
  http.get('/api/quizzes', async () => {
    await latency();
    return HttpResponse.json(db.quizzes);
  }),
  http.get('/api/quizzes/:id', async ({ params }) => {
    await latency();
    const q = db.quizzes.find((x) => x.id === params.id);
    return q ? HttpResponse.json(q) : new HttpResponse(null, { status: 404 });
  }),
  http.patch('/api/quizzes/:id', async ({ params, request }) => {
    const q = db.quizzes.find((x) => x.id === params.id);
    if (!q) return new HttpResponse(null, { status: 404 });
    Object.assign(q, await request.json());
    return HttpResponse.json(q);
  }),
  http.delete('/api/quizzes/:id', async ({ params }) => {
    const i = db.quizzes.findIndex((x) => x.id === params.id);
    if (i >= 0) db.quizzes.splice(i, 1);
    return new HttpResponse(null, { status: 204 });
  }),
  http.get('/api/attempts', async () => {
    await latency();
    return HttpResponse.json(
      [...db.attempts].sort((a, b) => +new Date(b.takenAt) - +new Date(a.takenAt))
    );
  }),
  http.post('/api/quizzes/:id/attempts', async ({ params, request }) => {
    const body = (await request.json()) as { correct: number; total: number };
    const quiz = db.quizzes.find((x) => x.id === params.id);
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
    };
    db.attempts.unshift(at);
    return HttpResponse.json(at, { status: 201 });
  }),

  /* ---------------- flashcards ---------------- */
  http.get('/api/decks', async () => {
    await latency();
    return HttpResponse.json(db.decks);
  }),
  http.get('/api/decks/:id', async ({ params }) => {
    await latency();
    const d = db.decks.find((x) => x.id === params.id);
    return d ? HttpResponse.json(d) : new HttpResponse(null, { status: 404 });
  }),
  http.get('/api/decks/:id/cards', async ({ params }) => {
    await latency();
    return HttpResponse.json(db.cards.filter((c) => c.deckId === params.id));
  }),
  http.patch('/api/cards/:id', async ({ params, request }) => {
    const c = db.cards.find((x) => x.id === params.id);
    if (!c) return new HttpResponse(null, { status: 404 });
    Object.assign(c, await request.json());
    return HttpResponse.json(c);
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
];

type SourceKindFix = 'pdf' | 'doc' | 'md' | 'image' | 'txt';
