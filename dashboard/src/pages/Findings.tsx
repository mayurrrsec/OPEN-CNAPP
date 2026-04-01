import { useEffect, useMemo, useState } from 'react'
import { api } from '../api/client'

type Finding = {
  id: string
  tool: string
  severity: string
  domain: string
  cloud_provider?: string | null
  status: string
  title: string
  resource_id?: string | null
  resource_name?: string | null
  check_id?: string | null
  remediation?: string | null
  description?: string | null
  created_at?: string
  raw?: any
  compliance?: string[]
  assigned_to?: string | null
  ticket_ref?: string | null
}

export default function Findings() {
  const [items, setItems] = useState<Finding[]>([])
  const [total, setTotal] = useState(0)

  const [severity, setSeverity] = useState('')
  const [domain, setDomain] = useState('')
  const [cloud, setCloud] = useState('')
  const [status, setStatus] = useState('')
  const [tool, setTool] = useState('')
  const [query, setQuery] = useState('')

  const [sort, setSort] = useState<'created_at' | 'severity' | 'domain' | 'tool' | 'status' | 'cloud_provider'>('created_at')
  const [order, setOrder] = useState<'desc' | 'asc'>('desc')
  const [page, setPage] = useState(0)
  const limit = 25

  const [selected, setSelected] = useState<Finding | null>(null)
  const [saving, setSaving] = useState(false)
  const [assignTo, setAssignTo] = useState('')
  const [ticketRef, setTicketRef] = useState('')
  const [newStatus, setNewStatus] = useState('')

  const load = () => {
    api.get('/findings', {
      params: {
        severity: severity || undefined,
        domain: domain || undefined,
        cloud_provider: cloud || undefined,
        status: status || undefined,
        tool: tool || undefined,
        q: query || undefined,
        limit,
        offset: page * limit,
        sort,
        order,
      }
    })
      .then(r => {
        setItems(r.data.items || [])
        setTotal(r.data.total || 0)
      })
      .catch(() => { setItems([]); setTotal(0) })
  }

  useEffect(() => { load() }, [severity, domain, cloud, status, tool, query, page, sort, order])

  const pageCount = useMemo(() => Math.max(1, Math.ceil(total / limit)), [total])

  const openDrawer = async (id: string) => {
    try {
      const res = await api.get(`/findings/${id}`)
      setSelected(res.data)
      setAssignTo(res.data.assigned_to || '')
      setTicketRef(res.data.ticket_ref || '')
      setNewStatus(res.data.status || '')
    } catch {
      // ignore
    }
  }

  const saveLifecycle = async () => {
    if (!selected) return
    setSaving(true)
    try {
      await api.patch(`/findings/${selected.id}`, null, {
        params: {
          status: newStatus || undefined,
          assigned_to: assignTo,
          ticket_ref: ticketRef,
        }
      })
      await openDrawer(selected.id)
      load()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 className="page-title">Findings Explorer</h1>
          <p className="page-subtitle">Filter, triage, assign, and track findings to closure.</p>
        </div>
        <div className="pill">Total: <strong>{total}</strong></div>
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <div className="filters">
          <select value={severity} onChange={(e) => { setPage(0); setSeverity(e.target.value) }}>
            <option value=''>Severity: All</option>
            <option value='CRITICAL'>CRITICAL</option>
            <option value='HIGH'>HIGH</option>
            <option value='MEDIUM'>MEDIUM</option>
            <option value='LOW'>LOW</option>
            <option value='INFO'>INFO</option>
          </select>
          <input value={domain} onChange={(e) => { setPage(0); setDomain(e.target.value) }} placeholder='Domain (cspm, kspm, iac...)' />
          <input value={tool} onChange={(e) => { setPage(0); setTool(e.target.value) }} placeholder='Tool (prowler, trivy...)' />
          <input value={cloud} onChange={(e) => { setPage(0); setCloud(e.target.value) }} placeholder='Cloud (azure, aws...)' />
          <select value={status} onChange={(e) => { setPage(0); setStatus(e.target.value) }}>
            <option value=''>Status: All</option>
            <option value='open'>open</option>
            <option value='assigned'>assigned</option>
            <option value='accepted_risk'>accepted_risk</option>
            <option value='false_positive'>false_positive</option>
            <option value='fixed'>fixed</option>
            <option value='reopened'>reopened</option>
          </select>
          <input value={query} onChange={(e) => { setPage(0); setQuery(e.target.value) }} placeholder='Search title/resource/check...' style={{ minWidth: 280, flex: 1 }} />
          <select value={sort} onChange={(e) => setSort(e.target.value as any)}>
            <option value='created_at'>Sort: Created</option>
            <option value='severity'>Sort: Severity</option>
            <option value='domain'>Sort: Domain</option>
            <option value='tool'>Sort: Tool</option>
            <option value='status'>Sort: Status</option>
            <option value='cloud_provider'>Sort: Cloud</option>
          </select>
          <select value={order} onChange={(e) => setOrder(e.target.value as any)}>
            <option value='desc'>Order: Desc</option>
            <option value='asc'>Order: Asc</option>
          </select>
          <button onClick={() => load()}>Refresh</button>
        </div>
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <table className="table">
          <thead>
            <tr>
              <th>Severity</th>
              <th>Domain</th>
              <th>Tool</th>
              <th>Cloud</th>
              <th>Status</th>
              <th>Title</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.map((f) => (
              <tr key={f.id}>
                <td><span className={`sev ${String(f.severity || '').toUpperCase()}`}>{String(f.severity || '-').toUpperCase()}</span></td>
                <td>{f.domain}</td>
                <td>{f.tool}</td>
                <td>{f.cloud_provider || '-'}</td>
                <td>{f.status}</td>
                <td style={{ maxWidth: 520, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.title}</td>
                <td><button className="btn-secondary" onClick={() => openDrawer(f.id)}>View</button></td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr><td colSpan={7} style={{ color: 'var(--muted)' }}>No results. Try widening filters or ingest findings.</td></tr>
            )}
          </tbody>
        </table>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, gap: 10, flexWrap: 'wrap' }}>
          <div className="pill">Page <strong>{page + 1}</strong> / <strong>{pageCount}</strong></div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-secondary" disabled={page <= 0} onClick={() => setPage(p => Math.max(0, p - 1))}>Prev</button>
            <button className="btn-secondary" disabled={(page + 1) >= pageCount} onClick={() => setPage(p => p + 1)}>Next</button>
          </div>
        </div>
      </div>

      {selected && (
        <div className="drawer-backdrop" onClick={() => setSelected(null)}>
          <div className="drawer" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
              <div>
                <div className="pill">ID: <strong>{selected.id}</strong></div>
              </div>
              <button className="btn-secondary" onClick={() => setSelected(null)}>Close</button>
            </div>
            <h2 style={{ marginTop: 10 }}>{selected.title}</h2>
            <div className="row">
              <div><div className="metric-label">Severity</div><div className={`sev ${String(selected.severity || '').toUpperCase()}`}>{String(selected.severity || '').toUpperCase()}</div></div>
              <div><div className="metric-label">Domain</div><div>{selected.domain}</div></div>
              <div><div className="metric-label">Tool</div><div>{selected.tool}</div></div>
              <div><div className="metric-label">Cloud</div><div>{selected.cloud_provider || '-'}</div></div>
              <div><div className="metric-label">Status</div><div>{selected.status}</div></div>
            </div>

            <div className="card" style={{ marginTop: 12 }}>
              <h3>Lifecycle</h3>
              <div className="filters">
                <select value={newStatus} onChange={(e) => setNewStatus(e.target.value)}>
                  <option value='open'>open</option>
                  <option value='assigned'>assigned</option>
                  <option value='accepted_risk'>accepted_risk</option>
                  <option value='false_positive'>false_positive</option>
                  <option value='fixed'>fixed</option>
                  <option value='reopened'>reopened</option>
                </select>
                <input value={assignTo} onChange={(e) => setAssignTo(e.target.value)} placeholder='Assignee' />
                <input value={ticketRef} onChange={(e) => setTicketRef(e.target.value)} placeholder='Ticket URL / ref' style={{ minWidth: 220, flex: 1 }} />
                <button onClick={saveLifecycle} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
              </div>
            </div>

            {(selected.resource_id || selected.resource_name || selected.check_id) && (
              <div className="card" style={{ marginTop: 12 }}>
                <h3>Context</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div><div className="metric-label">Resource ID</div><div style={{ wordBreak: 'break-word' }}>{selected.resource_id || '-'}</div></div>
                  <div><div className="metric-label">Resource name</div><div style={{ wordBreak: 'break-word' }}>{selected.resource_name || '-'}</div></div>
                  <div><div className="metric-label">Check ID</div><div style={{ wordBreak: 'break-word' }}>{selected.check_id || '-'}</div></div>
                  <div><div className="metric-label">Compliance</div><div style={{ wordBreak: 'break-word' }}>{(selected.compliance || []).join(', ') || '-'}</div></div>
                </div>
              </div>
            )}

            {(selected.description || selected.remediation) && (
              <div className="card" style={{ marginTop: 12 }}>
                <h3>Details</h3>
                {selected.description && <div style={{ color: 'var(--muted)', whiteSpace: 'pre-wrap' }}>{selected.description}</div>}
                {selected.remediation && (
                  <div style={{ marginTop: 10 }}>
                    <div className="metric-label">Remediation</div>
                    <div style={{ whiteSpace: 'pre-wrap' }}>{selected.remediation}</div>
                  </div>
                )}
              </div>
            )}

            <div className="card" style={{ marginTop: 12 }}>
              <h3>Raw</h3>
              <pre style={{ maxHeight: 340, overflow: 'auto' }}>{JSON.stringify(selected.raw || {}, null, 2)}</pre>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
