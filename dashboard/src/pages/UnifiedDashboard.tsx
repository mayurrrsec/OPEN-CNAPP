import { useQuery } from '@tanstack/react-query'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { RefreshCw, ShieldAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { StatCard } from '@/components/ui/StatCard'
import { EmptyState } from '@/components/ui/EmptyState'
import { SeverityBadge } from '@/components/ui/SeverityBadge'
import { fetchDashboardSummary } from '@/api/dashboard'
import SeverityDonut from '@/components/charts/SeverityDonut'
import TrendLine from '@/components/charts/TrendLine'
import DomainBar from '@/components/charts/DomainBar'
import { RiskScoreGauge } from '@/components/dashboard/RiskScoreGauge'
import { FindingsByCloudTable } from '@/components/dashboard/FindingsByCloudTable'
import { LifecycleStrip } from '@/components/dashboard/LifecycleStrip'
import { AttackPathSummaryCard } from '@/components/dashboard/AttackPathSummaryCard'
import { ComplianceOverviewMini } from '@/components/dashboard/ComplianceOverviewMini'
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
    queryKey: ['dashboard', 'summary', 'unified'],
    queryFn: () => fetchDashboardSummary(),
  })

  const summary = data ?? {
    severity_breakdown: [],
    trend: [],
    domain_breakdown: [],
    cloud_breakdown: [],
    top_findings: [],
    findings_by_cloud: [],
    lifecycle_by_status: {},
    compliance_overview: [],
    attack_path_summary: { high_impact: 0, medium_impact: 0, low_impact: 0, edge_count: 0 },
  }

  const score = Number(summary.secure_score ?? 0)
  const posture = summary.risk_posture
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
  const ap = summary.attack_path_summary ?? {
    high_impact: 0,
    medium_impact: 0,
    low_impact: 0,
    edge_count: 0,
  }

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

      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Posture overview</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Risk score, severity trends, and prioritized issues across your cloud security posture.
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

      {/* Stats + risk gauge */}
      <div className="grid gap-4 lg:grid-cols-6">
        <div className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Risk score</CardTitle>
              <CardDescription>{posture?.label ?? '—'} · Δ week: {posture?.delta_week ?? 0}</CardDescription>
            </CardHeader>
            <CardContent>
              <RiskScoreGauge score={score} label={posture?.label ?? '—'} />
            </CardContent>
          </Card>
        </div>
        <div className="lg:col-span-4 grid gap-4 sm:grid-cols-2">
          <StatCard
            label="Total findings"
            value={summary.total_findings ?? '—'}
            hint="All sources"
            badge={<Badge variant="secondary">Open: {summary.open_findings ?? '—'}</Badge>}
            onClick={() => navigate('/findings')}
          />
          <StatCard
            label="Critical"
            value={summary.critical ?? '—'}
            hint="Immediate action"
            accent="critical"
            badge={<Badge variant="destructive">Top priority</Badge>}
            onClick={() => navigate('/findings?severity=CRITICAL')}
          />
          <StatCard
            label="High"
            value={summary.high ?? '—'}
            hint="Fix next"
            accent="high"
            badge={<Badge variant="warning">Elevated</Badge>}
            onClick={() => navigate('/findings?severity=HIGH')}
          />
          <StatCard
            label="Coverage"
            value={clouds > 0 ? clouds : '—'}
            hint="Clouds detected"
            badge={<Badge variant="secondary">Domains: {domains > 0 ? domains : '—'}</Badge>}
            onClick={() => navigate('/connectors')}
          />
        </div>
      </div>

      {/* Row 2 — lifecycle + attack path summary */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Remediation / lifecycle</CardTitle>
            <CardDescription>How findings move through triage by status.</CardDescription>
          </CardHeader>
          <CardContent>
            <LifecycleStrip lifecycle={summary.lifecycle_by_status ?? {}} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Attack path summary</CardTitle>
            <CardDescription>Estimated impact tiers from your attack-path analysis.</CardDescription>
          </CardHeader>
          <CardContent>
            <AttackPathSummaryCard summary={ap} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
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
            <CardTitle>Compliance (frameworks)</CardTitle>
            <CardDescription>Mapped findings per framework prefix.</CardDescription>
          </CardHeader>
          <CardContent>
            <ComplianceOverviewMini rows={summary.compliance_overview ?? []} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
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

        <Card>
          <CardHeader>
            <CardTitle>Findings by cloud</CardTitle>
            <CardDescription>Totals by cloud provider with critical through informational counts.</CardDescription>
          </CardHeader>
          <CardContent>
            <FindingsByCloudTable rows={summary.findings_by_cloud ?? []} />
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
