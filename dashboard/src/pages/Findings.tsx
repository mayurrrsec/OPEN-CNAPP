import { useFindings } from '../hooks/useFindings'

export default function Findings() {
  const findings = useFindings()

  return (
    <div>
      <h2>Findings Explorer</h2>
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
