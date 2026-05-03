import { useEffect, useState, useMemo } from 'react'
import { Activity, RefreshCw, ActivitySquare, Filter } from 'lucide-react'
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

  const [refreshInterval, setRefreshInterval] = useState(3000)

  // Filtering State
  const [timeRange, setTimeRange] = useState('all') // 'all', '5m', '1h'
  const [thresholdOp, setThresholdOp] = useState('')
  const [thresholdVal, setThresholdVal] = useState('')

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
      monitoringApi.drift(selectedModelId, 500).then(res => setDriftData(res.data)).catch(() => {})
    }
    fetchDrift()
    if (refreshInterval > 0) {
      const t = setInterval(fetchDrift, refreshInterval)
      return () => clearInterval(t)
    }
  }, [selectedModelId, refreshInterval])

  useEffect(() => { 
    loadHealth(); 
    if (refreshInterval > 0) {
      const t = setInterval(loadHealth, Math.max(refreshInterval, 10000)); // minimum 10s for health
      return () => clearInterval(t) 
    }
  }, [refreshInterval])

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

  const chartDataStatus = Object.entries(statusCounts).map(([status, count]) => ({ status, count }))

  // Compute Filtered Data
  const filteredPredictions = useMemo(() => {
    if (!driftData || !driftData.predictions) return []
    let result = driftData.predictions;
    
    if (timeRange !== 'all') {
      const now = new Date()
      const ms = timeRange === '5m' ? 5 * 60 * 1000 : 60 * 60 * 1000
      result = result.filter(p => {
        const d = new Date(p.timestamp.endsWith('Z') ? p.timestamp : p.timestamp + 'Z')
        return (now - d) <= ms
      })
    }
    
    if (thresholdOp && thresholdVal !== '') {
      const v = Number(thresholdVal)
      if (!isNaN(v)) {
        result = result.filter(p => {
          if (thresholdOp === '>') return p.prediction > v
          if (thresholdOp === '<') return p.prediction < v
          if (thresholdOp === '>=') return p.prediction >= v
          if (thresholdOp === '<=') return p.prediction <= v
          if (thresholdOp === '=') return p.prediction === v
          return true
        })
      }
    }
    return result;
  }, [driftData, timeRange, thresholdOp, thresholdVal])

  const chartData = useMemo(() => {
    return filteredPredictions.map(p => {
      const d = new Date(p.timestamp.endsWith('Z') ? p.timestamp : p.timestamp + 'Z')
      return {
        time: d.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        prediction: p.prediction,
        ...p.input_data
      }
    })
  }, [filteredPredictions])

  const features = useMemo(() => {
    if (filteredPredictions.length === 0) return []
    return Object.keys(filteredPredictions[0].input_data).filter(k => typeof filteredPredictions[0].input_data[k] === 'number')
  }, [filteredPredictions])

  const clearFilters = () => {
    setTimeRange('all')
    setThresholdOp('')
    setThresholdVal('')
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Monitoring & Observability</h1>
          <p>Interactive system health, live data drift, and feature-level tracking</p>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Auto-Refresh:</span>
          <select className="form-select form-sm" style={{ width: 80, padding: '4px 20px 4px 8px' }} value={refreshInterval} onChange={e => setRefreshInterval(Number(e.target.value))}>
            <option value={1000}>1s</option>
            <option value={3000}>3s</option>
            <option value={5000}>5s</option>
            <option value={10000}>10s</option>
            <option value={30000}>30s</option>
            <option value={0}>Off</option>
          </select>
          <button className="btn btn-ghost btn-sm" onClick={() => { 
            loadHealth(); 
            if(selectedModelId) monitoringApi.drift(selectedModelId, 500).then(res => setDriftData(res.data)).catch(() => {});
          }}>
            <RefreshCw size={14} style={{marginRight: 4}}/>Refresh
          </button>
        </div>
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

          <div className="card" style={{ marginBottom: 28 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}><ActivitySquare size={18} color="var(--accent-light)" />Advanced Live Prediction Stream</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>Monitor and filter live production model outputs across individual features</p>
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
              <div className="empty-state" style={{ padding: '40px 0' }}>No live inference data logged yet. Use the Inference dashboard to run predictions!</div>
            ) : (
              <>
                {/* Filter Toolbar */}
                <div style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '12px 16px', background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', marginBottom: 20 }}>
                  <Filter size={16} color="var(--text-muted)" />
                  <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Filters:</span>
                  
                  <select className="form-select form-sm" style={{ width: 150 }} value={timeRange} onChange={e => setTimeRange(e.target.value)}>
                    <option value="all">All Time (Max 500)</option>
                    <option value="1h">Last 1 Hour</option>
                    <option value="5m">Last 5 Minutes</option>
                  </select>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Prediction</span>
                    <select className="form-select form-sm" style={{ width: 60, padding: '4px 20px 4px 8px' }} value={thresholdOp} onChange={e => setThresholdOp(e.target.value)}>
                      <option value="">Op</option>
                      <option value=">">&gt;</option>
                      <option value="<">&lt;</option>
                      <option value=">=">&ge;</option>
                      <option value="<=">&le;</option>
                      <option value="=">=</option>
                    </select>
                    <input 
                      type="number" 
                      className="form-input form-sm" 
                      style={{ width: 80 }} 
                      placeholder="Value"
                      value={thresholdVal} 
                      onChange={e => setThresholdVal(e.target.value)} 
                    />
                  </div>

                  {(timeRange !== 'all' || thresholdOp) && (
                    <button className="btn btn-ghost btn-sm" onClick={clearFilters} style={{ marginLeft: 'auto' }}>Clear Filters</button>
                  )}
                  
                  <span style={{ marginLeft: timeRange === 'all' && !thresholdOp ? 'auto' : 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Showing {filteredPredictions.length} results
                  </span>
                </div>

                {filteredPredictions.length === 0 ? (
                  <div className="empty-state" style={{ padding: '40px 0' }}>No predictions match the current filters.</div>
                ) : (
                  <>
                    <div style={{ background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', padding: 16, border: '1px solid var(--border)', marginBottom: 20 }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12 }}>Overall Prediction Trend</div>
                      <ResponsiveContainer width="100%" height={220}>
                        <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                          <XAxis dataKey="time" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                          <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                          <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)', fontSize: '0.8rem' }} />
                          <Line type="monotone" dataKey="prediction" stroke="var(--accent-light)" strokeWidth={2} dot={false} isAnimationActive={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>

                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12 }}>Individual Feature Trends</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16, marginBottom: 24 }}>
                      {features.map((f, i) => (
                        <div key={f} style={{ background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', padding: 12, border: '1px solid var(--border)' }}>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180 }}>{f}</span>
                            <span style={{ color: COLORS[i % COLORS.length] }}>Avg: {(chartData.reduce((s, p) => s + (p[f] || 0), 0) / chartData.length).toFixed(2)}</span>
                          </div>
                          <ResponsiveContainer width="100%" height={100}>
                            <LineChart data={chartData}>
                              <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, fontSize: '0.75rem', padding: '4px 8px' }} />
                              <Line type="monotone" dataKey={f} stroke={COLORS[i % COLORS.length]} strokeWidth={1.5} dot={false} isAnimationActive={false} />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      ))}
                    </div>

                    <div style={{ background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', padding: 16, border: '1px solid var(--border)' }}>
                      <h3 style={{ marginBottom: 16, fontSize: '0.9rem' }}>Filtered Historical Inferences & Analysis</h3>
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
                            {[...filteredPredictions].reverse().slice(0, 15).map((row) => {
                              const rowKey = row.time + JSON.stringify(row.input_data)
                              const isExplaining = explainingRow === rowKey
                              const expl = explanations[rowKey]
                              
                              return (
                                <tr key={rowKey}>
                                  <td style={{ whiteSpace: 'nowrap' }}>
                                    {new Date(row.timestamp.endsWith('Z') ? row.timestamp : row.timestamp + 'Z').toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                  </td>
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
              </>
            )}
          </div>
        </>
      )}
    </div>
  )
}
