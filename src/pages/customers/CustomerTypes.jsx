import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { api } from '../../lib/api'
import Pagination from '../../components/Pagination'

const avatarColors = ['#2563eb', '#7c3aed', '#06b6d4', '#16a34a', '#f59e0b', '#ef4444', '#ec4899', '#8b5cf6']

function hashColor(name) {
  let h = 0
  for (let i = 0; i < name.length; i++) { h = ((h << 5) - h) + name.charCodeAt(i); h |= 0 }
  return avatarColors[Math.abs(h) % avatarColors.length]
}

function getInitials(name) {
  return (name || '').split(/\s+/).map(w => w[0] || '').join('').toUpperCase().slice(0, 2)
}

const emptyForm = { name: '', description: '', start_number: '' }

export default function CustomerTypes() {
  const [types, setTypes] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(10)
  const [showModal, setShowModal] = useState(false)
  const [editingType, setEditingType] = useState(null)
  const [form, setForm] = useState({ ...emptyForm })
  const [deleteType, setDeleteType] = useState(null)

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    setLoading(true)
    try {
      const data = await api.getCustomerTypesAll()
      setTypes(data || [])
    } catch (err) {
      toast.error('Failed to load customer types: ' + err.message)
    }
    setLoading(false)
  }

  function openCreate() {
    setEditingType(null)
    setForm({ ...emptyForm })
    setShowModal(true)
  }

  function openEdit(t) {
    setEditingType(t)
    setForm({
      name: t.name || '',
      description: t.description || '',
      start_number: t.start_number || '',
    })
    setShowModal(true)
  }

  async function handleSave(e) {
    e.preventDefault()
    if (!form.name.trim()) { toast.error('Name is required'); return }
    try {
      if (editingType) {
        await api.updateCustomerType(editingType._id, form)
        toast.success('Customer type updated')
      } else {
        await api.createCustomerType(form)
        toast.success('Customer type created')
      }
      setShowModal(false)
      fetchData()
    } catch (err) {
      toast.error(err.message)
    }
  }

  async function handleDelete() {
    if (!deleteType) return
    try {
      await api.deleteCustomerType(deleteType._id)
      toast.success(deleteType.name + ' deleted')
      setDeleteType(null)
      fetchData()
    } catch (err) {
      toast.error(err.message)
    }
  }

  const filtered = types.filter(t => {
    if (!search) return true
    const s = search.toLowerCase()
    return t.name?.toLowerCase().includes(s) ||
      t.code?.toLowerCase().includes(s) ||
      t.description?.toLowerCase().includes(s) ||
      t.start_number?.toLowerCase().includes(s)
  })
  const paginated = filtered.slice((page - 1) * perPage, page * perPage)

  const activeCount = types.filter(t => t.status === 'active').length
  const inactiveCount = types.filter(t => t.status !== 'active').length

  return (
    <div>
      {/* Page Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <nav aria-label="breadcrumb">
            <ol className="breadcrumb mb-1">
              <li className="breadcrumb-item"><Link to="/dashboard"><i className="bi bi-house-door"></i></Link></li>
              <li className="breadcrumb-item">Customers</li>
              <li className="breadcrumb-item active">Customer Types</li>
            </ol>
          </nav>
          <h3 className="mb-0">Customer Types</h3>
        </div>
        <div className="d-flex gap-2">
          <Link to="/customers/active" className="btn btn-outline-secondary">
            <i className="bi bi-building me-1"></i> Customers
          </Link>
          <button className="btn btn-primary" onClick={openCreate}>
            <i className="bi bi-plus-lg me-1"></i> Add Type
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="row g-3 mb-4">
        {[
          { value: types.length, label: 'Total Types', icon: 'bi-tags-fill', bg: '#eff6ff', color: '#2563eb' },
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

      {/* Filters */}
      <div className="card border-0 shadow-sm rounded-4 mb-3">
        <div className="card-body py-3 px-4">
          <div className="d-flex flex-wrap align-items-center gap-3">
            <div className="position-relative flex-grow-1" style={{ maxWidth: 320 }}>
              <i className="bi bi-search position-absolute" style={{ left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}></i>
              <input type="text" className="form-control form-control-sm ps-5" placeholder="Search customer types..." value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
            </div>
            {search && (
              <button className="btn btn-sm btn-outline-secondary" onClick={() => { setSearch(''); setPage(1) }}>
                <i className="bi bi-x-lg me-1"></i>Clear
              </button>
            )}
            <span className="text-muted small ms-auto">{filtered.length} type{filtered.length !== 1 ? 's' : ''}</span>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
        <div className="card-header py-3 border-0" style={{ background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)', color: '#fff' }}>
          <div className="d-flex justify-content-between align-items-center">
            <h5 className="mb-0"><i className="bi bi-tags me-2"></i>Customer Type List</h5>
            <span className="badge bg-white bg-opacity-25 px-3 py-2">{filtered.length} types</span>
          </div>
        </div>
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="bg-light">
              <tr>
                <th className="ps-4">Customer Type Name</th>
                <th>Description</th>
                <th>Cust #</th>
                <th>Status</th>
                <th className="pe-4 text-center" style={{ width: 120 }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="5" className="text-center py-4"><div className="spinner-border spinner-border-sm text-primary"></div> Loading...</td></tr>
              ) : paginated.length === 0 ? (
                <tr><td colSpan="5" className="text-center py-4 text-muted"><i className="bi bi-tags fs-1 d-block mb-2 opacity-25"></i>No customer types found</td></tr>
              ) : paginated.map(t => (
                <tr key={t._id}>
                  <td className="ps-4">
                    <div className="d-flex align-items-center gap-3">
                      <div className="rounded-circle d-flex align-items-center justify-content-center fw-bold text-white"
                        style={{ width: 32, height: 32, fontSize: '0.75rem', background: hashColor(t.name || '') }}>
                        {getInitials(t.name)}
                      </div>
                      <div className="fw-semibold">{t.name}</div>
                    </div>
                  </td>
                  <td><span className="small text-muted">{t.description || '-'}</span></td>
                  <td><span className="small fw-medium">{t.start_number || '-'}</span></td>
                  <td>
                    <span className={`badge rounded-pill px-3 ${t.status === 'active' ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger'}`}>
                      {t.status === 'active' ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="pe-4 text-center">
                    <button className="btn btn-sm btn-action btn-outline-primary me-1" title="Edit" onClick={() => openEdit(t)}>
                      <i className="bi bi-pencil"></i>
                    </button>
                    <button className="btn btn-sm btn-action btn-outline-danger" title="Delete" onClick={() => setDeleteType(t)}>
                      <i className="bi bi-trash"></i>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length > 0 && (
          <div className="card-footer bg-white border-0 py-3">
            <Pagination total={filtered.length} page={page} perPage={perPage}
              onPageChange={setPage} onPerPageChange={v => { setPerPage(v); setPage(1) }} />
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (<>
        <div className="modal-backdrop fade show"></div>
        <div className="modal fade show d-block" tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow">
              <div className="modal-header text-white" style={{ background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)' }}>
                <h5 className="modal-title">
                  <i className={`bi ${editingType ? 'bi-pencil' : 'bi-plus-circle'} me-2`}></i>
                  {editingType ? 'Edit Customer Type' : 'Add Customer Type'}
                </h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowModal(false)}></button>
              </div>
              <form onSubmit={handleSave}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">Customer Type Name <span className="text-danger">*</span></label>
                    <input type="text" className="form-control" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Description</label>
                    <textarea className="form-control" rows="3" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}></textarea>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Start Number</label>
                    <input type="text" className="form-control" value={form.start_number} onChange={e => setForm({ ...form, start_number: e.target.value })} placeholder="e.g. 100" />
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-outline-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary">
                    <i className={`bi ${editingType ? 'bi-check-lg' : 'bi-plus-lg'} me-1`}></i>
                    {editingType ? 'Update' : 'Save'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </>)}

      {/* Delete Confirmation Modal */}
      {deleteType && (<>
        <div className="modal-backdrop fade show"></div>
        <div className="modal fade show d-block" tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow">
              <div className="modal-header text-white bg-danger">
                <h5 className="modal-title"><i className="bi bi-trash me-2"></i>Delete Customer Type</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setDeleteType(null)}></button>
              </div>
              <div className="modal-body">
                <p>Are you sure you want to permanently delete <strong>{deleteType.name}</strong>?</p>
              </div>
              <div className="modal-footer">
                <button className="btn btn-outline-secondary" onClick={() => setDeleteType(null)}>Cancel</button>
                <button className="btn btn-danger" onClick={handleDelete}>Delete</button>
              </div>
            </div>
          </div>
        </div>
      </>)}
    </div>
  )
}
