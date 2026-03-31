import { useEffect, useState } from 'react'
import { api } from '../api/client'

export default function Findings() {
  const [findings, setFindings] = useState<any[]>([])
  const [severity, setSeverity] = useState('')
  const [domain, setDomain] = useState('')

  const load = () => {
    api.get('/findings', { params: { severity: severity || undefined, domain: domain || undefined } })
      .then(r => setFindings(r.data))
      .catch(() => setFindings([]))
  }

  useEffect(() => { load() }, [severity, domain])

  return (
    <div>
      <h2>Findings Explorer</h2>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <select value={severity} onChange={(e) => setSeverity(e.target.value)}>
          <option value=''>All severities</option>
          <option value='CRITICAL'>CRITICAL</option>
          <option value='HIGH'>HIGH</option>
          <option value='MEDIUM'>MEDIUM</option>
          <option value='LOW'>LOW</option>
        </select>
        <input value={domain} onChange={(e) => setDomain(e.target.value)} placeholder='Filter by domain' />
      </div>
      <table>
        <thead>
          <tr><th>Tool</th><th>Severity</th><th>Domain</th><th>Title</th></tr>
        </thead>
        <tbody>
          {findings.map((f: any) => (
            <tr key={f.id}><td>{f.tool}</td><td>{f.severity}</td><td>{f.domain}</td><td>{f.title}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
