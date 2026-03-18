import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../../lib/api'
import toast from 'react-hot-toast'
import Pagination from '../../../components/Pagination'
import exportCSV from '../../../lib/exportCSV'

export default function UserActivity() {
  const [users, setUsers] = useState([])
  const [activities, setActivities] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(10)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [filterAction, setFilterAction] = useState('')

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    setLoading(true)
    try {
      const [usersData, statsData, actsData] = await Promise.all([
        api.getUsers(),
        api.getUserActivityStats().catch(() => null),
        api.getUserActivities().catch(() => []),
      ])
      setUsers(usersData || [])
      setStats(statsData)
      setActivities(actsData || [])
    } catch {}
    setLoading(false)
  }

  // Filter activities for stats
  const filteredActs = activities.filter(a => {
    if (dateFrom && a.created_at && new Date(a.created_at) < new Date(dateFrom)) return false
    if (dateTo && a.created_at && new Date(a.created_at) > new Date(dateTo + 'T23:59:59')) return false
    if (filterAction && a.action !== filterAction) return false
    return true
  })

  const actionTypes = [...new Set(activities.map(a => a.action).filter(Boolean))]

  // Filter users
  let filtered = users
  if (search.trim()) {
    const s = search.toLowerCase()
    filtered = filtered.filter(u =>
      u.first_name?.toLowerCase().includes(s) ||
      u.last_name?.toLowerCase().includes(s) ||
      u.username?.toLowerCase().includes(s) ||
      u.email?.toLowerCase().includes(s)
    )
  }

  const totalActs = stats?.total || activities.length
  const todayActs = activities.filter(a => {
    if (!a.created_at) return false
    const d = new Date(a.created_at)
    const now = new Date()
    return d.toDateString() === now.toDateString()
  }).length

  if (loading) return <div className="p-4">Loading...</div>

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <nav aria-label="breadcrumb">
            <ol className="breadcrumb mb-1">
              <li className="breadcrumb-item"><Link to="/"><i className="bi bi-house-door"></i></Link></li>
              <li className="breadcrumb-item">Admin</li>
              <li className="breadcrumb-item active">Users Activity</li>
            </ol>
          </nav>
          <h3 className="mb-0">Users Activity</h3>
        </div>
      </div>

      {/* Stats */}
      <div className="row g-3 mb-4">
        {[
          { value: users.length, label: 'Total Users', icon: 'bi-people-fill', bg: '#eff6ff', color: '#2563eb' },
          { value: totalActs, label: 'Total Activities', icon: 'bi-activity', bg: '#f5f3ff', color: '#8b5cf6' },
          { value: todayActs, label: 'Today', icon: 'bi-calendar-check', bg: '#ecfdf5', color: '#10b981' },
          { value: actionTypes.length, label: 'Action Types', icon: 'bi-tag', bg: '#fff7ed', color: '#f59e0b' },
        ].map((stat, i) => (
          <div className="col-md-3 col-6" key={i}>
            <div className="stat-card">
              <div className="d-flex align-items-center gap-3">
                <div className="stat-icon" style={{ background: stat.bg, color: stat.color }}><i className={`bi ${stat.icon}`}></i></div>
                <div><div className="stat-value">{stat.value}</div><div className="stat-label">{stat.label}</div></div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="card border-0 shadow-sm rounded-4 mb-3">
        <div className="card-body py-3 px-4">
          <div className="d-flex flex-wrap align-items-center gap-3">
            <div className="position-relative" style={{ minWidth: 200 }}>
              <i className="bi bi-search position-absolute" style={{ left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}></i>
              <input type="text" className="form-control form-control-sm ps-5" placeholder="Search users..." value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
            </div>
            <div className="d-flex align-items-center gap-1">
              <label className="small fw-semibold text-nowrap">From:</label>
              <input type="date" className="form-control form-control-sm" style={{ width: 140 }} value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
            </div>
            <div className="d-flex align-items-center gap-1">
              <label className="small fw-semibold text-nowrap">To:</label>
              <input type="date" className="form-control form-control-sm" style={{ width: 140 }} value={dateTo} onChange={e => setDateTo(e.target.value)} />
            </div>
            <select className="form-select form-select-sm" style={{ width: 140 }} value={filterAction} onChange={e => setFilterAction(e.target.value)}>
              <option value="">All Actions</option>
              {actionTypes.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
            {(dateFrom || dateTo || filterAction) && (
              <button className="btn btn-sm btn-outline-secondary" onClick={() => { setDateFrom(''); setDateTo(''); setFilterAction('') }}>
                <i className="bi bi-x-lg me-1"></i>Reset
              </button>
            )}
            {filteredActs.length > 0 && (
              <span className="text-muted small ms-auto">{filteredActs.length} activities</span>
            )}
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
        <div className="card-header py-3 border-0" style={{ background: 'linear-gradient(135deg, #2563eb, #1e40af)', color: '#fff' }}>
          <div className="d-flex justify-content-between align-items-center">
            <h5 className="mb-0"><i className="bi bi-people me-2"></i>Users Activity List</h5>
            <button className="btn btn-sm btn-light" onClick={() => exportCSV(
              filtered.map((u, i) => [i + 1, u.first_name, u.last_name, u.email, u.level, u.status]),
              ['Sno', 'First Name', 'Last Name', 'Email', 'Level', 'Status'], 'users-activity'
            )}><i className="bi bi-download me-1"></i>Export</button>
          </div>
        </div>
        <div className="table-responsive">
          <table className="table table-hover mb-0 align-middle">
            <thead className="bg-light">
              <tr>
                <th className="ps-4" style={{ width: 60 }}>Sno</th>
                <th>First Name</th>
                <th>Last Name</th>
                <th>Email</th>
                <th>Level</th>
                <th>Status</th>
                <th className="pe-4 text-center" style={{ width: 80 }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan="7" className="text-center py-4 text-muted">No users found.</td></tr>
              ) : filtered.slice((page - 1) * perPage, page * perPage).map((user, index) => (
                <tr key={user._id}>
                  <td className="ps-4 text-muted">{(page - 1) * perPage + index + 1}</td>
                  <td className="fw-semibold">{user.first_name}</td>
                  <td>{user.last_name}</td>
                  <td>{user.email}</td>
                  <td><span className="badge bg-primary-subtle text-primary rounded-pill px-2">{user.level || '-'}</span></td>
                  <td><span className={`badge rounded-pill px-2 ${user.status === 'active' ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger'}`}>{user.status}</span></td>
                  <td className="pe-4 text-center">
                    <Link to={`/admin/activity/${user._id}`} className="btn btn-sm btn-action btn-outline-info" title="View Activity">
                      <i className="bi bi-eye"></i>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="card-footer bg-white border-0 py-3">
          <Pagination total={filtered.length} page={page} perPage={perPage} onPageChange={setPage} onPerPageChange={setPerPage} />
        </div>
      </div>
    </>
  )
}
