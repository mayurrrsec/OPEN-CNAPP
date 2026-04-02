import { Link } from 'react-router-dom'
import { ShieldAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { NoGraphData } from '@/components/ui/NoGraphData'
import SeverityDonut from '@/components/charts/SeverityDonut'
import TrendLine from '@/components/charts/TrendLine'
import DomainBar from '@/components/charts/DomainBar'
import { RiskScoreGauge } from '@/components/dashboard/RiskScoreGauge'
import { FindingsByCloudTable } from '@/components/dashboard/FindingsByCloudTable'
import type { DashboardSummary } from '@/api/dashboard'
import { KSPM_DASHBOARD_WIDGETS } from '@/config/kspmDashboardWidgets'

const W = KSPM_DASHBOARD_WIDGETS

export function KspmDomainDashboard({ data }: { data: DashboardSummary }) {
  const score = Number(data.secure_score ?? 0)
  const posture = data.risk_posture
  const placeholders = W.slice(5)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">KSPM — Kubernetes security posture</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          Domain rollup from <code className="rounded bg-muted px-1 py-0.5 text-xs">/dashboard/summary?domain=kspm</code> plus
          AccuKnox-style widget slots. Tiles without data show the same empty pattern as AccuKnox until backend aggregations are
          wired.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>{W[0].title}</CardTitle>
            <CardDescription>Computed from severities in this domain only.</CardDescription>
          </CardHeader>
          <CardContent>
            <RiskScoreGauge score={score} label={posture?.label ?? '—'} />
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{W[1].title}</CardTitle>
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
            <CardTitle>{W[2].title}</CardTitle>
          </CardHeader>
          <CardContent>
            <TrendLine data={data.trend || []} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{W[3].title}</CardTitle>
          </CardHeader>
          <CardContent>
            {(data.domain_breakdown?.length ?? 0) > 1 ? (
              <DomainBar data={data.domain_breakdown} />
            ) : (
              <p className="text-sm text-muted-foreground">
                Not enough sub-domain data to chart yet. Open the unified dashboard for a full cross-domain view.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{W[4].title}</CardTitle>
        </CardHeader>
        <CardContent>
          <FindingsByCloudTable rows={data.findings_by_cloud ?? []} />
        </CardContent>
      </Card>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground">KSPM widgets (expanded)</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {placeholders.map((w) => (
            <Card key={w.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{w.title}</CardTitle>
                <CardDescription className="text-xs">Awaiting API — placeholder</CardDescription>
              </CardHeader>
              <CardContent>
                <NoGraphData />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button asChild variant="default">
          <Link to="/">Unified dashboard</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/findings?domain=kspm">Browse findings</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/inventory/clusters">Inventory — clusters</Link>
        </Button>
      </div>
    </div>
  )
}
