import { cn } from '@/lib/cn';
import { useDraggable, useDropLine } from '@platejs/dnd';
import { setColumns } from '@platejs/layout';
import { Columns2, Columns3, GripHorizontal, PanelLeft, PanelRight, Trash2 } from 'lucide-react';
import { PathApi, TColumnElement } from 'platejs';
import {
  PlateElement,
  useComposedRef,
  useEditorPlugin,
  useEditorRef,
  useEditorSelector,
  useElement,
  useFocusedLast,
  useReadOnly,
  useSelected,
  type PlateElementProps,
} from 'platejs/react';
import { useCallback, type CSSProperties, type MutableRefObject, type Ref } from 'react';
import { COLUMN_CLASS, COLUMN_GROUP_CLASS } from './nodeStyles';
import { COLUMN_LAYOUTS } from './richBlockConfig';
import { FloatingActionButton } from './nodeComponents';
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui';
import { ColumnPlugin } from '@platejs/layout/react';

export function ColumnGroup(props: PlateElementProps) {
  const readOnly = useReadOnly();

  const content = (
    <PlateElement {...props} className={COLUMN_GROUP_CLASS}>
      {props.children}
    </PlateElement>
  );

  if (readOnly) return content;

  return <ColumnFloatingToolbar>{content}</ColumnFloatingToolbar>;
}

function ColumnFloatingToolbar({ children }: { children: React.ReactElement }) {
  const selected = useSelected();
  const readOnly = useReadOnly();
  const isCollapsed = useEditorSelector((editor) => editor.api.isCollapsed(), []);
  const isFocusedLast = useFocusedLast();
  const open = isFocusedLast && !readOnly && selected && isCollapsed;

  return (
    <Popover modal={false} open={open}>
      <PopoverAnchor asChild>{children}</PopoverAnchor>
      {open && <ColumnFloatingToolbarContent />}
    </Popover>
  );
}

function ColumnFloatingToolbarContent() {
  const editor = useEditorRef();
  const element = useElement<TColumnElement>();
  const changeLayout = (widths: string[]) => {
    setColumns(editor, { at: element, widths });
  };

  const remove = () => {
    editor.tf.removeNodes({ at: element });
  };

  return (
    <PopoverContent
      align="center"
      side="bottom"
      sideOffset={8}
      avoidCollisions={false}
      contentEditable={false}
      onOpenAutoFocus={(event) => event.preventDefault()}
      className="w-auto max-w-[90vw] min-w-14 flex-row justify-center gap-0.5 overflow-x-auto rounded-card border border-line bg-surface p-1 shadow-pop"
    >
      {COLUMN_LAYOUTS.map((layout) => {
        const LayoutIcon =
          layout.value === 'equal-3'
            ? Columns3
            : layout.value === 'left-wide'
              ? PanelRight
              : layout.value === 'right-wide'
                ? PanelLeft
                : Columns2;
        return (
          <FloatingActionButton
            key={layout.value}
            type="button"
            label={layout.label}
            // className="flex size-7 items-center justify-center rounded-row text-fg-muted hover:bg-surface-hover-bg hover:text-fg focus-visible:ring-2 focus-visible:ring-action"
            onClick={() => changeLayout(layout.widths)}
          >
            <LayoutIcon className="size-4" />
          </FloatingActionButton>
        );
      })}
      <div className="mx-0.5 h-4 w-px bg-divider" />
      <FloatingActionButton label="Delete table" onClick={remove}>
        <Trash2 />
      </FloatingActionButton>
    </PopoverContent>
  );
}

function assignRef<T>(ref: Ref<T> | undefined, value: T | null) {
  if (typeof ref === 'function') {
    ref(value);
  } else if (ref) {
    (ref as MutableRefObject<T | null>).current = value;
  }
}

export function Column(props: PlateElementProps) {
  const readOnly = useReadOnly();
  const width = (props.element as { width?: string }).width;
  const draggable = useDraggable({
    element: props.element,
    orientation: 'horizontal',
    type: 'column',
    canDropNode: ({ dragEntry, dropEntry }) =>
      PathApi.equals(PathApi.parent(dragEntry[1]), PathApi.parent(dropEntry[1])),
  });
  const { dropLine } = useDropLine({ orientation: 'horizontal' });
  // const composedRef = useCallback(
  //   (node: HTMLDivElement | null) => {
  //     assignRef(props.ref, node);
  //     assignRef(nodeRef, node);
  //     assignRef(previewRef, node);
  //   },
  //   [nodeRef, previewRef, props.ref]
  // );

  return (
    <PlateElement
      {...props}
      ref={useComposedRef(props.ref, draggable.previewRef, draggable.nodeRef)}
      className={cn(COLUMN_CLASS, draggable.isDragging && 'opacity-45')}
      style={width ? ({ '--column-width': width } as CSSProperties) : undefined}
    >
      {!readOnly && (
        <button
          ref={draggable.handleRef}
          type="button"
          contentEditable={false}
          data-plate-prevent-deselect
          aria-label="Drag to reorder column"
          title="Drag to reorder column"
          className="absolute bottom-full left-1/2 z-10 flex h-5 -translate-x-1/2 translate-y-1/2 cursor-grab items-center justify-center rounded-md px-1.5 text-fg-muted opacity-0 group-hover/column:opacity-100 hover:bg-surface-hover-bg hover:text-fg active:cursor-grabbing"
        >
          <GripHorizontal className="size-4" />
        </button>
      )}
      {props.children}
      {dropLine && (
        <div
          contentEditable={false}
          className={cn(
            'absolute inset-y-0 z-20 w-0.5 bg-action-accent',
            dropLine === 'left' ? '-left-1' : '-right-1'
          )}
        />
      )}
    </PlateElement>
  );
}
