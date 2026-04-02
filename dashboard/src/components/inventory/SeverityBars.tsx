import { cn } from '@/lib/utils'

const ORDER = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'] as const

const BAR: Record<string, string> = {
  CRITICAL: 'bg-rose-600',
  HIGH: 'bg-orange-500',
  MEDIUM: 'bg-amber-400',
  LOW: 'bg-sky-500',
  INFO: 'bg-slate-400',
}

export type SeverityBreakdown = Partial<Record<(typeof ORDER)[number], number>>

type Props = {
  breakdown: SeverityBreakdown
  className?: string
}

export function SeverityBars({ breakdown, className }: Props) {
  const total = ORDER.reduce((s, k) => s + (breakdown[k] ?? 0), 0)
  if (total <= 0) {
    return <span className="text-xs text-muted-foreground">—</span>
  }
  return (
    <div className={cn('flex h-2 w-full min-w-[80px] overflow-hidden rounded bg-muted', className)} title={String(total)}>
      {ORDER.map((k) => {
        const n = breakdown[k] ?? 0
        if (!n) return null
        const pct = (n / total) * 100
        return (
          <div
            key={k}
            className={cn('h-full min-w-[2px]', BAR[k])}
            style={{ width: `${pct}%` }}
          />
        )
      })}
    </div>
  )
}
