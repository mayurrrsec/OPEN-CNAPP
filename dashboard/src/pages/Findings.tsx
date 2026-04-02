import { useCallback, useMemo, useState } from 'react'
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type PaginationState,
  type SortingState,
} from '@tanstack/react-table'
import { useQuery } from '@tanstack/react-query'
import { RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { SeverityBadge } from '@/components/ui/SeverityBadge'
import { FindingDetailSheet } from '@/components/findings/FindingDetailSheet'
import { fetchFindingById, fetchFindingsList, type FindingRow } from '@/api/findings'
import { cn } from '@/lib/utils'

const PAGE_SIZE = 25

const SORT_FIELDS = new Set(['created_at', 'severity', 'domain', 'tool', 'status', 'cloud_provider'])

export default function Findings() {
  const [severity, setSeverity] = useState('')
  const [domain, setDomain] = useState('')
  const [cloud, setCloud] = useState('')
  const [status, setStatus] = useState('')
  const [tool, setTool] = useState('')
  const [q, setQ] = useState('')

  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: PAGE_SIZE })
  const [sorting, setSorting] = useState<SortingState>([{ id: 'created_at', desc: true }])

  const [sheetOpen, setSheetOpen] = useState(false)
  const [detail, setDetail] = useState<FindingRow | null>(null)

  const sortField = sorting[0]?.id ?? 'created_at'
  const sortOrder = sorting[0]?.desc ? 'desc' : 'asc'
  const apiSort = SORT_FIELDS.has(sortField) ? sortField : 'created_at'

  const queryParams = useMemo(
    () => ({
      severity: severity || undefined,
      domain: domain || undefined,
      cloud_provider: cloud || undefined,
      status: status || undefined,
      tool: tool || undefined,
      q: q || undefined,
      limit: pagination.pageSize,
      offset: pagination.pageIndex * pagination.pageSize,
      sort: apiSort,
      order: sortOrder as 'asc' | 'desc',
    }),
    [
      severity,
      domain,
      cloud,
      status,
      tool,
      q,
      pagination.pageIndex,
      pagination.pageSize,
      apiSort,
      sortOrder,
    ]
  )

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['findings', queryParams],
    queryFn: () => fetchFindingsList(queryParams),
  })

  const items = data?.items ?? []
  const total = data?.total ?? 0
  const pageCount = Math.max(1, Math.ceil(total / pagination.pageSize))

  const openDetail = useCallback(async (id: string) => {
    try {
      const row = await fetchFindingById(id)
      setDetail(row)
      setSheetOpen(true)
    } catch {
      setDetail(null)
    }
  }, [])

  const columns = useMemo<ColumnDef<FindingRow>[]>(
    () => [
      {
        accessorKey: 'severity',
        header: 'Severity',
        enableSorting: true,
        cell: ({ row }) => <SeverityBadge severity={row.original.severity} />,
      },
      {
        accessorKey: 'domain',
        header: 'Domain',
        enableSorting: true,
      },
      {
        accessorKey: 'tool',
        header: 'Tool',
        enableSorting: true,
      },
      {
        accessorKey: 'cloud_provider',
        header: 'Cloud',
        enableSorting: true,
        cell: ({ getValue }) => (getValue() as string | null | undefined) ?? '—',
      },
      {
        accessorKey: 'status',
        header: 'Status',
        enableSorting: true,
      },
      {
        accessorKey: 'title',
        header: 'Title',
        enableSorting: false,
        cell: ({ getValue }) => (
          <span className="line-clamp-2 max-w-md">{String(getValue() ?? '')}</span>
        ),
      },
      {
        accessorKey: 'created_at',
        header: 'Created',
        enableSorting: true,
        cell: ({ getValue }) => {
          const v = getValue() as string | undefined
          if (!v) return '—'
          try {
            return new Date(v).toLocaleString()
          } catch {
            return v
          }
        },
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <Button type="button" variant="outline" size="sm" onClick={() => void openDetail(row.original.id)}>
            View
          </Button>
        ),
      },
    ],
    [openDetail]
  )

  const table = useReactTable({
    data: items,
    columns,
    pageCount,
    state: { pagination, sorting },
    manualPagination: true,
    manualSorting: true,
    onPaginationChange: setPagination,
    onSortingChange: (updater) => {
      setSorting(updater)
      setPagination((p) => ({ ...p, pageIndex: 0 }))
    },
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Findings Explorer</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Filter, triage, assign, and track findings to closure.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center rounded-full border border-border bg-muted/40 px-3 py-1 text-xs text-muted-foreground">
            Total: <strong className="ml-1 text-foreground">{total}</strong>
          </span>
          <Button type="button" variant="outline" size="sm" onClick={() => void refetch()} disabled={isFetching}>
            <RefreshCw className={cn('mr-1 h-4 w-4', isFetching && 'animate-spin')} />
            Refresh
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-4 pt-6">
          <div className="flex flex-wrap items-end gap-2">
            <select
              value={severity}
              onChange={(e) => {
                setPagination((p) => ({ ...p, pageIndex: 0 }))
                setSeverity(e.target.value)
              }}
              className="h-9 rounded-md border border-input bg-background px-2 text-sm"
            >
              <option value="">Severity: All</option>
              <option value="CRITICAL">CRITICAL</option>
              <option value="HIGH">HIGH</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="LOW">LOW</option>
              <option value="INFO">INFO</option>
            </select>
            <Input
              value={domain}
              onChange={(e) => {
                setPagination((p) => ({ ...p, pageIndex: 0 }))
                setDomain(e.target.value)
              }}
              placeholder="Domain (cspm, kspm…)"
              className="h-9 max-w-[160px]"
            />
            <Input
              value={tool}
              onChange={(e) => {
                setPagination((p) => ({ ...p, pageIndex: 0 }))
                setTool(e.target.value)
              }}
              placeholder="Tool"
              className="h-9 max-w-[140px]"
            />
            <Input
              value={cloud}
              onChange={(e) => {
                setPagination((p) => ({ ...p, pageIndex: 0 }))
                setCloud(e.target.value)
              }}
              placeholder="Cloud"
              className="h-9 max-w-[120px]"
            />
            <select
              value={status}
              onChange={(e) => {
                setPagination((p) => ({ ...p, pageIndex: 0 }))
                setStatus(e.target.value)
              }}
              className="h-9 rounded-md border border-input bg-background px-2 text-sm"
            >
              <option value="">Status: All</option>
              <option value="open">open</option>
              <option value="assigned">assigned</option>
              <option value="accepted_risk">accepted_risk</option>
              <option value="false_positive">false_positive</option>
              <option value="fixed">fixed</option>
              <option value="reopened">reopened</option>
            </select>
            <Input
              value={q}
              onChange={(e) => {
                setPagination((p) => ({ ...p, pageIndex: 0 }))
                setQ(e.target.value)
              }}
              placeholder="Search title / resource / check…"
              className="h-9 min-w-[200px] flex-1"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                {table.getHeaderGroups().map((hg) => (
                  <tr key={hg.id} className="border-b border-border">
                    {hg.headers.map((header) => (
                      <th
                        key={header.id}
                        className="whitespace-nowrap px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                      >
                        {header.isPlaceholder ? null : header.column.getCanSort() ? (
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 hover:text-foreground"
                            onClick={header.column.getToggleSortingHandler()}
                          >
                            {flexRender(header.column.columnDef.header, header.getContext())}
                            {{
                              asc: ' ↑',
                              desc: ' ↓',
                            }[header.column.getIsSorted() as string] ?? ''}
                          </button>
                        ) : (
                          flexRender(header.column.columnDef.header, header.getContext())
                        )}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={columns.length} className="px-3 py-8 text-center text-muted-foreground">
                      Loading…
                    </td>
                  </tr>
                ) : table.getRowModel().rows.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length} className="px-3 py-8 text-center text-muted-foreground">
                      No results. Try widening filters or ingest findings.
                    </td>
                  </tr>
                ) : (
                  table.getRowModel().rows.map((row) => (
                    <tr key={row.id} className="border-b border-border/70 hover:bg-muted/40">
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

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-3 py-3">
            <p className="text-xs text-muted-foreground">
              Page <strong>{pagination.pageIndex + 1}</strong> of <strong>{pageCount}</strong>
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={pagination.pageIndex <= 0}
                onClick={() => setPagination((p) => ({ ...p, pageIndex: Math.max(0, p.pageIndex - 1) }))}
              >
                Prev
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={pagination.pageIndex + 1 >= pageCount}
                onClick={() => setPagination((p) => ({ ...p, pageIndex: p.pageIndex + 1 }))}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <FindingDetailSheet
        finding={detail}
        open={sheetOpen}
        onOpenChange={(o) => {
          setSheetOpen(o)
          if (!o) setDetail(null)
        }}
        onSaved={() => void refetch()}
      />
    </div>
  )
}
