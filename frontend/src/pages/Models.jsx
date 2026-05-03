import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { BrainCircuit, Trash2, BarChart2, ArrowUpCircle } from 'lucide-react'
import { modelsApi } from '../api/models'

const STAGES = ['NONE', 'STAGING', 'PRODUCTION', 'ARCHIVED']
const STAGE_BADGE = { PRODUCTION: 'badge-success', STAGING: 'badge-warning', NONE: 'badge-muted', ARCHIVED: 'badge-danger' }
const TASK_COLOR  = { regression: 'var(--cyan)', classification: 'var(--accent-light)', anomaly_detection: 'var(--rose)', clustering: 'var(--amber)' }

function MetricsModal({ model, onClose }) {
  const metrics = model.metrics || {}
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Metrics — {model.name}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {Object.entries(metrics).map(([k, v]) => {
            if (k === 'feature_importances') {
              return (
                <div key={k} style={{ padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: 8, fontWeight: 600 }}>Global Feature Importances</div>
                  {Object.entries(v).map(([f, imp]) => (
                    <div key={f} style={{ marginBottom: 6 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: 4 }}>
                        <span style={{ color: 'var(--text-secondary)' }}>{f}</span>
                        <span style={{ fontFamily: 'monospace' }}>{imp}%</span>
                      </div>
                      <div className="progress-bar">
                        <div className="progress-fill" style={{ width: `${imp}%`, background: 'var(--accent)' }} />
                      </div>
                    </div>
                  ))}
                </div>
              )
            }
            return (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{k}</span>
                <span style={{ fontWeight: 600, color: 'var(--accent-light)', fontFamily: 'monospace' }}>
                  {typeof v === 'number' ? v.toFixed(4) : JSON.stringify(v)}
                </span>
              </div>
            )
          })}
          {Object.keys(metrics).length === 0 && <p>No metrics available.</p>}
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}

export default function Models() {
  const [models, setModels] = useState([])
  const [loading, setLoading] = useState(true)
  const [metricsModel, setMetricsModel] = useState(null)

  const load = () => modelsApi.list().then(r => setModels(r.data)).finally(() => setLoading(false))
  useEffect(() => { load() }, [])

  const handleStage = async (id, stage) => {
    await modelsApi.updateStage(id, stage)
    toast.success(`Stage updated to ${stage}`)
    load()
  }

  const handleDelete = async (id, name) => {
    if (!confirm(`Delete model "${name}"?`)) return
    await modelsApi.delete(id)
    toast.success('Model deleted')
    load()
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Model Registry</h1>
          <p>Manage trained models and their deployment lifecycle</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {STAGES.map(s => (
            <div key={s} className={`badge ${STAGE_BADGE[s]}`} style={{ cursor: 'default' }}>
              {models.filter(m => m.stage === s).length} {s}
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40 }}><div className="spinner" style={{ margin: 'auto' }} /></div>
        ) : models.length === 0 ? (
          <div className="empty-state"><BrainCircuit size={40} /><p style={{ marginTop: 8 }}>No trained models yet. Run an experiment first.</p></div>
        ) : (
          <table className="data-table">
            <thead>
              <tr><th>Name</th><th>Algorithm</th><th>Task</th><th>Version</th><th>Stage</th><th>Key Metric</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {models.map(m => {
                const metrics = m.metrics || {}
                const keyMetric = metrics.r2 ?? metrics.accuracy ?? metrics.f1_score ?? metrics.anomaly_rate ?? metrics.silhouette_score
                return (
                  <tr key={m.id}>
                    <td>{m.name}</td>
                    <td><code style={{ fontSize: '0.78rem' }}>{m.algorithm}</code></td>
                    <td><span style={{ color: TASK_COLOR[m.task_type], fontSize: '0.8rem', fontWeight: 600 }}>{m.task_type}</span></td>
                    <td><span className="badge badge-default">v{m.version}</span></td>
                    <td>
                      <select
                        className="form-select"
                        style={{ padding: '3px 8px', fontSize: '0.78rem', width: 'auto' }}
                        value={m.stage}
                        onChange={e => handleStage(m.id, e.target.value)}
                      >
                        {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                    <td>
                      {keyMetric !== undefined
                        ? <span style={{ fontFamily: 'monospace', color: 'var(--emerald)' }}>{typeof keyMetric === 'number' ? keyMetric.toFixed(4) : keyMetric}</span>
                        : <span style={{ color: 'var(--text-muted)' }}>—</span>
                      }
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => setMetricsModel(m)} title="View metrics"><BarChart2 size={13} /></button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(m.id, m.name)} title="Delete"><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {metricsModel && <MetricsModal model={metricsModel} onClose={() => setMetricsModel(null)} />}
    </div>
  )
}
