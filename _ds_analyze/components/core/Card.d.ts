import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Inner padding in px. Default 18. */
  padding?: number;
  /** Corner radius (CSS value). Default var(--ev-r-lg). */
  radius?: string;
  /** Hover lift + pointer cursor. */
  interactive?: boolean;
  /** Soft drop shadow at rest. */
  raised?: boolean;
  /** Dashed "add new" placeholder treatment. */
  dashed?: boolean;
}

/** White surface card — the workhorse container of the UI. */
export function Card(props: CardProps): JSX.Element;
