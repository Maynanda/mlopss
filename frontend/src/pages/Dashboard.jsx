import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Database, BrainCircuit, Cpu, Zap, TrendingUp, Clock, CheckCircle, AlertCircle } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { monitoringApi } from '../api/models'
import { trainingApi } from '../api/experiments'

const STAGE_BADGE = {
  PRODUCTION: 'badge-success', STAGING: 'badge-warning',
  NONE: 'badge-muted', ARCHIVED: 'badge-danger',
}
const STATUS_BADGE = {
  completed: 'badge-success', running: 'badge-warning',
  failed: 'badge-danger', pending: 'badge-muted', cancelled: 'badge-muted',
}

export default function Dashboard() {
  const [health, setHealth] = useState(null)
  const [jobs, setJobs]     = useState([])
  const navigate = useNavigate()

  useEffect(() => {
    monitoringApi.health().then(r => setHealth(r.data)).catch(() => {})
    trainingApi.listJobs().then(r => setJobs(r.data.slice(0, 6))).catch(() => {})
    const t = setInterval(() => {
      monitoringApi.health().then(r => setHealth(r.data)).catch(() => {})
    }, 10000)
    return () => clearInterval(t)
  }, [])

  const stats = [
    { label: 'Datasets',        value: health?.counts?.datasets    ?? '—', icon: Database,     color: 'var(--cyan)',    route: '/datasets' },
    { label: 'Experiments',     value: health?.counts?.experiments ?? '—', icon: BrainCircuit, color: 'var(--accent)',  route: '/experiments' },
    { label: 'Models',          value: health?.counts?.models      ?? '—', icon: Cpu,          color: 'var(--violet)',  route: '/models' },
    { label: 'In Production',   value: health?.production_models   ?? '—', icon: Zap,          color: 'var(--emerald)', route: '/models' },
  ]

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Welcome back 👋</h1>
          <p>Here's what's happening with your ML platform today.</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {health?.active_jobs > 0 && (
            <div className="badge badge-warning" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
              <div className="badge-dot" style={{ background: 'var(--amber)' }} />
              {health.active_jobs} job{health.active_jobs > 1 ? 's' : ''} running
            </div>
          )}
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid-4" style={{ marginBottom: 28 }}>
        {stats.map(s => (
          <div key={s.label} className="stat-card glow-card" onClick={() => navigate(s.route)} style={{ cursor: 'pointer' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div className="stat-label">{s.label}</div>
                <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
              </div>
              <div style={{ background: `${s.color}22`, borderRadius: 'var(--radius-sm)', padding: 10 }}>
                <s.icon size={20} color={s.color} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid-2">
        {/* Recent Jobs */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3>Recent Training Jobs</h3>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/training')}>View all</button>
          </div>
          {jobs.length === 0 ? (
            <div className="empty-state" style={{ padding: '30px 0' }}>
              <Clock size={32} />
              <p style={{ marginTop: 8 }}>No training jobs yet</p>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr><th>Job ID</th><th>Exp ID</th><th>Status</th><th>Progress</th></tr>
              </thead>
              <tbody>
                {jobs.map(j => (
                  <tr key={j.id}>
                    <td>#{j.id}</td>
                    <td>#{j.experiment_id}</td>
                    <td><span className={`badge ${STATUS_BADGE[j.status] || 'badge-muted'}`}>{j.status}</span></td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div className="progress-bar" style={{ flex: 1 }}>
                          <div className="progress-fill" style={{ width: `${j.progress}%` }} />
                        </div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', width: 32 }}>{j.progress}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Platform Overview */}
        <div className="card">
          <h3 style={{ marginBottom: 16 }}>Platform Overview</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[
              { label: 'Total Training Jobs', value: health?.counts?.training_jobs ?? '—', icon: Cpu, color: 'var(--accent)' },
              { label: 'Active Jobs Now',      value: health?.active_jobs ?? 0,             icon: TrendingUp, color: 'var(--amber)' },
              { label: 'Production Models',    value: health?.production_models ?? 0,        icon: CheckCircle, color: 'var(--emerald)' },
              { label: 'Backend Status',       value: health ? 'Healthy' : 'Connecting…',  icon: AlertCircle, color: health ? 'var(--emerald)' : 'var(--rose)' },
            ].map(item => (
              <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                <div style={{ background: `${item.color}22`, borderRadius: 'var(--radius-sm)', padding: 8 }}>
                  <item.icon size={16} color={item.color} />
                </div>
                <span style={{ flex: 1, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{item.label}</span>
                <span style={{ fontWeight: 600, color: item.color }}>{item.value}</span>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 20, padding: '14px', background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 6 }}>Quick Actions</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button className="btn btn-secondary btn-sm" onClick={() => navigate('/datasets')}>Upload Dataset</button>
              <button className="btn btn-secondary btn-sm" onClick={() => navigate('/experiments')}>New Experiment</button>
              <button className="btn btn-secondary btn-sm" onClick={() => navigate('/inference')}>Run Inference</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
