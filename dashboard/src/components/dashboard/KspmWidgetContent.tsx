import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { KspmRollups } from '@/api/dashboard'
import { NoGraphData } from '@/components/ui/NoGraphData'
import type { KspmWidgetDef } from '@/config/kspmDashboardWidgets'

function StatusBadge({ status }: { status: string }) {
  const s = status.toLowerCase()
  const cls =
    s === 'connected'
      ? 'bg-emerald-100 text-emerald-800'
      : s === 'pending'
        ? 'bg-amber-100 text-amber-800'
        : 'bg-rose-100 text-rose-800'
  return <span className={`rounded px-2 py-0.5 text-xs font-medium capitalize ${cls}`}>{status}</span>
}

export function KspmWidgetContent({ w, rollups, trend }: { w: KspmWidgetDef; rollups?: KspmRollups; trend: { day: string; findings: number }[] }) {
  const r = rollups

  if (!r) {
    return <NoGraphData />
  }

  if (w.id === 'cluster-connection-status') {
      return (
        <div className="max-h-40 overflow-auto text-xs">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="py-1 pr-2">Connector</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {r.connectors.map((c) => (
                <tr key={c.name} className="border-b border-border/60">
                  <td className="py-1 pr-2">{c.display_name || c.name}</td>
                  <td>
                    <StatusBadge status={c.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {r.connectors.length === 0 ? <p className="text-muted-foreground">No cluster connectors.</p> : null}
        </div>
      )
  }

  if (r.scope_total === 0 && w.id !== 'clusters-public-exposure') {
    return (
      <div className="text-xs text-muted-foreground">
        <NoGraphData />
        <p className="mt-2 text-center">Ingest KSPM findings (see docs/help/kspm-ingest-runbook.md).</p>
      </div>
    )
  }

  switch (w.id) {
    case 'top-cluster-findings':
      return (
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={r.top_clusters} layout="vertical" margin={{ left: 8, right: 8 }}>
              <XAxis type="number" />
              <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )
    case 'cluster-findings-by-severity':
      return (
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={r.severity_breakdown}>
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )
    case 'cluster-findings-by-asset-type':
    case 'findings-by-asset-categories':
      return (
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={r.resource_type_breakdown} layout="vertical" margin={{ left: 4, right: 8 }}>
              <XAxis type="number" />
              <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="value" fill="hsl(var(--chart-3))" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )
    case 'k8s-findings-trend':
    case 'new-cluster-findings-trend':
      return (
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={trend}>
              <XAxis dataKey="day" tick={{ fontSize: 10 }} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="findings" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )
    case 'clusters-public-exposure':
      return (
        <div className="space-y-1 text-sm">
          <p>
            Heuristic matches (title contains public / exposed / internet):{' '}
            <strong>{r.public_exposure_heuristic_count}</strong>
          </p>
          <p className="text-xs text-muted-foreground">Narrow CSPM-style exposure requires cloud asset context.</p>
        </div>
      )
    case 'policy-coverage':
    case 'hardening-policy-coverage':
    case 'continuous-compliance':
      return (
        <p className="text-sm text-muted-foreground">
          Use Compliance page for framework mapping; findings with compliance tags roll up when present.
        </p>
      )
    case 'k8s-resource-summary':
      return (
        <ul className="space-y-1 text-xs">
          {r.tool_breakdown.slice(0, 6).map((t) => (
            <li key={t.name} className="flex justify-between gap-2 border-b border-border/40 py-0.5">
              <span className="truncate">{t.name}</span>
              <span className="font-medium">{t.value}</span>
            </li>
          ))}
        </ul>
      )
    case 'k8s-risk-posture':
      return <p className="text-sm">KSPM-scoped findings (broader query): {r.scope_total}</p>
    default:
      return <NoGraphData />
  }
}
