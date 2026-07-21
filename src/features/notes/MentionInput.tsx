import { useEffect, useMemo, useRef, useState } from 'react';
import { useComboboxInput, useHTMLInputCursorState } from '@platejs/combobox/react';
import { getMentionOnSelectItem } from '@platejs/mention';
import type { PointRef, TComboboxInputElement } from 'platejs';
import { PlateElement, type PlateElementProps, useEditorRef } from 'platejs/react';
import { useWorkspaceMembers } from '@/api/hooks';
import { useEditorRuntime } from './EditorRuntime';

const onSelectMention = getMentionOnSelectItem();

export function MentionInputElement(props: PlateElementProps<TComboboxInputElement>) {
  const editor = useEditorRef();
  const { workspaceId } = useEditorRuntime();
  const { data: members = [], isPending, isError } = useWorkspaceMembers(workspaceId);
  const rootRef = useRef<HTMLSpanElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const insertPointRef = useRef<PointRef | null>(null);
  const aliveRef = useRef(false);
  const cursorState = useHTMLInputCursorState(inputRef);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

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
    // Nested <input> focus often clears Slate's element selection; blur still
    // closes the combobox when the user leaves the field.
    cancelInputOnDeselect: false,
    cancelInputOnBlur: true,
    cursorState,
    ref: inputRef,
    onCancelInput: (cause) => {
      if (cause !== 'backspace') {
        editor.tf.insertText(`@${query}`, {
          at: insertPointRef.current?.current ?? undefined,
        });
      }
      if (cause === 'arrowLeft' || cause === 'arrowRight') {
        editor.tf.move({
          distance: 1,
          reverse: cause === 'arrowLeft',
        });
      }
    },
  });

  const matches = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return members
      .filter(
        (member) =>
          !normalized ||
          member.name.toLowerCase().includes(normalized) ||
          member.email.toLowerCase().includes(normalized)
      )
      .slice(0, 8);
  }, [members, query]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query, matches.length]);

  const select = (index: number) => {
    const member = matches[index];
    if (!member) return;
    // Official Plate InlineCombobox removes the input before inserting the mention.
    removeInput(true);
    onSelectMention(editor, { key: member.userId, text: member.name }, query);
  };

  return (
    <PlateElement {...props} as="span">
      <span ref={rootRef} contentEditable={false} className="relative inline-flex">
        <span className="rounded bg-tint-accent-1 px-1 text-tint-accent-1-fg">@</span>
        <span className="relative min-w-4">
          <span aria-hidden className="invisible whitespace-pre">
            {query || '\u200b'}
          </span>
          <input
            {...inputProps}
            ref={inputRef}
            value={query}
            aria-label="Mention a workspace member"
            role="combobox"
            aria-expanded={matches.length > 0}
            className="absolute inset-0 size-full bg-transparent outline-none"
            onBlur={(event) => {
              const next = event.relatedTarget as Node | null;
              if (next && rootRef.current?.contains(next)) return;
              // Defer so React Strict Mode's mount→unmount→remount does not treat
              // the transient blur as a real cancel and delete the mention input.
              window.requestAnimationFrame(() => {
                if (!aliveRef.current) return;
                inputProps.onBlur?.(event);
              });
            }}
            onChange={(event) => {
              setQuery(event.target.value);
            }}
            onKeyDown={(event) => {
              inputProps.onKeyDown?.(event);
              if (event.defaultPrevented) return;
              if (event.key === 'ArrowDown') {
                event.preventDefault();
                setActiveIndex((index) => (index + 1) % Math.max(1, matches.length));
              } else if (event.key === 'ArrowUp') {
                event.preventDefault();
                setActiveIndex(
                  (index) =>
                    (index - 1 + Math.max(1, matches.length)) % Math.max(1, matches.length)
                );
              } else if (event.key === 'Enter') {
                event.preventDefault();
                select(activeIndex);
              }
            }}
          />
        </span>
        <span
          role="listbox"
          className="absolute top-full left-0 z-50 mt-1 block max-h-64 w-64 overflow-auto rounded-card border border-line bg-surface p-1 shadow-pop"
        >
          {isPending && (
            <span className="block px-2 py-3 text-sm text-fg-muted">Loading members…</span>
          )}
          {!isPending && isError && (
            <span className="block px-2 py-3 text-sm text-fg-muted">Could not load members</span>
          )}
          {!isPending &&
            !isError &&
            matches.map((member, index) => (
              <button
                key={member.userId}
                type="button"
                role="option"
                aria-selected={activeIndex === index}
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => select(index)}
                className="flex w-full flex-col rounded-row px-2 py-1.5 text-left hover:bg-surface-hover-bg aria-selected:bg-surface-hover-bg"
              >
                <span className="text-sm font-medium text-fg">{member.name}</span>
                <span className="text-xs text-fg-muted">{member.email}</span>
              </button>
            ))}
          {!isPending && !isError && !matches.length && (
            <span className="block px-2 py-3 text-sm text-fg-muted">No members found</span>
          )}
        </span>
      </span>
      {props.children}
    </PlateElement>
  );
}
