import React from 'react';
import { Sidebar } from './Sidebar.jsx';
import { Card } from '../../components/core/Card.jsx';
import { Button } from '../../components/core/Button.jsx';
import { Input } from '../../components/core/Input.jsx';
import { IconButton } from '../../components/core/IconButton.jsx';
import { Icon } from '../../components/core/Icon.jsx';
import { Avatar } from '../../components/core/Avatar.jsx';

const QUIZZES = [
  { id: 'q1', name: 'Cell biology basics', workspace: 'Biology 101', questions: 12, chapters: 'Ch.1, Ch.2', created: 'Created 2d ago', accent: 'var(--ev-green-note)', iconColor: '#222222' },
  { id: 'q2', name: 'Evolution drill',      workspace: 'Biology 101', questions: 8,  chapters: 'Ch.4',       created: 'Created 4d ago', accent: 'var(--ev-warning)',    iconColor: '#222222' },
  { id: 'q3', name: 'Limits & derivatives', workspace: 'Calculus II', questions: 15, chapters: 'Ch.1–Ch.3',  created: 'Created 1w ago', accent: 'var(--ev-info)',       iconColor: '#222222' },
  { id: 'q4', name: 'Ancient civilizations',workspace: 'World History',questions: 10, chapters: 'Ch.1, Ch.2', created: 'Created 1w ago', accent: 'var(--ev-purple)',     iconColor: '#ffffff' },
  { id: 'q5', name: 'Genetics review',      workspace: 'Biology 101', questions: 20, chapters: 'Ch.2, Ch.3', created: 'Created 2w ago', accent: 'var(--ev-green-note)', iconColor: '#222222' },
];

const ATTEMPTS = [
  { id: 'a1', quiz: 'Mixed review',       workspace: 'Biology 101',  chapters: 'Ch.1, Ch.2', score: '8/10',  pct: 80, date: 'Apr 18, 2026' },
  { id: 'a2', quiz: 'Evolution drill',    workspace: 'Biology 101',  chapters: 'Ch.4',       score: '3/8',   pct: 38, date: 'Apr 16, 2026' },
  { id: 'a3', quiz: 'Ecology check',      workspace: 'Biology 101',  chapters: 'Ch.5, Ch.6', score: '6/10',  pct: 60, date: 'Apr 12, 2026' },
  { id: 'a4', quiz: 'Limits & derivatives', workspace: 'Calculus II', chapters: 'Ch.1–Ch.3', score: '13/15', pct: 87, date: 'Apr 10, 2026' },
  { id: 'a5', quiz: 'Ancient civilizations', workspace: 'World History', chapters: 'Ch.1, Ch.2', score: '7/10', pct: 70, date: 'Apr 5, 2026' },
];

const MENU_ITEMS = [
  { key: 'details', label: 'View details', icon: 'files' },
  { key: 'retry', label: 'Retry quiz', icon: 'clock' },
  { key: 'edit', label: 'Edit quiz', icon: 'notes' },
  { key: 'hide', label: 'Hide', icon: 'minus' },
];

function scoreTone(p) { return p >= 70 ? 'var(--ev-success-ink)' : p >= 55 ? 'var(--ev-warning-ink)' : 'var(--ev-error-ink)'; }
function scoreBg(p) { return p >= 70 ? 'var(--ev-success-soft)' : p >= 55 ? 'var(--ev-warning-soft)' : 'var(--ev-error-soft)'; }

/** Left-aligned filter / sort control used above both views. */
function FilterSort() {
  const btn = {
    display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 12px',
    background: 'transparent', border: 'none', borderRadius: 'var(--ev-r-md)',
    fontFamily: 'var(--ev-font-sans)', fontSize: '0.8438rem', fontWeight: 600, color: 'var(--ev-ink)', cursor: 'pointer',
  };
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      <button type="button" style={btn}><Icon name="filter" size={16} color="var(--ev-ink)" />Filter</button>
      <button type="button" style={btn}><Icon name="chevronDown" size={16} color="var(--ev-ink)" />Sort</button>
    </div>
  );
}

/** Three-dot row action menu. */
function RowMenu({ open, onToggle }) {
  return (
    <div style={{ position: 'relative' }}>
      <button
        type="button"
        aria-label="More actions"
        onClick={onToggle}
        style={{ width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', background: open ? 'var(--ev-bg)' : 'transparent', border: '1px solid', borderColor: open ? 'var(--ev-border)' : 'transparent', borderRadius: 'var(--ev-r-sm)', cursor: 'pointer' }}
      >
        <Icon name="moreVertical" size={20} strokeWidth={3.4} color="var(--ev-ink)" />
      </button>
      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 20, width: 184, background: 'var(--ev-white)', border: '1px solid var(--ev-border)', borderRadius: 'var(--ev-r-md)', boxShadow: 'var(--ev-shadow-card)', padding: 6 }}>
          {MENU_ITEMS.map((m) => (
            <button
              key={m.key}
              type="button"
              style={{ display: 'flex', alignItems: 'center', gap: 11, width: '100%', padding: '9px 11px', background: 'transparent', border: 'none', borderRadius: 'var(--ev-r-sm)', cursor: 'pointer', fontFamily: 'var(--ev-font-sans)', fontSize: '0.875rem', fontWeight: 500, color: m.key === 'hide' ? 'var(--ev-error-ink)' : 'var(--ev-ink)', textAlign: 'left' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--ev-bg)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              <Icon name={m.icon} size={16} color={m.key === 'hide' ? 'var(--ev-error-ink)' : 'var(--ev-ink-faint)'} />
              {m.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Quiz — workspace-style inset surface with All quizzes / Past attempts tabs. */
export function QuizScreen({ onNavigate }) {
  const [tab, setTab] = React.useState('all');
  const [openMenu, setOpenMenu] = React.useState(null);

  const NOTCH_W = 340, NOTCH_H = 94, NOTCH_R = 28;
  const blockBase = { position: 'absolute', background: 'var(--ev-surface)', borderRadius: 'var(--ev-r-2xl)' };

  const TABS = [{ key: 'all', label: 'All quizzes' }, { key: 'past', label: 'Past attempts' }];

  return (
    <div style={{ display: 'flex', height: '100%', background: 'var(--ev-bg-page)', fontFamily: 'var(--ev-font-sans)' }} onClick={() => setOpenMenu(null)}>
      <Sidebar active="quiz" onNavigate={onNavigate} />
      <div style={{ flex: 1, minWidth: 0, margin: 10, display: 'flex', position: 'relative' }}>
        {/* white L-shaped surface (two rounded blocks) with a single drop shadow */}
        <div style={{ position: 'absolute', inset: 0, filter: 'drop-shadow(0 1px 2px rgba(0,0,0,.04)) drop-shadow(0 12px 32px rgba(0,0,0,.05))' }}>
          <div style={{ ...blockBase, top: 0, left: 0, bottom: 0, width: 'calc(100% - ' + NOTCH_W + 'px)' }}></div>
          <div style={{ ...blockBase, top: NOTCH_H + 'px', left: 0, right: 0, bottom: 0 }}></div>
          <div style={{ position: 'absolute', top: (NOTCH_H - NOTCH_R) + 'px', left: 'calc(100% - ' + NOTCH_W + 'px)', width: NOTCH_R, height: NOTCH_R, background: 'radial-gradient(circle ' + NOTCH_R + 'px at top right, transparent ' + (NOTCH_R - 0.5) + 'px, var(--ev-surface) ' + NOTCH_R + 'px)' }}></div>
        </div>

        {/* content */}
        <div style={{ position: 'relative', flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', padding: '28px 30px', gap: 20, overflow: 'auto' }}>
          {/* heading + add button */}
          <div style={{ display: 'flex', alignItems: 'center', minHeight: 54, paddingRight: NOTCH_W }}>
            <h2 style={{ margin: 0, fontSize: '1.625rem', fontWeight: 800, color: 'var(--ev-ink)', letterSpacing: '-0.02em' }}>Quizzes</h2>
            <button
              type="button"
              aria-label="New quiz"
              style={{ marginLeft: 'auto', width: 46, height: 46, flex: '0 0 46px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--ev-bg)', border: 'none', borderRadius: 'var(--ev-r-md)', cursor: 'pointer', padding: 0, transition: 'border-color .15s ease' }}
            >
              <Icon name="plus" size={22} color="var(--ev-ink)" />
            </button>
          </div>

          {/* tab switcher — underline style */}
          <div style={{ display: 'flex', gap: 6, alignSelf: 'stretch', borderBottom: '1px solid var(--ev-line)' }}>
            {TABS.map((t) => {
              const on = t.key === tab;
              return (
                <button key={t.key} type="button" onClick={() => setTab(t.key)} style={{
                  position: 'relative', border: 'none', cursor: 'pointer', fontFamily: 'var(--ev-font-sans)',
                  fontSize: '0.9063rem', fontWeight: on ? 700 : 500,
                  padding: '8px 14px', marginBottom: -1, background: 'transparent',
                  color: on ? 'var(--ev-ink)' : 'var(--ev-ink-soft)', transition: 'color .15s ease',
                }}>
                  {on && <span style={{ position: 'absolute', inset: 0, background: 'var(--ev-bg)', border: '1px solid var(--ev-border)', borderRadius: 'var(--ev-r-md)', zIndex: -1 }}></span>}
                  {t.label}
                  {on && <span style={{ position: 'absolute', left: 4, right: 4, bottom: 0, height: 2, background: 'var(--ev-ink)', borderRadius: 2 }}></span>}
                </button>
              );
            })}
          </div>

          {tab === 'all' ? (
            <React.Fragment>
              {/* filter/sort — left aligned */}
              <div style={{ marginBottom: -12 }}><FilterSort /></div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                {QUIZZES.map((q) => (
                  <Card key={q.id} padding={20} radius="var(--ev-r-xl)" interactive style={{ background: 'var(--ev-surface)', border: '1px solid var(--ev-border)', display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                      <span style={{ width: 48, height: 48, borderRadius: 'var(--ev-r-lg)', background: q.accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Icon name="quiz" size={26} color={q.iconColor} />
                      </span>
                      <Icon name="more" size={22} color="var(--ev-ink)" style={{ marginLeft: 'auto' }} />
                    </div>
                    <div>
                      <div style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--ev-ink)' }}>{q.name}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: '0.875rem', color: 'var(--ev-ink)', fontWeight: 600, marginTop: 5 }}>
                        <Icon name="book" size={15} color="var(--ev-ink)" />{q.workspace}
                      </div>
                      <div style={{ fontSize: '0.875rem', color: 'var(--ev-ink-soft)', marginTop: 4 }}>{q.questions} questions · {q.chapters}</div>
                      <div style={{ fontSize: '0.8125rem', color: 'var(--ev-ink-soft)', marginTop: 12 }}>{q.created}</div>
                    </div>
                  </Card>
                ))}
                <Card padding={20} radius="var(--ev-r-xl)" interactive style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, color: 'var(--ev-ink-faint)', minHeight: 150 }}>
                  <span style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name="plus" size={22} />
                  </span>
                  <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>New quiz</span>
                </Card>
              </div>
            </React.Fragment>
          ) : (
            <React.Fragment>
              {/* search + filter/sort */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Input icon="search" placeholder="Search attempts…" style={{ width: 280, padding: '10px 13px', borderRadius: 'var(--ev-r-md)' }} />
                <FilterSort />
              </div>

              {/* data table */}
              <Card padding={0} style={{ overflow: 'visible' }}>
                <div style={{ display: 'flex', alignItems: 'center', padding: '13px 20px', background: 'var(--ev-bg)', borderBottom: '1px solid var(--ev-line)', borderTopLeftRadius: 'var(--ev-r-lg)', borderTopRightRadius: 'var(--ev-r-lg)', fontSize: '0.75rem', fontWeight: 700, color: 'var(--ev-ink-faint)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  <span style={{ flex: 2.2 }}>Quiz</span>
                  <span style={{ flex: 1.8 }}>Workspace</span>
                  <span style={{ flex: 1, textAlign: 'center' }}>Chapters</span>
                  <span style={{ flex: 1, textAlign: 'center' }}>Score</span>
                  <span style={{ flex: 1.3 }}>Date</span>
                  <span style={{ flex: '0 0 220px', textAlign: 'left' }}>Action</span>
                </div>
                {ATTEMPTS.map((a, i) => (
                  <div key={a.id} style={{ display: 'flex', alignItems: 'center', padding: '13px 20px', borderBottom: i < ATTEMPTS.length - 1 ? '1px solid var(--ev-line)' : 'none', fontSize: '0.9063rem' }}>
                    <span style={{ flex: 2.2, fontWeight: 500, color: 'var(--ev-ink)' }}>{a.quiz}</span>
                    <span style={{ flex: 1.8, fontWeight: 500, color: 'var(--ev-ink-soft)' }}>{a.workspace}</span>
                    <span style={{ flex: 1, textAlign: 'center', fontWeight: 500, color: 'var(--ev-ink-soft)' }}>{a.chapters}</span>
                    <span style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.8125rem', color: scoreTone(a.pct), background: scoreBg(a.pct), padding: '4px 11px', borderRadius: 'var(--ev-r-pill)' }}>{a.score}</span>
                    </span>
                    <span style={{ flex: 1.3, fontWeight: 500, color: 'var(--ev-ink-faint)' }}>{a.date}</span>
                    <span style={{ flex: '0 0 220px', display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 6 }}>
                      <button type="button" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'transparent', border: 'none', padding: '6px 8px', fontFamily: 'var(--ev-font-sans)', fontSize: '0.875rem', fontWeight: 600, color: 'var(--ev-ink)', cursor: 'pointer' }}>Check result<Icon name="arrowRight" size={16} color="var(--ev-ink)" /></button>
                      <div onClick={(e) => e.stopPropagation()}>
                        <RowMenu open={openMenu === a.id} onToggle={() => setOpenMenu(openMenu === a.id ? null : a.id)} />
                      </div>
                    </span>
                  </div>
                ))}
              </Card>
            </React.Fragment>
          )}
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
