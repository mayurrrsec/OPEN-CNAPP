import { cn } from '@/lib/utils'

type Cell = {
  label: string
  value: number
}

function colorFor(v: number, max: number) {
  if (max <= 0) return 'hsl(var(--muted) / 0.25)'
  const t = Math.min(1, Math.max(0, v / max))
  return `hsl(var(--primary) / ${0.12 + t * 0.45})`
}

/** Framework rollup cards (top-level counts). */
export function FrameworkRollup({
  title,
  cells,
}: {
  title: string
  cells: Cell[]
}) {
  const max = Math.max(0, ...cells.map((c) => c.value))

  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold text-foreground">{title}</h3>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {cells.map((c) => (
          <div
            key={c.label}
            className="rounded-xl border border-border p-3 shadow-sm transition-colors"
            style={{ background: colorFor(c.value, max) }}
          >
            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{c.label}</div>
            <div className="mt-1 text-2xl font-bold tabular-nums text-foreground">{c.value}</div>
            <div className="mt-0.5 text-xs text-muted-foreground">Mapped findings</div>
          </div>
        ))}
      </div>
    </div>
  )
}

type ControlRow = {
  control: string
  framework: string | null
  critical: number
  high: number
  medium: number
  low: number
  info: number
}

function statusTone(r: ControlRow) {
  const fail = r.critical + r.high
  if (fail > 0) return 'border-l-4 border-l-red-600'
  if (r.medium > 0) return 'border-l-4 border-l-amber-500'
  return 'border-l-4 border-l-emerald-600/70'
}

/** Control-level heatmap / severity breakdown (drilldown list). */
export function ControlSeverityGrid({
  rows,
  selectedControl,
  onSelect,
}: {
  rows: ControlRow[]
  selectedControl: string | null
  onSelect: (control: string | null) => void
}) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No compliance tags on findings yet. Tag findings with framework controls to populate this matrix.
      </p>
    )
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/40 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <th className="px-3 py-2">Control / tag</th>
            <th className="px-3 py-2">Framework</th>
            <th className="px-3 py-2 text-center">Critical</th>
            <th className="px-3 py-2 text-center">High</th>
            <th className="px-3 py-2 text-center">Med</th>
            <th className="px-3 py-2 text-center">Low</th>
            <th className="px-3 py-2 text-center">Info</th>
          </tr>
        </thead>
        <tbody>
          {rows.slice(0, 80).map((r) => {
            const active = selectedControl === r.control
            return (
              <tr
                key={r.control}
                className={cn(
                  'cursor-pointer border-b border-border/60 hover:bg-muted/30',
                  statusTone(r),
                  active && 'bg-primary/5'
                )}
                onClick={() => onSelect(active ? null : r.control)}
              >
                <td className="max-w-md px-3 py-2 font-medium text-foreground">
                  <span className="line-clamp-2">{r.control}</span>
                </td>
                <td className="px-3 py-2 text-muted-foreground">{r.framework ?? '—'}</td>
                <td className="px-3 py-2 text-center tabular-nums text-red-700 dark:text-red-300">{r.critical}</td>
                <td className="px-3 py-2 text-center tabular-nums text-orange-700 dark:text-orange-300">{r.high}</td>
                <td className="px-3 py-2 text-center tabular-nums text-amber-800 dark:text-amber-200">{r.medium}</td>
                <td className="px-3 py-2 text-center tabular-nums text-emerald-800 dark:text-emerald-200">{r.low}</td>
                <td className="px-3 py-2 text-center tabular-nums text-muted-foreground">{r.info}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
      {rows.length > 80 ? (
        <p className="border-t border-border px-3 py-2 text-xs text-muted-foreground">
          Showing first 80 controls. Narrow with framework filter or export (coming soon).
        </p>
      ) : null}
    </div>
  )
}
