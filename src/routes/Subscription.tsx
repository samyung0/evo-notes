import { useState } from 'react';
import { Panel, PageHeader } from '@/components/app/layout';
import { Button, Text } from '@/components/ui';
import { useMe, useBillingCheckout, useBillingPortal } from '@/api/hooks';
import type { PlanTier } from '@/api/types';
import { cn } from '@/lib/cn';
import { m } from '@/i18n';

function planLabel(tier: PlanTier) {
  switch (tier) {
    case 'pro':
      return m.subscription_plan_pro();
    case 'team':
      return m.subscription_plan_team();
    default:
      return m.subscription_plan_free();
  }
}

const PLANS: {
  tier: PlanTier;
  bullets: string[];
}[] = [
  {
    tier: 'free',
    bullets: ['3 workspaces', '50 MB uploads', 'Basic chat'],
  },
  {
    tier: 'pro',
    bullets: ['Unlimited workspaces', '5 GB uploads', 'AI generate', 'Priority ingest'],
  },
  {
    tier: 'team',
    bullets: ['Everything in Pro', 'Shared workspaces', 'Admin controls (coming soon)'],
  },
];

function PlanCard({
  tier,
  bullets,
  current,
  onUpgrade,
  loading,
}: {
  tier: PlanTier;
  bullets: string[];
  current: boolean;
  onUpgrade?: () => void;
  loading?: boolean;
}) {
  return (
    <div
      className={cn(
        'flex flex-col gap-3 rounded-card border px-5 py-5',
        current ? 'border-action bg-surface' : 'border-line bg-surface'
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <Text variant="subtitle">{planLabel(tier)}</Text>
        {current && (
          <Text variant="label" tone="muted" className="rounded-pill bg-action/10 px-2 py-0.5">
            {m.subscription_current()}
          </Text>
        )}
      </div>
      <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
        {bullets.map((b) => (
          <li key={b} className="text-sm text-fg-secondary">
            · {b}
          </li>
        ))}
      </ul>
      {tier !== 'free' && !current && onUpgrade && (
        <Button variant="primary" onClick={onUpgrade} disabled={loading}>
          {m.subscription_upgrade()}
        </Button>
      )}
    </div>
  );
}

export default function Subscription() {
  const { data: me } = useMe();
  const checkout = useBillingCheckout();
  const portal = useBillingPortal();
  const [busy, setBusy] = useState<PlanTier | null>(null);

  async function upgrade(tier: PlanTier) {
    setBusy(tier);
    try {
      const { url } = await checkout.mutateAsync(tier);
      window.location.href = url;
    } finally {
      setBusy(null);
    }
  }

  return (
    <Panel>
      <PageHeader showTopBar={false} title={m.subscription_title()} />
      <div className="min-h-0 flex-1 overflow-auto px-6 py-5">
        <div className="mx-auto max-w-3xl">
          <div className="mb-6 rounded-card border border-line bg-surface px-5 py-4">
            <Text variant="label" tone="muted" className="mb-1 block">
              {m.subscription_status_label()}
            </Text>
            <Text variant="subtitle">
              {planLabel(me?.planTier ?? 'free')} · {me?.subscriptionStatus ?? 'none'}
            </Text>
            {me?.subscriptionStatus === 'active' && (
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => portal.mutate()}
                disabled={portal.isPending}
              >
                {m.subscription_manage()}
              </Button>
            )}
          </div>

          <Text variant="label" tone="muted" className="mb-3 block">
            {m.subscription_plans_heading()}
          </Text>
          <div className="grid gap-4 md:grid-cols-3">
            {PLANS.map((p) => (
              <PlanCard
                key={p.tier}
                tier={p.tier}
                bullets={p.bullets}
                current={me?.planTier === p.tier}
                onUpgrade={p.tier === 'free' ? undefined : () => upgrade(p.tier)}
                loading={busy === p.tier}
              />
            ))}
          </div>
        </div>
      </div>
    </Panel>
  );
}
