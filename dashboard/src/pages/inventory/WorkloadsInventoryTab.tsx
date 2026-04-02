import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { ColumnDef, PaginationState } from '@tanstack/react-table'
import { GitBranch, Search } from 'lucide-react'
import { api } from '@/api/client'
import { InventoryDataTable } from '@/components/inventory/InventoryDataTable'
import { EmptyState } from '@/components/ui/EmptyState'
import { Input } from '@/components/ui/input'
import type { ClusterInventoryRow } from '@/pages/inventory/ClusterTable'

type WlRow = {
  name: string
  kind: string
  namespace: string
  cluster_id: string
  cluster_name: string
  findings: number
  last_seen: string | null
}

const COLUMN_LABELS: Record<string, string> = {
  select: 'Select',
  name: 'Name',
  kind: 'Kind',
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

export function WorkloadsInventoryTab() {
  const [clusterId, setClusterId] = useState<string>('')
  const [namespace, setNamespace] = useState('')
  const [kind, setKind] = useState('all')
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
  }, [clusterId, namespace, kind, debounced])

  const page = pagination.pageIndex + 1
  const limit = pagination.pageSize

  const wlQ = useQuery({
    queryKey: ['inventory', 'workloads', clusterId, namespace, kind, debounced, page, limit],
    queryFn: () =>
      api
        .get<{ total: number; page: number; items: WlRow[] }>('/inventory/workloads', {
          params: {
            cluster_id: clusterId,
            namespace: namespace.trim() || undefined,
            kind: kind === 'all' ? undefined : kind,
            search: debounced,
            page,
            limit,
          },
        })
        .then((r) => r.data),
    enabled: !!clusterId,
  })

  const rows = clustersQ.data?.items ?? []
  const items = wlQ.data?.items ?? []
  const total = wlQ.data?.total ?? 0
  const pageCount = Math.max(1, Math.ceil(total / limit) || 1)

  const columns = useMemo<ColumnDef<WlRow>[]>(
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
        accessorKey: 'name',
        header: 'Name',
        cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
      },
      { id: 'kind', accessorKey: 'kind', header: 'Kind' },
      { id: 'namespace', accessorKey: 'namespace', header: 'Namespace' },
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
        icon={GitBranch}
        title="No clusters"
        description="Onboard a cluster to list workloads inferred from findings."
        action={{ label: 'Onboard cluster', onClick: () => (window.location.href = '/connectors?addCluster=1') }}
      />
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Workloads</h2>
        <p className="text-sm text-muted-foreground">Grouped workload-like resources from findings (kind, name, namespace).</p>
      </div>
      <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end">
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
        <Input
          className="max-w-[180px]"
          placeholder="Namespace filter"
          value={namespace}
          onChange={(e) => setNamespace(e.target.value)}
        />
        <select
          className="h-9 rounded-md border border-input bg-background px-2 text-sm"
          value={kind}
          onChange={(e) => setKind(e.target.value)}
          aria-label="Kind"
        >
          <option value="all">All kinds</option>
          <option value="pod">Pod</option>
          <option value="deployment">Deployment</option>
          <option value="daemonset">DaemonSet</option>
          <option value="statefulset">StatefulSet</option>
          <option value="job">Job</option>
          <option value="cronjob">CronJob</option>
        </select>
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder="Search name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {wlQ.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading workloads…</p>
      ) : wlQ.isError ? (
        <p className="text-sm text-destructive">Failed to load workloads.</p>
      ) : (
        <InventoryDataTable<WlRow>
          columns={columns}
          data={items}
          getRowId={(row, i) => `${row.cluster_id}::${row.namespace}::${row.name}::${row.kind}::${i}`}
          columnLabels={COLUMN_LABELS}
          manualPagination
          rowCount={total}
          pageCount={pageCount}
          pagination={pagination}
          onPaginationChange={setPagination}
          initialPageSize={25}
          emptyMessage="No workload-like findings for this filter."
        />
      )}
    </div>
  )
}
