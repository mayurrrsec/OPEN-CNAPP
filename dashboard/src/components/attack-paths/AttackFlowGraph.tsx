import { useEffect, useRef } from 'react'
import * as d3 from 'd3'
import type { AttackPathGraphNode, AttackPathGraphResponse } from '@/api/attackPaths'
import { cn } from '@/lib/utils'

type Props = {
  data: AttackPathGraphResponse
  className?: string
  onSelectNode?: (n: AttackPathGraphNode) => void
}

/** Horizontal left-to-right flow (Orca-style) — D3 for layout and edges. */
export function AttackFlowGraph({ data, className, onSelectNode }: Props) {
  const svgRef = useRef<SVGSVGElement | null>(null)

  useEffect(() => {
    const svg = svgRef.current
    if (!svg || !data.nodes?.length) return

    const width = svg.clientWidth || 720
    const height = 200
    const pad = 20
    const nodes = [...data.nodes].sort((a, b) => (a.column ?? 0) - (b.column ?? 0))
    const maxCol = Math.max(0, ...nodes.map((n) => n.column ?? 0))
    const colCount = Math.max(maxCol + 1, 1)
    const colW = (width - pad * 2) / colCount

    const root = d3.select(svg)
    root.selectAll('*').remove()

    const g = root.append('g').attr('transform', `translate(${pad},${pad})`)

    root
      .append('defs')
      .append('marker')
      .attr('id', 'ap-arrow')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 8)
      .attr('refY', 0)
      .attr('markerWidth', 5)
      .attr('markerHeight', 5)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', '#64748b')

    const nodeH = 48
    const nodeW = 112
    const y = 56

    const byId: Record<string, { x: number; cx: number }> = {}
    nodes.forEach((n) => {
      const col = n.column ?? 0
      const cx = col * colW + colW / 2
      const x = cx - nodeW / 2
      byId[n.id] = { x, cx }

      const fill =
        n.type === 'internet'
          ? '#0c447c'
          : n.type === 'crown_jewel'
            ? '#5b21b6'
            : '#1e293b'

      g.append('rect')
        .attr('x', x)
        .attr('y', y)
        .attr('width', nodeW)
        .attr('height', nodeH)
        .attr('rx', 8)
        .attr('fill', fill)
        .attr('stroke', 'rgba(148,163,184,0.35)')
        .style('cursor', onSelectNode ? 'pointer' : 'default')
        .on('click', () => onSelectNode?.(n))

      g.append('text')
        .attr('x', cx)
        .attr('y', y + 22)
        .attr('text-anchor', 'middle')
        .attr('fill', '#e2e8f0')
        .attr('font-size', 11)
        .text(String(n.label).length > 22 ? `${String(n.label).slice(0, 22)}…` : n.label)

      if (n.account) {
        g.append('text')
          .attr('x', cx)
          .attr('y', y + 40)
          .attr('text-anchor', 'middle')
          .attr('fill', '#94a3b8')
          .attr('font-size', 9)
          .text(String(n.account).slice(0, 28))
      }
    })

    const edgeY = y + nodeH / 2
    for (const e of data.edges || []) {
      const s = byId[e.source]
      const t = byId[e.target]
      if (!s || !t) continue
      g.append('line')
        .attr('x1', s.cx + nodeW / 2)
        .attr('y1', edgeY)
        .attr('x2', t.cx - nodeW / 2)
        .attr('y2', edgeY)
        .attr('stroke', '#64748b')
        .attr('stroke-width', 1.5)
        .attr('marker-end', 'url(#ap-arrow)')
    }

    const cards = data.alert_cards || {}
    let cardY = y + nodeH + 16
    Object.entries(cards).forEach(([parentId, list]) => {
      const pos = byId[parentId]
      if (!pos) return
      list.slice(0, 3).forEach((c, i) => {
        g.append('rect')
          .attr('x', pos.x)
          .attr('y', cardY + i * 36)
          .attr('width', nodeW)
          .attr('height', 32)
          .attr('rx', 4)
          .attr('fill', '#451a03')
          .attr('stroke', 'rgba(251,146,60,0.4)')
        g.append('text')
          .attr('x', pos.x + 6)
          .attr('y', cardY + i * 36 + 20)
          .attr('fill', '#fed7aa')
          .attr('font-size', 9)
          .text(String(c.title).slice(0, 38))
      })
    })

    root.attr('height', height)
    root.attr('width', width)
  }, [data, onSelectNode])

  return (
    <div className={cn('w-full overflow-x-auto rounded-lg border border-border bg-muted/20 p-2', className)}>
      <svg ref={svgRef} width="100%" height={200} className="min-w-[640px]" />
      <p className="mt-1 text-xs text-muted-foreground">
        ○ Internet · asset · crown jewel — edges are heuristic from findings (not Threatmapper).
      </p>
    </div>
  )
}
