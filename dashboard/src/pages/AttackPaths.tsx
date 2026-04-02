import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { api } from '../api/client'
import * as d3 from 'd3'

export default function AttackPaths() {
  const [graph, setGraph] = useState<{
    nodes: unknown[]
    edges: unknown[]
    top_paths: { path_id?: string; source: string; target: string; risk: number }[]
  }>({ nodes: [], edges: [], top_paths: [] })
  const [selected, setSelected] = useState<any | null>(null)
  const svgRef = useRef<SVGSVGElement | null>(null)

  useEffect(() => {
    api.get('/attack-paths')
      .then(r => setGraph(r.data))
      .catch(() => setGraph({ nodes: [], edges: [], top_paths: [] }))
  }, [])

  const nodes = useMemo(() => (graph.nodes || []).map((n: any) => ({ ...n })), [graph.nodes])
  const links = useMemo(() => (graph.edges || []).map((e: any) => ({ ...e })), [graph.edges])

  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    const width = svg.clientWidth || 900
    const height = svg.clientHeight || 520

    const root = d3.select(svg)
    root.selectAll('*').remove()

    const g = root.append('g')

    root.call(
      d3.zoom<SVGSVGElement, unknown>().scaleExtent([0.5, 2.5]).on('zoom', (event) => {
        g.attr('transform', event.transform.toString())
      })
    )

    const maxRisk = Math.max(1, ...links.map((l: any) => Number(l.risk || 0)))
    const riskColor = (r: number) => (r > 0.75 * maxRisk ? '#ef4444' : r > 0.4 * maxRisk ? '#f97316' : 'rgba(148,163,184,.8)')

    const linkSel = g
      .append('g')
      .attr('stroke-linecap', 'round')
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', (d: any) => riskColor(Number(d.risk || 0)))
      .attr('stroke-width', (d: any) => 1 + 3 * (Number(d.risk || 0) / maxRisk))
      .attr('opacity', 0.85)

    const nodeSel = g
      .append('g')
      .selectAll('circle')
      .data(nodes)
      .join('circle')
      .attr('r', (d: any) => d.type === 'cloud' ? 10 : d.type === 'resource' ? 9 : 7)
      .attr('fill', (d: any) => {
        const sev = String(d.severity || '').toUpperCase()
        if (sev === 'CRITICAL') return '#ef4444'
        if (sev === 'HIGH') return '#f97316'
        if (sev === 'MEDIUM') return '#f59e0b'
        return '#4a9eff'
      })
      .attr('stroke', 'rgba(255,255,255,.35)')
      .attr('stroke-width', 1)
      .style('cursor', 'pointer')
      .on('click', (_, d: any) => setSelected(d))

    const labelSel = g
      .append('g')
      .selectAll('text')
      .data(nodes)
      .join('text')
      .text((d: any) => String(d.id).length > 38 ? String(d.id).slice(0, 38) + '…' : String(d.id))
      .attr('font-size', 10)
      .attr('fill', 'rgba(231,236,255,.85)')
      .attr('paint-order', 'stroke')
      .attr('stroke', 'rgba(11,16,32,.9)')
      .attr('stroke-width', 3)
      .attr('pointer-events', 'none')

    const sim = d3.forceSimulation(nodes as any)
      .force('link', d3.forceLink(links as any).id((d: any) => d.id).distance((l: any) => l.target?.type === 'check' ? 80 : 120).strength(0.25))
      .force('charge', d3.forceManyBody().strength(-220))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius((d: any) => (d.type === 'cloud' ? 18 : 16)))

    const drag = d3.drag<SVGCircleElement, any>()
      .on('start', (event, d) => {
        if (!event.active) sim.alphaTarget(0.25).restart()
        d.fx = d.x
        d.fy = d.y
      })
      .on('drag', (event, d) => {
        d.fx = event.x
        d.fy = event.y
      })
      .on('end', (event, d) => {
        if (!event.active) sim.alphaTarget(0)
        d.fx = null
        d.fy = null
      })

    nodeSel.call(drag as any)

    sim.on('tick', () => {
      linkSel
        .attr('x1', (d: any) => d.source?.x ?? 0)
        .attr('y1', (d: any) => d.source?.y ?? 0)
        .attr('x2', (d: any) => d.target?.x ?? 0)
        .attr('y2', (d: any) => d.target?.y ?? 0)

      nodeSel
        .attr('cx', (d: any) => d.x ?? 0)
        .attr('cy', (d: any) => d.y ?? 0)

      labelSel
        .attr('x', (d: any) => (d.x ?? 0) + 12)
        .attr('y', (d: any) => (d.y ?? 0) + 4)
    })

    return () => {
      sim.stop()
    }
  }, [nodes, links])

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 className="page-title">Attack Paths</h1>
          <p className="page-subtitle">Interactive graph view (v1) derived from findings relationships.</p>
        </div>
        <div className="pill">Nodes: <strong>{graph.nodes.length}</strong> · Edges: <strong>{graph.edges.length}</strong></div>
      </div>

      <div className="grid two" style={{ marginTop: 12 }}>
        <div className="card">
          <div className="graph-wrap">
            <svg ref={svgRef} width="100%" height="100%" />
          </div>
          <div style={{ color: 'var(--muted)', fontSize: 12, marginTop: 10 }}>
            Tip: scroll to zoom, drag to pan, drag nodes to reposition.
          </div>
        </div>
        <div className="card">
          <h3>Node details</h3>
          {!selected && <div style={{ color: 'var(--muted)' }}>Click a node in the graph to inspect it.</div>}
          {selected && (
            <div>
              <div className="row">
                <div><div className="metric-label">Type</div><div>{selected.type || '-'}</div></div>
                <div><div className="metric-label">Severity</div><div className={`sev ${String(selected.severity || '').toUpperCase()}`}>{String(selected.severity || '-').toUpperCase()}</div></div>
              </div>
              <div className="card" style={{ marginTop: 12 }}>
                <h3>ID</h3>
                <div style={{ wordBreak: 'break-word' }}>{String(selected.id)}</div>
              </div>
              <button className="btn-secondary" style={{ marginTop: 12 }} onClick={() => setSelected(null)}>Clear</button>
            </div>
          )}
        </div>
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <h3>Top risky paths</h3>
        <table className="table">
          <thead>
            <tr>
              <th>Source</th>
              <th>Target</th>
              <th>Risk / story</th>
            </tr>
          </thead>
          <tbody>
            {(graph.top_paths || []).slice(0, 20).map((p, idx) => (
              <tr key={p.path_id ?? idx}>
                <td style={{ maxWidth: 360, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {String(p.source)}
                </td>
                <td style={{ maxWidth: 360, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {String(p.target)}
                </td>
                <td className="whitespace-nowrap">
                  <span className="mr-3">{Number(p.risk).toFixed(1)}</span>
                  {p.path_id ? (
                    <Button variant="link" className="h-auto p-0 text-sm" asChild>
                      <Link to={`/attack-paths/${encodeURIComponent(p.path_id)}`}>Attack story</Link>
                    </Button>
                  ) : null}
                </td>
              </tr>
            ))}
            {(!graph.top_paths || graph.top_paths.length === 0) && (
              <tr><td colSpan={3} style={{ color: 'var(--muted)' }}>No paths yet. Ingest findings to populate the graph.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
