import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { api } from '../../lib/api'
import Pagination from '../../components/Pagination'
import exportCSV from '../../lib/exportCSV'

const iconOptions = [
  { value: 'bi-shoe', label: 'Shoe', bg: '#dbeafe', color: '#1d4ed8' },
  { value: 'bi-layers', label: 'Layers', bg: '#dcfce7', color: '#166534' },
  { value: 'bi-bag', label: 'Bag', bg: '#fef3c7', color: '#92400e' },
  { value: 'bi-palette', label: 'Palette', bg: '#f3e8ff', color: '#7c3aed' },
  { value: 'bi-easel', label: 'Display', bg: '#ffe4e6', color: '#be123c' },
  { value: 'bi-box-seam', label: 'Box', bg: '#dbeafe', color: '#1d4ed8' },
  { value: 'bi-gear', label: 'Gear', bg: '#f1f5f9', color: '#475569' },
  { value: 'bi-tags', label: 'Tags', bg: '#fef9c3', color: '#854d0e' },
]

const emptyForm = { name: '', description: '', icon: 'bi-box-seam', icon_bg: '#dbeafe', icon_color: '#1d4ed8', status: 'active' }

export default function ItemTypeList() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(10)

  useEffect(() => { fetchItems() }, [])

  async function fetchItems() {
    setLoading(true)
    try {
      const data = await api.getItemTypes()
      setItems(data)
    } catch (err) {
      toast.error('Failed to load item types: ' + err.message)
    }
    setLoading(false)
  }

  // Filter & search
  let filtered = items
  if (filter === 'active' || filter === 'inactive') {
    filtered = filtered.filter(i => i.status === filter)
  }
  if (search.trim()) {
    const s = search.toLowerCase()
    filtered = filtered.filter(i =>
      i.name.toLowerCase().includes(s) ||
      i.description.toLowerCase().includes(s)
    )
  }

  const activeCount = items.filter(i => i.status === 'active').length
  const inactiveCount = items.filter(i => i.status === 'inactive').length

  // Add
  function openAdd() {
    setEditingId(null)
    setForm(emptyForm)
    setShowModal(true)
  }

  // Edit
  function openEdit(item) {
    setEditingId(item._id)
    setForm({
      name: item.name,
      description: item.description || '',
      icon: item.icon || 'bi-box-seam',
      icon_bg: item.icon_bg || '#dbeafe',
      icon_color: item.icon_color || '#1d4ed8',
      status: item.status,
    })
    setShowModal(true)
  }

  // Handle icon change - update bg/color from iconOptions
  function handleIconChange(iconValue) {
    const opt = iconOptions.find(o => o.value === iconValue)
    setForm(p => ({
      ...p,
      icon: iconValue,
      icon_bg: opt ? opt.bg : '#dbeafe',
      icon_color: opt ? opt.color : '#1d4ed8',
    }))
  }

  // Save
  async function handleSave() {
    if (!form.name.trim()) {
      toast.error('Item type name is required')
      return
    }
    // Uniqueness check
    try {
      const check = await api.checkUniqueItemType(form.name.trim(), editingId)
      if (!check.unique) { toast.error(`Item type "${form.name}" already exists`); return }
    } catch {}
    setSaving(true)
    try {
      if (editingId) {
        const updated = await api.updateItemType(editingId, form)
        setItems(prev => prev.map(i => i._id === editingId ? updated : i))
        toast.success(`"${form.name}" updated`)
      } else {
        const created = await api.createItemType(form)
        setItems(prev => [...prev, created])
        toast.success(`"${form.name}" created`)
      }
      setShowModal(false)
    } catch (err) {
      toast.error(err.message)
    }
    setSaving(false)
  }

  // Toggle status
  async function handleToggleStatus(item) {
    try {
      const updated = item.status === 'active'
        ? await api.deactivateItemType(item._id)
        : await api.activateItemType(item._id)
      setItems(prev => prev.map(i => i._id === item._id ? updated : i))
      toast.success(`"${item.name}" ${updated.status === 'active' ? 'activated' : 'deactivated'}`)
    } catch (err) {
      toast.error(err.message)
    }
  }

  // Delete
  function openDeleteModal(item) {
    setDeleteTarget(item)
    setShowDeleteModal(true)
  }

  async function handleDeactivateFromModal() {
    if (!deleteTarget) return
    await handleToggleStatus(deleteTarget)
    setShowDeleteModal(false)
    setDeleteTarget(null)
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return
    try {
      await api.deleteItemType(deleteTarget._id)
      setItems(prev => prev.filter(i => i._id !== deleteTarget._id))
      toast.success(`"${deleteTarget.name}" permanently deleted`)
    } catch (err) {
      toast.error(err.message)
    }
    setShowDeleteModal(false)
    setDeleteTarget(null)
  }

  return (
    <>
      {/* Action Bar */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h5 className="mb-0 fw-bold"><i className="bi bi-tags me-2 text-primary"></i>Item Types</h5>
        <button className="btn btn-primary" onClick={openAdd}>
          <i className="bi bi-plus-lg me-1"></i> Add Item Type
        </button>
      </div>

      {/* Stats */}
      <div className="row g-3 mb-4">
        {[
          { value: items.length, label: 'Total Types', icon: 'bi-tags', bg: '#eff6ff', color: '#2563eb' },
          { value: activeCount, label: 'Active', icon: 'bi-check-circle-fill', bg: '#ecfdf5', color: '#10b981' },
          { value: inactiveCount, label: 'Inactive', icon: 'bi-x-circle-fill', bg: '#fef2f2', color: '#ef4444' },
        ].map((stat, i) => (
          <div className="col-md-4 col-6" key={i}>
            <div className="stat-card">
              <div className="d-flex align-items-center gap-3">
                <div className="stat-icon" style={{ background: stat.bg, color: stat.color }}>
                  <i className={`bi ${stat.icon}`}></i>
                </div>
                <div>
                  <div className="stat-value">{loading ? '-' : stat.value}</div>
                  <div className="stat-label">{stat.label}</div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Search + Filter */}
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-3">
        <div className="filter-pills d-flex flex-wrap gap-2">
          {['all', 'active', 'inactive'].map(f => (
            <button key={f} className={`btn btn-outline-secondary${filter === f ? ' active' : ''}`} onClick={() => { setFilter(f); setPage(1) }}>
              {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
              <span className="badge bg-white text-dark ms-1">
                {f === 'all' ? items.length : f === 'active' ? activeCount : inactiveCount}
              </span>
            </button>
          ))}
        </div>
        <div className="input-group" style={{ maxWidth: 260 }}>
          <span className="input-group-text bg-white"><i className="bi bi-search"></i></span>
          <input type="text" className="form-control" placeholder="Search item types..." value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
        </div>
      </div>

      {/* Table */}
      <div className="card border-0 shadow-sm">
        <div className="card-header py-3 border-0" style={{ background: 'linear-gradient(135deg, #2563eb, #1e40af)', color: '#fff' }}>
          <div className="d-flex justify-content-between align-items-center">
            <h5 className="mb-0"><i className="bi bi-tags me-2"></i>Item Types</h5>
            <div className="d-flex align-items-center gap-2">
              <button className="btn btn-sm btn-light" onClick={() => exportCSV(
                filtered.map((t, i) => [i + 1, t.name, t.description || '', t.status]),
                ['#', 'Item Type', 'Description', 'Status'], 'item-types'
              )}><i className="bi bi-download me-1"></i>Export</button>
              <span className="badge bg-white bg-opacity-25 px-3 py-2">{filtered.length} types</span>
            </div>
          </div>
        </div>
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover mb-0 align-middle">
              <thead className="bg-light">
                <tr>
                  <th className="ps-4" style={{ width: 50 }}>#</th>
                  <th>Item Type</th>
                  <th>Description</th>
                  <th>Status</th>
                  <th className="pe-4 text-center" style={{ width: 150 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="5" className="text-center py-5 text-muted">
                    <div className="spinner-border spinner-border-sm me-2"></div>Loading...
                  </td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan="5" className="text-center py-5 text-muted">No item types found</td></tr>
                ) : filtered.slice((page - 1) * perPage, page * perPage).map((item, index) => {
                  const isInactive = item.status === 'inactive'
                  return (
                    <tr key={item._id} style={{ opacity: isInactive ? 0.6 : 1 }}>
                      <td className="ps-4 text-muted">{(page - 1) * perPage + index + 1}</td>
                      <td>
                        <div className="d-flex align-items-center gap-2">
                          <div style={{
                            width: 36, height: 36, borderRadius: 10,
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '1rem', flexShrink: 0,
                            background: isInactive ? '#f1f5f9' : (item.icon_bg || '#dbeafe'),
                            color: isInactive ? '#94a3b8' : (item.icon_color || '#1d4ed8')
                          }}>
                            <i className={`bi ${item.icon || 'bi-box-seam'}`}></i>
                          </div>
                          <span className={`fw-bold${isInactive ? ' text-muted' : ''}`}>{item.name}</span>
                        </div>
                      </td>
                      <td className="text-muted" style={{ fontSize: '0.85rem' }}>{item.description}</td>
                      <td>
                        <span className={`badge badge-${item.status}`}>
                          {item.status === 'active' ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="pe-4 text-center">
                        <button className="btn btn-sm btn-action btn-outline-primary me-1" title="Edit" onClick={() => openEdit(item)}>
                          <i className="bi bi-pencil"></i>
                        </button>
                        <button
                          className={`btn btn-sm btn-action ${isInactive ? 'btn-outline-success' : 'btn-outline-warning'} me-1`}
                          title={isInactive ? 'Activate' : 'Deactivate'}
                          onClick={() => handleToggleStatus(item)}
                        >
                          <i className={`bi ${isInactive ? 'bi-check-circle' : 'bi-pause-circle'}`}></i>
                        </button>
                        <button className="btn btn-sm btn-action btn-outline-danger" title="Delete" onClick={() => openDeleteModal(item)}>
                          <i className="bi bi-trash"></i>
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <Pagination total={filtered.length} page={page} perPage={perPage} onPageChange={setPage} onPerPageChange={setPerPage} />
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <>
          <div className="modal-backdrop fade show" style={{ zIndex: 1050 }}></div>
          <div className="modal fade show d-block" tabIndex="-1" style={{ zIndex: 1055 }}>
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content border-0 shadow" style={{ borderRadius: 16, overflow: 'hidden' }}>
                <div className="modal-header text-white border-0" style={{ background: 'linear-gradient(135deg, #2563eb, #1e40af)' }}>
                  <h5 className="modal-title fw-bold">
                    <i className={`bi ${editingId ? 'bi-pencil' : 'bi-tags'} me-2`}></i>
                    {editingId ? 'Edit Item Type' : 'Add New Item Type'}
                  </h5>
                  <button type="button" className="btn-close btn-close-white" onClick={() => setShowModal(false)}></button>
                </div>
                <div className="modal-body" style={{ padding: 24 }}>
                  <div className="row g-3">
                    <div className="col-12">
                      <label className="form-label fw-medium">Item Type Name <span className="text-danger">*</span></label>
                      <input type="text" className="form-control" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Enter item type name" />
                    </div>
                    <div className="col-12">
                      <label className="form-label fw-medium">Description</label>
                      <textarea className="form-control" rows="2" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Brief description of this item type"></textarea>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-medium">Icon</label>
                      <select className="form-select" value={form.icon} onChange={e => handleIconChange(e.target.value)}>
                        {iconOptions.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-medium">Status</label>
                      <select className="form-select" value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>
                    {/* Icon Preview */}
                    <div className="col-12">
                      <label className="form-label fw-medium">Preview</label>
                      <div className="d-flex align-items-center gap-3 p-3 rounded" style={{ background: '#f8fafc' }}>
                        <div style={{
                          width: 44, height: 44, borderRadius: 12,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '1.15rem',
                          background: form.icon_bg, color: form.icon_color
                        }}>
                          <i className={`bi ${form.icon}`}></i>
                        </div>
                        <span className="fw-bold">{form.name || 'Item Type Name'}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="modal-footer border-0" style={{ padding: '16px 24px' }}>
                  <button type="button" className="btn btn-outline-secondary rounded-pill" onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="button" className="btn btn-primary rounded-pill" onClick={handleSave} disabled={saving}>
                    {saving ? <><span className="spinner-border spinner-border-sm me-2"></span>Saving...</> : <><i className="bi bi-check-lg me-1"></i> {editingId ? 'Update' : 'Save Item Type'}</>}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && deleteTarget && (
        <>
          <div className="modal-backdrop fade show" style={{ zIndex: 1050 }}></div>
          <div className="modal fade show d-block" tabIndex="-1" style={{ zIndex: 1055 }}>
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content border-0 shadow">
                <div className="modal-header text-white border-0" style={{ background: 'linear-gradient(135deg, #dc2626, #b91c1c)' }}>
                  <h5 className="modal-title fw-bold"><i className="bi bi-exclamation-triangle me-2"></i>Remove Item Type</h5>
                  <button type="button" className="btn-close btn-close-white" onClick={() => setShowDeleteModal(false)}></button>
                </div>
                <div className="modal-body text-center py-4">
                  <div className="mb-3" style={{ fontSize: '3rem', color: '#dc2626' }}>
                    <i className="bi bi-shield-exclamation"></i>
                  </div>
                  <h5 className="fw-bold mb-2">"{deleteTarget.name}"</h5>
                  <p className="text-muted mb-0">What would you like to do with this item type?</p>
                </div>
                <div className="modal-footer border-0 justify-content-center gap-2">
                  <button type="button" className="btn btn-outline-secondary" onClick={() => setShowDeleteModal(false)}>
                    Cancel
                  </button>
                  {deleteTarget.status === 'active' && (
                    <button type="button" className="btn btn-warning" onClick={handleDeactivateFromModal}>
                      <i className="bi bi-pause-circle me-1"></i> Deactivate
                    </button>
                  )}
                  <button type="button" className="btn btn-danger" onClick={handleDeleteConfirm}>
                    <i className="bi bi-trash me-1"></i> Delete Permanently
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}
