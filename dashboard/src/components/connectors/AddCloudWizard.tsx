import { useEffect, useState } from 'react'
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
import { cn } from '@/lib/utils'

const providers = [
  { id: 'aws', label: 'Amazon Web Services' },
  { id: 'azure', label: 'Microsoft Azure' },
  { id: 'gcp', label: 'Google Cloud' },
] as const

const accountTypes = [
  { id: 'standalone', label: 'Standalone account', hint: 'Single subscription or account' },
  { id: 'organization', label: 'Organization', hint: 'Org / management group / folder root' },
] as const

const awsConnectionMethods = [
  { id: 'terraform', label: 'Access keys — Terraform script (recommended)' },
  { id: 'access_keys', label: 'Access keys (manual)' },
  { id: 'iam_role', label: 'IAM role / assume role (manual)' },
  { id: 'sso_profile', label: 'AWS CLI / SSO profile' },
] as const

const azureConnectionMethods = [
  { id: 'service_principal', label: 'Service principal (app registration)' },
  { id: 'managed_identity', label: 'Managed identity (Azure-hosted runtime)' },
  { id: 'az_login', label: 'Azure CLI login (az login)' },
] as const

const scanAssetTypes = [
  { id: 'general', label: 'General cloud assets' },
  { id: 'general_aiml', label: 'General cloud and AI/ML assets' },
] as const

const schema = z
  .object({
    provider: z.enum(['aws', 'azure', 'gcp']),
    account_type: z.enum(['standalone', 'organization']),
    connection_method: z.enum(['terraform', 'access_keys', 'iam_role', 'sso_profile']),
    azure_connection_method: z.enum(['service_principal', 'managed_identity', 'az_login']),
    display_name: z.string().min(1, 'Display name is required'),
    connector_id: z
      .string()
      .min(1, 'Connector ID is required')
      .regex(/^[a-z0-9][a-z0-9_-]*$/, 'Use lowercase letters, numbers, hyphen or underscore'),
    regions: z.string().min(1, 'Select or enter at least one region'),
    scan_asset_type: z.enum(['general', 'general_aiml']),
    access_key_id: z.string().optional(),
    secret_access_key: z.string().optional(),
    external_id: z.string().optional(),
    role_arn: z.string().optional(),
    aws_sso_profile: z.string().optional(),
    azure_tenant_id: z.string().optional(),
    azure_client_id: z.string().optional(),
    azure_client_secret: z.string().optional(),
    azure_subscription_id: z.string().optional(),
    gcp_project_id: z.string().optional(),
    gcp_client_email: z.string().optional(),
    gcp_private_key: z.string().optional(),
    aws_organization_id: z.string().optional(),
    aws_account_filter: z.enum(['NONE', 'INCLUDE', 'EXCLUDE']),
    aws_account_ids: z.string().optional(),
    azure_management_group_ids: z.string().optional(),
    gcp_folder_org_notes: z.string().optional(),
    terraform_notes: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    const needKeys =
      data.provider === 'aws' &&
      (data.connection_method === 'access_keys' ||
        data.connection_method === 'terraform' ||
        data.connection_method === 'iam_role')
    if (needKeys) {
      if (!data.access_key_id?.trim()) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['access_key_id'], message: 'Access Key ID is required' })
      }
      if (!data.secret_access_key?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['secret_access_key'],
          message: 'Secret Access Key is required',
        })
      }
    }
    if (data.provider === 'aws' && data.connection_method === 'iam_role') {
      if (!data.external_id?.trim()) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['external_id'], message: 'External ID is required' })
      }
      if (!data.role_arn?.trim()) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['role_arn'], message: 'Role ARN is required' })
      }
    }
    if (data.provider === 'aws' && data.connection_method === 'sso_profile') {
      if (!data.aws_sso_profile?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['aws_sso_profile'],
          message: 'Profile name is required (matches ~/.aws/config)',
        })
      }
    }
    if (data.provider === 'azure') {
      if (!data.azure_subscription_id?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['azure_subscription_id'],
          message: 'Subscription ID is required',
        })
      }
      if (data.azure_connection_method === 'service_principal') {
        if (!data.azure_tenant_id?.trim()) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['azure_tenant_id'], message: 'Tenant ID is required' })
        }
        if (!data.azure_client_id?.trim()) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['azure_client_id'], message: 'Application (client) ID is required' })
        }
        if (!data.azure_client_secret?.trim()) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['azure_client_secret'], message: 'Client secret is required' })
        }
      }
    }
    if (data.provider === 'gcp') {
      if (!data.gcp_project_id?.trim()) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['gcp_project_id'], message: 'Project ID is required' })
      }
      if (!data.gcp_client_email?.trim()) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['gcp_client_email'], message: 'Client email is required' })
      }
      if (!data.gcp_private_key?.trim()) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['gcp_private_key'], message: 'Private key (JSON) is required' })
      }
    }
  })

export type AddCloudWizardProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
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

export function AddCloudWizard({ open, onOpenChange, onSaved, initial }: AddCloudWizardProps) {
  const [step, setStep] = useState(1)
  const [testMsg, setTestMsg] = useState<string | null>(null)
  const [testing, setTesting] = useState(false)
  const [saving, setSaving] = useState(false)

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      provider: 'aws',
      account_type: 'standalone',
      connection_method: 'terraform',
      azure_connection_method: 'service_principal',
      display_name: '',
      connector_id: '',
      regions: 'us-east-1',
      scan_asset_type: 'general',
      access_key_id: '',
      secret_access_key: '',
      external_id: '',
      role_arn: '',
      aws_sso_profile: '',
      azure_tenant_id: '',
      azure_client_id: '',
      azure_client_secret: '',
      azure_subscription_id: '',
      gcp_project_id: '',
      gcp_client_email: '',
      gcp_private_key: '',
      aws_organization_id: '',
      aws_account_filter: 'NONE',
      aws_account_ids: '',
      azure_management_group_ids: '',
      gcp_folder_org_notes: '',
      terraform_notes: '',
    },
  })

  const provider = form.watch('provider')
  const connectionMethod = form.watch('connection_method')
  const accountType = form.watch('account_type')

  const resetForOpen = () => {
    setStep(1)
    setTestMsg(null)
    if (initial) {
      form.reset({
        provider: (initial.connector_type as 'aws' | 'azure' | 'gcp') || 'aws',
        account_type: (initial.settings?.account_type as 'standalone' | 'organization') || 'standalone',
        connection_method:
          (initial.settings?.connection_method as 'terraform' | 'access_keys' | 'iam_role' | 'sso_profile') ||
          'terraform',
        azure_connection_method:
          (initial.settings?.azure_connection_method as 'service_principal' | 'managed_identity' | 'az_login') ||
          'service_principal',
        aws_sso_profile: String(initial.settings?.sso_profile || ''),
        display_name: initial.display_name,
        connector_id: initial.name,
        regions: Array.isArray(initial.settings?.regions)
          ? (initial.settings?.regions as string[]).join(', ')
          : String(initial.settings?.regions || 'us-east-1'),
        scan_asset_type: (initial.settings?.scan_asset_type as 'general' | 'general_aiml') || 'general',
        access_key_id: '',
        secret_access_key: '',
        external_id: String(initial.settings?.external_id || ''),
        role_arn: String(initial.settings?.role_arn || ''),
        azure_tenant_id: '',
        azure_client_id: '',
        azure_client_secret: '',
        azure_subscription_id: '',
        gcp_project_id: '',
        gcp_client_email: '',
        gcp_private_key: '',
        aws_organization_id: String(initial.settings?.aws_organization_id || ''),
        aws_account_filter:
          (initial.settings?.aws_account_filter as 'NONE' | 'INCLUDE' | 'EXCLUDE') || 'NONE',
        aws_account_ids: String(initial.settings?.aws_account_ids || ''),
        azure_management_group_ids: String(initial.settings?.azure_management_group_ids || ''),
        gcp_folder_org_notes: String(initial.settings?.gcp_folder_org_notes || ''),
        terraform_notes: String(initial.settings?.terraform_notes || ''),
      })
    } else {
      form.reset({
        provider: 'aws',
        account_type: 'standalone',
        connection_method: 'terraform',
        display_name: '',
        connector_id: '',
        regions: 'us-east-1',
        scan_asset_type: 'general',
        access_key_id: '',
        secret_access_key: '',
        external_id: '',
        role_arn: '',
        azure_tenant_id: '',
        azure_client_id: '',
        azure_client_secret: '',
        azure_subscription_id: '',
        gcp_project_id: '',
        gcp_client_email: '',
        gcp_private_key: '',
        aws_organization_id: '',
        aws_account_filter: 'NONE',
        aws_account_ids: '',
        azure_management_group_ids: '',
        gcp_folder_org_notes: '',
        terraform_notes: '',
        azure_connection_method: 'service_principal',
        aws_sso_profile: '',
      })
    }
  }

  useEffect(() => {
    if (open) {
      resetForOpen()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset when dialog opens
  }, [open, initial?.name])

  const buildPayload = (values: z.infer<typeof schema>) => {
    const regions = values.regions
      .split(/[,\s]+/)
      .map((s) => s.trim())
      .filter(Boolean)
    const settings: Record<string, unknown> = {
      wizard: 'add_cloud',
      account_type: values.account_type,
      connection_method: values.provider === 'aws' ? values.connection_method : undefined,
      azure_connection_method: values.provider === 'azure' ? values.azure_connection_method : undefined,
      gcp_connection_method: values.provider === 'gcp' ? 'service_account' : undefined,
      regions,
      scan_asset_type: values.scan_asset_type,
    }
    if (values.provider === 'aws' && values.connection_method === 'sso_profile' && values.aws_sso_profile?.trim()) {
      settings.sso_profile = values.aws_sso_profile.trim()
    }
    if (values.provider === 'aws' && values.connection_method === 'iam_role') {
      settings.external_id = values.external_id
      settings.role_arn = values.role_arn
    }
    if (values.account_type === 'organization') {
      settings.aws_organization_id = values.aws_organization_id?.trim() || undefined
      settings.aws_account_filter = values.aws_account_filter
      settings.aws_account_ids = values.aws_account_ids?.trim() || undefined
      settings.azure_management_group_ids = values.azure_management_group_ids?.trim() || undefined
      settings.gcp_folder_org_notes = values.gcp_folder_org_notes?.trim() || undefined
      settings.terraform_notes = values.terraform_notes?.trim() || undefined
    }
    const credentials: Record<string, string> = {}
    if (values.provider === 'aws') {
      if (values.access_key_id) credentials.access_key_id = values.access_key_id
      if (values.secret_access_key) credentials.secret_access_key = values.secret_access_key
      if (regions[0]) credentials.region = regions[0]
      if (values.connection_method === 'sso_profile' && values.aws_sso_profile?.trim()) {
        credentials.sso_profile = values.aws_sso_profile.trim()
      }
    }
    if (values.provider === 'azure') {
      credentials.subscription_id = values.azure_subscription_id || ''
      if (values.azure_connection_method === 'service_principal') {
        credentials.tenant_id = values.azure_tenant_id || ''
        credentials.client_id = values.azure_client_id || ''
        credentials.client_secret = values.azure_client_secret || ''
      }
    }
    if (values.provider === 'gcp') {
      credentials.project_id = values.gcp_project_id || ''
      credentials.client_email = values.gcp_client_email || ''
      credentials.private_key = values.gcp_private_key || ''
    }
    return {
      name: values.connector_id.trim(),
      display_name: values.display_name.trim(),
      connector_type: values.provider,
      credentials,
      settings,
    }
  }

  const handleTest = async () => {
    setTestMsg(null)
    const ok = await form.trigger()
    if (!ok) return
    const values = form.getValues()
    setTesting(true)
    try {
      const body = buildPayload(values)
      const r = await api.post<{
        ok?: boolean
        message?: string
        resource_count?: number
      }>('/connectors/test', {
        connector_type: body.connector_type,
        credentials: body.credentials,
        settings: body.settings,
      })
      const msg = r.data.message || (r.data.ok ? 'Connection check passed' : 'Validation finished')
      setTestMsg(`${msg}${typeof r.data.resource_count === 'number' ? ` · Resources: ${r.data.resource_count}` : ''}`)
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } }
      setTestMsg(err.response?.data?.detail || 'Test failed')
    } finally {
      setTesting(false)
    }
  }

  const handleSave = async () => {
    setTestMsg(null)
    const ok = await form.trigger()
    if (!ok) return
    const values = form.getValues()
    setSaving(true)
    try {
      const body = buildPayload(values)
      await api.post('/connectors', body)
      onSaved()
      onOpenChange(false)
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } }
      setTestMsg(err.response?.data?.detail || 'Could not save connector')
    } finally {
      setSaving(false)
    }
  }

  const next = async () => {
    if (step === 1) {
      const fields: (keyof z.infer<typeof schema>)[] = ['provider', 'account_type']
      const ok = await form.trigger(fields)
      if (ok) setStep(2)
      return
    }
    if (step === 2) {
      const fields: (keyof z.infer<typeof schema>)[] = ['display_name', 'connector_id']
      if (provider === 'aws') fields.push('connection_method')
      if (provider === 'azure') fields.push('azure_connection_method')
      const ok = await form.trigger(fields)
      if (ok) setStep(3)
    }
  }

  const back = () => {
    setStep((s) => Math.max(1, s - 1))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add cloud account</DialogTitle>
          <DialogDescription>
            Select provider and account scope, then credentials. Inspired by common CSPM onboarding flows; adapt fields to
            your environment.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2 text-xs text-muted-foreground">
          <span className={cn(step >= 1 && 'font-semibold text-foreground')}>1. Cloud account</span>
          <span>→</span>
          <span className={cn(step >= 2 && 'font-semibold text-foreground')}>2. Label &amp; ID</span>
          <span>→</span>
          <span className={cn(step >= 3 && 'font-semibold text-foreground')}>3. Connectivity</span>
        </div>

        {step === 1 ? (
          <div className="grid gap-4 py-2">
            <div>
              <p className="mb-2 text-sm font-medium">Cloud provider</p>
              <div className="grid gap-2 sm:grid-cols-3">
                {providers.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => form.setValue('provider', p.id)}
                    className={cn(
                      'rounded-lg border p-3 text-left text-sm transition-colors',
                      provider === p.id ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/40'
                    )}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-sm font-medium">Account type</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {accountTypes.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => form.setValue('account_type', a.id)}
                    className={cn(
                      'rounded-lg border p-3 text-left text-sm transition-colors',
                      form.watch('account_type') === a.id ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/40'
                    )}
                  >
                    <div className="font-medium">{a.label}</div>
                    <div className="text-xs text-muted-foreground">{a.hint}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="grid gap-4 py-2">
            {provider === 'aws' ? (
              <div className="space-y-2">
                <label className="text-sm font-medium">Connection method</label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={connectionMethod}
                  onChange={(e) =>
                    form.setValue(
                      'connection_method',
                      e.target.value as 'terraform' | 'access_keys' | 'iam_role' | 'sso_profile'
                    )
                  }
                >
                  {awsConnectionMethods.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
            {provider === 'azure' ? (
              <div className="space-y-2">
                <label className="text-sm font-medium">Connection method</label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={form.watch('azure_connection_method')}
                  onChange={(e) =>
                    form.setValue(
                      'azure_connection_method',
                      e.target.value as 'service_principal' | 'managed_identity' | 'az_login'
                    )
                  }
                >
                  {azureConnectionMethods.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">
                  Managed identity and Azure CLI require the API/worker to run where that identity or login session exists.
                </p>
              </div>
            ) : null}
            {provider === 'gcp' ? (
              <p className="text-sm text-muted-foreground">
                GCP uses a service account JSON key (entered in the next step). Workload identity federation can be added
                later.
              </p>
            ) : null}
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
                placeholder="e.g. Production AWS"
              />
              {form.formState.errors.display_name ? (
                <p className="text-xs text-destructive">{form.formState.errors.display_name.message}</p>
              ) : null}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Connector ID</label>
              <Input
                {...form.register('connector_id')}
                className="font-mono text-sm"
                placeholder="prod-aws"
                disabled={!!initial}
              />
              {form.formState.errors.connector_id ? (
                <p className="text-xs text-destructive">{form.formState.errors.connector_id.message}</p>
              ) : null}
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Regions</label>
              <Input {...form.register('regions')} placeholder="us-east-1, eu-west-1" />
              <p className="text-xs text-muted-foreground">Comma-separated. First region is used as default for scans.</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Scan asset type</label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={form.watch('scan_asset_type')}
                onChange={(e) =>
                  form.setValue('scan_asset_type', e.target.value as 'general' | 'general_aiml', { shouldValidate: true })
                }
              >
                {scanAssetTypes.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            {accountType === 'organization' ? (
              <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-3">
                <p className="text-sm font-medium">Organization scope</p>
                <p className="text-xs text-muted-foreground">
                  Identifiers for multi-account inventory and automation. Infrastructure-as-code templates are not
                  generated or applied from this screen; use your own pipeline and keep notes below if useful.
                </p>
                {provider === 'aws' ? (
                  <>
                    <div className="space-y-2">
                      <label className="text-xs font-medium">AWS Organization ID</label>
                      <Input {...form.register('aws_organization_id')} placeholder="o-xxxxxxxxxx" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-medium">Account filter</label>
                      <select
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={form.watch('aws_account_filter')}
                        onChange={(e) =>
                          form.setValue('aws_account_filter', e.target.value as 'NONE' | 'INCLUDE' | 'EXCLUDE')
                        }
                      >
                        <option value="NONE">All accounts in org</option>
                        <option value="INCLUDE">Include listed accounts only</option>
                        <option value="EXCLUDE">Exclude listed accounts</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-medium">Account IDs (comma-separated)</label>
                      <Input {...form.register('aws_account_ids')} placeholder="111111111111, 222222222222" />
                    </div>
                  </>
                ) : null}
                {provider === 'azure' ? (
                  <div className="space-y-2">
                    <label className="text-xs font-medium">Management group IDs (comma-separated)</label>
                    <Input {...form.register('azure_management_group_ids')} placeholder="mg-root, mg-platform…" />
                  </div>
                ) : null}
                {provider === 'gcp' ? (
                  <div className="space-y-2">
                    <label className="text-xs font-medium">Organization / folder (notes)</label>
                    <Input {...form.register('gcp_folder_org_notes')} placeholder="Optional hierarchy hints" />
                  </div>
                ) : null}
                <div className="space-y-2">
                  <label className="text-xs font-medium">IaC / runbook notes (optional)</label>
                  <textarea
                    {...form.register('terraform_notes')}
                    rows={3}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    placeholder="e.g. StackSet name, Terraform workspace, change ticket…"
                  />
                </div>
              </div>
            ) : null}

            {provider === 'aws' ? (
              <>
                {connectionMethod === 'iam_role' ? (
                  <>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">External ID</label>
                      <Input {...form.register('external_id')} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Role ARN</label>
                      <Input {...form.register('role_arn')} placeholder="arn:aws:iam::…:role/…" />
                    </div>
                  </>
                ) : null}
                {connectionMethod === 'sso_profile' ? (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">AWS profile name</label>
                    <Input {...form.register('aws_sso_profile')} placeholder="e.g. my-sso-profile" autoComplete="off" />
                    <p className="text-xs text-muted-foreground">
                      Must match a profile in the environment where the API tests credentials (often ~/.aws/config on the
                      host).
                    </p>
                  </div>
                ) : null}
                {connectionMethod !== 'sso_profile' ? (
                  <>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Access Key ID</label>
                      <Input {...form.register('access_key_id')} autoComplete="off" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Secret Access Key</label>
                      <Input type="password" {...form.register('secret_access_key')} autoComplete="off" />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      For Terraform, paste keys after running the generated script, or use placeholders until apply completes.
                    </p>
                  </>
                ) : null}
              </>
            ) : null}

            {provider === 'azure' ? (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Subscription ID</label>
                  <Input {...form.register('azure_subscription_id')} />
                </div>
                {form.watch('azure_connection_method') === 'service_principal' ? (
                  <>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Directory (tenant) ID</label>
                      <Input {...form.register('azure_tenant_id')} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Application (client) ID</label>
                      <Input {...form.register('azure_client_id')} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Client secret</label>
                      <Input type="password" {...form.register('azure_client_secret')} />
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No application secret required — authentication uses the runtime managed identity or{' '}
                    <code className="rounded bg-muted px-1 py-0.5 text-xs">az login</code> on the API host.
                  </p>
                )}
              </>
            ) : null}

            {provider === 'gcp' ? (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Project ID</label>
                  <Input {...form.register('gcp_project_id')} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Client email (service account)</label>
                  <Input {...form.register('gcp_client_email')} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Private key / JSON</label>
                  <textarea
                    {...form.register('gcp_private_key')}
                    rows={4}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-xs"
                    placeholder="{ ... } or PEM"
                  />
                </div>
              </>
            ) : null}

            {testMsg ? (
              <p className="text-sm text-muted-foreground" role="status">
                {testMsg}
              </p>
            ) : null}
          </div>
        ) : null}

        <DialogFooter className="gap-2 sm:justify-between">
          <div className="flex flex-wrap gap-2">
            {step > 1 ? (
              <Button type="button" variant="outline" onClick={back}>
                Back
              </Button>
            ) : (
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {step < 3 ? (
              <Button type="button" onClick={() => void next()}>
                Next
              </Button>
            ) : (
              <>
                <Button type="button" variant="outline" disabled={testing} onClick={() => void handleTest()}>
                  {testing ? 'Testing…' : 'Test connection'}
                </Button>
                <Button type="button" disabled={saving} onClick={() => void handleSave()}>
                  {saving ? 'Saving…' : 'Save connector'}
                </Button>
              </>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
