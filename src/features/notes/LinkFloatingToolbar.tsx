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
import { FloatingActionButton } from './nodeComponents';

export function LinkFloatingToolbar() {
  const editor = useEditorRef();
  const { api, setOption } = useEditorPlugin(LinkPlugin);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const url = String(usePluginOption(LinkPlugin, 'url') ?? '');
  const text = String(usePluginOption(LinkPlugin, 'text') ?? '');
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
        className="z-50 flex w-80 flex-col gap-2 rounded-card border border-line bg-surface p-2 shadow-pop"
        onSubmit={(event) => {
          event.preventDefault();
          setAttemptedSubmit(true);
          if (!validateUrl(editor, url)) return;
          submitFloatingLink(editor);
          setAttemptedSubmit(false);
        }}
      >
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-fg-muted">Link URL</span>
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
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-fg-muted">Displayed text</span>
          <input
            aria-label="Displayed text"
            className="focus:ring-focus h-8 min-w-0 rounded-input border border-line bg-surface px-2 text-sm outline-none focus:border-line-strong focus:ring-2"
            placeholder="Use the URL as text"
            value={text}
            onChange={(event) => setOption('text', event.target.value)}
          />
        </label>
        <div className="flex items-center justify-end gap-0.5">
          <FloatingActionButton label="Save link" type="submit">
            <Check />
          </FloatingActionButton>
          <FloatingActionButton label="Cancel link editing" onClick={cancelEdit}>
            <X />
          </FloatingActionButton>
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
      role="toolbar"
      aria-label="Link actions"
      className="z-50 flex w-auto max-w-[90vw] min-w-14 items-center justify-center gap-0.5 overflow-x-auto rounded-card border border-line bg-surface p-1 shadow-pop"
    >
      <FloatingActionButton label="Edit link" {...editButtonProps}>
        <Pencil />
      </FloatingActionButton>
      <FloatingActionButton asChild label="Open link in a new tab">
        <LinkOpenButton rel="noopener noreferrer">
          <ExternalLink />
        </LinkOpenButton>
      </FloatingActionButton>
      <FloatingActionButton label="Remove link" {...unlinkButtonProps}>
        <Unlink />
      </FloatingActionButton>
    </div>
  );
}
