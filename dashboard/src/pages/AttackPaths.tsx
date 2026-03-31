import { useEffect, useState } from 'react'
import { api } from '../api/client'

export default function AttackPaths() {
  const [graph, setGraph] = useState<{nodes:any[], edges:any[]}>({nodes:[], edges:[]})
  useEffect(() => { api.get('/attack-paths').then(r => setGraph(r.data)).catch(() => setGraph({nodes:[], edges:[]})) }, [])

  return (
    <div>
      <h2>Attack Paths</h2>
      <p>Nodes: {graph.nodes.length} | Edges: {graph.edges.length}</p>
      <pre style={{maxHeight:300, overflow:'auto'}}>{JSON.stringify(graph, null, 2)}</pre>
    </div>
  )
}
