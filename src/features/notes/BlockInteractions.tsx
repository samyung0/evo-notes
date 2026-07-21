import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useDraggable, useDropLine } from '@platejs/dnd';
import { BlockSelectionPlugin } from '@platejs/selection/react';
import { GripVertical } from 'lucide-react';
import {
  MemoizedChildren,
  type PlateElementProps,
  type RenderNodeWrapper,
  useEditorRef,
  useReadOnly,
} from 'platejs/react';
import { KEYS } from 'platejs';
import { cn } from '@/lib/cn';

const UNDRAGGABLE = new Set<string>([KEYS.column, KEYS.tr, KEYS.td, KEYS.th]);

export const BlockDraggable: RenderNodeWrapper = (props) => {
  if (props.editor.dom.readOnly || props.path.length !== 1 || UNDRAGGABLE.has(props.element.type)) {
    return;
  }
  return (nextProps) => <DraggableBlock {...nextProps} />;
};

function DraggableBlock({ children, editor, element }: PlateElementProps) {
  const { isDragging, nodeRef, handleRef } = useDraggable({ element });
  const { dropLine } = useDropLine();
  const [handleTop, setHandleTop] = useState(3);

  return (
    <div
      ref={nodeRef}
      className={cn('group relative flow-root', isDragging && 'opacity-45')}
      onMouseEnter={() => {
        if (isDragging) return;

        const block = editor.api.toDOMNode(element);
        if (!block) return;

        const marginTop = Number.parseFloat(window.getComputedStyle(block).marginTop) || 0;
        setHandleTop(marginTop + 3);
      }}
    >
      {/* Hittable flush gutter: hover it or the block to reveal the handle. */}
      <div
        contentEditable={false}
        className="absolute top-0 left-0 z-10 flex h-full -translate-x-full items-start pr-1 opacity-0 group-hover:opacity-100 hover:opacity-100"
      >
        <button
          ref={handleRef}
          type="button"
          contentEditable={false}
          data-plate-prevent-deselect
          aria-label="Drag block"
          className="flex size-6 cursor-grab items-center justify-center rounded-row text-fg-muted hover:bg-surface-hover-bg active:cursor-grabbing"
          style={{ marginTop: handleTop }}
        >
          <GripVertical className="size-4" />
        </button>
      </div>
      <div>
        <MemoizedChildren>{children}</MemoizedChildren>
      </div>
      {dropLine && (
        <div
          className={cn(
            'absolute inset-x-0 h-0.5 bg-action-accent',
            dropLine === 'top' ? '-top-px' : '-bottom-px'
          )}
        />
      )}
    </div>
  );
}

type MenuState = { x: number; y: number } | null;

export function BlockContextMenu({ children }: { children: React.ReactNode }) {
  const editor = useEditorRef();
  const readOnly = useReadOnly();
  const [menu, setMenu] = useState<MenuState>(null);

  useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(null);
    window.addEventListener('pointerdown', close, { once: true });
    window.addEventListener('blur', close, { once: true });
    return () => {
      window.removeEventListener('pointerdown', close);
      window.removeEventListener('blur', close);
    };
  }, [menu]);

  if (readOnly) return children;

  const act = (action: () => void) => {
    action();
    editor.tf.focus();
    setMenu(null);
  };

  return (
    <>
      <div
        className="w-full"
        onContextMenu={(event) => {
          const target = event.target as HTMLElement;
          if (target.closest('input, textarea, [data-plate-open-context-menu="false"]')) return;
          event.preventDefault();
          setMenu({ x: event.clientX, y: event.clientY });
        }}
      >
        {children}
      </div>
      {menu &&
        createPortal(
          <div
            role="menu"
            className="fixed z-50 min-w-48 rounded-card border border-line bg-surface p-1 shadow-pop"
            style={{ left: menu.x, top: menu.y }}
            onPointerDown={(event) => event.stopPropagation()}
          >
            <MenuButton
              label="Duplicate"
              onClick={() =>
                act(() => editor.getTransforms(BlockSelectionPlugin).blockSelection.duplicate())
              }
            />
            <MenuButton
              label="Delete"
              onClick={() =>
                act(() => editor.getTransforms(BlockSelectionPlugin).blockSelection.removeNodes())
              }
            />
            <div className="my-1 h-px bg-divider" />
            {[
              [KEYS.p, 'Paragraph'],
              [KEYS.h1, 'Heading 1'],
              [KEYS.h2, 'Heading 2'],
              [KEYS.h3, 'Heading 3'],
              [KEYS.blockquote, 'Blockquote'],
            ].map(([type, label]) => (
              <MenuButton
                key={type}
                label={`Turn into ${label}`}
                onClick={() => act(() => editor.tf.toggleBlock(type))}
              />
            ))}
            <div className="my-1 h-px bg-divider" />
            <MenuButton
              label="Indent"
              onClick={() =>
                act(() => editor.getTransforms(BlockSelectionPlugin).blockSelection.setIndent(1))
              }
            />
            <MenuButton
              label="Outdent"
              onClick={() =>
                act(() => editor.getTransforms(BlockSelectionPlugin).blockSelection.setIndent(-1))
              }
            />
          </div>,
          document.body
        )}
    </>
  );
}

function MenuButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      role="menuitem"
      className="block w-full rounded-row px-2 py-1.5 text-left text-sm text-fg hover:bg-surface-hover-bg"
      onClick={onClick}
    >
      {label}
    </button>
  );
}
