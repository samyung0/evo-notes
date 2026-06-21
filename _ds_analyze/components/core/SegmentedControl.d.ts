import React from 'react';

export interface SegmentedOption {
  value: string;
  label: string;
}

export interface SegmentedControlProps {
  /** Options as strings or {value,label}. */
  options: (string | SegmentedOption)[];
  /** Currently selected value. */
  value: string;
  /** Called with the new value. */
  onChange?: (value: string) => void;
  /** Size. Default 'md'. */
  size?: 'sm' | 'md';
  style?: React.CSSProperties;
}

/** Pill segmented toggle (e.g. Chat / Generate). */
export function SegmentedControl(props: SegmentedControlProps): JSX.Element;
