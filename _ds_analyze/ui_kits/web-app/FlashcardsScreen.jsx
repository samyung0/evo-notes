import React from 'react';
import { Sidebar } from './Sidebar.jsx';
import { Card } from '../../components/core/Card.jsx';
import { Icon } from '../../components/core/Icon.jsx';

const DECKS = [
  { name: 'Cell biology', workspace: 'Biology 101',  cards: 32, known: 80, bg: 'var(--ev-green-soft)',   ic: 'var(--ev-green-ink)' },
  { name: 'Genetics',     workspace: 'Biology 101',  cards: 24, known: 60, bg: 'var(--ev-purple-soft)',  ic: 'var(--ev-purple-ink)' },
  { name: 'Evolution',    workspace: 'Biology 101',  cards: 18, known: 35, bg: 'var(--ev-warning-soft)', ic: 'var(--ev-warning-ink)' },
  { name: 'Limits',       workspace: 'Calculus II',  cards: 28, known: 72, bg: 'var(--ev-info-soft)',    ic: 'var(--ev-info-ink)' },
  { name: 'Integrals',    workspace: 'Calculus II',  cards: 20, known: 45, bg: 'var(--ev-green-soft)',   ic: 'var(--ev-green-ink)' },
  { name: 'Ancient era',  workspace: 'World History',cards: 16, known: 58, bg: 'var(--ev-purple-soft)',  ic: 'var(--ev-purple-ink)' },
];

/** Flashcards — deck library, moved out of the former Practice screen. */
export function FlashcardsScreen({ onNavigate }) {
  return (
    <div style={{ display: 'flex', height: '100%', background: 'var(--ev-surface)', fontFamily: 'var(--ev-font-sans)' }}>
      <Sidebar active="flashcards" onNavigate={onNavigate} />
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', padding: '26px 30px', gap: 22, overflow: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: '1.625rem', fontWeight: 800, color: 'var(--ev-ink)', letterSpacing: '-0.02em' }}>Flashcards</h2>
          <button
            type="button"
            aria-label="New deck"
            style={{ marginLeft: 'auto', width: 46, height: 46, flex: '0 0 46px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--ev-bg)', border: 'none', borderRadius: 'var(--ev-r-md)', cursor: 'pointer', padding: 0 }}
          >
            <Icon name="plus" size={22} color="var(--ev-ink)" />
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {DECKS.map((d) => (
            <Card key={d.name} padding={18} radius="var(--ev-r-xl)" interactive style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                <span style={{ width: 44, height: 44, borderRadius: 'var(--ev-r-lg)', background: d.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="flashcards" size={22} color={d.ic} />
                </span>
                <Icon name="more" size={22} color="var(--ev-ink)" style={{ marginLeft: 'auto' }} />
              </div>
              <div>
                <div style={{ fontSize: '1.0625rem', fontWeight: 700, color: 'var(--ev-ink)' }}>{d.name}</div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--ev-ink-faint)', marginTop: 4 }}>{d.workspace}</div>
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', color: 'var(--ev-ink-faint)', marginBottom: 6 }}>
                  <span>{d.cards} cards</span><span>{d.known}% known</span>
                </div>
                <div style={{ height: 5, borderRadius: 'var(--ev-r-pill)', background: 'var(--ev-line)', overflow: 'hidden' }}>
                  <div style={{ width: `${d.known}%`, height: '100%', background: 'var(--ev-success)' }} />
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
