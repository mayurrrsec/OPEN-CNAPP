import { useQuery } from '@tanstack/react-query'
import { CheckSquare, GitBranch, Search, Server } from 'lucide-react'
import { api } from '@/api/client'
import { EmptyState } from '@/components/ui/EmptyState'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

type AssetRow = {
  cloud_provider: string | null
  account_id: string | null
  resource_type: string | null
  resource_id: string | null
  resource_name: string | null
  finding_count: number
  max_severity: string | null
}

type InventoryResponse = {
  total_rows: number
  assets: AssetRow[]
}

export default function Inventory() {
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['inventory', 'assets'],
    queryFn: () => api.get<InventoryResponse>('/inventory/assets', { params: { limit: 500 } }).then((r) => r.data),
  })

  const assets = data?.assets ?? []
  const clusterLike = assets.filter(
    (a) =>
      (a.resource_type || '').toLowerCase().includes('cluster') ||
      (a.resource_type || '').toLowerCase().includes('eks') ||
      (a.resource_type || '').toLowerCase().includes('aks') ||
      (a.resource_type || '').toLowerCase().includes('gke')
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Inventory</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Cloud accounts, clusters, and workloads — aggregated from findings until a dedicated asset graph lands.
        </p>
      </div>

      <Tabs defaultValue="assets" className="w-full">
        <TabsList>
          <TabsTrigger value="assets">Assets</TabsTrigger>
          <TabsTrigger value="clusters">Clusters</TabsTrigger>
          <TabsTrigger value="workloads">Workloads</TabsTrigger>
        </TabsList>

        <TabsContent value="assets">
          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div>
                <CardTitle>Discovered assets</CardTitle>
                <CardDescription>
                  Grouped resource rows from the findings store ({data?.total_rows ?? 0} rows).
                </CardDescription>
              </div>
              <button
                type="button"
                className="text-sm text-primary underline-offset-4 hover:underline"
                onClick={() => void refetch()}
              >
                {isFetching ? 'Refreshing…' : 'Refresh'}
              </button>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p className="text-sm text-muted-foreground">Loading inventory…</p>
              ) : isError ? (
                <EmptyState
                  icon={Search}
                  title="Could not load inventory"
                  description="Check that the API is running and you are signed in."
                  action={{ label: 'Retry', onClick: () => void refetch() }}
                />
              ) : assets.length === 0 ? (
                <EmptyState
                  icon={Search}
                  title="No assets yet"
                  description="Assets appear after CSPM or workload scans run against connected clouds and clusters."
                  action={{ label: 'Open connectors', onClick: () => (window.location.href = '/connectors') }}
                />
              ) : (
                <div className="overflow-x-auto rounded-md border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 text-left text-xs font-medium text-muted-foreground">
                      <tr>
                        <th className="p-2">Provider</th>
                        <th className="p-2">Account</th>
                        <th className="p-2">Type</th>
                        <th className="p-2">Resource</th>
                        <th className="p-2 text-right">Findings</th>
                        <th className="p-2">Severity</th>
                      </tr>
                    </thead>
                    <tbody>
                      {assets.map((a, i) => (
                        <tr key={`${a.resource_id}-${i}`} className="border-t border-border/60">
                          <td className="p-2">{a.cloud_provider ?? '—'}</td>
                          <td className="p-2 font-mono text-xs">{a.account_id ?? '—'}</td>
                          <td className="p-2">{a.resource_type ?? '—'}</td>
                          <td className="p-2 max-w-[min(420px,40vw)] truncate" title={a.resource_name || a.resource_id || ''}>
                            {a.resource_name || a.resource_id || '—'}
                          </td>
                          <td className="p-2 text-right tabular-nums">{a.finding_count}</td>
                          <td className="p-2">{a.max_severity ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="clusters">
          <Card>
            <CardHeader>
              <CardTitle>Clusters</CardTitle>
              <CardDescription>Kubernetes and managed control planes inferred from inventory and findings.</CardDescription>
            </CardHeader>
            <CardContent>
              {clusterLike.length === 0 ? (
                <EmptyState
                  icon={Server}
                  title="No clusters connected"
                  description="Onboard a Kubernetes cluster to see workload inventory and cluster-scoped assets."
                  action={{ label: 'Onboard cluster', onClick: () => (window.location.href = '/connectors') }}
                />
              ) : (
                <ul className="space-y-2 text-sm">
                  {clusterLike.map((a, i) => (
                    <li key={`cl-${i}`} className="rounded-md border border-border/60 px-3 py-2">
                      <div className="font-medium">{a.resource_name || a.resource_id}</div>
                      <div className="text-xs text-muted-foreground">
                        {a.cloud_provider} · {a.account_id} · {a.resource_type}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="workloads">
          <Card>
            <CardHeader>
              <CardTitle>Workloads</CardTitle>
              <CardDescription>Kubernetes workloads and hosts will appear here as CWPP/KSPM scans populate data.</CardDescription>
            </CardHeader>
            <CardContent>
              <EmptyState
                icon={GitBranch}
                title="Workload inventory coming soon"
                description="Connect a cluster and run scans to map pods, nodes, and images. For now, use the Assets tab for aggregated resource rows."
              />
            </CardContent>
          </Card>
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
            action={{ label: 'Run Prowler', onClick: () => (window.location.href = '/plugins') }}
          />
        </CardContent>
      </Card>
    </div>
  )
}
