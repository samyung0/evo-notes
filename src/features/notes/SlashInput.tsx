import { useEffect, useMemo, useRef, useState } from 'react';
import { useComboboxInput, useHTMLInputCursorState } from '@platejs/combobox/react';
import { FloatingPortal, autoUpdate, flip, offset, shift, useFloating } from '@platejs/floating';
import type { PointRef, TComboboxInputElement } from 'platejs';
import { PlateElement, type PlateElementProps, useEditorRef } from 'platejs/react';
import { useOptionalNoteBlockDialogs } from './blocks/dialogContext';
import { commandMatches, EDITOR_COMMANDS } from './editorCommands';
import { useNoteEditorPrefs } from './noteEditorPrefs';
import { isEditorCommandAllowed } from './editorMode';
import { useEditorRuntime } from './EditorRuntime';

export function SlashInputElement(props: PlateElementProps<TComboboxInputElement>) {
  const editor = useEditorRef();
  // Optional: matches editorCommands (dialogs?.open*) and survives Plate element
  // trees that do not see NoteBlockDialogsProvider React context.
  const dialogs = useOptionalNoteBlockDialogs();
  const enabled = useNoteEditorPrefs((state) => state.enabled);
  const { mode } = useEditorRuntime();
  const inputRef = useRef<HTMLInputElement>(null);
  const cursorState = useHTMLInputCursorState(inputRef);
  const insertPointRef = useRef<PointRef | null>(null);
  const isSelectingCommandRef = useRef(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);

  const { refs, floatingStyles } = useFloating({
    open: true,
    placement: 'bottom-start',
    strategy: 'fixed',
    whileElementsMounted: autoUpdate,
    middleware: [
      offset(4),
      flip({
        fallbackPlacements: ['top-start'],
        padding: 12,
      }),
      shift({ padding: 12 }),
    ],
  });

  useEffect(() => {
    insertPointRef.current?.unref();
    insertPointRef.current = null;
    const path = editor.api.findPath(props.element);
    if (!path) return;
    const point = editor.api.before(path);
    if (!point) return;
    const pointRef = editor.api.pointRef(point);
    insertPointRef.current = pointRef;
    return () => {
      if (insertPointRef.current === pointRef) insertPointRef.current = null;
      pointRef.unref();
    };
  }, [editor, props.element]);

  const { props: inputProps, removeInput } = useComboboxInput({
    autoFocus: true,
    // Same as MentionInput: nested <input> focus can clear Slate selection.
    cancelInputOnDeselect: false,
    cancelInputOnBlur: true,
    cursorState,
    ref: inputRef,
    onCancelInput: (cause) => {
      // Focusing the editor to run a selected command blurs this native input.
      // At that point the slash node has already been deliberately removed, so
      // do not restore the slash query as if the user had cancelled the menu.
      if (isSelectingCommandRef.current) return;
      if (cause !== 'backspace') {
        editor.tf.insertText(`/${query}`, {
          at: insertPointRef.current?.current ?? undefined,
        });
      }
    },
  });

  const commands = useMemo(
    () =>
      EDITOR_COMMANDS.filter(
        (command) =>
          (!command.widget || enabled[command.widget]) &&
          isEditorCommandAllowed(mode, command) &&
          commandMatches(command, query)
      ),
    [enabled, mode, query]
  );

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  function select(index: number) {
    const command = commands[index];
    if (!command) return;
    const insertionPoint = insertPointRef.current?.current;

    isSelectingCommandRef.current = true;
    removeInput(false);

    // The nested native input can clear Slate's selection. Restore the point
    // tracked immediately before the slash node before running the command.
    if (insertionPoint) editor.tf.select(insertionPoint);
    if (command.focusEditor !== false) editor.tf.focus();
    command.run(editor, dialogs);
  }

  return (
    <PlateElement {...props} as="span">
      <span ref={refs.setReference} contentEditable={false} className="relative inline-flex">
        <span>/</span>
        <span className="relative min-w-2">
          <span aria-hidden className="invisible whitespace-pre">
            {query || '\u200b'}
          </span>
          <input
            {...inputProps}
            ref={inputRef}
            value={query}
            aria-label="Search editor commands"
            aria-expanded={commands.length > 0}
            role="combobox"
            className="absolute inset-0 size-full bg-transparent outline-none"
            onBlur={(event) => {
              // The selected command can replace this slash node with another
              // inline combobox at the same Slate path. Letting the stale slash
              // blur handler run would remove that newly inserted node.
              if (isSelectingCommandRef.current) return;
              inputProps.onBlur?.(event);
            }}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              inputProps.onKeyDown?.(event);
              if (event.defaultPrevented) return;
              if (event.key === 'ArrowDown') {
                event.preventDefault();
                setActiveIndex((index) => (index + 1) % Math.max(1, commands.length));
              } else if (event.key === 'ArrowUp') {
                event.preventDefault();
                setActiveIndex(
                  (index) =>
                    (index - 1 + Math.max(1, commands.length)) % Math.max(1, commands.length)
                );
              } else if (event.key === 'Enter' && commands.length) {
                event.preventDefault();
                select(activeIndex);
              }
            }}
          />
        </span>
        <FloatingPortal>
          <span
            ref={refs.setFloating}
            style={floatingStyles}
            role="listbox"
            className="z-50 block max-h-72 w-72 overflow-auto rounded-card border border-line bg-surface p-1 shadow-pop"
          >
            {commands.length ? (
              commands.map((command, index) => (
                <button
                  key={command.id}
                  type="button"
                  role="option"
                  aria-selected={index === activeIndex}
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => select(index)}
                  className="flex w-full flex-col rounded-row px-2 py-1.5 text-left hover:bg-surface-hover-bg aria-selected:bg-surface-hover-bg"
                >
                  <span className="text-sm font-medium text-fg">{command.label}</span>
                  <span className="text-xs text-fg-muted">{command.description}</span>
                </button>
              ))
            ) : (
              <span className="block px-2 py-3 text-sm text-fg-muted">No commands found</span>
            )}
          </span>
        </FloatingPortal>
      </span>
      {props.children}
    </PlateElement>
  );
}
