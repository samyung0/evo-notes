import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual style. Default 'primary'. */
  variant?: 'primary' | 'accent' | 'outline' | 'ghost';
  /** Size. Default 'md'. */
  size?: 'sm' | 'md' | 'lg';
  /** Leading icon name (from Icon set). */
  iconLeft?: string;
  /** Trailing icon name (from Icon set). */
  iconRight?: string;
  /** Stretch to container width. */
  fullWidth?: boolean;
  disabled?: boolean;
}

/**
 * Primary action button.
 * @startingPoint section="Core" subtitle="Buttons in every variant & size" viewport="700x200"
 */
export function Button(props: ButtonProps): JSX.Element;
