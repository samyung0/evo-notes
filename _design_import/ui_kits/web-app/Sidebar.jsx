import React from 'react';
import { Icon } from '../../components/core/Icon.jsx';

/**
 * Evo Notes app sidebar — an inset rounded card (brand lockup, primary nav,
 * secondary nav, footer). Items use the primary ink; the active item becomes
 * a solid dark pill with white text. `collapsed` renders a 60px icon rail
 * with the same inset-card treatment and fixed item sizing (no layout shift).
 */
const PRIMARY = [
  { key: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
  { key: 'workspaces', label: 'Workspaces', icon: 'workspaces' },
  { key: 'quiz', label: 'Quiz', icon: 'quiz' },
  { key: 'schedule', label: 'Calendar', icon: 'schedule' },
];
const SECONDARY = [
  { key: 'flashcards', label: 'Flashcards', icon: 'flashcards' },
  { key: 'files', label: 'Files', icon: 'files' },
  { key: 'tasks', label: 'Tasks', icon: 'tasks', badge: '3' },
  { key: 'notes', label: 'Notes', icon: 'notes', badge: '2' },
];
const FOOTER = [
  { key: 'profile', label: 'Profile', icon: 'profile' },
  { key: 'settings', label: 'Settings', icon: 'settings' },
  { key: 'logout', label: 'Log out', icon: 'logout' },
];

function LogoMark({ size = 36 }) {
  const u = size / 36;
  return (
    <span style={{ width: size, height: size, flex: `0 0 ${size}px`, borderRadius: 10 * u, background: 'var(--ev-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width={size * 0.62} height={size * 0.62} viewBox="0 0 36 36" fill="none">
        <rect x="9" y="9" width="14" height="3.6" rx="1.8" fill="#ffffff" />
        <rect x="9" y="16.2" width="10" height="3.6" rx="1.8" fill="#aef07f" />
        <rect x="9" y="23.4" width="14" height="3.6" rx="1.8" fill="#ffffff" />
        <circle cx="25.5" cy="18" r="2.1" fill="#8c7bd9" />
      </svg>
    </span>
  );
}

function Row({ item, active, collapsed, onNavigate }) {
  const on = item.key === active;
  if (collapsed) {
    return (
      <button
        onClick={() => onNavigate && onNavigate(item.key)}
        title={item.label}
        style={{
          width: 40, height: 40, flex: '0 0 40px', display: 'flex', alignItems: 'center', justifyContent: 'center',
          borderRadius: 'var(--ev-r-md)', border: 'none', cursor: 'pointer', padding: 0,
          background: on ? 'var(--ev-primary)' : 'transparent',
          color: on ? '#fff' : 'var(--ev-ink)',
        }}
      >
        <Icon name={item.icon} size={19} color={on ? '#fff' : 'var(--ev-ink)'} />
      </button>
    );
  }
  return (
    <button
      onClick={() => onNavigate && onNavigate(item.key)}
      style={{
        display: 'flex', alignItems: 'center', gap: 13, width: '100%',
        padding: '10px 12px', borderRadius: 'var(--ev-r-md)', border: 'none', cursor: 'pointer',
        fontFamily: 'var(--ev-font-sans)', fontSize: '0.9688rem', textAlign: 'left',
        fontWeight: on ? 700 : 500,
        color: on ? '#fff' : 'var(--ev-ink)',
        background: on ? 'var(--ev-primary)' : 'transparent',
      }}
    >
      <Icon name={item.icon} size={21} color={on ? '#fff' : 'var(--ev-ink)'} />
      <span>{item.label}</span>
      {item.badge && (
        <span style={{
          marginLeft: 'auto', minWidth: 26, height: 26, padding: '0 8px', boxSizing: 'border-box',
          borderRadius: 'var(--ev-r-pill)',
          background: on ? 'rgba(255,255,255,.30)' : 'var(--ev-purple)',
          color: '#fff',
          fontSize: '0.8438rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>{item.badge}</span>
      )}
    </button>
  );
}

export function Sidebar({ active = 'dashboard', collapsed = false, onNavigate, style }) {
  if (collapsed) {
    return (
      <div style={{
        width: 60, flex: '0 0 60px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: 6, padding: '16px 0', margin: 10, marginRight: 0,
        background: 'var(--ev-bg-sage)', border: 'none', borderRadius: 'var(--ev-r-2xl)',
        fontFamily: 'var(--ev-font-sans)', ...style,
      }}>
        <LogoMark size={36} />
        <div style={{ height: 8 }} />
        {PRIMARY.map((i) => <Row key={i.key} item={i} active={active} collapsed onNavigate={onNavigate} />)}
        <div style={{ width: 26, height: 1, background: 'var(--ev-line)', margin: '6px 0' }} />
        {SECONDARY.map((i) => <Row key={i.key} item={i} active={active} collapsed onNavigate={onNavigate} />)}
        <div style={{ marginTop: 'auto' }} />
        <Row item={FOOTER[1]} active={active} collapsed onNavigate={onNavigate} />
      </div>
    );
  }
  const SectionLabel = ({ children }) => (
    <div style={{
      fontSize: '0.7188rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
      color: 'var(--ev-ink-faint)', padding: '0 12px', margin: '0 0 6px',
    }}>{children}</div>
  );
  return (
    <div style={{
      width: 222, flex: '0 0 222px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column',
      padding: '16px 10px', margin: 10, marginRight: 0,
      background: 'var(--ev-bg-sage)', border: 'none', borderRadius: 'var(--ev-r-2xl)',
      fontFamily: 'var(--ev-font-sans)', ...style,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '4px 8px 18px' }}>
        <LogoMark size={36} />
        <span style={{ fontWeight: 800, fontSize: '1.125rem', color: 'var(--ev-ink)', letterSpacing: '-0.01em' }}>Evo Notes</span>
      </div>
      <SectionLabel>General</SectionLabel>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {PRIMARY.map((i) => <Row key={i.key} item={i} active={active} onNavigate={onNavigate} />)}
      </div>
      <div style={{ height: 16 }} />
      <SectionLabel>Tools</SectionLabel>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {SECONDARY.map((i) => <Row key={i.key} item={i} active={active} onNavigate={onNavigate} />)}
      </div>
      <div style={{ marginTop: 'auto' }} />
      <SectionLabel>Others</SectionLabel>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {FOOTER.map((i) => <Row key={i.key} item={i} active={active} onNavigate={onNavigate} />)}
      </div>
    </div>
  );
}
