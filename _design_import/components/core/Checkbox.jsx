import React from 'react';
import { Icon } from './Icon.jsx';

/** Square checkbox with rounded corners. */
export function Checkbox({ checked = false, onChange, size = 18, tone = 'dark', style, ...rest }) {
  const fill = tone === 'blue' ? 'var(--ev-info)' : tone === 'green' ? 'var(--ev-success)' : tone === 'purple' ? 'var(--ev-purple)' : 'var(--ev-primary)';
  return (
    <button
      role="checkbox"
      aria-checked={checked}
      onClick={() => onChange && onChange(!checked)}
      style={{
        width: size,
        height: size,
        flex: `0 0 ${size}px`,
        borderRadius: 5,
        border: `1.5px solid ${checked ? fill : 'var(--ev-border-strong)'}`,
        background: checked ? fill : 'var(--ev-white)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        padding: 0,
        transition: 'background .12s ease, border-color .12s ease',
        ...style,
      }}
      {...rest}
    >
      {checked && <Icon name="check" size={size * 0.72} color="#fff" strokeWidth={2.4} />}
    </button>
  );
}
