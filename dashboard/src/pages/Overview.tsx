import { useEffect, useState } from 'react'
import { api } from '../api/client'
import SeverityDonut from '../components/charts/SeverityDonut'
import TrendLine from '../components/charts/TrendLine'
import DomainBar from '../components/charts/DomainBar'

export default function Overview() {
  const [summary, setSummary] = useState<any>({ severity_breakdown: [], trend: [], domain_breakdown: [] })

  useEffect(() => {
    api.get('/dashboard/summary').then(r => setSummary(r.data)).catch(() => setSummary({ severity_breakdown: [], trend: [], domain_breakdown: [] }))
  }, [])

  return (
    <div>
      <h2>Posture Overview</h2>
      <ul>
        <li>Secure score: {summary.secure_score ?? '-'}</li>
        <li>Total findings: {summary.total_findings ?? '-'}</li>
        <li>Open findings: {summary.open_findings ?? '-'}</li>
        <li>Critical findings: {summary.critical ?? '-'}</li>
      </ul>

      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
        <SeverityDonut data={summary.severity_breakdown || []} />
        <DomainBar data={summary.domain_breakdown || []} />
        <TrendLine data={summary.trend || []} />
      </div>
    </div>
  )
}
