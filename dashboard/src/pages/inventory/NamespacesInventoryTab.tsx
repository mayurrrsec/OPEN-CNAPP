import { FolderTree } from 'lucide-react'
import { EmptyState } from '@/components/ui/EmptyState'

export function NamespacesInventoryTab() {
  return (
    <EmptyState
      icon={FolderTree}
      title="Namespace inventory"
      description="Cluster → namespace hierarchy with severity counts will appear here when K8s inventory sync is connected. API: GET /inventory/namespaces"
    />
  )
}
