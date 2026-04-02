import { Link } from 'react-router-dom'
import { GitBranch } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function AttackPathSummaryCard({
  summary,
}: {
  summary: { high_impact: number; medium_impact: number; low_impact: number; edge_count: number }
}) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg border border-border bg-red-500/10 p-2">
          <div className="text-[10px] font-semibold uppercase text-muted-foreground">High</div>
          <div className="text-xl font-bold text-red-700 dark:text-red-300">{summary.high_impact}</div>
        </div>
        <div className="rounded-lg border border-border bg-amber-500/10 p-2">
          <div className="text-[10px] font-semibold uppercase text-muted-foreground">Med</div>
          <div className="text-xl font-bold text-amber-800 dark:text-amber-200">{summary.medium_impact}</div>
        </div>
        <div className="rounded-lg border border-border bg-slate-500/10 p-2">
          <div className="text-[10px] font-semibold uppercase text-muted-foreground">Low</div>
          <div className="text-xl font-bold text-slate-700 dark:text-slate-300">{summary.low_impact}</div>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        <strong>{summary.edge_count}</strong> relationships analyzed in the current path graph.
      </p>
      <Button variant="outline" size="sm" className="w-full gap-2" asChild>
        <Link to="/attack-paths">
          <GitBranch className="h-4 w-4" />
          Open attack paths
        </Link>
      </Button>
    </div>
  )
}
