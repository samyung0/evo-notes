import { useState } from 'react';
import { Button, Text } from '@/components/ui';
import { useIntegrations } from '@/api/hooks';
import { USE_MSW } from '@/api/auth';
import { useProviderConnect } from '@/lib/useProviderConnect';
import { m } from '@/i18n';

const DISMISS_KEY = 'evo_cloud_connect_dismissed';

export function CloudConnectBanner() {
  const { data: integrations } = useIntegrations();
  const connectProvider = useProviderConnect();
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(DISMISS_KEY) === '1');

  if (dismissed || USE_MSW) return null;
  if (integrations?.google && integrations?.microsoft) return null;

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, '1');
    setDismissed(true);
  }

  function connect() {
    void connectProvider(integrations?.google ? 'microsoft' : 'google');
  }

  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-card border border-line bg-surface px-4 py-3">
      <div>
        <Text variant="subtitle">{m.cloud_connect_title()}</Text>
        <Text variant="meta" tone="muted">
          {m.cloud_connect_body()}
        </Text>
      </div>
      <div className="flex gap-2">
        <Button variant="ghost" size="sm" onClick={dismiss}>
          {m.cloud_connect_dismiss()}
        </Button>
        <Button variant="primary" size="sm" onClick={connect}>
          {m.cloud_connect_action()}
        </Button>
      </div>
    </div>
  );
}
