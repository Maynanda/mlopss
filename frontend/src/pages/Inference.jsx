import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Zap, Play } from 'lucide-react'
import { modelsApi, inferenceApi } from '../api/models'
import { experimentsApi } from '../api/experiments'
import { datasetsApi } from '../api/datasets'

export default function Inference() {
  const [models, setModels]     = useState([])
  const [modelId, setModelId]   = useState('')
  const [inputJson, setInput]   = useState('[\n  {\n    "feature1": 1.0,\n    "feature2": 0.5\n  }\n]')
  const [result, setResult]     = useState(null)
  const [loading, setLoading]   = useState(false)

  useEffect(() => {
    modelsApi.list().then(r => {
      const prod = r.data.filter(m => m.stage === 'PRODUCTION')
      setModels(r.data)
      if (prod.length > 0) setModelId(String(prod[0].id))
      else if (r.data.length > 0) setModelId(String(r.data[0].id))
    }).catch(() => {})
  }, [])

  const selectedModel = models.find(m => String(m.id) === modelId)

  const handlePredict = async () => {
    if (!modelId) { toast.error('Select a model first'); return }
    let data
    try { data = JSON.parse(inputJson) } catch { toast.error('Invalid JSON input'); return }
    if (!Array.isArray(data)) { toast.error('Input must be a JSON array of objects'); return }
    setLoading(true)
    setResult(null)
    try {
      const res = await inferenceApi.predict(+modelId, data)
      setResult(res.data)
      toast.success('Prediction complete!')
    } finally { setLoading(false) }
  }

  const populateExample = async () => {
    if (!selectedModel) return
    const cols = selectedModel.feature_columns || []
    
    try {
      const expRes = await experimentsApi.get(selectedModel.experiment_id)
      const dsRes = await datasetsApi.preview(expRes.data.dataset_id)
      const firstRow = dsRes.data.head[0]
      
      const example = cols.reduce((acc, c) => {
        // Use the value from the training data, parse as float if possible
        let val = firstRow && firstRow[c] !== undefined ? firstRow[c] : 0
        if (typeof val === 'string' && !isNaN(val)) val = parseFloat(val)
        acc[c] = val
        return acc
      }, {})
      
      setInput(JSON.stringify([example], null, 2))
      toast.success('Loaded realistic example from training data')
    } catch (err) {
      const example = cols.reduce((acc, c) => ({ ...acc, [c]: 0 }), {})
      setInput(JSON.stringify([example], null, 2))
    }
  }

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
            <div style={{ background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', padding: 12, marginBottom: 14, border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4 }}>Required Features</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {(selectedModel.feature_columns || []).map(c => (
                  <code key={c} style={{ background: 'var(--accent-dim)', color: 'var(--accent-light)', padding: '2px 8px', borderRadius: 4, fontSize: '0.78rem' }}>{c}</code>
                ))}
              </div>
              <button className="btn btn-ghost btn-sm" style={{ marginTop: 8 }} onClick={populateExample}>Fill Example</button>
            </div>
          )}

          <div className="form-group" style={{ marginBottom: 16 }}>
            <label className="form-label">Input Data (JSON Array)</label>
            <textarea
              className="form-textarea"
              value={inputJson}
              onChange={e => setInput(e.target.value)}
              rows={10}
              style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.82rem' }}
            />
          </div>

          <button className="btn btn-primary" onClick={handlePredict} disabled={loading} style={{ width: '100%' }}>
            {loading ? <><div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />Running…</> : <><Play size={16} />Run Prediction</>}
          </button>
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
