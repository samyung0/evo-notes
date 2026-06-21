import React from 'react';

export interface NoteCardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Note title. */
  title: string;
  /** Body / excerpt text. */
  body?: string;
  /** Footer date string. */
  date?: string;
  /** Color theme. Default 'green'. */
  theme?: 'green' | 'purple' | 'greenSoft' | 'purpleSoft';
  /** Overflow-menu click handler. */
  onMenu?: () => void;
}

/** Colored sticky-style note tile (dashboard "My notes"). */
export function NoteCard(props: NoteCardProps): JSX.Element;
