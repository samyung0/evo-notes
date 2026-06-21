import React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Color tone. 'course' = blue, 'workspace' = amber, plus status tones. */
  tone?: 'neutral' | 'course' | 'workspace' | 'success' | 'info' | 'warning' | 'error' | 'purple' | 'green' | 'dark';
  /** Uppercase + letter-spaced (used for COURSE / WORKSPACE type tags). */
  uppercase?: boolean;
  /** Size. Default 'md'. */
  size?: 'sm' | 'md';
}

/** Pill badge for type tags, statuses and counts. */
export function Badge(props: BadgeProps): JSX.Element;
