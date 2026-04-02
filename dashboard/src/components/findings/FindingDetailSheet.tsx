import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SeverityBadge } from '@/components/ui/SeverityBadge'
import type { FindingRow } from '@/api/findings'
import { patchFindingLifecycle } from '@/api/findings'

const lifecycleSchema = z.object({
  status: z.enum(['open', 'assigned', 'accepted_risk', 'false_positive', 'fixed', 'reopened']),
  assigned_to: z.string().max(200).optional(),
  ticket_ref: z.string().max(500).optional(),
})

type LifecycleForm = z.infer<typeof lifecycleSchema>

type Props = {
  finding: FindingRow | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
}

export function FindingDetailSheet({ finding, open, onOpenChange, onSaved }: Props) {
  const form = useForm<LifecycleForm>({
    resolver: zodResolver(lifecycleSchema),
    defaultValues: {
      status: 'open',
      assigned_to: '',
      ticket_ref: '',
    },
  })

  useEffect(() => {
    if (finding) {
      form.reset({
        status: (finding.status as LifecycleForm['status']) || 'open',
        assigned_to: finding.assigned_to ?? '',
        ticket_ref: finding.ticket_ref ?? '',
      })
    }
  }, [finding, form])

  const onSubmit = form.handleSubmit(async (values) => {
    if (!finding) return
    await patchFindingLifecycle(finding.id, {
      status: values.status,
      assigned_to: values.assigned_to || undefined,
      ticket_ref: values.ticket_ref || undefined,
    })
    onSaved()
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showClose variant="right">
        {finding ? (
          <>
            <DialogHeader>
              <p className="text-left text-xs text-muted-foreground">ID · {finding.id}</p>
              <DialogTitle className="text-left">{finding.title}</DialogTitle>
              <DialogDescription className="text-left">
                <span className="mr-2 inline-flex items-center gap-2">
                  <SeverityBadge severity={finding.severity} />
                  <span className="text-muted-foreground">{finding.domain}</span>
                </span>
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <p className="text-xs text-muted-foreground">Tool</p>
                <p className="font-medium">{finding.tool}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Cloud</p>
                <p className="font-medium">{finding.cloud_provider ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Status</p>
                <p className="font-medium">{finding.status}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Created</p>
                <p className="font-medium">{finding.created_at ?? '—'}</p>
              </div>
            </div>

            <form onSubmit={onSubmit} className="space-y-4 border-t border-border pt-4">
              <p className="text-sm font-semibold">Lifecycle</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="grid gap-1.5">
                  <label htmlFor="status" className="text-xs font-medium text-muted-foreground">
                    Status
                  </label>
                  <select
                    id="status"
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                    {...form.register('status')}
                  >
                    <option value="open">open</option>
                    <option value="assigned">assigned</option>
                    <option value="accepted_risk">accepted_risk</option>
                    <option value="false_positive">false_positive</option>
                    <option value="fixed">fixed</option>
                    <option value="reopened">reopened</option>
                  </select>
                  {form.formState.errors.status ? (
                    <p className="text-xs text-destructive">{form.formState.errors.status.message}</p>
                  ) : null}
                </div>
                <div className="grid gap-1.5">
                  <label htmlFor="assigned_to" className="text-xs font-medium text-muted-foreground">
                    Assignee
                  </label>
                  <Input id="assigned_to" placeholder="owner@example.com" {...form.register('assigned_to')} />
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="ticket_ref" className="text-xs font-medium text-muted-foreground">
                    Ticket URL / ref
                  </label>
                  <Input id="ticket_ref" placeholder="https://…" {...form.register('ticket_ref')} />
                </div>
              </div>
              <DialogFooter className="gap-2 sm:justify-end">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? 'Saving…' : 'Save'}
                </Button>
              </DialogFooter>
            </form>

            {(finding.resource_id || finding.resource_name || finding.check_id) && (
              <div className="border-t border-border pt-4">
                <p className="text-sm font-semibold">Resource context</p>
                <dl className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-xs text-muted-foreground">Resource ID</dt>
                    <dd className="break-all">{finding.resource_id ?? '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Resource name</dt>
                    <dd className="break-all">{finding.resource_name ?? '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Check ID</dt>
                    <dd className="break-all">{finding.check_id ?? '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Compliance tags</dt>
                    <dd className="break-all">{(finding.compliance || []).join(', ') || '—'}</dd>
                  </div>
                </dl>
              </div>
            )}

            {(finding.description || finding.remediation) && (
              <div className="border-t border-border pt-4">
                <p className="text-sm font-semibold">Details</p>
                {finding.description ? (
                  <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{finding.description}</p>
                ) : null}
                {finding.remediation ? (
                  <div className="mt-3">
                    <p className="text-xs font-medium text-muted-foreground">Remediation</p>
                    <p className="mt-1 whitespace-pre-wrap text-sm">{finding.remediation}</p>
                  </div>
                ) : null}
              </div>
            )}

            <div className="border-t border-border pt-4">
              <p className="text-sm font-semibold">Raw payload</p>
              <pre className="mt-2 max-h-48 overflow-auto rounded-md border border-border bg-muted/40 p-3 text-xs">
                {JSON.stringify(finding.raw ?? {}, null, 2)}
              </pre>
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
