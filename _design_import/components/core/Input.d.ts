import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Leading icon name (from Icon set). */
  icon?: string;
  /** Size. Default 'md'. */
  size?: 'sm' | 'md';
  /** Style for the outer wrapper. */
  style?: React.CSSProperties;
  /** Style for the inner <input>. */
  inputStyle?: React.CSSProperties;
}

/** Single-line text input with optional leading icon. */
export function Input(props: InputProps): JSX.Element;
