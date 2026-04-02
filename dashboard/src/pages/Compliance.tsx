import { useCallback, useEffect, useState } from 'react'
import { api } from '../api/client'
import { fetchControlGrid } from '@/api/compliance'
import { FrameworkRollup, ControlSeverityGrid } from '../components/charts/ComplianceHeatmap'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function Compliance() {
  const [rows, setRows] = useState<{ framework: string; findings: number }[]>([])
  const [frameworks, setFrameworks] = useState<string[]>([])
  const [selected, setSelected] = useState<string>('ALL')
  const [grid, setGrid] = useState<Awaited<ReturnType<typeof fetchControlGrid>> | null>(null)
  const [selectedControl, setSelectedControl] = useState<string | null>(null)

  const load = useCallback(() => {
    api.get('/compliance/frameworks').then((r) => setFrameworks(['ALL', ...(r.data || [])])).catch(() => setFrameworks(['ALL']))
    api.get('/compliance/heatmap').then((r) => setRows(r.data)).catch(() => setRows([]))
    const fw = selected === 'ALL' ? undefined : selected
    fetchControlGrid(fw)
      .then(setGrid)
      .catch(() => setGrid({ rows: [] }))
  }, [selected])

  useEffect(() => {
    load()
  }, [load])

  const cells = (rows || [])
    .filter((r) => (selected === 'ALL' ? true : String(r.framework).toUpperCase() === selected.toUpperCase()))
    .map((r) => ({ label: String(r.framework), value: Number(r.findings || 0) }))

  const detailRow = grid?.rows.find((r) => r.control === selectedControl)

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Compliance</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Framework rollups, control-level severity heatmap, and drilldown (v2).
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          >
            {(frameworks || ['ALL']).map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
          <Button type="button" variant="outline" size="sm" onClick={() => load()}>
            Refresh
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Framework findings</CardTitle>
          <CardDescription>Counts rolled up by framework prefix on each finding&apos;s compliance tags.</CardDescription>
        </CardHeader>
        <CardContent>
          <FrameworkRollup title={selected === 'ALL' ? 'All frameworks' : String(selected)} cells={cells} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Control heatmap</CardTitle>
          <CardDescription>
            Each row is a unique compliance tag. Severity columns show how findings are distributed (proxy for fail / warn
            / pass until full control tests exist).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ControlSeverityGrid
            rows={grid?.rows ?? []}
            selectedControl={selectedControl}
            onSelect={setSelectedControl}
          />
        </CardContent>
      </Card>

      {detailRow ? (
        <Card>
          <CardHeader>
            <CardTitle>Drilldown</CardTitle>
            <CardDescription>Selected control: {detailRow.control}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              <span className="font-medium text-foreground">Framework:</span> {detailRow.framework ?? '—'}
            </p>
            <p>
              This is a stub for per-control evidence, pass/fail/partial, and mapped findings. Wire to a dedicated
              controls API when the v3 schema lands.
            </p>
            <Button type="button" variant="outline" size="sm" onClick={() => setSelectedControl(null)}>
              Clear selection
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Notes</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <p>
            Control rows are derived from each finding&apos;s <code className="rounded bg-muted px-1">compliance</code>{' '}
            tags. For a full CIS/NIST control library with pass/fail, add structured control IDs at ingest time.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
