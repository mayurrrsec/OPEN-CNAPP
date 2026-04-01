import { useEffect, useState } from 'react'
import { api } from '../api/client'
import ComplianceHeatmap from '../components/charts/ComplianceHeatmap'

export default function Compliance() {
  const [rows, setRows] = useState<any[]>([])
  const [frameworks, setFrameworks] = useState<string[]>([])
  const [selected, setSelected] = useState<string>('ALL')

  useEffect(() => {
    api.get('/compliance/frameworks').then(r => setFrameworks(['ALL', ...(r.data || [])])).catch(() => setFrameworks(['ALL']))
    api.get('/compliance/heatmap').then(r => setRows(r.data)).catch(() => setRows([]))
  }, [])

  const cells = (rows || [])
    .filter((r: any) => selected === 'ALL' ? true : String(r.framework).toUpperCase() === selected.toUpperCase())
    .map((r: any) => ({ label: String(r.framework), value: Number(r.findings || 0) }))

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 className="page-title">Compliance</h1>
          <p className="page-subtitle">Framework rollups and reporting (heatmap v1).</p>
        </div>
        <div className="filters">
          <select value={selected} onChange={(e) => setSelected(e.target.value)}>
            {(frameworks || ['ALL']).map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
          <button onClick={() => api.get('/compliance/heatmap').then(r => setRows(r.data)).catch(() => setRows([]))}>Refresh</button>
        </div>
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <ComplianceHeatmap title={selected === 'ALL' ? 'Framework findings' : `${selected} findings`} cells={cells} />
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <h3>Notes</h3>
        <div style={{ color: 'var(--muted)', fontSize: 13, lineHeight: 1.6 }}>
          This view is currently a framework rollup based on each finding’s <code>compliance</code> tags. Next step is the real control heatmap
          (control domains × pass/fail/partial) and per-control drilldown as described in your v3 spec.
        </div>
      </div>
    </div>
  )
}
