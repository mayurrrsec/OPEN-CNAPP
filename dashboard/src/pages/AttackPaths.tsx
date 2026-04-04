import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { GitBranch, Loader2, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/EmptyState'
import {
  fetchAttackPathsList,
  fetchAttackPathsLegacyGraph,
  postAttackPathsRebuild,
  type AttackPathsListResponse,
  type LegacyGraphResponse,
} from '@/api/attackPaths'

export default function AttackPaths() {
  const [data, setData] = useState<AttackPathsListResponse | null>(null)
  const [legacy, setLegacy] = useState<LegacyGraphResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [rebuilding, setRebuilding] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    setErr(null)
    Promise.all([
      fetchAttackPathsList({ limit: 100, offset: 0 }),
      fetchAttackPathsLegacyGraph().catch(() => null),
    ])
      .then(([list, g]) => {
        setData(list)
        setLegacy(g)
      })
      .catch((e) => setErr(String(e?.message || e)))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const onRebuild = async () => {
    setRebuilding(true)
    setErr(null)
    try {
      await postAttackPathsRebuild()
      await load()
    } catch (e: unknown) {
      setErr(String((e as { message?: string }).message || e))
    } finally {
      setRebuilding(false)
    }
  }

  const impact = data?.summary?.by_impact

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Attack paths</h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Persisted paths built from all domains in <code className="rounded bg-muted px-1 py-0.5 text-xs">findings</code> (CSPM,
            KSPM, Defender, etc.). Flow graphs use our builder + D3 — not Threatmapper as the graph engine; scanners only feed
            findings via ingest.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" disabled={loading} onClick={() => load()}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button type="button" size="sm" disabled={rebuilding} onClick={() => void onRebuild()}>
            {rebuilding ? 'Rebuilding…' : 'Rebuild paths'}
          </Button>
        </div>
      </div>

      {err ? <p className="text-sm text-destructive">{err}</p> : null}

      {loading && !data ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading…
        </div>
      ) : null}

      {impact ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {(
            [
              ['High', impact.high, '#e11d48'],
              ['Medium', impact.medium, '#f97316'],
              ['Low', impact.low, '#fbbf24'],
              ['Informational', impact.informational, '#64748b'],
            ] as const
          ).map(([label, n, color]) => (
            <Card key={label}>
              <CardHeader className="pb-2">
                <CardDescription>{label}</CardDescription>
                <CardTitle className="text-2xl tabular-nums">{n}</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="h-1 w-full rounded" style={{ backgroundColor: color }} />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}

      {!loading && data && (data.items?.length ?? 0) === 0 ? (
        <EmptyState
          icon={GitBranch}
          title="No attack paths yet"
          description="Ingest findings (any domain), then click Rebuild paths, or wait for automatic rebuild after ingest."
          action={{ label: 'Open plugins', onClick: () => (window.location.href = '/plugins') }}
        />
      ) : null}

      {data && data.items && data.items.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Paths ({data.summary?.total_paths ?? data.total})</CardTitle>
            <CardDescription>Open a row for the Orca-style flow, story, and timeline.</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="py-2 pr-3">Title</th>
                  <th className="py-2 pr-3">Impact</th>
                  <th className="py-2 pr-3">Band</th>
                  <th className="py-2 pr-3">Cloud</th>
                  <th className="py-2">Flow</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((p) => (
                  <tr key={p.id} className="border-b border-border/60">
                    <td className="max-w-md py-2 pr-3">
                      <div className="font-medium line-clamp-2">{p.title}</div>
                      <div className="text-xs text-muted-foreground line-clamp-1">
                        {p.source_resource_id} → {p.target_resource_id}
                      </div>
                    </td>
                    <td className="whitespace-nowrap py-2 pr-3 tabular-nums">{p.impact_score?.toFixed(0)}</td>
                    <td className="py-2 pr-3">{p.impact_band}</td>
                    <td className="py-2 pr-3">{p.cloud_provider || '—'}</td>
                    <td className="py-2">
                      <Button variant="link" className="h-auto p-0" asChild>
                        <Link to={`/attack-paths/${encodeURIComponent(p.id)}`}>View flow</Link>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      ) : null}

      {legacy && (legacy.nodes?.length ?? 0) > 0 ? (
        <p className="text-xs text-muted-foreground">
          Legacy aggregate graph: {legacy.meta?.node_count ?? legacy.nodes.length} nodes ·{' '}
          {legacy.meta?.edge_count ?? legacy.edges.length} edges (widget compatibility).
        </p>
      ) : null}
    </div>
  )
}
