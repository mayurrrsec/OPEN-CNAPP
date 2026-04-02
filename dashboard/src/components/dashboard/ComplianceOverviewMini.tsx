import { Link } from 'react-router-dom'
import type { ComplianceOverviewRow } from '@/api/dashboard'

export function ComplianceOverviewMini({ rows }: { rows: ComplianceOverviewRow[] }) {
  const maxF = Math.max(1, ...rows.map((r) => r.findings))
  return (
    <div className="space-y-2">
      {rows.map((r) => (
        <div key={r.framework}>
          <div className="mb-0.5 flex justify-between text-xs">
            <span className="font-medium">{r.framework}</span>
            <span className="text-muted-foreground">{r.findings} mapped</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary/80 transition-all"
              style={{ width: `${Math.min(100, (r.findings / maxF) * 100)}%` }}
            />
          </div>
        </div>
      ))}
      <Link to="/compliance" className="inline-block text-xs font-medium text-primary hover:underline">
        See compliance →
      </Link>
    </div>
  )
}
