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

export type CloudSeverityRow = {
  provider: string
  total: number
  critical: number
  high: number
  medium: number
  low: number
  info: number
}

export type ComplianceOverviewRow = {
  framework: string
  findings: number
  passed_pct: number | null
}

export type DashboardSummary = {
  total_findings?: number
  open_findings?: number
  critical?: number
  high?: number
  medium?: number
  low?: number
  secure_score?: number
  risk_posture?: {
    score: number
    label: string
    delta_week: number
    by_domain: Record<string, number>
  }
  severity_breakdown: SeverityRow[]
  domain_breakdown: NamedCount[]
  cloud_breakdown: NamedCount[]
  findings_by_cloud: CloudSeverityRow[]
  lifecycle_by_status: Record<string, number>
  trend: TrendPoint[]
  top_findings: TopFindingRow[]
  attack_path_summary?: {
    high_impact: number
    medium_impact: number
    low_impact: number
    edge_count: number
  }
  compliance_overview?: ComplianceOverviewRow[]
  domain_filter?: string | null
}

export function fetchDashboardSummary(params?: { domain?: string }): Promise<DashboardSummary> {
  return api.get<DashboardSummary>('/dashboard/summary', { params }).then((r) => r.data)
}
