import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { api } from '../../../lib/api'

export default function DefaultAccess() {
  const [levels, setLevels] = useState([])
  const [privileges, setPrivileges] = useState([])
  const [selectedLevel, setSelectedLevel] = useState('')
  const [access, setAccess] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    setLoading(true)
    try {
      const [levelsData, privsData] = await Promise.all([
        api.getUserLevels(),
        api.getPrivileges(),
      ])
      setLevels((levelsData || []).filter(l => l.status === 'active'))
      setPrivileges((privsData || []).filter(p => p.status === 'active'))
      // Auto-select first level
      const first = (levelsData || []).find(l => l.status === 'active')
      if (first) {
        setSelectedLevel(first.key)
        loadAccess(first.key)
      }
    } catch (err) { toast.error(err.message) }
    setLoading(false)
  }

  async function loadAccess(levelKey) {
    if (!levelKey) return
    try {
      const data = await api.getLevelAccess(levelKey)
      setAccess(data.access || [])
    } catch { setAccess([]) }
  }

  function handleLevelChange(key) {
    setSelectedLevel(key)
    loadAccess(key)
  }

  function togglePrivilege(privKey) {
    setAccess(prev => prev.includes(privKey) ? prev.filter(k => k !== privKey) : [...prev, privKey])
  }

  function selectAll() {
    setAccess(privileges.map(p => p.key))
  }

  function clearAll() {
    setAccess([])
  }

  async function handleSave() {
    if (!selectedLevel) { toast.error('Select a user level'); return }
    setSaving(true)
    try {
      await api.saveLevelAccess(selectedLevel, access)
      toast.success(`Default access saved for "${selectedLevel}"`)
    } catch (err) { toast.error(err.message) }
    setSaving(false)
  }

  // Group privileges by category
  const groups = {}
  privileges.forEach(p => {
    const cat = p.key.split('_').slice(0, -1).join('_') || 'general'
    if (!groups[cat]) groups[cat] = []
    groups[cat].push(p)
  })

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <nav aria-label="breadcrumb">
            <ol className="breadcrumb mb-1">
              <li className="breadcrumb-item"><Link to="/dashboard"><i className="bi bi-house-door"></i></Link></li>
              <li className="breadcrumb-item"><Link to="/admin/users">Admin</Link></li>
              <li className="breadcrumb-item active">Default Access</li>
            </ol>
          </nav>
          <h3 className="mb-0">Default Level Access</h3>
          <p className="text-muted small mb-0">Set default permissions for each user level</p>
        </div>
        <Link to="/admin/access" className="btn btn-outline-primary btn-sm">
          <i className="bi bi-person-lock me-1"></i>User Access
        </Link>
      </div>

      <div className="card border-0 shadow-sm rounded-4">
        <div className="card-header py-3 border-0" style={{ background: 'linear-gradient(135deg, #7c3aed, #5b21b6)', color: '#fff' }}>
          <div className="d-flex justify-content-between align-items-center">
            <h5 className="mb-0"><i className="bi bi-shield-lock me-2"></i>Default Permissions by Level</h5>
          </div>
        </div>
        <div className="card-body p-4">
          {loading ? (
            <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>
          ) : (
            <>
              {/* Level selector */}
              <div className="row mb-4">
                <div className="col-md-4">
                  <label className="form-label fw-semibold">Select User Level</label>
                  <select className="form-select" value={selectedLevel} onChange={e => handleLevelChange(e.target.value)}>
                    <option value="">-- Select Level --</option>
                    {levels.map(l => (
                      <option key={l._id} value={l.key}>{l.name}</option>
                    ))}
                  </select>
                </div>
                <div className="col-md-8 d-flex align-items-end gap-2">
                  <button className="btn btn-sm btn-outline-success" onClick={selectAll}><i className="bi bi-check-all me-1"></i>Select All</button>
                  <button className="btn btn-sm btn-outline-secondary" onClick={clearAll}><i className="bi bi-x-lg me-1"></i>Clear All</button>
                  <span className="text-muted small ms-2">{access.length} of {privileges.length} selected</span>
                </div>
              </div>

              {selectedLevel ? (
                <>
                  {/* Privilege checkboxes grouped by category */}
                  {Object.entries(groups).map(([cat, privs]) => (
                    <div key={cat} className="mb-4">
                      <h6 className="fw-bold text-capitalize mb-2" style={{ color: '#7c3aed' }}>
                        <i className="bi bi-folder me-2"></i>{cat.replace(/_/g, ' ')}
                      </h6>
                      <div className="row g-2">
                        {privs.map(p => (
                          <div className="col-md-4 col-lg-3" key={p._id}>
                            <div
                              className="d-flex align-items-center gap-2 p-2 rounded"
                              style={{
                                background: access.includes(p.key) ? '#f0fdf4' : '#f8fafc',
                                border: `1px solid ${access.includes(p.key) ? '#86efac' : '#e2e8f0'}`,
                                cursor: 'pointer',
                                transition: 'all 0.15s',
                              }}
                              onClick={() => togglePrivilege(p.key)}
                            >
                              <input
                                type="checkbox"
                                className="form-check-input"
                                style={{ width: 18, height: 18 }}
                                checked={access.includes(p.key)}
                                onChange={() => togglePrivilege(p.key)}
                              />
                              <div>
                                <div style={{ fontSize: 13, fontWeight: 600 }}>{p.name}</div>
                                {p.description && <div style={{ fontSize: 11, color: '#64748b' }}>{p.description}</div>}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}

                  <div className="d-flex gap-2 mt-4 pt-3" style={{ borderTop: '1px solid #e5e7eb' }}>
                    <button className="btn btn-primary px-4" onClick={handleSave} disabled={saving}>
                      {saving ? <><span className="spinner-border spinner-border-sm me-2"></span>Saving...</> : <><i className="bi bi-check-lg me-1"></i>Save Default Access</>}
                    </button>
                  </div>
                </>
              ) : (
                <div className="text-center py-5 text-muted">
                  <i className="bi bi-shield-lock fs-1 d-block mb-2 opacity-25"></i>
                  Select a user level to configure default permissions
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
