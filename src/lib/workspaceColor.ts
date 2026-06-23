import type { UserColor } from '@/api/types';

/** Resolves a workspace/label color to themed CSS-var pairs (bg + fg + solid). */
export interface ColorPair {
  bg: string;
  fg: string;
}

const USER_COLOR_MAP: Record<UserColor, ColorPair> = {
  green: {
    bg: 'var(--solid-green)',
    fg: 'var(--solid-green-fg)',
  },
  purple: {
    bg: 'var(--solid-purple)',
    fg: 'var(--solid-purple-fg)'
  },
  blue: {
    bg: 'var(--solid-blue)',
    fg: 'var(--solid-blue-fg)',
  },
  amber: {
    bg: 'var(--solid-amber)',
    fg: 'var(--solid-amber-fg)',
  },
  coral: {
    bg: 'var(--solid-coral)',
    fg: 'var(--solid-coral-fg)',
  },
  graphite: {
    bg: 'var(--solid-graphite)',
    fg: 'var(--solid-graphite-fg)',
  },
};

export const userColorPair = (c: UserColor): ColorPair => USER_COLOR_MAP[c] ?? USER_COLOR_MAP.graphite;

export const USER_COLORS: UserColor[] = [
  'green',
  'purple',
  'blue',
  'amber',
  'coral',
  'graphite',
];
