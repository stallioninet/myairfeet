import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { api } from '../../lib/api'
import Pagination from '../../components/Pagination'
import exportCSV from '../../lib/exportCSV'

const avatarColors = [
  'linear-gradient(135deg, #3b82f6, #2563eb)',
  'linear-gradient(135deg, #10b981, #059669)',
  'linear-gradient(135deg, #8b5cf6, #7c3aed)',
  'linear-gradient(135deg, #f59e0b, #d97706)',
  'linear-gradient(135deg, #ec4899, #db2777)',
  'linear-gradient(135deg, #14b8a6, #0d9488)',
  'linear-gradient(135deg, #6366f1, #4f46e5)',
  'linear-gradient(135deg, #f43f5e, #e11d48)',
]

export default function InactiveSalesReps() {
  const [reps, setReps] = useState([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ total: 0, active: 0, inactive: 0 })
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(10)
  const [reactivateRep, setReactivateRep] = useState(null)

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    setLoading(true)
    try {
      const [data, statsData] = await Promise.all([
        api.getSalesReps('inactive'),
        api.getSalesRepStats()
      ])
      setReps(data || [])
      setStats(statsData || { total: 0, active: 0, inactive: 0 })
    } catch (err) {
      toast.error('Failed to load sales reps: ' + err.message)
    }
    setLoading(false)
  }

  async function handleReactivate() {
    if (!reactivateRep) return
    try {
      await api.activateSalesRep(reactivateRep._id)
      toast.success((reactivateRep.first_name + ' ' + reactivateRep.last_name) + ' reactivated')
      setReactivateRep(null)
      fetchData()
    } catch (err) {
      toast.error('Failed to reactivate: ' + err.message)
    }
  }

  function getInitials(first, last) {
    return ((first?.[0] || '') + (last?.[0] || '')).toUpperCase()
  }

  function formatDate(dateStr) {
    if (!dateStr) return null
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
      ' ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  }

  function timeAgo(dateStr) {
    if (!dateStr) return 'Never'
    const diff = Date.now() - new Date(dateStr).getTime()
    const days = Math.floor(diff / 86400000)
    if (days < 1) return 'Today'
    if (days === 1) return 'Yesterday'
    if (days < 30) return `${days} days ago`
    const months = Math.floor(days / 30)
    return `${months} month${months > 1 ? 's' : ''} ago`
  }

  const filteredReps = reps.filter(r => {
    const s = search.toLowerCase()
    return !search || r.first_name?.toLowerCase().includes(s) || r.last_name?.toLowerCase().includes(s) ||
      r.email?.toLowerCase().includes(s) || r.username?.toLowerCase().includes(s) || r.rep_number?.toLowerCase().includes(s)
  })
  const paginatedReps = filteredReps.slice((page - 1) * perPage, page * perPage)

  return (
    <>
      {/* Page Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <nav aria-label="breadcrumb">
            <ol className="breadcrumb mb-1">
              <li className="breadcrumb-item"><Link to="/"><i className="bi bi-house-door"></i></Link></li>
              <li className="breadcrumb-item">Sales</li>
              <li className="breadcrumb-item active">Inactive Reps</li>
            </ol>
          </nav>
          <h3 className="mb-0">Inactive Sales Representatives</h3>
        </div>
        <div className="d-flex gap-2">
          <button className="btn btn-outline-primary" onClick={() => exportCSV(
            filteredReps.map((r, i) => [i + 1, r.rep_number, r.first_name + ' ' + r.last_name, r.username, r.email, r.phone, r.user_type, r.status]),
            ['#', 'REP #', 'Name', 'Username', 'Email', 'Phone', 'User Type', 'Status'], 'inactive-sales-reps'
          )}>
            <i className="bi bi-download me-1"></i> Export
          </button>
          <Link to="/sales-reps/create" className="btn btn-primary">
            <i className="bi bi-plus-lg me-1"></i> New Sales Rep
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="row g-3 mb-4">
        {[
          { value: stats.inactive, label: 'Inactive Reps', icon: 'bi-person-dash-fill', bg: '#fef2f2', color: '#ef4444' },
          { value: stats.active, label: 'Active Reps', icon: 'bi-people-fill', bg: '#eff6ff', color: '#2563eb' },
          { value: stats.total, label: 'Total Reps', icon: 'bi-graph-up', bg: '#ecfdf5', color: '#10b981' },
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

      {/* Filter Pills */}
      <div className="filter-pills d-flex gap-2 mb-3">
        {[
          { key: 'active', label: 'Active', count: stats.active, badge: 'bg-success text-white', link: '/sales-reps/active' },
          { key: 'inactive', label: 'Inactive', count: stats.inactive, badge: 'bg-danger text-white', link: '/sales-reps/inactive' },
        ].map(f => (
          <Link
            key={f.key}
            to={f.link}
            className={`btn btn-outline-secondary${f.key === 'inactive' ? ' active' : ''}`}
          >
            {f.label} <span className={`badge ${f.badge} ms-1`}>{f.count}</span>
          </Link>
        ))}
      </div>

      {/* Sales Reps Table */}
      <div className="card border-0 shadow-sm">
        <div className="card-header py-3" style={{ background: 'linear-gradient(135deg, #2563eb, #1e40af)', color: '#fff' }}>
          <div className="d-flex justify-content-between align-items-center">
            <h5 className="mb-0"><i className="bi bi-person-dash me-2"></i>Inactive Representatives</h5>
            <span className="badge bg-white bg-opacity-25 px-3 py-2">{filteredReps.length} reps</span>
          </div>
        </div>
        <div className="card-body p-0">
          <div className="d-flex justify-content-between align-items-center px-3 py-2 border-bottom">
            <div className="d-flex align-items-center gap-2">
              <span className="text-muted small">Show</span>
              <select className="form-select form-select-sm" style={{ width: 'auto' }} value={perPage} onChange={e => { setPerPage(Number(e.target.value)); setPage(1) }}>
                {[10, 25, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div className="position-relative" style={{ width: 200 }}>
              <input type="text" className="form-control form-control-sm" placeholder="Search..." value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
            </div>
          </div>
          <div className="table-responsive">
            <table className="table table-hover mb-0 align-middle">
              <thead className="bg-light">
                <tr>
                  <th className="ps-4" style={{ width: 70 }}>REP#</th>
                  <th>Rep Name</th>
                  <th>Address</th>
                  <th>City</th>
                  <th>Zip</th>
                  <th>Phone</th>
                  <th>Email</th>
                  <th className="pe-4 text-center" style={{ width: 170 }}>Action</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="9" className="text-center py-5 text-muted">
                      <div className="spinner-border spinner-border-sm me-2" role="status"></div>
                      Loading sales reps...
                    </td>
                  </tr>
                ) : filteredReps.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="text-center py-5 text-muted">
                      <div className="mb-2"><i className="bi bi-person-check fs-1 text-success"></i></div>
                      No inactive sales reps
                    </td>
                  </tr>
                ) : paginatedReps.map((r, index) => (
                  <tr key={r._id}>
                    <td className="ps-4"><code className="px-2 py-1 rounded" style={{ background: '#f1f5f9', color: '#475569', fontSize: '0.82rem' }}>{r.rep_number || '-'}</code></td>
                    <td>
                      <div className="d-flex align-items-center gap-2">
                        <div
                          className="user-avatar"
                          style={{
                            background: avatarColors[index % avatarColors.length],
                            opacity: 0.6
                          }}
                        >
                          {getInitials(r.first_name, r.last_name)}
                        </div>
                        <div>
                          <div className="fw-medium text-muted">
                            {r.first_name} {r.last_name}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td><span className="small text-muted">{r.address || '-'}</span></td>
                    <td><span className="small text-muted">{r.city || '-'}</span></td>
                    <td><span className="small text-muted">{r.zip || '-'}</span></td>
                    <td><span className="small text-muted">{r.phone || '-'}{r.extension ? ' x' + r.extension : ''}</span></td>
                    <td>
                      <a href={`mailto:${r.email}`} className="text-decoration-none text-muted small">
                        {r.email || '-'}
                      </a>
                    </td>
                    <td className="pe-4 text-center">
                      <Link to={'/sales-reps/' + r._id} className="btn btn-sm btn-action btn-outline-info me-1" title="View">
                        <i className="bi bi-eye"></i>
                      </Link>
                      <Link to={'/sales-reps/' + r._id + '/edit'} className="btn btn-sm btn-action btn-outline-primary me-1" title="Edit">
                        <i className="bi bi-pencil"></i>
                      </Link>
                      <button className="btn btn-sm btn-action btn-outline-success" title="Reactivate" onClick={() => setReactivateRep(r)}>
                        <i className="bi bi-arrow-counterclockwise"></i>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination total={filteredReps.length} page={page} perPage={perPage} onPageChange={setPage} onPerPageChange={setPerPage} />
        </div>
      </div>

      {/* Reactivate Modal */}
      {reactivateRep && (<>
        <div className="modal-backdrop fade show" style={{ zIndex: 1050 }}></div>
        <div className="modal fade show d-block" tabIndex="-1" style={{ zIndex: 1055 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow" style={{ borderRadius: 16, overflow: 'hidden' }}>
              <div className="modal-header text-white border-0" style={{ background: 'linear-gradient(135deg, #16a34a, #22c55e)' }}>
                <h5 className="modal-title"><i className="bi bi-arrow-counterclockwise me-2"></i>Reactivate Sales Rep</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setReactivateRep(null)}></button>
              </div>
              <div className="modal-body py-4">
                <p>Are you sure you want to reactivate <strong>{reactivateRep.first_name} {reactivateRep.last_name}</strong>? They will be moved to the active list.</p>
              </div>
              <div className="modal-footer border-0">
                <button className="btn btn-outline-secondary" onClick={() => setReactivateRep(null)}>Cancel</button>
                <button className="btn btn-success" onClick={handleReactivate}><i className="bi bi-check-lg me-1"></i>Reactivate</button>
              </div>
            </div>
          </div>
        </div>
      </>)}
    </>
  )
}
