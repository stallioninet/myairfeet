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

const CUSTOMER_TYPES_FALLBACK = [
  { code: 'aafes', name: 'AAFES' }, { code: 'retail_ecom', name: 'CIN Cinergy' },
  { code: 'distributorhealth', name: 'DH Dist-Health' }, { code: 'ehs_user', name: 'EH&S User EHS' },
  { code: 'retailergen', name: 'G Retail-Gen' }, { code: 'gck_golf_courses_kelly_reps', name: 'GCK - Golf Courses Kelly Reps' },
  { code: 'golf', name: 'Golf' }, { code: 'health', name: 'H Health/Med' },
  { code: 'retail_industrial', name: 'IR Retail-Ind' }, { code: 'mil_military_related', name: 'MIL Military related' },
  { code: 'pb_pickleball', name: 'PB PickleBall' }, { code: 'pp', name: 'PP Promo Dist' },
  { code: 'retail_cust', name: 'RC Retail-Cust' }, { code: 'retail_med', name: 'RM Retail-Med' },
  { code: 'distributorsafety', name: 'SD Dist-Safety' }, { code: 'sr_shoe_retailer', name: 'SHR Shoe Retailer' },
  { code: 'salesrep', name: 'SR Sales-Rep' }, { code: 'supplier', name: 'SUP Supplier' },
  { code: 'internet', name: 'WR Retail-Web' },
]

const RELATIONSHIPS = ['Direct', 'Distributor', 'Enterprise', 'Partner', 'Government', 'OEM']

const US_STATES = ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY']

const emptyForm = {
  company_name: '', customer_type: '', relationship: '', contact_name: '',
  phone: '', extension: '', fax: '', email: '', website: '', customer_code: '',
  notes: '', terms: '', fob: '', ship: '', ship_via: '', project: '',
  address: '', city: '', state: '', zip: '', sales_rep: '', status: 'active'
}

export default function ActiveCustomers() {
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ total: 0, active: 0, inactive: 0, activeTypes: 0 })
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('')
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(10)
  const [showModal, setShowModal] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState(null)
  const [form, setForm] = useState({ ...emptyForm })
  const [deactivateCustomer, setDeactivateCustomer] = useState(null)
  const [deleteCustomer, setDeleteCustomer] = useState(null)
  const [viewCustomer, setViewCustomer] = useState(null)
  const [customerTypes, setCustomerTypes] = useState(CUSTOMER_TYPES_FALLBACK)
  const typeNameMap = Object.fromEntries(customerTypes.map(t => [t.code, t.name]))

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    setLoading(true)
    try {
      const [data, statsData, typesData] = await Promise.all([
        api.getCustomers('active'),
        api.getCustomerStats(),
        api.getCustomerTypes()
      ])
      setCustomers(data || [])
      setStats(statsData || { total: 0, active: 0, inactive: 0, activeTypes: 0 })
      if (typesData && typesData.length > 0) setCustomerTypes(typesData)
    } catch (err) {
      toast.error('Failed to load customers: ' + err.message)
    }
    setLoading(false)
  }

  function openCreate() {
    setEditingCustomer(null)
    setForm({ ...emptyForm })
    setShowModal(true)
  }

  function openEdit(cust) {
    setEditingCustomer(cust)
    setForm({
      company_name: cust.company_name || '',
      customer_type: cust.customer_type || '',
      relationship: cust.relationship || '',
      contact_name: cust.contact_name || '',
      phone: cust.phone || '',
      extension: cust.extension || '',
      fax: cust.fax || '',
      email: cust.email || '',
      website: cust.website || '',
      customer_code: cust.customer_code || '',
      notes: cust.notes || '',
      terms: cust.terms || '',
      fob: cust.fob || '',
      ship: cust.ship || '',
      ship_via: cust.ship_via || '',
      project: cust.project || '',
      address: cust.address || '',
      city: cust.city || '',
      state: cust.state || '',
      zip: cust.zip || '',
      sales_rep: cust.sales_rep || '',
      status: cust.status || 'active',
    })
    setShowModal(true)
  }

  function validatePhone(phone) {
    if (!phone) return true
    const cleaned = phone.replace(/[\s\-\(\)\.]/g, '')
    return /^\+?\d{7,15}$/.test(cleaned)
  }

  async function handleSave(e) {
    e.preventDefault()
    if (!form.company_name.trim()) { toast.error('Company name is required'); return }

    // Phone validation
    if (form.company_phone && !validatePhone(form.company_phone)) {
      toast.error('Invalid phone number format'); return
    }

    // Email validation
    if (form.company_email_address && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.company_email_address)) {
      toast.error('Invalid email address format'); return
    }

    // Uniqueness check
    try {
      const unique = await api.checkUniqueCustomer(form.company_name.trim(), editingCustomer?._id)
      if (!unique.unique) {
        toast.error(`Company name "${form.company_name}" already exists`); return
      }
    } catch {}

    try {
      if (editingCustomer) {
        await api.updateCustomer(editingCustomer._id, form)
        toast.success('Customer updated')
      } else {
        await api.createCustomer(form)
        toast.success('Customer created')
      }
      setShowModal(false)
      fetchData()
    } catch (err) {
      toast.error(err.message)
    }
  }

  async function handleDeactivate() {
    if (!deactivateCustomer) return
    try {
      await api.deactivateCustomer(deactivateCustomer._id)
      toast.success(deactivateCustomer.company_name + ' deactivated')
      setDeactivateCustomer(null)
      fetchData()
    } catch (err) {
      toast.error(err.message)
    }
  }

  async function handleDelete() {
    if (!deleteCustomer) return
    try {
      await api.deleteCustomer(deleteCustomer._id)
      toast.success(deleteCustomer.company_name + ' deleted')
      setDeleteCustomer(null)
      fetchData()
    } catch (err) {
      toast.error(err.message)
    }
  }

  const filtered = customers.filter(c => {
    const matchSearch = !search || c.company_name?.toLowerCase().includes(search.toLowerCase()) ||
      c.email?.toLowerCase().includes(search.toLowerCase()) ||
      c.phone?.toLowerCase().includes(search.toLowerCase()) ||
      c.customer_code?.toLowerCase().includes(search.toLowerCase()) ||
      c.contact_name?.toLowerCase().includes(search.toLowerCase())
    const matchType = !filterType || c.customer_type === filterType
    return matchSearch && matchType
  })
  const paginated = filtered.slice((page - 1) * perPage, page * perPage)

  return (
    <div>
      {/* Page Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <nav aria-label="breadcrumb">
            <ol className="breadcrumb mb-1">
              <li className="breadcrumb-item"><Link to="/dashboard"><i className="bi bi-house-door"></i></Link></li>
              <li className="breadcrumb-item">Customers</li>
              <li className="breadcrumb-item active">Active List</li>
            </ol>
          </nav>
          <h3 className="mb-0">Active Customers</h3>
        </div>
        <div className="d-flex gap-2">
          <Link to="/customers/inactive" className="btn btn-outline-secondary">
            <i className="bi bi-person-x me-1"></i> Inactive
          </Link>
          <button className="btn btn-primary" onClick={openCreate}>
            <i className="bi bi-plus-lg me-1"></i> Add Customer
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="row g-3 mb-4">
        {[
          { value: stats.total, label: 'Total Customers', icon: 'bi-building-fill', bg: '#eff6ff', color: '#2563eb' },
          { value: stats.active, label: 'Active', icon: 'bi-check-circle-fill', bg: '#ecfdf5', color: '#10b981' },
          { value: stats.inactive, label: 'Inactive', icon: 'bi-x-circle-fill', bg: '#fef2f2', color: '#ef4444' },
          { value: stats.activeTypes, label: 'Customer Types', icon: 'bi-tags-fill', bg: '#f5f3ff', color: '#8b5cf6' },
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

      {/* Filters */}
      <div className="card border-0 shadow-sm rounded-4 mb-3">
        <div className="card-body py-3 px-4">
          <div className="d-flex flex-wrap align-items-center gap-3">
            <div className="position-relative flex-grow-1" style={{ maxWidth: 320 }}>
              <i className="bi bi-search position-absolute" style={{ left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}></i>
              <input type="text" className="form-control form-control-sm ps-5" placeholder="Search customers..." value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
            </div>
            <select className="form-select form-select-sm" style={{ width: 'auto', minWidth: 160 }} value={filterType} onChange={e => { setFilterType(e.target.value); setPage(1) }}>
              <option value="">All Types</option>
              {customerTypes.map(t => <option key={t.code} value={t.code}>{t.name}</option>)}
            </select>
            {(search || filterType) && (
              <button className="btn btn-sm btn-outline-secondary" onClick={() => { setSearch(''); setFilterType(''); setPage(1) }}>
                <i className="bi bi-x-lg me-1"></i>Clear
              </button>
            )}
            <span className="text-muted small ms-auto">{filtered.length} customer{filtered.length !== 1 ? 's' : ''}</span>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
        <div className="card-header py-3 border-0" style={{ background: 'linear-gradient(135deg, #2563eb, #1e40af)', color: '#fff' }}>
          <div className="d-flex justify-content-between align-items-center">
            <h5 className="mb-0"><i className="bi bi-building me-2"></i>Customer List</h5>
            <span className="badge bg-white bg-opacity-25 px-3 py-2">{filtered.length} customers</span>
          </div>
        </div>
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="bg-light">
              <tr>
                <th className="ps-4" style={{ width: 80 }}>Cust #</th>
                <th>Customer</th>
                <th>Contact</th>
                <th>Phone</th>
                <th>Type</th>
                <th className="pe-4 text-center" style={{ width: 140 }}>Action</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="7" className="text-center py-4"><div className="spinner-border spinner-border-sm text-primary"></div> Loading...</td></tr>
              ) : paginated.length === 0 ? (
                <tr><td colSpan="7" className="text-center py-4 text-muted">No customers found</td></tr>
              ) : paginated.map((c, i) => (
                <tr key={c._id}>
                  <td className="ps-4 fw-semibold">{c.customer_code || '-'}</td>
                  <td>
                    <div className="d-flex align-items-center gap-3">
                      <div className="rounded-circle d-flex align-items-center justify-content-center fw-bold text-white"
                        style={{ width: 32, height: 32, fontSize: '0.75rem', background: hashColor(c.company_name || '') }}>
                        {getInitials(c.company_name)}
                      </div>
                      <div>
                        <div className="fw-semibold">{c.company_name}</div>
                        {c.email && <span className="text-muted" style={{ fontSize: '0.75rem' }}>{c.email}</span>}
                      </div>
                    </div>
                  </td>
                  <td><span className="small">{c.contact_name || '-'}</span></td>
                  <td><span className="small">{c.phone || '-'}</span></td>
                  <td>
                    {c.customer_type && <span className="badge bg-primary-subtle text-primary rounded-pill px-2">{typeNameMap[c.customer_type] || c.customer_type}</span>}
                  </td>
                  <td className="pe-4 text-center">
                    <Link to={'/customers/' + c._id} className="btn btn-sm btn-action btn-outline-info me-1" title="View">
                      <i className="bi bi-eye"></i>
                    </Link>
                    <button className="btn btn-sm btn-action btn-outline-warning me-1" title="Deactivate" onClick={() => setDeactivateCustomer(c)}>
                      <i className="bi bi-pause-circle"></i>
                    </button>
                    <button className="btn btn-sm btn-action btn-outline-danger" title="Delete" onClick={() => setDeleteCustomer(c)}>
                      <i className="bi bi-trash"></i>
                    </button>
                  </td>
                  <td>
                    <span className={`badge rounded-pill px-3 ${c.status === 'active' ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger'}`}>
                      {c.status === 'active' ? 'Active' : 'Inactive'}
                    </span>
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
        <div className="modal fade show d-block" tabIndex="-1" style={{ overflow: 'auto' }}>
          <div className="modal-dialog modal-lg modal-dialog-scrollable" style={{ maxHeight: '90vh', margin: '1.75rem auto' }}>
            <div className="modal-content border-0 shadow" style={{ maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
              <div className="modal-header text-white" style={{ background: 'linear-gradient(135deg, #2563eb, #1e40af)', flexShrink: 0 }}>
                <h5 className="modal-title">
                  <i className={`bi ${editingCustomer ? 'bi-pencil' : 'bi-plus-circle'} me-2`}></i>
                  {editingCustomer ? 'Edit Customer' : 'Add New Customer'}
                </h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowModal(false)}></button>
              </div>
              <form onSubmit={handleSave} style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <div className="modal-body" style={{ overflowY: 'auto', flex: 1 }}>
                  {/* Company Info */}
                  <h6 className="fw-semibold text-muted mb-3"><i className="bi bi-building me-2"></i>Company Information</h6>
                  <div className="row g-3 mb-4">
                    <div className="col-md-6">
                      <label className="form-label">Company Name <span className="text-danger">*</span></label>
                      <input type="text" className="form-control" value={form.company_name} onChange={e => setForm({ ...form, company_name: e.target.value })} required />
                    </div>
                    <div className="col-md-3">
                      <label className="form-label">Cust Code</label>
                      <input type="text" className="form-control" value={form.customer_code} onChange={e => setForm({ ...form, customer_code: e.target.value })} placeholder="e.g. AAFES-100" />
                    </div>
                    <div className="col-md-3">
                      <label className="form-label">Status</label>
                      <select className="form-select" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Customer Type</label>
                      <select className="form-select" value={form.customer_type} onChange={e => setForm({ ...form, customer_type: e.target.value })}>
                        <option value="">Select Type</option>
                        {customerTypes.map(t => <option key={t.code} value={t.code}>{t.name}</option>)}
                      </select>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Relationship</label>
                      <select className="form-select" value={form.relationship} onChange={e => setForm({ ...form, relationship: e.target.value })}>
                        <option value="">Select Relationship</option>
                        {RELATIONSHIPS.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* Contact Info */}
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
                      <label className="form-label">Fax</label>
                      <input type="tel" className="form-control" value={form.fax} onChange={e => setForm({ ...form, fax: e.target.value })} placeholder="(555) 000-0000" />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Email</label>
                      <input type="email" className="form-control" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="email@company.com" />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Website</label>
                      <input type="url" className="form-control" value={form.website} onChange={e => setForm({ ...form, website: e.target.value })} placeholder="https://www.example.com" />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Sales Rep</label>
                      <input type="text" className="form-control" value={form.sales_rep} onChange={e => setForm({ ...form, sales_rep: e.target.value })} />
                    </div>
                  </div>

                  {/* Address */}
                  <h6 className="fw-semibold text-muted mb-3"><i className="bi bi-geo-alt me-2"></i>Address</h6>
                  <div className="row g-3 mb-4">
                    <div className="col-md-6">
                      <label className="form-label">Street Address</label>
                      <input type="text" className="form-control" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
                    </div>
                    <div className="col-md-2">
                      <label className="form-label">City</label>
                      <input type="text" className="form-control" value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} />
                    </div>
                    <div className="col-md-2">
                      <label className="form-label">State</label>
                      <select className="form-select" value={form.state} onChange={e => setForm({ ...form, state: e.target.value })}>
                        <option value="">State</option>
                        {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div className="col-md-2">
                      <label className="form-label">Zip</label>
                      <input type="text" className="form-control" value={form.zip} onChange={e => setForm({ ...form, zip: e.target.value })} />
                    </div>
                  </div>

                  {/* Business Terms */}
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
                    <div className="col-md-4">
                      <label className="form-label">Project</label>
                      <input type="text" className="form-control" value={form.project} onChange={e => setForm({ ...form, project: e.target.value })} />
                    </div>
                  </div>

                  {/* Notes */}
                  <h6 className="fw-semibold text-muted mb-3"><i className="bi bi-chat-left-text me-2"></i>Notes</h6>
                  <textarea className="form-control" rows="3" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Additional notes..."></textarea>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-outline-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary">
                    <i className={`bi ${editingCustomer ? 'bi-check-lg' : 'bi-plus-lg'} me-1`}></i>
                    {editingCustomer ? 'Update Customer' : 'Save Customer'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </>)}

      {/* Deactivate Confirmation Modal */}
      {deactivateCustomer && (<>
        <div className="modal-backdrop fade show"></div>
        <div className="modal fade show d-block" tabIndex="-1">
          <div className="modal-dialog">
            <div className="modal-content border-0 shadow">
              <div className="modal-header text-white" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
                <h5 className="modal-title"><i className="bi bi-exclamation-triangle me-2"></i>Deactivate Customer</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setDeactivateCustomer(null)}></button>
              </div>
              <div className="modal-body">
                <p>Are you sure you want to deactivate <strong>{deactivateCustomer.company_name}</strong>?</p>
              </div>
              <div className="modal-footer">
                <button className="btn btn-outline-secondary" onClick={() => setDeactivateCustomer(null)}>Cancel</button>
                <button className="btn btn-warning" onClick={handleDeactivate}>Deactivate</button>
              </div>
            </div>
          </div>
        </div>
      </>)}

      {/* View Details Modal */}
      {viewCustomer && (<>
        <div className="modal-backdrop fade show"></div>
        <div className="modal fade show d-block" tabIndex="-1">
          <div className="modal-dialog modal-lg modal-dialog-scrollable">
            <div className="modal-content border-0 shadow">
              <div className="modal-header text-white" style={{ background: 'linear-gradient(135deg, #2563eb, #1e40af)' }}>
                <h5 className="modal-title"><i className="bi bi-building me-2"></i>{viewCustomer.company_name}</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setViewCustomer(null)}></button>
              </div>
              <div className="modal-body">
                <div className="row g-4">
                  <div className="col-md-6">
                    <h6 className="fw-semibold text-muted mb-3"><i className="bi bi-building me-2"></i>Company Information</h6>
                    <table className="table table-sm mb-0">
                      <tbody>
                        <tr><td className="text-muted" style={{ width: 140 }}>Company Name</td><td className="fw-medium">{viewCustomer.company_name}</td></tr>
                        <tr><td className="text-muted">Customer Code</td><td>{viewCustomer.customer_code || '-'}</td></tr>
                        <tr><td className="text-muted">Customer Type</td><td>{viewCustomer.customer_type ? <span className="badge bg-primary-subtle text-primary rounded-pill px-2">{typeNameMap[viewCustomer.customer_type] || viewCustomer.customer_type}</span> : '-'}</td></tr>
                        <tr><td className="text-muted">Relationship</td><td>{viewCustomer.relationship || '-'}</td></tr>
                        <tr><td className="text-muted">Status</td><td><span className={`badge rounded-pill px-3 ${viewCustomer.status === 'active' ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger'}`}>{viewCustomer.status === 'active' ? 'Active' : 'Inactive'}</span></td></tr>
                      </tbody>
                    </table>
                  </div>
                  <div className="col-md-6">
                    <h6 className="fw-semibold text-muted mb-3"><i className="bi bi-telephone me-2"></i>Contact Information</h6>
                    <table className="table table-sm mb-0">
                      <tbody>
                        <tr><td className="text-muted" style={{ width: 140 }}>Contact Name</td><td>{viewCustomer.contact_name || '-'}</td></tr>
                        <tr><td className="text-muted">Phone</td><td>{viewCustomer.phone || '-'}</td></tr>
                        <tr><td className="text-muted">Fax</td><td>{viewCustomer.fax || '-'}</td></tr>
                        <tr><td className="text-muted">Email</td><td>{viewCustomer.email ? <a href={`mailto:${viewCustomer.email}`}>{viewCustomer.email}</a> : '-'}</td></tr>
                        <tr><td className="text-muted">Website</td><td>{viewCustomer.website || '-'}</td></tr>
                        <tr><td className="text-muted">Sales Rep</td><td>{viewCustomer.sales_rep || '-'}</td></tr>
                      </tbody>
                    </table>
                  </div>
                  <div className="col-md-6">
                    <h6 className="fw-semibold text-muted mb-3"><i className="bi bi-geo-alt me-2"></i>Address</h6>
                    <table className="table table-sm mb-0">
                      <tbody>
                        <tr><td className="text-muted" style={{ width: 140 }}>Street</td><td>{viewCustomer.address || '-'}</td></tr>
                        <tr><td className="text-muted">City</td><td>{viewCustomer.city || '-'}</td></tr>
                        <tr><td className="text-muted">State</td><td>{viewCustomer.state || '-'}</td></tr>
                        <tr><td className="text-muted">Zip</td><td>{viewCustomer.zip || '-'}</td></tr>
                      </tbody>
                    </table>
                  </div>
                  <div className="col-md-6">
                    <h6 className="fw-semibold text-muted mb-3"><i className="bi bi-file-text me-2"></i>Business Terms</h6>
                    <table className="table table-sm mb-0">
                      <tbody>
                        <tr><td className="text-muted" style={{ width: 140 }}>Terms</td><td>{viewCustomer.terms || '-'}</td></tr>
                        <tr><td className="text-muted">FOB</td><td>{viewCustomer.fob || '-'}</td></tr>
                        <tr><td className="text-muted">Ship Via</td><td>{viewCustomer.ship_via || '-'}</td></tr>
                        <tr><td className="text-muted">Project</td><td>{viewCustomer.project || '-'}</td></tr>
                      </tbody>
                    </table>
                  </div>
                  {viewCustomer.notes && (
                    <div className="col-12">
                      <h6 className="fw-semibold text-muted mb-2"><i className="bi bi-chat-left-text me-2"></i>Notes</h6>
                      <div className="bg-light rounded-3 p-3" style={{ fontSize: '0.85rem' }}>{viewCustomer.notes}</div>
                    </div>
                  )}
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-outline-primary" onClick={() => { openEdit(viewCustomer); setViewCustomer(null) }}>
                  <i className="bi bi-pencil me-1"></i>Edit
                </button>
                <button className="btn btn-outline-secondary" onClick={() => setViewCustomer(null)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      </>)}

      {/* Delete Confirmation Modal */}
      {deleteCustomer && (<>
        <div className="modal-backdrop fade show"></div>
        <div className="modal fade show d-block" tabIndex="-1">
          <div className="modal-dialog">
            <div className="modal-content border-0 shadow">
              <div className="modal-header text-white bg-danger">
                <h5 className="modal-title"><i className="bi bi-trash me-2"></i>Delete Customer</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setDeleteCustomer(null)}></button>
              </div>
              <div className="modal-body">
                <p>Are you sure you want to permanently delete <strong>{deleteCustomer.company_name}</strong>?</p>
              </div>
              <div className="modal-footer">
                <button className="btn btn-outline-secondary" onClick={() => setDeleteCustomer(null)}>Cancel</button>
                <button className="btn btn-danger" onClick={handleDelete}>Delete</button>
              </div>
            </div>
          </div>
        </div>
      </>)}
    </div>
  )
}
