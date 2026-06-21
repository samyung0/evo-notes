import React from 'react';

export interface CheckboxProps {
  /** Checked state. */
  checked?: boolean;
  /** Called with the next checked value. */
  onChange?: (checked: boolean) => void;
  /** Box size in px. Default 18. */
  size?: number;
  /** Fill tone when checked. Default 'dark'. */
  tone?: 'dark' | 'blue' | 'green' | 'purple';
  style?: React.CSSProperties;
}

/** Rounded-square checkbox (source selection, quiz options). */
export function Checkbox(props: CheckboxProps): JSX.Element;
