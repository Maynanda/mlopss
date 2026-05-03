import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Zap, Play } from 'lucide-react'
import { modelsApi, inferenceApi } from '../api/models'
import { experimentsApi } from '../api/experiments'
import { datasetsApi } from '../api/datasets'

export default function Inference() {
  const [models, setModels]     = useState([])
  const [modelId, setModelId]   = useState('')
  const [formData, setFormData] = useState({})
  const [result, setResult]     = useState(null)
  const [loading, setLoading]   = useState(false)
  const [autoPoll, setAutoPoll] = useState(false)
  const [pollInterval, setPollInterval] = useState(2000)
  const [explaining, setExplaining] = useState(false)

  useEffect(() => {
    modelsApi.list().then(r => {
      const prod = r.data.filter(m => m.stage === 'PRODUCTION')
      setModels(r.data)
      if (prod.length > 0) setModelId(String(prod[0].id))
      else if (r.data.length > 0) setModelId(String(r.data[0].id))
    }).catch(() => {})
  }, [])

  const selectedModel = models.find(m => String(m.id) === modelId)

  // Auto-initialize empty form when model changes
  useEffect(() => {
    if (selectedModel && selectedModel.feature_columns) {
      const init = {}
      selectedModel.feature_columns.forEach(c => init[c] = '')
      setFormData(init)
      setResult(null)
    }
  }, [modelId])

  const handlePredict = async () => {
    if (!modelId) { toast.error('Select a model first'); return }
    if (!selectedModel || !selectedModel.feature_columns) return
    
    // Parse to numbers
    const dataRow = {}
    for (const key of Object.keys(formData)) {
      const val = formData[key]
      dataRow[key] = isNaN(val) || val === '' ? val : Number(val)
    }

    setLoading(true)
    setResult(null)
    try {
      const res = await inferenceApi.predict(+modelId, [dataRow])
      setResult(res.data)
      toast.success('Prediction complete!')
    } catch(e) { toast.error('Prediction failed') }
    finally { setLoading(false) }
  }

  const handleExplain = async () => {
    if (!modelId) { toast.error('Select a model first'); return }
    if (!selectedModel || !selectedModel.feature_columns) return
    
    const dataRow = {}
    for (const key of Object.keys(formData)) {
      const val = formData[key]
      dataRow[key] = isNaN(val) || val === '' ? val : Number(val)
    }

    setExplaining(true)
    try {
      const res = await inferenceApi.explain(+modelId, [dataRow])
      setResult(prev => prev ? { ...prev, explain: res.data } : { explain: res.data })
      toast.success('Explanation complete!')
    } catch(e) { toast.error('Explanation failed') }
    finally { setExplaining(false) }
  }

  const populateExample = async () => {
    if (!selectedModel) return
    const cols = selectedModel.feature_columns || []
    
    try {
      const expRes = await experimentsApi.get(selectedModel.experiment_id)
      const dsRes = await datasetsApi.preview(expRes.data.dataset_id)
      const firstRow = dsRes.data.head[0]
      
      const example = cols.reduce((acc, c) => {
        let val = firstRow && firstRow[c] !== undefined ? firstRow[c] : 0
        if (typeof val === 'string' && !isNaN(val)) val = parseFloat(val)
        acc[c] = val
        return acc
      }, {})
      
      setFormData(example)
      toast.success('Loaded realistic example from training data')
    } catch (err) {
      const example = cols.reduce((acc, c) => ({ ...acc, [c]: 0 }), {})
      setFormData(example)
    }
  }

  const fetchLiveData = async () => {
    if (!selectedModel) return
    try {
      const res = await inferenceApi.getLiveData(selectedModel.id)
      if (res.data && res.data.data && res.data.data.length > 0) {
        setFormData(res.data.data[0])
        toast.success('Polled live data stream!')
      }
    } catch (e) {
      toast.error('Failed to poll live data')
    }
  }

  // Handle auto-polling
  useEffect(() => {
    let t;
    if (autoPoll && selectedModel) {
      t = setInterval(async () => {
        try {
          const res = await inferenceApi.getLiveData(selectedModel.id)
          if (res.data && res.data.data && res.data.data.length > 0) {
            const newRow = res.data.data[0]
            setFormData(newRow)
            // Predict immediately with new row
            const dataRow = {}
            for (const key of Object.keys(newRow)) {
              dataRow[key] = isNaN(newRow[key]) || newRow[key] === '' ? newRow[key] : Number(newRow[key])
            }
            const predRes = await inferenceApi.predict(selectedModel.id, [dataRow])
            setResult(predRes.data)
          }
        } catch(e) { console.error('Auto-poll error', e) }
      }, pollInterval)
    }
    return () => clearInterval(t)
  }, [autoPoll, pollInterval, selectedModel])

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Inference</h1>
          <p>Run live predictions against deployed models</p>
        </div>
      </div>

      <div className="grid-2">
        {/* Input Panel */}
        <div className="card">
          <h3 style={{ marginBottom: 16 }}>Prediction Request</h3>

          <div className="form-group" style={{ marginBottom: 14 }}>
            <label className="form-label">Select Model</label>
            <select className="form-select" value={modelId} onChange={e => setModelId(e.target.value)}>
              <option value="">Choose a model…</option>
              {models.map(m => (
                <option key={m.id} value={m.id}>[{m.stage}] {m.name} ({m.algorithm})</option>
              ))}
            </select>
          </div>

          {selectedModel && (
            <div style={{ background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', padding: 16, marginBottom: 16, border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>Input Features</div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  {autoPoll && (
                    <select className="form-select" style={{ padding: '4px 8px', fontSize: '0.75rem', width: 90 }} value={pollInterval} onChange={e => setPollInterval(Number(e.target.value))}>
                      <option value={1000}>1s</option>
                      <option value={2000}>2s</option>
                      <option value={5000}>5s</option>
                    </select>
                  )}
                  <button className={`btn btn-sm ${autoPoll ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setAutoPoll(!autoPoll)}>
                    <Zap size={14} style={{marginRight: 4}}/> {autoPoll ? 'Stop Auto-Poll' : 'Auto-Poll'}
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={populateExample}>Auto-fill from Dataset</button>
                  {!autoPoll && <button className="btn btn-secondary btn-sm" onClick={fetchLiveData}>Fetch 1x</button>}
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {(selectedModel.feature_columns || []).map(c => (
                  <div key={c} className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: 4 }}>{c}</label>
                    <input
                      type="text"
                      className="form-input"
                      style={{ padding: '6px 10px', fontSize: '0.8rem' }}
                      value={formData[c] !== undefined ? formData[c] : ''}
                      onChange={e => setFormData({ ...formData, [c]: e.target.value })}
                      placeholder={`Enter ${c}...`}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
            <button className="btn btn-primary" onClick={handlePredict} disabled={loading} style={{ flex: 1 }}>
              {loading ? <><div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />Running…</> : <><Play size={16} />Run Prediction</>}
            </button>
            <button className="btn btn-secondary" onClick={handleExplain} disabled={explaining || autoPoll} style={{ flex: 1 }}>
              {explaining ? <><div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />Explaining…</> : 'Explain Prediction'}
            </button>
          </div>
        </div>

        {/* Result Panel */}
        <div className="card">
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

              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4 }}>Raw Response</div>
                <pre style={{ background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', padding: 12, fontSize: '0.78rem', overflow: 'auto', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                  {JSON.stringify(result, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
