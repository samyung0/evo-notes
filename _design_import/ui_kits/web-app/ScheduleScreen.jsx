import React from 'react';
import { Sidebar } from './Sidebar.jsx';
import { IconButton } from '../../components/core/IconButton.jsx';
import { Avatar } from '../../components/core/Avatar.jsx';
import { Icon } from '../../components/core/Icon.jsx';

const MUTED = 'var(--ev-ink-faint)';

const DOW = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const MINI = [
  [25, 26, 27, 28, 29, 30, 31], [1, 2, 3, 4, 5, 6, 7], [8, 9, 10, 11, 12, 13, 14],
  [15, 16, 17, 18, 19, 20, 21], [22, 23, 24, 25, 26, 27, 28], [29, 30, 1, 2, 3, 4, 5],
];

// Labels — user-assignable colors for calendar events.
// dark === text reads white on the fill; otherwise black.
const LABELS = [
  { name: 'Biology', color: 'var(--ev-info)', dark: false },
  { name: 'Genetics', color: 'var(--ev-purple)', dark: true },
  { name: 'Study', color: 'var(--ev-success)', dark: false },
  { name: 'Workshop', color: 'var(--ev-error)', dark: false },
  { name: 'Lunch', color: 'var(--ev-warning)', dark: false },
];
const LABEL_MAP = Object.fromEntries(LABELS.map((l) => [l.name, l]));

const WEEK = [
  { day: 'Mon', full: 'Monday', date: 11 }, { day: 'Tue', full: 'Tuesday', date: 12 },
  { day: 'Wed', full: 'Wednesday', date: 13 }, { day: 'Thu', full: 'Thursday', date: 14 },
  { day: 'Fri', full: 'Friday', date: 15 }, { day: 'Sat', full: 'Saturday', date: 16 },
  { day: 'Sun', full: 'Sunday', date: 17 },
];
const TODAY_COL = 1; // Tuesday 12

// col 0-6, s/e in decimal hours, t title, time label, loc, labels[]
const EVENTS = [
  { id: 'e1', col: 0, s: 8, e: 9, t: 'Biology', time: '08:00 – 09:00', loc: 'Room B2 · 158', labels: ['Biology'] },
  { id: 'e2', col: 0, s: 10.5, e: 12, t: 'User flow lab', time: '10:30 – 12:00', loc: 'Lab 4', labels: ['Study'] },
  { id: 'e3', col: 0, s: 14, e: 15.5, t: 'Reading', time: '14:00 – 15:30', loc: 'Library', labels: ['Study'] },
  { id: 'e4', col: 1, s: 8.5, e: 10.5, t: 'Project work', time: '08:30 – 10:30', loc: 'Room A1', labels: [] },
  { id: 'e5', col: 1, s: 10.75, e: 12.25, t: 'Design review', time: '10:45 – 12:15', loc: 'Room B2 · 158', labels: ['Genetics', 'Biology'] },
  { id: 'e6', col: 1, s: 14, e: 15.5, t: 'Workshop', time: '14:00 – 15:30', loc: 'Studio', labels: ['Workshop'] },
  { id: 'e7', col: 2, s: 8, e: 9, t: 'Math', time: '08:00 – 09:00', loc: 'Room B3 · 124', labels: [] },
  { id: 'e8', col: 2, s: 9.5, e: 11.5, t: 'Meetup prep', time: '09:30 – 11:30', loc: 'Hub', labels: ['Study'] },
  { id: 'e9', col: 2, s: 12, e: 13, t: 'Lunch break', time: '12:00 – 13:00', loc: 'Cafeteria', labels: ['Lunch'] },
  { id: 'e10', col: 3, s: 8, e: 10, t: 'Retrospective', time: '08:00 – 10:00', loc: 'Room A1', labels: [] },
  { id: 'e11', col: 3, s: 16, e: 17, t: 'Reading', time: '16:00 – 17:00', loc: 'Library', labels: ['Study'] },
  { id: 'e12', col: 4, s: 8, e: 9, t: 'English', time: '08:00 – 09:00', loc: 'Room C2', labels: [] },
  { id: 'e13', col: 4, s: 9.5, e: 11.5, t: 'Revision block', time: '09:30 – 11:30', loc: 'Library', labels: ['Study'] },
  { id: 'e14', col: 4, s: 13, e: 15, t: 'Workshop', time: '13:00 – 15:00', loc: 'Studio', labels: ['Workshop'] },
  { id: 'e15', col: 6, s: 9, e: 10, t: 'Reading', time: '09:00 – 10:00', loc: 'Home', labels: ['Study'] },
  { id: 'e16', col: 6, s: 12, e: 13, t: 'Lunch break', time: '12:00 – 13:00', loc: 'Home', labels: ['Lunch'] },
];

const HEADER_H = 52;
const START_HOUR = 0;          // 12 AM
const END_HOUR = 24;           // 12 AM next day — full day
const HOUR_H = 62;             // px per hour — min height so events stay legible
const NOW_HOUR = 10.5;         // current-time indicator position
const HOURS = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i);
const GRID_H = (END_HOUR - START_HOUR) * HOUR_H;

function fmtHour(h) {
  const m = h % 24;
  const ap = m < 12 ? 'AM' : 'PM';
  let hh = m % 12; if (hh === 0) hh = 12;
  return `${hh} ${ap}`;
}

/** Event fill + ink: first label's color fills the whole block; unlabeled = dark grey + black. */
function eventLook(ev) {
  if (ev.labels.length) {
    const l = LABEL_MAP[ev.labels[0]];
    return { bg: l.color, ink: l.dark ? '#ffffff' : 'var(--ev-ink)', chipBg: l.dark ? 'rgba(255,255,255,.22)' : 'rgba(0,0,0,.12)' };
  }
  return { bg: 'var(--ev-bg-deep)', ink: 'var(--ev-ink)', chipBg: 'rgba(0,0,0,.10)' };
}

function MiniCal() {
  return (
    <div style={{ background: 'var(--ev-surface)', borderRadius: 'var(--ev-r-lg)', padding: 16, boxShadow: 'var(--ev-shadow-xs)' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
        <button style={{
          display: 'inline-flex', alignItems: 'center', padding: '6px 13px', borderRadius: 'var(--ev-r-md)',
          border: '1px solid var(--ev-border)', background: 'var(--ev-surface)', cursor: 'pointer',
          fontFamily: 'var(--ev-font-sans)', fontSize: '0.9375rem', fontWeight: 600, color: 'var(--ev-ink)', letterSpacing: '-0.01em',
        }}>September, 2025</button>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
          <span style={{ width: 28, height: 28, borderRadius: 'var(--ev-r-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><Icon name="chevronLeft" size={18} color="var(--ev-ink-soft)" /></span>
          <span style={{ width: 28, height: 28, borderRadius: 'var(--ev-r-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><Icon name="chevronRight" size={18} color="var(--ev-ink-soft)" /></span>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4 }}>
        {DOW.map((d, i) => <div key={i} style={{ textAlign: 'center', fontSize: '0.7188rem', fontWeight: 700, color: MUTED }}>{d}</div>)}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
        {MINI.flat().map((d, i) => {
          const muted = i < 6 || i > 32;
          const today = d === 11 && i > 6 && i < 21;
          const sel = d === 17 && i > 6 && i < 28;
          return (
            <div key={i} style={{ aspectRatio: '1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7813rem',
              fontWeight: today || sel ? 700 : 500,
              color: today ? '#fff' : muted ? MUTED : 'var(--ev-ink-soft)',
              background: today ? 'var(--ev-primary)' : 'transparent',
              border: sel ? '1.5px solid var(--ev-primary)' : '1.5px solid transparent',
              borderRadius: 'var(--ev-r-md)', cursor: 'pointer' }}>{d}</div>
          );
        })}
      </div>
    </div>
  );
}

function LabelsCard({ hidden, onToggle }) {
  return (
    <div style={{ background: 'var(--ev-surface)', borderRadius: 'var(--ev-r-lg)', padding: 16, boxShadow: 'var(--ev-shadow-xs)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 13 }}>
        <Icon name="chevronDown" size={16} color="var(--ev-ink-soft)" />
        <span style={{ fontSize: '0.9375rem', fontWeight: 800, color: 'var(--ev-ink)' }}>Labels</span>
        <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 24, borderRadius: 'var(--ev-r-sm)', cursor: 'pointer' }}>
          <Icon name="moreVertical" size={18} strokeWidth={3.4} color="var(--ev-ink-soft)" />
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 11, paddingLeft: 22 }}>
        {LABELS.map((l) => {
          const off = hidden.has(l.name);
          return (
            <div key={l.name} onClick={() => onToggle(l.name)} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
              <span style={{ width: 14, height: 14, flex: '0 0 14px', borderRadius: 5, boxSizing: 'border-box',
                background: off ? 'transparent' : l.color, border: `1.5px solid ${l.color}` }} />
              <span style={{ fontSize: '0.875rem', fontWeight: 500, color: off ? 'var(--ev-ink-faint)' : l.color, flex: 1 }}>{l.name}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Calendar — week view: floating planning cards beside a scrollable white day-grid card. */
export function ScheduleScreen({ onNavigate }) {
  const [view, setView] = React.useState('Week');
  const [selected, setSelected] = React.useState(EVENTS.find((e) => e.id === 'e5'));
  const [hidden, setHidden] = React.useState(() => new Set());
  const scrollRef = React.useRef(null);
  React.useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = Math.max(0, (NOW_HOUR - START_HOUR) * HOUR_H - 130);
  }, []);

  const toggle = (name) => setHidden((prev) => {
    const next = new Set(prev);
    if (next.has(name)) next.delete(name); else next.add(name);
    return next;
  });
  const isVisible = (ev) => ev.labels.length === 0 || ev.labels.some((n) => !hidden.has(n));

  const NOTCH_W = 340, NOTCH_H = 88, NOTCH_R = 28;
  const blockBase = { position: 'absolute', background: 'var(--ev-surface)', borderRadius: 'var(--ev-r-2xl)' };

  return (
    <div style={{ display: 'flex', height: '100%', background: 'var(--ev-bg-page)', fontFamily: 'var(--ev-font-sans)' }}>
      <Sidebar active="schedule" onNavigate={onNavigate} />

      <div style={{ flex: 1, minWidth: 0, margin: 10, display: 'flex', gap: 12, position: 'relative' }}>

        {/* planning rail — standalone white cards, between the nav and the main card */}
        <div style={{ width: 268, flex: '0 0 268px', display: 'flex', flexDirection: 'column', gap: 12, overflow: 'auto' }}>
          <MiniCal />
          <LabelsCard hidden={hidden} onToggle={toggle} />
        </div>

        {/* main calendar card */}
        <div style={{ flex: 1, minWidth: 0, position: 'relative', display: 'flex' }}>
          {/* white L-shaped surface with notch for the floating top bar */}
          <div style={{ position: 'absolute', inset: 0, filter: 'drop-shadow(0 1px 2px rgba(0,0,0,.04)) drop-shadow(0 12px 32px rgba(0,0,0,.05))' }}>
            <div style={{ ...blockBase, top: 0, left: 0, bottom: 0, width: 'calc(100% - ' + NOTCH_W + 'px)' }}></div>
            <div style={{ ...blockBase, top: NOTCH_H + 'px', left: 0, right: 0, bottom: 0 }}></div>
            <div style={{ position: 'absolute', top: (NOTCH_H - NOTCH_R) + 'px', left: 'calc(100% - ' + NOTCH_W + 'px)', width: NOTCH_R, height: NOTCH_R, background: 'radial-gradient(circle ' + NOTCH_R + 'px at top right, transparent ' + (NOTCH_R - 0.5) + 'px, var(--ev-surface) ' + NOTCH_R + 'px)' }}></div>
          </div>

          {/* content above the surface */}
          <div style={{ position: 'relative', flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', padding: '28px 30px' }}>

            {/* month-year heading + new-event button */}
            <div style={{ display: 'flex', alignItems: 'center', minHeight: 54, paddingRight: NOTCH_W, marginBottom: 6 }}>
              <h2 style={{ margin: 0, fontSize: '1.625rem', fontWeight: 800, color: 'var(--ev-ink)', letterSpacing: '-0.02em', whiteSpace: 'nowrap' }}>September 2025</h2>
              <button type="button" aria-label="New event" style={{ marginLeft: 'auto', width: 46, height: 46, flex: '0 0 46px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--ev-bg)', border: 'none', borderRadius: 'var(--ev-r-md)', cursor: 'pointer', padding: 0 }}>
                <Icon name="plus" size={22} color="var(--ev-ink)" />
              </button>
            </div>

            {/* view tabs */}
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ display: 'inline-flex', gap: 6 }}>
                {['Month', 'Week', 'Day'].map((v) => {
                  const on = v === view;
                  return (
                    <button key={v} onClick={() => setView(v)} style={{
                      border: 'none', cursor: 'pointer', fontFamily: 'var(--ev-font-sans)', fontSize: '0.875rem', fontWeight: 600,
                      padding: '7px 16px', borderRadius: 'var(--ev-r-md)',
                      background: on ? 'var(--ev-primary)' : 'transparent',
                      color: on ? 'var(--ev-primary-content)' : 'var(--ev-ink-soft)',
                    }}>{v}</button>
                  );
                })}
              </div>
            </div>

            {/* day grid — header row + scrollable hour body */}
            <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
              {/* day header row (fixed) */}
              <div style={{ display: 'flex', flex: `0 0 ${HEADER_H}px` }}>
                <div style={{ width: 56, flex: '0 0 56px' }} />
                {WEEK.map((d, ci) => {
                  const today = ci === TODAY_COL;
                  return (
                    <div key={ci} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                      <div style={{ fontSize: '0.75rem', color: MUTED, fontWeight: 600 }}>{d.day}</div>
                      <div style={{ fontSize: '1.0625rem', fontWeight: 800, color: today ? 'var(--ev-ink)' : 'var(--ev-ink-soft)' }}>{d.date}</div>
                    </div>
                  );
                })}
              </div>

              {/* scrollable hour grid */}
              <div ref={scrollRef} style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden' }}>
                <div style={{ display: 'flex', position: 'relative', height: GRID_H }}>
                  {/* time gutter */}
                  <div style={{ width: 56, flex: '0 0 56px', position: 'relative' }}>
                    {HOURS.map((h) => (
                      <span key={h} style={{ position: 'absolute', top: (h - START_HOUR) * HOUR_H, left: 0, width: 46, textAlign: 'right', transform: h === START_HOUR ? 'none' : 'translateY(-50%)', fontSize: '0.6875rem', fontWeight: 600, color: MUTED }}>
                        {fmtHour(h)}
                      </span>
                    ))}
                  </div>

                  {/* columns */}
                  <div style={{ flex: 1, position: 'relative', display: 'flex' }}>
                    {WEEK.map((d, ci) => {
                      const today = ci === TODAY_COL;
                      return (
                        <div key={ci} style={{ flex: 1, position: 'relative',
                          background: today ? 'var(--ev-bg-soft)' : 'transparent', borderRadius: today ? 'var(--ev-r-xl)' : 0 }}>
                          {EVENTS.filter((e) => e.col === ci && isVisible(e)).map((ev) => {
                            const look = eventLook(ev);
                            const top = (ev.s - START_HOUR) * HOUR_H;
                            const height = (ev.e - ev.s) * HOUR_H;
                            const inset = today ? 6 : 3;
                            return (
                              <div key={ev.id} onClick={() => setSelected(ev)} style={{
                                position: 'absolute', top, height, left: inset, right: inset, zIndex: 2,
                                background: look.bg, color: look.ink, borderRadius: 'var(--ev-r-md)', padding: '6px 9px',
                                overflow: 'hidden', cursor: 'pointer', display: 'flex', flexDirection: 'column',
                                boxShadow: 'var(--ev-shadow-xs)', boxSizing: 'border-box',
                                outline: selected && selected.id === ev.id ? '2px solid var(--ev-ink)' : 'none', outlineOffset: 1,
                              }}>
                                <div style={{ fontSize: '0.75rem', fontWeight: 700, lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.t}</div>
                                <div style={{ fontSize: '0.625rem', fontWeight: 600, opacity: 0.78, lineHeight: 1.25 }}>{ev.time}</div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                    {/* per-hour gridlines */}
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1, pointerEvents: 'none',
                      background: `repeating-linear-gradient(to bottom, var(--ev-border) 0, var(--ev-border) 1px, transparent 1px, transparent ${HOUR_H}px)` }} />
                    {/* current-time line — dashed black across the week, solid over today */}
                    <div style={{ position: 'absolute', left: 0, right: 0, top: (NOW_HOUR - START_HOUR) * HOUR_H, height: 0, borderTop: '2px dashed var(--ev-ink)', zIndex: 5, pointerEvents: 'none' }} />
                    <div style={{ position: 'absolute', top: (NOW_HOUR - START_HOUR) * HOUR_H, height: 0, left: `calc(${TODAY_COL} * 100% / 7)`, width: 'calc(100% / 7)', borderTop: '2px solid var(--ev-ink)', zIndex: 6, pointerEvents: 'none' }}>
                      <span style={{ position: 'absolute', left: -3, top: -5, width: 9, height: 9, borderRadius: '50%', background: 'var(--ev-ink)' }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* event detail — opens when an event is clicked */}
            {selected && (
              <div style={{ position: 'absolute', top: 150, right: 8, width: 300, zIndex: 6, background: 'var(--ev-white)', borderRadius: 'var(--ev-r-lg)', boxShadow: 'var(--ev-shadow-raised)', padding: 18 }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: 14 }}>
                  <span style={{ fontSize: '1.0625rem', fontWeight: 800, color: 'var(--ev-ink)' }}>{selected.t}</span>
                  <div style={{ marginLeft: 'auto', display: 'flex', gap: 2 }}>
                    <IconButton icon="notes" variant="ghost" size="sm" />
                    <IconButton icon="x" variant="ghost" size="sm" onClick={() => setSelected(null)} />
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 11, marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.875rem', color: 'var(--ev-ink)' }}>
                    <Icon name="schedule" size={16} color="var(--ev-ink)" /> {WEEK[selected.col].full} {WEEK[selected.col].date}, September
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.875rem', color: 'var(--ev-ink)' }}>
                    <Icon name="clock" size={16} color="var(--ev-ink)" /> {selected.time}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.875rem', color: 'var(--ev-ink)' }}>
                    <Icon name="location" size={16} color="var(--ev-ink)" /> {selected.loc}
                  </div>
                </div>
                {selected.labels.length > 0 && (
                  <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
                    {selected.labels.map((n) => {
                      const l = LABEL_MAP[n];
                      return <span key={n} style={{ fontSize: '0.6875rem', fontWeight: 700, color: l.dark ? '#fff' : 'var(--ev-ink)', background: l.color, padding: '4px 11px', borderRadius: 'var(--ev-r-pill)' }}>{n}</span>;
                    })}
                  </div>
                )}
                <button style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%',
                  padding: '11px 16px', borderRadius: 'var(--ev-r-md)', border: 'none', cursor: 'pointer',
                  background: 'var(--ev-primary)', color: 'var(--ev-primary-content)', fontFamily: 'var(--ev-font-sans)', fontSize: '0.875rem', fontWeight: 700,
                }}>Add note</button>
              </div>
            )}
          </div>
        </div>

        {/* floating top bar in the notch */}
        <div style={{ position: 'absolute', top: 0, right: 0, display: 'flex', alignItems: 'center', gap: 10, background: 'var(--ev-bg-sage)', borderRadius: 'var(--ev-r-2xl)', padding: '10px 12px 10px 16px' }}>
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
