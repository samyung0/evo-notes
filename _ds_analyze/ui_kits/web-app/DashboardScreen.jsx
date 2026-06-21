import React from 'react';
import { Sidebar } from './Sidebar.jsx';
import { NoteCard } from '../../components/core/NoteCard.jsx';
import { Avatar } from '../../components/core/Avatar.jsx';
import { IconButton } from '../../components/core/IconButton.jsx';
import { Icon } from '../../components/core/Icon.jsx';
import { Checkbox } from '../../components/core/Checkbox.jsx';

const WORKSPACES = [
  { name: 'Biology 101', meta: 'Course · 12 Files · 6 Chapters ', tags: ['Cells', 'Genetics'], icon: 'book', accent: 'var(--ev-green-note)', iconColor: '#222222' },
  { name: 'Recipes notebook', meta: 'Workspace · 10 Files', tags: ['Cooking', 'Recipes'], icon: 'workspaces', accent: 'var(--ev-purple)', iconColor: '#ffffff' },
];

const TASKS = [
  { label: 'Finish Cell biology quiz', meta: 'Biology 101', done: false },
  { label: 'Review linear equations', meta: 'Math', done: false },
  { label: 'Read Chapter 5 notes', meta: 'Workspace 1', done: true },
];

const WEEK = [
  { d: 'Mon', n: 15 }, { d: 'Tue', n: 16 }, { d: 'Wed', n: 17 },
  { d: 'Thu', n: 18 }, { d: 'Fri', n: 19, today: true }, { d: 'Sat', n: 20 }, { d: 'Sun', n: 21 },
];

const EVENTS = [
  { time: '8:30', title: 'Math', meta: 'Room B3 · 124', range: '8:30 — 9:20', icon: 'book', tag: null, accent: 'var(--ev-green-note)', iconColor: '#222222' },
  { time: '10:30', title: 'Biology', meta: 'Room B2 · 158', range: '10:30 — 11:20', icon: 'practice', tag: null, accent: 'var(--ev-purple)', iconColor: '#ffffff' },
  { time: '2:00', title: 'Study group', meta: 'Library · Floor 2', range: '14:00 — 15:00', icon: 'workspaces', tag: 'Group', accent: 'var(--ev-green-note)', iconColor: '#222222' },
];

/** Striped illustration placeholder for a hero banner. */
function BannerPlaceholder() {
  return (
    <div style={{
      height: 168, borderRadius: 'var(--ev-r-xl)', overflow: 'hidden', position: 'relative',
      background: 'repeating-linear-gradient(135deg, var(--ev-purple-soft) 0 14px, var(--ev-purple-softer) 14px 28px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <span style={{
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: '0.8125rem',
        color: 'var(--ev-purple-ink)', background: 'var(--ev-white)', padding: '7px 14px',
        borderRadius: 'var(--ev-r-pill)', letterSpacing: '0.02em',
      }}>illustration / banner</span>
    </div>
  );
}

/** Evo Notes dashboard — white inset cards on a light page, streak intro + tasks/schedule rail. */
export function DashboardScreen({ onNavigate }) {
  const [tasks, setTasks] = React.useState(TASKS);
  const toggle = (i) => setTasks((t) => t.map((x, j) => (j === i ? { ...x, done: !x.done } : x)));

  const cardShell = {
    background: 'var(--ev-surface)', borderRadius: 'var(--ev-r-2xl)', boxShadow: 'var(--ev-shadow-card)',
  };

  return (
    <div style={{ display: 'flex', height: '100%', background: 'var(--ev-bg-page)', fontFamily: 'var(--ev-font-sans)' }}>
      <Sidebar active="dashboard" onNavigate={onNavigate} />

      {/* center — white inset card */}
      <div style={{ flex: 1, minWidth: 0, margin: '10px 0 10px 10px', display: 'flex' }}>
        <div style={{ ...cardShell, flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', padding: '30px 32px', gap: 26, overflow: 'auto' }}>
          {/* streak intro */}
          <div>
            <div style={{ fontSize: '1.875rem', fontWeight: 800, color: 'var(--ev-ink)', letterSpacing: '-0.02em', lineHeight: 1.15 }}>Seems like you just started</div>
            <div style={{ fontSize: '1.125rem', color: 'var(--ev-ink-soft)', marginTop: 8 }}>Take a look around — your workspaces, notes and streaks will show up here.</div>
          </div>

          <BannerPlaceholder />

          {/* recent workspace */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'var(--ev-ink)' }}>Recent workspace</h3>
              <span style={{ marginLeft: 'auto', fontSize: '0.9375rem', color: 'var(--ev-ink-faint)', cursor: 'pointer' }} onClick={() => onNavigate && onNavigate('workspaces')}>All workspaces →</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {WORKSPACES.map((w) => (
                <div key={w.name} style={{ background: 'var(--ev-surface)', border: '1px solid var(--ev-border)', borderRadius: 'var(--ev-r-xl)', padding: 20, cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 16 }} onClick={() => onNavigate && onNavigate('workspaces')}>
                  <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                    <span style={{ width: 48, height: 48, borderRadius: 'var(--ev-r-lg)', background: w.accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon name={w.icon} size={26} color={w.iconColor} />
                    </span>
                    <Icon name="more" size={22} color="var(--ev-ink)" style={{ marginLeft: 'auto' }} />
                  </div>
                  <div>
                    <div style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--ev-ink)' }}>{w.name}</div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--ev-ink-soft)', marginTop: 4 }}>{w.meta}</div>
                    <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                      {w.tags.map((t) => <span key={t} style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--ev-ink)' }}>#{t}</span>)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* thinking space */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'var(--ev-ink)' }}>Thinking Space</h3>
              <span style={{ marginLeft: 'auto', fontSize: '0.9375rem', color: 'var(--ev-ink-faint)', cursor: 'pointer' }}>See all →</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <NoteCard theme="green" title="Math conspect" body="A linear equation has the form ax + b = c, where a, b and c are constants." date="May 05, 2025" />
              <NoteCard theme="purple" title="Biology conspect" body="A cell is the basic structural and functional unit of all living organisms." date="Apr 29, 2025" />
            </div>
          </div>
        </div>
      </div>

      {/* right rail — standalone top bar + white card */}
      <div style={{ width: 360, flex: '0 0 360px', margin: 10, marginLeft: 10, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {/* deep-grey top bar — its own inset card */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--ev-bg-sage)', borderRadius: 'var(--ev-r-2xl)', padding: '10px 12px 10px 16px' }}>
          <IconButton icon="search" variant="dark" />
          <IconButton icon="bell" variant="accent" dot />
          <div style={{ marginLeft: 'auto', height: 54, display: 'flex', alignItems: 'center', gap: 10, borderRadius: 'var(--ev-r-pill)', padding: '0 16px 0 7px', background: 'var(--ev-white)', boxShadow: 'var(--ev-shadow-xs)' }}>
            <Avatar name="Kate Malone" src="avatars/student.svg" size={40} />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.9063rem', fontWeight: 700, color: 'var(--ev-ink)', lineHeight: 1.1 }}>Kate Malone</span>
              <span style={{ fontSize: '0.7813rem', color: 'var(--ev-ink-faint)' }}>Class 9A</span>
            </div>
            <Icon name="chevronDown" size={16} color="var(--ev-ink-faint)" style={{ marginLeft: 2 }} />
          </div>
        </div>

        <div style={{ ...cardShell, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', padding: '20px 18px', gap: 20, overflow: 'auto' }}>
          {/* tasks */}
          <div>
            <h4 style={{ margin: '0 0 14px', fontSize: '1.25rem', fontWeight: 800, color: 'var(--ev-ink)' }}>Tasks</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {tasks.map((t, i) => (
                <div key={t.label} style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }} onClick={() => toggle(i)}>
                  <Checkbox checked={t.done} tone="purple" size={22} onChange={() => toggle(i)} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: t.done ? 'var(--ev-ink-faint)' : 'var(--ev-ink)', textDecoration: t.done ? 'line-through' : 'none' }}>{t.label}</div>
                    <div style={{ fontSize: '0.8125rem', color: 'var(--ev-ink-faint)' }}>{t.meta}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* schedule */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 14 }}>
              <h4 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'var(--ev-ink)' }}>Jun 2026</h4>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
                <span style={{ width: 28, height: 28, borderRadius: 'var(--ev-r-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><Icon name="chevronLeft" size={18} color="var(--ev-ink-soft)" /></span>
                <span style={{ width: 28, height: 28, borderRadius: 'var(--ev-r-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><Icon name="chevronRight" size={18} color="var(--ev-ink-soft)" /></span>
              </div>
            </div>

            {/* date picker */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 18 }}>
              {WEEK.map((w) => (
                <div key={w.n} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <span style={{ fontSize: '0.7813rem', color: 'var(--ev-ink-faint)', fontWeight: 600 }}>{w.d}</span>
                  <span style={{
                    width: 38, height: 38, borderRadius: 'var(--ev-r-md)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.9375rem', fontWeight: 700,
                    background: w.today ? 'var(--ev-primary)' : 'transparent',
                    color: w.today ? '#fff' : 'var(--ev-ink)',
                  }}>{w.n}</span>
                </div>
              ))}
            </div>

            <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--ev-ink)', marginBottom: 12 }}>Today, Fri</div>

            {/* timeline */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {EVENTS.map((e, ei) => (
                <React.Fragment key={e.title}>
                <div style={{ display: 'flex', gap: 12 }}>
                  <span style={{ fontSize: '0.7813rem', color: '#222222', fontWeight: 700, width: 42, flex: '0 0 42px', paddingTop: 14 }}>{e.time}</span>
                  <div style={{ flex: 1, minWidth: 0, background: 'var(--ev-bg-soft)', borderRadius: 'var(--ev-r-lg)', padding: 14, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <span style={{ width: 34, height: 34, flex: '0 0 34px', borderRadius: '50%', background: e.accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon name={e.icon} size={18} color={e.iconColor} />
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--ev-ink)' }}>{e.title}</span>
                        {e.tag && <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--ev-purple-ink)', background: 'var(--ev-purple-soft)', padding: '2px 9px', borderRadius: 'var(--ev-r-pill)' }}>{e.tag}</span>}
                        <Icon name="chevronRight" size={15} color="var(--ev-ink-faint)" style={{ marginLeft: 'auto' }} />
                      </div>
                      <div style={{ fontSize: '0.8125rem', color: 'var(--ev-ink-faint)', marginTop: 3 }}>{e.meta}</div>
                      <div style={{ fontSize: '0.8125rem', color: 'var(--ev-ink-faint)', marginTop: 2 }}>{e.range}</div>
                    </div>
                  </div>
                </div>
                {ei === 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '-1px 0' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#222222', letterSpacing: '0.01em', width: 42, flex: '0 0 42px' }}>Now</span>
                    <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#222222', flex: '0 0 7px' }} />
                      <span style={{ flex: 1, height: 2, background: '#222222', borderRadius: 1 }} />
                    </div>
                  </div>
                )}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
