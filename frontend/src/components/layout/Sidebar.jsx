import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Database, FlaskConical, BrainCircuit,
  Cpu, Zap, Activity, ChevronRight,
} from 'lucide-react'

const NAV = [
  { label: 'Overview', items: [
    { to: '/dashboard',   icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/monitoring',  icon: Activity,        label: 'Monitoring' },
  ]},
  { label: 'Data & Models', items: [
    { to: '/datasets',    icon: Database,        label: 'Datasets' },
    { to: '/experiments', icon: FlaskConical,    label: 'Experiments' },
    { to: '/models',      icon: BrainCircuit,    label: 'Model Registry' },
  ]},
  { label: 'Operations', items: [
    { to: '/training',    icon: Cpu,             label: 'Training Jobs' },
    { to: '/inference',   icon: Zap,             label: 'Inference' },
  ]},
]

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-icon">🧠</div>
        <div>
          <div className="logo-text">MLOps Platform</div>
          <div className="logo-sub">v1.0.0</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {NAV.map(section => (
          <div key={section.label}>
            <div className="nav-section-label">{section.label}</div>
            {section.items.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
              >
                <Icon size={16} />
                <span style={{ flex: 1 }}>{label}</span>
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)' }}>
        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--emerald)', display: 'inline-block' }} />
          Backend connected
        </div>
      </div>
    </aside>
  )
}
