import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { ShieldAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/EmptyState'
import { fetchDashboardSummary } from '@/api/dashboard'
import SeverityDonut from '@/components/charts/SeverityDonut'
import TrendLine from '@/components/charts/TrendLine'
import DomainBar from '@/components/charts/DomainBar'
import { RiskScoreGauge } from '@/components/dashboard/RiskScoreGauge'
import { FindingsByCloudTable } from '@/components/dashboard/FindingsByCloudTable'

const TITLES: Record<string, string> = {
  cspm: 'CSPM — Cloud security posture',
  kspm: 'KSPM — Kubernetes security posture',
  cwpp: 'CWPP — Workload protection',
  ciem: 'CIEM — Entitlements & IAM',
  secrets: 'Secrets exposure',
  iac: 'Infrastructure as code',
  sspm: 'SaaS security posture',
}

export default function DomainDashboard() {
  const { domain = '' } = useParams()
  const key = domain.toLowerCase()
  const title = TITLES[key] ?? `Domain: ${domain}`

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['dashboard', 'summary', 'domain', key],
    queryFn: () => fetchDashboardSummary({ domain: key }),
    enabled: Boolean(key),
  })

  if (!key) {
    return <EmptyState icon={ShieldAlert} title="No domain" description="Invalid route." />
  }

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading domain dashboard…</p>
  }

  if (isError || !data) {
    return (
      <EmptyState
        icon={ShieldAlert}
        title="Could not load domain dashboard"
        description="Check API connectivity."
        action={{ label: 'Retry', onClick: () => void refetch() }}
      />
    )
  }

  const score = Number(data.secure_score ?? 0)
  const posture = data.risk_posture

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          All widgets below are filtered to <code className="rounded bg-muted px-1">domain={key}</code> via{' '}
          <code className="rounded bg-muted px-1">GET /dashboard/summary?domain=...</code>
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Domain risk score</CardTitle>
            <CardDescription>Computed from severities in this domain only.</CardDescription>
          </CardHeader>
          <CardContent>
            <RiskScoreGauge score={score} label={posture?.label ?? '—'} />
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Severity mix</CardTitle>
          </CardHeader>
          <CardContent>
            {(data.severity_breakdown?.length ?? 0) > 0 ? (
              <SeverityDonut data={data.severity_breakdown} />
            ) : (
              <p className="text-sm text-muted-foreground">No findings for this domain yet.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Trend (7d)</CardTitle>
          </CardHeader>
          <CardContent>
            <TrendLine data={data.trend || []} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Sub-domains / labels</CardTitle>
          </CardHeader>
          <CardContent>
            {(data.domain_breakdown?.length ?? 0) > 1 ? (
              <DomainBar data={data.domain_breakdown} />
            ) : (
              <p className="text-sm text-muted-foreground">Single domain bucket — use unified dashboard for cross-domain view.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Findings by cloud (this domain)</CardTitle>
        </CardHeader>
        <CardContent>
          <FindingsByCloudTable rows={data.findings_by_cloud ?? []} />
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Button asChild variant="default">
          <Link to="/">Unified dashboard</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to={`/findings?domain=${encodeURIComponent(key)}`}>Browse findings</Link>
        </Button>
      </div>
    </div>
  )
}
