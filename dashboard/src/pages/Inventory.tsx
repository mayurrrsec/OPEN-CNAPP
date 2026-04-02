import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { CheckSquare, RefreshCw } from 'lucide-react'
import { Link } from 'react-router-dom'
import { api } from '@/api/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/EmptyState'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ClusterDetailPanel } from '@/pages/inventory/ClusterDetailPanel'
import { ClusterTable, type ClusterInventoryRow } from '@/pages/inventory/ClusterTable'
import { CloudsTab } from '@/pages/inventory/CloudsTab'
import { ImagesInventoryTab } from '@/pages/inventory/ImagesInventoryTab'
import { NamespacesInventoryTab } from '@/pages/inventory/NamespacesInventoryTab'
import { WorkloadsInventoryTab } from '@/pages/inventory/WorkloadsInventoryTab'

type ClustersResponse = {
  items: ClusterInventoryRow[]
  total: number
}

export default function Inventory() {
  const qc = useQueryClient()
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Inventory</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Clouds, clusters, namespaces, workloads, and images — KSPM-oriented asset views. Row actions and detail panel
          follow the OpenCNAPP inventory plan.
        </p>
      </div>

      <Tabs defaultValue="clusters" className="w-full">
        <TabsList className="mb-1 flex h-auto w-full flex-wrap justify-start gap-1 rounded-md bg-muted/40 p-1">
          <TabsTrigger value="clouds" className="rounded-sm px-3 py-2 text-xs font-semibold sm:text-sm">
            Clouds
          </TabsTrigger>
          <TabsTrigger value="clusters" className="rounded-sm px-3 py-2 text-xs font-semibold sm:text-sm">
            Clusters
          </TabsTrigger>
          <TabsTrigger value="namespaces" className="rounded-sm px-3 py-2 text-xs font-semibold sm:text-sm">
            Namespaces
          </TabsTrigger>
          <TabsTrigger value="workloads" className="rounded-sm px-3 py-2 text-xs font-semibold sm:text-sm">
            Workloads
          </TabsTrigger>
          <TabsTrigger value="images" className="rounded-sm px-3 py-2 text-xs font-semibold sm:text-sm">
            Images
          </TabsTrigger>
        </TabsList>

        <TabsContent value="clouds" className="mt-4 space-y-4">
          <CloudsTab />
        </TabsContent>

        <TabsContent value="clusters" className="mt-4 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Clusters</h2>
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
        </TabsContent>

        <TabsContent value="namespaces" className="mt-4">
          <NamespacesInventoryTab />
        </TabsContent>

        <TabsContent value="workloads" className="mt-4">
          <WorkloadsInventoryTab />
        </TabsContent>

        <TabsContent value="images" className="mt-4">
          <ImagesInventoryTab />
        </TabsContent>
      </Tabs>

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
