import { Outlet } from 'react-router-dom'
import { Sidebar } from '@/layout/Sidebar'
import { Topbar } from '@/layout/Topbar'

export function AppShell() {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="min-h-screen pl-[var(--sidebar-width)]">
        <Topbar />
        <main className="p-[var(--content-padding)]">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
