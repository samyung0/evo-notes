import type { CognitiveLevel } from '@/api/types';

/** Cognitive levels ordered from lowest to highest cognitive load. */
export const LEVELS: CognitiveLevel[] = ['recall', 'application', 'analysis'];

/** Human-readable label shown on badges, chips, and pickers. */
export const LEVEL_LABEL: Record<CognitiveLevel, string> = {
  recall: 'Recall',
  application: 'Application',
  analysis: 'Analysis',
};

/** Short explanation of what each level asks of the student. */
export const LEVEL_HINT: Record<CognitiveLevel, string> = {
  recall: 'Remember a fact or definition',
  application: 'Use a concept to solve something',
  analysis: 'Break down, compare, or reason',
};

/** Badge tone per level (mirrors the old easy/medium/hard colour scale). */
export const LEVEL_TONE: Record<CognitiveLevel, 'success' | 'warning' | 'error'> = {
  recall: 'success',
  application: 'warning',
  analysis: 'error',
};
