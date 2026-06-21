import React from 'react';

export interface SwitchProps {
  /** On/off state. */
  checked?: boolean;
  /** Called with the next state. */
  onChange?: (checked: boolean) => void;
  style?: React.CSSProperties;
}

/** Pill toggle switch for settings. */
export function Switch(props: SwitchProps): JSX.Element;
