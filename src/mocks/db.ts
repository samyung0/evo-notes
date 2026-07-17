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
  Conversation,
  Deck,
  Flashcard,
  Label,
  Material,
  PublicQuiz,
  PublicDeck,
  PublicWorkspace,
  Question,
  Quiz,
  SourceFile,
  SrsState,
  Task,
  ThinkingCanvas,
  User,
  WireMessage,
  Workspace,
} from '@/api/types';
import { isDue, isKnown, newSrsState, reviewSrs } from '@/lib/srs';
import { parseFlashcardsBlock, parseQuizBlock } from '@/features/materials/blocks';
import {
  createMaterialDocument,
  flashcardsNode,
  flashcardsElementToCards,
  mermaidNode,
  quizNode,
  quizElementToBlock,
  type FlashcardsElement,
  type QuizElement,
} from '@/features/materials/document';

export const uid = (p = 'id') => `${p}_${Math.random().toString(36).slice(2, 9)}`;

/** Wrap bare strings as {value} rows (matches useFieldArray-friendly shapes). */
const wv = (...ss: string[]) => ss.map((value) => ({ value }));

/**
 * Mock tag catalog (mirrors the backend `tags` table: per-user, per-kind, id +
 * name). Entities reference these by id so reuse preserves the row. Handlers
 * read/mutate this array for GET /api/tags and workspace create/update.
 */
export interface CatalogTag {
  id: string;
  kind: string;
  value: string;
}
export const tagCatalog: CatalogTag[] = [
  { id: 'tag_1', kind: 'workspace', value: 'Cells' },
  { id: 'tag_2', kind: 'workspace', value: 'Genetics' },
  { id: 'tag_3', kind: 'workspace', value: 'Integrals' },
  { id: 'tag_4', kind: 'workspace', value: 'Series' },
  { id: 'tag_5', kind: 'workspace', value: 'Modern' },
  { id: 'tag_6', kind: 'workspace', value: 'Essays' },
  { id: 'tag_7', kind: 'workspace', value: 'Reactions' },
  { id: 'tag_8', kind: 'workspace', value: 'Poetry' },
  { id: 'tag_9', kind: 'workspace', value: 'Shakespeare' },
  { id: 'tag_war', kind: 'workspace', value: 'War' },
];
/** Build the {id, value} tag rows for an entity from catalog ids. */
const ct = (...ids: string[]) =>
  ids.map((id) => {
    const t = tagCatalog.find((x) => x.id === id)!;
    return { id: t.id, value: t.value };
  });

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
function seedCard(
  id: string,
  deckId: string,
  front: string,
  back: string,
  known: boolean
): Flashcard {
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
    role: 'owner',
    capabilities: { canView: true, canEdit: true, canComment: true, canManageMembers: true },
    color: 'green',
    privacy: 'private',
    tags: ct('tag_1', 'tag_2'),
    chapterCount: 6,
    fileCount: 24,
    createdAt: days(40),
    lastAccessedAt: hours(3),
  },
  {
    id: 'ws_calc',
    name: 'Calculus II',
    role: 'owner',
    capabilities: { canView: true, canEdit: true, canComment: true, canManageMembers: true },
    color: 'purple',
    privacy: 'private',
    tags: ct('tag_3', 'tag_4'),
    chapterCount: 4,
    fileCount: 12,
    createdAt: days(30),
    lastAccessedAt: days(1),
  },
  {
    id: 'ws_hist',
    name: 'World History',
    role: 'owner',
    capabilities: { canView: true, canEdit: true, canComment: true, canManageMembers: true },
    color: 'amber',
    privacy: 'link',
    tags: ct('tag_5', 'tag_6', 'tag_war'),
    chapterCount: 5,
    fileCount: 18,
    createdAt: days(22),
    lastAccessedAt: days(2),
  },
  {
    id: 'ws_chem',
    name: 'Organic Chemistry',
    role: 'owner',
    capabilities: { canView: true, canEdit: true, canComment: true, canManageMembers: true },
    color: 'blue',
    privacy: 'private',
    tags: ct('tag_7'),
    chapterCount: 3,
    fileCount: 9,
    createdAt: days(12),
    lastAccessedAt: days(5),
  },
  {
    id: 'ws_eng',
    name: 'English Literature',
    role: 'owner',
    capabilities: { canView: true, canEdit: true, canComment: true, canManageMembers: true },
    color: 'coral',
    privacy: 'public',
    tags: ct('tag_8', 'tag_9'),
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

const seedQuizzes: Quiz[] = [
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
        options: [
          { value: 'Nucleus', explanation: 'The nucleus stores DNA; it does not make ATP.' },
          {
            value: 'Mitochondria',
            explanation: 'Correct — mitochondria produce ATP via cellular respiration.',
          },
          { value: 'Ribosome', explanation: 'Ribosomes build proteins, not energy.' },
          { value: 'Golgi apparatus', explanation: 'The Golgi packages and ships proteins.' },
        ],
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
        options: wv('Ribosome', 'Nucleus', 'Mitochondria', 'Cytosol'),
        correct: [1, 2],
      },
      {
        id: 'q4',
        type: 'fill',
        level: 'application',
        prompt: 'The diffusion of water across a membrane is called ____.',
        accepted: wv('osmosis'),
      },
      {
        id: 'q5',
        type: 'ordering',
        level: 'analysis',
        prompt: 'Order the path of protein secretion.',
        items: wv('Ribosome', 'Rough ER', 'Golgi apparatus', 'Vesicle', 'Cell membrane'),
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
      {
        id: 'q11',
        type: 'mcq',
        level: 'recall',
        prompt: 'Which structure controls what enters and leaves the cell?',
        options: wv('Cell wall', 'Cell membrane', 'Nucleolus', 'Vacuole'),
        correct: [1],
      },
      {
        id: 'q12',
        type: 'boolean',
        level: 'recall',
        prompt: 'Ribosomes are membrane-bound organelles.',
        correct: false,
        explanation: 'Ribosomes are not enclosed by a membrane.',
      },
      {
        id: 'q13',
        type: 'fill',
        level: 'application',
        prompt: 'The organelle that produces most of the cell’s ATP is the ____.',
        accepted: wv('mitochondria', 'mitochondrion'),
      },
      {
        id: 'q14',
        type: 'short',
        level: 'analysis',
        prompt: 'Name the process cells use to convert glucose into ATP.',
        accepted: wv('cellular respiration', 'aerobic respiration'),
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
        options: wv('1:2:1', '3:1', '1:1', '9:3:3:1'),
        correct: [0],
      },
      {
        id: 'q8',
        type: 'short',
        level: 'analysis',
        prompt: 'Define a dominant allele in one sentence.',
        accepted: wv('an allele expressed in the phenotype even when only one copy is present'),
      },
      {
        id: 'q15',
        type: 'mcq',
        level: 'recall',
        prompt: 'The genotype AA is described as…',
        options: wv('Homozygous dominant', 'Heterozygous', 'Homozygous recessive', 'Hemizygous'),
        correct: [0],
      },
      {
        id: 'q16',
        type: 'boolean',
        level: 'recall',
        prompt: 'Genotype refers to an organism’s observable physical traits.',
        correct: false,
        explanation: 'That describes phenotype; genotype is the genetic makeup.',
      },
      {
        id: 'q17',
        type: 'multi',
        level: 'application',
        prompt: 'Select all homozygous genotypes.',
        options: wv('AA', 'Aa', 'aa', 'Bb'),
        correct: [0, 2],
      },
      {
        id: 'q18',
        type: 'fill',
        level: 'application',
        prompt: 'A diagram used to predict offspring genotypes is a ____ square.',
        accepted: wv('Punnett'),
      },
      {
        id: 'q19',
        type: 'boolean',
        level: 'recall',
        prompt: 'Alleles are alternative forms of the same gene.',
        correct: true,
      },
      {
        id: 'q20',
        type: 'mcq',
        level: 'application',
        prompt: 'A cross Aa × aa gives what phenotype ratio (dominant:recessive)?',
        options: wv('1:1', '3:1', '1:2:1', 'All dominant'),
        correct: [0],
      },
      {
        id: 'q21',
        type: 'ordering',
        level: 'analysis',
        prompt: 'Order the phases of mitosis.',
        items: wv('Prophase', 'Metaphase', 'Anaphase', 'Telophase'),
      },
      {
        id: 'q22',
        type: 'short',
        level: 'analysis',
        prompt: 'Define phenotype in one sentence.',
        accepted: wv('the observable characteristics of an organism'),
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
        options: wv(
          'Substitution',
          'Integration by parts',
          'Partial fractions',
          'Trig substitution'
        ),
        correct: [1],
      },
      {
        id: 'q10',
        type: 'boolean',
        level: 'recall',
        prompt: '∫ 1/x dx = ln|x| + C',
        correct: true,
      },
      {
        id: 'q23',
        type: 'mcq',
        level: 'application',
        prompt: '∫ cos x dx = ?',
        options: wv('sin x + C', '-sin x + C', 'cos x + C', '-cos x + C'),
        correct: [0],
      },
      {
        id: 'q24',
        type: 'boolean',
        level: 'recall',
        prompt: 'The integral of a sum equals the sum of the integrals.',
        correct: true,
      },
      {
        id: 'q25',
        type: 'fill',
        level: 'application',
        prompt: '∫ 2x dx = x² + ____.',
        accepted: wv('C'),
      },
      {
        id: 'q26',
        type: 'mcq',
        level: 'application',
        prompt: '∫ 1/(1 + x²) dx = ?',
        options: wv('arctan x + C', 'ln|x| + C', 'arcsin x + C', '1/x + C'),
        correct: [0],
      },
      {
        id: 'q27',
        type: 'boolean',
        level: 'recall',
        prompt: 'd/dx of ∫ f(x) dx returns f(x).',
        correct: true,
      },
      {
        id: 'q28',
        type: 'multi',
        level: 'application',
        prompt: 'Which techniques help integrate rational functions?',
        options: wv(
          'Partial fractions',
          'Polynomial long division',
          'Integration by parts',
          'Trig substitution'
        ),
        correct: [0, 1],
      },
      {
        id: 'q29',
        type: 'ordering',
        level: 'analysis',
        prompt: 'Order the steps of integration by parts.',
        items: wv('Choose u and dv', 'Differentiate u', 'Integrate dv', 'Apply the formula'),
      },
      {
        id: 'q30',
        type: 'short',
        level: 'recall',
        prompt: 'Name the constant added to every indefinite integral.',
        accepted: wv('constant of integration'),
      },
    ],
  },
];

export const attempts: (Attempt & {
  answers?: Record<string, unknown>;
  questions?: Question[];
})[] = [
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
    questions: seedQuizzes[0].questions,
    answers: {
      q1: [1],
      q2: true,
      q3: [1, 2],
      q4: 'osmosis',
      q5: ['Ribosome', 'Rough ER', 'Golgi apparatus', 'Vesicle', 'Cell membrane'],
      // Wrong: swapped Nucleus/Mitochondria functions.
      q6: {
        Nucleus: 'Makes ATP',
        Mitochondria: 'Stores DNA',
        Ribosome: 'Builds proteins',
      },
      q11: [1],
      q12: true, // Wrong: correct answer is false.
      q13: 'mitochondria',
      q14: 'cellular respiration',
    },
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
    questions: seedQuizzes[2].questions,
    answers: {
      q9: [1],
      q10: true,
      q23: [0],
      q24: true,
      q25: 'C',
      q26: [0],
      q27: false, // Wrong: correct answer is true.
      q28: [0], // Wrong: correct is [0, 1].
      q29: ['Apply the formula', 'Choose u and dv', 'Integrate dv', 'Differentiate u'], // Wrong order.
      q30: '', // Blank: unanswered.
    },
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
    questions: seedQuizzes[1].questions,
    answers: {
      q7: [0],
      q8: '', // Blank: unanswered.
      q15: [0],
      q16: true, // Wrong: correct answer is false.
      q17: [0], // Wrong: correct is [0, 2].
      q18: 'Punnett',
      q19: true,
      q20: [1], // Wrong: correct is [0].
      q21: ['Telophase', 'Anaphase', 'Metaphase', 'Prophase'], // Wrong order.
      q22: '', // Blank: unanswered.
    },
  },
];

const seedDecks: Deck[] = [
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

const seedCards: Flashcard[] = [
  seedCard('c_1', 'dk_1', 'Mitochondria', 'Powerhouse of the cell — produces ATP.', true),
  seedCard('c_2', 'dk_1', 'Nucleus', 'Stores DNA and controls cell activity.', true),
  seedCard('c_3', 'dk_1', 'Ribosome', 'Site of protein synthesis.', false),
  seedCard('c_4', 'dk_1', 'Golgi apparatus', 'Packages and ships proteins.', false),
  seedCard('c_7', 'dk_1', 'Lysosome', 'Digests waste with hydrolytic enzymes.', false),
  seedCard(
    'c_8',
    'dk_1',
    'Endoplasmic reticulum',
    'Rough ER makes proteins; smooth ER makes lipids.',
    false
  ),
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

/* ---------------- study materials (mindmaps / diagrams) ---------------- */
const ownerCapabilities = {
  canView: true,
  canEdit: true,
  canComment: true,
  canManageMembers: true,
};

export const materials: Material[] = [
  {
    id: 'mat_1',
    workspaceId: 'ws_bio',
    workspaceName: 'Biology 101',
    role: 'owner',
    capabilities: ownerCapabilities,
    kind: 'mindmap',
    title: 'Cell biology mindmap',
    content: createMaterialDocument([
      { type: 'h1', children: [{ text: 'Cell biology mindmap' }] },
      mermaidNode(
        'mindmap\n  root((Cell))\n    Membrane\n      Phospholipid bilayer\n      Transport\n        Diffusion\n        Osmosis\n    Organelles\n      Nucleus\n      Mitochondria\n      Ribosome\n    Energy\n      ATP\n      Respiration'
      ),
    ]),
    chapterId: 'ch_1',
    scopeChapters: ['Cell structure', 'Membranes & transport'],
    scopeFileIds: [],
    privacy: 'private',
    createdAt: days(3),
  },
  {
    id: 'mat_2',
    workspaceId: 'ws_bio',
    workspaceName: 'Biology 101',
    role: 'owner',
    capabilities: ownerCapabilities,
    kind: 'diagram',
    title: 'Protein secretion pathway',
    content: createMaterialDocument([
      { type: 'h1', children: [{ text: 'Protein secretion pathway' }] },
      {
        type: 'p',
        children: [{ text: 'The path a secreted protein takes through the cell:' }],
      },
      mermaidNode(
        'flowchart LR\n  Ribosome --> RoughER\n  RoughER --> Golgi\n  Golgi --> Vesicle\n  Vesicle --> Membrane[Cell membrane]'
      ),
    ]),
    chapterId: null,
    scopeChapters: [],
    scopeFileIds: ['f_1'],
    privacy: 'private',
    createdAt: days(1),
  },
  {
    id: 'mat_note_1',
    workspaceId: 'ws_bio',
    workspaceName: 'Biology 101',
    role: 'owner',
    capabilities: ownerCapabilities,
    kind: 'note',
    title: 'Lecture notes — the cell',
    content: createMaterialDocument([
      { type: 'h1', children: [{ text: 'Lecture notes - the cell' }] },
      {
        type: 'p',
        children: [
          { text: 'The ' },
          { text: 'cell', bold: true },
          { text: ' is the basic unit of life. Key points from today:' },
        ],
      },
      {
        type: 'p',
        indent: 1,
        listStyleType: 'disc',
        children: [{ text: 'Prokaryotes lack a membrane-bound nucleus' }],
      },
      {
        type: 'p',
        indent: 1,
        listStyleType: 'disc',
        children: [{ text: 'Eukaryotes have organelles' }],
      },
      {
        type: 'blockquote',
        children: [
          {
            type: 'p',
            children: [{ text: 'Remember: mitochondria is the powerhouse of the cell.' }],
          },
        ],
      },
    ]),
    chapterId: null,
    scopeChapters: [],
    scopeFileIds: [],
    privacy: 'private',
    createdAt: days(0),
  },
];

/* ---------------- chat: conversations + messages ---------------- */
export const conversations: Conversation[] = [
  {
    id: 'conv_seed1',
    workspaceId: workspaces[0].id,
    title: 'What is a cell?',
    createdAt: days(1),
    updatedAt: hours(3),
  },
];

export const chatMessages: WireMessage[] = [
  {
    id: 'm_seed1',
    conversationId: 'conv_seed1',
    role: 'user',
    content: 'What is a cell?',
    status: 'complete',
    citations: null,
    createdAt: days(1),
  },
  {
    id: 'm_seed2',
    conversationId: 'conv_seed1',
    role: 'assistant',
    content:
      'A **cell** is the basic structural and functional unit of life.\n\n- Bounded by a **membrane** that controls transport\n- Contains **organelles** like the nucleus and mitochondria\n- Produces energy (ATP) in the **mitochondria**',
    status: 'complete',
    citations: files[0]
      ? [
          {
            fileId: files[0].id,
            fileName: files[0].name,
            snippet: 'The cell is the basic unit of life…',
          },
        ]
      : null,
    createdAt: days(1),
  },
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
    ...seedQuizzes[0],
    id: 'pub_qz_1',
    name: 'Cell biology — 50 questions',
    author: 'mrslee',
    privacy: 'public',
    clones: 540,
  },
  {
    ...seedQuizzes[2],
    id: 'pub_qz_2',
    name: 'Calculus II mega quiz',
    author: 'mathpro',
    privacy: 'public',
    clones: 410,
  },
];
export const publicDecks: PublicDeck[] = [
  {
    ...seedDecks[0],
    id: 'pub_dk_1',
    name: 'Cell biology essentials',
    author: 'mrslee',
    privacy: 'public',
    isOwner: false,
    clones: 320,
  },
  {
    ...seedDecks[1],
    id: 'pub_dk_2',
    name: 'Calculus formulas',
    author: 'mathpro',
    privacy: 'public',
    isOwner: false,
    clones: 205,
  },
];

/* ---------------- unified markdown materials + derived views ----------------
   Markdown (materials[].content) is the source of truth for quiz/flashcard
   content; per-card FSRS state lives in cardStats. The seed quizzes/decks/cards
   above are authored as typed data, then folded into markdown materials here so
   the mock mirrors the backend's single-table model. */

/** Per-card scheduling state, keyed by card id (the flashcards fence owns the
 * front/back; this owns FSRS + known). */
export const cardStats: Record<string, { materialId: string; srs: SrsState; known: boolean }> = {};
for (const c of seedCards) cardStats[c.id] = { materialId: c.deckId, srs: c.srs, known: c.known };

seedQuizzes.forEach((q) => {
  materials.push({
    id: q.id,
    workspaceId: q.workspaceId,
    workspaceName: q.workspaceName,
    role: 'owner',
    capabilities: ownerCapabilities,
    kind: 'quiz',
    title: q.name,
    content: createMaterialDocument([
      quizNode({ questions: q.questions, timeLimitMin: q.timeLimitMin }, q.id),
    ]),
    chapterId: null,
    scopeChapters: q.chapters,
    scopeFileIds: [],
    privacy: q.privacy,
    createdAt: q.createdAt,
  });
});
seedDecks.forEach((d, i) => {
  const deckCards = seedCards.filter((c) => c.deckId === d.id);
  materials.push({
    id: d.id,
    workspaceId: d.workspaceId,
    workspaceName: d.workspaceName,
    role: 'owner',
    capabilities: ownerCapabilities,
    kind: 'flashcards',
    title: d.name,
    color: d.color,
    content: createMaterialDocument([
      flashcardsNode(
        deckCards.map((c) => ({ id: c.id, front: c.front, back: c.back })),
        d.id
      ),
    ]),
    chapterId: null,
    scopeChapters: [],
    scopeFileIds: [],
    privacy: 'private',
    createdAt: days(5 + i),
  });
});

/** Derive the typed Quiz view from a quiz material (questions from the fence). */
export function quizFromMaterial(mt: Material): Quiz {
  const { questions, timeLimitMin } =
    typeof mt.content === 'string'
      ? parseQuizBlock(mt.content)
      : quizElementToBlock(mt.content.value.find((node) => node.type === 'quiz') as QuizElement);
  return {
    id: mt.id,
    name: mt.title,
    workspaceId: mt.workspaceId,
    workspaceName: mt.workspaceName,
    chapters: mt.scopeChapters,
    questions,
    createdAt: mt.createdAt,
    privacy: mt.privacy,
    timeLimitMin,
    isOwner: true,
  };
}

/** Derive the typed cards for a flashcards material (fence + cardStats join). */
export function cardsFromMaterial(mt: Material): Flashcard[] {
  const cards =
    typeof mt.content === 'string'
      ? parseFlashcardsBlock(mt.content).cards
      : flashcardsElementToCards(
          mt.content.value.find((node) => node.type === 'flashcards') as FlashcardsElement
        );
  return cards.map((c) => {
    const st = cardStats[c.id];
    const srs = st?.srs ?? newSrsState();
    return {
      id: c.id,
      deckId: mt.id,
      front: c.front,
      back: c.back,
      known: st?.known ?? false,
      srs,
    };
  });
}

/** Derive the typed Deck view (counts computed live from cardStats). */
export function deckFromMaterial(mt: Material): Deck {
  const cs = cardsFromMaterial(mt);
  const known = cs.filter((c) => c.known).length;
  return {
    id: mt.id,
    name: mt.title,
    workspaceId: mt.workspaceId,
    workspaceName: mt.workspaceName,
    color: mt.color ?? 'green',
    privacy: mt.privacy,
    isOwner: true,
    cardCount: cs.length,
    knownPct: cs.length ? Math.round((100 * known) / cs.length) : 0,
    dueCount: cs.filter((c) => isDue(c.srs)).length,
  };
}

/** Convenience accessors for the two derived material kinds. */
export const quizMaterials = () => materials.filter((m) => m.kind === 'quiz');
export const deckMaterials = () => materials.filter((m) => m.kind === 'flashcards');
