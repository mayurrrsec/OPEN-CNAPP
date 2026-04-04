import { cn } from '@/lib/utils'

const ORDER = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'] as const

/** Hex colors — do not rely on Tailwind palette (may be stripped in minimal builds). */
const BAR_BG: Record<string, string> = {
  CRITICAL: '#e11d48',
  HIGH: '#f97316',
  MEDIUM: '#fbbf24',
  LOW: '#0ea5e9',
  INFO: '#94a3b8',
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
            className="h-full min-w-[2px]"
            style={{ width: `${pct}%`, backgroundColor: BAR_BG[k] ?? '#94a3b8' }}
          />
        )
      })}
    </div>
  )
}
