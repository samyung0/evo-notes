/* ============================================================
   Domain types — the single import surface for the mock API, query
   hooks, and UI.

   These are now backed by the orval-generated wire contracts in
   `src/api/gen/model` (reflected from the backend's OpenAPI spec). We
   re-export the generated types directly where they match 1:1, and layer
   thin overrides only where the UI needs a richer shape than the wire can
   express:
     - `questions` stays the discriminated `Question` union (opaque
       `{ [k]: unknown }` on the wire — the frontend owns the polymorphism).
     - a couple of client-only fields (e.g. `SourceFile.ingestPct`).

   Array fields (tags, chapters, fileIds, labelIds, questions) are
   non-nullable on the wire: the backend pins them with `nullable:"false"`
   and always emits `[]`, so no null narrowing is needed here.

   Everything else — enums, scalar shapes — comes straight from generated
   code, so it stays in lockstep with the backend.
   ============================================================ */

import type {
  Attempt as GenAttempt,
  AttemptDetail as GenAttemptDetail,
  Chapter as GenChapter,
  Event as GenEvent,
  File as GenFile,
  Quiz as GenQuiz,
  SearchResult as GenSearchResult,
  Workspace as GenWorkspace,
  UserColor,
} from './gen/model';

/* ---------------- enums & scalars (straight from the generated spec) ---------------- */
export {
  UserColor,
  Privacy,
  PlanTier,
  SubscriptionStatus,
  FileKind,
  FileStatus,
  NotificationKind,
  SearchKind,
} from './gen/model';
export type { StrVal } from './gen/model';

/* ---------------- pass-through wire contracts ---------------- */
export type {
  User,
  BillingInfo,
  IntegrationsStatus,
  Deck,
  Flashcard,
  SrsState,
  Label,
  Task,
  Notification as AppNotification,
  Canvas as ThinkingCanvas,
} from './gen/model';

/* ---------------- UI-only color extras (not on the wire) ---------------- */
export type SystemColor = 'success' | 'info' | 'warning' | 'error' | 'accent-1' | 'accent-2';

/* ---------------- pass-through contracts (identical to the wire) ---------------- */
export type Workspace = GenWorkspace;
export type Chapter = GenChapter;
export type Attempt = GenAttempt;
export type CalendarEvent = GenEvent;

/** A past attempt with its per-question breakdown. `questions` is the rich
 * union (opaque on the wire); `answers` maps question id -> the user's answer
 * (the `Answer` union from grade.ts, kept loose here to avoid an import cycle). */
export type AttemptDetail = Omit<GenAttemptDetail, 'questions' | 'answers'> & {
  questions: Question[];
  answers: Record<string, unknown>;
};

/* ---------------- overridden contracts ----------------
   Same generated shape, minus the wire's opaque / client-only fields. */

/** Adds a transient client-only ingest progress (0–100), driven by SSE. */
export type SourceFile = GenFile & { ingestPct?: number };

/** `color` is a client-side tint derived from the owning workspace/label/deck. */
export type SearchResult = GenSearchResult & { color?: UserColor };

/** `questions` is the rich discriminated union; the wire keeps it opaque. */
export type Quiz = Omit<GenQuiz, 'questions'> & {
  questions: Question[];
};

export type PublicWorkspace = Workspace & { author: string; clones: number };
export type PublicQuiz = Quiz & { author: string; clones: number };

/* ---------------- chat (not modelled on the wire) ---------------- */
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

/* ---------------- Quizzes: the polymorphic Question union ----------------
   The backend stores questions opaquely; the frontend owns this shape. */
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
  /** Object-wrapped so react-hook-form useFieldArray can bind each row. */
  options: { value: string }[];
  /** indices into `options` */
  correct: number[];
}
export interface BooleanQuestion extends BaseQuestion {
  type: 'boolean';
  correct: boolean;
}
export interface TextQuestion extends BaseQuestion {
  type: 'fill' | 'short';
  /** accepted answers (case-insensitive), object-wrapped for useFieldArray */
  accepted: { value: string }[];
}
export interface MatchingQuestion extends BaseQuestion {
  type: 'matching';
  pairs: { left: string; right: string }[];
}
export interface OrderingQuestion extends BaseQuestion {
  type: 'ordering';
  /** items in their correct order, object-wrapped for useFieldArray */
  items: { value: string }[];
}
export type Question =
  ChoiceQuestion | BooleanQuestion | TextQuestion | MatchingQuestion | OrderingQuestion;

/* ---------------- Generate (request options, not wire response types) ---------------- */
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

/* ---------------- Raw generated namespace ----------------
   Reach for `Gen` when you need the exact backend contract (e.g. nullable
   arrays, request bodies) rather than the UI-facing domain type above. */
export * as Gen from './gen/model';
