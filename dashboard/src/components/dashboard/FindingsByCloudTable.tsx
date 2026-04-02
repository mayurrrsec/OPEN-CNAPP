import { Link } from 'react-router-dom'
import type { CloudSeverityRow } from '@/api/dashboard'

export function FindingsByCloudTable({ rows }: { rows: CloudSeverityRow[] }) {
  if (!rows.length) {
    return <p className="text-sm text-muted-foreground">No cloud-tagged findings yet.</p>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[480px] text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <th className="pb-2 pr-2">Provider</th>
            <th className="pb-2 pr-2 text-right">Total</th>
            <th className="pb-2 pr-2 text-right text-red-700 dark:text-red-300">C</th>
            <th className="pb-2 pr-2 text-right text-orange-700 dark:text-orange-300">H</th>
            <th className="pb-2 pr-2 text-right text-amber-800 dark:text-amber-200">M</th>
            <th className="pb-2 text-right text-emerald-800 dark:text-emerald-200">L</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.provider} className="border-b border-border/60">
              <td className="py-2 pr-2 font-medium capitalize">
                <Link to={`/findings?cloud=${encodeURIComponent(r.provider)}`} className="hover:text-primary hover:underline">
                  {r.provider}
                </Link>
              </td>
              <td className="py-2 pr-2 text-right tabular-nums">{r.total}</td>
              <td className="py-2 pr-2 text-right tabular-nums">{r.critical}</td>
              <td className="py-2 pr-2 text-right tabular-nums">{r.high}</td>
              <td className="py-2 pr-2 text-right tabular-nums">{r.medium}</td>
              <td className="py-2 text-right tabular-nums">{r.low + r.info}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
