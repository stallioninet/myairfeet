import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'

const levelLabels = {
  superuser: 'Superuser',
  admin: 'Admin',
  'sales-rep': 'Sales Rep',
  'data-entry': 'Data Entry',
}

export default function TopHeader({ user, onLogout, onToggleSidebar }) {
  const navigate = useNavigate()

  function getInitials() {
    if (!user) return 'AD'
    return ((user.first_name?.[0] || '') + (user.last_name?.[0] || '')).toUpperCase() || 'U'
  }

  function handleLogout() {
    if (onLogout) onLogout()
    toast.success('Logged out successfully')
    navigate('/login')
  }

  return (
    <div className="top-header">
      <div className="d-flex align-items-center gap-2">
        <button className="sidebar-toggle" onClick={onToggleSidebar} aria-label="Open menu">
          <i className="bi bi-list"></i>
        </button>
        <i className="bi bi-search text-muted"></i>
        <input
          type="text"
          className="form-control form-control-sm border-0 bg-transparent"
          placeholder="Search..."
          style={{ maxWidth: '300px' }}
        />
      </div>
      <div className="d-flex align-items-center gap-3">
        <button className="btn btn-sm position-relative" style={{ fontSize: '1.1rem' }}>
          <i className="bi bi-bell"></i>
          <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger" style={{ fontSize: '0.6rem' }}>3</span>
        </button>
        <div className="d-flex align-items-center gap-2">
          <div className="user-avatar" style={{ width: '32px', height: '32px', fontSize: '0.75rem', background: 'linear-gradient(135deg, #3b82f6, #2563eb)' }}>
            {getInitials()}
          </div>
          <div style={{ lineHeight: 1.2 }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>
              {user ? `${user.first_name} ${user.last_name}` : 'Admin'}
            </div>
            <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
              {levelLabels[user?.level] || 'Superuser'}
            </div>
          </div>
        </div>
        <button
          className="btn btn-sm btn-outline-secondary"
          onClick={handleLogout}
          title="Logout"
          style={{ fontSize: '0.85rem' }}
        >
          <i className="bi bi-box-arrow-right"></i>
        </button>
      </div>
    </div>
  )
}
