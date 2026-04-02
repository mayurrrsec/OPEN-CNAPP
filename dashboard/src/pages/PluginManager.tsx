import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Puzzle, RefreshCw, Zap } from 'lucide-react'
import { api } from '../api/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

type PluginRow = {
  name: string
  display_name: string
  domain: string | null
  enabled: boolean
  run_mode?: string | null
  schedule?: string | null
  finding_count?: number
}

export default function PluginManager() {
  const qc = useQueryClient()

  const { data: plugins = [], isLoading } = useQuery({
    queryKey: ['plugins'],
    queryFn: () => api.get<PluginRow[]>('/plugins').then((r) => r.data),
  })

  const syncMutation = useMutation({
    mutationFn: () => api.post('/plugins/sync'),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['plugins'] }),
  })

  const toggleMutation = useMutation({
    mutationFn: ({ name, enabled }: { name: string; enabled: boolean }) =>
      api.patch(`/plugins/${encodeURIComponent(name)}/enable`, null, { params: { enabled } }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['plugins'] }),
  })

  const grouped = plugins.reduce<Record<string, PluginRow[]>>((acc, p) => {
    const d = (p.domain || 'general').toLowerCase()
    if (!acc[d]) acc[d] = []
    acc[d].push(p)
    return acc
  }, {})

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Plugin manager</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Enable scanners, sync YAML from <code className="rounded bg-muted px-1">plugins/</code>, and see ingest volume per tool.
          </p>
        </div>
        <Button
          type="button"
          variant="default"
          disabled={syncMutation.isPending}
          onClick={() => syncMutation.mutate()}
        >
          <RefreshCw className={cn('mr-2 h-4 w-4', syncMutation.isPending && 'animate-spin')} />
          Sync plugins
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading plugins…</p>
      ) : (
        Object.entries(grouped)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([domain, items]) => (
            <div key={domain}>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">{domain}</h2>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {items.map((p) => (
                  <Card key={p.name} className={cn(!p.enabled && 'opacity-80')}>
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                            <Puzzle className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <CardTitle className="text-base">{p.display_name}</CardTitle>
                            <CardDescription className="font-mono text-xs">{p.name}</CardDescription>
                          </div>
                        </div>
                        {p.enabled ? (
                          <Badge variant="success">On</Badge>
                        ) : (
                          <Badge variant="secondary">Off</Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                        {p.run_mode ? <span>Run: {p.run_mode}</span> : null}
                        {p.schedule ? <span>· {p.schedule}</span> : null}
                      </div>
                      <div className="flex items-center justify-between border-t border-border pt-3">
                        <div className="flex items-center gap-1.5 text-sm">
                          <Zap className="h-4 w-4 text-amber-600" />
                          <span className="text-muted-foreground">Findings ingested</span>
                          <span className="font-bold tabular-nums text-foreground">{p.finding_count ?? 0}</span>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={toggleMutation.isPending}
                          onClick={() =>
                            toggleMutation.mutate({ name: p.name, enabled: !p.enabled })
                          }
                        >
                          {p.enabled ? 'Disable' : 'Enable'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))
      )}
    </div>
  )
}
