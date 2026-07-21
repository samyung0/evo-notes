import { Badge, Dialog, DialogContent, DialogTitle, Icon, IconButton } from '@/components/ui';
import type { CalendarEvent, Label } from '@/api/types';
import { fmtTime } from './dateUtils';

export function EventDetailDialog({
  event,
  labels,
  onClose,
  onEdit,
}: {
  event: CalendarEvent | null;
  labels: Label[];
  onClose: () => void;
  onEdit?: (event: CalendarEvent) => void;
}) {
  return (
    <Dialog open={!!event} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        {event && (
          <>
            <DialogTitle className="pr-20 pb-4">
              <span className="min-w-0 truncate">{event.title}</span>
            </DialogTitle>
            <IconButton
              icon="write"
              variant="ghost-hover"
              size="md"
              className="absolute top-4 right-14"
              label="Edit"
              onClick={() => onEdit?.(event)}
            />

            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <Icon name="clock" className="size-4 -translate-y-px" /> {fmtTime(event.start)} –{' '}
                {fmtTime(event.end)}
              </div>
              {event.location && (
                <div className="flex items-center gap-2">
                  <Icon name="location" className="size-4 -translate-y-px" /> {event.location}
                </div>
              )}
              {event.labelIds.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1">
                  {event.labelIds.map((id) => {
                    const l = labels.find((x) => x.id === id);
                    return l ? (
                      <Badge key={id} tone="neutral" size="sm">
                        # {l.name}
                      </Badge>
                    ) : null;
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
