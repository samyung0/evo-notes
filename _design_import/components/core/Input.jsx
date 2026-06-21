import React from 'react';
import { Icon } from './Icon.jsx';

/** Text input with optional leading icon. */
export function Input({
  icon,
  value,
  placeholder = '',
  size = 'md',
  style,
  inputStyle,
  ...rest
}) {
  const pad = size === 'sm' ? '8px 11px' : '10px 13px';
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 9,
      padding: pad,
      background: 'var(--ev-white)',
      border: '1px solid var(--ev-border)',
      borderRadius: 'var(--ev-r-sm)',
      ...style,
    }}>
      {icon && <Icon name={icon} size={15} color="var(--ev-ink-faint)" />}
      <input
        value={value}
        placeholder={placeholder}
        style={{
          flex: 1,
          minWidth: 0,
          border: 'none',
          outline: 'none',
          background: 'transparent',
          fontFamily: 'var(--ev-font-sans)',
          fontSize: size === 'sm' ? 13 : 13.5,
          color: 'var(--ev-ink)',
          ...inputStyle,
        }}
        {...rest}
      />
    </div>
  );
}
