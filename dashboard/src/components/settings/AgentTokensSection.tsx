import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Copy, KeyRound, Plus, Trash2 } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '@/api/client'
import { PENDING_JOIN_TOKEN_KEY } from '@/constants/agentJoinToken'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'

type TokenRow = {
  id: string
  name: string
  prefix: string
  created_at: string | null
}

type CreateResponse = TokenRow & { token: string }

export function AgentTokensSection() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [createOpen, setCreateOpen] = useState(false)
  const [newName, setNewName] = useState('Cluster agent')
  const [createdSecret, setCreatedSecret] = useState<CreateResponse | null>(null)

  const { data: tokens = [], isLoading } = useQuery({
    queryKey: ['agent-tokens'],
    queryFn: () => api.get<TokenRow[]>('/settings/agent-tokens').then((r) => r.data),
  })

  const createMut = useMutation({
    mutationFn: (name: string) =>
      api.post<CreateResponse>('/settings/agent-tokens', { name }).then((r) => r.data),
    onSuccess: (data) => {
      setCreatedSecret(data)
      setCreateOpen(false)
      setNewName('Cluster agent')
      void qc.invalidateQueries({ queryKey: ['agent-tokens'] })
    },
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(`/settings/agent-tokens/${encodeURIComponent(id)}`),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['agent-tokens'] }),
  })

  const copyAndGoToWizard = async (token: string) => {
    try {
      await navigator.clipboard.writeText(token)
    } catch {
      /* ignore */
    }
    sessionStorage.setItem(PENDING_JOIN_TOKEN_KEY, token)
    setCreatedSecret(null)
    navigate('/connectors?addCluster=1')
  }

  return (
    <>
      <Card id="agent-tokens">
        <CardHeader>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <KeyRound className="h-5 w-5" />
                Agent join tokens
              </CardTitle>
              <CardDescription>
                Secrets for in-cluster agents (Helm <code className="text-xs">global.agents.joinToken</code>). Each
                token is shown <strong>once</strong> when created; store it in a password manager or paste it into the{' '}
                <Link className="text-primary underline" to="/connectors">
                  Add cluster
                </Link>{' '}
                wizard.
              </CardDescription>
            </div>
            <Button type="button" size="sm" className="shrink-0" onClick={() => setCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create token
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : tokens.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No tokens yet. Create one, then paste it into the install command or use &quot;Add cluster&quot; step 2.
            </p>
          ) : (
            <ul className="divide-y rounded-md border">
              {tokens.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{t.name}</div>
                    <div className="text-xs text-muted-foreground font-mono">{t.prefix}</div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="shrink-0 text-destructive"
                    aria-label={`Delete ${t.name}`}
                    onClick={() => {
                      if (window.confirm(`Delete token “${t.name}”? Agents using it will stop authenticating.`)) {
                        deleteMut.mutate(t.id)
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create agent join token</DialogTitle>
            <DialogDescription>
              Choose a label. You will see the full secret once — copy it before closing the next dialog.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-sm font-medium">Name</label>
            <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Production cluster" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={createMut.isPending || !newName.trim()}
              onClick={() => createMut.mutate(newName.trim())}
            >
              {createMut.isPending ? 'Creating…' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!createdSecret} onOpenChange={(o) => !o && setCreatedSecret(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Save this token now</DialogTitle>
            <DialogDescription>
              OpenCNAPP cannot show it again. Use it in Helm as <code>global.agents.joinToken</code> or in Add cluster →
              step 2.
            </DialogDescription>
          </DialogHeader>
          {createdSecret ? (
            <pre className="max-h-40 overflow-auto rounded-md bg-slate-950 p-3 text-xs text-slate-50 break-all whitespace-pre-wrap">
              {createdSecret.token}
            </pre>
          ) : null}
          <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={async () => {
                if (createdSecret) {
                  try {
                    await navigator.clipboard.writeText(createdSecret.token)
                  } catch {
                    /* ignore */
                  }
                }
              }}
            >
              <Copy className="mr-2 h-4 w-4" />
              Copy
            </Button>
            <Button type="button" onClick={() => createdSecret && void copyAndGoToWizard(createdSecret.token)}>
              Copy &amp; open Add cluster wizard
            </Button>
            <Button type="button" variant="secondary" onClick={() => setCreatedSecret(null)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
