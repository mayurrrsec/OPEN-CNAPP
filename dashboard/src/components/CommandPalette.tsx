import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Command } from 'cmdk'
import {
  Activity,
  CheckSquare,
  GitBranch,
  LayoutDashboard,
  Plug,
  Puzzle,
  Search,
  Server,
  Settings,
  ShieldAlert,
  Terminal,
} from 'lucide-react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { useAppStore } from '@/store'
import { cn } from '@/lib/utils'

type Item = { id: string; label: string; to: string; icon: React.ComponentType<{ className?: string }> }

const NAV: Item[] = [
  { id: 'dash', label: 'Dashboard', to: '/', icon: LayoutDashboard },
  { id: 'findings', label: 'Findings', to: '/findings', icon: ShieldAlert },
  { id: 'paths', label: 'Attack paths', to: '/attack-paths', icon: GitBranch },
  { id: 'inv', label: 'Inventory', to: '/inventory', icon: Server },
  { id: 'pentest', label: 'Pentest runner', to: '/pentest', icon: Terminal },
  { id: 'plugins', label: 'Plugins', to: '/plugins', icon: Puzzle },
  { id: 'conn', label: 'Connectors', to: '/connectors', icon: Plug },
  { id: 'alerts', label: 'Activity / alerts', to: '/alerts', icon: Activity },
  { id: 'comp', label: 'Compliance', to: '/compliance', icon: CheckSquare },
  { id: 'set', label: 'Settings', to: '/settings', icon: Settings },
]

export function CommandPalette() {
  const open = useAppStore((s) => s.commandPaletteOpen)
  const setOpen = useAppStore((s) => s.setCommandPaletteOpen)
  const toggle = useAppStore((s) => s.toggleCommandPalette)
  const navigate = useNavigate()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        toggle()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [toggle])

  const run = (to: string) => {
    setOpen(false)
    navigate(to)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent variant="center" className="max-w-lg overflow-hidden p-0" showClose>
        <DialogTitle className="sr-only">Command palette</DialogTitle>
        <Command className="rounded-lg border-none shadow-none">
          <div className="flex items-center border-b border-border px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
            <Command.Input
              placeholder="Jump to page or search…"
              className="flex h-12 w-full rounded-none border-0 bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <Command.List className="max-h-[min(60vh,360px)] overflow-y-auto p-2">
            <Command.Empty className="py-6 text-center text-sm text-muted-foreground">No matches.</Command.Empty>
            <Command.Group
              heading="Navigation"
              className="text-xs font-semibold text-muted-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5"
            >
              {NAV.map((item) => (
                <Command.Item
                  key={item.id}
                  value={`${item.label} ${item.to}`}
                  onSelect={() => run(item.to)}
                  className={cn(
                    'flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm',
                    'aria-selected:bg-muted aria-selected:text-foreground'
                  )}
                >
                  <item.icon className="h-4 w-4 text-muted-foreground" />
                  {item.label}
                </Command.Item>
              ))}
            </Command.Group>
          </Command.List>
          <div className="border-t border-border px-3 py-2 text-[10px] text-muted-foreground">
            <kbd className="rounded border border-border bg-muted px-1">⌘</kbd>
            <kbd className="ml-0.5 rounded border border-border bg-muted px-1">K</kbd>
            <span className="ml-2">Toggle palette · Enter to navigate</span>
          </div>
        </Command>
      </DialogContent>
    </Dialog>
  )
}
