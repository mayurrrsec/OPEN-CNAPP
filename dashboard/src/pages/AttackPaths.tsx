import { useEffect, useMemo, useState } from 'react'
import { api } from '../api/client'

export default function AttackPaths() {
  const [graph, setGraph] = useState<{nodes:any[], edges:any[]}>({nodes:[], edges:[]})
  useEffect(() => { api.get('/attack-paths').then(r => setGraph(r.data)).catch(() => setGraph({nodes:[], edges:[]})) }, [])

  const coords = useMemo(() => {
    const out: Record<string, {x:number,y:number}> = {}
    const radius = 180
    const cx = 250
    const cy = 220
    graph.nodes.forEach((n, idx) => {
      const a = (idx / Math.max(graph.nodes.length,1)) * Math.PI * 2
      out[n.id] = { x: cx + radius * Math.cos(a), y: cy + radius * Math.sin(a) }
    })
    return out
  }, [graph])

  return (
    <div>
      <h2>Attack Paths</h2>
      <p>Nodes: {graph.nodes.length} | Edges: {graph.edges.length}</p>
      <svg width={520} height={440} style={{border:'1px solid #ddd'}}>
        {graph.edges.map((e, i) => {
          const s = coords[e.source]; const t = coords[e.target];
          if (!s || !t) return null
          return <line key={i} x1={s.x} y1={s.y} x2={t.x} y2={t.y} stroke="#94a3b8" />
        })}
        {graph.nodes.map((n, i) => (
          <g key={i}>
            <circle cx={coords[n.id]?.x} cy={coords[n.id]?.y} r={10} fill="#2563eb" />
            <text x={(coords[n.id]?.x || 0) + 12} y={(coords[n.id]?.y || 0) + 4} fontSize={10}>{n.id}</text>
          </g>
        ))}
      </svg>
    </div>
  )
}
