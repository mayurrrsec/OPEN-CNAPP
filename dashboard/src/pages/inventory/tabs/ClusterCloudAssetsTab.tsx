import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, Search } from 'lucide-react'
import { api } from '@/api/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SeverityBars, type SeverityBreakdown } from '@/components/inventory/SeverityBars'
import { SeverityToggle, severityQueryParam, SEVERITY_KEYS } from '@/components/inventory/SeverityToggle'

type Row = {
  resource_type: string
  resource_id: string | null
  resource_name: string | null
  cloud_provider: string | null
  account_id: string | null
  severity_breakdown: SeverityBreakdown
  total: number
}

type Payload = {
  total: number
  page: number
  items: Row[]
}

const defaultSev = () => Object.fromEntries(SEVERITY_KEYS.map((s) => [s, true])) as Record<string, boolean>

export function ClusterCloudAssetsTab({ clusterId }: { clusterId: string }) {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [debounced, setDebounced] = useState('')
  const [severity, setSeverity] = useState<Record<string, boolean>>(defaultSev)

  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(search.trim()), 350)
    return () => window.clearTimeout(t)
  }, [search])

  const severityParam = useMemo(() => severityQueryParam(severity), [severity])

  const { data, isLoading, isError } = useQuery({
    queryKey: ['inventory', 'cluster', clusterId, 'cloud-assets', page, debounced, severityParam],
    queryFn: () =>
      api
        .get<Payload>(`/inventory/clusters/${clusterId}/cloud-assets`, {
          params: { page, limit: 25, search: debounced, severity: severityParam },
        })
        .then((r) => r.data),
  })

  useEffect(() => {
    setPage(1)
  }, [debounced, severityParam])

  const totalPages = data ? Math.max(1, Math.ceil(data.total / 25)) : 1

  if (isLoading && !data) {
    return <p className="text-sm text-muted-foreground">Loading cloud assets…</p>
  }
  if (isError) {
    return <p className="text-sm text-destructive">Failed to load cloud assets.</p>
  }
  if (!data) return null

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SeverityToggle value={severity} onChange={setSeverity} />
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder="Search type, name, account…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Grouped by resource type and identity from findings linked to this cluster (CSPM / cloud-tagged rows).
      </p>

      <div className="overflow-x-auto rounded-md border">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
            <tr>
              <th className="p-2">Type</th>
              <th className="p-2">Name / ID</th>
              <th className="p-2">Cloud</th>
              <th className="p-2">Total</th>
              <th className="p-2">Severity</th>
            </tr>
          </thead>
          <tbody>
            {data.items.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-6 text-center text-muted-foreground">
                  No cloud-linked assets for this cluster yet.
                </td>
              </tr>
            ) : (
              data.items.map((r, i) => (
                <tr key={`${r.resource_type}-${r.resource_id ?? ''}-${r.resource_name ?? ''}-${i}`} className="border-t border-border">
                  <td className="p-2 align-top">
                    <span className="font-medium">{r.resource_type}</span>
                  </td>
                  <td className="p-2 align-top">
                    <div>{r.resource_name ?? '—'}</div>
                    <div className="text-xs text-muted-foreground">{r.resource_id ?? '—'}</div>
                  </td>
                  <td className="p-2 align-top text-xs">
                    <div>{r.cloud_provider ?? '—'}</div>
                    <div className="text-muted-foreground">{r.account_id ?? '—'}</div>
                  </td>
                  <td className="p-2 align-top tabular-nums">{r.total}</td>
                  <td className="p-2 align-top">
                    <SeverityBars breakdown={r.severity_breakdown} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>
          {data.total} asset group{data.total === 1 ? '' : 's'} · page {data.page} of {totalPages}
        </span>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
