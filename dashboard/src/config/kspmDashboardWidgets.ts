/**
 * AccuKnox-style KSPM dashboard catalog (~25 tiles).
 * IDs are OpenCNAPP slugs — not AccuKnox UUIDs (those are product-internal).
 */
export type KspmWidgetKind =
  | 'domain-risk-score'
  | 'severity-mix'
  | 'trend-7d'
  | 'subdomains-labels'
  | 'findings-by-cloud'
  | 'placeholder'

export type KspmWidgetDef = {
  id: string
  title: string
  kind: KspmWidgetKind
  /** Layout hint for the grid */
  colSpan?: 1 | 2 | 3
}

/** 25 widgets: first five wired to /dashboard/summary?domain=kspm; rest empty until APIs exist. */
export const KSPM_DASHBOARD_WIDGETS: KspmWidgetDef[] = [
  { id: 'domain-risk-score', title: 'Domain risk score', kind: 'domain-risk-score', colSpan: 1 },
  { id: 'severity-mix', title: 'Severity mix', kind: 'severity-mix', colSpan: 2 },
  { id: 'trend-7d', title: 'Trend (7d)', kind: 'trend-7d', colSpan: 1 },
  { id: 'subdomains-labels', title: 'Sub-domains / labels', kind: 'subdomains-labels', colSpan: 1 },
  { id: 'findings-by-cloud', title: 'Findings by cloud (this domain)', kind: 'findings-by-cloud', colSpan: 3 },
  // Placeholders — titles aligned with AccuKnox KSPM catalog (screenshots / marketing)
  { id: 'clusters-public-exposure', title: 'Clusters with Public Exposure', kind: 'placeholder', colSpan: 1 },
  { id: 'policy-coverage', title: 'Policy Coverage', kind: 'placeholder', colSpan: 1 },
  { id: 'workloads-no-policy', title: 'Workloads Without Any Policy Applied', kind: 'placeholder', colSpan: 1 },
  { id: 'kiem-top-critical', title: 'KIEM Top 5 Critical Findings', kind: 'placeholder', colSpan: 1 },
  { id: 'k8s-resource-summary', title: 'K8s Resource Summary', kind: 'placeholder', colSpan: 1 },
  { id: 'findings-by-asset-categories', title: 'Findings by Asset Categories', kind: 'placeholder', colSpan: 1 },
  { id: 'k8s-findings-trend', title: 'K8s Findings Trend', kind: 'placeholder', colSpan: 1 },
  { id: 'continuous-compliance', title: 'Continuous Compliance', kind: 'placeholder', colSpan: 1 },
  { id: 'top-clusters-no-protection', title: 'Top 5 Clusters Without Any Protection', kind: 'placeholder', colSpan: 1 },
  { id: 'kiem-risk-assessment', title: 'KIEM Risk Assessment', kind: 'placeholder', colSpan: 1 },
  { id: 'k8s-risk-posture', title: 'K8s Risk Posture', kind: 'placeholder', colSpan: 1 },
  { id: 'top-cluster-findings', title: 'Top 5 Cluster Findings', kind: 'placeholder', colSpan: 1 },
  { id: 'pods-default-root', title: 'Pods with default root user', kind: 'placeholder', colSpan: 1 },
  { id: 'cluster-findings-by-asset-type', title: 'Cluster Findings by Asset Type', kind: 'placeholder', colSpan: 1 },
  { id: 'new-cluster-findings-trend', title: 'New Cluster Findings Trend', kind: 'placeholder', colSpan: 1 },
  { id: 'cluster-connection-status', title: 'Cluster Connection Status', kind: 'placeholder', colSpan: 1 },
  { id: 'cluster-findings-by-severity', title: 'Cluster Findings by Severity', kind: 'placeholder', colSpan: 1 },
  { id: 'hardening-policy-coverage', title: 'Hardening Policy Coverage', kind: 'placeholder', colSpan: 1 },
  { id: 'workloads-no-netpol', title: 'Workloads without Network Policies', kind: 'placeholder', colSpan: 1 },
  { id: 'kiem-findings-by-asset-types', title: 'KIEM Findings by Asset Types', kind: 'placeholder', colSpan: 1 },
]
