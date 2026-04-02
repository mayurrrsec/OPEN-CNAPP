import { useQuery } from '@tanstack/react-query'
import { ImageIcon } from 'lucide-react'
import { api } from '@/api/client'
import { EmptyState } from '@/components/ui/EmptyState'
import { Badge } from '@/components/ui/badge'

type ImageRow = {
  id: string
  image: string
  cve_id: string | null
  severity: string
  title: string
  last_seen: string | null
}

export function ImagesInventoryTab() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['inventory', 'images'],
    queryFn: () => api.get<{ items: ImageRow[]; total: number }>('/inventory/images', { params: { limit: 200 } }).then((r) => r.data),
  })

  const rows = data?.items ?? []

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading image findings…</p>
  }
  if (isError) {
    return (
      <EmptyState
        icon={ImageIcon}
        title="Could not load images"
        description="Check the API and try again."
        action={{ label: 'Retry', onClick: () => void refetch() }}
      />
    )
  }
  if (rows.length === 0) {
    return (
      <EmptyState
        icon={ImageIcon}
        title="No image CVE data yet"
        description="Image-scanner findings (CVE-linked) will appear here. Run Trivy or image scans against connected workloads."
        action={{ label: 'Open plugins', onClick: () => (window.location.href = '/plugins') }}
      />
    )
  }

  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-left text-xs font-medium text-muted-foreground">
          <tr>
            <th className="p-3">Image / asset</th>
            <th className="p-3">CVE</th>
            <th className="p-3">Severity</th>
            <th className="p-3">Title</th>
            <th className="p-3">Last seen</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-t border-border/60">
              <td className="max-w-[240px] truncate p-3 font-mono text-xs" title={r.image}>
                {r.image || '—'}
              </td>
              <td className="p-3 font-mono text-xs">{r.cve_id ?? '—'}</td>
              <td className="p-3">
                <Badge variant="outline">{r.severity}</Badge>
              </td>
              <td className="max-w-[320px] truncate p-3 text-muted-foreground">{r.title}</td>
              <td className="p-3 text-xs text-muted-foreground tabular-nums">
                {r.last_seen ? new Date(r.last_seen).toLocaleString() : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
