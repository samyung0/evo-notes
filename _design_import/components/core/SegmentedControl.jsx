import React from 'react';

/**
 * Pill segmented toggle — e.g. the Chat / Generate switch.
 * Controlled via `value` + `onChange(optionValue)`.
 */
export function SegmentedControl({ options = [], value, onChange, size = 'md', style, ...rest }) {
  const sm = size === 'sm';
  return (
    <div
      style={{
        display: 'inline-flex',
        background: 'var(--ev-white)',
        border: '1px solid var(--ev-border)',
        borderRadius: 'var(--ev-r-pill)',
        padding: 4,
        gap: 3,
        ...style,
      }}
      {...rest}
    >
      {options.map((opt) => {
        const val = typeof opt === 'string' ? opt : opt.value;
        const label = typeof opt === 'string' ? opt : opt.label;
        const on = val === value;
        return (
          <button
            key={val}
            onClick={() => onChange && onChange(val)}
            style={{
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'var(--ev-font-sans)',
              fontSize: sm ? 12.5 : 14,
              fontWeight: 600,
              padding: sm ? '8px 15px' : '11px 19px',
              lineHeight: 1,
              borderRadius: 'var(--ev-r-pill)',
              color: on ? 'var(--ev-primary-content)' : 'var(--ev-ink-faint)',
              backgroundColor: on ? 'var(--ev-primary)' : 'transparent',
            }}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
