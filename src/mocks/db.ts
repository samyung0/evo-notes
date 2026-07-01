/* ============================================================
   In-memory mock database. Seeded with dummy data; MSW handlers
   read/mutate these arrays so the UI behaves like a real backend
   for the session. Swap for the real API later — no UI changes.
   ============================================================ */
import type {
  AppNotification,
  Attempt,
  CalendarEvent,
  Chapter,
  Deck,
  Flashcard,
  Label,
  PublicQuiz,
  PublicWorkspace,
  Question,
  Quiz,
  SourceFile,
  SrsState,
  Task,
  ThinkingCanvas,
  User,
  Workspace,
} from '@/api/types';
import { isKnown, newSrsState, reviewSrs } from '@/lib/srs';

export const uid = (p = 'id') => `${p}_${Math.random().toString(36).slice(2, 9)}`;

/**
 * Seed SRS scheduling state. Unknown cards stay due now (they surface in the
 * study queue); "known" cards get a couple of Good reviews to push their due
 * date out so they are not immediately due.
 */
function seedSrs(known: boolean): SrsState {
  let s = newSrsState();
  if (known) {
    s = reviewSrs(s, 'good');
    s = reviewSrs(s, 'good');
  }
  return s;
}
function seedCard(id: string, deckId: string, front: string, back: string, known: boolean): Flashcard {
  const srs = seedSrs(known);
  return { id, deckId, front, back, known: isKnown(srs), srs };
}

const now = Date.now();
const days = (n: number) => new Date(now - n * 86_400_000).toISOString();
const hours = (n: number) => new Date(now - n * 3_600_000).toISOString();

/** Build an ISO timestamp for today at a given hour (local). */
function todayAt(hour: number, minute = 0): string {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}
function dateAt(dayOffset: number, hour: number, minute = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

export const user: User = {
  id: 'u_1',
  name: 'Kate Malone',
  email: 'kate@evonotes.app',
  classLabel: 'Grade 11 · Science',
  streak: 0,
  planTier: 'pro',
  subscriptionStatus: 'active',
};

export const workspaces: Workspace[] = [
  {
    id: 'ws_bio',
    name: 'Biology 101',
    color: 'green',
    privacy: 'private',
    tags: ['Cells', 'Genetics'],
    chapterCount: 6,
    fileCount: 24,
    createdAt: days(40),
    lastAccessedAt: hours(3),
  },
  {
    id: 'ws_calc',
    name: 'Calculus II',
    color: 'purple',
    privacy: 'private',
    tags: ['Integrals', 'Series'],
    chapterCount: 4,
    fileCount: 12,
    createdAt: days(30),
    lastAccessedAt: days(1),
  },
  {
    id: 'ws_hist',
    name: 'World History',
    color: 'amber',
    privacy: 'link',
    tags: ['Modern', 'Essays'],
    chapterCount: 5,
    fileCount: 18,
    createdAt: days(22),
    lastAccessedAt: days(2),
  },
  {
    id: 'ws_chem',
    name: 'Organic Chemistry',
    color: 'blue',
    privacy: 'private',
    tags: ['Reactions'],
    chapterCount: 3,
    fileCount: 9,
    createdAt: days(12),
    lastAccessedAt: days(5),
  },
  {
    id: 'ws_eng',
    name: 'English Literature',
    color: 'coral',
    privacy: 'public',
    tags: ['Poetry', 'Shakespeare'],
    chapterCount: 7,
    fileCount: 21,
    createdAt: days(8),
    lastAccessedAt: hours(20),
  },
];

export const chapters: Chapter[] = [
  {
    id: 'ch_1',
    workspaceId: 'ws_bio',
    name: 'Cell structure',
    order: 0,
    fileIds: ['f_1', 'f_2'],
  },
  {
    id: 'ch_2',
    workspaceId: 'ws_bio',
    name: 'Membranes & transport',
    order: 1,
    fileIds: ['f_3'],
  },
  {
    id: 'ch_3',
    workspaceId: 'ws_bio',
    name: 'Genetics',
    order: 2,
    fileIds: ['f_4', 'f_5'],
  },
  {
    id: 'ch_c1',
    workspaceId: 'ws_calc',
    name: 'Techniques of integration',
    order: 0,
    fileIds: ['f_6'],
  },
  {
    id: 'ch_c2',
    workspaceId: 'ws_calc',
    name: 'Sequences & series',
    order: 1,
    fileIds: ['f_7'],
  },
];

export const files: SourceFile[] = [
  {
    id: 'f_1',
    workspaceId: 'ws_bio',
    chapterId: 'ch_1',
    name: 'Cell structure.pdf',
    kind: 'pdf',
    sizeKb: 2480,
    addedAt: days(20),
    url: 'https://raw.githubusercontent.com/mozilla/pdf.js/master/web/compressed.tracemonkey-pldi-09.pdf',
  },
  {
    id: 'f_2',
    workspaceId: 'ws_bio',
    chapterId: 'ch_1',
    name: 'Organelles cheatsheet.md',
    kind: 'md',
    sizeKb: 14,
    addedAt: days(19),
    content:
      '# Organelles\n\n- **Nucleus** — stores DNA, controls the cell.\n- **Mitochondria** — the powerhouse; ATP via respiration.\n- **Ribosomes** — protein synthesis.\n- **Golgi apparatus** — packaging & shipping.\n\nThe cell membrane is a *phospholipid bilayer* that controls what enters and leaves.',
  },
  {
    id: 'f_3',
    workspaceId: 'ws_bio',
    chapterId: 'ch_2',
    name: 'Osmosis notes.txt',
    kind: 'txt',
    sizeKb: 6,
    addedAt: days(18),
    content:
      'Osmosis is the diffusion of water across a semi-permeable membrane from low to high solute concentration.',
  },
  {
    id: 'f_4',
    workspaceId: 'ws_bio',
    chapterId: 'ch_3',
    name: 'Mendelian genetics.pdf',
    kind: 'pdf',
    sizeKb: 1890,
    addedAt: days(15),
    url: 'https://raw.githubusercontent.com/mozilla/pdf.js/master/web/compressed.tracemonkey-pldi-09.pdf',
  },
  {
    id: 'f_5',
    workspaceId: 'ws_bio',
    chapterId: null,
    name: 'Punnett squares.png',
    kind: 'image',
    sizeKb: 420,
    addedAt: days(14),
  },
  {
    id: 'f_6',
    workspaceId: 'ws_calc',
    chapterId: 'ch_c1',
    name: 'Integration by parts.pdf',
    kind: 'pdf',
    sizeKb: 980,
    addedAt: days(10),
    url: 'https://raw.githubusercontent.com/mozilla/pdf.js/master/web/compressed.tracemonkey-pldi-09.pdf',
  },
  {
    id: 'f_7',
    workspaceId: 'ws_calc',
    chapterId: 'ch_c2',
    name: 'Taylor series.md',
    kind: 'md',
    sizeKb: 11,
    addedAt: days(9),
    content: '# Taylor series\n\nA function f(x) near a point a:\n\nf(x) = Σ fⁿ(a)/n! · (x − a)ⁿ',
  },
];

export const quizzes: Quiz[] = [
  {
    id: 'qz_1',
    name: 'Cell biology basics',
    workspaceId: 'ws_bio',
    workspaceName: 'Biology 101',
    chapters: ['Cell structure', 'Membranes & transport'],
    createdAt: days(4),
    privacy: 'private',
    questions: [
      {
        id: 'q1',
        type: 'mcq',
        level: 'recall',
        prompt: 'Which organelle is the powerhouse of the cell?',
        options: ['Nucleus', 'Mitochondria', 'Ribosome', 'Golgi apparatus'],
        correct: [1],
        explanation: 'Mitochondria produce ATP through cellular respiration.',
      },
      {
        id: 'q2',
        type: 'boolean',
        level: 'recall',
        prompt: 'The cell membrane is a phospholipid bilayer.',
        correct: true,
      },
      {
        id: 'q3',
        type: 'multi',
        level: 'application',
        prompt: 'Select all that are membrane-bound organelles.',
        options: ['Ribosome', 'Nucleus', 'Mitochondria', 'Cytosol'],
        correct: [1, 2],
      },
      {
        id: 'q4',
        type: 'fill',
        level: 'application',
        prompt: 'The diffusion of water across a membrane is called ____.',
        accepted: ['osmosis'],
      },
      {
        id: 'q5',
        type: 'ordering',
        level: 'analysis',
        prompt: 'Order the path of protein secretion.',
        items: ['Ribosome', 'Rough ER', 'Golgi apparatus', 'Vesicle', 'Cell membrane'],
      },
      {
        id: 'q6',
        type: 'matching',
        level: 'application',
        prompt: 'Match the organelle to its function.',
        pairs: [
          { left: 'Nucleus', right: 'Stores DNA' },
          { left: 'Mitochondria', right: 'Makes ATP' },
          { left: 'Ribosome', right: 'Builds proteins' },
        ],
      },
    ],
  },
  {
    id: 'qz_2',
    name: 'Genetics check-in',
    workspaceId: 'ws_bio',
    workspaceName: 'Biology 101',
    chapters: ['Genetics'],
    createdAt: days(2),
    privacy: 'private',
    questions: [
      {
        id: 'q7',
        type: 'mcq',
        level: 'application',
        prompt: 'A cross between Aa × Aa gives what genotype ratio?',
        options: ['1:2:1', '3:1', '1:1', '9:3:3:1'],
        correct: [0],
      },
      {
        id: 'q8',
        type: 'short',
        level: 'analysis',
        prompt: 'Define a dominant allele in one sentence.',
        accepted: ['an allele expressed in the phenotype even when only one copy is present'],
      },
    ],
  },
  {
    id: 'qz_3',
    name: 'Integration techniques',
    workspaceId: 'ws_calc',
    workspaceName: 'Calculus II',
    chapters: ['Techniques of integration'],
    createdAt: days(6),
    privacy: 'public',
    questions: [
      {
        id: 'q9',
        type: 'mcq',
        level: 'application',
        prompt: '∫ x·eˣ dx is best solved by…',
        options: ['Substitution', 'Integration by parts', 'Partial fractions', 'Trig substitution'],
        correct: [1],
      },
      {
        id: 'q10',
        type: 'boolean',
        level: 'recall',
        prompt: '∫ 1/x dx = ln|x| + C',
        correct: true,
      },
    ],
  },
];

export const attempts: Attempt[] = [
  {
    id: 'at_1',
    quizId: 'qz_1',
    quizName: 'Cell biology basics',
    workspaceName: 'Biology 101',
    chapters: ['Cell structure'],
    correct: 8,
    total: 10,
    pct: 80,
    takenAt: days(2),
  },
  {
    id: 'at_2',
    quizId: 'qz_3',
    quizName: 'Integration techniques',
    workspaceName: 'Calculus II',
    chapters: ['Techniques of integration'],
    correct: 6,
    total: 10,
    pct: 60,
    takenAt: days(3),
  },
  {
    id: 'at_3',
    quizId: 'qz_2',
    quizName: 'Genetics check-in',
    workspaceName: 'Biology 101',
    chapters: ['Genetics'],
    correct: 4,
    total: 10,
    pct: 40,
    takenAt: days(5),
  },
];

export const decks: Deck[] = [
  {
    id: 'dk_1',
    name: 'Cell organelles',
    workspaceId: 'ws_bio',
    workspaceName: 'Biology 101',
    color: 'green',
    cardCount: 32,
    knownPct: 80,
    dueCount: 0,
  },
  {
    id: 'dk_2',
    name: 'Integration rules',
    workspaceId: 'ws_calc',
    workspaceName: 'Calculus II',
    color: 'purple',
    cardCount: 24,
    knownPct: 55,
    dueCount: 0,
  },
  {
    id: 'dk_3',
    name: 'History dates',
    workspaceId: 'ws_hist',
    workspaceName: 'World History',
    color: 'amber',
    cardCount: 40,
    knownPct: 30,
    dueCount: 0,
  },
];

export const cards: Flashcard[] = [
  seedCard('c_1', 'dk_1', 'Mitochondria', 'Powerhouse of the cell — produces ATP.', true),
  seedCard('c_2', 'dk_1', 'Nucleus', 'Stores DNA and controls cell activity.', true),
  seedCard('c_3', 'dk_1', 'Ribosome', 'Site of protein synthesis.', false),
  seedCard('c_4', 'dk_1', 'Golgi apparatus', 'Packages and ships proteins.', false),
  seedCard('c_7', 'dk_1', 'Lysosome', 'Digests waste with hydrolytic enzymes.', false),
  seedCard('c_8', 'dk_1', 'Endoplasmic reticulum', 'Rough ER makes proteins; smooth ER makes lipids.', false),
  seedCard('c_5', 'dk_2', '∫ eˣ dx', 'eˣ + C', true),
  seedCard('c_6', 'dk_2', '∫ 1/x dx', 'ln|x| + C', false),
  seedCard('c_9', 'dk_2', '∫ cos x dx', 'sin x + C', false),
  seedCard('c_10', 'dk_3', 'Fall of the Berlin Wall', '1989', false),
  seedCard('c_11', 'dk_3', 'End of WWII', '1945', false),
];

/**
 * Pool of questions the user has recently missed (across quizzes). Feeds the
 * "Review mistakes" quiz. Deduped by question id.
 */
export const mistakes: Question[] = [];

export const labels: Label[] = [
  { id: 'lb_bio', name: 'Biology', color: 'green' },
  { id: 'lb_calc', name: 'Calculus', color: 'purple' },
  { id: 'lb_hist', name: 'History', color: 'amber' },
  { id: 'lb_exam', name: 'Exam', color: 'coral' },
  { id: 'lb_study', name: 'Study group', color: 'blue' },
];

export const events: CalendarEvent[] = [
  {
    id: 'ev_1',
    title: 'Biology lecture',
    start: todayAt(8),
    end: todayAt(9),
    labelIds: ['lb_bio'],
    location: 'Room B2 · 158',
  },
  {
    id: 'ev_2',
    title: 'Calculus tutorial',
    start: todayAt(11),
    end: todayAt(12, 30),
    labelIds: ['lb_calc', 'lb_study'],
    location: 'Room 124',
  },
  {
    id: 'ev_3',
    title: 'History essay due',
    start: todayAt(15),
    end: todayAt(16),
    labelIds: ['lb_hist', 'lb_exam'],
  },
  {
    id: 'ev_4',
    title: 'Study group',
    start: dateAt(1, 13),
    end: dateAt(1, 15),
    labelIds: ['lb_study'],
    location: 'Library',
  },
  {
    id: 'ev_5',
    title: 'Chem midterm',
    start: dateAt(2, 9),
    end: dateAt(2, 11),
    labelIds: ['lb_exam'],
    location: 'Hall A',
  },
  {
    id: 'ev_6',
    title: 'Past revision',
    start: dateAt(-30, 10),
    end: dateAt(-30, 11),
    labelIds: ['lb_bio'],
  },
];

export const tasks: Task[] = [
  {
    id: 'tk_1',
    title:
      'Read Chapter 3 — Genetics b labdl ab lb la this is really long I guess just to make sure everything works',
    meta: 'Biology 101',
    done: false,
    dueDate: todayAt(23),
  },
  {
    id: 'tk_2',
    title: 'Finish integration worksheet',
    meta: 'Calculus II · 12 problems',
    done: false,
    dueDate: todayAt(23),
  },
  {
    id: 'tk_3',
    title: 'Review flashcards',
    meta: 'Cell organelles',
    done: true,
    dueDate: todayAt(23),
  },
  {
    id: 'tk_4',
    title: 'Outline history essay',
    meta: 'World History',
    done: false,
    dueDate: dateAt(1, 23),
  },
];

export const notifications: AppNotification[] = [
  {
    id: 'nt_1',
    kind: 'event',
    title: 'Calculus tutorial soon',
    body: 'Starts at 11:00 in Room 124.',
    at: hours(1),
    read: false,
  },
  {
    id: 'nt_2',
    kind: 'quiz',
    title: 'New attempt graded',
    body: 'Cell biology basics — 8/10.',
    at: hours(5),
    read: false,
  },
  {
    id: 'nt_3',
    kind: 'system',
    title: 'Welcome to Evo Notes',
    body: 'Upload your first source to get started.',
    at: days(1),
    read: true,
  },
];

export const canvases: ThinkingCanvas[] = [
  { id: 'cv_1', name: 'Bio mind map', updatedAt: hours(4) },
  { id: 'cv_2', name: 'Essay brainstorm', updatedAt: days(2) },
];

export const publicWorkspaces: PublicWorkspace[] = [
  {
    ...workspaces[0],
    id: 'pub_ws_1',
    name: 'AP Biology — full course',
    author: 'mrslee',
    privacy: 'public',
    clones: 1240,
  },
  {
    ...workspaces[2],
    id: 'pub_ws_2',
    name: 'Modern World History',
    author: 'historyhub',
    privacy: 'public',
    clones: 860,
  },
];
export const publicQuizzes: PublicQuiz[] = [
  {
    ...quizzes[0],
    id: 'pub_qz_1',
    name: 'Cell biology — 50 questions',
    author: 'mrslee',
    privacy: 'public',
    clones: 540,
  },
  {
    ...quizzes[2],
    id: 'pub_qz_2',
    name: 'Calculus II mega quiz',
    author: 'mathpro',
    privacy: 'public',
    clones: 410,
  },
];
