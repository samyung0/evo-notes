import React from 'react';

const TONES = {
  neutral: { background: 'var(--ev-bg)', color: 'var(--ev-ink-soft)' },
  course: { background: 'var(--ev-info-soft)', color: 'var(--ev-info-ink)' },
  workspace: { background: 'var(--ev-warning-soft)', color: 'var(--ev-warning-ink)' },
  success: { background: 'var(--ev-success-soft)', color: 'var(--ev-success-ink)' },
  info: { background: 'var(--ev-info-soft)', color: 'var(--ev-info-ink)' },
  warning: { background: 'var(--ev-warning-soft)', color: 'var(--ev-warning-ink)' },
  error: { background: 'var(--ev-error-soft)', color: 'var(--ev-error-ink)' },
  purple: { background: 'var(--ev-purple-soft)', color: 'var(--ev-purple-ink)' },
  green: { background: 'var(--ev-green-soft)', color: 'var(--ev-green-ink)' },
  dark: { background: 'var(--ev-primary)', color: 'var(--ev-primary-content)' },
};

/** Small pill label — status, type tags, counts. */
export function Badge({ children, tone = 'neutral', uppercase = false, size = 'md', style, ...rest }) {
  const t = TONES[tone] || TONES.neutral;
  const sm = size === 'sm';
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: sm ? '2px 8px' : '3px 10px',
        fontFamily: 'var(--ev-font-sans)',
        fontSize: sm ? 10 : 11,
        fontWeight: 700,
        lineHeight: 1.5,
        letterSpacing: uppercase ? '0.04em' : 0,
        textTransform: uppercase ? 'uppercase' : 'none',
        borderRadius: 'var(--ev-r-pill)',
        whiteSpace: 'nowrap',
        ...t,
        ...style,
      }}
      {...rest}
    >
      {children}
    </span>
  );
}
