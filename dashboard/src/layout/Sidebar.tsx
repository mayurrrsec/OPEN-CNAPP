import { useState, type ComponentType } from 'react'
import { NavLink } from 'react-router-dom'
import {
  Activity,
  CheckSquare,
  ChevronDown,
  ChevronRight,
  Cloud,
  Container,
  FileCode,
  GitBranch,
  Globe,
  Key,
  LayoutDashboard,
  Lock,
  Plug,
  Puzzle,
  Server,
  Settings,
  ShieldAlert,
  Terminal,
  Zap,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type NavItem = { to: string; label: string; icon: ComponentType<{ className?: string }> }

const overview: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/alerts', label: 'Activity', icon: Activity },
]

const findings: NavItem[] = [
  { to: '/findings', label: 'Findings', icon: ShieldAlert },
  { to: '/attack-paths', label: 'Attack Paths', icon: GitBranch },
  { to: '/inventory', label: 'Inventory', icon: Server },
]

const domains: NavItem[] = [
  { to: '/dashboard/cspm', label: 'CSPM', icon: Cloud },
  { to: '/dashboard/kspm', label: 'KSPM', icon: Container },
  { to: '/dashboard/cwpp', label: 'CWPP', icon: Zap },
  { to: '/dashboard/ciem', label: 'CIEM', icon: Key },
  { to: '/dashboard/secrets', label: 'Secrets', icon: Lock },
  { to: '/dashboard/iac', label: 'IaC', icon: FileCode },
  { to: '/dashboard/sspm', label: 'SSPM', icon: Globe },
]

const securityOps: NavItem[] = [
  { to: '/pentest', label: 'Pentest Runner', icon: Terminal },
  { to: '/compliance', label: 'Compliance', icon: CheckSquare },
]

const configuration: NavItem[] = [
  { to: '/plugins', label: 'Plugins', icon: Puzzle },
  { to: '/connectors', label: 'Connectors', icon: Plug },
  { to: '/settings', label: 'Settings', icon: Settings },
]

function NavBlock({ title, items }: { title: string; items: NavItem[] }) {
  return (
    <div className="mb-6">
      <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/45">
        {title}
      </p>
      <div className="flex flex-col gap-0.5">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-md border-l-2 border-transparent px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'border-primary bg-white/10 text-sidebar-foreground'
                  : 'text-sidebar-foreground/70 hover:bg-white/5 hover:text-sidebar-foreground'
              )
            }
          >
            <item.icon className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
            {item.label}
          </NavLink>
        ))}
      </div>
    </div>
  )
}

export function Sidebar() {
  const [domainsOpen, setDomainsOpen] = useState(true)

  return (
    <aside
      className="fixed left-0 top-0 z-40 flex h-screen w-[var(--sidebar-width)] flex-col border-r border-white/10 bg-sidebar text-sidebar-foreground"
      aria-label="Primary navigation"
    >
      <div className="flex items-start gap-3 border-b border-white/10 px-4 py-5">
        <div
          className="mt-0.5 h-9 w-9 shrink-0 rounded-lg bg-gradient-to-br from-primary/80 to-primary"
          aria-hidden
        />
        <div className="min-w-0">
          <div className="truncate text-sm font-bold tracking-tight">OpenCNAPP</div>
          <div className="text-xs text-sidebar-foreground/60">Local-first · Multi-cloud · Pluggable</div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-4">
        <NavBlock title="Overview" items={overview} />
        <NavBlock title="Findings" items={findings} />

        <div className="mb-2 px-3">
          <button
            type="button"
            onClick={() => setDomainsOpen((o) => !o)}
            className="flex w-full items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/45 hover:text-sidebar-foreground/70"
          >
            Domains
            {domainsOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          </button>
        </div>
        {domainsOpen ? (
          <div className="mb-6 flex flex-col gap-0.5">
            {domains.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-md border-l-2 border-transparent px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'border-primary bg-white/10 text-sidebar-foreground'
                      : 'text-sidebar-foreground/70 hover:bg-white/5 hover:text-sidebar-foreground'
                  )
                }
              >
                <item.icon className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
                {item.label}
              </NavLink>
            ))}
          </div>
        ) : null}

        <NavBlock title="Security ops" items={securityOps} />
        <NavBlock title="Configuration" items={configuration} />
      </nav>
    </aside>
  )
}
