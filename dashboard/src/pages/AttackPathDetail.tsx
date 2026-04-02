import { Link, useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, GitBranch, ShieldAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { fetchAttackStory } from '@/api/attackPaths'

export default function AttackPathDetail() {
  const navigate = useNavigate()
  const rawId = useParams().pathId ?? ''
  const pathId = rawId ? decodeURIComponent(rawId) : ''

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['attack-path', 'story', pathId],
    queryFn: () => fetchAttackStory(pathId),
    enabled: Boolean(pathId),
  })

  if (!pathId) {
    return (
      <EmptyState
        icon={GitBranch}
        title="Missing path"
        description="No attack path id was provided."
        action={{ label: 'Back to attack paths', onClick: () => navigate('/attack-paths') }}
      />
    )
  }

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading attack story…</p>
  }

  if (isError || !data) {
    return (
      <EmptyState
        icon={ShieldAlert}
        title="Could not load attack path"
        description="The path may have been removed or the id is invalid."
        action={{ label: 'Retry', onClick: () => void refetch() }}
      />
    )
  }

  const risk = Number(data.risk ?? 0)
  const riskBadge =
    risk > 50 ? (
      <Badge variant="destructive">High risk</Badge>
    ) : risk > 20 ? (
      <Badge variant="warning">Elevated</Badge>
    ) : (
      <Badge variant="secondary">Informational</Badge>
    )

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="outline" size="sm" asChild>
          <Link to="/attack-paths">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back
          </Link>
        </Button>
        <Badge variant="outline" className="font-mono text-xs">
          {data.path_id.slice(0, 12)}…
        </Badge>
        {riskBadge}
      </div>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Attack flow</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          From <span className="font-medium text-foreground">{data.source}</span> →{' '}
          <span className="font-medium text-foreground">{data.target}</span>
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Impact</CardTitle>
          <CardDescription>Aggregated risk score from findings contributing to this edge.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-baseline gap-4">
          <span className="text-4xl font-bold tabular-nums">{risk.toFixed(1)}</span>
          <span className="text-sm text-muted-foreground">Risk score (severity-weighted)</span>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Attack story</CardTitle>
          <CardDescription>Plain-language steps derived from matching findings (Orca-style narrative).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {data.steps.map((s) => (
            <div key={s.step} className="rounded-lg border border-border bg-muted/30 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-muted-foreground">Step {s.step}</span>
                {s.severity ? <Badge variant="outline">{s.severity}</Badge> : null}
                {s.tool ? <span className="text-xs text-muted-foreground">{s.tool}</span> : null}
              </div>
              <p className="mt-2 font-medium leading-snug">{s.title}</p>
              {s.summary ? <p className="mt-2 text-sm text-muted-foreground">{s.summary}</p> : null}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
