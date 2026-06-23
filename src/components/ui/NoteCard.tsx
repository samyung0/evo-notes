import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';
import { Icon } from './Icon';

type NoteTheme = 'green' | 'purple' | 'greenSoft' | 'purpleSoft';

/** Maps to the note-* role tokens so contrast pairs follow the theme/mode. */
const THEME: Record<NoteTheme, { bg: string; fg: string; muted: string }> = {
  green: {
    bg: 'var(--note-green-bg)',
    fg: 'var(--note-green-fg)',
    muted: 'var(--note-green-fg-muted)',
  },
  purple: {
    bg: 'var(--note-purple-bg)',
    fg: 'var(--note-purple-fg)',
    muted: 'var(--note-purple-fg-muted)',
  },
  greenSoft: {
    bg: 'var(--note-green-soft-bg)',
    fg: 'var(--note-green-soft-fg)',
    muted: 'var(--note-green-soft-fg)',
  },
  purpleSoft: {
    bg: 'var(--note-purple-soft-bg)',
    fg: 'var(--note-purple-soft-fg)',
    muted: 'var(--note-purple-soft-fg)',
  },
};

export interface NoteCardProps extends HTMLAttributes<HTMLDivElement> {
  title: string;
  body?: string;
  date?: string;
  theme?: NoteTheme;
  onMenu?: () => void;
}

export function NoteCard({
  title,
  body,
  date,
  theme = 'green',
  onMenu,
  className,
  style,
  ...rest
}: NoteCardProps) {
  const t = THEME[theme];
  return (
    <div
      className={cn('flex min-h-[150px] flex-col gap-3 rounded-card-lg p-5', className)}
      style={{ background: t.bg, color: t.fg, ...style }}
      {...rest}
    >
      <div className="flex items-start">
        <span className="text-base font-bold">{title}</span>
        {onMenu && (
          <button
            onClick={onMenu}
            aria-label="Note options"
            className="ml-auto flex h-[26px] w-[26px] items-center justify-center rounded-input"
            style={{
              background: 'color-mix(in srgb, currentColor 14%, transparent)',
            }}
          >
            <Icon name="moreVertical" size={16} strokeWidth={2.4} />
          </button>
        )}
      </div>
      {body && (
        <p className="m-0 text-[0.84rem] leading-normal" style={{ opacity: 0.92 }}>
          {body}
        </p>
      )}
      {date && (
        <span className="mt-auto text-[0.72rem]" style={{ color: t.muted }}>
          {date}
        </span>
      )}
    </div>
  );
}
