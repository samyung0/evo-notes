import React from 'react';

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Icon glyph name (from Icon set). */
  icon: string;
  /** Visual style. Default 'outline'. */
  variant?: 'dark' | 'accent' | 'outline' | 'ghost';
  /** Size. Default 'md'. */
  size?: 'sm' | 'md' | 'lg';
  /** Show a red notification dot. */
  dot?: boolean;
  disabled?: boolean;
}

/** Square, icon-only button (search, notifications, overflow). */
export function IconButton(props: IconButtonProps): JSX.Element;
