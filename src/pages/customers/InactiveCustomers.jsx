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

export default function InactiveCustomers() {
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ total: 0, active: 0, inactive: 0 })
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(10)
  const [activateCustomer, setActivateCustomer] = useState(null)
  const [deleteCustomer, setDeleteCustomer] = useState(null)
  const [typeNameMap, setTypeNameMap] = useState({})

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    setLoading(true)
    try {
      const [data, statsData, typesData] = await Promise.all([
        api.getCustomers('inactive'),
        api.getCustomerStats(),
        api.getCustomerTypes()
      ])
      setCustomers(data || [])
      setStats(statsData || { total: 0, active: 0, inactive: 0 })
      if (typesData && typesData.length > 0) {
        setTypeNameMap(Object.fromEntries(typesData.map(t => [t.code, t.name])))
      }
    } catch (err) {
      toast.error('Failed to load customers: ' + err.message)
    }
    setLoading(false)
  }

  async function handleActivate() {
    if (!activateCustomer) return
    try {
      await api.activateCustomer(activateCustomer._id)
      toast.success(activateCustomer.company_name + ' activated')
      setActivateCustomer(null)
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
    if (!search) return true
    const s = search.toLowerCase()
    return c.company_name?.toLowerCase().includes(s) || c.email?.toLowerCase().includes(s) ||
      c.phone?.toLowerCase().includes(s) || c.customer_code?.toLowerCase().includes(s)
  })
  const paginated = filtered.slice((page - 1) * perPage, page * perPage)

  return (
    <div>
      <div className="d-flex justify-content-between align-items-start mb-4 flex-wrap gap-2">
        <div>
          <nav aria-label="breadcrumb">
            <ol className="breadcrumb mb-1">
              <li className="breadcrumb-item"><Link to="/dashboard">Home</Link></li>
              <li className="breadcrumb-item">Customers</li>
              <li className="breadcrumb-item active">Inactive List</li>
            </ol>
          </nav>
          <h3 className="fw-bold mb-0">Inactive Customers</h3>
        </div>
        <Link to="/customers/active" className="btn btn-primary px-4">
          <i className="bi bi-arrow-left me-1"></i> Active Customers
        </Link>
      </div>

      {/* Stat Cards */}
      <div className="row g-3 mb-4">
        {[
          { value: stats.total, label: 'Total Customers', icon: 'bi-building-fill', bg: '#eff6ff', color: '#2563eb' },
          { value: stats.active, label: 'Active', icon: 'bi-check-circle-fill', bg: '#ecfdf5', color: '#10b981' },
          { value: stats.inactive, label: 'Inactive', icon: 'bi-x-circle-fill', bg: '#fef2f2', color: '#ef4444' },
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

      {/* Search */}
      <div className="card border-0 shadow-sm rounded-4 mb-3">
        <div className="card-body py-3 px-4">
          <div className="d-flex align-items-center gap-3">
            <div className="position-relative flex-grow-1" style={{ maxWidth: 320 }}>
              <i className="bi bi-search position-absolute" style={{ left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}></i>
              <input type="text" className="form-control form-control-sm ps-5" placeholder="Search inactive customers..." value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
            </div>
            <span className="text-muted small ms-auto">{filtered.length} customer{filtered.length !== 1 ? 's' : ''}</span>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
        <div className="card-header py-3 border-0" style={{ background: 'linear-gradient(135deg, #6b7280, #4b5563)', color: '#fff' }}>
          <div className="d-flex justify-content-between align-items-center">
            <h5 className="mb-0"><i className="bi bi-building me-2"></i>Inactive Customer List</h5>
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
                <tr><td colSpan="7" className="text-center py-4 text-muted">No inactive customers found</td></tr>
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
                  <td>{c.customer_type && <span className="badge bg-secondary-subtle text-secondary rounded-pill px-2">{typeNameMap[c.customer_type] || c.customer_type}</span>}</td>
                  <td className="pe-4 text-center">
                    <button className="btn btn-sm btn-action btn-outline-success me-1" title="Activate" onClick={() => setActivateCustomer(c)}>
                      <i className="bi bi-play-circle"></i>
                    </button>
                    <button className="btn btn-sm btn-action btn-outline-danger" title="Delete" onClick={() => setDeleteCustomer(c)}>
                      <i className="bi bi-trash"></i>
                    </button>
                  </td>
                  <td><span className="badge bg-danger-subtle text-danger rounded-pill px-3">Inactive</span></td>
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

      {/* Activate Modal */}
      {activateCustomer && (<>
        <div className="modal-backdrop fade show"></div>
        <div className="modal fade show d-block" tabIndex="-1">
          <div className="modal-dialog">
            <div className="modal-content border-0 shadow">
              <div className="modal-header text-white" style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)' }}>
                <h5 className="modal-title"><i className="bi bi-play-circle me-2"></i>Activate Customer</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setActivateCustomer(null)}></button>
              </div>
              <div className="modal-body">
                <p>Are you sure you want to activate <strong>{activateCustomer.company_name}</strong>?</p>
              </div>
              <div className="modal-footer">
                <button className="btn btn-outline-secondary" onClick={() => setActivateCustomer(null)}>Cancel</button>
                <button className="btn btn-success" onClick={handleActivate}>Activate</button>
              </div>
            </div>
          </div>
        </div>
      </>)}

      {/* Delete Modal */}
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
