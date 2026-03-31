import { useCallback, useState } from 'react'
import { useWebSocket } from '../hooks/useWebSocket'

export default function ScanProgress() {
  const [events, setEvents] = useState<any[]>([])
  const onMessage = useCallback((msg: any) => setEvents((prev) => [msg, ...prev].slice(0, 30)), [])
  useWebSocket((import.meta.env.VITE_WS_URL || 'ws://localhost:8000') + '/ws/scan-progress', onMessage)
  return <pre style={{maxHeight:220, overflow:'auto'}}>{JSON.stringify(events, null, 2)}</pre>
}
