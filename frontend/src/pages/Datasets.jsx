import { useEffect, useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import toast from 'react-hot-toast'
import { Upload, Trash2, Eye, Database, FileText } from 'lucide-react'
import { datasetsApi } from '../api/datasets'

function fmtBytes(b) {
  if (b < 1024) return `${b} B`
  if (b < 1048576) return `${(b/1024).toFixed(1)} KB`
  return `${(b/1048576).toFixed(1)} MB`
}

function fmtDate(d) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function PreviewModal({ datasetId, onClose }) {
  const [data, setData] = useState(null)
  useEffect(() => {
    datasetsApi.preview(datasetId).then(r => setData(r.data)).catch(() => {})
  }, [datasetId])

  if (!data) return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><div className="spinner" /></div>
      </div>
    </div>
  )

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 800 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Dataset Preview</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 12 }}>
          {data.shape[0]} rows × {data.shape[1]} columns
        </div>
        <div style={{ overflowX: 'auto', maxHeight: 320, fontSize: '0.78rem' }}>
          <table className="data-table" style={{ minWidth: 600 }}>
            <thead>
              <tr>{data.columns.map(c => <th key={c}>{c}<br/><span style={{ fontWeight: 400, fontSize: '0.68rem', color: 'var(--text-muted)' }}>{data.dtypes[c]}</span></th>)}</tr>
            </thead>
            <tbody>
              {data.head.map((row, i) => (
                <tr key={i}>{data.columns.map(c => <td key={c}>{row[c]}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}

export default function Datasets() {
  const [datasets, setDatasets] = useState([])
  const [loading, setLoading]   = useState(true)
  const [preview, setPreview]   = useState(null)
  const [uploading, setUploading] = useState(false)
  const [name, setName]         = useState('')

  const load = () => datasetsApi.list().then(r => setDatasets(r.data)).finally(() => setLoading(false))
  useEffect(() => { load() }, [])

  const onDrop = useCallback(async acceptedFiles => {
    const file = acceptedFiles[0]
    if (!file) return
    if (!name.trim()) { toast.error('Please enter a dataset name first.'); return }
    const fd = new FormData()
    fd.append('file', file)
    fd.append('name', name.trim())
    fd.append('description', '')
    setUploading(true)
    try {
      await datasetsApi.upload(fd)
      toast.success('Dataset uploaded!')
      setName('')
      load()
    } finally {
      setUploading(false)
    }
  }, [name])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: { 'text/csv': ['.csv'], 'application/json': ['.json'] }, maxFiles: 1,
  })

  const handleDelete = async (id, n) => {
    if (!confirm(`Delete dataset "${n}"?`)) return
    await datasetsApi.delete(id)
    toast.success('Deleted')
    load()
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Datasets</h1>
          <p>Upload and manage your training datasets (CSV or JSON)</p>
        </div>
      </div>

      {/* Upload Card */}
      <div className="card" style={{ marginBottom: 24 }}>
        <h3 style={{ marginBottom: 14 }}>Upload New Dataset</h3>
        <div className="form-group" style={{ marginBottom: 12 }}>
          <label className="form-label">Dataset Name</label>
          <input className="form-input" placeholder="e.g. sales_q1_2024" value={name} onChange={e => setName(e.target.value)} />
        </div>
        <div {...getRootProps()} className={`dropzone${isDragActive ? ' active' : ''}`}>
          <input {...getInputProps()} />
          <div className="dropzone-icon">📂</div>
          {uploading
            ? <><div className="spinner" style={{ margin: '0 auto 8px' }} /><p>Uploading…</p></>
            : <><p style={{ color: 'var(--text-primary)', fontWeight: 500 }}>Drop CSV or JSON file here</p><p style={{ fontSize: '0.8rem', marginTop: 4 }}>or click to browse</p></>
          }
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3>All Datasets <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: '0.85rem' }}>({datasets.length})</span></h3>
        </div>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40 }}><div className="spinner" style={{ margin: 'auto' }} /></div>
        ) : datasets.length === 0 ? (
          <div className="empty-state"><Database size={40} /><p style={{ marginTop: 8 }}>No datasets yet. Upload one above.</p></div>
        ) : (
          <table className="data-table">
            <thead><tr><th>Name</th><th>File</th><th>Rows</th><th>Columns</th><th>Size</th><th>Uploaded</th><th>Actions</th></tr></thead>
            <tbody>
              {datasets.map(ds => (
                <tr key={ds.id}>
                  <td><div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><FileText size={14} color="var(--accent-light)" />{ds.name}</div></td>
                  <td><code style={{ fontSize: '0.78rem' }}>{ds.filename}</code></td>
                  <td>{ds.rows?.toLocaleString()}</td>
                  <td>{ds.columns}</td>
                  <td>{fmtBytes(ds.size_bytes)}</td>
                  <td style={{ fontSize: '0.8rem' }}>{fmtDate(ds.created_at)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => setPreview(ds.id)} title="Preview"><Eye size={14} /></button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(ds.id, ds.name)} title="Delete"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {preview && <PreviewModal datasetId={preview} onClose={() => setPreview(null)} />}
    </div>
  )
}
