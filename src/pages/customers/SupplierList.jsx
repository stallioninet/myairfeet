import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { api } from '../../lib/api'
import Pagination from '../../components/Pagination'

const avatarColors = ['#2563eb', '#10b981', '#8b5cf6', '#f59e0b', '#14b8a6', '#ec4899', '#ef4444', '#06b6d4']

function hashColor(name) {
  let h = 0
  for (let i = 0; i < name.length; i++) { h = ((h << 5) - h) + name.charCodeAt(i); h |= 0 }
  return avatarColors[Math.abs(h) % avatarColors.length]
}

function getInitials(name) {
  return (name || '').split(/\s+/).map(w => w[0] || '').join('').toUpperCase().slice(0, 2)
}

const emptyForm = {
  supplier_name: '', supplier_type: '', contact_name: '', phone: '', extension: '',
  email: '', customer_code: '', notes: '', terms: '', fob: '', ship: '', ship_via: '',
  project: '', city: '', state: '', status: 'active'
}

export default function SupplierList() {
  const [suppliers, setSuppliers] = useState([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ total: 0, active: 0, inactive: 0, activeTypes: 0 })
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(10)
  const [showModal, setShowModal] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState(null)
  const [form, setForm] = useState({ ...emptyForm })
  const [viewSupplier, setViewSupplier] = useState(null)
  const [deleteSupplier, setDeleteSupplier] = useState(null)

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    setLoading(true)
    try {
      const [data, statsData] = await Promise.all([
        api.getSuppliers(),
        api.getSupplierStats()
      ])
      setSuppliers(data || [])
      setStats(statsData || { total: 0, active: 0, inactive: 0, activeTypes: 0 })
    } catch (err) {
      toast.error('Failed to load suppliers: ' + err.message)
    }
    setLoading(false)
  }

  function openCreate() {
    setEditingSupplier(null)
    setForm({ ...emptyForm })
    setShowModal(true)
  }

  function openEdit(s) {
    setEditingSupplier(s)
    setForm({
      supplier_name: s.supplier_name || '',
      supplier_type: s.supplier_type || '',
      contact_name: s.contact_name || '',
      phone: s.phone || '',
      extension: s.extension || '',
      email: s.email || '',
      customer_code: s.customer_code || '',
      notes: s.notes || '',
      terms: s.terms || '',
      fob: s.fob || '',
      ship: s.ship || '',
      ship_via: s.ship_via || '',
      project: s.project || '',
      city: s.city || '',
      state: s.state || '',
      status: s.status || 'active',
    })
    setShowModal(true)
  }

  async function handleSave(e) {
    e.preventDefault()
    if (!form.supplier_name.trim()) { toast.error('Supplier name is required'); return }
    try {
      if (editingSupplier) {
        await api.updateSupplier(editingSupplier._id, form)
        toast.success('Supplier updated')
      } else {
        await api.createSupplier(form)
        toast.success('Supplier created')
      }
      setShowModal(false)
      fetchData()
    } catch (err) {
      toast.error(err.message)
    }
  }

  async function handleDelete() {
    if (!deleteSupplier) return
    try {
      await api.deleteSupplier(deleteSupplier._id)
      toast.success(deleteSupplier.supplier_name + ' deleted')
      setDeleteSupplier(null)
      fetchData()
    } catch (err) {
      toast.error(err.message)
    }
  }

  const filtered = suppliers.filter(s => {
    if (!search) return true
    const q = search.toLowerCase()
    return s.supplier_name?.toLowerCase().includes(q) || s.email?.toLowerCase().includes(q) ||
      s.phone?.toLowerCase().includes(q) || s.contact_name?.toLowerCase().includes(q) ||
      s.customer_code?.toLowerCase().includes(q)
  })
  const paginated = filtered.slice((page - 1) * perPage, page * perPage)

  return (
    <div>
      {/* Header */}
      <div className="d-flex justify-content-between align-items-start mb-4 flex-wrap gap-2">
        <div>
          <nav aria-label="breadcrumb">
            <ol className="breadcrumb mb-1">
              <li className="breadcrumb-item"><Link to="/dashboard"><i className="bi bi-house-door"></i></Link></li>
              <li className="breadcrumb-item">Customers</li>
              <li className="breadcrumb-item active">Suppliers</li>
            </ol>
          </nav>
          <h3 className="mb-0">Suppliers</h3>
        </div>
        <div className="d-flex gap-2">
          <button className="btn btn-primary" onClick={openCreate}>
            <i className="bi bi-plus-lg me-1"></i> Add Supplier
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="row g-3 mb-4">
        {[
          { value: stats.total, label: 'Total Suppliers', icon: 'bi-building', bg: '#eff6ff', color: '#2563eb' },
          { value: stats.active, label: 'Active', icon: 'bi-check-circle-fill', bg: '#ecfdf5', color: '#10b981' },
          { value: stats.inactive, label: 'Inactive', icon: 'bi-pause-circle-fill', bg: '#fef3c7', color: '#f59e0b' },
          { value: stats.activeTypes, label: 'Types', icon: 'bi-tags-fill', bg: '#f5f3ff', color: '#8b5cf6' },
        ].map((stat, i) => (
          <div className="col-md-3 col-6" key={i}>
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

      {/* Table Card */}
      <div className="card border-0 shadow-sm">
        <div className="card-header py-3 border-0" style={{ background: 'linear-gradient(135deg, #2563eb, #1e40af)', color: '#fff' }}>
          <div className="d-flex justify-content-between align-items-center">
            <h5 className="mb-0"><i className="bi bi-building me-2"></i>Suppliers Directory</h5>
            <span className="badge bg-white bg-opacity-25 px-3 py-2">{filtered.length} suppliers</span>
          </div>
        </div>
        <div className="card-body p-0">
          {/* Search */}
          <div className="px-3 py-3">
            <div className="input-group" style={{ maxWidth: 320 }}>
              <span className="input-group-text bg-white"><i className="bi bi-search"></i></span>
              <input type="text" className="form-control" placeholder="Search suppliers..." value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
            </div>
          </div>

          <div className="table-responsive">
            <table className="table table-hover mb-0 align-middle">
              <thead className="bg-light">
                <tr>
                  <th className="ps-4" style={{ width: 80 }}>Cust #</th>
                  <th>Suppliers</th>
                  <th>Contact</th>
                  <th>Phone</th>
                  <th>Email</th>
                  <th className="pe-4 text-center" style={{ width: 140 }}>Action</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="7" className="text-center py-5 text-muted">
                    <div className="spinner-border spinner-border-sm me-2"></div>Loading...
                  </td></tr>
                ) : paginated.length === 0 ? (
                  <tr><td colSpan="7" className="text-center py-5 text-muted">No suppliers found</td></tr>
                ) : paginated.map((s, i) => (
                  <tr key={s._id}>
                    <td className="ps-4 fw-medium">{s.customer_code || '-'}</td>
                    <td>
                      <div className="d-flex align-items-center gap-2">
                        <div className="rounded-3 d-flex align-items-center justify-content-center fw-bold text-white"
                          style={{ width: 36, height: 36, fontSize: '0.8rem', background: `linear-gradient(135deg, ${hashColor(s.supplier_name || '')}, ${hashColor((s.supplier_name || '') + 'x')})` }}>
                          {getInitials(s.supplier_name)}
                        </div>
                        <div>
                          <a href="#" className="fw-medium text-decoration-none" onClick={ev => { ev.preventDefault(); setViewSupplier(s) }}>{s.supplier_name}</a>
                        </div>
                      </div>
                    </td>
                    <td><span className="fw-medium" style={{ fontSize: '0.85rem' }}>{s.contact_name || '-'}</span></td>
                    <td><span style={{ fontSize: '0.85rem' }}>{s.phone || '-'}</span></td>
                    <td>{s.email ? <a href={`mailto:${s.email}`} className="text-decoration-none" style={{ fontSize: '0.85rem' }}>{s.email}</a> : <span className="text-muted">-</span>}</td>
                    <td className="pe-4 text-center">
                      <button className="btn btn-sm btn-action btn-outline-info me-1" title="View" onClick={() => setViewSupplier(s)}>
                        <i className="bi bi-eye"></i>
                      </button>
                      <button className="btn btn-sm btn-action btn-outline-primary me-1" title="Edit" onClick={() => openEdit(s)}>
                        <i className="bi bi-pencil"></i>
                      </button>
                      <button className="btn btn-sm btn-action btn-outline-danger" title="Delete" onClick={() => setDeleteSupplier(s)}>
                        <i className="bi bi-trash"></i>
                      </button>
                    </td>
                    <td>
                      <span className={`badge badge-${s.status === 'active' ? 'active' : 'inactive'}`}>
                        {s.status === 'active' ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filtered.length > 0 && (
            <Pagination total={filtered.length} page={page} perPage={perPage}
              onPageChange={setPage} onPerPageChange={v => { setPerPage(v); setPage(1) }} />
          )}
        </div>
      </div>

      {/* Create/Edit Modal */}
      {showModal && (<>
        <div className="modal-backdrop fade show"></div>
        <div className="modal fade show d-block" tabIndex="-1">
          <div className="modal-dialog modal-lg modal-dialog-scrollable">
            <div className="modal-content border-0 shadow">
              <div className="modal-header text-white" style={{ background: 'linear-gradient(135deg, #2563eb, #1e40af)' }}>
                <h5 className="modal-title">
                  <i className={`bi ${editingSupplier ? 'bi-pencil' : 'bi-plus-circle'} me-2`}></i>
                  {editingSupplier ? 'Edit Supplier' : 'Add New Supplier'}
                </h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowModal(false)}></button>
              </div>
              <form onSubmit={handleSave}>
                <div className="modal-body">
                  <h6 className="fw-semibold text-muted mb-3"><i className="bi bi-building me-2"></i>Supplier Information</h6>
                  <div className="row g-3 mb-4">
                    <div className="col-md-6">
                      <label className="form-label">Supplier Name <span className="text-danger">*</span></label>
                      <input type="text" className="form-control" value={form.supplier_name} onChange={e => setForm({ ...form, supplier_name: e.target.value })} required />
                    </div>
                    <div className="col-md-3">
                      <label className="form-label">Supplier Code</label>
                      <input type="text" className="form-control" value={form.customer_code} onChange={e => setForm({ ...form, customer_code: e.target.value })} />
                    </div>
                    <div className="col-md-3">
                      <label className="form-label">Status</label>
                      <select className="form-select" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Type</label>
                      <input type="text" className="form-control" value={form.supplier_type} onChange={e => setForm({ ...form, supplier_type: e.target.value })} placeholder="e.g. supplier, manufacturer" />
                    </div>
                  </div>

                  <h6 className="fw-semibold text-muted mb-3"><i className="bi bi-telephone me-2"></i>Contact Information</h6>
                  <div className="row g-3 mb-4">
                    <div className="col-md-4">
                      <label className="form-label">Contact Name</label>
                      <input type="text" className="form-control" value={form.contact_name} onChange={e => setForm({ ...form, contact_name: e.target.value })} />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Phone</label>
                      <input type="tel" className="form-control" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="(555) 000-0000" />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Email</label>
                      <input type="email" className="form-control" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">City</label>
                      <input type="text" className="form-control" value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">State</label>
                      <input type="text" className="form-control" value={form.state} onChange={e => setForm({ ...form, state: e.target.value })} />
                    </div>
                  </div>

                  <h6 className="fw-semibold text-muted mb-3"><i className="bi bi-file-text me-2"></i>Business Terms</h6>
                  <div className="row g-3 mb-4">
                    <div className="col-md-4">
                      <label className="form-label">Terms</label>
                      <input type="text" className="form-control" value={form.terms} onChange={e => setForm({ ...form, terms: e.target.value })} placeholder="e.g. Net 30" />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">FOB</label>
                      <input type="text" className="form-control" value={form.fob} onChange={e => setForm({ ...form, fob: e.target.value })} />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Ship Via</label>
                      <input type="text" className="form-control" value={form.ship_via} onChange={e => setForm({ ...form, ship_via: e.target.value })} />
                    </div>
                  </div>

                  <h6 className="fw-semibold text-muted mb-3"><i className="bi bi-chat-left-text me-2"></i>Notes</h6>
                  <textarea className="form-control" rows="3" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Additional notes..."></textarea>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-outline-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary">
                    <i className={`bi ${editingSupplier ? 'bi-check-lg' : 'bi-plus-lg'} me-1`}></i>
                    {editingSupplier ? 'Update Supplier' : 'Save Supplier'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </>)}

      {/* View Detail Modal */}
      {viewSupplier && (<>
        <div className="modal-backdrop fade show"></div>
        <div className="modal fade show d-block" tabIndex="-1">
          <div className="modal-dialog modal-lg modal-dialog-scrollable">
            <div className="modal-content border-0 shadow">
              <div className="modal-header text-white" style={{ background: 'linear-gradient(135deg, #2563eb, #1e40af)' }}>
                <h5 className="modal-title"><i className="bi bi-building me-2"></i>{viewSupplier.supplier_name}</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setViewSupplier(null)}></button>
              </div>
              <div className="modal-body">
                <div className="row g-4">
                  <div className="col-md-6">
                    <h6 className="fw-semibold text-muted mb-3"><i className="bi bi-building me-2"></i>Supplier Info</h6>
                    <table className="table table-sm mb-0">
                      <tbody>
                        <tr><td className="text-muted" style={{ width: 140 }}>Name</td><td className="fw-medium">{viewSupplier.supplier_name}</td></tr>
                        <tr><td className="text-muted">Code</td><td>{viewSupplier.customer_code || '-'}</td></tr>
                        <tr><td className="text-muted">Type</td><td>{viewSupplier.supplier_type ? <span className="badge bg-danger-subtle text-danger rounded-pill px-2">{viewSupplier.supplier_type}</span> : '-'}</td></tr>
                        <tr><td className="text-muted">Status</td><td><span className={`badge badge-${viewSupplier.status === 'active' ? 'active' : 'inactive'}`}>{viewSupplier.status === 'active' ? 'Active' : 'Inactive'}</span></td></tr>
                      </tbody>
                    </table>
                  </div>
                  <div className="col-md-6">
                    <h6 className="fw-semibold text-muted mb-3"><i className="bi bi-telephone me-2"></i>Contact</h6>
                    <table className="table table-sm mb-0">
                      <tbody>
                        <tr><td className="text-muted" style={{ width: 140 }}>Contact</td><td>{viewSupplier.contact_name || '-'}</td></tr>
                        <tr><td className="text-muted">Phone</td><td>{viewSupplier.phone || '-'}</td></tr>
                        <tr><td className="text-muted">Email</td><td>{viewSupplier.email ? <a href={`mailto:${viewSupplier.email}`}>{viewSupplier.email}</a> : '-'}</td></tr>
                        <tr><td className="text-muted">Location</td><td>{[viewSupplier.city, viewSupplier.state].filter(Boolean).join(', ') || '-'}</td></tr>
                      </tbody>
                    </table>
                  </div>
                  <div className="col-md-6">
                    <h6 className="fw-semibold text-muted mb-3"><i className="bi bi-file-text me-2"></i>Business Terms</h6>
                    <table className="table table-sm mb-0">
                      <tbody>
                        <tr><td className="text-muted" style={{ width: 140 }}>Terms</td><td>{viewSupplier.terms || '-'}</td></tr>
                        <tr><td className="text-muted">FOB</td><td>{viewSupplier.fob || '-'}</td></tr>
                        <tr><td className="text-muted">Ship Via</td><td>{viewSupplier.ship_via || '-'}</td></tr>
                        <tr><td className="text-muted">Project</td><td>{viewSupplier.project || '-'}</td></tr>
                      </tbody>
                    </table>
                  </div>
                  {viewSupplier.notes && (
                    <div className="col-12">
                      <h6 className="fw-semibold text-muted mb-2"><i className="bi bi-chat-left-text me-2"></i>Notes</h6>
                      <div className="bg-light rounded-3 p-3" style={{ fontSize: '0.85rem' }}>{viewSupplier.notes}</div>
                    </div>
                  )}
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-outline-primary" onClick={() => { openEdit(viewSupplier); setViewSupplier(null) }}>
                  <i className="bi bi-pencil me-1"></i>Edit
                </button>
                <button className="btn btn-outline-secondary" onClick={() => setViewSupplier(null)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      </>)}

      {/* Delete Confirmation Modal */}
      {deleteSupplier && (<>
        <div className="modal-backdrop fade show"></div>
        <div className="modal fade show d-block" tabIndex="-1">
          <div className="modal-dialog">
            <div className="modal-content border-0 shadow">
              <div className="modal-header text-white bg-danger">
                <h5 className="modal-title"><i className="bi bi-trash me-2"></i>Delete Supplier</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setDeleteSupplier(null)}></button>
              </div>
              <div className="modal-body">
                <p>Are you sure you want to permanently delete <strong>{deleteSupplier.supplier_name}</strong>?</p>
              </div>
              <div className="modal-footer">
                <button className="btn btn-outline-secondary" onClick={() => setDeleteSupplier(null)}>Cancel</button>
                <button className="btn btn-danger" onClick={handleDelete}>Delete</button>
              </div>
            </div>
          </div>
        </div>
      </>)}
    </div>
  )
}
