import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, ExternalLink, Search } from 'lucide-react'
import { Link } from 'react-router-dom'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { api } from '@/api/client'
import { FindingsByCategoryChart } from '@/components/inventory/FindingsByCategoryChart'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NoGraphData } from '@/components/ui/NoGraphData'
import { SeverityToggle, severityQueryParam, SEVERITY_KEYS } from '@/components/inventory/SeverityToggle'
import { cn } from '@/lib/utils'

type FindingRow = {
  id: string
  severity: string
  title: string
  check_id: string | null
  resource_type: string | null
  resource_name: string | null
  namespace: string | null
  domain: string
  created_at: string | null
}

type Payload = {
  insights: {
    by_asset_category: { category: string; count: number }[]
    trend: { date: string; count: number }[]
  }
  findings: { total: number; page: number; items: FindingRow[] }
}

const defaultSev = () => Object.fromEntries(SEVERITY_KEYS.map((s) => [s, true])) as Record<string, boolean>

export function ClusterMisconfigurationTab({ clusterId }: { clusterId: string }) {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [debounced, setDebounced] = useState('')
  const [severity, setSeverity] = useState<Record<string, boolean>>(defaultSev)

  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(search.trim()), 350)
    return () => window.clearTimeout(t)
  }, [search])

  const severityParam = useMemo(() => severityQueryParam(severity), [severity])

  const { data, isLoading, isError } = useQuery({
    queryKey: ['inventory', 'cluster', clusterId, 'misconfigurations', page, debounced, severityParam],
    queryFn: () =>
      api
        .get<Payload>(`/inventory/clusters/${clusterId}/misconfigurations`, {
          params: { page, limit: 25, search: debounced, severity: severityParam },
        })
        .then((r) => r.data),
  })

  useEffect(() => {
    setPage(1)
  }, [debounced, severityParam])

  const totalPages = data ? Math.max(1, Math.ceil(data.findings.total / 25)) : 1

  if (isLoading && !data) {
    return <p className="text-sm text-muted-foreground">Loading misconfigurations…</p>
  }
  if (isError) {
    return <p className="text-sm text-destructive">Failed to load misconfigurations.</p>
  }
  if (!data) return null

  const trend = data.insights.trend ?? []
  const hasTrend = trend.some((t) => t.count > 0)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Insights</h4>
        <Link
          to={`/findings?cluster_id=${encodeURIComponent(clusterId)}`}
          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          View all
          <ExternalLink className="h-3 w-3" aria-hidden />
        </Link>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="mb-2 text-sm font-medium">Findings by asset type</p>
          <FindingsByCategoryChart data={data.insights.by_asset_category} />
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="mb-2 text-sm font-medium">K8s findings trend</p>
          {hasTrend ? (
            <div className="h-[200px] w-full min-w-0">
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

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SeverityToggle value={severity} onChange={setSeverity} />
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder="Search title, check, resource…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="flex items-center justify-between gap-2">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Cluster findings</h4>
        <Link
          to={`/findings?cluster_id=${encodeURIComponent(clusterId)}`}
          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          View all
          <ExternalLink className="h-3 w-3" aria-hidden />
        </Link>
      </div>

      <div className="overflow-x-auto rounded-md border">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
            <tr>
              <th className="p-2">Severity</th>
              <th className="p-2">Title</th>
              <th className="p-2">Check</th>
              <th className="p-2">Resource</th>
              <th className="p-2">NS</th>
              <th className="p-2">Domain</th>
            </tr>
          </thead>
          <tbody>
            {data.findings.items.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-6 text-center text-muted-foreground">
                  No misconfiguration findings for this cluster yet.
                </td>
              </tr>
            ) : (
              data.findings.items.map((f) => (
                <tr key={f.id} className="border-t border-border">
                  <td className="p-2 align-top">
                    <span
                      className={cn(
                        'rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase',
                        f.severity === 'CRITICAL' && 'bg-rose-100 text-rose-900',
                        f.severity === 'HIGH' && 'bg-orange-100 text-orange-900',
                        f.severity === 'MEDIUM' && 'bg-amber-100 text-amber-900',
                        f.severity === 'LOW' && 'bg-sky-100 text-sky-900',
                        f.severity === 'INFO' && 'bg-slate-100 text-slate-800'
                      )}
                    >
                      {f.severity}
                    </span>
                  </td>
                  <td className="p-2 align-top">{f.title}</td>
                  <td className="p-2 align-top font-mono text-xs">{f.check_id ?? '—'}</td>
                  <td className="p-2 align-top">
                    <div className="text-xs">{f.resource_type ?? '—'}</div>
                    <div className="text-muted-foreground">{f.resource_name ?? '—'}</div>
                  </td>
                  <td className="p-2 align-top">{f.namespace ?? '—'}</td>
                  <td className="p-2 align-top">{f.domain}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>
          {data.findings.total} finding{data.findings.total === 1 ? '' : 's'} · page {data.findings.page} of {totalPages}
        </span>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
