import { api } from './client'

export type AttackPathSummary = {
  by_impact: { high: number; medium: number; low: number; informational: number }
  total_paths: number
}

export type AttackPathListItem = {
  id: string
  title: string
  impact_score: number
  probability_score: number
  risk_score: number
  impact_band: string
  path_length: number
  is_exposed_internet: boolean
  exposure_type: string | null
  cloud_provider: string | null
  account_id: string | null
  connector_id: string | null
  source_resource_id: string | null
  target_resource_id: string | null
  finding_count: number
  created_at: string | null
  updated_at: string | null
}

export type AttackPathsListResponse = {
  summary: {
    by_impact: AttackPathSummary['by_impact']
    total_paths: number
  }
  total: number
  items: AttackPathListItem[]
  offset: number
  limit: number
}

export type AttackStoryStep = {
  step: number
  account?: string
  title: string
  text?: string
  summary?: string
  severity?: string
  tool?: string
  domain?: string
}

export type AttackPathDetailResponse = {
  path: AttackPathListItem
  attack_story: AttackStoryStep[]
  timeline: { finding_id: string | null; event: string; at: string | null; title: string }[]
}

export type AttackPathGraphNode = {
  id: string
  type: string
  label: string
  resource_id?: string
  column?: number
  account?: string
  cloud_provider?: string
}

export type AttackPathGraphResponse = {
  path_id: string
  nodes: AttackPathGraphNode[]
  edges: { source: string; target: string; edge_type?: string }[]
  alert_cards: Record<string, { finding_id: string; title: string; severity?: string; tool?: string; domain?: string }[]>
  meta?: { impact_score?: number; title?: string }
}

export type AttackStoryResponse = {
  path_id: string
  source: string
  target: string
  risk: number
  steps: AttackStoryStep[]
}

export function fetchAttackPathsList(params?: {
  impact_band?: string
  limit?: number
  offset?: number
}): Promise<AttackPathsListResponse> {
  return api.get<AttackPathsListResponse>('/attack-paths', { params }).then((r) => r.data)
}

export function fetchAttackPathDetail(pathId: string): Promise<AttackPathDetailResponse> {
  return api.get<AttackPathDetailResponse>(`/attack-paths/${encodeURIComponent(pathId)}`).then((r) => r.data)
}

export function fetchAttackPathGraph(pathId: string): Promise<AttackPathGraphResponse> {
  return api.get<AttackPathGraphResponse>(`/attack-paths/${encodeURIComponent(pathId)}/graph`).then((r) => r.data)
}

export function postAttackPathsRebuild(): Promise<{ paths: number; edges: number; skipped?: number }> {
  return api.post('/attack-paths/rebuild').then((r) => r.data)
}

export function fetchAttackStory(pathId: string): Promise<AttackStoryResponse> {
  return api.get<AttackStoryResponse>(`/attack-paths/story/${encodeURIComponent(pathId)}`).then((r) => r.data)
}

export type LegacyGraphResponse = {
  nodes: { id: string; type?: string }[]
  edges: { source: string; target: string; risk: number }[]
  top_paths: { path_id: string; source: string; target: string; risk: number }[]
  meta?: { node_count: number; edge_count: number }
}

export function fetchAttackPathsLegacyGraph(): Promise<LegacyGraphResponse> {
  return api.get<LegacyGraphResponse>('/attack-paths/graph').then((r) => r.data)
}
