import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { api } from '../../../lib/api'
import Pagination from '../../../components/Pagination'
import exportCSV from '../../../lib/exportCSV'



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

const levelConfig = {
  superuser: { label: 'Superuser', icon: 'bi-star-fill', className: 'level-superuser' },
  admin: { label: 'Admin', icon: 'bi-gear-fill', className: 'level-admin' },
  'sales-rep': { label: 'Sales Rep', icon: 'bi-graph-up', className: 'level-sales-rep' },
  'data-entry': { label: 'Data Entry', icon: 'bi-keyboard', className: 'level-data-entry' },
}

export default function UserList() {
  const navigate = useNavigate()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(10)

  useEffect(() => {
    fetchUsers()
  }, [])

  async function fetchUsers() {
    setLoading(true)
    try {
      const data = await api.getUsers()
      setUsers(data || [])
    } catch (err) {
      toast.error('Failed to load users: ' + err.message)
    }
    setLoading(false)
  }

  async function handleDelete(user) {
    if (!confirm(`Are you sure you want to delete "${user.first_name} ${user.last_name}"?`)) return

    try {
      await api.deleteUser(user._id)
      toast.success(`User "${user.first_name} ${user.last_name}" deleted`)
      setUsers(prev => prev.filter(u => u._id !== user._id))
    } catch (err) {
      toast.error('Failed to delete user: ' + err.message)
    }
  }

  const filteredUsers = filter === 'all' ? users : users.filter(u => u.status === filter)
  const paginatedUsers = filteredUsers.slice((page - 1) * perPage, page * perPage)
  const activeCount = users.filter(u => u.status === 'active').length
  const inactiveCount = users.filter(u => u.status === 'inactive').length
  const levelCount = new Set(users.map(u => u.level)).size

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

  return (
    <>
      {/* Page Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <nav aria-label="breadcrumb">
            <ol className="breadcrumb mb-1">
              <li className="breadcrumb-item"><Link to="/"><i className="bi bi-house-door"></i></Link></li>
              <li className="breadcrumb-item">Admin</li>
              <li className="breadcrumb-item active">Users</li>
            </ol>
          </nav>
          <h3 className="mb-0">Users</h3>
        </div>
        <div className="d-flex gap-2">
          <button className="btn btn-outline-primary" onClick={() => exportCSV(
            filteredUsers.map((u, i) => [i + 1, u.first_name, u.last_name, u.email, u.level, u.status]),
            ['#', 'First Name', 'Last Name', 'Email', 'Level', 'Status'], 'users'
          )}>
            <i className="bi bi-download me-1"></i> Export
          </button>
          <Link to="/admin/users/create" className="btn btn-primary">
            <i className="bi bi-plus-lg me-1"></i> Create User
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="row g-3 mb-4">
        {[
          { value: users.length, label: 'Total Users', icon: 'bi-people-fill', bg: '#eff6ff', color: '#2563eb' },
          { value: activeCount, label: 'Active', icon: 'bi-check-circle-fill', bg: '#ecfdf5', color: '#10b981' },
          { value: inactiveCount, label: 'Inactive', icon: 'bi-x-circle-fill', bg: '#fef2f2', color: '#ef4444' },
          { value: levelCount, label: 'User Levels', icon: 'bi-layers-fill', bg: '#f5f3ff', color: '#8b5cf6' },
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

      {/* Filter Pills */}
      <div className="filter-pills d-flex gap-2 mb-3">
        {[
          { key: 'all', label: 'All Users', count: users.length, badge: 'bg-white text-dark' },
          { key: 'active', label: 'Active', count: activeCount, badge: 'bg-success text-white' },
          { key: 'inactive', label: 'Inactive', count: inactiveCount, badge: 'bg-danger text-white' },
        ].map(f => (
          <button
            key={f.key}
            className={`btn btn-outline-secondary${filter === f.key ? ' active' : ''}`}
            onClick={() => { setFilter(f.key); setPage(1) }}
          >
            {f.label} <span className={`badge ${f.badge} ms-1`}>{f.count}</span>
          </button>
        ))}
      </div>

      {/* Users Table */}
      <div className="card border-0 shadow-sm">
        <div className="card-header py-3" style={{ background: 'linear-gradient(135deg, #2563eb, #1e40af)', color: '#fff' }}>
          <div className="d-flex justify-content-between align-items-center">
            <h5 className="mb-0"><i className="bi bi-people me-2"></i>Users List</h5>
            <span className="badge bg-white bg-opacity-25 px-3 py-2">{filteredUsers.length} users</span>
          </div>
        </div>
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover mb-0 align-middle">
              <thead className="bg-light">
                <tr>
                  <th className="ps-4" style={{ width: 50 }}>#</th>
                  <th>User</th>
                  <th>Email</th>
                  <th>Level</th>
                  <th>Last Login</th>
                  <th>Status</th>
                  <th className="pe-4 text-center" style={{ width: 170 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="7" className="text-center py-5 text-muted">
                      <div className="spinner-border spinner-border-sm me-2" role="status"></div>
                      Loading users...
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center py-5 text-muted">No users found</td>
                  </tr>
                ) : paginatedUsers.map((user, index) => {
                  const level = levelConfig[user.level] || {}
                  const isInactive = user.status === 'inactive'
                  return (
                    <tr key={user._id}>
                      <td className="ps-4 text-muted">{(page - 1) * perPage + index + 1}</td>
                      <td>
                        <div className="d-flex align-items-center gap-2">
                          <div
                            className="user-avatar"
                            style={{
                              background: avatarColors[index % avatarColors.length],
                              opacity: isInactive ? 0.6 : 1
                            }}
                          >
                            {getInitials(user.first_name, user.last_name)}
                          </div>
                          <div>
                            <div className={`fw-medium${isInactive ? ' text-muted' : ''}`}>
                              {user.first_name} {user.last_name}
                            </div>
                            <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                              Added {new Date(user.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <a href={`mailto:${user.email}`} className={`text-decoration-none${isInactive ? ' text-muted' : ''}`}>
                          {user.email}
                        </a>
                      </td>
                      <td>
                        <span className={`level-badge ${level.className || ''}`}>
                          <i className={`bi ${level.icon || ''} me-1`}></i>
                          {level.label || user.level}
                        </span>
                      </td>
                      <td>
                        {user.last_login ? (
                          <>
                            <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                              {formatDate(user.last_login)}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>
                              {timeAgo(user.last_login)}
                            </div>
                          </>
                        ) : (
                          <span className="text-muted" style={{ fontSize: '0.82rem' }}>Never</span>
                        )}
                      </td>
                      <td>
                        <span className={`badge badge-${user.status}`}>
                          {user.status === 'active' ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="pe-4 text-center">
                        <Link
                          to={`/admin/users/${user._id}/edit`}
                          className="btn btn-sm btn-action btn-outline-primary me-1"
                          title="Edit User"
                        >
                          <i className="bi bi-pencil"></i>
                        </Link>
                        <button
                          className="btn btn-sm btn-action btn-outline-info me-1"
                          title="View Permissions"
                          onClick={() => navigate('/admin/access')}
                        >
                          <i className="bi bi-shield-lock"></i>
                        </button>
                        <button
                          className="btn btn-sm btn-action btn-outline-danger"
                          title="Delete User"
                          onClick={() => handleDelete(user)}
                        >
                          <i className="bi bi-trash"></i>
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <Pagination total={filteredUsers.length} page={page} perPage={perPage} onPageChange={setPage} onPerPageChange={setPerPage} />
        </div>
      </div>
    </>
  )
}
