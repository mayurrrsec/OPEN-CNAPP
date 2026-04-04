import { useEffect, useMemo, useState } from 'react'
import {
  Background,
  Controls,
  MarkerType,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  type Edge,
  type Node,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { Loader2 } from 'lucide-react'
import { fetchIamSubgraph, type IamGraphEdge, type IamGraphNode } from '@/api/iamGraph'

function layoutNodes(
  nodes: IamGraphNode[],
  edges: IamGraphEdge[],
  focusId: string | undefined
): Node[] {
  const adj = new Map<string, Set<string>>()
  for (const e of edges) {
    if (!adj.has(e.source)) adj.set(e.source, new Set())
    if (!adj.has(e.target)) adj.set(e.target, new Set())
    adj.get(e.source)!.add(e.target)
    adj.get(e.target)!.add(e.source)
  }
  const start = focusId || nodes[0]?.id
  const depth = new Map<string, number>()
  if (start) {
    const q: string[] = [start]
    depth.set(start, 0)
    while (q.length) {
      const id = q.shift()!
      const d = depth.get(id) ?? 0
      for (const nb of adj.get(id) || []) {
        if (!depth.has(nb)) {
          depth.set(nb, d + 1)
          q.push(nb)
        }
      }
    }
  }
  const layers = new Map<number, string[]>()
  for (const n of nodes) {
    const d = depth.get(n.id) ?? 99
    if (!layers.has(d)) layers.set(d, [])
    layers.get(d)!.push(n.id)
  }
  const sortedLayers = [...layers.keys()].sort((a, b) => a - b)
  const xGap = 220
  const yGap = 72
  const pos = new Map<string, { x: number; y: number }>()
  for (let col = 0; col < sortedLayers.length; col++) {
    const d = sortedLayers[col]
    const ids = [...(layers.get(d) || [])].sort()
    for (let row = 0; row < ids.length; row++) {
      pos.set(ids[row], { x: col * xGap, y: row * yGap })
    }
  }
  return nodes.map((n) => ({
    id: n.id,
    position: pos.get(n.id) || { x: 0, y: 0 },
    data: { label: n.label || n.external_id, nodeType: n.node_type },
  }))
}

function toFlowEdges(edges: IamGraphEdge[]): Edge[] {
  return edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    label: e.edge_type,
    markerEnd: { type: MarkerType.ArrowClosed },
  }))
}

type Props = {
  connectorId: string | null | undefined
  resourceArn: string | undefined
}

function Inner({ connectorId, resourceArn }: Props) {
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [raw, setRaw] = useState<Awaited<ReturnType<typeof fetchIamSubgraph>> | null>(null)
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])

  useEffect(() => {
    if (!connectorId || !resourceArn) {
      setRaw(null)
      setNodes([])
      setEdges([])
      return
    }
    setLoading(true)
    setErr(null)
    fetchIamSubgraph({ connectorId, resourceArn, depth: 3 })
      .then((data) => {
        setRaw(data)
        const laid = layoutNodes(data.nodes, data.edges, data.meta?.focus_id)
        setNodes(laid)
        setEdges(toFlowEdges(data.edges))
      })
      .catch((e) => {
        setErr(String(e?.response?.data?.detail || e?.message || e))
        setRaw(null)
        setNodes([])
        setEdges([])
      })
      .finally(() => setLoading(false))
  }, [connectorId, resourceArn, setNodes, setEdges])

  const hint = raw?.meta?.message

  const statusLine = useMemo(() => {
    if (!raw) return null
    const parts: string[] = []
    if (raw.meta?.node_count != null) parts.push(`${raw.meta.node_count} nodes`)
    if (raw.truncated) parts.push('truncated')
    return parts.length ? parts.join(' · ') : null
  }, [raw])

  if (!connectorId || !resourceArn) {
    return <p className="text-sm text-muted-foreground">Select a resource with a connector and ARN to load the IAM graph.</p>
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading IAM graph…
      </div>
    )
  }

  if (err) {
    return <p className="text-sm text-destructive">{err}</p>
  }

  if (hint && raw?.nodes.length === 0) {
    return (
      <div className="space-y-2 text-sm text-muted-foreground">
        <p>{hint}</p>
        <p className="text-xs leading-relaxed">
          Batch tools (PMapper, Steampipe, Cartography) feed this panel via{' '}
          <code className="rounded bg-muted px-1 py-0.5 text-[10px]">POST /graph/ingest</code> — not the main Attack flow
          diagram.
        </p>
      </div>
    )
  }

  if (!raw || raw.nodes.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No IAM graph data for this resource. Ingest a batch export first, or enable live IAM sync only if configured.
      </p>
    )
  }

  return (
    <div className="space-y-2">
      {statusLine ? <p className="text-xs text-muted-foreground">{statusLine}</p> : null}
      <div className="h-[min(520px,65vh)] w-full min-h-[320px] rounded-md border border-border bg-muted/10">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          fitView
          proOptions={{ hideAttribution: true }}
        >
          <Background gap={16} />
          <Controls />
          <MiniMap zoomable pannable />
        </ReactFlow>
      </div>
    </div>
  )
}

/** IAM / access subgraph (React Flow) for the attack-path asset sheet. */
export function IamAccessGraphFlow(props: Props) {
  if (import.meta.env.VITE_IAM_GRAPH === '0') {
    return <p className="text-sm text-muted-foreground">IAM graph is disabled (VITE_IAM_GRAPH=0).</p>
  }
  return (
    <ReactFlowProvider>
      <Inner {...props} />
    </ReactFlowProvider>
  )
}
