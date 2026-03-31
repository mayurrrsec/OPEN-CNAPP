import { useEffect, useState } from 'react'
import { api } from '../api/client'

export default function Overview() {
  const [summary, setSummary] = useState<any>({})

  useEffect(() => {
    api.get('/dashboard/summary').then(r => setSummary(r.data)).catch(() => setSummary({}))
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
    </div>
  )
}
