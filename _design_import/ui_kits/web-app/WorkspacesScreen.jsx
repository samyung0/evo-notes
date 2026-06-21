import React from 'react';
import { Sidebar } from './Sidebar.jsx';
import { Card } from '../../components/core/Card.jsx';
import { Button } from '../../components/core/Button.jsx';
import { Input } from '../../components/core/Input.jsx';
import { IconButton } from '../../components/core/IconButton.jsx';
import { Icon } from '../../components/core/Icon.jsx';
import { Avatar } from '../../components/core/Avatar.jsx';

const ITEMS = [
  { id: 'bio', name: 'Biology 101', type: 'course', meta: '6 chapters · 24 files', tags: ['Cells', 'Genetics'], when: 'last opened 2d ago', accent: 'var(--ev-green-note)', iconColor: '#222222' },
  { id: 'ws1', name: 'Workspace 1', type: 'workspace', meta: '10 files', tags: ['Cooking', 'Recipes'], when: 'last opened 5h ago', accent: 'var(--ev-purple)', iconColor: '#ffffff' },
  { id: 'calc', name: 'Calculus II', type: 'course', meta: '8 chapters · 31 files', tags: ['Limits', 'Integrals'], when: 'last opened 1w ago', accent: 'var(--ev-info)', iconColor: '#222222' },
  { id: 'hist', name: 'World History', type: 'course', meta: '5 chapters · 18 files', tags: ['Ancient', 'Modern'], when: 'last opened 3d ago', accent: 'var(--ev-warning)', iconColor: '#222222' },
  { id: 'read', name: 'Reading list', type: 'workspace', meta: '14 files', tags: ['Essays', 'Fiction'], when: 'last opened 2w ago', accent: 'var(--ev-purple)', iconColor: '#ffffff' },
];

/** Search that collapses to an icon button and expands on press. */
function ExpandingSearch() {
  const [open, setOpen] = React.useState(false);
  return (
    <div
      style={{
        marginLeft: 'auto',
        display: 'flex',
        alignItems: 'center',
        width: open ? 280 : 46,
        transition: 'width .22s ease',
      }}
      onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false); }}
    >
      {open ? (
        <Input
          autoFocus
          icon="search"
          placeholder="Search workspaces…"
          style={{ width: '100%', padding: '11px 14px', borderRadius: 'var(--ev-r-md)' }}
          inputStyle={{ fontSize: '0.9375rem' }}
        />
      ) : (
        <IconButton icon="search" variant="outline" size="md" onClick={() => setOpen(true)} />
      )}
    </div>
  );
}

/** Workspaces grid — entry point before opening a course/workspace. */
export function WorkspacesScreen({ onNavigate, onOpen }) {
  const shown = ITEMS;
  // The white surface is built from two overlapping rounded blocks (left column + bottom strip).
  // Their convex top-right corners form a notch with rounded edges that curve outward, leaving
  // room for the floating top bar in the top-right corner.
  const NOTCH_W = 340, NOTCH_H = 94, NOTCH_R = 28;
  const blockBase = { position: 'absolute', background: 'var(--ev-surface)', borderRadius: 'var(--ev-r-2xl)' };
  return (
    <div style={{ display: 'flex', height: '100%', background: 'var(--ev-bg-page)', fontFamily: 'var(--ev-font-sans)' }}>
      <Sidebar active="workspaces" onNavigate={onNavigate} />
      <div style={{ flex: 1, minWidth: 0, margin: 10, display: 'flex', position: 'relative' }}>
        {/* white L-shaped surface (two rounded blocks) with a single drop shadow */}
        <div style={{ position: 'absolute', inset: 0, filter: 'drop-shadow(0 1px 2px rgba(0,0,0,.04)) drop-shadow(0 12px 32px rgba(0,0,0,.05))' }}>
          <div style={{ ...blockBase, top: 0, left: 0, bottom: 0, width: 'calc(100% - ' + NOTCH_W + 'px)' }}></div>
          <div style={{ ...blockBase, top: NOTCH_H + 'px', left: 0, right: 0, bottom: 0 }}></div>
          {/* concave fillet rounding the inner corner of the notch */}
          <div style={{ position: 'absolute', top: (NOTCH_H - NOTCH_R) + 'px', left: 'calc(100% - ' + NOTCH_W + 'px)', width: NOTCH_R, height: NOTCH_R, background: 'radial-gradient(circle ' + NOTCH_R + 'px at top right, transparent ' + (NOTCH_R - 0.5) + 'px, var(--ev-surface) ' + NOTCH_R + 'px)' }}></div>
        </div>
        {/* content sits above the surface */}
        <div style={{ position: 'relative', flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', padding: '28px 30px', gap: 22, overflow: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', minHeight: 54, paddingRight: NOTCH_W }}>
          <h2 style={{ margin: 0, fontSize: '1.625rem', fontWeight: 800, color: 'var(--ev-ink)', letterSpacing: '-0.02em' }}>Workspaces</h2>
          <button
            type="button"
            aria-label="New workspace"
            style={{ marginLeft: 'auto', width: 46, height: 46, flex: '0 0 46px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--ev-bg)', border: 'none', borderRadius: 'var(--ev-r-md)', cursor: 'pointer', padding: 0, transition: 'border-color .15s ease' }}
          >
            <Icon name="plus" size={22} color="var(--ev-ink)" />
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span style={{ marginLeft: 'auto', marginRight: 8, padding: '4px 0px 0px', fontSize: '0.9375rem', color: 'var(--ev-ink)', display: 'flex', alignItems: 'center', gap: 5 }}>Recent <Icon name="chevronDown" size={15} /></span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {shown.map((it) => (
            <Card key={it.id} padding={20} radius="var(--ev-r-xl)" interactive onClick={() => onOpen && onOpen(it)} style={{ background: 'var(--ev-surface)', border: '1px solid var(--ev-border)', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                <span style={{ width: 48, height: 48, borderRadius: 'var(--ev-r-lg)', background: it.accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name={it.type === 'course' ? 'book' : 'workspaces'} size={26} color={it.iconColor} />
                </span>
                <Icon name="more" size={22} color="var(--ev-ink)" style={{ marginLeft: 'auto' }} />
              </div>
              <div>
                <div style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--ev-ink)' }}>{it.name}</div>
                <div style={{ fontSize: '0.875rem', color: 'var(--ev-ink-soft)', marginTop: 4 }}>{it.meta}</div>
                <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                  {it.tags.map((t) => <span key={t} style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--ev-ink)' }}>#{t}</span>)}
                </div>
              </div>
            </Card>
          ))}
          <Card padding={20} radius="var(--ev-r-xl)" interactive style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, color: 'var(--ev-ink-faint)', minHeight: 150 }}>
            <span style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="plus" size={22} />
            </span>
            <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>New workspace</span>
          </Card>
        </div>
        </div>
        {/* top bar — floats in the chopped corner, outside the white card */}
        <div style={{ position: 'absolute', top: 10, right: 10, display: 'flex', alignItems: 'center', gap: 10, background: 'var(--ev-bg-sage)', borderRadius: 'var(--ev-r-2xl)', padding: '10px 12px 10px 16px' }}>
          <IconButton icon="search" variant="dark" />
          <IconButton icon="bell" variant="accent" dot />
          <div style={{ height: 54, display: 'flex', alignItems: 'center', gap: 10, borderRadius: 'var(--ev-r-pill)', padding: '0 16px 0 7px', background: 'var(--ev-white)', boxShadow: 'var(--ev-shadow-xs)' }}>
            <Avatar name="Kate Malone" src="avatars/student.svg" size={40} />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.9063rem', fontWeight: 700, color: 'var(--ev-ink)', lineHeight: 1.1 }}>Kate Malone</span>
              <span style={{ fontSize: '0.7813rem', color: 'var(--ev-ink-faint)' }}>Class 9A</span>
            </div>
            <Icon name="chevronDown" size={16} color="var(--ev-ink-faint)" style={{ marginLeft: 2 }} />
          </div>
        </div>
      </div>
    </div>
  );
}
