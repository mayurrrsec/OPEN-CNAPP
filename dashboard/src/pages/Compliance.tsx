import { useEffect, useState } from 'react'
import { api } from '../api/client'

export default function Compliance() {
  const [rows, setRows] = useState<any[]>([])
  useEffect(() => { api.get('/compliance/heatmap').then(r => setRows(r.data)).catch(() => setRows([])) }, [])

  return (
    <div>
      <h2>Compliance Heatmap</h2>
      <table>
        <thead><tr><th>Framework</th><th>Findings</th></tr></thead>
        <tbody>{rows.map(r => <tr key={r.framework}><td>{r.framework}</td><td>{r.findings}</td></tr>)}</tbody>
      </table>
    </div>
  )
}
