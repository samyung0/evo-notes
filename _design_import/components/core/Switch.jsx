import React from 'react';

/** Pill toggle switch. */
export function Switch({ checked = false, onChange, style, ...rest }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange && onChange(!checked)}
      style={{
        width: 40,
        height: 24,
        flex: '0 0 40px',
        borderRadius: 'var(--ev-r-pill)',
        border: 'none',
        background: checked ? 'var(--ev-primary)' : 'var(--ev-border-strong)',
        position: 'relative',
        cursor: 'pointer',
        padding: 0,
        transition: 'background .18s ease',
        ...style,
      }}
      {...rest}
    >
      <span style={{
        position: 'absolute',
        top: 3,
        left: checked ? 19 : 3,
        width: 18,
        height: 18,
        borderRadius: '50%',
        background: '#fff',
        boxShadow: '0 1px 2px rgba(0,0,0,.25)',
        transition: 'left .18s cubic-bezier(.2,.7,.2,1)',
      }} />
    </button>
  );
}
