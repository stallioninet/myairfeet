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

export default function PilotCustomers() {
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ total: 0, active: 0, inactive: 0, pilot: 0, activeTypes: 0 })
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('')
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(10)
  const [customerTypes, setCustomerTypes] = useState([])
  const [activateCustomer, setActivateCustomer] = useState(null)
  const typeNameMap = Object.fromEntries(customerTypes.map(t => [t.code, t.name]))

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    setLoading(true)
    try {
      const [data, statsData, typesData] = await Promise.all([
        api.getCustomers('pilot'),
        api.getCustomerStats(),
        api.getCustomerTypes()
      ])
      setCustomers(data || [])
      setStats(statsData || { total: 0, active: 0, inactive: 0, pilot: 0, activeTypes: 0 })
      if (typesData && typesData.length > 0) setCustomerTypes(typesData)
    } catch (err) {
      toast.error('Failed to load pilot customers: ' + err.message)
    }
    setLoading(false)
  }

  async function handleActivate() {
    if (!activateCustomer) return
    try {
      await api.updateCustomer(activateCustomer._id, { status: 'active' })
      toast.success(activateCustomer.company_name + ' activated successfully')
      setActivateCustomer(null)
      fetchData()
    } catch (err) {
      toast.error(err.message)
    }
  }

  // Compute distinct types and states from pilot customers
  const distinctTypes = [...new Set(customers.map(c => c.customer_type).filter(Boolean))]
  const distinctStates = [...new Set(customers.map(c => {
    const addr = (c.addresses || [])[0]
    return addr?.state
  }).filter(Boolean))]

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
              <li className="breadcrumb-item active">Pilot</li>
            </ol>
          </nav>
          <h3 className="mb-0">Pilot Customers</h3>
        </div>
        <div className="d-flex gap-2">
          <Link to="/customers/active" className="btn btn-outline-secondary">
            <i className="bi bi-building me-1"></i> Active
          </Link>
          <Link to="/customers/inactive" className="btn btn-outline-secondary">
            <i className="bi bi-person-x me-1"></i> Inactive
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="row g-3 mb-4">
        {[
          { value: stats.pilot || customers.length, label: 'Pilot Customers', icon: 'bi-rocket-takeoff-fill', bg: '#fff7ed', color: '#f59e0b' },
          { value: distinctTypes.length, label: 'Customer Types', icon: 'bi-tags-fill', bg: '#eff6ff', color: '#2563eb' },
          { value: distinctStates.length, label: 'States', icon: 'bi-geo-alt-fill', bg: '#f5f3ff', color: '#8b5cf6' },
          { value: stats.active, label: 'Active Customers', icon: 'bi-check-circle-fill', bg: '#ecfdf5', color: '#10b981' },
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
              <input type="text" className="form-control form-control-sm ps-5" placeholder="Search pilot customers..." value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
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
        <div className="card-header py-3 border-0" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: '#fff' }}>
          <div className="d-flex justify-content-between align-items-center">
            <h5 className="mb-0"><i className="bi bi-rocket-takeoff me-2"></i>Pilot Program</h5>
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
                <tr><td colSpan="7" className="text-center py-4 text-muted"><i className="bi bi-rocket-takeoff fs-1 d-block mb-2 opacity-25"></i>No pilot customers found</td></tr>
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
                    <button className="btn btn-sm btn-action btn-outline-success me-1" title="Activate"
                      onClick={() => setActivateCustomer(c)}>
                      <i className="bi bi-check-lg"></i>
                    </button>
                    <button className="btn btn-sm btn-action btn-outline-danger" title="Delete" onClick={() => toast('Delete coming soon')}>
                      <i className="bi bi-trash"></i>
                    </button>
                  </td>
                  <td>
                    <span className="badge rounded-pill px-3" style={{ background: '#fff7ed', color: '#d97706', fontWeight: 600 }}>
                      Pilot
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

      {/* Activate Confirmation Modal */}
      {activateCustomer && (<>
        <div className="modal-backdrop fade show"></div>
        <div className="modal fade show d-block" tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow">
              <div className="modal-header text-white" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
                <h5 className="modal-title"><i className="bi bi-check-circle me-2"></i>Activate Customer</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setActivateCustomer(null)}></button>
              </div>
              <div className="modal-body text-center py-4">
                <div className="d-inline-flex align-items-center justify-content-center fw-bold text-white mb-3"
                  style={{ width: 56, height: 56, borderRadius: 14, fontSize: '1.1rem', background: hashColor(activateCustomer.company_name || '') }}>
                  {getInitials(activateCustomer.company_name)}
                </div>
                <h6 className="fw-bold">{activateCustomer.company_name}</h6>
                <p className="text-muted mb-0">Move this customer from Pilot to Active status?</p>
              </div>
              <div className="modal-footer border-0 justify-content-center pb-4">
                <button className="btn btn-light px-4" onClick={() => setActivateCustomer(null)}>Cancel</button>
                <button className="btn btn-success px-4" onClick={handleActivate}>
                  <i className="bi bi-check-lg me-1"></i>Activate
                </button>
              </div>
            </div>
          </div>
        </div>
      </>)}
    </div>
  )
}
