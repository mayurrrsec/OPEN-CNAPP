import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, Search } from 'lucide-react'
import { api } from '@/api/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SeverityBars, type SeverityBreakdown } from '@/components/inventory/SeverityBars'
import { SeverityToggle, severityQueryParam, SEVERITY_KEYS } from '@/components/inventory/SeverityToggle'

type PolicyRow = {
  check_id: string
  title: string
  failed_resources: number
  severity_breakdown: SeverityBreakdown
  framework_refs: unknown[]
}

type Payload = {
  policies: { total: number; page: number; items: PolicyRow[] }
}

const defaultSev = () => Object.fromEntries(SEVERITY_KEYS.map((s) => [s, true])) as Record<string, boolean>

export function ClusterPoliciesTab({ clusterId }: { clusterId: string }) {
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
    queryKey: ['inventory', 'cluster', clusterId, 'policies', page, debounced, severityParam],
    queryFn: () =>
      api
        .get<Payload>(`/inventory/clusters/${clusterId}/policies`, {
          params: { page, limit: 25, search: debounced, severity: severityParam },
        })
        .then((r) => r.data),
  })

  useEffect(() => {
    setPage(1)
  }, [debounced, severityParam])

  const totalPages = data ? Math.max(1, Math.ceil(data.policies.total / 25)) : 1

  if (isLoading && !data) {
    return <p className="text-sm text-muted-foreground">Loading policies…</p>
  }
  if (isError) {
    return <p className="text-sm text-destructive">Failed to load policies.</p>
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
            placeholder="Search title or control ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Controls grouped by Kubescape-style <code className="rounded bg-muted px-1">check_id</code> with severity
        rollups.
      </p>

      <div className="overflow-x-auto rounded-md border">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
            <tr>
              <th className="p-2">Control</th>
              <th className="p-2">Title</th>
              <th className="p-2">Findings</th>
              <th className="p-2">Severity</th>
            </tr>
          </thead>
          <tbody>
            {data.policies.items.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-6 text-center text-muted-foreground">
                  No policy findings yet. Ingest Kubescape / KSPM scans for this cluster.
                </td>
              </tr>
            ) : (
              data.policies.items.map((p) => (
                <tr key={p.check_id} className="border-t border-border">
                  <td className="p-2 align-top font-mono text-xs">{p.check_id}</td>
                  <td className="p-2 align-top">
                    <div>{p.title}</div>
                    {p.framework_refs?.length ? (
                      <div className="mt-1 text-[10px] text-muted-foreground">
                        {p.framework_refs.length} compliance link{p.framework_refs.length === 1 ? '' : 's'}
                      </div>
                    ) : null}
                  </td>
                  <td className="p-2 align-top tabular-nums">{p.failed_resources}</td>
                  <td className="p-2 align-top">
                    <SeverityBars breakdown={p.severity_breakdown} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>
          {data.policies.total} control{data.policies.total === 1 ? '' : 's'} · page {data.policies.page} of{' '}
          {totalPages}
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
