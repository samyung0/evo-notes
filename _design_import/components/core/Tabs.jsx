import React from 'react';

/** Underline tab bar — section / course switcher. */
export function Tabs({ tabs = [], value, onChange, style, ...rest }) {
  return (
    <div
      style={{
        display: 'flex',
        gap: 4,
        borderBottom: '1px solid var(--ev-line)',
        ...style,
      }}
      {...rest}
    >
      {tabs.map((t) => {
        const val = typeof t === 'string' ? t : t.value;
        const label = typeof t === 'string' ? t : t.label;
        const on = val === value;
        return (
          <button
            key={val}
            onClick={() => onChange && onChange(val)}
            style={{
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              fontFamily: 'var(--ev-font-sans)',
              fontSize: '0.8438rem',
              fontWeight: on ? 700 : 500,
              color: on ? 'var(--ev-ink)' : 'var(--ev-ink-faint)',
              padding: '8px 12px',
              marginBottom: -1,
              borderBottom: on ? '2px solid var(--ev-primary)' : '2px solid transparent',
              transition: 'color .15s ease',
            }}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
