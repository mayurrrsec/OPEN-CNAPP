import { useEffect, useState } from 'react'
import { api } from '../api/client'

export default function Connectors() {
  const [connectors, setConnectors] = useState<any[]>([])
  useEffect(() => { api.get('/connectors').then(r => setConnectors(r.data)) }, [])
  return <div><h2>Connectors</h2><pre>{JSON.stringify(connectors, null, 2)}</pre></div>
}
