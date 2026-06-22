import { useTheme, THEMES } from '@/theme/ThemeProvider';
import { cn } from '@/lib/cn';
import { Icon } from '@/components/ui/Icon';

/** Compact theme + light/dark control for the sidebar footer. */
export function ThemeSwitcher({ collapsed = false }: { collapsed?: boolean }) {
  const { theme, mode, setTheme, toggleMode } = useTheme();

  if (collapsed) {
    return (
      <button
        onClick={toggleMode}
        aria-label="Toggle light/dark"
        className="hover:bg-surface-hover-bg flex h-10 w-10 items-center justify-center rounded-button text-fg"
      >
        <Icon name={mode === 'dark' ? 'sun' : 'moon'} size={19} />
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2 px-3 py-2">
      <div className="flex items-center gap-1 rounded-pill border border-line bg-surface p-[3px]">
        {THEMES.map((t) => (
          <button
            key={t.value}
            onClick={() => setTheme(t.value)}
            className={cn(
              'flex-1 rounded-pill py-1.5 text-[12px] font-semibold transition-colors',
              theme === t.value
                ? 'bg-action text-action-fg'
                : 'text-fg-muted hover:text-fg'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      <button
        onClick={toggleMode}
        className="hover:bg-surface-hover-bg flex items-center justify-center gap-2 rounded-button py-2 text-[13px] font-medium text-fg"
      >
        <Icon name={mode === 'dark' ? 'sun' : 'moon'} size={16} />
        {mode === 'dark' ? 'Light mode' : 'Dark mode'}
      </button>
    </div>
  );
}
