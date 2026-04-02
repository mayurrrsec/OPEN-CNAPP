import { useMemo } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  Bell,
  ChevronDown,
  HelpCircle,
  Moon,
  Plus,
  Search,
  Sun,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/context/AuthContext'
import { useAppStore, type DateRangePreset } from '@/store'
import { cn } from '@/lib/utils'

const RANGE_LABEL: Record<DateRangePreset, string> = {
  '24h': 'Last 24 hours',
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
  '90d': 'Last 90 days',
  custom: 'Custom range',
}

export function Topbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const theme = useAppStore((s) => s.theme)
  const setTheme = useAppStore((s) => s.setTheme)
  const dateRange = useAppStore((s) => s.dateRange)
  const setDateRange = useAppStore((s) => s.setDateRange)
  const setCommandPaletteOpen = useAppStore((s) => s.setCommandPaletteOpen)
  const location = useLocation()

  const showDateRange = useMemo(() => {
    return location.pathname === '/' || location.pathname.startsWith('/dashboard/')
  }, [location.pathname])

  return (
    <header
      className={cn(
        'sticky top-0 z-30 flex h-[var(--topbar-height)] items-center gap-4 border-b border-border bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80',
        'pl-[calc(var(--sidebar-width)+1rem)]'
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="hidden shrink-0 gap-1 sm:flex">
              Demo organization
              <ChevronDown className="h-3.5 w-3.5 opacity-60" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuLabel>Units</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>Demo organization</DropdownMenuItem>
            <DropdownMenuItem disabled>+ Add unit (soon)</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="relative mx-auto max-w-xl flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            readOnly
            placeholder="Search or jump… (⌘K)"
            className="h-9 cursor-pointer pl-9"
            aria-label="Open command palette"
            onClick={() => setCommandPaletteOpen(true)}
            onFocus={() => setCommandPaletteOpen(true)}
          />
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {showDateRange ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="hidden gap-1 md:flex">
                {RANGE_LABEL[dateRange]}
                <ChevronDown className="h-3.5 w-3.5 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Date range</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {(Object.keys(RANGE_LABEL) as DateRangePreset[])
                .filter((k) => k !== 'custom')
                .map((key) => (
                  <DropdownMenuItem key={key} onClick={() => setDateRange(key)}>
                    {RANGE_LABEL[key]}
                  </DropdownMenuItem>
                ))}
              <DropdownMenuItem disabled>Custom… (soon)</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}

        <Button variant="outline" size="sm" className="hidden gap-1 lg:flex" asChild>
          <Link to="/connectors">
            <Plus className="h-4 w-4" />
            Add cloud
          </Link>
        </Button>

        <Button variant="ghost" size="icon" className="hidden sm:inline-flex" asChild>
          <Link to="/alerts" aria-label="Notifications">
            <Bell className="h-4 w-4" />
          </Link>
        </Button>

        <Button variant="ghost" size="icon" type="button" aria-label="Help">
          <HelpCircle className="h-4 w-4" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="max-w-[200px] truncate">
              {user?.email ?? 'Account'}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="truncate font-normal text-xs text-muted-foreground">
              {user?.email}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                logout()
                navigate('/login')
              }}
            >
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          variant="ghost"
          size="icon"
          type="button"
          aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
      </div>
    </header>
  )
}
