import { BarChart2 } from 'lucide-react'

/** AccuKnox-style empty chart placeholder (light theme). */
export function NoGraphData() {
  return (
    <div className="flex min-h-[120px] flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border bg-muted/20">
      <BarChart2 className="h-10 w-10 text-muted-foreground/40" aria-hidden />
      <p className="text-sm text-muted-foreground">No Graph data available!</p>
    </div>
  )
}
