import { useLocation } from 'react-router-dom'
import { Bell, Settings } from 'lucide-react'

const TITLES = {
  '/dashboard':   'Dashboard',
  '/datasets':    'Datasets',
  '/experiments': 'Experiments',
  '/models':      'Model Registry',
  '/training':    'Training Jobs',
  '/inference':   'Inference',
  '/monitoring':  'Monitoring',
}

export default function TopBar() {
  const { pathname } = useLocation()
  const title = TITLES[pathname] || 'MLOps Platform'

  return (
    <header className="topbar">
      <div className="topbar-title">{title}</div>
      <div className="topbar-right">
        <button className="btn btn-ghost btn-sm" title="Notifications">
          <Bell size={16} />
        </button>
        <button className="btn btn-ghost btn-sm" title="Settings">
          <Settings size={16} />
        </button>
        <div style={{
          width: 32, height: 32, borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--accent), var(--violet))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer',
        }}>
          ML
        </div>
      </div>
    </header>
  )
}
