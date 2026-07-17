import { useMemo, useRef, useState } from 'react';
import { useComboboxInput, useHTMLInputCursorState } from '@platejs/combobox/react';
import { EmojiInlineIndexSearch, insertEmoji } from '@platejs/emoji';
import { EmojiPlugin } from '@platejs/emoji/react';
import { PlateElement, type PlateElementProps, useEditorRef, usePluginOption } from 'platejs/react';
import { Search, Smile } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui';

export function EmojiToolbarPicker() {
  const editor = useEditorRef();
  const data = usePluginOption(EmojiPlugin, 'data');
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('smile');
  const emojis = useMemo(() => {
    if (!data || !query.trim()) return [];
    return EmojiInlineIndexSearch.getInstance(data).search(query).get().slice(0, 36);
  }, [data, query]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          title="Emoji"
          aria-label="Search emoji"
          className="inline-flex size-8 items-center justify-center rounded-row text-fg-muted hover:bg-surface-hover-bg hover:text-fg"
        >
          <Smile className="size-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 border border-line bg-surface p-2 shadow-pop">
        <label className="mb-2 flex items-center gap-2 rounded-row border border-line px-2 py-1.5">
          <Search className="size-4 text-fg-muted" />
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search emoji"
            className="min-w-0 flex-1 bg-transparent text-sm text-fg outline-none"
          />
        </label>
        <div className="grid max-h-64 grid-cols-6 gap-1 overflow-auto" role="listbox">
          {emojis.map((emoji) => (
            <button
              key={emoji.id}
              type="button"
              role="option"
              aria-label={emoji.name}
              title={emoji.name}
              className="rounded-row p-1.5 text-xl hover:bg-surface-hover-bg"
              onClick={() => {
                insertEmoji(editor, emoji);
                setOpen(false);
              }}
            >
              {emoji.skins[0]?.native}
            </button>
          ))}
          {!emojis.length && (
            <p className="col-span-6 px-2 py-4 text-center text-sm text-fg-muted">No emoji found</p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function EmojiInputElement(props: PlateElementProps) {
  const { editor } = props;
  const data = usePluginOption(EmojiPlugin, 'data');
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
  const emojis = useMemo(() => {
    if (!data || !query.trim()) return [];
    return EmojiInlineIndexSearch.getInstance(data)
      .search(query.replace(/:$/, ''))
      .get()
      .slice(0, 12);
  }, [data, query]);

  const select = (index: number) => {
    const emoji = emojis[index];
    if (emoji) insertEmoji(editor, emoji);
  };

  return (
    <PlateElement {...props} as="span">
      <span contentEditable={false} className="relative inline-flex">
        <span>:</span>
        <span className="relative min-w-4">
          <span aria-hidden className="invisible whitespace-pre">
            {query || '\u200b'}
          </span>
          <input
            {...inputProps}
            ref={inputRef}
            value={query}
            aria-label="Search emoji"
            role="combobox"
            aria-expanded={emojis.length > 0}
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
                setActiveIndex((index) => (index + 1) % Math.max(1, emojis.length));
              } else if (event.key === 'ArrowUp') {
                event.preventDefault();
                setActiveIndex(
                  (index) => (index - 1 + Math.max(1, emojis.length)) % Math.max(1, emojis.length)
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
          className="absolute top-full left-0 z-50 mt-1 grid max-h-60 w-64 grid-cols-4 gap-1 overflow-auto rounded-card border border-line bg-surface p-1 shadow-pop"
        >
          {emojis.map((emoji, index) => (
            <button
              key={emoji.id}
              type="button"
              role="option"
              title={emoji.name}
              aria-selected={activeIndex === index}
              onMouseDown={(event) => event.preventDefault()}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => select(index)}
              className="rounded-row p-2 text-xl hover:bg-surface-hover-bg aria-selected:bg-surface-hover-bg"
            >
              {emoji.skins[0]?.native}
            </button>
          ))}
          {!emojis.length && (
            <p className="col-span-4 px-2 py-3 text-sm text-fg-muted">No emoji found</p>
          )}
        </div>
      </span>
      {props.children}
    </PlateElement>
  );
}
