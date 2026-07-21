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
  Deck as GenDeck,
  Event as GenEvent,
  File as GenFile,
  Quiz as GenQuiz,
  SearchResult as GenSearchResult,
  Workspace as GenWorkspace,
  UserColor,
  Privacy,
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
export type { Tag, TagInput } from './gen/model';

/* ---------------- pass-through wire contracts ---------------- */
export type {
  User,
  BillingInfo,
  IntegrationsStatus,
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
export type Workspace = Omit<GenWorkspace, 'isOwner'> & {
  isOwner?: boolean;
  /** General material permission for signed-in link/public visitors. */
  shareRole?: 'viewer' | 'commenter' | 'editor';
};
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
export type Quiz = Omit<GenQuiz, 'questions' | 'isOwner'> & {
  questions: Question[];
  isOwner?: boolean;
};

/** Legacy mock rows omit new sharing fields; real API always returns both. */
export type Deck = Omit<GenDeck, 'privacy' | 'isOwner'> & {
  privacy?: Privacy;
  isOwner?: boolean;
};

export type PublicWorkspace = Workspace & { author: string; clones: number };
export type PublicQuiz = Quiz & { author: string; clones: number };
export type PublicDeck = Deck & { author: string; clones: number };

/** Response of POST /workspaces/{id}/clone. `ragCloned` is false when the
 * pipeline was offline — the copied files exist but have no knowledge graph
 * until they are re-ingested. */
export interface CloneWorkspaceResult {
  workspace: Workspace;
  ragCloned: boolean;
}

/* ---------------- chat ----------------
   Conversation + Message + Citation are modelled on the wire (huma) and come
   from the generated spec. ChatMessage is the UI-facing turn: the generated
   Message shape with role/status narrowed to unions and an optional client-only
   `pending` flag while a temp (pre-persisted) row streams. */
export type { Conversation, Citation } from './gen/model';
export type { Message as WireMessage } from './gen/model';

export type ChatRole = 'user' | 'assistant' | 'system';
export type ChatStatus = 'streaming' | 'complete' | 'aborted' | 'error';

export interface ChatMessage {
  id: string;
  conversationId?: string;
  role: ChatRole;
  content: string;
  status: ChatStatus;
  citations?: import('./gen/model').Citation[];
  createdAt?: string;
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
  /** Object-wrapped so react-hook-form useFieldArray can bind each row. Each
   * option can carry its own explanation (why it is right or wrong), surfaced
   * during review. Question-level `explanation` still applies to non-choice
   * types. */
  options: { value: string; explanation?: string }[];
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
  | ChoiceQuestion
  | BooleanQuestion
  | TextQuestion
  | MatchingQuestion
  | OrderingQuestion;

/* ---------------- Generate (request options, not wire response types) ----------------
   Every generation is scoped: `chapters` (ids) and/or `fileIds` narrow the
   source material. The backend resolves chapter ids to their member files (for
   retrieval) and to names (for display + the LLM scope hint). Empty scope means
   the whole workspace. */
export type GenerateKind = 'flashcards' | 'quiz' | 'mindmap' | 'diagram';

export interface GenerateScope {
  chapters: string[]; // chapter ids
  fileIds: string[]; // file ids
}
export interface GenerateFlashcardsOptions extends GenerateScope {
  kind: 'flashcards';
  count: number;
  style: 'term-def' | 'qa' | 'cloze';
}
export interface GenerateQuizOptions extends GenerateScope {
  kind: 'quiz';
  count: number;
  types: QuestionType[];
  levels: CognitiveLevel[];
  timeLimitMin?: number;
}
export type DiagramType = 'auto' | 'flowchart' | 'sequence' | 'class' | 'state' | 'er';
export interface GenerateMindmapOptions extends GenerateScope {
  kind: 'mindmap';
  detail: 'brief' | 'standard' | 'detailed';
}
export interface GenerateDiagramOptions extends GenerateScope {
  kind: 'diagram';
  diagramType: DiagramType;
}
export type GenerateOptions =
  | GenerateFlashcardsOptions
  | GenerateQuizOptions
  | GenerateMindmapOptions
  | GenerateDiagramOptions;

/* ---------------- Study materials ----------------
   Persisted, workspace-scoped (not chapter-scoped) study artifacts rendered
   in-pane. Mindmaps and diagrams are markdown documents (mermaid fences);
   quizzes and decks are referenced by the unified materials index. */
export type MaterialKind = 'mindmap' | 'diagram' | 'quiz' | 'flashcards' | 'note';

export interface Material {
  id: string;
  workspaceId: string;
  workspaceName: string;
  capabilities: import('./gen/model').AccessCapabilities;
  role?: WorkspaceRole;
  kind: MaterialKind;
  title: string;
  /** Versioned Universal Plate document. */
  content: import('@/features/materials/document').MaterialDocument;
  /** Chapter this material is filed under (membership). null = unfiled.
   * Orthogonal to scopeChapters (provenance of the generated content). */
  chapterId: string | null;
  scopeChapters: string[];
  scopeFileIds: string[];
  privacy: Privacy;
  /** Presentation tint; only meaningful for flashcards decks. */
  color?: UserColor;
  createdAt: string;
  updatedAt?: string;
  revision?: number;
  /** Request-scoped: false when viewing someone else's shared material. */
  isOwner?: boolean;
}

/* ---------------- Plate collaboration (temporary hand-written contracts) ----------------
   These mirror the new backend models. Keep them isolated here until the next
   OpenAPI generation can replace them without touching editor components. */
export type WorkspaceRole = 'owner' | 'editor' | 'commenter' | 'viewer';

export interface WorkspaceMember {
  workspaceId: string;
  userId: string;
  name: string;
  email: string;
  avatarUrl?: string;
  role: WorkspaceRole;
  createdAt: string;
}

export interface MaterialComment {
  id: string;
  discussionId: string;
  userId: string;
  contentRich: import('@/features/materials/document').MaterialValue;
  isEdited: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MaterialDiscussion {
  id: string;
  materialId: string;
  blockId?: string;
  documentContent?: string;
  anchor?: Record<string, unknown>;
  userId: string;
  isResolved: boolean;
  createdAt: string;
  updatedAt: string;
  comments: MaterialComment[];
}

export interface MaterialRevision {
  materialId: string;
  revision: number;
  title: string;
  content: import('@/features/materials/document').MaterialDocument;
  createdBy?: string;
  createdAt: string;
}

export type SuggestionStatus = 'pending' | 'accepted' | 'rejected' | 'withdrawn';

export interface MaterialSuggestion {
  id: string;
  materialId: string;
  userId: string;
  baseRevision: number;
  anchor: Record<string, unknown>;
  originalFragment: import('@/features/materials/document').MaterialValue | null;
  proposedFragment: import('@/features/materials/document').MaterialValue | null;
  status: SuggestionStatus;
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
  updatedAt: string;
}

/** A row in the left-panel materials list. Aggregates markdown materials plus
 * the workspace's quizzes and decks into one flat (non chapter-scoped) list. */
export type MaterialRefType = 'mindmap' | 'diagram' | 'quiz' | 'deck' | 'note';
export interface MaterialRef {
  id: string;
  type: MaterialRefType;
  title: string;
  /** Chapter this material is filed under (membership). null = unfiled. */
  chapterId: string | null;
  createdAt: string;
}

/* ---------------- Raw generated namespace ----------------
   Reach for `Gen` when you need the exact backend contract (e.g. nullable
   arrays, request bodies) rather than the UI-facing domain type above. */
export * as Gen from './gen/model';
