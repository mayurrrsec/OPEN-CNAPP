import { Server } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/EmptyState'

export default function Inventory() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Inventory</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Cloud accounts, clusters, namespaces, workloads, and images — unified asset inventory (spec §6).
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Asset inventory</CardTitle>
          <CardDescription>Placeholder for the multi-tab inventory experience.</CardDescription>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={Server}
            title="Inventory is not wired yet"
            description="Connectors and graph-backed inventory will populate this view. The API routes are outlined in the v3 exec plan."
          />
        </CardContent>
      </Card>
    </div>
  )
}
