import { NavLink, Route, Routes } from 'react-router-dom'
import Overview from './pages/Overview'
import Findings from './pages/Findings'
import AttackPaths from './pages/AttackPaths'
import PentestRunner from './pages/PentestRunner'
import PluginManager from './pages/PluginManager'
import Connectors from './pages/Connectors'
import Alerts from './pages/Alerts'
import Compliance from './pages/Compliance'

type NavItem = { label: string; to: string }
const nav: NavItem[] = [
  { label: 'Overview', to: '/' },
  { label: 'Findings', to: '/findings' },
  { label: 'Attack Paths', to: '/attackpaths' },
  { label: 'Pentest Runner', to: '/pentestrunner' },
  { label: 'Plugin Manager', to: '/pluginmanager' },
  { label: 'Connectors', to: '/connectors' },
  { label: 'Alerts', to: '/alerts' },
  { label: 'Compliance', to: '/compliance' },
]

export default function App() {
  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-badge" />
          <div>
            <div className="brand-title">OpenCNAPP</div>
            <div className="brand-sub">Local-first · Multi-cloud · Pluggable</div>
          </div>
        </div>
        <nav className="nav">
          {nav.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.to === '/'}
              className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
            >
              {n.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="content">
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
      </main>
    </div>
  )
}
