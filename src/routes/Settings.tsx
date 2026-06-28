import { useState } from 'react';
import { Panel, PageHeader, PanelWithInvertedRadius } from '@/components/app/layout';
import { SegmentedControl, Text } from '@/components/ui';
import { LocaleSwitcher } from '@/components/app/LocaleSwitcher';
import { useTheme, THEMES } from '@/theme/ThemeProvider';
import { cn } from '@/lib/cn';
import { m } from '@/i18n';

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-divider py-4 last:border-0">
      <Text variant="subtitle">{label}</Text>
      {children}
    </div>
  );
}

export default function Settings() {
  const { theme, mode, setTheme, setMode } = useTheme();
  const [privacy, setPrivacy] = useState('private');

  return (
    <Panel>
      <PageHeader showTopBar={false} title={m.profile_menu_settings()} />
      <div className="min-h-0 flex-1 overflow-auto px-6 py-5">
        <div className="mx-auto max-w-2xl">
          <Text variant="label" tone="muted" className="mb-1 block">
            {m.settings_appearance()}
          </Text>
          <div className="rounded-card border border-line bg-surface px-5">
            <Row label={m.settings_theme()}>
              <div className="flex gap-1 rounded-pill border border-line p-[3px]">
                {THEMES.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => setTheme(t.value)}
                    className={cn(
                      'rounded-pill px-3 py-1.5 text-sm font-semibold',
                      theme === t.value ? 'bg-action text-action-fg' : 'text-fg-muted'
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </Row>
            <Row label={m.settings_mode()}>
              <SegmentedControl
                size="sm"
                options={[
                  { value: 'light', label: m.mode_light() },
                  { value: 'dark', label: m.mode_dark() },
                ]}
                value={mode}
                onChange={(v) => setMode(v as 'light' | 'dark')}
              />
            </Row>
            <Row label={m.settings_language()}>
              <LocaleSwitcher />
            </Row>
          </div>

          <Text variant="label" tone="muted" className="mt-6 mb-1 block">
            Workspaces
          </Text>
          <div className="rounded-card border border-line bg-surface px-5">
            <Row label="Default visibility">
              <SegmentedControl
                size="sm"
                options={[
                  { value: 'private', label: 'Private' },
                  { value: 'public', label: 'Public' },
                  { value: 'link', label: 'Shared link' },
                ]}
                value={privacy}
                onChange={setPrivacy}
              />
            </Row>
          </div>
        </div>
      </div>
    </Panel>
  );
}
