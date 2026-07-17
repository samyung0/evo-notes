import { useMemo, useRef, useState } from 'react';
import { useComboboxInput, useHTMLInputCursorState } from '@platejs/combobox/react';
import { getMentionOnSelectItem } from '@platejs/mention';
import type { TComboboxInputElement } from 'platejs';
import { PlateElement, type PlateElementProps, useEditorRef } from 'platejs/react';
import { useWorkspaceMembers } from '@/api/hooks';
import { useEditorRuntime } from './EditorRuntime';

const onSelectMention = getMentionOnSelectItem();

export function MentionInputElement(props: PlateElementProps<TComboboxInputElement>) {
  const editor = useEditorRef();
  const { workspaceId } = useEditorRuntime();
  const { data: members = [] } = useWorkspaceMembers(workspaceId);
  const inputRef = useRef<HTMLInputElement>(null);
  const cursorState = useHTMLInputCursorState(inputRef);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const { props: inputProps } = useComboboxInput({
    autoFocus: true,
    cancelInputOnBlur: true,
    cursorState,
    ref: inputRef,
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

  const select = (index: number) => {
    const member = matches[index];
    if (!member) return;
    onSelectMention(editor, { key: member.userId, text: member.name }, query);
  };

  return (
    <PlateElement {...props} as="span">
      <span contentEditable={false} className="relative inline-flex">
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
            onChange={(event) => {
              setQuery(event.target.value);
              setActiveIndex(0);
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
                  (index) => (index - 1 + Math.max(1, matches.length)) % Math.max(1, matches.length)
                );
              } else if (event.key === 'Enter') {
                event.preventDefault();
                select(activeIndex);
              }
            }}
          />
        </span>
        <div
          role="listbox"
          className="absolute top-full left-0 z-50 mt-1 max-h-64 w-64 overflow-auto rounded-card border border-line bg-surface p-1 shadow-pop"
        >
          {matches.map((member, index) => (
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
          {!matches.length && <p className="px-2 py-3 text-sm text-fg-muted">No members found</p>}
        </div>
      </span>
      {props.children}
    </PlateElement>
  );
}
