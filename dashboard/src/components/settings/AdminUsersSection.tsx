import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Shield } from 'lucide-react'
import { api } from '@/api/client'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

type UserRow = {
  id: string
  email: string
  role: string
  auth_provider: string
  is_active: boolean
}

export function AdminUsersSection() {
  const { user: me } = useAuth()
  const qc = useQueryClient()

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => api.get<UserRow[]>('/admin/users').then((r) => r.data),
    enabled: me?.role === 'admin',
  })

  const createMut = useMutation({
    mutationFn: (body: { email: string; password: string; role: 'admin' | 'user' }) =>
      api.post('/admin/users', body),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['admin-users'] }),
  })

  const toggleMut = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      api.patch(`/admin/users/${encodeURIComponent(id)}/active`, null, { params: { active } }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['admin-users'] }),
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/users/${encodeURIComponent(id)}`),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['admin-users'] }),
  })

  if (me?.role !== 'admin') {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Users
        </CardTitle>
        <CardDescription>Create local email and password accounts. SSO users are provisioned on first login.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <form
          className="grid gap-3 sm:grid-cols-[1fr_1fr_auto_auto] sm:items-end"
          onSubmit={(e) => {
            e.preventDefault()
            const fd = new FormData(e.currentTarget)
            const email = String(fd.get('email') || '').trim()
            const password = String(fd.get('password') || '')
            const role = (String(fd.get('role') || 'user') as 'admin' | 'user') || 'user'
            if (!email || password.length < 8) return
            createMut.mutate({ email, password, role })
            e.currentTarget.reset()
          }}
        >
          <div className="space-y-1.5">
            <label htmlFor="nu-email" className="text-xs font-medium text-muted-foreground">
              Email
            </label>
            <Input id="nu-email" name="email" type="email" required autoComplete="off" />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="nu-pass" className="text-xs font-medium text-muted-foreground">
              Password (min 8)
            </label>
            <Input id="nu-pass" name="password" type="password" required minLength={8} autoComplete="new-password" />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="nu-role" className="text-xs font-medium text-muted-foreground">
              Role
            </label>
            <select
              id="nu-role"
              name="role"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              defaultValue="user"
            >
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <Button type="submit" disabled={createMut.isPending}>
            <Plus className="mr-2 h-4 w-4" />
            Add user
          </Button>
        </form>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading users…</p>
        ) : (
          <ul className="divide-y divide-border rounded-md border border-border">
            {users.map((u) => (
              <li key={u.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
                <div className="min-w-0">
                  <span className="font-medium">{u.email}</span>
                  <span className="ml-2 text-muted-foreground">{u.auth_provider}</span>
                  {u.role === 'admin' ? (
                    <Badge variant="default" className="ml-2">
                      admin
                    </Badge>
                  ) : null}
                  {!u.is_active ? (
                    <Badge variant="secondary" className="ml-2">
                      disabled
                    </Badge>
                  ) : null}
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={u.id === me.id || toggleMut.isPending}
                    onClick={() => toggleMut.mutate({ id: u.id, active: !u.is_active })}
                  >
                    {u.is_active ? 'Disable' : 'Enable'}
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    disabled={u.id === me.id || deleteMut.isPending}
                    onClick={() => {
                      if (window.confirm(`Remove ${u.email}?`)) deleteMut.mutate(u.id)
                    }}
                  >
                    Remove
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
