import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Boxes, ClipboardList, LayoutGrid, Maximize2, Minimize2, Server } from 'lucide-react'
import { Link } from 'react-router-dom'
import {
  Line,
  LineChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { api } from '@/api/client'
import { K8sResourceSummary } from '@/components/inventory/K8sResourceSummary'
import { Button } from '@/components/ui/button'
import { NoGraphData } from '@/components/ui/NoGraphData'
import { cn } from '@/lib/utils'

export type OverviewPayload = {
  cluster_id: string
  connection_status: string
  k8s_resource_summary: Record<string, number>
  findings_trend: { date: string; count: number }[]
  cluster_info: {
    nodes: number
    workloads: number
    namespaces: number
    active_policies: number
    tags: string[]
  }
  connection_history: unknown[]
  nodes: { name: string }[]
}

export function ClusterOverviewTab({ clusterId }: { clusterId: string }) {
  const [insightsExpanded, setInsightsExpanded] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['inventory', 'cluster', clusterId, 'overview'],
    queryFn: () => api.get<OverviewPayload>(`/inventory/clusters/${clusterId}/overview`).then((r) => r.data),
    refetchInterval: 30_000,
  })

  if (isLoading || !data) {
    return <p className="text-sm text-muted-foreground">Loading overview…</p>
  }

  const trend = data.findings_trend?.length ? data.findings_trend : []
  const hasTrend = trend.some((t) => t.count > 0)

  return (
    <div className="space-y-6">
      <section>
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Insights</h3>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 gap-1 text-muted-foreground"
            title={insightsExpanded ? 'Collapse insights' : 'Expand insights'}
            onClick={() => setInsightsExpanded((v) => !v)}
          >
            {insightsExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            <span className="sr-only">{insightsExpanded ? 'Collapse' : 'Expand'}</span>
          </Button>
        </div>
        <div className={cn('grid gap-4', insightsExpanded ? 'grid-cols-1' : 'lg:grid-cols-2')}>
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="mb-2 text-sm font-medium">K8s Resource Summary</p>
            <K8sResourceSummary summary={data.k8s_resource_summary} clusterId={clusterId} />
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="mb-2 text-sm font-medium">K8s Findings Trend</p>
            {hasTrend ? (
              <div
                className={cn(
                  'w-full min-w-0',
                  insightsExpanded ? 'h-[min(420px,50vh)]' : 'h-[200px]'
                )}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trend}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="count" stroke="hsl(var(--primary))" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <NoGraphData />
            )}
          </div>
        </div>
      </section>

      <section>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Cluster Information
        </h3>
        <div className="rounded-lg border border-border bg-muted/20 p-4">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="flex items-center gap-2">
              <Server className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="text-xs text-muted-foreground">Nodes</div>
                <div className="text-lg font-semibold tabular-nums">{data.cluster_info.nodes}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <LayoutGrid className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="text-xs text-muted-foreground">Workloads</div>
                <div className="text-lg font-semibold tabular-nums">{data.cluster_info.workloads}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Boxes className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="text-xs text-muted-foreground">Namespaces</div>
                <div className="text-lg font-semibold tabular-nums">{data.cluster_info.namespaces}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="text-xs text-muted-foreground">Active Policies</div>
                <div className="text-lg font-semibold tabular-nums">{data.cluster_info.active_policies}</div>
              </div>
            </div>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Tags:{' '}
            {data.cluster_info.tags?.length ? data.cluster_info.tags.join(', ') : '—'}{' '}
            <button type="button" className="text-primary underline">
              Add Tags +
            </button>
          </p>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-border p-4">
          <h4 className="mb-2 text-sm font-medium">Cluster Connection History</h4>
          <p className="text-sm text-muted-foreground">No connection history available.</p>
        </div>
        <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
          Future: cluster events timeline
        </div>
      </div>

      <section>
        <h4 className="mb-2 text-sm font-medium">Nodes</h4>
        <p className="mb-2 text-xs text-muted-foreground">No nodes reported yet. Run an agent sync to populate.</p>
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
              <tr>
                <th className="p-2">Name</th>
                <th className="p-2">Onboarded</th>
                <th className="p-2">Last Synced</th>
                <th className="p-2">Tags</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={4} className="p-4 text-center text-muted-foreground">
                  No nodes
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs">
          <Link className="text-primary underline" to={`/findings?cluster_id=${encodeURIComponent(clusterId)}`}>
            View related findings
          </Link>
        </p>
      </section>
    </div>
  )
}
