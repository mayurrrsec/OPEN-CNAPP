import { useEffect, useMemo, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Copy, KeyRound } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link } from 'react-router-dom'
import { api } from '@/api/client'
import { useAuth } from '@/context/AuthContext'
import { PENDING_JOIN_TOKEN_KEY } from '@/constants/agentJoinToken'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'

const schema = z.object({
  target: z.enum(['kubernetes', 'vm']),
  cluster_name: z
    .string()
    .min(1, 'Name is required')
    .regex(/^[a-zA-Z0-9._-]+$/, 'Use letters, numbers, dot, hyphen, underscore'),
  connector_id: z
    .string()
    .min(1, 'Connector ID is required')
    .regex(/^[a-z0-9][a-z0-9_-]*$/, 'Use lowercase letters, numbers, hyphen or underscore'),
  display_name: z.string().min(1, 'Display name is required'),
  token: z.string().optional(),
  enable_runtime: z.boolean(),
  enable_misconfig: z.boolean(),
  ksp_kubescape: z.boolean(),
  ksp_kube_bench: z.boolean(),
  ksp_kube_hunter: z.boolean(),
  ksp_polaris: z.boolean(),
})

/** Passed to `onSaved` after a successful create/update so the UI can show saved configuration. */
export type SavedClusterConnectorDetail = {
  name: string
  display_name: string
  connector_type: 'kubernetes' | 'onprem'
  target: 'kubernetes' | 'vm'
  cluster_name: string
  enable_runtime: boolean
  enable_misconfig: boolean
  kspm: {
    kubescape: boolean
    kube_bench: boolean
    kube_hunter: boolean
    polaris: boolean
  }
  has_join_token: boolean
  tenant_id: string
}

export type AddClusterWizardProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: (detail?: SavedClusterConnectorDetail) => void
  /** Prefill from GET /connectors/{name} (settings + display; secrets not returned). */
  initial?: {
    name: string
    display_name: string
    connector_type: string
    settings: Record<string, unknown>
  } | null
}

function slugify(raw: string) {
  return raw
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9_-]/g, '')
}

function readKspm(settings: Record<string, unknown>) {
  const k = settings.kspm as Record<string, unknown> | undefined
  if (!k || typeof k !== 'object') {
    return { kubescape: true, kube_bench: true, kube_hunter: false, polaris: true }
  }
  return {
    kubescape: k.kubescape !== false,
    kube_bench: k.kube_bench !== false,
    kube_hunter: k.kube_hunter === true,
    polaris: k.polaris !== false,
  }
}

type CreateTokenResponse = {
  id: string
  name: string
  prefix: string
  token: string
  created_at: string | null
}

export function AddClusterWizard({ open, onOpenChange, onSaved, initial }: AddClusterWizardProps) {
  const qc = useQueryClient()
  const { user, authConfig } = useAuth()
  const tenantId = user?.tenant_id ?? authConfig?.tenant_id ?? 'YOUR_TENANT'
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [createTokenOpen, setCreateTokenOpen] = useState(false)
  const [createTokenName, setCreateTokenName] = useState('Cluster agent')
  const [createTokenBusy, setCreateTokenBusy] = useState(false)
  const [tokenReveal, setTokenReveal] = useState<CreateTokenResponse | null>(null)
  /** User edited Connector ID manually — do not overwrite from display name on blur. */
  const connectorIdUserEdited = useRef(false)

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      target: 'kubernetes',
      cluster_name: 'prod-cluster',
      connector_id: '',
      display_name: '',
      token: '',
      enable_runtime: true,
      enable_misconfig: true,
      ksp_kubescape: true,
      ksp_kube_bench: true,
      ksp_kube_hunter: false,
      ksp_polaris: true,
    },
  })

  const target = form.watch('target')
  const clusterName = form.watch('cluster_name')
  const tokenVal = form.watch('token')
  const enableRuntime = form.watch('enable_runtime')
  const enableMisconfig = form.watch('enable_misconfig')
  const kspKubescape = form.watch('ksp_kubescape')
  const kspKubeBench = form.watch('ksp_kube_bench')
  const kspKubeHunter = form.watch('ksp_kube_hunter')
  const kspPolaris = form.watch('ksp_polaris')
  const displayNameVal = form.watch('display_name')
  const clusterNameVal = form.watch('cluster_name')
  const connectorId = form.watch('connector_id')

  useEffect(() => {
    if (!open) return
    setStep(1)
    setErr(null)
    setCreateTokenOpen(false)
    setTokenReveal(null)
    connectorIdUserEdited.current = false
    if (initial) {
      const s = initial.settings || {}
      const tgt = (s.target as 'kubernetes' | 'vm') || 'kubernetes'
      const kspm = readKspm(s)
      form.reset({
        target: tgt,
        cluster_name: String(s.cluster_name || 'prod-cluster'),
        connector_id: initial.name,
        display_name: initial.display_name,
        token: '',
        enable_runtime: s.enable_runtime !== false,
        enable_misconfig: s.enable_misconfig !== false,
        ksp_kubescape: kspm.kubescape,
        ksp_kube_bench: kspm.kube_bench,
        ksp_kube_hunter: kspm.kube_hunter,
        ksp_polaris: kspm.polaris,
      })
      connectorIdUserEdited.current = true
    } else {
      form.reset({
        target: 'kubernetes',
        cluster_name: 'prod-cluster',
        connector_id: '',
        display_name: '',
        token: '',
        enable_runtime: true,
        enable_misconfig: true,
        ksp_kubescape: true,
        ksp_kube_bench: true,
        ksp_kube_hunter: false,
        ksp_polaris: true,
      })
    }
    if (!initial) {
      const pending = sessionStorage.getItem(PENDING_JOIN_TOKEN_KEY)
      if (pending) {
        sessionStorage.removeItem(PENDING_JOIN_TOKEN_KEY)
        form.setValue('token', pending, { shouldValidate: true })
      }
    }
  }, [open, initial])

  const openCreateTokenDialog = () => {
    const base = displayNameVal?.trim() || clusterNameVal?.trim() || 'Cluster'
    setCreateTokenName(`${base} agent`)
    setCreateTokenOpen(true)
  }

  const submitCreateToken = async () => {
    const name = createTokenName.trim() || 'Cluster agent'
    setCreateTokenBusy(true)
    setErr(null)
    try {
      const { data } = await api.post<CreateTokenResponse>('/settings/agent-tokens', { name })
      form.setValue('token', data.token, { shouldValidate: true, shouldDirty: true })
      void qc.invalidateQueries({ queryKey: ['agent-tokens'] })
      setCreateTokenOpen(false)
      setTokenReveal(data)
    } catch (e: unknown) {
      const er = e as { response?: { data?: { detail?: string } } }
      setErr(er.response?.data?.detail || 'Could not create agent token')
    } finally {
      setCreateTokenBusy(false)
    }
  }

  const helmSnippet = useMemo(() => {
    const apiBase = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/$/, '')
    const join = tokenVal || 'YOUR_JOIN_TOKEN'
    const lines = [
      `helm upgrade --install opencnapp-agents oci://YOUR_REGISTRY/agents \\`,
      `  -n opencnapp-agents --create-namespace \\`,
      `# Same API URL as the dashboard (VITE_API_URL). Rename the value key if your agents chart differs.`,
      `  --set global.opencnappApiUrl="${apiBase}" \\`,
      `  --set global.clusterName="${clusterName}" \\`,
      `  --set global.tenantId="${tenantId}" \\`,
      `  --set global.agents.joinToken="${join}" \\`,
      `  --set global.runtime.enabled=${enableRuntime ? 'true' : 'false'} \\`,
      `  --set global.riskassessment.enabled=${enableMisconfig ? 'true' : 'false'} \\`,
      `# KSPM scanners (enable matching plugins under Plugin manager; chart names may vary by release)`,
      `  --set global.kspm.kubescape.enabled=${kspKubescape ? 'true' : 'false'} \\`,
      `  --set global.kspm.kubeBench.enabled=${kspKubeBench ? 'true' : 'false'} \\`,
      `  --set global.kspm.kubeHunter.enabled=${kspKubeHunter ? 'true' : 'false'} \\`,
      `  --set global.kspm.polaris.enabled=${kspPolaris ? 'true' : 'false'}`,
    ]
    return lines.join('\n')
  }, [
    clusterName,
    tenantId,
    tokenVal,
    enableRuntime,
    enableMisconfig,
    kspKubescape,
    kspKubeBench,
    kspKubeHunter,
    kspPolaris,
  ])

  const vmSnippet = useMemo(() => {
    const apiBase = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/$/, '')
    const join = tokenVal || 'YOUR_JOIN_TOKEN'
    return [
      `# VM / bare-metal agent — use the install script URL from your OpenCNAPP deployment package if different.`,
      `# The flags below match what the agent needs: API endpoint, workspace tenant, connector id, cluster name, join token.`,
      `curl -fsSL "${apiBase}/install/vm-agent.sh" | bash -s -- \\`,
      `  --opencnapp-api "${apiBase}" \\`,
      `  --tenant-id "${tenantId}" \\`,
      `  --connector-id "${connectorId || 'YOUR_CONNECTOR_ID'}" \\`,
      `  --cluster-name "${clusterName}" \\`,
      `  --token "${join}"`,
    ].join('\n')
  }, [clusterName, tokenVal, tenantId, connectorId])

  const save = async () => {
    setErr(null)
    const ok = await form.trigger()
    if (!ok) return
    const v = form.getValues()
    setSaving(true)
    try {
      const connector_type = v.target === 'kubernetes' ? 'kubernetes' : 'onprem'
      await api.post('/connectors', {
        name: v.connector_id.trim(),
        display_name: v.display_name.trim(),
        connector_type,
        credentials: v.token ? { join_token: v.token } : {},
        settings: {
          wizard: 'add_cluster',
          target: v.target,
          cluster_name: v.cluster_name,
          enable_runtime: v.enable_runtime,
          enable_misconfig: v.enable_misconfig,
          kspm: {
            kubescape: v.ksp_kubescape,
            kube_bench: v.ksp_kube_bench,
            kube_hunter: v.ksp_kube_hunter,
            polaris: v.ksp_polaris,
          },
        },
      })
      onSaved({
        name: v.connector_id.trim(),
        display_name: v.display_name.trim(),
        connector_type,
        target: v.target,
        cluster_name: v.cluster_name,
        enable_runtime: v.enable_runtime,
        enable_misconfig: v.enable_misconfig,
        kspm: {
          kubescape: v.ksp_kubescape,
          kube_bench: v.ksp_kube_bench,
          kube_hunter: v.ksp_kube_hunter,
          polaris: v.ksp_polaris,
        },
        has_join_token: Boolean(v.token?.trim()),
        tenant_id: tenantId,
      })
      onOpenChange(false)
    } catch (e: unknown) {
      const er = e as { response?: { data?: { detail?: string } } }
      setErr(er.response?.data?.detail || 'Could not save cluster connector')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add cluster / workload</DialogTitle>
          <DialogDescription>
            Choose Kubernetes or VM-style onboarding. Install commands are generated locally for you to run in your own
            environment; OpenCNAPP does not execute them on your behalf. Full walkthrough:{' '}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">docs/help/kspm-cluster-onboarding.md</code>
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2 text-xs text-muted-foreground">
          <span className={step >= 1 ? 'font-semibold text-foreground' : ''}>1. Type &amp; name</span>
          <span>→</span>
          <span className={step >= 2 ? 'font-semibold text-foreground' : ''}>2. Options</span>
          <span>→</span>
          <span className={step >= 3 ? 'font-semibold text-foreground' : ''}>3. Install command</span>
        </div>

        {step === 1 ? (
          <div className="grid gap-4 py-2">
            <div>
              <p className="mb-2 text-sm font-medium">Workload target</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {(
                  [
                    { id: 'kubernetes', label: 'Kubernetes', hint: 'Helm-based agents in-cluster' },
                    { id: 'vm', label: 'VM / bare metal', hint: 'Host agents or air-gapped bundles' },
                  ] as const
                ).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => form.setValue('target', t.id)}
                    className={`rounded-lg border p-3 text-left text-sm transition-colors ${
                      target === t.id ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/40'
                    }`}
                  >
                    <div className="font-medium">{t.label}</div>
                    <div className="text-xs text-muted-foreground">{t.hint}</div>
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Cluster / group name</label>
              <Input {...form.register('cluster_name')} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Display name</label>
              <Input
                value={form.watch('display_name')}
                onChange={(e) => form.setValue('display_name', e.target.value, { shouldValidate: true })}
                onBlur={() => {
                  if (initial || connectorIdUserEdited.current) return
                  const slug = slugify(form.getValues('display_name'))
                  if (slug) {
                    form.setValue('connector_id', slug, { shouldValidate: true })
                  }
                }}
                placeholder="Production EKS"
                autoComplete="off"
              />
              <p className="text-xs text-muted-foreground">
                Connector ID is filled from the display name when you leave this field, unless you edit Connector ID
                yourself.
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Connector ID</label>
              <Input
                className="font-mono text-sm"
                disabled={!!initial}
                value={form.watch('connector_id')}
                onChange={(e) => {
                  connectorIdUserEdited.current = true
                  form.setValue('connector_id', e.target.value, { shouldValidate: true })
                }}
                placeholder="production-eks"
                autoComplete="off"
              />
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="grid gap-4 py-2">
            <p className="text-sm font-medium">Agent capabilities</p>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.watch('enable_runtime')}
                onChange={(e) => form.setValue('enable_runtime', e.target.checked)}
              />
              Runtime visibility &amp; protection
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.watch('enable_misconfig')}
                onChange={(e) => form.setValue('enable_misconfig', e.target.checked)}
              />
              Cluster / host misconfiguration scans
            </label>

            <div className="rounded-lg border border-border bg-muted/20 p-3">
              <p className="text-sm font-medium">KSPM scanners (Plugin manager)</p>
              <p className="mb-3 text-xs text-muted-foreground">
                These match plugins in the repo (kubescape, kube-bench, kube-hunter, polaris). Enable and schedule them
                under <strong>Plugin manager</strong> after the cluster is connected.
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.watch('ksp_kubescape')}
                    onChange={(e) => form.setValue('ksp_kubescape', e.target.checked)}
                  />
                  Kubescape
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.watch('ksp_kube_bench')}
                    onChange={(e) => form.setValue('ksp_kube_bench', e.target.checked)}
                  />
                  kube-bench (CIS)
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.watch('ksp_kube_hunter')}
                    onChange={(e) => form.setValue('ksp_kube_hunter', e.target.checked)}
                  />
                  kube-hunter (active probes)
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.watch('ksp_polaris')}
                    onChange={(e) => form.setValue('ksp_polaris', e.target.checked)}
                  />
                  Polaris
                </label>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <label className="text-sm font-medium">Join token (recommended)</label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full shrink-0 sm:w-auto"
                  onClick={() => openCreateTokenDialog()}
                >
                  <KeyRound className="mr-2 h-4 w-4" />
                  Create new token
                </Button>
              </div>
              <Input {...form.register('token')} placeholder="Paste token or use Create new token above" />
              <p className="text-xs text-muted-foreground">
                Agents authenticate to your tenant with this value. Use <strong>Create new token</strong> to generate one
                here (same as{' '}
                <Link className="text-primary underline" to="/settings#agent-tokens">
                  Settings → Agent join tokens
                </Link>
                ). It fills <code className="text-[11px]">YOUR_JOIN_TOKEN</code> in step 3. You can also paste an
                existing token.
              </p>
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="grid gap-3 py-2">
            <p className="text-sm text-muted-foreground">
              {target === 'kubernetes' ? (
                <>
                  Run in a shell with <code className="text-xs">kubectl</code> and Helm configured.{' '}
                  <code className="text-xs">global.opencnappApiUrl</code> matches this dashboard&apos;s API (
                  <code className="text-xs">VITE_API_URL</code>); <code className="text-xs">global.tenantId</code> is your
                  workspace id; <code className="text-xs">global.agents.joinToken</code> is the join token from step 2.
                </>
              ) : (
                <>
                  Run on the <strong>target host</strong> (SSH or console). The script uses{' '}
                  <code className="text-xs">--opencnapp-api</code> (dashboard API URL),{' '}
                  <code className="text-xs">--tenant-id</code> (same as Helm{' '}
                  <code className="text-xs">global.tenantId</code>), <code className="text-xs">--connector-id</code> (this
                  connector&apos;s id), plus cluster name and join token. Replace the script URL if your distribution
                  ships the installer elsewhere.
                </>
              )}
            </p>
            <pre className="max-h-72 overflow-auto rounded-md bg-slate-950 p-3 text-xs text-slate-50 whitespace-pre-wrap">
              {target === 'kubernetes' ? helmSnippet : vmSnippet}
            </pre>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-fit"
              onClick={() => void navigator.clipboard.writeText(target === 'kubernetes' ? helmSnippet : vmSnippet)}
            >
              Copy command
            </Button>
          </div>
        ) : null}

        {err ? (
          <p className="text-sm text-destructive" role="alert">
            {err}
          </p>
        ) : null}

        <Dialog open={createTokenOpen} onOpenChange={setCreateTokenOpen}>
          <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
            <DialogHeader>
              <DialogTitle>Create agent join token</DialogTitle>
              <DialogDescription>
                This creates the same kind of token as in Settings. The secret is shown once after you create it.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <label className="text-sm font-medium">Label</label>
              <Input
                value={createTokenName}
                onChange={(e) => setCreateTokenName(e.target.value)}
                placeholder="Production cluster agent"
                autoComplete="off"
              />
            </div>
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setCreateTokenOpen(false)}>
                Cancel
              </Button>
              <Button type="button" disabled={createTokenBusy || !createTokenName.trim()} onClick={() => void submitCreateToken()}>
                {createTokenBusy ? 'Creating…' : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={!!tokenReveal} onOpenChange={(o) => !o && setTokenReveal(null)}>
          <DialogContent className="max-w-lg" onPointerDownOutside={(e) => e.preventDefault()}>
            <DialogHeader>
              <DialogTitle>Token created</DialogTitle>
              <DialogDescription>
                It is already filled in the join field above. Copy it now if you need a backup — OpenCNAPP will not show
                the full value again.
              </DialogDescription>
            </DialogHeader>
            {tokenReveal ? (
              <pre className="max-h-40 overflow-auto rounded-md bg-slate-950 p-3 text-xs text-slate-50 break-all whitespace-pre-wrap">
                {tokenReveal.token}
              </pre>
            ) : null}
            <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={async () => {
                  if (tokenReveal) {
                    try {
                      await navigator.clipboard.writeText(tokenReveal.token)
                    } catch {
                      /* ignore */
                    }
                  }
                }}
              >
                <Copy className="mr-2 h-4 w-4" />
                Copy
              </Button>
              <Button type="button" onClick={() => setTokenReveal(null)}>
                Continue
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <DialogFooter className="gap-2 sm:justify-between">
          <div className="flex gap-2">
            {step > 1 ? (
              <Button type="button" variant="outline" onClick={() => setStep((s) => Math.max(1, s - 1))}>
                Back
              </Button>
            ) : (
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            {step < 3 ? (
              <Button
                type="button"
                onClick={async () => {
                  if (step === 1) {
                    const ok = await form.trigger(['target', 'cluster_name', 'display_name', 'connector_id'])
                    if (ok) setStep(2)
                  } else {
                    setStep(3)
                  }
                }}
              >
                Next
              </Button>
            ) : (
              <Button type="button" disabled={saving} onClick={() => void save()}>
                {saving ? 'Saving…' : 'Save connector'}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
