import { useCallback, useState } from 'react'
import { useWebSocket } from '../hooks/useWebSocket'
import { api } from '../api/client'

export default function Alerts() {
  const [events, setEvents] = useState<any[]>([])
  const [rules, setRules] = useState<any[]>([])
  const [name, setName] = useState('High severity route')
  const [url, setUrl] = useState('')
  const onMessage = useCallback((msg: any) => setEvents(prev => [msg, ...prev].slice(0, 50)), [])
  useWebSocket((import.meta.env.VITE_WS_URL || 'ws://localhost:8000') + '/ws/alerts', onMessage)

  const loadRules = () => api.get('/alerts/rules').then(r => setRules(r.data))
  const addRule = async () => { await api.post('/alerts/rules', { name, notifier_url: url, min_severity: 'HIGH', enabled: true }); loadRules() }
  const test = async () => { await api.post('/alerts/test') }

  return (
    <div>
      <h2>Real-time Alerts</h2>
      <button onClick={loadRules}>Load rules</button>
      <button onClick={test}>Test notifications</button>
      <div style={{display:'flex', gap:8, marginTop:8}}>
        <input value={name} onChange={(e)=>setName(e.target.value)} placeholder='Rule name' />
        <input value={url} onChange={(e)=>setUrl(e.target.value)} placeholder='Apprise URL' />
        <button onClick={addRule}>Add rule</button>
      </div>
      <pre>{JSON.stringify(rules, null, 2)}</pre>
      <pre style={{maxHeight:300, overflow:'auto'}}>{JSON.stringify(events, null, 2)}</pre>
    </div>
  )
}
