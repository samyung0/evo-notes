import { Panel, PanelWithInvertedRadius } from '@/components/app/layout';
import { Button, Icon, Spinner, Text } from '@/components/ui';
import { Link } from '@tanstack/react-router';

/** Non-disclosing empty state for private/missing shared resources. */
export function LoadingLarge({
  title = 'Loading...',
  backTo,
  backLabel = 'Go back',
}: {
  title?: string;
  backTo?: string;
  backLabel?: string;
}) {
  return (
    <Panel sectionClassName="items-center justify-center h-full">
      <div
        className="mx-auto flex h-full max-w-2xl flex-col items-center justify-center gap-4 px-6 text-center"
        data-testid="loading-large"
      >
        <span>
          <Spinner className="size-7" />
        </span>
        <h1 className="t-section">{title}</h1>
        {backTo && (
          <Link to={backTo} preload="intent" className="-translate-x-1">
            <Button iconLeft="chevronLeft" variant="ghost">
              {backLabel}
            </Button>
          </Link>
        )}
      </div>
    </Panel>
  );
}
