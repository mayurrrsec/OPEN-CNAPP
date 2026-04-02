import { useMemo, useState } from 'react'
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
  type ColumnDef,
  type OnChangeFn,
  type PaginationState,
  type VisibilityState,
} from '@tanstack/react-table'
import { Columns3 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export type InventoryDataTableProps<TData> = {
  columns: ColumnDef<TData>[]
  data: TData[]
  getRowId: (row: TData, index: number) => string
  columnLabels?: Record<string, string>
  /** Server-side pagination (API returns one page). */
  manualPagination?: boolean
  /** Total rows across all pages (manual mode). */
  rowCount?: number
  /** Page count (manual mode). */
  pageCount?: number
  pagination?: PaginationState
  onPaginationChange?: OnChangeFn<PaginationState>
  /** Uncontrolled pagination (client mode). */
  initialPageSize?: number
  pageSizeOptions?: number[]
  /** Optional controlled pagination when `manualPagination` is false (client-side over full `data`). */
  clientPagination?: PaginationState
  onClientPaginationChange?: OnChangeFn<PaginationState>
  enableRowSelection?: boolean
  emptyMessage?: string
  /** Summary line under toolbar, e.g. server total */
  footerNote?: string
}

export function InventoryDataTable<TData>({
  columns,
  data,
  getRowId,
  columnLabels = {},
  manualPagination = false,
  rowCount = 0,
  pageCount: controlledPageCount,
  pagination: controlledPagination,
  onPaginationChange,
  initialPageSize = 25,
  pageSizeOptions = [10, 25, 50],
  clientPagination,
  onClientPaginationChange,
  enableRowSelection = true,
  emptyMessage = 'No rows.',
  footerNote,
}: InventoryDataTableProps<TData>) {
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = useState({})
  const [uncontrolledPagination, setUncontrolledPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: initialPageSize,
  })

  const clientControlled = !manualPagination && clientPagination != null && onClientPaginationChange != null
  const pagination = manualPagination
    ? (controlledPagination ?? uncontrolledPagination)
    : clientControlled
      ? clientPagination
      : uncontrolledPagination
  const setPagination = manualPagination
    ? (onPaginationChange ?? setUncontrolledPagination)
    : clientControlled
      ? onClientPaginationChange
      : setUncontrolledPagination

  const pageCount = useMemo(() => {
    if (manualPagination) {
      return controlledPageCount ?? Math.max(1, Math.ceil((rowCount || 0) / (pagination.pageSize || 1)))
    }
    return undefined
  }, [manualPagination, controlledPageCount, rowCount, pagination.pageSize])

  const table = useReactTable({
    data,
    columns,
    state: { columnVisibility, rowSelection, pagination },
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    ...(manualPagination ? {} : { getPaginationRowModel: getPaginationRowModel() }),
    manualPagination,
    pageCount: manualPagination ? pageCount : undefined,
    rowCount: manualPagination ? rowCount : undefined,
    enableRowSelection,
    getRowId,
  })

  const pageIndex = table.getState().pagination.pageIndex
  const pageSize = table.getState().pagination.pageSize
  const pc = table.getPageCount()
  const totalForRange = manualPagination ? rowCount : data.length

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-xs text-muted-foreground">
          {Object.keys(rowSelection).length > 0 ? `${Object.keys(rowSelection).length} selected · ` : null}
          {manualPagination
            ? `${rowCount} row${rowCount === 1 ? '' : 's'}`
            : `${data.length} row${data.length === 1 ? '' : 's'}`}
          {footerNote ? ` · ${footerNote}` : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="outline" size="sm" className="h-8 gap-1">
                <Columns3 className="h-3.5 w-3.5" />
                Columns
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel className="text-xs">Toggle columns</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {table.getAllLeafColumns().map((col) => {
                if (!col.getCanHide()) return null
                const id = col.id
                return (
                  <DropdownMenuItem
                    key={id}
                    className="text-xs"
                    onClick={(e) => {
                      e.preventDefault()
                      col.toggleVisibility(!col.getIsVisible())
                    }}
                  >
                    <span className="mr-2">{col.getIsVisible() ? '☑' : '☐'}</span>
                    {columnLabels[id] ?? id}
                  </DropdownMenuItem>
                )
              })}
            </DropdownMenuContent>
          </DropdownMenu>
          <label className="flex items-center gap-1 text-xs text-muted-foreground">
            Rows/page
            <select
              className="h-8 rounded-md border border-input bg-background px-2 text-xs"
              value={pageSize}
              onChange={(e) => table.setPageSize(Number(e.target.value))}
            >
              {pageSizeOptions.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="bg-muted/50 text-left text-xs font-medium text-muted-foreground">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((h) => (
                  <th key={h.id} className="whitespace-nowrap border-b border-border px-3 py-2">
                    {h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-3 py-8 text-center text-muted-foreground">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="border-b border-border/60 hover:bg-muted/40">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-3 py-2 align-middle">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
        <span>
          {totalForRange === 0
            ? '0–0 of 0'
            : `${pageIndex * pageSize + 1}–${Math.min((pageIndex + 1) * pageSize, totalForRange)} of ${totalForRange}`}
        </span>
        <div className="flex flex-wrap items-center gap-2">
          <span>
            Page {pageIndex + 1} of {Math.max(1, pc)}
          </span>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 px-2"
              disabled={!table.getCanPreviousPage()}
              onClick={() => table.setPageIndex(0)}
              aria-label="First page"
            >
              |&lt;
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 px-2"
              disabled={!table.getCanPreviousPage()}
              onClick={() => table.previousPage()}
              aria-label="Previous page"
            >
              &lt;
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 px-2"
              disabled={!table.getCanNextPage()}
              onClick={() => table.nextPage()}
              aria-label="Next page"
            >
              &gt;
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 px-2"
              disabled={!table.getCanNextPage()}
              onClick={() => table.setPageIndex(pc - 1)}
              aria-label="Last page"
            >
              &gt;|
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}
