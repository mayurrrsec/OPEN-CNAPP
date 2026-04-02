import { useEffect } from 'react'
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
  registry_kind: z.enum(['ecr', 'gar', 'acr', 'harbor', 'docker', 'generic']),
  display_name: z.string().min(1),
  connector_id: z
    .string()
    .min(1)
    .regex(/^[a-z0-9][a-z0-9_-]*$/, 'Use lowercase letters, numbers, hyphen or underscore'),
  registry_url: z.string().min(1, 'Registry URL or host is required'),
  username: z.string().optional(),
  password: z.string().optional(),
})

export type AddRegistryModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
}

function slugify(raw: string) {
  return raw
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9_-]/g, '')
}

export function AddRegistryModal({ open, onOpenChange, onSaved }: AddRegistryModalProps) {
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      registry_kind: 'generic',
      display_name: '',
      connector_id: '',
      registry_url: 'https://',
      username: '',
      password: '',
    },
  })

  useEffect(() => {
    if (open) {
      form.reset({
        registry_kind: 'generic',
        display_name: '',
        connector_id: '',
        registry_url: 'https://',
        username: '',
        password: '',
      })
    }
  }, [open, form.reset])

  const save = form.handleSubmit(async (values) => {
    await api.post('/connectors', {
      name: values.connector_id.trim(),
      display_name: values.display_name.trim(),
      connector_type: 'registry',
      credentials: {
        username: values.username,
        password: values.password,
        registry_url: values.registry_url,
      },
      settings: {
        wizard: 'add_registry',
        registry_kind: values.registry_kind,
      },
    })
    onSaved()
    onOpenChange(false)
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add container registry</DialogTitle>
          <DialogDescription>
            Store read-only credentials for image scanning. Provider-specific IAM roles are recommended for ECR/GAR in
            production.
          </DialogDescription>
        </DialogHeader>
        <form className="grid gap-3 py-2" onSubmit={(e) => void save(e)}>
          <div className="space-y-2">
            <label className="text-sm font-medium">Registry type</label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={form.watch('registry_kind')}
              onChange={(e) =>
                form.setValue('registry_kind', e.target.value as z.infer<typeof schema>['registry_kind'])
              }
            >
              <option value="ecr">Amazon ECR</option>
              <option value="gar">Google Artifact Registry</option>
              <option value="acr">Azure Container Registry</option>
              <option value="harbor">Harbor</option>
              <option value="docker">Docker Hub</option>
              <option value="generic">Other / generic</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Display name</label>
            <Input
              {...form.register('display_name')}
              onChange={(e) => {
                form.setValue('display_name', e.target.value)
                if (!form.getValues('connector_id')) {
                  form.setValue('connector_id', slugify(e.target.value))
                }
              }}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Connector ID</label>
            <Input {...form.register('connector_id')} className="font-mono text-sm" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Registry URL</label>
            <Input {...form.register('registry_url')} placeholder="https://registry.example.com" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Username (optional)</label>
            <Input {...form.register('username')} autoComplete="off" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Password / token (optional)</label>
            <Input type="password" {...form.register('password')} autoComplete="off" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? 'Saving…' : 'Save registry'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
