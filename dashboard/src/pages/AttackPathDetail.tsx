import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { AttackFlowGraph } from '@/components/attack-paths/AttackFlowGraph'
import {
  fetchAttackPathDetail,
  fetchAttackPathGraph,
  type AttackPathGraphNode,
  type AttackPathDetailResponse,
  type AttackPathGraphResponse,
} from '@/api/attackPaths'
import { api } from '@/api/client'

export default function AttackPathDetail() {
  const { pathId } = useParams<{ pathId: string }>()
  const [detail, setDetail] = useState<AttackPathDetailResponse | null>(null)
  const [graph, setGraph] = useState<AttackPathGraphResponse | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [panelNode, setPanelNode] = useState<AttackPathGraphNode | null>(null)
  const [assetPanel, setAssetPanel] = useState<{
    findings: { id: string; title: string; severity?: string; tool?: string }[]
  } | null>(null)

  useEffect(() => {
    if (!pathId) return
    setLoading(true)
    setErr(null)
    Promise.all([fetchAttackPathDetail(pathId), fetchAttackPathGraph(pathId)])
      .then(([d, g]) => {
        setDetail(d)
        setGraph(g)
      })
      .catch((e) => setErr(String(e?.response?.data?.detail || e?.message || e)))
      .finally(() => setLoading(false))
  }, [pathId])

  useEffect(() => {
    if (!panelNode?.id || panelNode.type === 'internet') {
      setAssetPanel(null)
      return
    }
    const rid = panelNode.resource_id || panelNode.label
    if (!rid) return
    api
      .get<{ findings: { id: string; title: string; severity?: string; tool?: string }[] }>(
        '/attack-paths/assets',
        { params: { resource_id: rid } }
      )
      .then((r) => setAssetPanel({ findings: r.data.findings || [] }))
      .catch(() => setAssetPanel({ findings: [] }))
  }, [panelNode])

  if (!pathId) {
    return <div className="p-6 text-sm text-muted-foreground">Missing path id.</div>
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-6 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading attack path…
      </div>
    )
  }

  if (err || !detail) {
    return (
      <div className="space-y-4 p-6">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/attack-paths">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Link>
        </Button>
        <p className="text-destructive">{err || 'Not found'}</p>
      </div>
    )
  }

  const p = detail.path

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Button variant="ghost" size="sm" className="mb-2 -ml-2" asChild>
            <Link to="/attack-paths">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Attack paths
            </Link>
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">{p.title}</h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Impact {p.impact_score?.toFixed(0)} · Probability {p.probability_score?.toFixed(0)} · Risk {p.risk_score?.toFixed(0)} ·{' '}
            {p.cloud_provider || '—'} {p.account_id ? `· ${p.account_id}` : ''}
          </p>
        </div>
        <div className="flex gap-2">
          <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium">{p.impact_band}</span>
        </div>
      </div>

      {graph ? (
        <Card>
          <CardHeader>
            <CardTitle>Attack flow</CardTitle>
            <CardDescription>Horizontal graph from backend layout (D3-rendered).</CardDescription>
          </CardHeader>
          <CardContent>
            <AttackFlowGraph data={graph} onSelectNode={(n) => setPanelNode(n)} />
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Attack story</CardTitle>
            <CardDescription>Steps derived from findings.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {detail.attack_story.map((s) => (
              <div key={s.step} className="rounded-lg border border-border bg-muted/20 p-3">
                <div className="text-xs text-muted-foreground">Step {s.step}</div>
                <div className="font-medium">{s.title}</div>
                {s.text ? <p className="mt-1 text-muted-foreground">{s.text}</p> : null}
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Timeline</CardTitle>
            <CardDescription>Finding activity and path updates.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            {detail.timeline.map((t, i) => (
              <div key={i} className="flex justify-between gap-2 border-b border-border/60 py-1">
                <span>{t.title}</span>
                <span className="text-muted-foreground">{t.at || '—'}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Sheet open={!!panelNode} onOpenChange={(o) => !o && setPanelNode(null)}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{panelNode?.label || 'Node'}</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-3 text-sm">
            <div>
              <div className="text-xs text-muted-foreground">Type</div>
              <div>{panelNode?.type}</div>
            </div>
            {panelNode?.account ? (
              <div>
                <div className="text-xs text-muted-foreground">Account</div>
                <div>{panelNode.account}</div>
              </div>
            ) : null}
            <div>
              <div className="text-xs text-muted-foreground">Related findings</div>
              <ul className="mt-1 list-disc space-y-1 pl-4">
                {(assetPanel?.findings || []).slice(0, 12).map((f) => (
                  <li key={f.id}>
                    <span className="font-medium">{f.severity}</span> — {f.title}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
