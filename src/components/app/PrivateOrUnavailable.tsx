import { PanelWithInvertedRadius } from '@/components/app/layout';
import { Button, Icon, Text } from '@/components/ui';
import { Link } from '@tanstack/react-router';

/** Non-disclosing empty state for private/missing shared resources. */
export function PrivateOrUnavailable({
  title = 'This item is private or unavailable.',
  backTo,
  backLabel = 'Go back',
}: {
  title?: string;
  backTo?: string;
  backLabel?: string;
}) {
  return (
    <PanelWithInvertedRadius>
      <div
        className="mx-auto flex h-full max-w-2xl flex-col items-center justify-center gap-4 px-6 text-center"
        data-testid="private-or-unavailable"
      >
        <span className="flex h-16 w-16 items-center justify-center rounded-card-lg bg-tint-error text-tint-error-fg">
          <Icon name="lock" size={30} />
        </span>
        <Text variant="section">{title}</Text>
        <Text variant="body" tone="muted">
          You may not have access, or the link may no longer be shared.
        </Text>
        {backTo && (
          <Link to={backTo} preload="intent">
            <Button iconLeft="chevronLeft">{backLabel}</Button>
          </Link>
        )}
      </div>
    </PanelWithInvertedRadius>
  );
}
