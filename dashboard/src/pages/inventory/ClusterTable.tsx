import { useMemo, useState } from 'react'
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from '@tanstack/react-table'
import { AlertTriangle, Hexagon, MoreHorizontal } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

export type ClusterInventoryRow = {
  id: string
  name: string
  display_name: string
  cluster_name: string
  cloud_type: string
  connection_status: string
  alerts_count: number
  findings: { cis: number; kspm: number; img: number; sec: number }
  onboarded_at: string | null
  last_synced_at: string | null
  nodes: number
  workloads: number
  namespaces: number
  active_policies: number
  tags: string[]
}

function fmtDt(iso: string | null) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString(undefined, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  } catch {
    return iso
  }
}

function FindingPills({ f }: { f: ClusterInventoryRow['findings'] }) {
  const parts = [
    { k: 'CIS', v: f.cis },
    { k: 'KSPM', v: f.kspm },
    { k: 'IMG', v: f.img },
    { k: 'SEC', v: f.sec },
  ]
  return (
    <div className="flex flex-wrap gap-1 text-[10px] leading-tight">
      {parts.map(({ k, v }) => (
        <span
          key={k}
          className="rounded border border-border bg-muted/30 px-1.5 py-0.5 text-muted-foreground"
        >
          {k}:{v > 0 ? v : '—'}
        </span>
      ))}
    </div>
  )
}

function statusDot(status: string) {
  const s = (status || '').toLowerCase()
  if (s === 'connected') return 'bg-emerald-500'
  if (s === 'pending') return 'bg-amber-400'
  return 'bg-red-500'
}

export function ClusterTable({
  rows,
  onRowOpen,
  onDelete,
}: {
  rows: ClusterInventoryRow[]
  onRowOpen: (row: ClusterInventoryRow) => void
  onDelete: (row: ClusterInventoryRow) => void
}) {
  const [onboardingFor, setOnboardingFor] = useState<ClusterInventoryRow | null>(null)

  const columns = useMemo<ColumnDef<ClusterInventoryRow>[]>(
    () => [
      {
        id: 'name',
        header: 'Name',
        cell: ({ row }) => {
          const r = row.original
          return (
            <div className="flex items-center gap-2">
              <span className={cn('h-2 w-2 shrink-0 rounded-full', statusDot(r.connection_status))} title={r.connection_status} />
              <Hexagon className="h-4 w-4 shrink-0 text-blue-600" aria-hidden />
              <span className="font-medium">{r.display_name}</span>
            </div>
          )
        },
      },
      {
        id: 'cloud',
        header: 'Cloud',
        cell: ({ row }) => (
          <span className="capitalize text-muted-foreground">{row.original.cloud_type || '—'}</span>
        ),
      },
      {
        id: 'alerts',
        header: 'Alerts',
        cell: ({ row }) => {
          const n = row.original.alerts_count
          return (
            <div className="flex items-center gap-1 text-sm tabular-nums">
              <AlertTriangle className={cn('h-4 w-4', n > 0 ? 'text-destructive' : 'text-muted-foreground')} />
              {n}
            </div>
          )
        },
      },
      {
        id: 'findings',
        header: () => (
          <div>
            <div>Findings</div>
            <div className="mt-0.5 text-[9px] font-normal text-muted-foreground">CIS · KSPM · IMG · SEC</div>
          </div>
        ),
        cell: ({ row }) => <FindingPills f={row.original.findings} />,
      },
      { id: 'onboarded', header: 'Onboarded', cell: ({ row }) => fmtDt(row.original.onboarded_at) },
      { id: 'last_synced', header: 'Last Synced', cell: ({ row }) => fmtDt(row.original.last_synced_at) },
      { id: 'nodes', header: 'Nodes', cell: ({ row }) => row.original.nodes },
      { id: 'workloads', header: 'Workloads', cell: ({ row }) => row.original.workloads },
      { id: 'namespaces', header: 'Namespaces', cell: ({ row }) => row.original.namespaces },
      { id: 'active_policies', header: 'Active Policies', cell: ({ row }) => row.original.active_policies },
      {
        id: 'tags',
        header: 'Tags',
        cell: ({ row }) => (row.original.tags?.length ? row.original.tags.join(', ') : 'None'),
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => {
          const r = row.original
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8" aria-label="Actions">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setOnboardingFor(r)}>View onboarding instructions</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => onDelete(r)}
                >
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )
        },
      },
    ],
    [onDelete, setOnboardingFor]
  )

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <>
      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full min-w-[960px] text-sm">
          <thead className="bg-muted/50 text-left text-xs font-medium text-muted-foreground">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((h) => (
                  <th key={h.id} className="whitespace-nowrap border-b border-border px-3 py-2">
                    {h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                className="cursor-pointer border-b border-border/60 hover:bg-muted/40"
                onClick={(e) => {
                  if ((e.target as HTMLElement).closest('button,[role="menuitem"]')) return
                  onRowOpen(row.original)
                }}
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-3 py-2 align-middle">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>
          1–{rows.length} of {rows.length}
        </span>
        <span>Rows per page: 10</span>
      </div>

      <Dialog open={!!onboardingFor} onOpenChange={(o) => !o && setOnboardingFor(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Onboarding — {onboardingFor?.display_name}</DialogTitle>
            <DialogDescription>
              Use <strong>Add cluster</strong> on the Connectors page to copy the Helm or VM install command.
            </DialogDescription>
          </DialogHeader>
          <p className="font-mono text-xs text-muted-foreground">Connector ID: {onboardingFor?.name}</p>
          <DialogFooter>
            <Button type="button" variant="outline" asChild>
              <Link to="/connectors">Open Connectors</Link>
            </Button>
            <Button type="button" onClick={() => setOnboardingFor(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
