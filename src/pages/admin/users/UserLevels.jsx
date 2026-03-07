import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { api } from '../../../lib/api'
import Pagination from '../../../components/Pagination'
import exportCSV from '../../../lib/exportCSV'

export default function UserLevels() {
  const [levels, setLevels] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [showDelete, setShowDelete] = useState(null)
  const [form, setForm] = useState({ name: '', key: '', status: 'active' })
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(10)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      const lvls = await api.getUserLevels()
      setLevels(lvls)
    } catch (err) {
      toast.error('Failed to load levels')
    }
    setLoading(false)
  }

  function openAdd() {
    setEditingId(null)
    setForm({ name: '', key: '', status: 'active' })
    setShowModal(true)
  }

  function openEdit(level) {
    setEditingId(level._id)
    setForm({
      name: level.name, key: level.key, status: level.status
    })
    setShowModal(true)
  }

  async function handleSave() {
    if (!form.name.trim()) return toast.error('Please enter a level name')
    const key = form.key.trim() || form.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    const payload = { ...form, key }
    try {
      if (editingId) {
        await api.updateUserLevel(editingId, payload)
        toast.success(`Level "${form.name}" updated`)
      } else {
        await api.createUserLevel(payload)
        toast.success(`Level "${form.name}" created`)
      }
      setShowModal(false)
      load()
    } catch (err) {
      toast.error(err.message)
    }
  }

  async function handleDelete() {
    if (!showDelete) return
    try {
      await api.deleteUserLevel(showDelete._id)
      toast.success(`Level "${showDelete.name}" deleted`)
      setShowDelete(null)
      load()
    } catch (err) {
      toast.error(err.message)
    }
  }

  async function handleDeactivate() {
    if (!showDelete) return
    try {
      await api.deactivateUserLevel(showDelete._id)
      toast.success(`Level "${showDelete.name}" deactivated`)
      setShowDelete(null)
      load()
    } catch (err) {
      toast.error(err.message)
    }
  }

  async function handleSeed() {
    try {
      const res = await api.seedUserLevels()
      toast.success(res.message)
      load()
    } catch (err) {
      toast.error(err.message)
    }
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
              <li className="breadcrumb-item active">User Levels</li>
            </ol>
          </nav>
          <h3 className="mb-0">List Of User Levels</h3>
        </div>
        <div className="d-flex gap-2">
          {levels.length === 0 && (
            <button className="btn btn-outline-success" onClick={handleSeed}>
              <i className="bi bi-database me-1"></i> Seed Defaults
            </button>
          )}
          <button className="btn btn-primary" onClick={openAdd}>
            <i className="bi bi-plus-lg me-1"></i> Add Level
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="row g-3 mb-4">
        {[
          { value: levels.length, label: 'TOTAL LEVELS', icon: 'bi-layers-fill', bg: '#eff6ff', color: '#2563eb' },
          { value: levels.filter(l => l.status === 'active').length, label: 'ACTIVE', icon: 'bi-check-circle-fill', bg: '#ecfdf5', color: '#10b981' },
          { value: levels.filter(l => l.status === 'inactive').length, label: 'INACTIVE', icon: 'bi-x-circle-fill', bg: '#fef2f2', color: '#ef4444' },
        ].map((stat, i) => (
          <div className="col-md-4 col-6" key={i}>
            <div className="stat-card">
              <div className="d-flex align-items-center gap-3">
                <div className="stat-icon" style={{ background: stat.bg, color: stat.color }}>
                  <i className={`bi ${stat.icon}`}></i>
                </div>
                <div>
                  <div className="stat-value">{stat.value}</div>
                  <div className="stat-label">{stat.label}</div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Levels Table */}
      <div className="card border-0 shadow-sm">
        <div className="card-header py-3" style={{ background: 'linear-gradient(135deg, #2563eb, #1e40af)', color: '#fff' }}>
          <div className="d-flex justify-content-between align-items-center">
            <h5 className="mb-0"><i className="bi bi-layers me-2"></i>User Levels Configuration</h5>
            <div className="d-flex align-items-center gap-2">
              <button className="btn btn-sm btn-light" onClick={() => exportCSV(
                levels.map((l, i) => [i + 1, l.name, l.key, l.status]),
                ['#', 'Level Name', 'Level Key', 'Status'], 'user-levels'
              )}><i className="bi bi-download me-1"></i>Export</button>
              <span className="badge bg-white bg-opacity-25 px-3 py-2">{levels.length} levels</span>
            </div>
          </div>
        </div>
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover mb-0 align-middle">
              <thead className="bg-light">
                <tr>
                  <th>Level Name</th>
                  <th>Level Key</th>
                  <th>Action</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {levels.length === 0 ? (
                  <tr><td colSpan="4" className="text-center py-4 text-muted">No levels found. Click "Seed Defaults" to create default levels.</td></tr>
                ) : levels.slice((page - 1) * perPage, page * perPage).map((level, index) => (
                  <tr key={level._id} style={level.status === 'inactive' ? { opacity: 0.6 } : {}}>
                    <td className="ps-3 fw-medium">{level.name}</td>
                    <td className="text-muted">{level.key}</td>
                    <td>
                      <button className="btn btn-sm btn-action btn-outline-primary me-1" title="Edit" onClick={() => openEdit(level)}>
                        <i className="bi bi-pencil"></i>
                      </button>
                      <button className="btn btn-sm btn-action btn-outline-danger" title="Delete" onClick={() => setShowDelete(level)}>
                        <i className="bi bi-trash"></i>
                      </button>
                    </td>
                    <td>
                      <span className={`badge ${level.status === 'active' ? 'badge-active' : 'badge-inactive'}`}>
                        {level.status === 'active' ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination total={levels.length} page={page} perPage={perPage} onPageChange={setPage} onPerPageChange={setPerPage} />
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <>
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1050 }} onClick={() => setShowModal(false)} />
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 1055, width: '90%', maxWidth: 600, maxHeight: '85vh', overflow: 'auto', background: '#fff', borderRadius: 16, boxShadow: '0 25px 50px rgba(0,0,0,0.25)' }}>
            <div className="modal-header text-white border-0" style={{ background: 'linear-gradient(135deg, #2563eb, #1e40af)', padding: '18px 24px', borderRadius: '16px 16px 0 0' }}>
              <h5 className="modal-title" style={{ fontSize: '1.1rem', fontWeight: 700 }}>
                <i className={`bi ${editingId ? 'bi-pencil' : 'bi-layers'} me-2`}></i>
                {editingId ? 'Edit User Level' : 'Add User Level'}
              </h5>
              <button type="button" className="btn-close btn-close-white" onClick={() => setShowModal(false)}></button>
            </div>
            <div className="modal-body p-4">
              <div className="mb-3">
                <label className="form-label fw-medium">Level Name <span className="text-danger">*</span></label>
                <input type="text" className="form-control" value={form.name}
                  onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))} placeholder="Enter level name" />
              </div>
              <div className="mb-3">
                <label className="form-label fw-medium">Level Key <span className="text-danger">*</span></label>
                <input type="text" className="form-control" value={form.key}
                  onChange={e => setForm(prev => ({ ...prev, key: e.target.value }))} placeholder="e.g. sales_rep, accountant" />
                <div className="form-text">Auto-generated from name if left empty</div>
              </div>
              <div className="mb-3">
                <label className="form-label fw-medium">Status</label>
                <select className="form-select" value={form.status}
                  onChange={e => setForm(prev => ({ ...prev, status: e.target.value }))}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
            <div className="modal-footer border-0 p-4 pt-0">
              <button type="button" className="btn btn-outline-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button type="button" className="btn btn-primary" onClick={handleSave}>
                <i className="bi bi-check-lg me-1"></i> Save Level
              </button>
            </div>
          </div>
        </>
      )}

      {/* Delete Modal */}
      {showDelete && (
        <>
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1050 }} onClick={() => setShowDelete(null)} />
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 1055, width: '90%', maxWidth: 450, background: '#fff', borderRadius: 16, boxShadow: '0 25px 50px rgba(0,0,0,0.25)', overflow: 'hidden' }}>
            <div style={{ background: 'linear-gradient(135deg, #dc2626, #b91c1c)', padding: '18px 24px', borderRadius: '16px 16px 0 0' }}>
              <h5 className="mb-0 text-white fw-bold"><i className="bi bi-exclamation-triangle me-2"></i>Delete Level</h5>
            </div>
            <div className="p-4 text-center">
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#fef2f2', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', color: '#ef4444', marginBottom: 16 }}>
                <i className="bi bi-exclamation-triangle"></i>
              </div>
              <p className="text-muted">What would you like to do with <strong>{showDelete.name}</strong>?</p>
              <div className="d-flex gap-2 justify-content-center">
                <button className="btn btn-outline-secondary" onClick={() => setShowDelete(null)}>Cancel</button>
                <button className="btn btn-warning" onClick={handleDeactivate}>
                  <i className="bi bi-pause me-1"></i> Deactivate
                </button>
                <button className="btn btn-danger" onClick={handleDelete}>
                  <i className="bi bi-trash me-1"></i> Delete Permanently
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}
