import { useEffect } from 'react'

export function useWebSocket(url: string, onMessage: (msg: any) => void) {
  useEffect(() => {
    const ws = new WebSocket(url)
    ws.onmessage = (e) => onMessage(JSON.parse(e.data))
    return () => ws.close()
  }, [url, onMessage])
}
