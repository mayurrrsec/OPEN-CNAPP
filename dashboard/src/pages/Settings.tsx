import { Settings as SettingsIcon } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/EmptyState'

export default function Settings() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Users, notifications, API keys, and product preferences.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Workspace</CardTitle>
          <CardDescription>Local-first deployment settings will appear here.</CardDescription>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={SettingsIcon}
            title="Settings UI is coming"
            description="JWT/local auth and notification channels remain as implemented in the API; this page will expose them in the next milestone."
          />
        </CardContent>
      </Card>
    </div>
  )
}
