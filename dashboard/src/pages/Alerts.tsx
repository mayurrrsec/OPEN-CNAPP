import { useCallback, useState } from 'react'
import { useWebSocket } from '../hooks/useWebSocket'

export default function Alerts() {
  const [events, setEvents] = useState<any[]>([])
  const onMessage = useCallback((msg: any) => setEvents(prev => [msg, ...prev].slice(0, 50)), [])
  useWebSocket((import.meta.env.VITE_WS_URL || 'ws://localhost:8000') + '/ws/alerts', onMessage)

  return (
    <div>
      <h2>Real-time Alerts</h2>
      <pre style={{maxHeight:300, overflow:'auto'}}>{JSON.stringify(events, null, 2)}</pre>
    </div>
  )
}
