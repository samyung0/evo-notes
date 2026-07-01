/* ============================================================
   Domain types — shared by the mock API, query hooks, and UI.
   ============================================================ */

export type UserColor =
  'green' | 'purple' | 'blue' | 'amber' | 'coral' | 'graphite' | 'transparent';

export type SystemColor = 'success' | 'info' | 'warning' | 'error' | 'accent-1' | 'accent-2';

export type Privacy = 'private' | 'public' | 'link';

export type PlanTier = 'free' | 'pro' | 'team';
export type SubscriptionStatus = 'none' | 'active' | 'past_due' | 'canceled' | 'trialing';

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  classLabel?: string;
  /** Consecutive days logged in. 0 = brand new. */
  streak: number;
  planTier: PlanTier;
  subscriptionStatus: SubscriptionStatus;
}

export interface BillingInfo {
  planTier: PlanTier;
  subscriptionStatus: SubscriptionStatus;
  renewalAt?: string;
}

export interface IntegrationsStatus {
  google: boolean;
  microsoft: boolean;
}

export interface Workspace {
  id: string;
  name: string;
  color: UserColor;
  privacy: Privacy;
  tags: string[];
  chapterCount: number;
  fileCount: number;
  createdAt: string; // ISO
  lastAccessedAt: string; // ISO
}

export interface Chapter {
  id: string;
  workspaceId: string;
  name: string;
  order: number;
  fileIds: string[];
}

export type FileKind = 'pdf' | 'doc' | 'md' | 'image' | 'txt';

/** Ingest lifecycle. Absent (legacy/seed rows) is treated as `ready`. */
export type FileStatus = 'processing' | 'ready' | 'failed';

export interface SourceFile {
  id: string;
  workspaceId: string;
  chapterId: string | null; // null = unfiled
  name: string;
  kind: FileKind;
  sizeKb: number;
  addedAt: string;
  status?: FileStatus;
  /** Transient client-only ingest progress (0–100), driven by SSE. Not persisted. */
  ingestPct?: number;
  /** For previewable content. PDFs use `url`; text/md use `content`. */
  url?: string;
  content?: string;
}

export interface Citation {
  fileId: string;
  fileName: string;
  snippet: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  citations?: Citation[];
}

/* ---------------- Quizzes ---------------- */
export type QuestionType =
  | 'mcq' // single correct
  | 'multi' // multiple correct
  | 'boolean'
  | 'fill' // fill in the blank
  | 'short' // short answer
  | 'matching'
  | 'ordering';

/**
 * Cognitive level of a question (a light Depth-of-Knowledge style tag). Replaces
 * the old easy/medium/hard difficulty so students see *what kind* of thinking a
 * question demands. Ordered from lowest to highest cognitive load.
 */
export type CognitiveLevel = 'recall' | 'application' | 'analysis';

interface BaseQuestion {
  id: string;
  type: QuestionType;
  level: CognitiveLevel;
  prompt: string;
  explanation?: string;
}
export interface ChoiceQuestion extends BaseQuestion {
  type: 'mcq' | 'multi';
  options: string[];
  /** indices into `options` */
  correct: number[];
}
export interface BooleanQuestion extends BaseQuestion {
  type: 'boolean';
  correct: boolean;
}
export interface TextQuestion extends BaseQuestion {
  type: 'fill' | 'short';
  /** accepted answers (case-insensitive) */
  accepted: string[];
}
export interface MatchingQuestion extends BaseQuestion {
  type: 'matching';
  pairs: { left: string; right: string }[];
}
export interface OrderingQuestion extends BaseQuestion {
  type: 'ordering';
  /** items in their correct order */
  items: string[];
}
export type Question =
  ChoiceQuestion | BooleanQuestion | TextQuestion | MatchingQuestion | OrderingQuestion;

export interface Quiz {
  id: string;
  name: string;
  workspaceId: string;
  workspaceName: string;
  chapters: string[];
  questions: Question[];
  createdAt: string;
  privacy: Privacy;
  timeLimitMin?: number;
}

export interface Attempt {
  id: string;
  quizId: string;
  quizName: string;
  workspaceName: string;
  chapters: string[];
  correct: number;
  total: number;
  pct: number;
  takenAt: string;
}

/* ---------------- Flashcards ---------------- */
export interface Deck {
  id: string;
  name: string;
  workspaceId: string;
  workspaceName: string;
  color: UserColor;
  cardCount: number;
  knownPct: number;
  /** Cards whose SRS due date is now or in the past. Drives the study queue. */
  dueCount: number;
}

/**
 * Serialized FSRS scheduling state for a single card. Dates are ISO strings so
 * the state round-trips cleanly through JSON / the mock API; the SRS helpers in
 * `@/lib/srs` convert to/from the `ts-fsrs` `Card` shape.
 */
export interface SrsState {
  due: string; // ISO — when the card is next due
  stability: number;
  difficulty: number;
  elapsed_days: number;
  scheduled_days: number;
  reps: number;
  lapses: number;
  /** ts-fsrs State enum: 0 New, 1 Learning, 2 Review, 3 Relearning. */
  state: number;
  last_review?: string; // ISO
  learning_steps?: number;
}

export interface Flashcard {
  id: string;
  deckId: string;
  front: string;
  back: string;
  /** Convenience flag mirrored from SRS (true once the card reaches Review). */
  known: boolean;
  srs: SrsState;
}

/* ---------------- Schedule ---------------- */
export interface Label {
  id: string;
  name: string;
  color: UserColor;
}
export interface CalendarEvent {
  id: string;
  title: string;
  start: string; // ISO
  end: string; // ISO
  labelIds: string[];
  location?: string;
  note?: string;
}

/* ---------------- Misc ---------------- */
export interface Task {
  id: string;
  title: string;
  meta?: string;
  done: boolean;
  dueDate: string; // ISO date
}
export type NotificationKind = 'event' | 'quiz' | 'system';
export interface AppNotification {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  at: string;
  read: boolean;
}
export interface ThinkingCanvas {
  id: string;
  name: string;
  updatedAt: string;
  /** Excalidraw scene blob (elements + appState), persisted opaquely. */
  scene?: unknown;
}

export type SearchKind = 'workspace' | 'file' | 'event' | 'flashcards' | 'thinking';
export interface SearchResult {
  id: string;
  kind: SearchKind;
  title: string;
  subtitle?: string;
  href: string;
  /** User color of the owning workspace/label/deck — drives the result icon tint. */
  color?: UserColor;
}

/* ---------------- Generate ---------------- */
export interface GenerateSummaryOptions {
  kind: 'summary';
  length: 'brief' | 'standard' | 'detailed';
  format: 'bullets' | 'outline' | 'prose';
  chapters: string[];
}
export interface GenerateFlashcardsOptions {
  kind: 'flashcards';
  count: number;
  style: 'term-def' | 'qa' | 'cloze';
  chapters: string[];
}
export interface GenerateQuizOptions {
  kind: 'quiz';
  count: number;
  types: QuestionType[];
  levels: CognitiveLevel[];
  chapters: string[];
  timeLimitMin?: number;
}
export type GenerateOptions =
  GenerateSummaryOptions | GenerateFlashcardsOptions | GenerateQuizOptions;

export interface PublicWorkspace extends Workspace {
  author: string;
  clones: number;
}
export interface PublicQuiz extends Quiz {
  author: string;
  clones: number;
}
