import React from 'react';

export interface TabItem {
  value: string;
  label: string;
}

export interface TabsProps {
  /** Tabs as strings or {value,label}. */
  tabs: (string | TabItem)[];
  /** Active tab value. */
  value: string;
  /** Called with the new value. */
  onChange?: (value: string) => void;
  style?: React.CSSProperties;
}

/** Underline tab bar for switching sections or courses. */
export function Tabs(props: TabsProps): JSX.Element;
