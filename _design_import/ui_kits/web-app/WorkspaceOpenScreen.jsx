import React from 'react';
import { Badge } from '../../components/core/Badge.jsx';
import { Button } from '../../components/core/Button.jsx';
import { SegmentedControl } from '../../components/core/SegmentedControl.jsx';
import { Icon } from '../../components/core/Icon.jsx';
import { IconButton } from '../../components/core/IconButton.jsx';
import { Avatar } from '../../components/core/Avatar.jsx';

const CHAPTERS = [
  { id: 1, name: 'Ch. 1 · Cell biology', open: true, count: 3, files: [
    { name: 'Cell structure.pdf', active: true }, { name: 'Organelles.docx' }, { name: 'Mitosis notes.md' },
  ] },
  { id: 2, name: 'Ch. 2 · Genetics', open: true, count: 2, files: [
    { name: 'DNA replication.pdf' }, { name: 'Punnett squares.png' },
  ] },
  { id: 3, name: 'Ch. 3 · Ecology', open: false, count: 6, files: [] },
];

function MenuItem({ icon, label, danger, onClick }) {
  const [hover, setHover] = React.useState(false);
  const color = danger ? 'var(--ev-error-ink)' : 'var(--ev-ink)';
  return (
    <button onClick={onClick} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} style={{
      display: 'flex', alignItems: 'center', gap: 9, width: '100%', padding: '8px 10px',
      border: 'none', cursor: 'pointer', borderRadius: 'var(--ev-r-sm)', textAlign: 'left',
      fontFamily: 'var(--ev-font-sans)', fontSize: '0.85rem', fontWeight: 600, color,
      background: hover ? 'var(--ev-bg)' : 'transparent',
    }}>
      <Icon name={icon} size={15} color={color} /> {label}
    </button>
  );
}

function SourceFile({ f }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px 8px 24px', borderRadius: 'var(--ev-r-sm)', cursor: 'pointer',
      background: f.active ? 'var(--ev-bg)' : 'transparent',
    }}>
      <Icon name="files" size={15} color="var(--ev-primary)" />
      <span style={{ fontSize: '0.9219rem', color: 'var(--ev-ink)', fontWeight: f.active ? 600 : 500, flex: 1, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{f.name}</span>
    </div>
  );
}

function ChatPanel({ accent, accentText }) {
  return (
    <>
      <div style={{ flex: 1, overflow: 'auto', padding: 18, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ alignSelf: 'flex-end', maxWidth: '82%', background: 'var(--ev-primary)', color: '#fff', borderRadius: '14px 14px 4px 14px', padding: '11px 14px', fontSize: '0.875rem', lineHeight: 1.45 }}>
          Explain the difference between mitosis and meiosis.
        </div>
        <div style={{ alignSelf: 'flex-start', maxWidth: '92%', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ background: 'var(--ev-white)', border: '1px solid var(--ev-border)', borderRadius: '14px 14px 14px 4px', padding: 14, fontSize: '0.875rem', lineHeight: 1.5, color: 'var(--ev-ink-soft)' }}>
            <strong style={{ color: 'var(--ev-ink)' }}>Mitosis</strong> produces two genetically identical diploid cells for growth and repair. <strong style={{ color: 'var(--ev-ink)' }}>Meiosis</strong> produces four genetically distinct haploid gametes for reproduction, via crossing over and two divisions.
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {['Cell structure.pdf', 'Mitosis notes.md'].map((s) => (
              <span key={s} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.7744rem', color: 'var(--ev-info-ink)', background: 'var(--ev-info-soft)', padding: '4px 10px', borderRadius: 'var(--ev-r-pill)' }}>
                <Icon name="files" size={11} />{s}
              </span>
            ))}
          </div>
        </div>
      </div>
      <div style={{ padding: '14px 16px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, border: '1px solid var(--ev-border)', borderRadius: 'var(--ev-r-md)', padding: '7px 7px 7px 14px', background: 'var(--ev-white)' }}>
          <span style={{ fontSize: '0.9587rem', color: 'var(--ev-ink-soft)', flex: 1 }}>Ask about your sources…</span>
          <IconButton icon="send" variant="dark" size="sm" style={{ background: accent, borderColor: accent, color: accentText }} />
        </div>
        <div style={{ fontSize: '0.7744rem', color: 'var(--ev-ink-faint)', marginTop: 8, textAlign: 'center' }}>Answers grounded in this workspace's sources · GraphRAG</div>
      </div>
    </>
  );
}

function GeneratePanel() {
  const outputs = [['Summary', 'files'], ['Flashcards', 'flashcards'], ['Quiz', 'quiz']];
  return (
    <div style={{ flex: 1, overflow: 'auto', padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ fontSize: '0.9587rem', fontWeight: 800, color: 'var(--ev-ink)', letterSpacing: '-0.01em' }}>Make stuff happen</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
        {outputs.map(([label, ic]) => (
          <button key={label} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10,
            aspectRatio: '1 / 1', border: 'none', background: 'var(--ev-white)', borderRadius: 'var(--ev-r-xl)',
            padding: 12, cursor: 'pointer',
            transition: 'box-shadow .18s ease, transform .12s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = 'var(--ev-shadow-card)';
            e.currentTarget.style.transform = 'translateY(-2px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = 'none';
            e.currentTarget.style.transform = 'none';
          }}>
            <Icon name={ic} size={22} color="var(--ev-ink)" />
            <span style={{ fontSize: 14, fontFamily: 'Fustat', fontWeight: 800, color: 'var(--ev-ink)', letterSpacing: '-0.01em' }}>{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/** Opened workspace — NotebookLM-style: sources card · open file · AI card (Chat / Generate). */
export function WorkspaceOpenScreen({ onBack, initialMode = 'Chat' }) {
  const [mode, setMode] = React.useState(initialMode);
  const [menuFor, setMenuFor] = React.useState(null);
  // Each workspace has a randomly-assigned accent (matches its icon background on the Workspaces grid).
  // Dark accents (e.g. purple) read white; lighter accents read black.
  const ws = { name: 'Biology 101', accent: 'var(--ev-green-note)', darkAccent: false };
  const wsText = ws.darkAccent ? '#ffffff' : 'var(--ev-ink)';
  const wsTextSoft = ws.darkAccent ? 'rgba(255,255,255,0.78)' : 'var(--ev-ink-soft)';
  return (
    <div style={{ display: 'flex', height: '100%', gap: 10, padding: 10, boxSizing: 'border-box', background: 'var(--ev-bg-sage)', fontFamily: 'var(--ev-font-sans)' }}>

      {/* left column — workspace header card + sources card */}
      <div style={{ width: 278, flex: '0 0 278px', display: 'flex', flexDirection: 'column', gap: 10, minHeight: 0 }}>

        {/* workspace header — accent inset card */}
        <div style={{ background: ws.accent, borderRadius: 'var(--ev-r-lg)', padding: '16px 16px 16px', flex: '0 0 auto' }}>
          <div onClick={onBack} style={{ fontSize: '0.885rem', color: wsTextSoft, fontWeight: 600, marginBottom: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Icon name="chevronLeft" size={13} color={wsTextSoft} /> Workspaces
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: '1.45rem', fontWeight: 800, color: wsText }}>{ws.name}</span>
          </div>
          <button style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', marginTop: 14,
            padding: '8px 16px', borderRadius: '14px', border: '1px solid var(--ev-border)',
            background: 'var(--ev-white)', cursor: 'pointer', fontFamily: 'var(--ev-font-sans)',
            fontWeight: 700, fontSize: '0.875rem', color: 'var(--ev-ink)',
          }}>
            <Icon name="plus" size={15} color="var(--ev-ink-soft)" /> Add source
          </button>
        </div>

        {/* sources — inset card */}
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', background: 'var(--ev-bg-soft)', borderRadius: 'var(--ev-r-lg)', overflow: 'hidden' }}>
        <div style={{ flex: 1, overflow: 'auto', padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 3 }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--ev-ink-faint)', padding: '2px 10px 6px' }}>Content</div>
          {CHAPTERS.map((ch) => (
            <div key={ch.id}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 10px', cursor: 'pointer' }}>
                <Icon name={ch.open ? 'chevronDown' : 'chevronRight'} size={14} color="var(--ev-ink)" />
                <span style={{ fontSize: '1.02rem', fontWeight: 700, color: ch.open ? 'var(--ev-ink)' : 'var(--ev-ink-faint)' }}>{ch.name}</span>
                <div style={{ marginLeft: 'auto', position: 'relative' }} onClick={(e) => e.stopPropagation()}>
                  <button onClick={() => setMenuFor(menuFor === ch.id ? null : ch.id)} style={{
                    border: 'none', background: 'transparent', cursor: 'pointer', padding: 4,
                    borderRadius: 'var(--ev-r-sm)', display: 'flex', alignItems: 'center',
                  }}>
                    <Icon name="moreVertical" size={20} strokeWidth={3.4} color="var(--ev-ink)" />
                  </button>
                  {menuFor === ch.id && (
                    <>
                      <div onClick={() => setMenuFor(null)} style={{ position: 'fixed', inset: 0, zIndex: 9 }} />
                      <div style={{
                        position: 'absolute', top: '100%', right: 0, marginTop: 4, minWidth: 138, zIndex: 10,
                        background: 'var(--ev-white)', border: '1px solid var(--ev-border)', borderRadius: 'var(--ev-r-md)',
                        boxShadow: 'var(--ev-shadow-raised)', padding: 5, display: 'flex', flexDirection: 'column', gap: 2,
                      }}>
                        <MenuItem icon="notes" label="Rename" onClick={() => setMenuFor(null)} />
                        <MenuItem icon="trash" label="Delete" danger onClick={() => setMenuFor(null)} />
                      </div>
                    </>
                  )}
                </div>
              </div>
              {ch.open && ch.files.map((f) => <SourceFile key={f.name} f={f} />)}
            </div>
          ))}
          <button style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', marginTop: 6,
            padding: '8px 16px', borderRadius: '14px', border: '1px solid var(--ev-border)',
            background: 'var(--ev-white)', cursor: 'pointer', fontFamily: 'var(--ev-font-sans)',
            fontWeight: 700, fontSize: '0.85rem', color: 'var(--ev-ink)',
          }}>
            <Icon name="plus" size={15} color="var(--ev-ink-soft)" /> Add chapter
          </button>
        </div>
        </div>
      </div>

      {/* center — open file (white inset card) */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', background: 'var(--ev-surface)', borderRadius: 'var(--ev-r-lg)', boxShadow: 'var(--ev-shadow-card)', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '16px 22px 14px', borderBottom: '1px solid var(--ev-line)' }}>
          <span style={{ width: 28, height: 28, borderRadius: 'var(--ev-r-xs)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="files" size={16} color="var(--ev-primary)" />
          </span>
          <span style={{ fontSize: '1.0694rem', fontWeight: 700, color: 'var(--ev-ink)' }}>Cell structure.pdf</span>
          <Badge tone="neutral">Ch. 1</Badge>
          <button style={{
            marginLeft: 'auto', border: 'none', background: 'transparent', cursor: 'pointer', padding: 4,
            borderRadius: 'var(--ev-r-sm)', display: 'flex', alignItems: 'center',
          }}>
            <Icon name="more" size={20} strokeWidth={3.4} color="var(--ev-ink)" />
          </button>
        </div>
        <div style={{ flex: 1, overflow: 'auto', padding: '14px 24px 24px', maxWidth: 700, margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
          <h1 style={{ fontSize: '1.9912rem', fontWeight: 800, color: 'var(--ev-ink)', letterSpacing: '-0.02em', margin: '0 0 18px' }}>Cell structure</h1>
          <p style={{ fontSize: '1rem', lineHeight: 1.7, color: 'var(--ev-ink-soft)', margin: '0 0 18px' }}>
            The cell is the basic structural and functional unit of all living organisms. Every cell is bounded by a plasma membrane that regulates what enters and leaves, maintaining the internal environment distinct from its surroundings.
          </p>
          <div style={{ height: 180, borderRadius: 'var(--ev-r-lg)', background: 'var(--ev-bg)', border: '1px solid var(--ev-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ev-ink-ghost)', fontSize: '0.9587rem', margin: '6px 0 18px' }}>
            Figure 1.1 — Eukaryotic cell diagram
          </div>
          <p style={{ fontSize: '1rem', lineHeight: 1.7, color: 'var(--ev-ink-soft)', margin: 0 }}>
            Eukaryotic cells contain membrane-bound organelles, including the nucleus, which houses genetic material. The cytoplasm suspends these organelles and is the site of many metabolic reactions essential to the cell's survival.
          </p>
        </div>
      </div>

      {/* right rail — top bar + AI inset card */}
      <div style={{ width: 380, flex: '0 0 380px', display: 'flex', flexDirection: 'column', gap: 10, minHeight: 0 }}>
        {/* top bar — its own inset card (light grey for contrast against page) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--ev-bg-soft)', borderRadius: 'var(--ev-r-lg)', padding: '10px 12px 10px 16px', flex: '0 0 auto' }}>
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

        {/* AI inset card */}
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', background: 'var(--ev-bg-soft)', borderRadius: 'var(--ev-r-lg)', overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center' }}>
          <SegmentedControl size="sm" options={['Chat', 'Generate']} value={mode} onChange={setMode} />
          <button style={{
            marginLeft: 'auto', border: 'none', background: 'transparent', cursor: 'pointer', padding: 4,
            borderRadius: 'var(--ev-r-sm)', display: 'flex', alignItems: 'center',
          }}>
            <Icon name="moreVertical" size={20} strokeWidth={3.4} color="var(--ev-ink)" />
          </button>
        </div>
        {mode === 'Chat' ? <ChatPanel accent={ws.accent} accentText={wsText} /> : <GeneratePanel />}
        </div>
      </div>
    </div>
  );
}
