import { useMemo, useState } from 'react';
import { flip, offset, type UseVirtualFloatingOptions } from '@platejs/floating';
import { validateUrl } from '@platejs/link';
import {
  FloatingLinkUrlInput,
  LinkOpenButton,
  LinkPlugin,
  submitFloatingLink,
  useFloatingLinkEdit,
  useFloatingLinkEditState,
} from '@platejs/link/react';
import { Check, ExternalLink, Pencil, Unlink, X } from 'lucide-react';
import { useEditorPlugin, useEditorRef, usePluginOption } from 'platejs/react';
import { cn } from '@/lib/cn';

const actionClass =
  'inline-flex h-8 items-center gap-1.5 rounded-row px-2 text-sm text-fg outline-none hover:bg-surface-hover-bg focus-visible:ring-2 focus-visible:ring-focus [&_svg]:size-4';

export function LinkFloatingToolbar() {
  const editor = useEditorRef();
  const { api } = useEditorPlugin(LinkPlugin);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const url = String(usePluginOption(LinkPlugin, 'url') ?? '');
  const floatingOptions = useMemo<UseVirtualFloatingOptions>(
    () => ({
      middleware: [
        offset(8),
        flip({ fallbackPlacements: ['bottom-end', 'top-start', 'top-end'], padding: 12 }),
      ],
      placement: 'bottom-start',
    }),
    []
  );
  const state = useFloatingLinkEditState({ floatingOptions });
  const { editButtonProps, props, ref, unlinkButtonProps } = useFloatingLinkEdit(state);

  if (!state.isOpen) return null;

  const invalid = attemptedSubmit && !validateUrl(editor, url);
  const cancelEdit = () => {
    setAttemptedSubmit(false);
    api.floatingLink.show('edit', editor.id);
    editor.tf.focus(editor.selection ? { at: editor.selection } : undefined);
  };

  if (state.isEditing) {
    return (
      <form
        ref={ref}
        style={props.style}
        className="z-50 w-80 rounded-card border border-line bg-surface p-2 shadow-pop"
        onSubmit={(event) => {
          event.preventDefault();
          setAttemptedSubmit(true);
          if (!validateUrl(editor, url)) return;
          submitFloatingLink(editor);
          setAttemptedSubmit(false);
        }}
      >
        <div className="flex items-center gap-1">
          <FloatingLinkUrlInput
            aria-label="Link URL"
            aria-invalid={invalid}
            className={cn(
              'h-8 min-w-0 flex-1 rounded-input border border-line bg-surface px-2 text-sm outline-none',
              'focus:ring-focus focus:border-line-strong focus:ring-2',
              invalid && 'border-solid-error'
            )}
            placeholder="https://example.com"
          />
          <button type="submit" className={actionClass} aria-label="Save link" title="Save link">
            <Check />
          </button>
          <button
            type="button"
            className={actionClass}
            aria-label="Cancel link editing"
            title="Cancel"
            onMouseDown={(event) => event.preventDefault()}
            onClick={cancelEdit}
          >
            <X />
          </button>
        </div>
        {invalid && (
          <p role="alert" className="mt-1.5 text-xs text-solid-error">
            Enter a valid web, email, telephone, document, or anchor URL.
          </p>
        )}
      </form>
    );
  }

  return (
    <div
      ref={ref}
      style={props.style}
      className="z-50 flex items-center gap-0.5 rounded-card border border-line bg-surface p-1 shadow-pop"
    >
      <button
        type="button"
        className={actionClass}
        {...editButtonProps}
        onMouseDown={(event) => event.preventDefault()}
      >
        <Pencil />
        Edit
      </button>
      <LinkOpenButton
        className={actionClass}
        rel="noopener noreferrer"
        title="Open link in a new tab"
      >
        <ExternalLink />
        Open
      </LinkOpenButton>
      <button type="button" className={actionClass} {...unlinkButtonProps}>
        <Unlink />
        Remove
      </button>
    </div>
  );
}
