import { UserColor } from '@/api/types';
import { cn } from '@/lib/cn';
import { USER_COLORS, userColorPair } from '@/lib/userColor';
import { Icon } from './Icon';

export function UserColorChooser({
  selected,
  onChange,
}: {
  selected?: string;
  onChange: (color: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {USER_COLORS.map((c) => {
        const p = userColorPair(c);
        const isTransparent = c === 'transparent';
        return (
          <button
            key={c}
            type="button"
            onClick={() => onChange(c)}
            aria-label={c}
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-pill transition-transform',
              isTransparent && 'border border-line-strong text-fg-muted',
              selected === c && 'ring-2 ring-action ring-offset-2 ring-offset-surface'
            )}
            style={isTransparent ? undefined : { background: p.bg }}
          >
            {isTransparent && <Icon name="x" size={15} />}
          </button>
        );
      })}
    </div>
  );
}
