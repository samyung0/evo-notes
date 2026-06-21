import React from 'react';

export interface AvatarProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Image URL. Falls back to initials when absent. */
  src?: string;
  /** Full name — used for initials and alt text. */
  name?: string;
  /** Size token or pixel number. Default 'md' (38px). */
  size?: 'xs' | 'sm' | 'md' | 'lg' | number;
}

/** Circular avatar with image or initials fallback. */
export function Avatar(props: AvatarProps): JSX.Element;
