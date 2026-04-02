import { api } from './client'

export type SeverityRow = { name: string; value: number }
export type TrendPoint = { day: string; findings: number }
export type NamedCount = { name: string; value: number }

export type TopFindingRow = {
  id: string
  severity?: string
  domain?: string
  cloud_provider?: string
  title?: string
}

export type DashboardSummary = {
  total_findings?: number
  open_findings?: number
  critical?: number
  high?: number
  medium?: number
  low?: number
  secure_score?: number
  severity_breakdown: SeverityRow[]
  domain_breakdown: NamedCount[]
  cloud_breakdown: NamedCount[]
  trend: TrendPoint[]
  top_findings: TopFindingRow[]
}

export function fetchDashboardSummary(): Promise<DashboardSummary> {
  return api.get<DashboardSummary>('/dashboard/summary').then((r) => r.data)
}
