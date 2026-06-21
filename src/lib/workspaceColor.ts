import type { WorkspaceColor } from '@/api/types';

/** Resolves a workspace/label color to themed CSS-var pairs (bg + fg + solid). */
export interface ColorPair {
  bg: string;
  fg: string;
  fgMuted: string;
  solid: string;
}

const MAP: Record<WorkspaceColor, ColorPair> = {
  green: { bg: 'var(--tint-green-bg)', fg: 'var(--tint-green-fg)', fgMuted: 'var(--tint-green-fg)', solid: 'var(--solid-green)' },
  purple: { bg: 'var(--tint-purple-bg)', fg: 'var(--tint-purple-fg)', fgMuted: 'var(--tint-purple-fg)', solid: 'var(--solid-purple)' },
  blue: { bg: 'var(--tint-info-bg)', fg: 'var(--tint-info-fg)', fgMuted: 'var(--tint-info-fg)', solid: 'var(--solid-info)' },
  amber: { bg: 'var(--tint-warning-bg)', fg: 'var(--tint-warning-fg)', fgMuted: 'var(--tint-warning-fg)', solid: 'var(--solid-warning)' },
  coral: { bg: 'var(--tint-error-bg)', fg: 'var(--tint-error-fg)', fgMuted: 'var(--tint-error-fg)', solid: 'var(--solid-error)' },
  graphite: { bg: 'var(--surface-inset-bg)', fg: 'var(--text-primary)', fgMuted: 'var(--text-muted)', solid: 'var(--text-muted)' },
};

export const colorPair = (c: WorkspaceColor): ColorPair => MAP[c] ?? MAP.green;

export const WORKSPACE_COLORS: WorkspaceColor[] = ['green', 'purple', 'blue', 'amber', 'coral', 'graphite'];
