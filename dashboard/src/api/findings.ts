import { api } from './client'

export type FindingRow = {
  id: string
  tool: string
  severity: string
  domain: string
  cloud_provider?: string | null
  status: string
  title: string
  resource_id?: string | null
  resource_name?: string | null
  check_id?: string | null
  remediation?: string | null
  description?: string | null
  created_at?: string
  raw?: Record<string, unknown>
  compliance?: string[]
  assigned_to?: string | null
  ticket_ref?: string | null
}

export type FindingsListParams = {
  severity?: string
  domain?: string
  cloud_provider?: string
  status?: string
  tool?: string
  q?: string
  limit: number
  offset: number
  sort: string
  order: 'asc' | 'desc'
}

export type FindingsListResponse = {
  items: FindingRow[]
  total: number
  limit: number
  offset: number
}

export function fetchFindingsList(params: FindingsListParams): Promise<FindingsListResponse> {
  return api.get<FindingsListResponse>('/findings', { params }).then((r) => r.data)
}

export function fetchFindingById(id: string): Promise<FindingRow> {
  return api.get<FindingRow>(`/findings/${id}`).then((r) => r.data)
}

export function patchFindingLifecycle(
  id: string,
  body: { status?: string; assigned_to?: string; ticket_ref?: string }
): Promise<{ ok: boolean }> {
  return api.patch<{ ok: boolean }>(`/findings/${id}`, null, { params: body }).then((r) => r.data)
}
