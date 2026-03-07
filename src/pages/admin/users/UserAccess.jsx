import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../../lib/api'
import toast from 'react-hot-toast'

export default function UserAccess() {
  const [users, setUsers] = useState([])
  const [levels, setLevels] = useState([])
  const [privileges, setPrivileges] = useState([])
  const [selectedUserId, setSelectedUserId] = useState('')
  const [access, setAccess] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    Promise.all([
      api.getUsers(),
      api.getUserLevels(),
      api.getPrivileges(),
    ]).then(([u, l, p]) => {
      setUsers(u)
      // Exclude superuser from columns
      setLevels(l.filter(lv => lv.key !== 'superuser' && lv.status === 'active'))
      setPrivileges(p)
      if (u.length > 0) setSelectedUserId(u[0]._id)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  // Load access when user changes
  useEffect(() => {
    if (!selectedUserId) return
    api.getUserAccess(selectedUserId).then(data => {
      setAccess(data.access || [])
    }).catch(() => setAccess([]))
  }, [selectedUserId])

  function isChecked(levelId, privilegeId) {
    const entry = access.find(a => a.level === levelId)
    return entry ? entry.privileges.includes(privilegeId) : false
  }

  function toggleCheck(levelId, privilegeId) {
    setAccess(prev => {
      const existing = prev.find(a => a.level === levelId)
      if (existing) {
        const has = existing.privileges.includes(privilegeId)
        return prev.map(a =>
          a.level === levelId
            ? { ...a, privileges: has ? a.privileges.filter(p => p !== privilegeId) : [...a.privileges, privilegeId] }
            : a
        )
      } else {
        return [...prev, { level: levelId, privileges: [privilegeId] }]
      }
    })
  }

  async function handleSave() {
    if (!selectedUserId) return
    setSaving(true)
    try {
      await api.saveUserAccess(selectedUserId, access)
      toast.success('Access saved successfully')
    } catch (err) {
      toast.error(err.message)
    }
    setSaving(false)
  }

  if (loading) return <div className="p-4">Loading...</div>

  return (
    <>
      {/* Page Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <nav aria-label="breadcrumb">
            <ol className="breadcrumb mb-1">
              <li className="breadcrumb-item"><Link to="/"><i className="bi bi-house-door"></i></Link></li>
              <li className="breadcrumb-item">Admin</li>
              <li className="breadcrumb-item active">User Access</li>
            </ol>
          </nav>
          <h3 className="mb-0">User Access Page</h3>
        </div>
      </div>

      {/* Content Card */}
      <div className="card border-0 shadow-sm">
        <div className="card-header py-3 border-0" style={{ background: 'linear-gradient(135deg, #2563eb, #1e40af)', color: '#fff' }}>
          <h5 className="mb-0"><i className="bi bi-gear me-2"></i>User Access Page</h5>
        </div>
        <div className="card-body">
          {/* Select User */}
          <div className="d-flex align-items-center gap-3 mb-4">
            <label className="form-label fw-medium mb-0" style={{ whiteSpace: 'nowrap' }}>Select User :</label>
            <select
              className="form-select"
              style={{ maxWidth: 400 }}
              value={selectedUserId}
              onChange={e => setSelectedUserId(e.target.value)}
            >
              {users.map(u => (
                <option key={u._id} value={u._id}>{u.first_name} {u.last_name}</option>
              ))}
            </select>
          </div>

          {/* Access Table */}
          <div className="table-responsive">
            <table className="table table-bordered mb-0 align-middle">
              <thead>
                <tr>
                  <th style={{ minWidth: 250 }}>Access Privileges Name</th>
                  {levels.map(level => (
                    <th key={level._id} style={{ minWidth: 160 }}>{level.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {privileges.length === 0 ? (
                  <tr><td colSpan={1 + levels.length} className="text-center py-4 text-muted">No privileges found. Add privileges first.</td></tr>
                ) : privileges.map(priv => (
                  <tr key={priv._id}>
                    <td>{priv.name}</td>
                    {levels.map(level => (
                      <td key={level._id}>
                        <input
                          className="form-check-input"
                          type="checkbox"
                          checked={isChecked(level._id, priv._id)}
                          onChange={() => toggleCheck(level._id, priv._id)}
                          style={{ width: 18, height: 18, cursor: 'pointer' }}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Save Button */}
          <div className="text-center mt-4">
            <button className="btn btn-primary px-4" onClick={handleSave} disabled={saving}>
              {saving ? <><span className="spinner-border spinner-border-sm me-2"></span>Saving...</> : 'Save Access'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
