import React from 'react';

const TONES = {
  green: 'var(--ev-success)',
  purple: 'var(--ev-purple)',
  blue: 'var(--ev-info)',
  amber: 'var(--ev-warning)',
  coral: 'var(--ev-error)',
  dark: 'var(--ev-primary)',
};

/** Slim horizontal progress / accuracy bar. */
export function ProgressBar({ value = 0, tone = 'green', height = 6, showLabel = false, style, ...rest }) {
  const pct = Math.max(0, Math.min(100, value));
  const fill = TONES[tone] || TONES.green;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, ...style }} {...rest}>
      <div style={{
        flex: 1,
        height,
        borderRadius: 'var(--ev-r-pill)',
        background: 'var(--ev-line)',
        overflow: 'hidden',
      }}>
        <div style={{
          width: `${pct}%`,
          height: '100%',
          borderRadius: 'var(--ev-r-pill)',
          background: fill,
          transition: 'width .4s cubic-bezier(.2,.7,.2,1)',
        }} />
      </div>
      {showLabel && (
        <span style={{
          fontFamily: 'var(--ev-font-sans)',
          fontSize: '0.75rem', fontWeight: 700, color: 'var(--ev-ink-soft)',
          minWidth: 34, textAlign: 'right',
        }}>{pct}%</span>
      )}
    </div>
  );
}
