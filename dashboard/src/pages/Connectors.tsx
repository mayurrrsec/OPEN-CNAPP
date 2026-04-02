import { useEffect, useState, type ComponentProps } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { Cloud, MoreHorizontal, Plug, Plus, RefreshCw } from 'lucide-react'
import { api } from '@/api/client'
import { AddCloudWizard } from '@/components/connectors/AddCloudWizard'
import {
  AddClusterWizard,
  type SavedClusterConnectorDetail,
} from '@/components/connectors/AddClusterWizard'
import { AddRegistryModal } from '@/components/connectors/AddRegistryModal'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
import { EmptyState } from '@/components/ui/EmptyState'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { useSearchParams } from 'react-router-dom'

type ConnectorRow = {
  id: string
  name: string
  display_name: string
  connector_type: string | null
  enabled: boolean
  settings?: Record<string, unknown>
  created_at?: string | null
  updated_at?: string | null
}

const TYPE_LABEL: Record<string, string> = {
  aws: 'AWS',
  azure: 'Azure',
  gcp: 'Google Cloud',
  kubernetes: 'Kubernetes',
  onprem: 'VM / On-premises',
  registry: 'Container registry',
}

function typeLabel(t: string | null | undefined) {
  if (!t) return '—'
  return TYPE_LABEL[t.toLowerCase()] ?? t
}

function isCloudType(t: string | null | undefined) {
  const x = (t || '').toLowerCase()
  return x === 'aws' || x === 'azure' || x === 'gcp'
}

export default function Connectors() {
  const [searchParams, setSearchParams] = useSearchParams()
  const qc = useQueryClient()
  const [cloudOpen, setCloudOpen] = useState(false)
  const [clusterOpen, setClusterOpen] = useState(false)
  const [registryOpen, setRegistryOpen] = useState(false)
  const [editCloudInitial, setEditCloudInitial] = useState<ComponentProps<typeof AddCloudWizard>['initial']>(null)
  const [editClusterInitial, setEditClusterInitial] = useState<ComponentProps<typeof AddClusterWizard>['initial']>(null)
  const [editRegistryInitial, setEditRegistryInitial] = useState<ComponentProps<typeof AddRegistryModal>['initial']>(null)

  const [renameOpen, setRenameOpen] = useState(false)
  const [renameTarget, setRenameTarget] = useState<ConnectorRow | null>(null)
  const [renameValue, setRenameValue] = useState('')

  const [savedClusterOpen, setSavedClusterOpen] = useState(false)
  const [savedClusterDetail, setSavedClusterDetail] = useState<SavedClusterConnectorDetail | null>(null)

  const { data: connectors = [], isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['connectors'],
    queryFn: () => api.get<ConnectorRow[]>('/connectors').then((r) => r.data),
  })

  useEffect(() => {
    if (searchParams.get('addCluster') !== '1') return
    setEditClusterInitial(null)
    setClusterOpen(true)
    const next = new URLSearchParams(searchParams)
    next.delete('addCluster')
    setSearchParams(next, { replace: true })
  }, [searchParams, setSearchParams])

  const patchMut = useMutation({
    mutationFn: async ({ name, enabled }: { name: string; enabled: boolean }) => {
      await api.patch(`/connectors/${encodeURIComponent(name)}/enabled`, { enabled })
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['connectors'] }),
  })

  const deleteMut = useMutation({
    mutationFn: async (name: string) => {
      await api.delete(`/connectors/${encodeURIComponent(name)}`)
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['connectors'] }),
  })

  const renameMut = useMutation({
    mutationFn: async () => {
      if (!renameTarget) return
      await api.patch(`/connectors/${encodeURIComponent(renameTarget.name)}`, {
        display_name: renameValue.trim(),
      })
    },
    onSuccess: () => {
      setRenameOpen(false)
      setRenameTarget(null)
      void qc.invalidateQueries({ queryKey: ['connectors'] })
    },
  })

  const testMut = useMutation({
    mutationFn: async (name: string) => {
      const r = await api.post<{ message?: string; ok?: boolean }>(`/connectors/${encodeURIComponent(name)}/test`)
      return r.data
    },
  })

  const openAddCloud = () => {
    setEditCloudInitial(null)
    setCloudOpen(true)
  }

  const openEdit = (c: ConnectorRow) => {
    if (isCloudType(c.connector_type)) {
      setEditCloudInitial({
        name: c.name,
        display_name: c.display_name,
        connector_type: c.connector_type || 'aws',
        settings: (c.settings || {}) as Record<string, unknown>,
      })
      setCloudOpen(true)
      return
    }
    const t = (c.connector_type || '').toLowerCase()
    if (t === 'kubernetes' || t === 'onprem') {
      setEditClusterInitial({
        name: c.name,
        display_name: c.display_name,
        connector_type: c.connector_type || 'kubernetes',
        settings: (c.settings || {}) as Record<string, unknown>,
      })
      setClusterOpen(true)
      return
    }
    if (t === 'registry') {
      setEditRegistryInitial({
        name: c.name,
        display_name: c.display_name,
        settings: (c.settings || {}) as Record<string, unknown>,
      })
      setRegistryOpen(true)
      return
    }
    setRenameTarget(c)
    setRenameValue(c.display_name)
    setRenameOpen(true)
  }

  const handleDelete = (c: ConnectorRow) => {
    const ok = window.confirm(`Delete connector “${c.display_name}” (${c.name})? This cannot be undone.`)
    if (!ok) return
    deleteMut.mutate(c.name)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Cloud connectors</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Link cloud accounts, clusters, and registries so findings, inventory, and posture data can sync into
            OpenCNAPP.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isFetching}
            onClick={() => void refetch()}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Separator orientation="vertical" className="hidden h-8 sm:block" />
          <Button type="button" variant="outline" size="sm" onClick={openAddCloud}>
            Add cloud
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setEditClusterInitial(null)
              setClusterOpen(true)
            }}
          >
            Add cluster
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => {
              setEditRegistryInitial(null)
              setRegistryOpen(true)
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add registry
          </Button>
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading connectors…</p>
      ) : isError ? (
        <EmptyState
          icon={Cloud}
          title="Could not load connectors"
          description="Check that the API is running and you are signed in."
          action={{ label: 'Retry', onClick: () => void refetch() }}
        />
      ) : connectors.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="pt-10">
            <EmptyState
              icon={Plug}
              title="No connectors yet"
              description="Add a cloud account, Kubernetes cluster, or container registry. Each type has its own onboarding flow."
              action={{ label: 'Add cloud', onClick: openAddCloud }}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {connectors.map((c) => (
            <Card key={c.id} className="border-border/80 shadow-sm">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <Cloud className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <CardTitle className="text-base leading-tight truncate">{c.display_name}</CardTitle>
                      <CardDescription className="font-mono text-xs truncate">{c.name}</CardDescription>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {c.enabled ? (
                      <Badge variant="success">Active</Badge>
                    ) : (
                      <Badge variant="secondary">Disabled</Badge>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" aria-label="Connector actions">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(c)}>Edit…</DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => patchMut.mutate({ name: c.name, enabled: !c.enabled })}
                        >
                          {c.enabled ? 'Disable' : 'Enable'}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            void testMut.mutateAsync(c.name).then(
                              (d) => {
                                window.alert(
                                  d?.message
                                    ? `${d.message}`
                                    : d?.ok
                                      ? 'Test succeeded'
                                      : 'Test finished'
                                )
                              },
                              (e) => {
                                if (axios.isAxiosError(e)) {
                                  window.alert(String(e.response?.data?.detail || e.message))
                                }
                              }
                            )
                          }}
                        >
                          Test connection
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => handleDelete(c)}
                        >
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Platform</span>
                  <span className="font-medium">{typeLabel(c.connector_type)}</span>
                </div>
                {c.settings?.wizard ? (
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground">Flow</span>
                    <span className="text-xs text-muted-foreground truncate max-w-[12rem]">
                      {String(c.settings.wizard)}
                    </span>
                  </div>
                ) : null}
                {c.created_at ? (
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground">Added</span>
                    <span className="tabular-nums text-muted-foreground">
                      {new Date(c.created_at).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AddCloudWizard
        open={cloudOpen}
        onOpenChange={(v) => {
          setCloudOpen(v)
          if (!v) setEditCloudInitial(null)
        }}
        onSaved={() => void qc.invalidateQueries({ queryKey: ['connectors'] })}
        initial={editCloudInitial}
      />

      <AddClusterWizard
        open={clusterOpen}
        onOpenChange={(v) => {
          setClusterOpen(v)
          if (!v) setEditClusterInitial(null)
        }}
        onSaved={(detail) => {
          void qc.invalidateQueries({ queryKey: ['connectors'] })
          if (detail) {
            setSavedClusterDetail(detail)
            setSavedClusterOpen(true)
          }
        }}
        initial={editClusterInitial}
      />

      <Dialog
        open={savedClusterOpen}
        onOpenChange={(v) => {
          setSavedClusterOpen(v)
          if (!v) setSavedClusterDetail(null)
        }}
      >
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Connector saved</DialogTitle>
            <DialogDescription>
              Configuration stored in OpenCNAPP. Use <strong>Edit…</strong> on the card to change it later.
            </DialogDescription>
          </DialogHeader>
          {savedClusterDetail ? (
            <div className="space-y-3 text-sm">
              <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Display name</span>
                  <span className="font-medium text-right">{savedClusterDetail.display_name}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Connector ID</span>
                  <span className="font-mono text-xs text-right break-all">{savedClusterDetail.name}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Workload</span>
                  <span className="font-medium">
                    {savedClusterDetail.target === 'kubernetes' ? 'Kubernetes' : 'VM / bare metal'}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Cluster / group name</span>
                  <span className="font-mono text-xs text-right">{savedClusterDetail.cluster_name}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Workspace tenant id</span>
                  <span className="font-mono text-[11px] text-right break-all max-w-[14rem]">
                    {savedClusterDetail.tenant_id}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Join token</span>
                  <span className="font-medium">{savedClusterDetail.has_join_token ? 'Saved' : 'Not set'}</span>
                </div>
              </div>
              <div className="rounded-lg border p-3 space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Capabilities</p>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Runtime visibility</span>
                  <span>{savedClusterDetail.enable_runtime ? 'On' : 'Off'}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Misconfiguration scans</span>
                  <span>{savedClusterDetail.enable_misconfig ? 'On' : 'Off'}</span>
                </div>
              </div>
              <div className="rounded-lg border p-3 space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">KSPM scanners</p>
                <ul className="list-disc pl-4 space-y-1 text-muted-foreground">
                  {savedClusterDetail.kspm.kubescape ? <li>Kubescape</li> : null}
                  {savedClusterDetail.kspm.kube_bench ? <li>kube-bench (CIS)</li> : null}
                  {savedClusterDetail.kspm.kube_hunter ? <li>kube-hunter</li> : null}
                  {savedClusterDetail.kspm.polaris ? <li>Polaris</li> : null}
                  {!savedClusterDetail.kspm.kubescape &&
                  !savedClusterDetail.kspm.kube_bench &&
                  !savedClusterDetail.kspm.kube_hunter &&
                  !savedClusterDetail.kspm.polaris ? (
                    <li className="list-none pl-0 text-muted-foreground/80">None selected</li>
                  ) : null}
                </ul>
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button type="button" onClick={() => setSavedClusterOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AddRegistryModal
        open={registryOpen}
        onOpenChange={(v) => {
          setRegistryOpen(v)
          if (!v) setEditRegistryInitial(null)
        }}
        onSaved={() => void qc.invalidateQueries({ queryKey: ['connectors'] })}
        initial={editRegistryInitial}
      />

      <Dialog
        open={renameOpen}
        onOpenChange={(v) => {
          setRenameOpen(v)
          if (!v) setRenameTarget(null)
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Rename connector</DialogTitle>
            <DialogDescription>
              Update the display name. To rotate credentials, edit a cloud connector and re-enter secrets.
            </DialogDescription>
          </DialogHeader>
          <Input value={renameValue} onChange={(e) => setRenameValue(e.target.value)} />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setRenameOpen(false)}>
              Cancel
            </Button>
            <Button type="button" disabled={renameMut.isPending} onClick={() => renameMut.mutate()}>
              {renameMut.isPending ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
