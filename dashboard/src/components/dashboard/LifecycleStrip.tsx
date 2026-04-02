import { Badge } from '@/components/ui/badge'

const ORDER = ['open', 'assigned', 'accepted_risk', 'false_positive', 'fixed', 'reopened']

export function LifecycleStrip({ lifecycle }: { lifecycle: Record<string, number> }) {
  const entries = ORDER.filter((k) => (lifecycle[k] ?? 0) > 0).map((k) => ({ k, v: lifecycle[k] ?? 0 }))
  if (entries.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No status distribution yet — findings will appear here as they move through triage.
      </p>
    )
  }
  const total = entries.reduce((a, b) => a + b.v, 0)
  return (
    <div className="flex flex-wrap gap-2">
      {entries.map(({ k, v }) => (
        <div key={k} className="flex items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-2">
          <Badge variant="secondary" className="font-mono text-[10px] uppercase">
            {k}
          </Badge>
          <span className="text-sm font-semibold tabular-nums">{v}</span>
          <span className="text-xs text-muted-foreground">({total > 0 ? Math.round((v / total) * 100) : 0}%)</span>
        </div>
      ))}
    </div>
  )
}
