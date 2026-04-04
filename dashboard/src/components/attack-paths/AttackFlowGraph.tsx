import { useEffect, useId, useRef, useState } from 'react'
import * as d3 from 'd3'
import type { AttackPathGraphNode, AttackPathGraphResponse } from '@/api/attackPaths'
import { cn } from '@/lib/utils'

type Props = {
  data: AttackPathGraphResponse
  className?: string
  onSelectNode?: (n: AttackPathGraphNode) => void
}

function cssHsl(varName: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback
  const raw = getComputedStyle(document.documentElement).getPropertyValue(varName).trim()
  if (!raw) return fallback
  return `hsl(${raw})`
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Horizontal left-to-right flow — D3 for layout; alert chips use foreignObject for readable text. */
export function AttackFlowGraph({ data, className, onSelectNode }: Props) {
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const svgRef = useRef<SVGSVGElement | null>(null)
  const markerId = `ap-arrow-${useId().replace(/:/g, '')}`
  const [layoutTick, setLayoutTick] = useState(0)

  useEffect(() => {
    const el = wrapRef.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(() => setLayoutTick((t) => t + 1))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    const svg = svgRef.current
    const wrap = wrapRef.current
    if (!svg || !data.nodes?.length) return

    const fillCard = cssHsl('--card', 'hsl(222 47% 9%)')
    const fillFg = cssHsl('--card-foreground', 'hsl(210 40% 98%)')
    const fillMuted = cssHsl('--muted-foreground', 'hsl(215 16% 65%)')
    const strokeBorder = cssHsl('--border', 'hsl(217 19% 27%)')

    const width = wrap?.clientWidth || svg.clientWidth || 720
    const pad = 24
    const nodes = [...data.nodes].sort((a, b) => (a.column ?? 0) - (b.column ?? 0))
    const maxCol = Math.max(0, ...nodes.map((n) => n.column ?? 0))
    const colCount = Math.max(maxCol + 1, 1)
    const colW = (width - pad * 2) / colCount

    const nodeH = 52
    const nodeW = Math.min(168, Math.max(120, colW * 0.88))
    const y = 32
    const cards = data.alert_cards || {}
    let maxCardRows = 0
    for (const list of Object.values(cards)) {
      maxCardRows = Math.max(maxCardRows, Math.min(3, list?.length || 0))
    }
    const cardStackH = maxCardRows > 0 ? 12 + maxCardRows * 48 : 0
    const height = pad * 2 + y + nodeH + cardStackH + 8

    const root = d3.select(svg)
    root.selectAll('*').remove()

    root
      .append('defs')
      .append('marker')
      .attr('id', markerId)
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 8)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', fillMuted)

    const g = root.append('g').attr('transform', `translate(${pad},${pad})`)

    const byId: Record<string, { x: number; cx: number }> = {}
    nodes.forEach((n) => {
      const col = n.column ?? 0
      const cx = col * colW + colW / 2
      const x = cx - nodeW / 2
      byId[n.id] = { x, cx }

      const fill =
        n.type === 'internet'
          ? 'hsl(221 83% 42%)'
          : n.type === 'crown_jewel'
            ? 'hsl(263 70% 38%)'
            : fillCard
      const stroke = strokeBorder

      g.append('rect')
        .attr('x', x)
        .attr('y', y)
        .attr('width', nodeW)
        .attr('height', nodeH)
        .attr('rx', 10)
        .attr('fill', fill)
        .attr('stroke', stroke)
        .attr('stroke-width', 1)
        .style('filter', 'drop-shadow(0 2px 6px rgb(0 0 0 / 0.12))')
        .style('cursor', onSelectNode ? 'pointer' : 'default')
        .on('click', () => onSelectNode?.(n))

      const label = String(n.label)
      const line1 = label.length > 26 ? `${label.slice(0, 24)}…` : label
      g.append('text')
        .attr('x', cx)
        .attr('y', y + 22)
        .attr('text-anchor', 'middle')
        .attr('fill', fillFg)
        .attr('font-size', 12)
        .attr('font-weight', 600)
        .text(line1)

      if (n.account) {
        g.append('text')
          .attr('x', cx)
          .attr('y', y + 40)
          .attr('text-anchor', 'middle')
          .attr('fill', fillMuted)
          .attr('font-size', 10)
          .text(String(n.account).slice(0, 32))
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
        .attr('stroke', fillMuted)
        .attr('opacity', 0.55)
        .attr('stroke-width', 2)
        .attr('marker-end', `url(#${markerId})`)
    }

    const cardY0 = y + nodeH + 14
    Object.entries(cards).forEach(([parentId, list]) => {
      const pos = byId[parentId]
      if (!pos) return
      list.slice(0, 3).forEach((c, i) => {
        const fo = g
          .append('foreignObject')
          .attr('x', pos.x)
          .attr('y', cardY0 + i * 50)
          .attr('width', nodeW)
          .attr('height', 46)

        fo.append('xhtml:div')
          .html(
            `<div style="box-sizing:border-box;height:100%;padding:6px 8px;border-radius:8px;border:1px solid rgba(251,146,60,0.35);background:rgba(67,20,7,0.85);font-family:ui-sans-serif,system-ui,sans-serif;font-size:11px;line-height:1.25;color:#ffedd5;">
              <div style="font-weight:600;color:#fdba74;margin-bottom:2px;">${escapeHtml((c.severity || '—').toUpperCase())}</div>
              <div style="display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">${escapeHtml((c.title || '').slice(0, 160))}</div>
            </div>`
          )
      })
    })

    root.attr('height', height)
    root.attr('width', width)
  }, [data, onSelectNode, markerId, layoutTick])

  return (
    <div ref={wrapRef} className={cn('w-full', className)}>
      <div className="rounded-xl border border-border bg-gradient-to-b from-muted/40 to-muted/10 p-4 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[hsl(221_83%_42%)]" />
            Internet
          </span>
          <span className="text-border">→</span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-card ring-1 ring-border" />
            Cloud / asset
          </span>
          <span className="text-border">→</span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-[hsl(263_70%_38%)]" />
            Target resource
          </span>
          <span className="ml-auto text-[10px] uppercase tracking-wide text-muted-foreground/80">Finding overlays</span>
        </div>
        <svg ref={svgRef} width="100%" className="min-h-[200px] min-w-[min(100%,640px)] block" />
      </div>
      <div className="mt-3 space-y-2 text-xs text-muted-foreground">
        <p>
          <strong className="text-foreground">What this shows:</strong> a compact story built from{' '}
          <strong>scanner findings</strong> (Prowler, Kubescape, Defender, etc.) — not from PMapper, Steampipe, or Cartography.
          Edges are <strong>heuristic</strong> (risk aggregation), not a live IAM permission graph.
        </p>
        <p>
          <strong className="text-foreground">IAM / policy graph:</strong> click a node (not Internet), then open the{' '}
          <strong className="text-foreground">IAM graph</strong> tab. That view uses data from{' '}
          <code className="rounded bg-muted px-1 py-0.5 text-[10px]">POST /graph/ingest</code> (batch exports from PMapper,
          Steampipe, Cartography, …), when you have loaded graph rows for that connector.
        </p>
      </div>
    </div>
  )
}
