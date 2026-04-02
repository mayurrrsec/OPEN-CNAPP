import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'

type StatCardProps = {
  label: string
  value: ReactNode
  hint?: ReactNode
  badge?: ReactNode
  accent?: 'critical' | 'high' | 'neutral'
  onClick?: () => void
}

export function StatCard({ label, value, hint, badge, accent = 'neutral', onClick }: StatCardProps) {
  return (
    <Card
      className={cn(
        'transition-shadow',
        onClick && 'cursor-pointer hover:shadow-md',
        accent === 'critical' && 'border-l-4 border-l-red-600',
        accent === 'high' && 'border-l-4 border-l-orange-500'
      )}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <CardContent className="p-5">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <div className="mt-2 flex items-end justify-between gap-3">
          <div>
            <div className="text-3xl font-bold tabular-nums tracking-tight">{value}</div>
            {hint ? <div className="mt-1 text-xs text-muted-foreground">{hint}</div> : null}
          </div>
          {badge}
        </div>
      </CardContent>
    </Card>
  )
}
