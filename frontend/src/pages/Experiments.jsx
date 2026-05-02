import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Plus, Trash2, Play, FlaskConical } from 'lucide-react'
import { experimentsApi } from '../api/experiments'
import { datasetsApi } from '../api/datasets'

const TASK_TYPES = ['regression', 'classification', 'anomaly_detection', 'clustering']
const STATUS_BADGE = { created: 'badge-muted', training: 'badge-warning', completed: 'badge-success', failed: 'badge-danger' }

function CreateModal({ datasets, algorithms, onClose, onCreated }) {
  const [form, setForm] = useState({
    name: '', description: '', dataset_id: '', algorithm: '',
    task_type: 'regression', target_column: '', hyperparams: '{}',
  })
  const [saving, setSaving] = useState(false)

  const filteredAlgos = algorithms.filter(a => a.task_type === form.task_type)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const submit = async () => {
    if (!form.name || !form.dataset_id || !form.algorithm) { toast.error('Fill required fields'); return }
    let hp = {}
    try { hp = JSON.parse(form.hyperparams) } catch { toast.error('Invalid JSON in hyperparams'); return }
    setSaving(true)
    try {
      await experimentsApi.create({
        name: form.name, description: form.description,
        dataset_id: +form.dataset_id, algorithm: form.algorithm,
        task_type: form.task_type,
        target_column: form.target_column || null,
        hyperparams: hp,
      })
      toast.success('Experiment created!')
      onCreated()
      onClose()
    } finally { setSaving(false) }
  }

  const selectedAlgo = algorithms.find(a => a.algorithm_name === form.algorithm)

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>New Experiment</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="form-group">
            <label className="form-label">Experiment Name *</label>
            <input className="form-input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. churn_prediction_v1" />
          </div>
          <div className="form-group">
            <label className="form-label">Dataset *</label>
            <select className="form-select" value={form.dataset_id} onChange={e => set('dataset_id', e.target.value)}>
              <option value="">Select dataset…</option>
              {datasets.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Task Type *</label>
              <select className="form-select" value={form.task_type} onChange={e => { set('task_type', e.target.value); set('algorithm', '') }}>
                {TASK_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Algorithm *</label>
              <select className="form-select" value={form.algorithm} onChange={e => set('algorithm', e.target.value)}>
                <option value="">Select algorithm…</option>
                {filteredAlgos.map(a => <option key={a.algorithm_name} value={a.algorithm_name}>{a.algorithm_name}</option>)}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Target Column {form.task_type !== 'clustering' && form.task_type !== 'anomaly_detection' ? '*' : '(optional)'}</label>
            <input className="form-input" value={form.target_column} onChange={e => set('target_column', e.target.value)} placeholder="e.g. label, price, is_fraud" />
          </div>
          {selectedAlgo && (
            <div style={{ background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', padding: 12, border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 6 }}>Default Hyperparameters</div>
              {selectedAlgo.hyperparams_schema.map(p => (
                <div key={p.name} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', padding: '3px 0' }}>
                  <span style={{ color: 'var(--accent-light)' }}>{p.name}</span>
                  <span style={{ color: 'var(--text-secondary)' }}>{String(p.default)}</span>
                </div>
              ))}
            </div>
          )}
          <div className="form-group">
            <label className="form-label">Hyperparameters (JSON)</label>
            <textarea className="form-textarea" value={form.hyperparams} onChange={e => set('hyperparams', e.target.value)} style={{ fontFamily: 'monospace', fontSize: '0.82rem' }} />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={submit} disabled={saving}>
            {saving ? <><div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />Saving…</> : 'Create Experiment'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Experiments() {
  const [exps, setExps]           = useState([])
  const [datasets, setDatasets]   = useState([])
  const [algorithms, setAlgos]    = useState([])
  const [loading, setLoading]     = useState(true)
  const [showCreate, setCreate]   = useState(false)
  const [training, setTraining]   = useState({})

  const load = () => {
    Promise.all([
      experimentsApi.list(),
      datasetsApi.list(),
      experimentsApi.algorithms(),
    ]).then(([e, d, a]) => { setExps(e.data); setDatasets(d.data); setAlgos(a.data) })
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleTrain = async (id) => {
    setTraining(t => ({ ...t, [id]: true }))
    try {
      await experimentsApi.train(id)
      toast.success('Training started!')
      load()
    } finally { setTraining(t => ({ ...t, [id]: false })) }
  }

  const handleDelete = async (id, name) => {
    if (!confirm(`Delete experiment "${name}"?`)) return
    await experimentsApi.delete(id)
    toast.success('Deleted')
    load()
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Experiments</h1>
          <p>Configure and launch model training experiments</p>
        </div>
        <button className="btn btn-primary" onClick={() => setCreate(true)}><Plus size={16} />New Experiment</button>
      </div>

      <div className="card">
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40 }}><div className="spinner" style={{ margin: 'auto' }} /></div>
        ) : exps.length === 0 ? (
          <div className="empty-state"><FlaskConical size={40} /><p style={{ marginTop: 8 }}>No experiments yet.</p></div>
        ) : (
          <table className="data-table">
            <thead><tr><th>Name</th><th>Task</th><th>Algorithm</th><th>Dataset</th><th>Target</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {exps.map(e => (
                <tr key={e.id}>
                  <td>{e.name}</td>
                  <td><span className="badge badge-info">{e.task_type}</span></td>
                  <td><code style={{ fontSize: '0.78rem' }}>{e.algorithm}</code></td>
                  <td>#{e.dataset_id}</td>
                  <td style={{ color: 'var(--text-muted)' }}>{e.target_column || '—'}</td>
                  <td><span className={`badge ${STATUS_BADGE[e.status] || 'badge-muted'}`}>{e.status}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleTrain(e.id)}
                        disabled={training[e.id] || e.status === 'training'}
                        title="Start training"
                      >
                        {training[e.id] ? <div className="spinner" style={{ width: 12, height: 12, borderWidth: 2 }} /> : <Play size={13} />}
                        Train
                      </button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(e.id, e.name)}><Trash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showCreate && (
        <CreateModal datasets={datasets} algorithms={algorithms} onClose={() => setCreate(false)} onCreated={load} />
      )}
    </div>
  )
}
