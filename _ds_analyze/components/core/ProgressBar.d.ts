import React from 'react';

export interface ProgressBarProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Fill percentage 0–100. */
  value?: number;
  /** Fill color. Default 'green'. */
  tone?: 'green' | 'purple' | 'blue' | 'amber' | 'coral' | 'dark';
  /** Bar thickness in px. Default 6. */
  height?: number;
  /** Show a trailing % label. */
  showLabel?: boolean;
}

/** Slim progress / accuracy bar. */
export function ProgressBar(props: ProgressBarProps): JSX.Element;
