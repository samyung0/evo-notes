import { useEffect, useMemo, useRef, useState } from 'react';
import { useComboboxInput, useHTMLInputCursorState } from '@platejs/combobox/react';
import type { PointRef, TComboboxInputElement } from 'platejs';
import { PlateElement, type PlateElementProps, useEditorRef } from 'platejs/react';
import { useNoteBlockDialogs } from './blocks/dialogContext';
import { commandMatches, EDITOR_COMMANDS } from './editorCommands';
import { useNoteEditorPrefs } from './noteEditorPrefs';

export function SlashInputElement(props: PlateElementProps<TComboboxInputElement>) {
  const editor = useEditorRef();
  const dialogs = useNoteBlockDialogs();
  const enabled = useNoteEditorPrefs((state) => state.enabled);
  const inputRef = useRef<HTMLInputElement>(null);
  const cursorState = useHTMLInputCursorState(inputRef);
  const insertPointRef = useRef<PointRef | null>(null);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);

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
    cancelInputOnBlur: true,
    cursorState,
    ref: inputRef,
    onCancelInput: (cause) => {
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
        (command) => (!command.widget || enabled[command.widget]) && commandMatches(command, query)
      ),
    [enabled, query]
  );

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  function select(index: number) {
    const command = commands[index];
    if (!command) return;
    removeInput(true);
    command.run(editor, dialogs);
  }

  return (
    <PlateElement {...props} as="span">
      <span contentEditable={false} className="relative inline-flex">
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
        <div
          role="listbox"
          className="absolute top-full left-0 z-50 mt-1 max-h-72 w-72 overflow-auto rounded-card border border-line bg-surface p-1 shadow-pop"
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
            <div className="px-2 py-3 text-sm text-fg-muted">No commands found</div>
          )}
        </div>
      </span>
      {props.children}
    </PlateElement>
  );
}
