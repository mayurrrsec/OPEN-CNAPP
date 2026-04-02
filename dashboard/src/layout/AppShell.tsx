import type { ReactNode } from 'react'
import { Sidebar } from '@/layout/Sidebar'
import { Topbar } from '@/layout/Topbar'

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="min-h-screen pl-[var(--sidebar-width)]">
        <Topbar />
        <main className="p-[var(--content-padding)]">{children}</main>
      </div>
    </div>
  )
}
