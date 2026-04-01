import { NavLink } from 'react-router-dom'

const nav = [
  { label: 'Overview', to: '/' },
  { label: 'Findings', to: '/findings' },
  { label: 'Compliance', to: '/compliance' },
  { label: 'Attack Paths', to: '/attackpaths' },
  { label: 'Pentest Runner', to: '/pentestrunner' },
  { label: 'Plugins', to: '/pluginmanager' },
  { label: 'Connectors', to: '/connectors' },
  { label: 'Alerts', to: '/alerts' },
]

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className='app-shell'>
      <aside className='sidebar'>
        <h1>OpenCNAPP</h1>
        <p>Posture-first cloud security dashboard</p>
        <nav>
          {nav.map((item) => (
            <NavLink key={item.to} to={item.to} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} end={item.to === '/'}>
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className='content'>{children}</main>
    </div>
  )
}
