import { GitBranch } from 'lucide-react'
import { EmptyState } from '@/components/ui/EmptyState'

export function WorkloadsInventoryTab() {
  return (
    <EmptyState
      icon={GitBranch}
      title="Workload inventory"
      description="Pods, deployments, and related kinds with alert counts will list here. API: GET /inventory/workloads"
    />
  )
}
