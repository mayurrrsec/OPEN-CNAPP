import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, Search } from 'lucide-react'
import { api } from '@/api/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SeverityBars, type SeverityBreakdown } from '@/components/inventory/SeverityBars'
import { SeverityToggle, severityQueryParam, SEVERITY_KEYS } from '@/components/inventory/SeverityToggle'
import { cn } from '@/lib/utils'

type PolicyRow = {
  check_id: string
  name: string
  title: string
  category: string
  namespaces_display: string | null
  alerts: number
  selector_labels: string | null
  tags: string[]
  failed_resources: number
  severity_breakdown: SeverityBreakdown
  framework_refs: unknown[]
  status: string
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
        Hardening controls from Kubescape-style findings (grouped by <code className="rounded bg-muted px-1">check_id</code>
        ). Status reflects whether any failing resources remain.
      </p>

      <div className="overflow-x-auto rounded-md border">
        <table className="w-full min-w-[960px] text-sm">
          <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
            <tr>
              <th className="p-2 w-8" />
              <th className="p-2">Name</th>
              <th className="p-2">Category</th>
              <th className="p-2">Namespaces</th>
              <th className="p-2">Alerts</th>
              <th className="p-2">Selector</th>
              <th className="p-2">Tags</th>
              <th className="p-2">Severity</th>
            </tr>
          </thead>
          <tbody>
            {data.policies.items.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-6 text-center text-muted-foreground">
                  No policy findings yet. Run a Kubescape scan to populate hardening policies.
                </td>
              </tr>
            ) : (
              data.policies.items.map((p) => (
                <tr key={p.check_id} className="border-t border-border">
                  <td className="p-2 align-middle">
                    <span
                      className={cn(
                        'inline-block h-2 w-2 rounded-full',
                        p.status === 'passed' ? 'bg-emerald-500' : 'bg-red-500'
                      )}
                      title={p.status === 'passed' ? 'No failing resources' : 'Has failing resources'}
                    />
                  </td>
                  <td className="p-2 align-top">
                    <div className="font-mono text-xs text-muted-foreground">{p.check_id}</div>
                    <div className="font-medium">{p.name}</div>
                    <div className="text-xs text-muted-foreground">{p.title}</div>
                  </td>
                  <td className="p-2 align-top capitalize">{p.category}</td>
                  <td className="max-w-[140px] p-2 align-top text-xs">{p.namespaces_display ?? '—'}</td>
                  <td className="p-2 align-top tabular-nums">{p.alerts}</td>
                  <td className="max-w-[120px] p-2 align-top text-xs text-muted-foreground">
                    {p.selector_labels ?? 'None'}
                  </td>
                  <td className="max-w-[140px] p-2 align-top text-xs">
                    {p.tags?.length ? (
                      <span className="line-clamp-2">{p.tags.slice(0, 3).join(', ')}</span>
                    ) : (
                      '—'
                    )}
                  </td>
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
