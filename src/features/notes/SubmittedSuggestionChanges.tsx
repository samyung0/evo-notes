import type { MaterialSuggestion } from '@/api/types';
import { cn } from '@/lib/cn';
import { materialValueText, suggestionChangeItems } from './suggestions';

export function SubmittedSuggestionChanges({
  suggestions,
  className,
}: {
  suggestions: MaterialSuggestion[];
  className?: string;
}) {
  const pending = suggestions.filter((suggestion) => suggestion.status === 'pending');
  if (pending.length === 0) return null;

  return (
    <aside
      aria-label="Suggested changes"
      contentEditable={false}
      className={cn(
        'my-2 flex flex-col gap-2 border-l-2 border-action-accent/45 pl-3 select-text',
        className
      )}
    >
      {pending.map((suggestion) => {
        const changes = suggestionChangeItems(suggestion.proposedFragment);
        const fallback = changes.length ? '' : materialValueText(suggestion.proposedFragment);

        return (
          <section
            key={suggestion.id}
            data-submitted-suggestion={suggestion.id}
            className="rounded-row bg-tint-accent-2/55 px-3 py-2"
          >
            <p className="mb-1 text-xs font-medium text-fg-muted">
              Pending suggestion from {suggestion.userId}
            </p>
            {changes.length > 0 ? (
              <div className="flex flex-col gap-0.5">
                {changes.map((change, index) => (
                  <p key={index} className="flex gap-2 text-sm">
                    <span
                      className={cn(
                        'shrink-0 font-semibold',
                        change.type === 'insert' ? 'text-solid-success' : 'text-solid-error'
                      )}
                    >
                      {change.type === 'insert' ? 'Add' : 'Delete'}
                    </span>
                    <span
                      className={cn(
                        'min-w-0 whitespace-pre-wrap text-fg',
                        change.type === 'remove' && 'text-fg-muted line-through'
                      )}
                    >
                      {change.text}
                    </span>
                  </p>
                ))}
              </div>
            ) : (
              <p className="text-sm whitespace-pre-wrap text-fg">{fallback || 'Document edit'}</p>
            )}
          </section>
        );
      })}
    </aside>
  );
}
