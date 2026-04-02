import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, Search } from 'lucide-react'
import { api } from '@/api/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NoGraphData } from '@/components/ui/NoGraphData'
import { SeverityBars, type SeverityBreakdown } from '@/components/inventory/SeverityBars'
import { SeverityToggle, severityQueryParam, SEVERITY_KEYS } from '@/components/inventory/SeverityToggle'
import { cn } from '@/lib/utils'
import {
  Line,
  LineChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

type Paged<T> = { total: number; page: number; items: T[] }

type BaseFinding = {
  id: string
  severity: string
  title: string
  check_id: string | null
  resource_type: string | null
  resource_name: string | null
  namespace: string | null
  domain: string
  tool?: string
  status?: string
  created_at: string | null
}

const defaultSev = () => Object.fromEntries(SEVERITY_KEYS.map((s) => [s, true])) as Record<string, boolean>

function sevPill(sev: string) {
  const s = (sev || '').toUpperCase()
  const known = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'].includes(s)
  return (
    <span
      className={cn(
        'rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase',
        s === 'CRITICAL' && 'bg-rose-100 text-rose-900',
        s === 'HIGH' && 'bg-orange-100 text-orange-900',
        s === 'MEDIUM' && 'bg-amber-100 text-amber-900',
        s === 'LOW' && 'bg-sky-100 text-sky-900',
        s === 'INFO' && 'bg-slate-100 text-slate-800',
        !known && 'bg-muted text-foreground'
      )}
    >
      {s || '—'}
    </span>
  )
}

type SubTabKind = 'vuln' | 'compliance' | 'alerts' | 'app' | 'kiem'

type Props = {
  clusterId: string
  path: string
  kind: SubTabKind
  itemsKey: 'findings' | 'alerts' | 'events'
  title: string
  emptyMessage: string
}

export function ClusterConnectorSubTab({ clusterId, path, kind, itemsKey, title, emptyMessage }: Props) {
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
    queryKey: ['inventory', 'cluster', clusterId, path, page, debounced, severityParam],
    queryFn: () =>
      api
        .get<Record<string, unknown>>(`/inventory/clusters/${clusterId}/${path}`, {
          params: { page, limit: 25, search: debounced, severity: severityParam },
        })
        .then((r) => r.data),
  })

  useEffect(() => {
    setPage(1)
  }, [debounced, severityParam])

  const bucket = data?.[itemsKey] as Paged<BaseFinding & Record<string, unknown>> | undefined
  const totalPages = bucket ? Math.max(1, Math.ceil(bucket.total / 25)) : 1

  if (isLoading && !data) {
    return <p className="text-sm text-muted-foreground">Loading {title}…</p>
  }
  if (isError) {
    return <p className="text-sm text-destructive">Failed to load {title}.</p>
  }
  if (!data || !bucket) return null

  const insights = data.insights as Record<string, unknown>

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SeverityToggle value={severity} onChange={setSeverity} />
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder="Search title, resource, CVE…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <InsightsPanel kind={kind} insights={insights} />

      <div className="overflow-x-auto rounded-md border">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
            <tr>
              <th className="p-2">Severity</th>
              <th className="p-2">Title</th>
              {kind === 'vuln' ? (
                <>
                  <th className="p-2">CVE</th>
                  <th className="p-2">CVSS</th>
                </>
              ) : null}
              {kind === 'compliance' ? <th className="p-2">Compliance</th> : null}
              {kind === 'app' ? <th className="p-2">Event</th> : null}
              <th className="p-2">Resource</th>
              <th className="p-2">NS</th>
              {kind === 'alerts' || kind === 'app' ? <th className="p-2">Tool</th> : null}
            </tr>
          </thead>
          <tbody>
            {bucket.items.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-6 text-center text-muted-foreground">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              bucket.items.map((f) => (
                <tr key={f.id} className="border-t border-border">
                  <td className="p-2 align-top">{sevPill(f.severity)}</td>
                  <td className="p-2 align-top">{f.title}</td>
                  {kind === 'vuln' ? (
                    <>
                      <td className="p-2 align-top font-mono text-xs">{(f.cve_id as string) ?? '—'}</td>
                      <td className="p-2 align-top tabular-nums">
                        {f.cvss_score != null ? String(f.cvss_score) : '—'}
                      </td>
                    </>
                  ) : null}
                  {kind === 'compliance' ? (
                    <td className="max-w-[200px] p-2 align-top text-xs text-muted-foreground">
                      {formatComplianceSnippet(f.compliance)}
                    </td>
                  ) : null}
                  {kind === 'app' ? (
                    <td className="p-2 align-top text-xs">{String(f.event_type ?? '—')}</td>
                  ) : null}
                  <td className="p-2 align-top">
                    <div className="text-xs">{f.resource_type ?? '—'}</div>
                    <div className="text-muted-foreground">{f.resource_name ?? '—'}</div>
                  </td>
                  <td className="p-2 align-top">{f.namespace ?? '—'}</td>
                  {kind === 'alerts' || kind === 'app' ? (
                    <td className="p-2 align-top font-mono text-xs">{f.tool ?? '—'}</td>
                  ) : null}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>
          {bucket.total} row{bucket.total === 1 ? '' : 's'} · page {bucket.page} of {totalPages}
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

function formatComplianceSnippet(raw: unknown): string {
  if (raw == null) return '—'
  if (Array.isArray(raw)) {
    if (raw.length === 0) return '—'
    try {
      return JSON.stringify(raw.slice(0, 3)).slice(0, 120)
    } catch {
      return '…'
    }
  }
  if (typeof raw === 'object') {
    try {
      return JSON.stringify(raw).slice(0, 120)
    } catch {
      return '…'
    }
  }
  return String(raw).slice(0, 120)
}

function InsightsPanel({ kind, insights }: { kind: SubTabKind; insights: Record<string, unknown> }) {
  if (kind === 'vuln') {
    const by = insights.by_severity as Record<string, number> | undefined
    const top = insights.top_images as { image: string; count: number }[] | undefined
    const breakdown: SeverityBreakdown = by
      ? {
          CRITICAL: by.critical ?? 0,
          HIGH: by.high ?? 0,
          MEDIUM: by.medium ?? 0,
          LOW: by.low ?? 0,
          INFO: by.info ?? 0,
        }
      : {}
    return (
      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-md border border-border bg-muted/20 p-3">
          <p className="mb-2 text-xs font-semibold text-muted-foreground">By severity</p>
          <SeverityBars breakdown={breakdown} className="h-3" />
        </div>
        <div className="rounded-md border border-border bg-muted/20 p-3 text-xs">
          <p className="mb-2 text-xs font-semibold text-muted-foreground">Top images (by finding count)</p>
          {top?.length ? (
            <ul className="space-y-1">
              {top.slice(0, 6).map((r) => (
                <li key={r.image} className="flex justify-between gap-2">
                  <span className="truncate font-mono">{r.image}</span>
                  <span className="shrink-0 tabular-nums text-muted-foreground">{r.count}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground">No image-level CVE data yet.</p>
          )}
        </div>
      </div>
    )
  }

  if (kind === 'compliance') {
    const byFw = insights.by_framework as { framework: string; count: number }[] | undefined
    const trend = insights.trend as { date: string; count: number }[] | undefined
    const hasTrend = trend?.some((t) => t.count > 0)
    return (
      <div className="grid gap-3 lg:grid-cols-2">
        <div className="rounded-md border border-border bg-muted/20 p-3 text-xs">
          <p className="mb-2 text-xs font-semibold text-muted-foreground">By domain / framework</p>
          {byFw?.length ? (
            <ul className="space-y-1">
              {byFw.map((r) => (
                <li key={r.framework} className="flex justify-between gap-2">
                  <span>{r.framework}</span>
                  <span className="tabular-nums text-muted-foreground">{r.count}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground">No compliance-tagged findings.</p>
          )}
        </div>
        <div className="rounded-md border border-border bg-card p-3">
          <p className="mb-2 text-xs font-semibold text-muted-foreground">14-day trend</p>
          {hasTrend && trend ? (
            <div className="h-[140px] w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trend}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="date" tick={{ fontSize: 9 }} />
                  <YAxis tick={{ fontSize: 9 }} />
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
    )
  }

  if (kind === 'alerts') {
    const bySev = insights.by_severity as { severity: string; count: number }[] | undefined
    const trend = insights.trend as { date: string; count: number }[] | undefined
    const hasTrend = trend?.some((t) => t.count > 0)
    return (
      <div className="grid gap-3 lg:grid-cols-2">
        <div className="rounded-md border border-border bg-muted/20 p-3 text-xs">
          <p className="mb-2 text-xs font-semibold text-muted-foreground">By severity</p>
          {bySev?.length ? (
            <ul className="space-y-1">
              {bySev.map((r) => (
                <li key={r.severity} className="flex justify-between gap-2">
                  <span>{r.severity}</span>
                  <span className="tabular-nums text-muted-foreground">{r.count}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground">No alert-class findings.</p>
          )}
        </div>
        <div className="rounded-md border border-border bg-card p-3">
          <p className="mb-2 text-xs font-semibold text-muted-foreground">14-day trend</p>
          {hasTrend && trend ? (
            <div className="h-[140px] w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trend}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="date" tick={{ fontSize: 9 }} />
                  <YAxis tick={{ fontSize: 9 }} />
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
    )
  }

  if (kind === 'app') {
    const byType = insights.by_type as { type: string; count: number }[] | undefined
    const trend = insights.trend as { date: string; count: number }[] | undefined
    const hasTrend = trend?.some((t) => t.count > 0)
    return (
      <div className="grid gap-3 lg:grid-cols-2">
        <div className="rounded-md border border-border bg-muted/20 p-3 text-xs">
          <p className="mb-2 text-xs font-semibold text-muted-foreground">By source (tool)</p>
          {byType?.length ? (
            <ul className="space-y-1">
              {byType.map((r) => (
                <li key={r.type} className="flex justify-between gap-2">
                  <span className="font-mono">{r.type}</span>
                  <span className="tabular-nums text-muted-foreground">{r.count}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground">No runtime / behaviour findings.</p>
          )}
        </div>
        <div className="rounded-md border border-border bg-card p-3">
          <p className="mb-2 text-xs font-semibold text-muted-foreground">14-day trend</p>
          {hasTrend && trend ? (
            <div className="h-[140px] w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trend}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="date" tick={{ fontSize: 9 }} />
                  <YAxis tick={{ fontSize: 9 }} />
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
    )
  }

  if (kind === 'kiem') {
    const score = typeof insights.risk_score === 'number' ? insights.risk_score : 0
    const assets = insights.by_asset_type as { type: string; count: number }[] | undefined
    return (
      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-md border border-border bg-muted/20 p-3">
          <p className="text-xs font-semibold text-muted-foreground">Heuristic risk score</p>
          <p className="mt-1 text-2xl font-bold tabular-nums">{score}</p>
          <p className="mt-1 text-[10px] text-muted-foreground">Based on identity / RBAC–related findings for this cluster.</p>
        </div>
        <div className="rounded-md border border-border bg-muted/20 p-3 text-xs">
          <p className="mb-2 text-xs font-semibold text-muted-foreground">By resource type</p>
          {assets?.length ? (
            <ul className="space-y-1">
              {assets.map((r) => (
                <li key={r.type} className="flex justify-between gap-2">
                  <span>{r.type}</span>
                  <span className="tabular-nums text-muted-foreground">{r.count}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground">No identity findings yet.</p>
          )}
        </div>
      </div>
    )
  }

  return null
}

export function ClusterVulnerabilitiesTab({ clusterId }: { clusterId: string }) {
  return (
    <ClusterConnectorSubTab
      clusterId={clusterId}
      path="vulnerabilities"
      kind="vuln"
      itemsKey="findings"
      title="vulnerabilities"
      emptyMessage="No CVE / image vulnerability findings for this cluster. Ingest Trivy, Snyk, or image-scanner results."
    />
  )
}

export function ClusterComplianceTab({ clusterId }: { clusterId: string }) {
  return (
    <ClusterConnectorSubTab
      clusterId={clusterId}
      path="compliance"
      kind="compliance"
      itemsKey="findings"
      title="compliance"
      emptyMessage="No compliance-framework findings (CIS, PCI, etc.) for this cluster yet."
    />
  )
}

export function ClusterAlertsTab({ clusterId }: { clusterId: string }) {
  return (
    <ClusterConnectorSubTab
      clusterId={clusterId}
      path="alerts"
      kind="alerts"
      itemsKey="alerts"
      title="alerts"
      emptyMessage="No high-priority or runtime-alert findings match this cluster."
    />
  )
}

export function ClusterAppBehaviourTab({ clusterId }: { clusterId: string }) {
  return (
    <ClusterConnectorSubTab
      clusterId={clusterId}
      path="app-behaviour"
      kind="app"
      itemsKey="events"
      title="app behaviour"
      emptyMessage="No Falco / runtime behaviour findings for this cluster yet."
    />
  )
}

export function ClusterKiemTab({ clusterId }: { clusterId: string }) {
  return (
    <ClusterConnectorSubTab
      clusterId={clusterId}
      path="kiem"
      kind="kiem"
      itemsKey="findings"
      title="KIEM"
      emptyMessage="No identity / RBAC–style findings for this cluster yet."
    />
  )
}
