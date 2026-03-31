import { Link, Route, Routes } from 'react-router-dom'
import Overview from './pages/Overview'
import Findings from './pages/Findings'
import AttackPaths from './pages/AttackPaths'
import PentestRunner from './pages/PentestRunner'
import PluginManager from './pages/PluginManager'
import Connectors from './pages/Connectors'
import Alerts from './pages/Alerts'
import Compliance from './pages/Compliance'

const nav = ['Overview','Findings','AttackPaths','PentestRunner','PluginManager','Connectors','Alerts','Compliance']

export default function App() {
  return (
    <div style={{fontFamily:'sans-serif',padding:16}}>
      <h1>OpenCNAPP Dashboard</h1>
      <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
        {nav.map(n => <Link key={n} to={n==='Overview' ? '/' : '/' + n.toLowerCase()}>{n}</Link>)}
      </div>
      <Routes>
        <Route path='/' element={<Overview/>}/>
        <Route path='/findings' element={<Findings/>}/>
        <Route path='/attackpaths' element={<AttackPaths/>}/>
        <Route path='/pentestrunner' element={<PentestRunner/>}/>
        <Route path='/pluginmanager' element={<PluginManager/>}/>
        <Route path='/connectors' element={<Connectors/>}/>
        <Route path='/alerts' element={<Alerts/>}/>
        <Route path='/compliance' element={<Compliance/>}/>
      </Routes>
    </div>
  )
}
