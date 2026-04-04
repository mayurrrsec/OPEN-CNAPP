import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { CommandPalette } from '@/components/CommandPalette'
import { AppShell } from '@/layout/AppShell'
import { useAuth } from '@/context/AuthContext'
import UnifiedDashboard from '@/pages/UnifiedDashboard'
import DomainDashboard from '@/pages/DomainDashboard'
import Findings from '@/pages/Findings'
import AttackPaths from '@/pages/AttackPaths'
import AttackPathDetail from '@/pages/AttackPathDetail'
import PentestRunner from '@/pages/PentestRunner'
import PluginManager from '@/pages/PluginManager'
import Connectors from '@/pages/Connectors'
import Alerts from '@/pages/Alerts'
import Compliance from '@/pages/Compliance'
import {
  ClustersInventoryPage,
  InventoryIndexRedirect,
  InventoryLayout,
} from '@/pages/inventory/InventoryLayout'
import { CloudAssetsInventoryTab } from '@/pages/inventory/CloudAssetsInventoryTab'
import { ImagesInventoryTab } from '@/pages/inventory/ImagesInventoryTab'
import { NamespacesInventoryTab } from '@/pages/inventory/NamespacesInventoryTab'
import { WorkloadsInventoryTab } from '@/pages/inventory/WorkloadsInventoryTab'
import { CloudsTab } from '@/pages/inventory/CloudsTab'
import Settings from '@/pages/Settings'
import Login from '@/pages/Login'
import AuthCallback from '@/pages/AuthCallback'

function ProtectedRoute() {
  const { token, loading } = useAuth()
  const location = useLocation()
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Loading…
      </div>
    )
  }
  if (!token) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }
  return <Outlet />
}

function AppLayout() {
  return (
    <>
      <CommandPalette />
      <AppShell />
    </>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<UnifiedDashboard />} />
          <Route path="/dashboard/:domain" element={<DomainDashboard />} />
          <Route path="/findings" element={<Findings />} />
          <Route path="/inventory" element={<InventoryLayout />}>
            <Route index element={<InventoryIndexRedirect />} />
            <Route path="cloud" element={<CloudAssetsInventoryTab />} />
            <Route path="clouds" element={<CloudsTab />} />
            <Route path="clusters" element={<ClustersInventoryPage />} />
            <Route path="namespaces" element={<NamespacesInventoryTab />} />
            <Route path="workloads" element={<WorkloadsInventoryTab />} />
            <Route path="images" element={<ImagesInventoryTab />} />
          </Route>
          <Route path="/attack-paths/:pathId" element={<AttackPathDetail />} />
          <Route path="/attack-paths" element={<AttackPaths />} />
          <Route path="/pentest" element={<PentestRunner />} />
          <Route path="/plugins" element={<PluginManager />} />
          <Route path="/connectors" element={<Connectors />} />
          <Route path="/alerts" element={<Alerts />} />
          <Route path="/compliance" element={<Compliance />} />
          <Route path="/settings" element={<Settings />} />

          <Route path="/attackpaths" element={<Navigate to="/attack-paths" replace />} />
          <Route path="/pentestrunner" element={<Navigate to="/pentest" replace />} />
          <Route path="/pluginmanager" element={<Navigate to="/plugins" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Route>
    </Routes>
  )
}
