import { Panel, PageHeader } from '@/components/app/layout';
import { Avatar, Badge, Card, Icon, Text } from '@/components/ui';
import { useMe } from '@/api/hooks';
import { m } from '@/i18n';

export default function Profile() {
  const { data: me } = useMe();
  return (
    <Panel>
      <PageHeader title={m.profile_menu_profile()} />
      <div className="min-h-0 flex-1 overflow-auto px-6 py-5">
        <div className="mx-auto max-w-2xl">
          <Card padding={24} radius="card-lg" className="flex items-center gap-5">
            <Avatar name={me?.name} src={me?.avatarUrl} size={72} />
            <div className="min-w-0">
              <Text variant="section">{me?.name ?? '—'}</Text>
              <Text variant="body" tone="secondary">{me?.email}</Text>
              {me?.classLabel && <Badge tone="purple" size="sm" className="mt-2">{me.classLabel}</Badge>}
            </div>
          </Card>
          <Card padding={20} radius="card-lg" className="mt-4 flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-card bg-tint-warning text-tint-warning-fg"><Icon name="sparkles" size={20} /></span>
            <div>
              <Text variant="card-title">{me?.streak ?? 0}-day streak</Text>
              <Text variant="meta" tone="muted">Keep logging in to grow it.</Text>
            </div>
          </Card>
        </div>
      </div>
    </Panel>
  );
}
