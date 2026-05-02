import { useEffect, useState } from 'react'
import { Cpu, RefreshCw } from 'lucide-react'
import { trainingApi } from '../api/experiments'

const STATUS_BADGE = { completed: 'badge-success', running: 'badge-warning', failed: 'badge-danger', pending: 'badge-muted', cancelled: 'badge-muted' }

function fmtDate(d) { return d ? new Date(d).toLocaleString() : '—' }
function duration(start, end) {
  if (!start) return '—'
  const s = new Date(start), e = end ? new Date(end) : new Date()
  const diff = Math.round((e - s) / 1000)
  if (diff < 60) return `${diff}s`
  return `${Math.floor(diff / 60)}m ${diff % 60}s`
}

export default function Training() {
  const [jobs, setJobs]       = useState([])
  const [loading, setLoading] = useState(true)

  const load = () => trainingApi.listJobs().then(r => setJobs(r.data)).finally(() => setLoading(false))
  useEffect(() => {
    load()
    const t = setInterval(load, 5000)
    return () => clearInterval(t)
  }, [])

  const runningCount = jobs.filter(j => j.status === 'running').length

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Training Jobs</h1>
          <p>Monitor all background training tasks — auto-refreshes every 5s</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {runningCount > 0 && <div className="badge badge-warning"><div className="badge-dot" style={{ background: 'var(--amber)' }} />{runningCount} running</div>}
          <button className="btn btn-ghost btn-sm" onClick={load}><RefreshCw size={14} />Refresh</button>
        </div>
      </div>

      <div className="card">
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40 }}><div className="spinner" style={{ margin: 'auto' }} /></div>
        ) : jobs.length === 0 ? (
          <div className="empty-state"><Cpu size={40} /><p style={{ marginTop: 8 }}>No training jobs. Start one from the Experiments page.</p></div>
        ) : (
          <table className="data-table">
            <thead>
              <tr><th>Job ID</th><th>Experiment</th><th>Status</th><th>Progress</th><th>Started</th><th>Duration</th><th>Error</th></tr>
            </thead>
            <tbody>
              {jobs.map(j => (
                <tr key={j.id}>
                  <td>#{j.id}</td>
                  <td>Exp #{j.experiment_id}</td>
                  <td><span className={`badge ${STATUS_BADGE[j.status] || 'badge-muted'}`}>{j.status}</span></td>
                  <td style={{ width: 180 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div className="progress-bar" style={{ flex: 1 }}>
                        <div className="progress-fill" style={{ width: `${j.progress}%` }} />
                      </div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', minWidth: 36 }}>{j.progress?.toFixed(0)}%</span>
                    </div>
                  </td>
                  <td style={{ fontSize: '0.8rem' }}>{fmtDate(j.started_at)}</td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{duration(j.started_at, j.finished_at)}</td>
                  <td>
                    {j.error_message
                      ? <span style={{ color: 'var(--rose)', fontSize: '0.75rem', fontFamily: 'monospace' }} title={j.error_message}>⚠ {j.error_message.slice(0, 40)}…</span>
                      : <span style={{ color: 'var(--text-muted)' }}>—</span>
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
