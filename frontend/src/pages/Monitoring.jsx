import { useEffect, useState } from 'react'
import { Activity, RefreshCw } from 'lucide-react'
import { monitoringApi } from '../api/models'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

const COLORS = ['#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6']

export default function Monitoring() {
  const [health, setHealth]   = useState(null)
  const [jobs, setJobs]       = useState([])
  const [loading, setLoading] = useState(true)

  const load = () => {
    Promise.all([monitoringApi.health(), monitoringApi.jobsSummary()])
      .then(([h, j]) => { setHealth(h.data); setJobs(j.data) })
      .finally(() => setLoading(false))
  }

  useEffect(() => { load(); const t = setInterval(load, 10000); return () => clearInterval(t) }, [])

  const statusCounts = jobs.reduce((acc, j) => {
    acc[j.status] = (acc[j.status] || 0) + 1; return acc
  }, {})

  const chartData = Object.entries(statusCounts).map(([status, count]) => ({ status, count }))

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Monitoring</h1>
          <p>System health, model metrics, and training activity — auto-refreshes every 10s</p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={load}><RefreshCw size={14} />Refresh</button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60 }}><div className="spinner" style={{ margin: 'auto' }} /></div>
      ) : (
        <>
          {/* Health Cards */}
          <div className="grid-4" style={{ marginBottom: 28 }}>
            {[
              { label: 'Total Datasets',      value: health?.counts?.datasets ?? '—',    color: 'var(--cyan)' },
              { label: 'Total Experiments',   value: health?.counts?.experiments ?? '—', color: 'var(--accent-light)' },
              { label: 'Total Models',         value: health?.counts?.models ?? '—',      color: 'var(--violet)' },
              { label: 'Production Models',   value: health?.production_models ?? 0,     color: 'var(--emerald)' },
            ].map(s => (
              <div key={s.label} className="stat-card">
                <div className="stat-label">{s.label}</div>
                <div className="stat-value" style={{ color: s.color, fontSize: '1.75rem' }}>{s.value}</div>
              </div>
            ))}
          </div>

          <div className="grid-2">
            {/* Job Status Chart */}
            <div className="card">
              <h3 style={{ marginBottom: 16 }}>Training Job Status Distribution</h3>
              {chartData.length === 0 ? (
                <div className="empty-state" style={{ padding: '40px 0' }}><Activity size={32} /><p style={{ marginTop: 8 }}>No jobs yet</p></div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <XAxis dataKey="status" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} />
                    <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 12 }} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)' }}
                    />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {chartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* System Status */}
            <div className="card">
              <h3 style={{ marginBottom: 16 }}>System Status</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  { label: 'Backend API',       ok: !!health,                              detail: health ? 'Running on :8000' : 'Unreachable' },
                  { label: 'MLflow Server',      ok: true,                                  detail: 'Running on :5001' },
                  { label: 'Active Jobs',        ok: (health?.active_jobs ?? 0) === 0,      detail: `${health?.active_jobs ?? 0} running` },
                  { label: 'Database',           ok: !!health,                              detail: 'SQLite (local)' },
                ].map(s => (
                  <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: s.ok ? 'var(--emerald)' : 'var(--rose)', flexShrink: 0 }} />
                    <span style={{ flex: 1, fontSize: '0.875rem' }}>{s.label}</span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{s.detail}</span>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: 20, padding: 14, background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4 }}>Future Monitoring Features</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {['Data drift detection', 'Prediction distribution alerts', 'Model latency tracking', 'Auto-retraining triggers'].map(f => (
                    <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      <span style={{ color: 'var(--amber)' }}>◷</span>{f}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
