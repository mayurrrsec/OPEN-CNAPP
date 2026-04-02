import { Link, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Domain-scoped posture widgets will land here (see dashboard implementation plan — widgets per domain).
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Coming next</CardTitle>
          <CardDescription>
            This route is wired for per-domain dashboards (Orca-style domain pivots). The unified home page already
            shows cross-domain rollups.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button asChild variant="default">
            <Link to="/">Back to unified dashboard</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/findings">Browse findings</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
