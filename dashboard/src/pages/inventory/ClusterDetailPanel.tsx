import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Activity,
  AlertTriangle,
  ClipboardList,
  Cloud,
  Fingerprint,
  Hexagon,
  ScanSearch,
  Settings2,
  Shield,
  ShieldAlert,
} from 'lucide-react'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { api } from '@/api/client'
import { cn } from '@/lib/utils'
import type { ClusterInventoryRow } from './ClusterTable'
import { ClusterCloudAssetsTab } from './tabs/ClusterCloudAssetsTab'
import {
  ClusterAlertsTab,
  ClusterAppBehaviourTab,
  ClusterComplianceTab,
  ClusterKiemTab,
  ClusterVulnerabilitiesTab,
} from './tabs/ClusterConnectorSubTabs'
import { ClusterMisconfigurationTab } from './tabs/ClusterMisconfigurationTab'
import { ClusterOverviewTab } from './tabs/ClusterOverviewTab'
import { ClusterPoliciesTab } from './tabs/ClusterPoliciesTab'

const CLUSTER_TABS = [
  { id: 'overview', icon: ScanSearch, label: 'OVERVIEW' },
  { id: 'misconfiguration', icon: Settings2, label: 'MISCONFIGURATION' },
  { id: 'cloud_assets', icon: Cloud, label: 'CLOUD ASSETS' },
  { id: 'vulnerabilities', icon: ShieldAlert, label: 'VULNERABILITIES' },
  { id: 'alerts', icon: AlertTriangle, label: 'ALERTS' },
  { id: 'compliance', icon: ClipboardList, label: 'COMPLIANCE' },
  { id: 'policies', icon: Shield, label: 'POLICIES' },
  { id: 'app_behaviour', icon: Activity, label: 'APP BEHAVIOUR' },
  { id: 'kiem', icon: Fingerprint, label: 'KIEM' },
] as const

function statusBadge(status: string) {
  const s = (status || 'disconnected').toLowerCase()
  if (s === 'connected') {
    return <Badge className="border-green-600 bg-green-50 text-green-800">● Connected</Badge>
  }
  if (s === 'pending') {
    return <Badge className="border-amber-500 bg-amber-50 text-amber-900">● Pending</Badge>
  }
  return <Badge variant="destructive">● Disconnected</Badge>
}

export function ClusterDetailPanel({
  cluster,
  open,
  onOpenChange,
}: {
  cluster: ClusterInventoryRow | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [tab, setTab] = useState<string>('overview')

  const clusterId = cluster?.id
  const { data: liveStatus } = useQuery({
    queryKey: ['inventory', 'cluster', clusterId, 'status'],
    queryFn: () =>
      api.get<{ connection_status: string }>(`/inventory/clusters/${clusterId}/status`).then((r) => r.data),
    enabled: open && !!clusterId,
    refetchInterval: 30_000,
  })

  // Preserve tab when closing/reopening the panel; reset only when switching to another cluster.
  useEffect(() => {
    setTab('overview')
  }, [cluster?.id])

  if (!cluster) return null

  const headerStatus = liveStatus?.connection_status ?? cluster.connection_status

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full max-w-none flex-col gap-0 overflow-hidden p-0 sm:w-[min(1200px,96vw)]">
        <SheetHeader className="shrink-0 space-y-3 border-b border-border px-6 py-4 text-left">
          <div className="flex items-start justify-between gap-4 pr-8">
            <div className="flex min-w-0 items-center gap-3">
              <Hexagon className="h-8 w-8 shrink-0 text-blue-600" aria-hidden />
              <div className="min-w-0">
                <SheetTitle className="truncate text-xl">{cluster.display_name}</SheetTitle>
                <SheetDescription className="font-mono text-xs">{cluster.name}</SheetDescription>
              </div>
            </div>
            {statusBadge(headerStatus)}
          </div>
        </SheetHeader>

        <Tabs value={tab} onValueChange={setTab} className="flex min-h-0 flex-1 flex-col">
          <TabsList className="h-auto w-full justify-start gap-0 overflow-x-auto rounded-none border-b border-border bg-muted/30 p-0 px-2">
            {CLUSTER_TABS.map(({ id, icon: Icon, label }) => (
              <TabsTrigger
                key={id}
                value={id}
                className={cn(
                  'flex shrink-0 items-center gap-1.5 rounded-none border-b-2 border-transparent px-3 py-3 text-[10px] font-semibold data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary'
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </TabsTrigger>
            ))}
          </TabsList>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
            <TabsContent value="overview" className="m-0 mt-0">
              <ClusterOverviewTab clusterId={cluster.id} />
            </TabsContent>
            <TabsContent value="misconfiguration" className="m-0">
              <ClusterMisconfigurationTab clusterId={cluster.id} />
            </TabsContent>
            <TabsContent value="cloud_assets" className="m-0">
              <ClusterCloudAssetsTab clusterId={cluster.id} />
            </TabsContent>
            <TabsContent value="vulnerabilities" className="m-0">
              <ClusterVulnerabilitiesTab clusterId={cluster.id} />
            </TabsContent>
            <TabsContent value="alerts" className="m-0">
              <ClusterAlertsTab clusterId={cluster.id} />
            </TabsContent>
            <TabsContent value="compliance" className="m-0">
              <ClusterComplianceTab clusterId={cluster.id} />
            </TabsContent>
            <TabsContent value="policies" className="m-0">
              <ClusterPoliciesTab clusterId={cluster.id} />
            </TabsContent>
            <TabsContent value="app_behaviour" className="m-0">
              <ClusterAppBehaviourTab clusterId={cluster.id} />
            </TabsContent>
            <TabsContent value="kiem" className="m-0">
              <ClusterKiemTab clusterId={cluster.id} />
            </TabsContent>
          </div>
        </Tabs>
      </SheetContent>
    </Sheet>
  )
}
