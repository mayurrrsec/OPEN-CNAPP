import { api } from './client'

export type IamGraphNode = {
  id: string
  connector_id: string
  cloud_account_id: string | null
  provider: string
  node_type: string
  external_id: string
  label: string
  properties: Record<string, unknown>
}

export type IamGraphEdge = {
  id: string
  source: string
  target: string
  edge_type: string
  properties: Record<string, unknown>
}

export type IamSubgraphResponse = {
  nodes: IamGraphNode[]
  edges: IamGraphEdge[]
  truncated: boolean
  meta: {
    focus_id?: string
    message?: string
    node_count?: number
    edge_count?: number
  }
}

export async function fetchIamSubgraph(params: {
  connectorId: string
  resourceArn: string
  depth?: number
}): Promise<IamSubgraphResponse> {
  const r = await api.get<IamSubgraphResponse>('/graph/subgraph', {
    params: {
      connector_id: params.connectorId,
      resource_arn: params.resourceArn,
      depth: params.depth ?? 3,
    },
  })
  return r.data
}
