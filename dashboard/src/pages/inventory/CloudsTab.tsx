import { useQuery } from '@tanstack/react-query'
import { Cloud } from 'lucide-react'
import { api } from '@/api/client'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/EmptyState'

type CloudRow = {
  id: string
  name: string
  display_name: string
  connector_type: string | null
  enabled: boolean
  status: string
  created_at: string | null
}

export function CloudsTab() {
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['inventory', 'clouds'],
    queryFn: () => api.get<{ items: CloudRow[]; total: number }>('/inventory/clouds').then((r) => r.data),
  })

  const rows = data?.items ?? []

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading cloud accounts…</p>
  }
  if (isError) {
    return (
      <EmptyState
        icon={Cloud}
        title="Could not load clouds"
        description="Check the API and try again."
        action={{ label: 'Retry', onClick: () => void refetch() }}
      />
    )
  }
  if (rows.length === 0) {
    return (
      <EmptyState
        icon={Cloud}
        title="No cloud accounts"
        description="Add AWS, Azure, or GCP under Connectors to see them here."
        action={{ label: 'Add cloud', onClick: () => (window.location.href = '/connectors') }}
      />
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button
          type="button"
          className="text-sm text-primary underline-offset-4 hover:underline"
          onClick={() => void refetch()}
        >
          {isFetching ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs font-medium text-muted-foreground">
            <tr>
              <th className="p-3">Name</th>
              <th className="p-3">Type</th>
              <th className="p-3">Status</th>
              <th className="p-3">Added</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id} className="border-t border-border/60">
                <td className="p-3 font-medium">{c.display_name}</td>
                <td className="p-3 uppercase text-muted-foreground">{c.connector_type}</td>
                <td className="p-3">
                  <Badge variant={c.enabled ? 'success' : 'secondary'}>{c.status}</Badge>
                </td>
                <td className="p-3 text-muted-foreground tabular-nums">
                  {c.created_at ? new Date(c.created_at).toLocaleDateString() : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
