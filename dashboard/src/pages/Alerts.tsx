import { useCallback, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Bell, Radio, Send } from 'lucide-react'
import { useWebSocket } from '../hooks/useWebSocket'
import { api } from '@/api/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { EmptyState } from '@/components/ui/EmptyState'

type RuleRow = {
  name: string
  min_severity?: string
  notifier_url?: string | null
  enabled?: boolean
}

type FeedItem = { id: number; ts: number; payload: unknown }

let _feedId = 0

export default function Alerts() {
  const qc = useQueryClient()
  const [name, setName] = useState('High severity route')
  const [url, setUrl] = useState('')
  const [feed, setFeed] = useState<FeedItem[]>([])

  const onMessage = useCallback((msg: unknown) => {
    setFeed((prev) => [{ id: ++_feedId, ts: Date.now(), payload: msg }, ...prev].slice(0, 50))
  }, [])
  useWebSocket((import.meta.env.VITE_WS_URL || 'ws://localhost:8000') + '/ws/alerts', onMessage)

  const { data: rules = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ['alerts', 'rules'],
    queryFn: () => api.get<RuleRow[]>('/alerts/rules').then((r) => r.data),
  })

  const testMut = useMutation({
    mutationFn: () => api.post('/alerts/test'),
  })

  const addMut = useMutation({
    mutationFn: () =>
      api.post('/alerts/rules', {
        name,
        notifier_url: url || null,
        min_severity: 'HIGH',
        enabled: true,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['alerts', 'rules'] })
      setUrl('')
    },
  })

  const feedPreview = useMemo(() => {
    return feed.map((item) => {
      let text: string
      try {
        text =
          typeof item.payload === 'string'
            ? item.payload
            : JSON.stringify(item.payload, null, 2)
      } catch {
        text = String(item.payload)
      }
      return { ...item, text }
    })
  }, [feed])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Activity</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Notification rules and a live feed of events from your OpenCNAPP deployment.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              <div>
                <CardTitle>Alert rules</CardTitle>
                <CardDescription>Route findings above a severity threshold to webhooks (Apprise URLs).</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isFetching}
                onClick={() => void refetch()}
              >
                Load rules
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={testMut.isPending}
                onClick={() => testMut.mutate()}
              >
                <Send className="mr-2 h-4 w-4" />
                Test notifications
              </Button>
            </div>

            <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
              <div className="space-y-2">
                <label htmlFor="rule-name" className="text-sm font-medium">
                  Rule name
                </label>
                <Input
                  id="rule-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Critical CSPM"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="rule-url" className="text-sm font-medium">
                  Apprise URL
                </label>
                <Input
                  id="rule-url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="discord://… or slack://…"
                  autoComplete="off"
                />
              </div>
              <Button
                type="button"
                className="sm:mb-0.5"
                disabled={addMut.isPending}
                onClick={() => addMut.mutate()}
              >
                Add rule
              </Button>
            </div>

            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading rules…</p>
            ) : rules.length === 0 ? (
              <EmptyState
                icon={Bell}
                title="No rules yet"
                description="Add a rule with an Apprise notification URL to forward high-severity findings."
              />
            ) : (
              <ul className="divide-y divide-border rounded-lg border border-border">
                {rules.map((r, i) => (
                  <li key={`${r.name}-${i}`} className="flex flex-wrap items-center justify-between gap-2 px-3 py-3 text-sm">
                    <span className="font-medium">{r.name}</span>
                    <div className="flex flex-wrap items-center gap-2">
                      {r.min_severity ? (
                        <Badge variant="outline">{r.min_severity}</Badge>
                      ) : null}
                      {r.enabled === false ? (
                        <Badge variant="secondary">Off</Badge>
                      ) : (
                        <Badge variant="success">On</Badge>
                      )}
                      {r.notifier_url ? (
                        <span className="max-w-[200px] truncate text-xs text-muted-foreground" title={r.notifier_url}>
                          {r.notifier_url}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">No URL</span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Radio className="h-5 w-5 text-primary" />
              <div>
                <CardTitle>Live feed</CardTitle>
                <CardDescription>Real-time events from your OpenCNAPP alert channel.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex min-h-[280px] flex-1 flex-col">
            {feedPreview.length === 0 ? (
              <EmptyState
                icon={Bell}
                title="No alerts"
                description="No runtime alerts in the selected time range. When the API broadcasts activity, entries appear here."
              />
            ) : (
              <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
                {feedPreview.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-lg border border-border bg-card p-3 text-left shadow-sm"
                  >
                    <div className="text-xs text-muted-foreground">
                      {new Date(item.ts).toLocaleString()}
                    </div>
                    <pre className="mt-2 max-h-32 overflow-auto whitespace-pre-wrap break-words font-mono text-[11px] leading-relaxed text-foreground">
                      {item.text}
                    </pre>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
