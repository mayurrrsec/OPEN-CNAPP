import { Route, Routes } from 'react-router-dom'
import Overview from './pages/Overview'
import Findings from './pages/Findings'
import AttackPaths from './pages/AttackPaths'
import PentestRunner from './pages/PentestRunner'
import PluginManager from './pages/PluginManager'
import Connectors from './pages/Connectors'
import Alerts from './pages/Alerts'
import Compliance from './pages/Compliance'
import AppShell from './components/layout/AppShell'

export default function App() {
  return (
    <AppShell>
      <Routes>
        <Route path='/' element={<Overview />} />
        <Route path='/findings' element={<Findings />} />
        <Route path='/attackpaths' element={<AttackPaths />} />
        <Route path='/pentestrunner' element={<PentestRunner />} />
        <Route path='/pluginmanager' element={<PluginManager />} />
        <Route path='/connectors' element={<Connectors />} />
        <Route path='/alerts' element={<Alerts />} />
        <Route path='/compliance' element={<Compliance />} />
      </Routes>
    </AppShell>
  )
}
