import { Panel, PanelWithInvertedRadius } from '@/components/app/layout';
import { Button, Icon, Text } from '@/components/ui';
import { Link } from '@tanstack/react-router';

/** Non-disclosing empty state for private/missing shared resources. */
export function PrivateOrUnavailable({
  title = 'This item is private or unavailable.',
  description = 'You may not have access, or the link may no longer be shared.',
  backTo,
  backLabel = 'Go back',
}: {
  title?: string;
  backTo?: string;
  backLabel?: string;
  description?: string;
}) {
  return (
    <Panel sectionClassName="items-center justify-center h-full">
      <div
        className="mx-auto flex h-full max-w-2xl flex-col items-center justify-center gap-4 px-6 text-center"
        data-testid="private-or-unavailable"
      >
        <span className="flex size-15 items-center justify-center rounded-card-lg bg-tint-error text-tint-error-fg">
          <Icon name="warning" className="size-7" />
        </span>
        <h1 className="t-section mt-1">{title}</h1>
        <p className="t-subtitle font-medium">{description}</p>
        {backTo && (
          <Link to={backTo} preload="intent" className="mt-4">
            <Button iconLeft="chevronLeft" variant="ghost">
              {backLabel}
            </Button>
          </Link>
        )}
      </div>
    </Panel>
  );
}
