import { Fragment, useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { ColumnDef, PaginationState } from '@tanstack/react-table'
import { ChevronDown, ChevronRight, Columns3, Download, RefreshCw, Search } from 'lucide-react'
import { api } from '@/api/client'
import { Button } from '@/components/ui/button'
import { InventoryDataTable } from '@/components/inventory/InventoryDataTable'
import { Input } from '@/components/ui/input'
import { EmptyState } from '@/components/ui/EmptyState'
import { SeverityBars, type SeverityBreakdown } from '@/components/inventory/SeverityBars'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

type FlatAsset = {
  cloud_provider: string | null
  account_id: string | null
  resource_type: string | null
  resource_id: string | null
  resource_name: string | null
  finding_count: number
  max_severity: string | null
  category: string
}

type Group = {
  key: string
  label: string
  asset_count: number
  total_findings: number
  severity_breakdown: SeverityBreakdown
  assets: Omit<FlatAsset, 'category'>[]
}

type GroupedResponse = {
  group_by: string
  total_groups: number
  total_assets: number
  groups: Group[]
}

type FlatResponse = {
  total_rows: number
  assets: FlatAsset[]
}

const FLAT_LABELS: Record<string, string> = {
  select: 'Select',
  name: 'Name / ID',
  type: 'Type',
  category: 'Category',
  cloud: 'Cloud',
  account: 'Account',
  findings: 'Findings',
}

function escapeCsvCell(value: string | number | null | undefined): string {
  const s = value === null || value === undefined ? '' : String(value)
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

/** UTF-8 BOM helps Excel open Unicode CSV reliably on Windows. */
function downloadCsv(filename: string, headers: string[], rows: (string | number | null | undefined)[][]) {
  const lines = [
    headers.map(escapeCsvCell).join(','),
    ...rows.map((r) => r.map(escapeCsvCell).join(',')),
  ]
  const blob = new Blob([`\uFEFF${lines.join('\n')}`], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function flatRowId(a: FlatAsset, i: number) {
  return [
    a.resource_id ?? '',
    a.account_id ?? '',
    a.resource_type ?? '',
    a.resource_name ?? '',
    a.category,
    a.cloud_provider ?? '',
    String(i),
  ].join('|')
}

export function CloudAssetsInventoryTab() {
  const [search, setSearch] = useState('')
  const [debounced, setDebounced] = useState('')
  const [cloudProvider, setCloudProvider] = useState<string>('all')
  const [groupByCategory, setGroupByCategory] = useState(true)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [flatPagination, setFlatPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 25 })
  const [groupPagination, setGroupPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 25 })
  const [groupColVis, setGroupColVis] = useState({ category: true, findings: true, count: true })

  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(search.trim()), 300)
    return () => window.clearTimeout(t)
  }, [search])

  useEffect(() => {
    setFlatPagination((p) => ({ ...p, pageIndex: 0 }))
    setGroupPagination((p) => ({ ...p, pageIndex: 0 }))
  }, [debounced, cloudProvider, groupByCategory])

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['inventory', 'assets', groupByCategory, cloudProvider],
    queryFn: async () => {
      const params: Record<string, string | number> = { limit: 2000 }
      if (groupByCategory) params.group_by = 'category'
      if (cloudProvider !== 'all') params.cloud_provider = cloudProvider
      const r = await api.get<GroupedResponse | FlatResponse>('/inventory/assets', { params })
      return r.data
    },
  })

  const filteredGroups = useMemo(() => {
    if (!data || !('groups' in data)) return []
    const q = debounced.toLowerCase()
    if (!q) return data.groups
    return data.groups.filter(
      (g) =>
        g.label.toLowerCase().includes(q) ||
        g.assets.some(
          (a) =>
            (a.resource_name || '').toLowerCase().includes(q) ||
            (a.resource_id || '').toLowerCase().includes(q)
        )
    )
  }, [data, debounced])

  const filteredFlat = useMemo(() => {
    if (!data || !('assets' in data)) return []
    const q = debounced.toLowerCase()
    if (!q) return data.assets
    return data.assets.filter(
      (a) =>
        (a.resource_name || '').toLowerCase().includes(q) ||
        (a.resource_id || '').toLowerCase().includes(q) ||
        (a.resource_type || '').toLowerCase().includes(q)
    )
  }, [data, debounced])

  const flatColumns = useMemo<ColumnDef<FlatAsset>[]>(
    () => [
      {
        id: 'select',
        header: ({ table }) => (
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-border"
            aria-label="Select all"
            checked={table.getIsAllPageRowsSelected()}
            ref={(el) => {
              if (el) el.indeterminate = table.getIsSomePageRowsSelected()
            }}
            onChange={table.getToggleAllPageRowsSelectedHandler()}
            onClick={(e) => e.stopPropagation()}
          />
        ),
        cell: ({ row }) => (
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-border"
            aria-label="Select row"
            checked={row.getIsSelected()}
            onChange={row.getToggleSelectedHandler()}
            onClick={(e) => e.stopPropagation()}
          />
        ),
        enableSorting: false,
        enableHiding: false,
        size: 36,
      },
      {
        id: 'name',
        header: 'Name / ID',
        cell: ({ row }) => (
          <div>
            <div className="font-medium">{row.original.resource_name || '—'}</div>
            <div className="text-xs text-muted-foreground">{row.original.resource_id || '—'}</div>
          </div>
        ),
      },
      { id: 'type', accessorKey: 'resource_type', header: 'Type' },
      { id: 'category', accessorKey: 'category', header: 'Category', cell: ({ row }) => <span className="capitalize">{row.original.category}</span> },
      { id: 'cloud', accessorKey: 'cloud_provider', header: 'Cloud' },
      { id: 'account', accessorKey: 'account_id', header: 'Account', cell: ({ row }) => <span className="text-xs">{row.original.account_id || '—'}</span> },
      {
        id: 'findings',
        accessorKey: 'finding_count',
        header: 'Findings',
        cell: ({ row }) => <span className="tabular-nums">{row.original.finding_count}</span>,
      },
    ],
    []
  )

  const groupPageCount = Math.max(1, Math.ceil(filteredGroups.length / groupPagination.pageSize) || 1)
  const groupSlice = useMemo(() => {
    const start = groupPagination.pageIndex * groupPagination.pageSize
    return filteredGroups.slice(start, start + groupPagination.pageSize)
  }, [filteredGroups, groupPagination.pageIndex, groupPagination.pageSize])

  const groupVisibleCols =
    Number(groupColVis.category) + Number(groupColVis.findings) + Number(groupColVis.count)

  const clearFilters = () => {
    setSearch('')
    setDebounced('')
    setCloudProvider('all')
    setGroupByCategory(true)
    setExpanded({})
    setFlatPagination({ pageIndex: 0, pageSize: 25 })
    setGroupPagination({ pageIndex: 0, pageSize: 25 })
  }

  const exportCsvSnapshot = () => {
    if (!data) return
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')
    const grouped = groupByCategory && 'groups' in data
    if (grouped) {
      const rows: (string | number | null | undefined)[][] = []
      for (const g of filteredGroups) {
        for (const a of g.assets) {
          rows.push([
            g.label,
            a.resource_name ?? '',
            a.resource_id ?? '',
            a.resource_type ?? '',
            a.cloud_provider ?? '',
            a.account_id ?? '',
            a.finding_count,
          ])
        }
      }
      downloadCsv(`opencnapp-cloud-assets-grouped-${stamp}.csv`, ['Category', 'Name', 'Resource ID', 'Type', 'Cloud', 'Account', 'Findings'], rows)
      return
    }
    const rows = filteredFlat.map((a) => [
      a.resource_name ?? '',
      a.resource_id ?? '',
      a.resource_type ?? '',
      a.category,
      a.cloud_provider ?? '',
      a.account_id ?? '',
      a.finding_count,
    ])
    downloadCsv(`opencnapp-cloud-assets-${stamp}.csv`, ['Name', 'Resource ID', 'Type', 'Category', 'Cloud', 'Account', 'Findings'], rows)
  }

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading cloud assets…</p>
  }
  if (isError) {
    return (
      <EmptyState
        icon={RefreshCw}
        title="Could not load assets"
        description="Check the API and try again."
        action={{ label: 'Retry', onClick: () => void refetch() }}
      />
    )
  }
  if (!data) return null

  const showGrouped = groupByCategory && 'groups' in data

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Cloud assets</h2>
        <p className="text-sm text-muted-foreground">
          Aggregated from CSPM findings (unique resource per row). Use filters to narrow; expand a category to see
          assets.
        </p>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder="Search name, id, type…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            className="h-9 rounded-md border border-input bg-background px-2 text-sm"
            value={cloudProvider}
            onChange={(e) => setCloudProvider(e.target.value)}
            aria-label="Cloud provider"
          >
            <option value="all">All providers</option>
            <option value="aws">AWS</option>
            <option value="azure">Azure</option>
            <option value="gcp">GCP</option>
          </select>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={groupByCategory}
              onChange={(e) => setGroupByCategory(e.target.checked)}
              className="h-4 w-4 rounded border-border"
            />
            Group by category
          </label>
          <Button type="button" variant="outline" size="sm" onClick={clearFilters}>
            Clear filters
          </Button>
          <Button type="button" variant="outline" size="sm" disabled={isFetching} onClick={() => void refetch()}>
            <RefreshCw className={cn('mr-1 h-4 w-4', isFetching && 'animate-spin')} />
            Refresh
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => exportCsvSnapshot()} title="Export current filtered view">
            <Download className="mr-1 h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {showGrouped && 'total_assets' in data ? (
        <p className="text-xs text-muted-foreground">
          {data.total_assets} asset{data.total_assets === 1 ? '' : 's'} across {data.total_groups}{' '}
          {data.total_groups === 1 ? 'category' : 'categories'}
        </p>
      ) : null}

      {showGrouped ? (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-xs text-muted-foreground">
              {filteredGroups.length} categor{filteredGroups.length === 1 ? 'y' : 'ies'} (after search)
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
                  {(
                    [
                      ['category', 'Category'],
                      ['findings', 'Findings'],
                      ['count', 'Assets'],
                    ] as const
                  ).map(([k, label]) => (
                    <DropdownMenuItem
                      key={k}
                      className="text-xs"
                      onClick={(e) => {
                        e.preventDefault()
                        setGroupColVis((v) => ({ ...v, [k]: !v[k] }))
                      }}
                    >
                      <span className="mr-2">{groupColVis[k] ? '☑' : '☐'}</span>
                      {label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <label className="flex items-center gap-1 text-xs text-muted-foreground">
                Rows/page
                <select
                  className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                  value={groupPagination.pageSize}
                  onChange={(e) =>
                    setGroupPagination({ pageIndex: 0, pageSize: Number(e.target.value) })
                  }
                >
                  {[10, 25, 50].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <div className="overflow-x-auto rounded-md border">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
                <tr>
                  <th className="w-8 p-2" />
                  {groupColVis.category ? <th className="p-2">Category</th> : null}
                  {groupColVis.findings ? <th className="p-2">Findings</th> : null}
                  {groupColVis.count ? <th className="p-2">Assets</th> : null}
                </tr>
              </thead>
              <tbody>
                {filteredGroups.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-6 text-center text-muted-foreground">
                      No assets match your filters.
                    </td>
                  </tr>
                ) : (
                  groupSlice.map((g) => {
                    const open = expanded[g.key] ?? false
                    return (
                      <Fragment key={g.key}>
                        <tr className="border-t border-border bg-muted/10">
                          <td className="p-2">
                            <button
                              type="button"
                              className="rounded p-0.5 hover:bg-muted"
                              aria-expanded={open}
                              onClick={() => setExpanded((s) => ({ ...s, [g.key]: !open }))}
                            >
                              {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            </button>
                          </td>
                          {groupColVis.category ? <td className="p-2 font-medium capitalize">{g.label}</td> : null}
                          {groupColVis.findings ? (
                            <td className="p-2">
                              <div className="max-w-[200px]">
                                <SeverityBars breakdown={g.severity_breakdown} />
                              </div>
                            </td>
                          ) : null}
                          {groupColVis.count ? <td className="p-2 tabular-nums">{g.asset_count}</td> : null}
                        </tr>
                        {open
                          ? g.assets.map((a, i) => (
                              <tr key={`${g.key}-${i}`} className="border-t border-border/60 bg-card">
                                <td />
                                <td className="p-2 pl-8" colSpan={Math.max(1, groupVisibleCols)}>
                                  <div className="font-medium">{a.resource_name || a.resource_id || '—'}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {a.resource_type || '—'} · {a.cloud_provider || '—'} · {a.account_id || '—'}
                                  </div>
                                  <div className="mt-1 text-xs tabular-nums text-muted-foreground">
                                    Findings: {a.finding_count}
                                  </div>
                                </td>
                              </tr>
                            ))
                          : null}
                      </Fragment>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
            <span>
              {filteredGroups.length === 0
                ? '0–0 of 0'
                : `${groupPagination.pageIndex * groupPagination.pageSize + 1}–${Math.min(
                    (groupPagination.pageIndex + 1) * groupPagination.pageSize,
                    filteredGroups.length
                  )} of ${filteredGroups.length}`}
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <span>
                Page {groupPagination.pageIndex + 1} of {groupPageCount}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 px-2"
                  disabled={groupPagination.pageIndex <= 0}
                  onClick={() => setGroupPagination((p) => ({ ...p, pageIndex: 0 }))}
                >
                  |&lt;
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 px-2"
                  disabled={groupPagination.pageIndex <= 0}
                  onClick={() => setGroupPagination((p) => ({ ...p, pageIndex: p.pageIndex - 1 }))}
                >
                  &lt;
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 px-2"
                  disabled={groupPagination.pageIndex >= groupPageCount - 1}
                  onClick={() => setGroupPagination((p) => ({ ...p, pageIndex: p.pageIndex + 1 }))}
                >
                  &gt;
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 px-2"
                  disabled={groupPagination.pageIndex >= groupPageCount - 1}
                  onClick={() => setGroupPagination((p) => ({ ...p, pageIndex: groupPageCount - 1 }))}
                >
                  &gt;|
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <InventoryDataTable<FlatAsset>
          columns={flatColumns}
          data={filteredFlat}
          getRowId={(row, i) => flatRowId(row, i)}
          columnLabels={FLAT_LABELS}
          manualPagination={false}
          clientPagination={flatPagination}
          onClientPaginationChange={setFlatPagination}
          initialPageSize={25}
          emptyMessage="No assets found."
        />
      )}
    </div>
  )
}
