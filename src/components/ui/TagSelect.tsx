import { useMemo, useRef, useState } from 'react';
import type { Tag, TagInput } from '@/api/types';
import { useTags } from '@/api/hooks';
import { cn } from '@/lib/cn';
import { Icon } from './Icon';
import { IconButton } from './IconButton';

const MAX_LEN = 50;

type Option = { type: 'create'; value: string } | { type: 'existing'; tag: Tag };

export interface TagSelectProps {
  value: TagInput[];
  onChange: (next: TagInput[]) => void;
  /** Tag catalog scope — 'workspace' | 'quiz' | 'card'. */
  kind?: string;
  placeholder?: string;
  invalid?: boolean;
}

/**
 * Tag editor with reuse-aware autocomplete. Selected tags render as removable
 * chips; typing filters the user's existing catalog (loaded once via useTags,
 * filtered client-side). Picking an existing tag carries its `id` so the backend
 * reuses that catalog row (preserving its metadata); creating a new one sends
 * `{ value }` with no id.
 */
export function TagSelect({
  value,
  onChange,
  kind = 'workspace',
  placeholder = 'Search or create a tag…',
  invalid,
}: TagSelectProps) {
  const { data: catalog = [] } = useTags(kind);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selected = value ?? [];
  const selectedKeys = useMemo(
    () => new Set(selected.map((t) => t.value.trim().toLowerCase())),
    [selected]
  );

  const q = query.trim();
  const suggestions = useMemo(() => {
    const ql = q.toLowerCase();
    return catalog.filter(
      (t) => !selectedKeys.has(t.value.toLowerCase()) && (!ql || t.value.toLowerCase().includes(ql))
    );
  }, [catalog, q, selectedKeys]);

  const hasExact =
    q.length > 0 &&
    (selectedKeys.has(q.toLowerCase()) ||
      catalog.some((t) => t.value.toLowerCase() === q.toLowerCase()));
  const canCreate = q.length > 0 && q.length <= MAX_LEN && !hasExact;

  const options: Option[] = [];
  if (canCreate) options.push({ type: 'create', value: q });
  for (const t of suggestions) options.push({ type: 'existing', tag: t });

  const activeIdx = options.length ? Math.min(active, options.length - 1) : 0;
  const showList = open && options.length > 0;

  function addTag(next: TagInput) {
    const key = next.value.trim().toLowerCase();
    if (!key || selectedKeys.has(key)) return;
    onChange([...selected, { id: next.id, value: next.value.trim() }]);
    setQuery('');
    setActive(0);
    inputRef.current?.focus();
  }

  function removeAt(i: number) {
    onChange(selected.filter((_, idx) => idx !== i));
  }

  function commit(opt: Option) {
    if (opt.type === 'create') addTag({ value: opt.value });
    else addTag({ id: opt.tag.id, value: opt.tag.value });
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    switch (e.key) {
      case 'Enter':
        e.preventDefault();
        if (options.length) commit(options[activeIdx]);
        break;
      case 'ArrowDown':
        e.preventDefault();
        setOpen(true);
        setActive((a) => Math.min(a + 1, options.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActive((a) => Math.max(a - 1, 0));
        break;
      case 'Backspace':
        if (query === '' && selected.length) removeAt(selected.length - 1);
        break;
      case 'Escape':
        setOpen(false);
        break;
    }
  }

  return (
    <div className="relative">
      <div
        className={cn(
          't-body flex flex-wrap items-center gap-1.5 rounded-input border border-line bg-surface px-2 py-2 transition-[colors,border] duration-150 focus-within:border-line-strong',
          invalid && 'border-2 border-solid-error'
        )}
        onClick={() => inputRef.current?.focus()}
      >
        {selected.map((t, i) => (
          <span
            key={`${t.id ?? 'new'}:${t.value}:${i}`}
            className="inline-flex items-center gap-1 rounded-pill bg-surface-hover-bg py-0.5 pr-1 pl-2 text-xs font-bold text-surface-fg"
          >
            # {t.value}
            <IconButton
              type="button"
              icon="x"
              variant="ghost-hover"
              size="xs"
              className="text-fg-muted"
              aria-label={`Remove ${t.value}`}
              onClick={(e) => {
                e.stopPropagation();
                removeAt(i);
              }}
            />
          </span>
        ))}
        <input
          ref={inputRef}
          className="min-w-32 flex-1 border-none bg-transparent py-1 pl-1.5 outline-none placeholder:text-placeholder"
          placeholder={selected.length ? '' : placeholder}
          value={query}
          maxLength={MAX_LEN}
          autoComplete="off"
          aria-invalid={invalid}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setActive(0);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          onBlur={() => {
            blurTimer.current = setTimeout(() => setOpen(false), 120);
          }}
        />
      </div>

      {showList && (
        <ul
          className="absolute z-50 mt-1.5 max-h-56 w-full overflow-auto rounded-lg border border-line bg-surface p-1 shadow-lg"
          // Keep focus in the input so a click commits before blur closes the list.
          onMouseDown={(e) => {
            e.preventDefault();
            if (blurTimer.current) clearTimeout(blurTimer.current);
          }}
        >
          {options.map((opt, i) => {
            const isActive = i === activeIdx;
            const key = opt.type === 'create' ? '__create__' : opt.tag.id;
            return (
              <li key={key}>
                <button
                  type="button"
                  className={cn(
                    'flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm',
                    isActive ? 'bg-surface-hover-bg' : 'hover:bg-surface-hover-bg'
                  )}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => commit(opt)}
                >
                  {opt.type === 'create' ? (
                    <>
                      <Icon name="plus" className="size-4 text-fg-muted" />
                      <span>
                        Create <span className="font-medium">“{opt.value}”</span>
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="text-fg-muted">#</span>
                      <span className="font-medium">{opt.tag.value}</span>
                    </>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
