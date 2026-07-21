import { useDraggable, useDropLine } from '@platejs/dnd';
import { ResizeHandle } from '@platejs/resizable';
import { getTableColumnCount } from '@platejs/table';
import {
  TablePlugin,
  TableProvider,
  useCellIndices,
  useTableCellElement,
  useTableCellElementResizable,
  useTableColSizes,
  useTableElement,
  useTableMergeState,
  useTableSelectionDom,
} from '@platejs/table/react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Combine,
  GripVertical,
  Trash2,
  Ungroup,
  X,
} from 'lucide-react';
import { PathApi, type TElement, type TTableCellElement, type TTableElement } from 'platejs';
import {
  PlateElement,
  type PlateElementProps,
  useComposedRef,
  useEditorPlugin,
  useEditorRef,
  useEditorSelector,
  useFocusedLast,
  useReadOnly,
  useSelected,
} from 'platejs/react';
import { createContext, useContext, useMemo, useRef } from 'react';
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui';
import { cn } from '@/lib/cn';
import { TABLE_CLASS, TABLE_WRAP_CLASS, TD_CLASS, TH_CLASS } from './nodeStyles';

const DEFAULT_COLUMN_WIDTH = 120;
const DEFAULT_ROW_HEIGHT = 48;
type RowDragHandleContextValue = {
  handleRef: ReturnType<typeof useDraggable>['handleRef'];
  selectRow: () => void;
};
const RowDragHandleContext = createContext<RowDragHandleContextValue | null>(null);

export function TableElement(props: PlateElementProps) {
  return (
    <TableProvider>
      <TableElementContent {...props} />
    </TableProvider>
  );
}

function TableElementContent({ children, ...props }: PlateElementProps) {
  const readOnly = useReadOnly();
  const tableRef = useRef<HTMLTableElement>(null);
  const { marginLeft, props: tableProps } = useTableElement();
  const colSizes = useTableColSizes();
  const resolvedColSizes = useMemo(() => {
    const columnCount = getTableColumnCount(props.element as TTableElement);
    return Array.from(
      { length: columnCount },
      (_, index) => colSizes[index] || DEFAULT_COLUMN_WIDTH
    );
  }, [colSizes, props.element]);
  const tableWidth = resolvedColSizes.reduce((total, width) => total + width, 0);

  useTableSelectionDom(tableRef);

  const content = (
    <PlateElement
      {...props}
      as="div"
      className={TABLE_WRAP_CLASS}
      style={{
        ...props.style,
        paddingLeft: marginLeft,
      }}
    >
      <table
        {...tableProps}
        ref={tableRef}
        className={cn(
          TABLE_CLASS,
          'table-fixed data-[table-selecting=true]:[&_*::selection]:bg-transparent'
        )}
        style={{ width: tableWidth }}
      >
        <colgroup>
          {resolvedColSizes.map((width, index) => (
            <col key={index} style={{ width }} />
          ))}
        </colgroup>
        <tbody>{children}</tbody>
      </table>
    </PlateElement>
  );

  if (readOnly) return content;

  return <TableFloatingToolbar>{content}</TableFloatingToolbar>;
}

function TableFloatingToolbar({ children }: { children: React.ReactElement }) {
  const selected = useSelected();
  const focused = useFocusedLast();
  const collapsedInside = useEditorSelector(
    (editor) => selected && editor.api.isCollapsed(),
    [selected]
  );
  const selectedCellCount = useEditorSelector(
    (editor) => editor.getApi(TablePlugin).table.getSelectedCellIds()?.length ?? 0,
    []
  );
  const open = focused && (collapsedInside || selectedCellCount > 1);

  return (
    <Popover modal={false} open={open}>
      <PopoverAnchor asChild>{children}</PopoverAnchor>
      {open && <TableFloatingToolbarContent multiCell={selectedCellCount > 1} />}
    </Popover>
  );
}

function TableFloatingToolbarContent({ multiCell }: { multiCell: boolean }) {
  const { editor, tf } = useEditorPlugin(TablePlugin);
  const { canMerge, canSplit } = useTableMergeState();
  const action = (run: () => void) => {
    run();
    editor.tf.focus();
  };

  if (multiCell && !canMerge && !canSplit) return null;

  return (
    <PopoverContent
      align="center"
      side="bottom"
      sideOffset={8}
      avoidCollisions={false}
      contentEditable={false}
      onOpenAutoFocus={(event) => event.preventDefault()}
      className="w-auto max-w-[90vw] flex-row gap-0.5 overflow-x-auto rounded-card border border-line bg-surface p-1 shadow-pop"
    >
      {canMerge && (
        <TableActionButton label="Merge cells" onClick={() => action(() => tf.table.merge())}>
          <Combine />
        </TableActionButton>
      )}
      {canSplit && (
        <TableActionButton label="Split cell" onClick={() => action(() => tf.table.split())}>
          <Ungroup />
        </TableActionButton>
      )}

      {!multiCell && (
        <>
          {(canMerge || canSplit) && <TableActionSeparator />}
          <TableActionButton
            label="Insert row before"
            onClick={() => action(() => tf.insert.tableRow({ before: true }))}
          >
            <ArrowUp />
          </TableActionButton>
          <TableActionButton
            label="Insert row after"
            onClick={() => action(() => tf.insert.tableRow())}
          >
            <ArrowDown />
          </TableActionButton>
          <TableActionButton label="Delete row" onClick={() => action(() => tf.remove.tableRow())}>
            <X />
          </TableActionButton>
          <TableActionSeparator />
          <TableActionButton
            label="Insert column before"
            onClick={() => action(() => tf.insert.tableColumn({ before: true }))}
          >
            <ArrowLeft />
          </TableActionButton>
          <TableActionButton
            label="Insert column after"
            onClick={() => action(() => tf.insert.tableColumn())}
          >
            <ArrowRight />
          </TableActionButton>
          <TableActionButton
            label="Delete column"
            onClick={() => action(() => tf.remove.tableColumn())}
          >
            <X />
          </TableActionButton>
          <TableActionSeparator />
          <TableActionButton label="Delete table" onClick={() => action(() => tf.remove.table())}>
            <Trash2 />
          </TableActionButton>
        </>
      )}
    </PopoverContent>
  );
}

function TableActionButton({
  children,
  label,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      data-plate-prevent-deselect
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className="focus-visible:ring-focus flex size-8 shrink-0 items-center justify-center rounded-row text-fg-secondary outline-none hover:bg-surface-hover-bg hover:text-fg focus-visible:ring-2 [&_svg]:size-4"
    >
      {children}
    </button>
  );
}

function TableActionSeparator() {
  return <span className="mx-1 h-5 w-px shrink-0 bg-divider" />;
}

export function TableRowElement({ children, ...props }: PlateElementProps) {
  const editor = useEditorRef();
  const readOnly = useReadOnly();
  const { element } = props;
  const draggable = useDraggable({
    element,
    type: element.type,
    canDropNode: ({ dragEntry, dropEntry }) =>
      PathApi.equals(PathApi.parent(dragEntry[1]), PathApi.parent(dropEntry[1])),
    onDropHandler: (_, { dragItem }) => {
      const draggedElement = (dragItem as { element?: TElement }).element;
      if (draggedElement) editor.tf.select(draggedElement);
    },
  });
  const { dropLine } = useDropLine();

  return (
    <PlateElement
      {...props}
      as="tr"
      ref={useComposedRef(props.ref, draggable.previewRef, draggable.nodeRef)}
      className={cn(
        'group/row',
        draggable.isDragging && 'opacity-45',
        dropLine === 'top' &&
          '[&>td]:border-t-2! [&>td]:border-t-action-accent! [&>th]:border-t-2! [&>th]:border-t-action-accent!',
        dropLine === 'bottom' &&
          '[&>td]:border-b-2! [&>td]:border-b-action-accent! [&>th]:border-b-2! [&>th]:border-b-action-accent!'
      )}
    >
      <RowDragHandleContext.Provider
        value={{
          handleRef: draggable.handleRef,
          selectRow: () => editor.tf.select(element),
        }}
      >
        {children}
      </RowDragHandleContext.Provider>
    </PlateElement>
  );
}

export function TableCellElement({
  isHeader = false,
  ...props
}: PlateElementProps & { isHeader?: boolean }) {
  const { api } = useEditorPlugin(TablePlugin);
  const readOnly = useReadOnly();
  const rowDragHandle = useContext(RowDragHandleContext);
  const element = props.element as TTableCellElement;
  const { col } = useCellIndices();
  const { colIndex, colSpan, minHeight, rowIndex } = useTableCellElement();
  const { rightProps } = useTableCellElementResizable({
    colIndex,
    colSpan,
    rowIndex,
  });
  const rowSpan = api.table.getRowSpan(element);

  return (
    <PlateElement
      {...props}
      as={isHeader ? 'th' : 'td'}
      attributes={{
        ...props.attributes,
        colSpan,
        'data-table-cell-id': element.id,
        rowSpan,
      }}
      className={cn(
        isHeader ? TH_CLASS : TD_CLASS,
        'relative p-0 data-[table-cell-selected=true]:bg-tint-accent-1'
      )}
    >
      {!readOnly && col === 0 && rowDragHandle && (
        <button
          ref={rowDragHandle.handleRef}
          type="button"
          aria-label="Drag table row"
          title="Drag table row"
          data-plate-prevent-deselect
          contentEditable={false}
          onClick={rowDragHandle.selectRow}
          className="focus-visible:ring-focus absolute top-1/2 left-0 z-40 flex size-5 -translate-y-1/2 cursor-grab items-center justify-center rounded-row border border-line bg-surface text-fg-muted opacity-0 shadow-sm transition-opacity outline-none group-hover/row:opacity-100 hover:bg-surface-hover-bg hover:text-fg focus-visible:opacity-100 focus-visible:ring-2 active:cursor-grabbing"
        >
          <GripVertical className="size-3.5" />
        </button>
      )}
      <div
        className="box-border min-h-12 px-3 py-2"
        style={{ minHeight: Math.max(DEFAULT_ROW_HEIGHT, minHeight ?? 0) }}
      >
        {props.children}
      </div>
      {!readOnly && (
        <ResizeHandle
          {...rightProps}
          contentEditable={false}
          className="group/column-resize absolute -top-px -right-1 z-30 h-[calc(100%+2px)] w-2 cursor-col-resize touch-none select-none after:absolute after:inset-y-0 after:left-1/2 after:w-0.5 after:-translate-x-1/2 after:bg-action-accent after:opacity-0 after:transition-opacity hover:after:opacity-100"
        />
      )}
    </PlateElement>
  );
}

export function TableCellHeaderElement(props: PlateElementProps) {
  return <TableCellElement {...props} isHeader />;
}
