import { useCallback, useState } from 'react'
import { Radio } from 'lucide-react'
import { useWebSocket } from '../hooks/useWebSocket'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/EmptyState'

export default function ScanProgress() {
  const [events, setEvents] = useState<unknown[]>([])
  const onMessage = useCallback((msg: unknown) => setEvents((prev) => [msg, ...prev].slice(0, 30)), [])
  useWebSocket((import.meta.env.VITE_WS_URL || 'ws://localhost:8000') + '/ws/scan-progress', onMessage)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Scan progress stream</CardTitle>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <EmptyState
            icon={Radio}
            title="Waiting for events"
            description="When the API emits scan progress over the WebSocket, events will appear here in real time."
          />
        ) : (
          <pre className="max-h-[220px] overflow-auto rounded-md border border-border bg-muted/30 p-3 text-xs">
            {JSON.stringify(events, null, 2)}
          </pre>
        )}
      </CardContent>
    </Card>
  )
}
