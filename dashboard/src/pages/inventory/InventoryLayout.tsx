import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { UseQueryResult } from '@tanstack/react-query'
import axios from 'axios'
import { CheckSquare, Database, RefreshCw } from 'lucide-react'
import { Link, Navigate, Outlet, useLocation, useOutletContext } from 'react-router-dom'
import { api } from '@/api/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/EmptyState'
import { ClusterDetailPanel } from '@/pages/inventory/ClusterDetailPanel'
import { ClusterTable, type ClusterInventoryRow } from '@/pages/inventory/ClusterTable'

type ClustersResponse = {
  items: ClusterInventoryRow[]
  total: number
}

export type InventoryOutletContext = {
  openCluster: (c: ClusterInventoryRow) => void
  handleDelete: (c: ClusterInventoryRow) => void
  rows: ClusterInventoryRow[]
  clustersQ: UseQueryResult<ClustersResponse, Error>
  deletePending: boolean
}

const SEGMENT_TITLE: Record<string, string> = {
  cloud: 'Cloud assets',
  clouds: 'Cloud accounts',
  clusters: 'Clusters',
  namespaces: 'Namespaces',
  workloads: 'Workloads',
  images: 'Images',
}

function inventorySegment(pathname: string): string | null {
  const m = pathname.match(/^\/inventory\/([^/]+)/)
  return m?.[1] ?? null
}

export function useOutletInventoryContext(): InventoryOutletContext {
  return useOutletContext<InventoryOutletContext>()
}

export function InventoryLayout() {
  const qc = useQueryClient()
  const location = useLocation()
  const [detailCluster, setDetailCluster] = useState<ClusterInventoryRow | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  const clustersQ = useQuery({
    queryKey: ['inventory', 'clusters'],
    queryFn: () => api.get<ClustersResponse>('/inventory/clusters').then((r) => r.data),
  })

  const deleteMut = useMutation({
    mutationFn: async (name: string) => {
      await api.delete(`/connectors/${encodeURIComponent(name)}`)
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['inventory', 'clusters'] })
      void qc.invalidateQueries({ queryKey: ['connectors'] })
    },
  })

  const rows = clustersQ.data?.items ?? []

  const openCluster = (c: ClusterInventoryRow) => {
    setDetailCluster(c)
    setDetailOpen(true)
  }

  const handleDelete = (c: ClusterInventoryRow) => {
    if (!window.confirm(`Delete connector “${c.display_name}” (${c.name})? This cannot be undone.`)) return
    deleteMut.mutate(c.name, {
      onSuccess: () => {
        setDetailOpen(false)
        setDetailCluster(null)
      },
      onError: (e) => {
        const msg = axios.isAxiosError(e) ? String(e.response?.data?.detail || e.message) : String(e)
        window.alert(msg)
      },
    })
  }

  const seg = inventorySegment(location.pathname)
  const pageTitle = (seg && SEGMENT_TITLE[seg]) || 'Inventory'

  const outletCtx: InventoryOutletContext = {
    openCluster,
    handleDelete,
    rows,
    clustersQ,
    deletePending: deleteMut.isPending,
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          <span className="text-foreground/80">Inventory assets</span>
          {seg ? (
            <>
              {' '}
              <span aria-hidden className="text-muted-foreground/60">
                /
              </span>{' '}
              {pageTitle}
            </>
          ) : null}
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">{pageTitle}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Cloud assets, clusters, namespaces, workloads, and images — KSPM-oriented views. Open a cluster row for the
          detail panel.
        </p>
      </div>

      <Outlet context={outletCtx} />

      <Card>
        <CardHeader>
          <CardTitle>Compliance coverage</CardTitle>
          <CardDescription>Placeholder for framework mapping (CIS, PCI, etc.).</CardDescription>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={CheckSquare}
            title="No compliance data"
            description="Run a CSPM scan to map findings to compliance frameworks."
            action={{ label: 'Open plugins', onClick: () => (window.location.href = '/plugins') }}
          />
        </CardContent>
      </Card>

      <ClusterDetailPanel
        cluster={detailCluster}
        open={detailOpen}
        onOpenChange={(o) => {
          setDetailOpen(o)
          if (!o) setDetailCluster(null)
        }}
      />
    </div>
  )
}

export function ClustersInventoryPage() {
  const { openCluster, handleDelete, rows, clustersQ } = useOutletInventoryContext()
  const qc = useQueryClient()
  const syncMut = useMutation({
    mutationFn: () =>
      api.post<{ synced_connectors: number; nodes_written: number }>('/inventory/sync-k8s-tables'),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['inventory', 'clusters'] })
      void qc.invalidateQueries({ queryKey: ['inventory', 'namespaces'] })
      void qc.invalidateQueries({ queryKey: ['inventory', 'workloads'] })
    },
  })

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Kubernetes and on-premises connectors.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={clustersQ.isFetching}
            onClick={() => void clustersQ.refetch()}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${clustersQ.isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={syncMut.isPending}
            title="Materialize k8s_clusters and k8s_nodes from findings (optional DB cache)"
            onClick={() => syncMut.mutate()}
          >
            <Database className={`mr-2 h-4 w-4 ${syncMut.isPending ? 'animate-pulse' : ''}`} />
            Sync K8s tables
          </Button>
          <span className="hidden text-xs text-muted-foreground sm:inline">Last 24 hours (local)</span>
          <Button type="button" size="sm" asChild>
            <Link to="/connectors?addCluster=1">Onboard Cluster</Link>
          </Button>
        </div>
      </div>

      {clustersQ.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading clusters…</p>
      ) : clustersQ.isError ? (
        <EmptyState
          icon={RefreshCw}
          title="Could not load clusters"
          description="Check the API and sign in."
          action={{ label: 'Retry', onClick: () => void clustersQ.refetch() }}
        />
      ) : rows.length === 0 ? (
        <Card>
          <CardContent className="pt-10">
            <EmptyState
              icon={RefreshCw}
              title="No clusters connected"
              description="Onboard a Kubernetes cluster to see inventory, findings rollups, and the detail panel."
              action={{ label: 'Onboard cluster', onClick: () => (window.location.href = '/connectors?addCluster=1') }}
            />
          </CardContent>
        </Card>
      ) : (
        <ClusterTable rows={rows} onRowOpen={openCluster} onDelete={handleDelete} />
      )}
    </div>
  )
}

export function InventoryIndexRedirect() {
  return <Navigate to="/inventory/cloud" replace />
}
