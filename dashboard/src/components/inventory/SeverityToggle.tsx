import { cn } from '@/lib/utils'

export const SEVERITY_KEYS = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'] as const

const STYLES: Record<string, string> = {
  CRITICAL: 'data-[on=true]:border-rose-600 data-[on=true]:bg-rose-50 data-[on=true]:text-rose-900',
  HIGH: 'data-[on=true]:border-orange-500 data-[on=true]:bg-orange-50 data-[on=true]:text-orange-900',
  MEDIUM: 'data-[on=true]:border-amber-500 data-[on=true]:bg-amber-50 data-[on=true]:text-amber-900',
  LOW: 'data-[on=true]:border-sky-500 data-[on=true]:bg-sky-50 data-[on=true]:text-sky-900',
  INFO: 'data-[on=true]:border-slate-400 data-[on=true]:bg-slate-50 data-[on=true]:text-slate-800',
}

type Props = {
  value: Record<string, boolean>
  onChange: (next: Record<string, boolean>) => void
  className?: string
}

export function SeverityToggle({ value, onChange, className }: Props) {
  const toggle = (k: string) => {
    const next = { ...value, [k]: !value[k] }
    const anyOn = SEVERITY_KEYS.some((s) => next[s])
    if (!anyOn) {
      onChange(Object.fromEntries(SEVERITY_KEYS.map((s) => [s, true])))
      return
    }
    onChange(next)
  }

  return (
    <div className={cn('flex flex-wrap gap-1', className)}>
      {SEVERITY_KEYS.map((k) => (
        <button
          key={k}
          type="button"
          data-on={value[k] ? 'true' : 'false'}
          className={cn(
            'rounded border border-border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground transition-colors',
            STYLES[k],
            value[k] ? '' : 'opacity-50'
          )}
          onClick={() => toggle(k)}
        >
          {k[0]}
        </button>
      ))}
    </div>
  )
}

export function severityQueryParam(value: Record<string, boolean>): string {
  const active = SEVERITY_KEYS.filter((s) => value[s])
  if (active.length === SEVERITY_KEYS.length) return 'all'
  return active.join(',')
}
