import { useEffect, useState } from 'react'
import { api } from '../api/client'

export default function PluginManager() {
  const [plugins, setPlugins] = useState<any[]>([])

  const reload = () => api.get('/plugins').then(r => setPlugins(r.data))

  useEffect(() => { reload() }, [])

  const toggle = async (name: string, enabled: boolean) => {
    await api.patch(`/plugins/${name}/enable`, null, { params: { enabled: !enabled } })
    reload()
  }

  return (
    <div>
      <h2>Plugin Manager</h2>
      <button onClick={() => api.post('/plugins/sync').then(reload)}>Sync plugins</button>
      <ul>
        {plugins.map(p => (
          <li key={p.name}>{p.display_name} ({p.domain}) - {String(p.enabled)} <button onClick={() => toggle(p.name, p.enabled)}>toggle</button></li>
        ))}
      </ul>
    </div>
  )
}
