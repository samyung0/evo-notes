import { Menu } from '@/components/ui/Menu';
import { Button } from '@/components/ui/Button';
import { getLocale, setLocale, locales, LOCALE_LABELS } from '@/i18n';

export function LocaleSwitcher() {
  const current = (() => {
    try {
      return getLocale();
    } catch {
      return 'en';
    }
  })();
  const available: readonly string[] = (locales as readonly string[] | undefined) ?? ['en', 'zh'];

  return (
    <Menu
      align="end"
      trigger={
        <Button variant="outline" size="sm" iconLeft="globe">
          {LOCALE_LABELS[current] ?? current}
        </Button>
      }
      items={available.map((loc) => ({
        label: LOCALE_LABELS[loc] ?? loc,
        onClick: () => setLocale(loc as never),
      }))}
    />
  );
}
