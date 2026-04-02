import { useQuery } from '@tanstack/react-query'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { RefreshCw, ShieldAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatCard } from '@/components/ui/StatCard'
import { EmptyState } from '@/components/ui/EmptyState'
import { SeverityBadge } from '@/components/ui/SeverityBadge'
import { fetchDashboardSummary } from '@/api/dashboard'
import SeverityDonut from '@/components/charts/SeverityDonut'
import TrendLine from '@/components/charts/TrendLine'
import DomainBar from '@/components/charts/DomainBar'
import { cn } from '@/lib/utils'

const DASH_TABS = [
  { label: 'Unified', to: '/' },
  { label: 'CSPM', to: '/dashboard/cspm' },
  { label: 'KSPM', to: '/dashboard/kspm' },
  { label: 'CWPP', to: '/dashboard/cwpp' },
  { label: 'CIEM', to: '/dashboard/ciem' },
] as const

export default function UnifiedDashboard() {
  const navigate = useNavigate()
  const location = useLocation()
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['dashboard', 'summary'],
    queryFn: fetchDashboardSummary,
  })

  const summary = data ?? {
    severity_breakdown: [],
    trend: [],
    domain_breakdown: [],
    cloud_breakdown: [],
    top_findings: [],
  }

  const score = Number(summary.secure_score ?? 0)
  const scoreBadge =
    score >= 80 ? (
      <Badge variant="success">Good</Badge>
    ) : score >= 55 ? (
      <Badge variant="warning">Needs work</Badge>
    ) : (
      <Badge variant="destructive">At risk</Badge>
    )

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted-foreground">
        Loading dashboard…
      </div>
    )
  }

  if (isError) {
    return (
      <EmptyState
        icon={ShieldAlert}
        title="Could not load dashboard"
        description="Check that the API is running and CORS is configured for this origin."
        action={{ label: 'Retry', onClick: () => void refetch() }}
      />
    )
  }

  const clouds = summary.cloud_breakdown?.length ?? 0
  const domains = summary.domain_breakdown?.length ?? 0

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        {DASH_TABS.map((t) => (
          <Link
            key={t.to}
            to={t.to}
            className={cn(
              'rounded-full border px-3 py-1 text-xs font-semibold transition-colors',
              location.pathname === t.to
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border bg-card text-muted-foreground hover:bg-muted'
            )}
          >
            {t.label}
          </Link>
        ))}
        <Button variant="outline" size="sm" className="rounded-full" type="button" disabled>
          + Create dashboard
        </Button>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Posture overview</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Risk score, trends, and top issues across CSPM, KSPM, CWPP, and CIEM.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm shadow-sm">
            <span className="text-muted-foreground">Secure score</span>
            <span className="text-lg font-bold tabular-nums">{summary.secure_score ?? '—'}</span>
            {scoreBadge}
          </div>
          <Button
            variant="outline"
            size="sm"
            type="button"
            onClick={() => void refetch()}
            disabled={isFetching}
          >
            <RefreshCw className={cn('h-4 w-4', isFetching && 'animate-spin')} />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total findings"
          value={summary.total_findings ?? '—'}
          hint="All sources"
          badge={<Badge variant="secondary">Open: {summary.open_findings ?? '—'}</Badge>}
        />
        <StatCard
          label="Critical"
          value={summary.critical ?? '—'}
          hint="Immediate action"
          accent="critical"
          badge={<Badge variant="destructive">Top priority</Badge>}
        />
        <StatCard
          label="High"
          value={summary.high ?? '—'}
          hint="Fix next"
          accent="high"
          badge={<Badge variant="warning">Elevated</Badge>}
        />
        <StatCard
          label="Coverage"
          value={clouds > 0 ? clouds : '—'}
          hint="Clouds detected"
          badge={<Badge variant="secondary">Domains: {domains > 0 ? domains : '—'}</Badge>}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Severity distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {(summary.severity_breakdown?.length ?? 0) > 0 ? (
              <SeverityDonut data={summary.severity_breakdown} />
            ) : (
              <EmptyState
                icon={ShieldAlert}
                title="No severity data yet"
                description="Ingest scan results or connect a cloud account to populate this chart."
                action={{ label: 'Open connectors', onClick: () => navigate('/connectors') }}
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Findings by domain</CardTitle>
          </CardHeader>
          <CardContent>
            {(summary.domain_breakdown?.length ?? 0) > 0 ? (
              <DomainBar data={summary.domain_breakdown} />
            ) : (
              <EmptyState
                icon={ShieldAlert}
                title="No domain breakdown"
                description="Once findings include a domain tag, this chart will summarize volume by domain."
              />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>7-day findings trend</CardTitle>
          </CardHeader>
          <CardContent>
            <TrendLine data={summary.trend || []} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle>Top risky findings</CardTitle>
            <Button variant="link" className="h-auto p-0 text-sm" asChild>
              <Link to="/findings">View all</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {(summary.top_findings?.length ?? 0) > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      <th className="pb-2 pr-3">Severity</th>
                      <th className="pb-2 pr-3">Domain</th>
                      <th className="pb-2 pr-3">Cloud</th>
                      <th className="pb-2">Title</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.top_findings.slice(0, 8).map((f) => (
                      <tr key={f.id} className="border-b border-border/60 last:border-0">
                        <td className="py-2 pr-3 align-top">
                          <SeverityBadge severity={String(f.severity || 'UNKNOWN')} />
                        </td>
                        <td className="py-2 pr-3 align-top text-muted-foreground">{f.domain ?? '—'}</td>
                        <td className="py-2 pr-3 align-top text-muted-foreground">
                          {f.cloud_provider ?? '—'}
                        </td>
                        <td className="py-2 align-top">
                          <span className="line-clamp-2 text-foreground">{f.title ?? '—'}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState
                icon={ShieldAlert}
                title="No findings yet"
                description="Ingest CI results, connect a cloud account, or run a scan from the plugin manager."
                action={{ label: 'Go to findings', onClick: () => navigate('/findings') }}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
