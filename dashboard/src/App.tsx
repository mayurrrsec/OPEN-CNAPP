import { Navigate, Route, Routes } from 'react-router-dom'
import { CommandPalette } from '@/components/CommandPalette'
import { AppShell } from '@/layout/AppShell'
import UnifiedDashboard from '@/pages/UnifiedDashboard'
import DomainDashboard from '@/pages/DomainDashboard'
import Findings from '@/pages/Findings'
import AttackPaths from '@/pages/AttackPaths'
import PentestRunner from '@/pages/PentestRunner'
import PluginManager from '@/pages/PluginManager'
import Connectors from '@/pages/Connectors'
import Alerts from '@/pages/Alerts'
import Compliance from '@/pages/Compliance'
import Inventory from '@/pages/Inventory'
import Settings from '@/pages/Settings'

export default function App() {
  return (
    <>
      <CommandPalette />
      <AppShell>
      <Routes>
        <Route path="/" element={<UnifiedDashboard />} />
        <Route path="/dashboard/:domain" element={<DomainDashboard />} />
        <Route path="/findings" element={<Findings />} />
        <Route path="/inventory" element={<Inventory />} />
        <Route path="/attack-paths" element={<AttackPaths />} />
        <Route path="/attack-paths/:pathId" element={<AttackPathDetail />} />
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
      </Routes>
      </AppShell>
    </>
  )
}
