import { useEffect, useState } from 'react'
import { Activity, RefreshCw, ActivitySquare } from 'lucide-react'
import { monitoringApi, modelsApi, inferenceApi } from '../api/models'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts'
import toast from 'react-hot-toast'

const COLORS = ['#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6']

export default function Monitoring() {
  const [health, setHealth]   = useState(null)
  const [jobs, setJobs]       = useState([])
  const [models, setModels]   = useState([])
  const [selectedModelId, setSelectedModelId] = useState('')
  const [driftData, setDriftData] = useState(null)
  const [loading, setLoading] = useState(true)

  const [explainingRow, setExplainingRow] = useState(null)
  const [explanations, setExplanations] = useState({})

  const loadHealth = () => {
    Promise.all([monitoringApi.health(), monitoringApi.jobsSummary(), modelsApi.list()])
      .then(([h, j, m]) => {
        setHealth(h.data)
        setJobs(j.data)
        const prodModels = m.data.filter(x => x.stage === 'PRODUCTION')
        setModels(prodModels)
        if (prodModels.length > 0 && !selectedModelId) {
          setSelectedModelId(String(prodModels[0].id))
        }
      })
      .finally(() => setLoading(false))
  }

  // Poll for drift data separately
  useEffect(() => {
    if (!selectedModelId) return
    const fetchDrift = () => {
      monitoringApi.drift(selectedModelId).then(res => setDriftData(res.data)).catch(() => {})
    }
    fetchDrift()
    const t = setInterval(fetchDrift, 3000)
    return () => clearInterval(t)
  }, [selectedModelId])

  useEffect(() => { loadHealth(); const t = setInterval(loadHealth, 10000); return () => clearInterval(t) }, [])

  const handleExplainRow = async (rowKey, inputData) => {
    setExplainingRow(rowKey)
    try {
      const res = await inferenceApi.explain(selectedModelId, [inputData])
      setExplanations(prev => ({ ...prev, [rowKey]: res.data.feature_importances }))
    } catch(e) {
      toast.error('Failed to calculate factors')
    } finally {
      setExplainingRow(null)
    }
  }

  const statusCounts = jobs.reduce((acc, j) => {
    acc[j.status] = (acc[j.status] || 0) + 1; return acc
  }, {})

  const chartData = Object.entries(statusCounts).map(([status, count]) => ({ status, count }))

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Monitoring</h1>
          <p>System health, training activity, and live data drift detection</p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={loadHealth}><RefreshCw size={14} />Refresh</button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60 }}><div className="spinner" style={{ margin: 'auto' }} /></div>
      ) : (
        <>
          <div className="grid-4" style={{ marginBottom: 28 }}>
            {[
              { label: 'Total Datasets',      value: health?.counts?.datasets ?? '—',    color: 'var(--cyan)' },
              { label: 'Total Experiments',   value: health?.counts?.experiments ?? '—', color: 'var(--accent-light)' },
              { label: 'Total Models',        value: health?.counts?.models ?? '—',      color: 'var(--violet)' },
              { label: 'Production Models',   value: health?.production_models ?? 0,     color: 'var(--emerald)' },
            ].map(s => (
              <div key={s.label} className="stat-card">
                <div className="stat-label">{s.label}</div>
                <div className="stat-value" style={{ color: s.color, fontSize: '1.75rem' }}>{s.value}</div>
              </div>
            ))}
          </div>

          <div className="grid-2" style={{ marginBottom: 28 }}>
            <div className="card">
              <h3 style={{ marginBottom: 16 }}>Training Job Status Distribution</h3>
              {chartData.length === 0 ? (
                <div className="empty-state" style={{ padding: '40px 0' }}><Activity size={32} /><p style={{ marginTop: 8 }}>No jobs yet</p></div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <XAxis dataKey="status" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} />
                    <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 12 }} allowDecimals={false} />
                    <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)' }} />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {chartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="card">
              <h3 style={{ marginBottom: 16 }}>System Status</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  { label: 'Backend API',       ok: !!health,                              detail: health ? 'Running on :8000' : 'Unreachable' },
                  { label: 'MLflow Server',     ok: true,                                  detail: 'Running on :5001' },
                  { label: 'Active Jobs',       ok: (health?.active_jobs ?? 0) === 0,      detail: `${health?.active_jobs ?? 0} running` },
                  { label: 'Database',          ok: !!health,                              detail: 'SQLite (local)' },
                ].map(s => (
                  <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: s.ok ? 'var(--emerald)' : 'var(--rose)', flexShrink: 0 }} />
                    <span style={{ flex: 1, fontSize: '0.875rem' }}>{s.label}</span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{s.detail}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="card" style={{ marginBottom: 28 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}><ActivitySquare size={18} color="var(--accent-light)" />Live Prediction Stream & Drift</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>Monitor the live output of production models in real-time</p>
              </div>
              <select className="form-select" style={{ width: 250 }} value={selectedModelId} onChange={e => setSelectedModelId(e.target.value)}>
                <option value="">Select Production Model…</option>
                {models.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>

            {!selectedModelId ? (
              <div className="empty-state" style={{ padding: '40px 0' }}>Select a production model to view live metrics.</div>
            ) : !driftData ? (
              <div style={{ textAlign: 'center', padding: 40 }}><div className="spinner" style={{ margin: 'auto' }} /></div>
            ) : driftData.count === 0 ? (
              <div className="empty-state" style={{ padding: '40px 0' }}>No live inference data logged yet. Use the Simulator script!</div>
            ) : (
              <>
                <div className="grid-2">
                  <div style={{ background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', padding: 16, border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 12 }}>Prediction Trend (Last {driftData.count} requests)</div>
                    <ResponsiveContainer width="100%" height={220}>
                      <LineChart data={driftData.predictions} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                        <XAxis dataKey="time" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                        <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                        <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)', fontSize: '0.8rem' }} />
                        <Line type="monotone" dataKey="prediction" stroke="var(--accent-light)" strokeWidth={2} dot={false} isAnimationActive={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  
                  <div style={{ background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', padding: 16, border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 12 }}>Live Feature Averages (Drift Proxy)</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, overflowY: 'auto', maxHeight: 220 }}>
                      {Object.entries(driftData.feature_averages).map(([feature, avg]) => (
                        <div key={feature} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{feature}</span>
                          <span style={{ fontSize: '0.85rem', fontFamily: 'monospace', color: 'var(--emerald)' }}>{avg.toFixed(3)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: 24, background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', padding: 16, border: '1px solid var(--border)' }}>
                  <h3 style={{ marginBottom: 16, fontSize: '0.9rem' }}>Historical Inferences & Feature Contributions (Factors)</h3>
                  <div style={{ overflowX: 'auto' }}>
                    <table className="data-table" style={{ fontSize: '0.8rem' }}>
                      <thead>
                        <tr>
                          <th style={{ width: 100 }}>Time</th>
                          <th>Input Data (Historical Test)</th>
                          <th style={{ width: 120 }}>Prediction</th>
                          <th style={{ width: 300 }}>Feature Contributions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...driftData.predictions].reverse().slice(0, 15).map((row) => {
                          const rowKey = row.time + JSON.stringify(row.input_data)
                          const isExplaining = explainingRow === rowKey
                          const expl = explanations[rowKey]
                          
                          return (
                            <tr key={rowKey}>
                              <td style={{ whiteSpace: 'nowrap' }}>{row.time}</td>
                              <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                <pre style={{ margin: 0, fontSize: '0.7rem', background: 'transparent', padding: 0, color: 'var(--text-secondary)' }}>
                                  {JSON.stringify(row.input_data).replace(/[{}]/g, '')}
                                </pre>
                              </td>
                              <td>
                                <span className="badge badge-success">
                                  {typeof row.raw_prediction === 'number' ? row.raw_prediction.toFixed(4) : row.raw_prediction}
                                </span>
                              </td>
                              <td>
                                {expl ? (
                                  <div>
                                    {Object.entries(expl).slice(0, 4).map(([f, imp]) => (
                                      <div key={f} style={{ marginBottom: 4 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', marginBottom: 2 }}>
                                          <span style={{ color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180 }}>{f}</span>
                                          <span style={{ fontFamily: 'monospace' }}>{imp}%</span>
                                        </div>
                                        <div className="progress-bar" style={{ height: 4 }}>
                                          <div className="progress-fill" style={{ width: `${imp}%`, background: 'var(--accent)' }} />
                                        </div>
                                      </div>
                                    ))}
                                    {Object.keys(expl).length > 4 && (
                                      <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 4 }}>+ other features...</div>
                                    )}
                                  </div>
                                ) : (
                                  <button className="btn btn-secondary btn-sm" onClick={() => handleExplainRow(rowKey, row.input_data)} disabled={isExplaining}>
                                    {isExplaining ? <><div className="spinner" style={{ width: 12, height: 12, borderWidth: 2 }} /> Analyzing...</> : 'Calculate Factors'}
                                  </button>
                                )}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  )
}
