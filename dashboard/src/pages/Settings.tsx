import { Settings as SettingsIcon } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/EmptyState'
import { AdminUsersSection } from '@/components/settings/AdminUsersSection'

export default function Settings() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Users, notifications, API keys, and product preferences.
        </p>
      </div>

      <AdminUsersSection />

      <Card>
        <CardHeader>
          <CardTitle>Workspace</CardTitle>
          <CardDescription>Additional workspace preferences will appear here.</CardDescription>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={SettingsIcon}
            title="More settings soon"
            description="Notification channels and API keys can be wired from the backend when you are ready."
          />
        </CardContent>
      </Card>
    </div>
  )
}
