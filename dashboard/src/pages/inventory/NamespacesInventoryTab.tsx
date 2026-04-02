import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { ColumnDef, PaginationState } from '@tanstack/react-table'
import { FolderTree, Search } from 'lucide-react'
import { api } from '@/api/client'
import { InventoryDataTable } from '@/components/inventory/InventoryDataTable'
import { EmptyState } from '@/components/ui/EmptyState'
import { Input } from '@/components/ui/input'
import type { ClusterInventoryRow } from '@/pages/inventory/ClusterTable'

type NsRow = {
  namespace: string
  cluster_id: string
  cluster_name: string
  findings: number
  last_seen: string | null
}

const COLUMN_LABELS: Record<string, string> = {
  select: 'Select',
  namespace: 'Namespace',
  cluster: 'Cluster',
  findings: 'Findings',
  last_seen: 'Last activity',
}

function fmtDt(iso: string | null) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return iso
  }
}

export function NamespacesInventoryTab() {
  const [clusterId, setClusterId] = useState<string>('')
  const [search, setSearch] = useState('')
  const [debounced, setDebounced] = useState('')
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 25 })

  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(search.trim()), 300)
    return () => window.clearTimeout(t)
  }, [search])

  const clustersQ = useQuery({
    queryKey: ['inventory', 'clusters'],
    queryFn: () => api.get<{ items: ClusterInventoryRow[] }>('/inventory/clusters').then((r) => r.data),
  })

  useEffect(() => {
    const items = clustersQ.data?.items
    if (items?.length && !clusterId) {
      setClusterId(items[0].id)
    }
  }, [clustersQ.data?.items, clusterId])

  useEffect(() => {
    setPagination((p) => ({ ...p, pageIndex: 0 }))
  }, [clusterId, debounced])

  const page = pagination.pageIndex + 1
  const limit = pagination.pageSize

  const nsQ = useQuery({
    queryKey: ['inventory', 'namespaces', clusterId, debounced, page, limit],
    queryFn: () =>
      api
        .get<{ total: number; page: number; items: NsRow[] }>('/inventory/namespaces', {
          params: { cluster_id: clusterId, search: debounced, page, limit },
        })
        .then((r) => r.data),
    enabled: !!clusterId,
  })

  const rows = clustersQ.data?.items ?? []
  const items = nsQ.data?.items ?? []
  const total = nsQ.data?.total ?? 0
  const pageCount = Math.max(1, Math.ceil(total / limit) || 1)

  const columns = useMemo<ColumnDef<NsRow>[]>(
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
        id: 'namespace',
        accessorKey: 'namespace',
        header: 'Namespace',
        cell: ({ row }) => <span className="font-medium">{row.original.namespace}</span>,
      },
      {
        id: 'cluster',
        accessorKey: 'cluster_name',
        header: 'Cluster',
        cell: ({ row }) => <span className="text-muted-foreground">{row.original.cluster_name}</span>,
      },
      {
        id: 'findings',
        accessorKey: 'findings',
        header: 'Findings',
        cell: ({ row }) => <span className="tabular-nums">{row.original.findings}</span>,
      },
      {
        id: 'last_seen',
        accessorKey: 'last_seen',
        header: 'Last activity',
        cell: ({ row }) => <span className="text-xs text-muted-foreground">{fmtDt(row.original.last_seen)}</span>,
      },
    ],
    []
  )

  if (clustersQ.isLoading) {
    return <p className="text-sm text-muted-foreground">Loading clusters…</p>
  }
  if (!rows.length) {
    return (
      <EmptyState
        icon={FolderTree}
        title="No clusters"
        description="Onboard a cluster first to list namespaces derived from findings."
        action={{ label: 'Onboard cluster', onClick: () => (window.location.href = '/connectors?addCluster=1') }}
      />
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Namespaces</h2>
        <p className="text-sm text-muted-foreground">
          Distinct namespaces from findings for the selected cluster (no separate agent sync required).
        </p>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <label className="text-sm text-muted-foreground">
          Cluster{' '}
          <select
            className="ml-2 h-9 rounded-md border border-input bg-background px-2 text-sm"
            value={clusterId}
            onChange={(e) => setClusterId(e.target.value)}
          >
            {rows.map((c) => (
              <option key={c.id} value={c.id}>
                {c.display_name}
              </option>
            ))}
          </select>
        </label>
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder="Search namespace…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {nsQ.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading namespaces…</p>
      ) : nsQ.isError ? (
        <p className="text-sm text-destructive">Failed to load namespaces.</p>
      ) : (
        <InventoryDataTable<NsRow>
          columns={columns}
          data={items}
          getRowId={(row) => `${row.cluster_id}::${row.namespace}`}
          columnLabels={COLUMN_LABELS}
          manualPagination
          rowCount={total}
          pageCount={pageCount}
          pagination={pagination}
          onPaginationChange={setPagination}
          initialPageSize={25}
          emptyMessage="No namespace-tagged findings yet for this cluster."
        />
      )}
    </div>
  )
}
