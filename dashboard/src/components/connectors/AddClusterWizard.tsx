import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { api } from '@/api/client'
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
  cluster_name: z.string().min(1, 'Name is required').regex(/^[a-zA-Z0-9._-]+$/, 'Use letters, numbers, dot, hyphen, underscore'),
  connector_id: z
    .string()
    .min(1, 'Connector ID is required')
    .regex(/^[a-z0-9][a-z0-9_-]*$/, 'Use lowercase letters, numbers, hyphen or underscore'),
  display_name: z.string().min(1, 'Display name is required'),
  token: z.string().optional(),
  enable_runtime: z.boolean(),
  enable_misconfig: z.boolean(),
})

export type AddClusterWizardProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
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

export function AddClusterWizard({ open, onOpenChange, onSaved, initial }: AddClusterWizardProps) {
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

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
    },
  })

  const target = form.watch('target')
  const clusterName = form.watch('cluster_name')
  const tokenVal = form.watch('token')
  const enableRuntime = form.watch('enable_runtime')
  const enableMisconfig = form.watch('enable_misconfig')

  useEffect(() => {
    if (!open) return
    setStep(1)
    setErr(null)
    if (initial) {
      const s = initial.settings || {}
      const target = (s.target as 'kubernetes' | 'vm') || 'kubernetes'
      form.reset({
        target,
        cluster_name: String(s.cluster_name || 'prod-cluster'),
        connector_id: initial.name,
        display_name: initial.display_name,
        token: '',
        enable_runtime: s.enable_runtime !== false,
        enable_misconfig: s.enable_misconfig !== false,
      })
    } else {
      form.reset({
        target: 'kubernetes',
        cluster_name: 'prod-cluster',
        connector_id: '',
        display_name: '',
        token: '',
        enable_runtime: true,
        enable_misconfig: true,
      })
    }
  }, [open, initial?.name, form.reset])

  const helmSnippet = useMemo(() => {
    const tenant = 'YOUR_TENANT'
    const join = tokenVal || 'YOUR_JOIN_TOKEN'
    const flags = [
      `helm upgrade --install opencnapp-agents oci://YOUR_REGISTRY/agents \\`,
      `  -n opencnapp-agents --create-namespace \\`,
      `  --set global.clusterName="${clusterName}" \\`,
      `  --set global.tenantId="${tenant}" \\`,
      `  --set global.agents.joinToken="${join}" \\`,
      `  --set global.runtime.enabled=${enableRuntime ? 'true' : 'false'} \\`,
      `  --set global.riskassessment.enabled=${enableMisconfig ? 'true' : 'false'}`,
    ]
    return flags.join('\n')
  }, [clusterName, tokenVal, enableRuntime, enableMisconfig])

  const vmSnippet = useMemo(() => {
    return [
      `# Example: install node agent / bundle for VM workload visibility`,
      `curl -fsSL https://example.opencnapp.dev/install-vm-agent.sh | bash -s -- \\`,
      `  --cluster-name "${clusterName}" \\`,
      `  --token "${tokenVal || 'YOUR_TOKEN'}"`,
    ].join('\n')
  }, [clusterName, tokenVal])

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
        },
      })
      onSaved()
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
            environment; OpenCNAPP does not execute them on your behalf.
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
                {...form.register('display_name')}
                onChange={(e) => {
                  form.setValue('display_name', e.target.value)
                  if (!initial && !form.getValues('connector_id')) {
                    form.setValue('connector_id', slugify(e.target.value))
                  }
                }}
                placeholder="Production EKS"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Connector ID</label>
              <Input {...form.register('connector_id')} className="font-mono text-sm" disabled={!!initial} />
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="grid gap-4 py-2">
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
            <div className="space-y-2">
              <label className="text-sm font-medium">Join token (optional)</label>
              <Input {...form.register('token')} placeholder="Paste token from Settings → Tokens" />
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="grid gap-3 py-2">
            <p className="text-sm text-muted-foreground">
              Run the command in a shell with kubectl and Helm configured (Kubernetes) or on the target VM host.
            </p>
            <pre className="max-h-64 overflow-auto rounded-md bg-slate-950 p-3 text-xs text-slate-50">
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
