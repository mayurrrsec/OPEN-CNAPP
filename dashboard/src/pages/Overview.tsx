import { useEffect, useState } from 'react'
import { api } from '../api/client'
import SeverityDonut from '../components/charts/SeverityDonut'
import TrendLine from '../components/charts/TrendLine'
import DomainBar from '../components/charts/DomainBar'

export default function Overview() {
  const [summary, setSummary] = useState<any>({
    severity_breakdown: [],
    trend: [],
    domain_breakdown: [],
    cloud_breakdown: [],
    top_findings: [],
  })

  useEffect(() => {
    api.get('/dashboard/summary')
      .then(r => setSummary(r.data))
      .catch(() => setSummary({ severity_breakdown: [], trend: [], domain_breakdown: [], cloud_breakdown: [], top_findings: [] }))
  }, [])

  const scorePill = (() => {
    const s = Number(summary.secure_score ?? 0)
    if (s >= 80) return <span className="pill good">Good</span>
    if (s >= 55) return <span className="pill warn">Needs work</span>
    return <span className="pill bad">At risk</span>
  })()

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 className="page-title">Posture Overview</h1>
          <p className="page-subtitle">Risk score, trends, and top issues across CSPM/KSPM/CWPP/CIEM.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="pill">Secure score: <strong>{summary.secure_score ?? '-'}</strong></div>
          {scorePill}
        </div>
      </div>

      <div className="grid cards" style={{ marginTop: 12 }}>
        <div className="card">
          <h3>Total findings</h3>
          <div className="metric">
            <div>
              <div className="metric-value">{summary.total_findings ?? '-'}</div>
              <div className="metric-label">All sources</div>
            </div>
            <span className="pill">Open: <strong>{summary.open_findings ?? '-'}</strong></span>
          </div>
        </div>
        <div className="card">
          <h3>Critical</h3>
          <div className="metric">
            <div>
              <div className="metric-value" style={{ color: 'var(--bad)' }}>{summary.critical ?? '-'}</div>
              <div className="metric-label">Immediate action</div>
            </div>
            <span className="pill bad">Top priority</span>
          </div>
        </div>
        <div className="card">
          <h3>High</h3>
          <div className="metric">
            <div>
              <div className="metric-value" style={{ color: '#f97316' }}>{summary.high ?? '-'}</div>
              <div className="metric-label">Fix next</div>
            </div>
            <span className="pill warn">Elevated</span>
          </div>
        </div>
        <div className="card">
          <h3>Coverage</h3>
          <div className="metric">
            <div>
              <div className="metric-value">{(summary.cloud_breakdown?.length ?? 0) ? summary.cloud_breakdown.length : '-'}</div>
              <div className="metric-label">Clouds detected</div>
            </div>
            <span className="pill">Domains: <strong>{summary.domain_breakdown?.length ?? '-'}</strong></span>
          </div>
        </div>
      </div>

      <div className="grid two" style={{ marginTop: 14 }}>
        <div className="card">
          <SeverityDonut data={summary.severity_breakdown || []} />
        </div>
        <div className="card">
          <DomainBar data={summary.domain_breakdown || []} />
        </div>
      </div>

      <div className="grid two" style={{ marginTop: 14 }}>
        <div className="card">
          <TrendLine data={summary.trend || []} />
        </div>
        <div className="card">
          <h3>Top risky findings (latest)</h3>
          <table className="table">
            <thead>
              <tr>
                <th>Severity</th>
                <th>Domain</th>
                <th>Cloud</th>
                <th>Title</th>
              </tr>
            </thead>
            <tbody>
              {(summary.top_findings || []).slice(0, 8).map((f: any) => (
                <tr key={f.id}>
                  <td><span className={`sev ${String(f.severity || '').toUpperCase()}`}>{String(f.severity || '-').toUpperCase()}</span></td>
                  <td>{f.domain || '-'}</td>
                  <td>{f.cloud_provider || '-'}</td>
                  <td style={{ maxWidth: 520, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.title}</td>
                </tr>
              ))}
              {(!summary.top_findings || summary.top_findings.length === 0) && (
                <tr><td colSpan={4} style={{ color: 'var(--muted)' }}>No findings yet. Ingest CI results or run a scan.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
