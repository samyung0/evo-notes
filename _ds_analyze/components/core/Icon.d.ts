import React from 'react';

export interface IconProps {
  /** Icon glyph name from the Evo Notes set. */
  name:
    | 'dashboard' | 'workspaces' | 'practice' | 'schedule' | 'files' | 'tasks'
    | 'notes' | 'profile' | 'settings' | 'logout' | 'search' | 'bell' | 'plus'
    | 'minus' | 'chevronDown' | 'chevronRight' | 'chevronLeft' | 'arrowRight'
    | 'upload' | 'send' | 'sparkles' | 'check' | 'more' | 'message' | 'book'
    | 'flashcards' | 'quiz' | 'x' | 'filter' | 'clock';
  /** Pixel size (width & height). Default 18. */
  size?: number;
  /** Stroke width. Default 1.8. */
  strokeWidth?: number;
  /** Stroke color. Default currentColor. */
  color?: string;
  style?: React.CSSProperties;
}

/** Line icon from the Evo Notes set (Lucide-style geometry). */
export function Icon(props: IconProps): JSX.Element;
