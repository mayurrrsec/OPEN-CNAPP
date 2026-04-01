import { useEffect, useMemo, useState } from 'react'
import { api } from '../api/client'
import PageHeader from '../components/common/PageHeader'
import FilterBar from '../components/common/FilterBar'

type Finding = {
  id: string
  tool: string
  severity: string
  domain: string
  source: string
  cloud_provider?: string
  title: string
  status: string
  created_at?: string
}

export default function Findings() {
  const [findings, setFindings] = useState<Finding[]>([])
  const [severity, setSeverity] = useState('')
  const [domain, setDomain] = useState('')
  const [source, setSource] = useState('')
  const [status, setStatus] = useState('open')

  useEffect(() => {
    api
      .get('/findings', { params: { severity: severity || undefined, domain: domain || undefined, source: source || undefined, status: status || undefined } })
      .then((r) => setFindings(r.data || []))
      .catch(() => setFindings([]))
  }, [severity, domain, source, status])

  const domains = useMemo(() => Array.from(new Set(findings.map((f) => f.domain).filter(Boolean))).sort(), [findings])

  return (
    <div>
      <PageHeader title='Findings Explorer' subtitle='Filter by severity, domain, source and status. Drill into actionable risks.' />

      <FilterBar>
        <select value={severity} onChange={(e) => setSeverity(e.target.value)}>
          <option value=''>All severities</option>
          <option value='CRITICAL'>CRITICAL</option>
          <option value='HIGH'>HIGH</option>
          <option value='MEDIUM'>MEDIUM</option>
          <option value='LOW'>LOW</option>
        </select>

        <select value={source} onChange={(e) => setSource(e.target.value)}>
          <option value=''>All sources</option>
          <option value='plugin'>plugin scanners</option>
          <option value='native_ingest'>native security</option>
        </select>

        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value='open'>Open</option>
          <option value='resolved'>Resolved</option>
          <option value=''>Any status</option>
        </select>

        <select value={domain} onChange={(e) => setDomain(e.target.value)}>
          <option value=''>All domains</option>
          {domains.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </FilterBar>

      <div className='table-wrap'>
        <table>
          <thead>
            <tr>
              <th>Severity</th>
              <th>Title</th>
              <th>Domain</th>
              <th>Source</th>
              <th>Tool</th>
              <th>Cloud</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {findings.map((f) => (
              <tr key={f.id}>
                <td>
                  <span className={`badge ${f.severity.toLowerCase()}`}>{f.severity}</span>
                </td>
                <td>{f.title}</td>
                <td>{f.domain}</td>
                <td>{f.source}</td>
                <td>{f.tool}</td>
                <td>{f.cloud_provider || '-'}</td>
                <td>{f.status}</td>
              </tr>
            ))}
            {!findings.length ? (
              <tr>
                <td colSpan={7} className='meta'>
                  No findings match current filters.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  )
}
