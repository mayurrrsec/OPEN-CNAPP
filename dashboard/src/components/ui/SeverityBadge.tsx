import { cn } from '@/lib/utils'

const SEVERITY_STYLES: Record<string, string> = {
  CRITICAL: 'bg-red-600/15 text-red-700 dark:text-red-300 border-red-600/25',
  HIGH: 'bg-orange-500/15 text-orange-800 dark:text-orange-200 border-orange-500/25',
  MEDIUM: 'bg-amber-500/15 text-amber-900 dark:text-amber-200 border-amber-500/25',
  LOW: 'bg-emerald-600/15 text-emerald-800 dark:text-emerald-200 border-emerald-600/25',
  INFO: 'bg-slate-500/15 text-slate-800 dark:text-slate-200 border-slate-500/25',
}

export function SeverityBadge({ severity }: { severity: string }) {
  const key = String(severity || 'UNKNOWN').toUpperCase()
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide',
        SEVERITY_STYLES[key] ?? 'bg-muted text-muted-foreground border-border'
      )}
    >
      {key}
    </span>
  )
}
