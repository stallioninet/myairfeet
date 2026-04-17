import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { api } from '../../lib/api'
import { isSalesRepUser, getStoredUser, resolveRepId } from '../../lib/repAuth'
import Pagination from '../../components/Pagination'
import PageChartHeader from '../../components/PageChartHeader'
import SlidePanel from '../../components/SlidePanel'
import CustomerDetailView from '../../components/CustomerDetailView'

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
  const [_user] = useState(() => getStoredUser())
  const isSalesRep = isSalesRepUser(_user)
  const repIdRef = useRef(null)
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState([])
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
  const [panelOpen, setPanelOpen] = useState(false)
  const [selectedCustId, setSelectedCustId] = useState(null)
  const [chartData, setChartData] = useState(null)
  const [topBuyers, setTopBuyers] = useState([])
  const typeNameMap = Object.fromEntries(customerTypes.map(t => [t.code, t.name]))

  useEffect(() => {
    if (!isSalesRep) { fetchData(); return }
    resolveRepId(_user.email).then(id => { repIdRef.current = id ?? null; fetchData() })
  }, [])

  async function fetchData() {
    setLoading(true)
    try {
      const custParams = { status: 'active' }
      if (isSalesRep && repIdRef.current) custParams.rep_id = repIdRef.current
      const statsParams = isSalesRep && repIdRef.current ? { rep_id: repIdRef.current } : {}
      const [data, statsData, typesData] = await Promise.all([
        api.getCustomers(custParams),
        api.getCustomerStats(statsParams),
        api.getCustomerTypes()
      ])
      setCustomers(data || [])
      const s = statsData || { total: 0, active: 0, inactive: 0, pilot: 0, distribution: {}, topBuyers: [] }
      
      setStats([
        { label: 'Active Customers', value: s.active, icon: 'bi-people', color: '#2563eb', bg: '#eff6ff' },
        { label: 'Medical Sector', value: s.distribution?.Medical || 0, icon: 'bi-heart-pulse', color: '#7c3aed', bg: '#f5f3ff' },
        { label: 'Pilot Accounts', value: s.pilot || 0, icon: 'bi-star', color: '#ea580c', bg: '#fff7ed' },
        { label: 'Distributors', value: s.distribution?.Distributor || 0, icon: 'bi-truck', color: '#16a34a', bg: '#f0fdf4' },
      ])

      setTopBuyers(s.topBuyers || [])

      // Process chart data
      const dist = s.distribution || {}
      const labels = Object.keys(dist)
      const values = Object.values(dist)

      if (labels.length > 0) {
        setChartData({
          labels: labels,
          datasets: [{
            label: 'Customer Distribution',
            data: values,
            backgroundColor: ['#2563eb', '#7c3aed', '#16a34a', '#ea580c', '#3b82f6', '#10b981'],
            borderWidth: 0,
            hoverOffset: 4
          }]
        })
      } else {
        setChartData({
          labels: ['No Data'],
          datasets: [{
            label: 'No Data',
            data: [0],
            backgroundColor: ['#e2e8f0'],
            borderWidth: 0
          }]
        })
      }

      if (typesData && typesData.length > 0) setCustomerTypes(typesData)
    } catch (error) {
      console.error('Fetch error:', error)
      toast.error('Failed to load customer analytics')
      setStats([
        { label: 'Active Customers', value: 0, icon: 'bi-people', color: '#2563eb', bg: '#eff6ff' },
        { label: 'Medical Sector', value: 0, icon: 'bi-heart-pulse', color: '#7c3aed', bg: '#f5f3ff' },
        { label: 'Pilot Accounts', value: 0, icon: 'bi-star', color: '#ea580c', bg: '#fff7ed' },
        { label: 'Distributors', value: 0, icon: 'bi-truck', color: '#16a34a', bg: '#f0fdf4' },
      ])
      setChartData({
        labels: ['Error'],
        datasets: [{ data: [0], backgroundColor: ['#ef4444'] }]
      })
    } finally {
      setLoading(false)
    }
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

    if (form.phone && !validatePhone(form.phone)) {
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
      <PageChartHeader
        title="Active Customers"
        subtitle="Manage and analyze your active customer relationships"
        breadcrumbs={[
          { label: 'Dashboard', link: '/dashboard' },
          { label: 'Customers' }
        ]}
        stats={stats}
        chartData={chartData}
        chartType="bar"
        actions={
          !isSalesRep && (
            <button className="btn btn-primary rounded-pill px-4" onClick={openCreate}>
              <i className="bi bi-person-plus me-2"></i>Add Customer
            </button>
          )
        }
        extraContent={
          <div className="card border-0 shadow-sm h-100" style={{ borderRadius: 20 }}>
            <div className="card-body p-3">
              <h6 className="fw-bold mb-3 d-flex align-items-center">
                <i className="bi bi-trophy text-warning me-2"></i> Top 10 Buyers
              </h6>
              <div className="list-group list-group-flush" style={{ maxHeight: 200, overflowY: 'auto' }}>
                {topBuyers.map((buyer, idx) => (
                  <div key={idx} className="list-group-item px-0 py-2 border-0 border-bottom">
                    <div className="d-flex align-items-center gap-2">
                      <div className="d-flex align-items-center justify-content-center rounded-circle fw-bold text-white flex-shrink-0"
                        style={{ width: 24, height: 24, fontSize: '0.65rem', background: avatarColors[idx % avatarColors.length] }}>
                        {idx + 1}
                      </div>
                      <div className="text-truncate flex-grow-1">
                        <div className="fw-semibold text-dark text-truncate" style={{ fontSize: '0.78rem' }}>{buyer.company_name}</div>
                      </div>
                      <div className="text-end flex-shrink-0">
                        <div className="fw-bold text-primary" style={{ fontSize: '0.75rem' }}>${Number(buyer.totalSales).toLocaleString()}</div>
                        <div className="text-muted" style={{ fontSize: '0.6rem' }}>{buyer.orderCount} orders</div>
                      </div>
                    </div>
                  </div>
                ))}
                {topBuyers.length === 0 && (
                  <div className="text-center text-muted py-4 small fst-italic">No sales data available</div>
                )}
              </div>
            </div>
          </div>
        }
      />

      <div className="row g-4 mb-4">
        {/* Main Content Area - Full Width */}
        <div className="col-12">
          <div className="card border-0 shadow-sm" style={{ borderRadius: 16 }}>
            <div className="card-header bg-white border-0 py-3 d-flex justify-content-between align-items-center">
              <h5 className="mb-0 fw-bold">Customer Directory</h5>
              <div className="d-flex gap-2">
                <div className="input-group input-group-sm" style={{ width: 250 }}>
                  <span className="input-group-text bg-light border-end-0"><i className="bi bi-search"></i></span>
                  <input type="text" className="form-control bg-light border-start-0" placeholder="Search customers..." value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <select className="form-select form-select-sm" style={{ width: 150 }} value={filterType} onChange={e => setFilterType(e.target.value)}>
                  <option value="">All Types</option>
                  {customerTypes.map(t => (
                    <option key={t._id || t.code} value={t.code}>{t.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0" style={{ tableLayout: 'fixed' }}>
                <thead className="bg-light">
                  <tr>
                    <th className="ps-4" style={{ width: 80 }}>Cust #</th>
                    <th style={{ width: '30%' }}>Customer</th>
                    <th style={{ width: '14%' }}>Contact</th>
                    <th style={{ width: '12%' }}>Phone</th>
                    <th style={{ width: '12%' }}>Type</th>
                    <th className="pe-4 text-center" style={{ width: 130 }}>Action</th>
                    <th style={{ width: 90 }}>Status</th>
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
                        <div className="d-flex align-items-center gap-2" style={{ minWidth: 0 }}>
                          <div className="rounded-circle d-flex align-items-center justify-content-center fw-bold text-white flex-shrink-0"
                            style={{ width: 32, height: 32, fontSize: '0.75rem', background: hashColor(c.company_name || '') }}>
                            {getInitials(c.company_name)}
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div className="fw-semibold text-truncate">{c.company_name}</div>
                            {c.email && <div className="text-muted text-truncate" style={{ fontSize: '0.75rem' }}>{c.email}</div>}
                          </div>
                        </div>
                      </td>
                      <td><span className="small">{c.contact_name || '-'}</span></td>
                      <td><span className="small">{c.phone || '-'}</span></td>
                      <td>
                        {c.customer_type && <span className="badge bg-primary-subtle text-primary rounded-pill px-2">{typeNameMap[c.customer_type] || c.customer_type}</span>}
                      </td>
                      <td className="pe-4 text-center">
                        <button className="btn btn-sm btn-action btn-outline-info me-1" title="View" onClick={() => { setSelectedCustId(c._id); setPanelOpen(true) }}>
                          <i className="bi bi-eye"></i>
                        </button>
                        {!isSalesRep && <>
                          <button className="btn btn-sm btn-action btn-outline-warning me-1" title="Deactivate" onClick={() => setDeactivateCustomer(c)}>
                            <i className="bi bi-pause-circle"></i>
                          </button>
                          <button className="btn btn-sm btn-action btn-outline-danger" title="Delete" onClick={() => setDeleteCustomer(c)}>
                            <i className="bi bi-trash"></i>
                          </button>
                        </>}
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
          </div>
          <div className="mt-3">
             <Pagination total={filtered.length} page={page} perPage={perPage} onPageChange={setPage} onPerPageChange={v => { setPerPage(v); setPage(1) }} />
          </div>
        </div>

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

      {/* Customer Detail Panel */}
      <SlidePanel
        isOpen={panelOpen}
        onClose={() => setPanelOpen(false)}
        title="Customer Details"
        subtitle="Full profile and history"
        width="1100px"
      >
        {selectedCustId && <CustomerDetailView id={selectedCustId} />}
      </SlidePanel>
    </div>
  )
}
