import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { api } from '../../lib/api'

function formatSize(bytes) {
  if (!bytes || bytes === 0) return '0 B'
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

function formatDuration(ms) {
  if (!ms) return '0s'
  if (ms < 1000) return ms + 'ms'
  const secs = Math.floor(ms / 1000)
  if (secs < 60) return secs + 's'
  const mins = Math.floor(secs / 60)
  return mins + 'm ' + (secs % 60) + 's'
}

function formatDate(dateStr) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ' ' +
    d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

function relativeTime(dateStr) {
  const d = new Date(dateStr)
  const now = new Date()
  const diff = Math.floor((now - d) / 1000)
  if (diff < 60) return 'Just now'
  if (diff < 3600) return Math.floor(diff / 60) + ' min ago'
  if (diff < 86400) return 'Today'
  const days = Math.floor(diff / 86400)
  if (days === 1) return 'Yesterday'
  return days + ' days ago'
}

export default function BackupManagement() {
  const [backups, setBackups] = useState([])
  const [stats, setStats] = useState({ total: 0, successful: 0, totalSize: '0', schedule: 'Daily' })
  const [settings, setSettings] = useState({ auto_backup: true, frequency: 'daily', retention: 30, email_notifications: true, compression: true })
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [progress, setProgress] = useState(0)
  const [showDelete, setShowDelete] = useState(null)

  useEffect(() => { load() }, [])

  async function load() {
    try {
      const [b, s, st] = await Promise.all([api.getBackups(), api.getBackupStats(), api.getBackupSettings()])
      setBackups(b)
      setStats(s)
      setSettings(st)
    } catch (err) {
      toast.error('Failed to load backup data')
    }
    setLoading(false)
  }

  async function handleCreateBackup() {
    setCreating(true)
    setProgress(0)

    // Simulate progress
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) return prev
        return prev + Math.random() * 15
      })
    }, 200)

    try {
      const result = await api.createBackup('full')
      clearInterval(interval)
      setProgress(100)
      setTimeout(() => {
        setCreating(false)
        setProgress(0)
        toast.success(`Backup created! (${formatSize(result.size)}, ${result.records} records)`)
        load()
      }, 500)
    } catch (err) {
      clearInterval(interval)
      setCreating(false)
      setProgress(0)
      toast.error(err.message)
    }
  }

  async function handleDownload(backup) {
    try {
      const API_URL = import.meta.env.VITE_API_URL || '/api'
      const res = await fetch(`${API_URL}/backups/${backup._id}/download`)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = backup.filename
      link.click()
      URL.revokeObjectURL(url)
      toast.success('Downloading backup...')
    } catch (err) {
      toast.error('Download failed')
    }
  }

  async function handleRestore(backup) {
    if (!confirm(`Restore database from backup taken on ${formatDate(backup.created_at)}? This will overwrite current data.`)) return
    try {
      const result = await api.restoreBackup(backup._id)
      toast.success(result.message)
    } catch (err) {
      toast.error(err.message)
    }
  }

  async function handleDelete() {
    if (!showDelete) return
    try {
      await api.deleteBackup(showDelete._id)
      toast.success('Backup deleted')
      setShowDelete(null)
      load()
    } catch (err) {
      toast.error(err.message)
    }
  }

  async function handleSaveSettings() {
    try {
      await api.saveBackupSettings({
        auto_backup: settings.auto_backup,
        frequency: settings.frequency,
        retention: settings.retention,
        email_notifications: settings.email_notifications,
        compression: settings.compression,
      })
      toast.success('Backup settings saved')
      load()
    } catch (err) {
      toast.error(err.message)
    }
  }

  function handleResetSettings() {
    setSettings({ auto_backup: true, frequency: 'daily', retention: 30, email_notifications: true, compression: true })
    toast('Settings reset to defaults', { icon: 'i' })
  }

  const totalBytes = backups.reduce((sum, b) => sum + (b.size || 0), 0)
  const maxStorage = 500 * 1024 * 1024
  const usagePercent = ((totalBytes / maxStorage) * 100).toFixed(1)
  const lastBackup = backups.length > 0 ? backups[0] : null

  if (loading) return <div className="p-4">Loading...</div>

  return (
    <div className="page-body">
      {/* Page Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <nav aria-label="breadcrumb">
            <ol className="breadcrumb mb-1">
              <li className="breadcrumb-item"><i className="bi bi-house-door"></i></li>
              <li className="breadcrumb-item">Admin</li>
              <li className="breadcrumb-item active">Backup</li>
            </ol>
          </nav>
          <h3 className="mb-0">Backup Management</h3>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="row g-3 mb-4">
        {[
          { value: stats.total, label: 'Total Backups', icon: 'bi-cloud-arrow-up-fill', bg: '#eff6ff', color: '#2563eb' },
          { value: stats.successful, label: 'Successful', icon: 'bi-check-circle-fill', bg: '#ecfdf5', color: '#10b981' },
          { value: stats.totalSize + ' MB', label: 'Total Size', icon: 'bi-hdd-fill', bg: '#f5f3ff', color: '#8b5cf6' },
          { value: stats.schedule, label: 'Schedule', icon: 'bi-clock-fill', bg: '#fff7ed', color: '#f59e0b' },
        ].map(s => (
          <div key={s.label} className="col-md-3 col-6">
            <div className="stat-card">
              <div className="d-flex align-items-center gap-3">
                <div className="stat-icon" style={{ background: s.bg, color: s.color }}>
                  <i className={`bi ${s.icon}`}></i>
                </div>
                <div>
                  <div className="stat-value">{s.value}</div>
                  <div className="stat-label">{s.label}</div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Create Backup Hero */}
      <div style={{ borderRadius: 16, padding: 30, background: 'linear-gradient(135deg, #2563eb, #1e40af)', color: '#fff', position: 'relative', overflow: 'hidden', marginBottom: 24 }}>
        <div style={{ position: 'absolute', top: '-50%', right: '-20%', width: 300, height: 300, background: 'rgba(255,255,255,0.05)', borderRadius: '50%' }}></div>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div className="d-flex justify-content-between align-items-start">
            <div>
              <h4 className="mb-2"><i className="bi bi-cloud-arrow-up me-2"></i>Create Backup</h4>
              <p className="mb-3 opacity-75" style={{ fontSize: '0.9rem' }}>
                Create a full backup of the database including all records, settings, and configuration data. Backups are stored securely and can be downloaded or restored at any time.
              </p>
              <div className="d-flex align-items-center gap-3 flex-wrap">
                <button className="btn btn-light fw-medium" onClick={handleCreateBackup} disabled={creating}>
                  {creating ? (
                    <><span className="spinner-border spinner-border-sm me-1"></span> Creating...</>
                  ) : (
                    <><i className="bi bi-download me-1"></i> Create Backup Now</>
                  )}
                </button>
                {lastBackup && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 16px', borderRadius: 20, background: 'rgba(255,255,255,0.15)', fontSize: '0.82rem' }}>
                    <i className="bi bi-check-circle-fill text-success"></i> Last backup: {formatDate(lastBackup.created_at)}
                  </span>
                )}
              </div>
            </div>
            <div className="d-none d-md-block text-center opacity-50" style={{ fontSize: '4rem' }}>
              <i className="bi bi-cloud-arrow-up"></i>
            </div>
          </div>
          {creating && (
            <div className="mt-3">
              <div className="d-flex justify-content-between mb-1">
                <small>Creating backup...</small>
                <small>{Math.round(progress)}%</small>
              </div>
              <div style={{ height: 8, borderRadius: 4, background: '#e2e8f0' }}>
                <div style={{ height: '100%', borderRadius: 4, background: '#fff', width: `${progress}%`, transition: 'width 0.2s' }}></div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Storage Usage */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-center mb-2">
            <span className="fw-medium"><i className="bi bi-hdd me-2"></i>Storage Usage</span>
            <span className="text-muted" style={{ fontSize: '0.82rem' }}>{formatSize(totalBytes)} of 500 MB used</span>
          </div>
          <div style={{ height: 8, borderRadius: 4, background: '#e2e8f0' }}>
            <div className="bg-primary" style={{ height: '100%', borderRadius: 4, width: `${Math.min(usagePercent, 100)}%` }}></div>
          </div>
          <div className="d-flex justify-content-between mt-1">
            <small className="text-muted">{usagePercent}% used</small>
            <small className="text-muted">{formatSize(maxStorage - totalBytes)} remaining</small>
          </div>
        </div>
      </div>

      {/* Backup History */}
      <div className="card mb-4 border-0 shadow-sm">
        <div className="card-header py-3 border-0" style={{ background: 'linear-gradient(135deg, #2563eb, #1e40af)', color: '#fff' }}>
          <div className="d-flex justify-content-between align-items-center">
            <h5 className="mb-0"><i className="bi bi-clock-history me-2"></i>Backup History</h5>
            <span className="badge bg-white bg-opacity-25 px-3 py-2">{backups.length} backups</span>
          </div>
        </div>
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover mb-0 align-middle">
              <thead className="bg-light">
                <tr>
                  <th className="ps-4" style={{ width: 50 }}>#</th>
                  <th>Date</th>
                  <th>Size</th>
                  <th>Type</th>
                  <th>Duration</th>
                  <th>Status</th>
                  <th className="pe-4 text-center" style={{ width: 140 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {backups.length === 0 ? (
                  <tr><td colSpan="7" className="text-center py-4 text-muted">No backups found. Click "Create Backup Now" to create your first backup.</td></tr>
                ) : backups.map((b, i) => (
                  <tr key={b._id}>
                    <td className="ps-4 text-muted">{i + 1}</td>
                    <td>
                      <div className="fw-medium">{formatDate(b.created_at)}</div>
                      <div className="text-muted" style={{ fontSize: '0.75rem' }}>{relativeTime(b.created_at)}</div>
                    </td>
                    <td><span style={{ fontFamily: "'Courier New', monospace", fontWeight: 600 }}>{formatSize(b.size)}</span></td>
                    <td>
                      <span style={{
                        padding: '4px 12px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 600,
                        background: b.type === 'full' ? '#eff6ff' : '#f5f3ff',
                        color: b.type === 'full' ? '#1e40af' : '#5b21b6',
                      }}>
                        <i className={`bi ${b.type === 'full' ? 'bi-database' : 'bi-arrow-repeat'} me-1`}></i>
                        {b.type === 'full' ? 'Full' : 'Incremental'}
                      </span>
                    </td>
                    <td className="text-muted" style={{ fontSize: '0.85rem' }}>{formatDuration(b.duration)}</td>
                    <td>
                      <span className={`badge ${b.status === 'success' ? 'badge-active' : 'badge-inactive'}`}>
                        {b.status === 'success' ? 'Success' : b.status === 'failed' ? 'Failed' : 'In Progress'}
                      </span>
                    </td>
                    <td className="pe-4 text-center">
                      <button className="btn btn-sm btn-action btn-outline-primary me-1" title="Download" onClick={() => handleDownload(b)}>
                        <i className="bi bi-download"></i>
                      </button>
                      <button className="btn btn-sm btn-action btn-outline-warning me-1" title="Restore" onClick={() => handleRestore(b)}>
                        <i className="bi bi-arrow-counterclockwise"></i>
                      </button>
                      <button className="btn btn-sm btn-action btn-outline-danger" title="Delete" onClick={() => setShowDelete(b)}>
                        <i className="bi bi-trash"></i>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Automatic Backup Settings */}
      <div className="card border-0 shadow-sm">
        <div className="card-header py-3 border-0" style={{ background: 'linear-gradient(135deg, #2563eb, #1e40af)', color: '#fff' }}>
          <h5 className="mb-0"><i className="bi bi-gear me-2"></i>Automatic Backup Settings</h5>
        </div>
        <div className="card-body">
          {[
            {
              label: 'Enable Auto Backup', desc: 'Automatically create backups on the configured schedule',
              type: 'switch', key: 'auto_backup'
            },
            {
              label: 'Backup Frequency', desc: 'How often automatic backups are created',
              type: 'select', key: 'frequency', options: [
                { value: 'daily', label: 'Daily' }, { value: 'weekly', label: 'Weekly' }, { value: 'monthly', label: 'Monthly' }
              ]
            },
            {
              label: 'Retention Period', desc: 'How long backups are stored before automatic deletion',
              type: 'select', key: 'retention', options: [
                { value: 7, label: '7 days' }, { value: 14, label: '14 days' }, { value: 30, label: '30 days' }, { value: 90, label: '90 days' }
              ]
            },
            {
              label: 'Email Notifications', desc: 'Receive email alerts when backups complete or fail',
              type: 'switch', key: 'email_notifications'
            },
            {
              label: 'Compression', desc: 'Compress backup files to save storage space',
              type: 'switch', key: 'compression'
            },
          ].map((setting, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0', borderBottom: i < 4 ? '1px solid #f1f5f9' : 'none' }}>
              <div>
                <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>{setting.label}</div>
                <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>{setting.desc}</div>
              </div>
              {setting.type === 'switch' ? (
                <div className="form-check form-switch">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    checked={settings[setting.key] || false}
                    onChange={e => setSettings(prev => ({ ...prev, [setting.key]: e.target.checked }))}
                    style={{ width: 48, height: 24, cursor: 'pointer' }}
                  />
                </div>
              ) : (
                <select
                  className="form-select"
                  style={{ width: 180 }}
                  value={settings[setting.key]}
                  onChange={e => setSettings(prev => ({ ...prev, [setting.key]: setting.key === 'retention' ? parseInt(e.target.value) : e.target.value }))}
                >
                  {setting.options.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              )}
            </div>
          ))}
          <div className="mt-3 d-flex gap-2">
            <button className="btn btn-primary" onClick={handleSaveSettings}>
              <i className="bi bi-check-lg me-1"></i> Save Settings
            </button>
            <button className="btn btn-outline-secondary" onClick={handleResetSettings}>
              <i className="bi bi-arrow-counterclockwise me-1"></i> Reset
            </button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDelete && (
        <>
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1050 }} onClick={() => setShowDelete(null)} />
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 1055, width: '90%', maxWidth: 420, background: '#fff', borderRadius: 12, boxShadow: '0 25px 50px rgba(0,0,0,0.25)' }}>
            <div className="p-4 text-center">
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#fef2f2', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', color: '#ef4444', marginBottom: 16 }}>
                <i className="bi bi-exclamation-triangle"></i>
              </div>
              <h5>Delete Backup</h5>
              <p className="text-muted">Delete backup from <strong>{formatDate(showDelete.created_at)}</strong>? This cannot be undone.</p>
              <div className="d-flex gap-2 justify-content-center">
                <button className="btn btn-outline-secondary" onClick={() => setShowDelete(null)}>Cancel</button>
                <button className="btn btn-danger" onClick={handleDelete}>
                  <i className="bi bi-trash me-1"></i> Delete
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
