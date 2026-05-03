import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Zap, Play, X } from 'lucide-react'
import { modelsApi, inferenceApi } from '../api/models'
import { experimentsApi } from '../api/experiments'
import { datasetsApi } from '../api/datasets'
import { useInferenceStore } from '../store/inferenceStore'

function ModelInferencePanel({ model, onRemove }) {
  const store = useInferenceStore()
  const p = store.panels[model.id]
  
  if (!p) return null;

  const { formData, result, loading, explaining, autoPoll, pollInterval } = p;
  
  const setFormData = (data) => store.updatePanel(model.id, { formData: data })
  const setLoading = (loading) => store.updatePanel(model.id, { loading })
  const setResult = (result) => store.updatePanel(model.id, { result })
  const setExplaining = (explaining) => store.updatePanel(model.id, { explaining })

  const handlePredict = async () => {
    if (!model || !model.feature_columns) return
    const dataRow = {}
    for (const key of Object.keys(formData)) {
      const val = formData[key]
      dataRow[key] = isNaN(val) || val === '' ? val : Number(val)
    }
    setLoading(true)
    setResult(null)
    try {
      const res = await inferenceApi.predict(model.id, [dataRow])
      setResult(res.data)
      toast.success(`Prediction complete for ${model.name}!`)
    } catch(e) { toast.error(`Prediction failed for ${model.name}`) }
    finally { setLoading(false) }
  }

  const handleExplain = async () => {
    if (!model || !model.feature_columns) return
    const dataRow = {}
    for (const key of Object.keys(formData)) {
      const val = formData[key]
      dataRow[key] = isNaN(val) || val === '' ? val : Number(val)
    }
    setExplaining(true)
    try {
      const res = await inferenceApi.explain(model.id, [dataRow])
      setResult(result ? { ...result, explain: res.data } : { explain: res.data })
      toast.success(`Explanation complete for ${model.name}!`)
    } catch(e) { toast.error(`Explanation failed for ${model.name}`) }
    finally { setExplaining(false) }
  }

  const populateExample = async () => {
    if (!model) return
    const cols = model.feature_columns || []
    try {
      const expRes = await experimentsApi.get(model.experiment_id)
      const dsRes = await datasetsApi.preview(expRes.data.dataset_id)
      const firstRow = dsRes.data.head[0]
      const example = cols.reduce((acc, c) => {
        let val = firstRow && firstRow[c] !== undefined ? firstRow[c] : 0
        if (typeof val === 'string' && !isNaN(val)) val = parseFloat(val)
        acc[c] = val
        return acc
      }, {})
      setFormData(example)
      toast.success('Loaded realistic example')
    } catch (err) {
      const example = cols.reduce((acc, c) => ({ ...acc, [c]: 0 }), {})
      setFormData(example)
    }
  }

  const fetchLiveData = async () => {
    if (!model) return
    try {
      const res = await inferenceApi.getLiveData(model.id)
      if (res.data && res.data.data && res.data.data.length > 0) {
        setFormData(res.data.data[0])
        toast.success(`Polled live data for ${model.name}!`)
      }
    } catch (e) {
      toast.error(`Failed to poll live data for ${model.name}`)
    }
  }

  return (
    <div style={{ position: 'relative', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 20, marginBottom: 24, background: 'var(--bg-elevated)', boxShadow: autoPoll ? '0 0 0 2px var(--primary)' : 'none', transition: 'all 0.3s' }}>
      <button className="btn btn-ghost btn-sm" style={{ position: 'absolute', top: 12, right: 12 }} onClick={onRemove}><X size={16} /></button>
      <h2 style={{ marginBottom: 16, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: 8 }}>
        {autoPoll && <div className="spinner" style={{ width: 12, height: 12, borderWidth: 2, borderColor: 'var(--primary)', borderTopColor: 'transparent' }} />}
        <span className={`badge ${model.stage === 'PRODUCTION' ? 'badge-success' : 'badge-muted'}`}>{model.stage}</span>
        {model.name} <span style={{fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 'normal'}}>({model.algorithm})</span>
      </h2>
      
      <div className="grid-2">
        <div className="card" style={{ boxShadow: 'none' }}>
          <h3 style={{ marginBottom: 16 }}>Prediction Request</h3>
          <div style={{ background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', padding: 16, marginBottom: 16, border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>Input Features</div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                {autoPoll && (
                  <select className="form-select" style={{ padding: '4px 8px', fontSize: '0.75rem', width: 90 }} value={pollInterval} onChange={e => store.setPollInterval(model.id, Number(e.target.value))}>
                    <option value={1000}>1s</option>
                    <option value={2000}>2s</option>
                    <option value={5000}>5s</option>
                    <option value={10000}>10s</option>
                    <option value={30000}>30s</option>
                    <option value={60000}>60s</option>
                    <option value={300000}>5m</option>
                  </select>
                )}
                <button className={`btn btn-sm ${autoPoll ? 'btn-primary' : 'btn-secondary'}`} onClick={() => store.toggleAutoPoll(model.id)}>
                  <Zap size={14} style={{marginRight: 4}}/> {autoPoll ? 'Stop Auto-Poll' : 'Auto-Poll'}
                </button>
                <button className="btn btn-ghost btn-sm" onClick={populateExample}>Auto-fill</button>
                {!autoPoll && <button className="btn btn-secondary btn-sm" onClick={fetchLiveData}>Fetch 1x</button>}
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {(model.feature_columns || []).map(c => (
                <div key={c} className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: 4 }}>{c}</label>
                  <input
                    type="text"
                    className="form-input"
                    style={{ padding: '6px 10px', fontSize: '0.8rem' }}
                    value={formData[c] !== undefined ? formData[c] : ''}
                    onChange={e => setFormData({ ...formData, [c]: e.target.value })}
                    placeholder={`Enter ${c}...`}
                    disabled={autoPoll}
                  />
                </div>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
            <button className="btn btn-primary" onClick={handlePredict} disabled={loading || autoPoll} style={{ flex: 1 }}>
              {loading ? <><div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />Running…</> : <><Play size={16} />Run Prediction</>}
            </button>
            <button className="btn btn-secondary" onClick={handleExplain} disabled={explaining || autoPoll} style={{ flex: 1 }}>
              {explaining ? <><div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />Explaining…</> : 'Explain Prediction'}
            </button>
          </div>
        </div>

        <div className="card" style={{ boxShadow: 'none' }}>
          <h3 style={{ marginBottom: 16 }}>Prediction Result</h3>
          {!result ? (
            <div className="empty-state" style={{ padding: '60px 0' }}>
              <Zap size={36} />
              <p style={{ marginTop: 8 }}>Results will appear here</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', padding: 16, border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 8 }}>Predictions ({result.predictions.length})</div>
                {result.predictions.map((p, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Row {i + 1}</span>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <code style={{ color: 'var(--emerald)', fontWeight: 600 }}>{typeof p === 'number' ? p.toFixed(4) : String(p)}</code>
                      {result.prediction_labels?.[i] && (
                        <span className="badge badge-info">{result.prediction_labels[i]}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {result.probabilities && (
                <div style={{ background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', padding: 16, border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 8 }}>Class Probabilities</div>
                  {result.probabilities.map((probs, i) => (
                    <div key={i} style={{ marginBottom: 8 }}>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: 4 }}>Row {i + 1}</div>
                      {probs.map((p, j) => (
                        <div key={j} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', minWidth: 50 }}>Class {j}</span>
                          <div className="progress-bar" style={{ flex: 1 }}>
                            <div className="progress-fill" style={{ width: `${(p * 100).toFixed(1)}%` }} />
                          </div>
                          <span style={{ fontSize: '0.75rem', fontFamily: 'monospace', minWidth: 40 }}>{(p * 100).toFixed(1)}%</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}

              {result.explain && (
                <div style={{ background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', padding: 16, border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 12 }}>Feature Importance (Local Explanation)</div>
                  {Object.entries(result.explain.feature_importances).map(([f, imp]) => (
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
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 12, fontStyle: 'italic' }}>
                    Calculated via perturbation analysis. Shows which features drove this specific prediction.
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function Inference() {
  const [models, setModels] = useState([])
  const store = useInferenceStore()
  const selectedIds = Object.keys(store.panels).map(Number)

  useEffect(() => {
    modelsApi.list().then(r => {
      setModels(r.data)
      if (!store.hasInitialized) {
        store.setInitialized();
        const prod = r.data.filter(m => m.stage === 'PRODUCTION')
        if (prod.length > 0) store.addPanel(prod[0].id, prod[0].feature_columns)
        else if (r.data.length > 0) store.addPanel(r.data[0].id, r.data[0].feature_columns)
      }
    }).catch(() => {})
  }, [store])

  const handleAddModel = (e) => {
    const id = Number(e.target.value)
    if (id && !selectedIds.includes(id)) {
      const m = models.find(x => x.id === id)
      if (m) store.addPanel(m.id, m.feature_columns)
    }
    e.target.value = ""
  }

  return (
    <div>
      <div className="page-header" style={{ marginBottom: 24 }}>
        <div className="page-header-left">
          <h1>Inference Dashboard</h1>
          <p>Run live predictions and auto-polling against multiple models simultaneously</p>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <select className="form-select" onChange={handleAddModel} defaultValue="">
            <option value="" disabled>+ Add Model Panel...</option>
            {models.map(m => (
              <option key={m.id} value={m.id} disabled={selectedIds.includes(m.id)}>
                [{m.stage}] {m.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {selectedIds.length === 0 ? (
        <div className="empty-state">
          <Zap size={40} />
          <p style={{ marginTop: 8 }}>No models selected. Add a model from the top right to start running inference.</p>
        </div>
      ) : (
        selectedIds.map(id => {
          const m = models.find(x => x.id === id)
          if (!m) return null
          return <ModelInferencePanel key={id} model={m} onRemove={() => store.removePanel(id)} />
        })
      )}
    </div>
  )
}
