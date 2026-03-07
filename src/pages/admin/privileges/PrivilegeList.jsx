import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { api } from '../../../lib/api'
import Pagination from '../../../components/Pagination'
import exportCSV from '../../../lib/exportCSV'

const emptyForm = { name: '', key: '', description: '' }

export default function PrivilegeList() {
  const [privileges, setPrivileges] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [showDelete, setShowDelete] = useState(null)
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(10)

  useEffect(() => { fetchPrivileges() }, [])

  async function fetchPrivileges() {
    setLoading(true)
    try {
      const data = await api.getPrivileges()
      setPrivileges(data)
    } catch (err) {
      toast.error('Failed to load privileges: ' + err.message)
    }
    setLoading(false)
  }

  // Filter by search
  let filtered = privileges
  if (search.trim()) {
    const s = search.toLowerCase()
    filtered = filtered.filter(p =>
      p.name.toLowerCase().includes(s) ||
      p.key?.toLowerCase().includes(s) ||
      p.description?.toLowerCase().includes(s)
    )
  }

  function openAdd() {
    setEditingId(null)
    setForm(emptyForm)
    setShowModal(true)
  }

  function openEdit(priv) {
    setEditingId(priv._id)
    setForm({ name: priv.name, key: priv.key || '', description: priv.description || '' })
    setShowModal(true)
  }

  async function handleSave() {
    if (!form.name.trim()) return toast.error('Privilege name is required')
    const key = form.key.trim() || form.name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
    const payload = { ...form, key }
    setSaving(true)
    try {
      if (editingId) {
        const updated = await api.updatePrivilege(editingId, payload)
        setPrivileges(prev => prev.map(p => p._id === editingId ? updated : p))
        toast.success(`Privilege "${form.name}" updated`)
      } else {
        const created = await api.createPrivilege(payload)
        setPrivileges(prev => [...prev, created])
        toast.success(`Privilege "${form.name}" created`)
      }
      setShowModal(false)
    } catch (err) {
      toast.error(err.message)
    }
    setSaving(false)
  }

  async function handleDelete() {
    if (!showDelete) return
    try {
      await api.deletePrivilege(showDelete._id)
      setPrivileges(prev => prev.filter(p => p._id !== showDelete._id))
      toast.success(`"${showDelete.name}" deleted`)
      setShowDelete(null)
    } catch (err) {
      toast.error(err.message)
    }
  }

  async function handleSeed() {
    try {
      const res = await api.seedPrivileges()
      toast.success(res.message)
      fetchPrivileges()
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
              <li className="breadcrumb-item active">Privileges</li>
            </ol>
          </nav>
          <h3 className="mb-0">Privileges</h3>
        </div>
        <div className="d-flex gap-2">
          {privileges.length === 0 && (
            <button className="btn btn-outline-success" onClick={handleSeed}>
              <i className="bi bi-database me-1"></i> Seed Defaults
            </button>
          )}
          <button className="btn btn-primary" onClick={openAdd}>
            <i className="bi bi-plus-lg me-1"></i> Add New Privileges
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="row g-3 mb-4">
        {[
          { value: privileges.length, label: 'TOTAL PRIVILEGES', icon: 'bi-key-fill', bg: '#eff6ff', color: '#2563eb' },
          { value: privileges.filter(p => p.status === 'active').length, label: 'ACTIVE', icon: 'bi-check-circle-fill', bg: '#ecfdf5', color: '#10b981' },
          { value: privileges.filter(p => p.status === 'inactive').length, label: 'INACTIVE', icon: 'bi-x-circle-fill', bg: '#fef2f2', color: '#ef4444' },
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

      {/* Privileges Table */}
      <div className="card border-0 shadow-sm">
        <div className="card-header py-3 border-0" style={{ background: 'linear-gradient(135deg, #2563eb, #1e40af)', color: '#fff' }}>
          <div className="d-flex justify-content-between align-items-center">
            <h5 className="mb-0"><i className="bi bi-gear me-2"></i>Privileges List</h5>
            <div className="d-flex align-items-center gap-2">
              <button className="btn btn-sm btn-light" onClick={() => exportCSV(
                filtered.map((p, i) => [i + 1, p.name, p.key || '', p.description || '']),
                ['#', 'Privileges', 'Privileges Key', 'Description'], 'privileges'
              )}><i className="bi bi-download me-1"></i>Export</button>
              <span className="badge bg-white bg-opacity-25 px-3 py-2">{filtered.length} privileges</span>
            </div>
          </div>
        </div>
        <div className="card-body p-0">
          {/* Search */}
          <div className="d-flex justify-content-end p-3 pb-0">
            <div className="input-group" style={{ maxWidth: 260 }}>
              <span className="input-group-text bg-white"><i className="bi bi-search"></i></span>
              <input type="text" className="form-control" placeholder="Search..." value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
            </div>
          </div>

          <div className="table-responsive">
            <table className="table table-hover mb-0 align-middle">
              <thead className="bg-light">
                <tr>
                  <th className="ps-4" style={{ width: 60 }}>List #</th>
                  <th>Privileges</th>
                  <th>Privileges Key</th>
                  <th>Description</th>
                  <th className="pe-4 text-center" style={{ width: 120 }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan="5" className="text-center py-4 text-muted">No privileges found. Click "Seed Defaults" to create default privileges.</td></tr>
                ) : filtered.slice((page - 1) * perPage, page * perPage).map((priv, index) => (
                  <tr key={priv._id}>
                    <td className="ps-4 text-muted">{(page - 1) * perPage + index + 1}</td>
                    <td className="fw-medium">{priv.name}</td>
                    <td className="text-muted">{priv.key || '-'}</td>
                    <td className="text-muted">{priv.description || '-'}</td>
                    <td className="pe-4 text-center">
                      <button className="btn btn-sm btn-action btn-outline-primary me-1" title="Edit" onClick={() => openEdit(priv)}>
                        <i className="bi bi-pencil"></i>
                      </button>
                      <button className="btn btn-sm btn-action btn-outline-danger" title="Delete" onClick={() => setShowDelete(priv)}>
                        <i className="bi bi-trash"></i>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination total={filtered.length} page={page} perPage={perPage} onPageChange={setPage} onPerPageChange={setPerPage} />
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <>
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1050 }} onClick={() => setShowModal(false)} />
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 1055, width: '90%', maxWidth: 600, maxHeight: '85vh', overflow: 'auto', background: '#fff', borderRadius: 16, boxShadow: '0 25px 50px rgba(0,0,0,0.25)' }}>
            <div className="modal-header text-white border-0" style={{ background: 'linear-gradient(135deg, #2563eb, #1e40af)', padding: '18px 24px', borderRadius: '16px 16px 0 0' }}>
              <h5 className="modal-title" style={{ fontSize: '1.1rem', fontWeight: 700 }}>
                <i className={`bi ${editingId ? 'bi-pencil' : 'bi-plus-lg'} me-2`}></i>
                {editingId ? 'Edit Privilege' : 'Add Privilege'}
              </h5>
              <button type="button" className="btn-close btn-close-white" onClick={() => setShowModal(false)}></button>
            </div>
            <div className="modal-body p-4">
              <div className="mb-3">
                <label className="form-label fw-medium">Privilege Name <span className="text-danger">*</span></label>
                <input type="text" className="form-control" value={form.name}
                  onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Enter privilege name" />
              </div>
              <div className="mb-3">
                <label className="form-label fw-medium">Privilege Key</label>
                <input type="text" className="form-control" value={form.key}
                  onChange={e => setForm(p => ({ ...p, key: e.target.value }))} placeholder="e.g. create_new_user" />
                <div className="form-text">Auto-generated from name if left empty</div>
              </div>
              <div className="mb-3">
                <label className="form-label fw-medium">Description</label>
                <textarea className="form-control" rows="3" value={form.description}
                  onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Enter description"></textarea>
              </div>
            </div>
            <div className="modal-footer border-0 p-4 pt-0">
              <button type="button" className="btn btn-outline-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button type="button" className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? <><span className="spinner-border spinner-border-sm me-2"></span>Saving...</> : <><i className="bi bi-check-lg me-1"></i> {editingId ? 'Update' : 'Save'}</>}
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
              <h5 className="mb-0 text-white fw-bold"><i className="bi bi-exclamation-triangle me-2"></i>Delete Privilege</h5>
            </div>
            <div className="p-4 text-center">
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#fef2f2', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', color: '#ef4444', marginBottom: 16 }}>
                <i className="bi bi-exclamation-triangle"></i>
              </div>
              <p className="text-muted">Are you sure you want to delete <strong>{showDelete.name}</strong>?</p>
              <div className="d-flex gap-2 justify-content-center">
                <button className="btn btn-outline-secondary" onClick={() => setShowDelete(null)}>Cancel</button>
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
