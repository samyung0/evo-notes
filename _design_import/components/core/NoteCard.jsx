import React from 'react';

/**
 * Sticky-style note card with a saturated or soft color fill.
 * Mirrors the dashboard "My notes" tiles.
 */
const THEMES = {
  green: { bg: 'var(--ev-green-note)', ink: '#222222', meta: 'rgba(34,34,34,.6)' },
  purple: { bg: 'var(--ev-purple)', ink: '#ffffff', meta: 'rgba(255,255,255,.78)' },
  greenSoft: { bg: 'var(--ev-green-soft)', ink: 'var(--ev-green-ink)', meta: 'rgba(60,82,48,.7)' },
  purpleSoft: { bg: 'var(--ev-purple-soft)', ink: 'var(--ev-purple-ink)', meta: 'rgba(91,74,168,.7)' },
};

export function NoteCard({ title, body, date, theme = 'green', onMenu, style, ...rest }) {
  const t = THEMES[theme] || THEMES.green;
  return (
    <div
      style={{
        background: t.bg,
        borderRadius: 'var(--ev-r-xl)',
        padding: 20,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        minHeight: 150,
        ...style,
      }}
      {...rest}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start' }}>
        <span style={{ fontFamily: 'var(--ev-font-sans)', fontWeight: 700, fontSize: '1rem', color: t.ink }}>{title}</span>
        <button
          onClick={onMenu}
          style={{ marginLeft: 'auto', border: 'none', background: 'rgba(255,255,255,.35)', borderRadius: 'var(--ev-r-sm)', width: 26, height: 26, color: t.ink, cursor: 'pointer', fontSize: '0.875rem', lineHeight: 1 }}
        >⋯</button>
      </div>
      {body && (
        <p style={{ margin: 0, fontFamily: 'var(--ev-font-sans)', fontSize: '0.8438rem', lineHeight: 1.5, color: t.ink, opacity: 0.92 }}>{body}</p>
      )}
      {date && (
        <span style={{ marginTop: 'auto', fontFamily: 'var(--ev-font-sans)', fontSize: '0.7188rem', color: t.meta }}>{date}</span>
      )}
    </div>
  );
}
