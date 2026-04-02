import { api } from './client'

export type AttackPathTop = {
  path_id: string
  source: string
  target: string
  risk: number
}

export type AttackStoryStep = {
  step: number
  title: string
  summary?: string
  severity?: string
  tool?: string
  domain?: string
}

export type AttackStoryResponse = {
  path_id: string
  source: string
  target: string
  risk: number
  steps: AttackStoryStep[]
}

export function fetchAttackStory(pathId: string): Promise<AttackStoryResponse> {
  return api.get<AttackStoryResponse>(`/attack-paths/story/${encodeURIComponent(pathId)}`).then((r) => r.data)
}
