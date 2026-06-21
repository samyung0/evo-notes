import React from 'react';

/**
 * Generic surface card. `interactive` adds a hover lift,
 * `dashed` renders the "new item" placeholder treatment.
 */
export function Card({
  children,
  padding = 22,
  radius = 'var(--ev-r-lg)',
  interactive = false,
  raised = false,
  dashed = false,
  style,
  ...rest
}) {
  return (
    <div
      style={{
        background: dashed ? 'transparent' : 'var(--ev-surface)',
        border: dashed ? '1.5px dashed var(--ev-border-strong)' : '1px solid var(--ev-border)',
        borderRadius: radius,
        padding,
        boxShadow: raised ? 'var(--ev-shadow-card)' : 'none',
        cursor: interactive ? 'pointer' : 'default',
        transition: 'box-shadow .18s ease, transform .12s ease, border-color .15s ease',
        ...style,
      }}
      onMouseEnter={interactive ? (e) => {
        e.currentTarget.style.boxShadow = 'var(--ev-shadow-card)';
        e.currentTarget.style.transform = 'translateY(-2px)';
      } : undefined}
      onMouseLeave={interactive ? (e) => {
        e.currentTarget.style.boxShadow = raised ? 'var(--ev-shadow-card)' : 'none';
        e.currentTarget.style.transform = 'none';
      } : undefined}
      {...rest}
    >
      {children}
    </div>
  );
}
