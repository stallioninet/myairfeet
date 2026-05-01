import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { api } from '../lib/api'

const levelLabels = {
  superuser:    'Superuser',
  admin:        'Admin',
  'sales-rep':  'Sales Rep',
  'data-entry': 'Data Entry',
}

function fmtMoney(v) { return '$' + (parseFloat(v) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }
function fmtDaysAgo(d) {
  if (!d) return ''
  const days = Math.floor((Date.now() - new Date(d).getTime()) / (1000 * 60 * 60 * 24))
  if (days === 0) return 'today'
  if (days === 1) return '1 day ago'
  return `${days} days ago`
}

export default function TopHeader({ user, onLogout, onToggleSidebar }) {
  const navigate = useNavigate()
  const [notifOpen, setNotifOpen] = useState(false)
  const [notifs, setNotifs] = useState(null)
  const [notifLoading, setNotifLoading] = useState(false)
  const dropRef = useRef(null)

  // Close on outside click
  useEffect(() => {
    function handler(e) {
      if (dropRef.current && !dropRef.current.contains(e.target)) setNotifOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  async function openNotifications() {
    setNotifOpen(v => !v)
    if (!notifs && !notifLoading) {
      setNotifLoading(true)
      try {
        const data = await api.getNotifications()
        setNotifs(data)
      } catch { setNotifs({ total: 0, overdueInvoices: [], unpaidCommissions: [] }) }
      setNotifLoading(false)
    }
  }

  async function refreshNotifications() {
    setNotifLoading(true)
    try {
      const data = await api.getNotifications()
      setNotifs(data)
    } catch {}
    setNotifLoading(false)
  }

  function getInitials() {
    if (!user) return 'AD'
    return ((user.first_name?.[0] || '') + (user.last_name?.[0] || '')).toUpperCase() || 'U'
  }

  function handleLogout() {
    if (onLogout) onLogout()
    toast.success('Logged out successfully')
    navigate('/login')
  }

  const totalNotifs = notifs?.total || 0
  const overdueCount = notifs?.overdueInvoices?.length || 0
  const unpaidCount = notifs?.unpaidCommissions?.length || 0

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

        {/* Notification Bell */}
        <div ref={dropRef} style={{ position: 'relative' }}>
          <button
            className="btn btn-sm position-relative"
            style={{ fontSize: '1.1rem' }}
            onClick={openNotifications}
            title="Notifications"
          >
            <i className="bi bi-bell"></i>
            {totalNotifs > 0 && (
              <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger" style={{ fontSize: '0.6rem' }}>
                {totalNotifs > 99 ? '99+' : totalNotifs}
              </span>
            )}
          </button>

          {notifOpen && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 8px)', right: 0, width: 360,
              background: '#fff', borderRadius: 14, boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
              border: '1px solid #e8ecf1', zIndex: 1050, overflow: 'hidden',
            }}>
              {/* Header */}
              <div className="d-flex align-items-center justify-content-between px-3 py-2" style={{ background: 'linear-gradient(135deg,#1e293b,#334155)', color: '#fff' }}>
                <div className="d-flex align-items-center gap-2">
                  <i className="bi bi-bell-fill" style={{ fontSize: 14 }}></i>
                  <span className="fw-bold" style={{ fontSize: 14 }}>Notifications</span>
                  {totalNotifs > 0 && <span className="badge bg-danger rounded-pill" style={{ fontSize: 10 }}>{totalNotifs}</span>}
                </div>
                <div className="d-flex gap-2 align-items-center">
                  <button className="btn btn-sm p-0" style={{ color: '#94a3b8', fontSize: 13 }} onClick={refreshNotifications} title="Refresh">
                    <i className={`bi bi-arrow-clockwise ${notifLoading ? 'spin' : ''}`}></i>
                  </button>
                  <button className="btn btn-sm p-0" style={{ color: '#94a3b8', fontSize: 16 }} onClick={() => setNotifOpen(false)}>
                    <i className="bi bi-x"></i>
                  </button>
                </div>
              </div>

              <div style={{ maxHeight: 420, overflowY: 'auto' }}>
                {notifLoading && !notifs ? (
                  <div className="text-center py-4 text-muted" style={{ fontSize: 13 }}>
                    <div className="spinner-border spinner-border-sm me-2"></div>Loading…
                  </div>
                ) : totalNotifs === 0 ? (
                  <div className="text-center py-5 text-muted">
                    <i className="bi bi-check-circle-fill d-block mb-2" style={{ fontSize: 32, color: '#10b981' }}></i>
                    <div style={{ fontSize: 13 }}>All caught up!</div>
                    <div style={{ fontSize: 11, color: '#94a3b8' }}>No pending items</div>
                  </div>
                ) : (
                  <>
                    {/* Overdue Invoices */}
                    {overdueCount > 0 && (
                      <div>
                        <div className="px-3 py-2 d-flex align-items-center gap-2" style={{ background: '#fef2f2', borderBottom: '1px solid #fee2e2' }}>
                          <i className="bi bi-exclamation-triangle-fill text-danger" style={{ fontSize: 12 }}></i>
                          <span className="fw-semibold text-danger" style={{ fontSize: 12 }}>Overdue Invoices ({overdueCount})</span>
                        </div>
                        {notifs.overdueInvoices.map((inv, i) => (
                          <Link
                            key={i}
                            to="/invoices"
                            onClick={() => setNotifOpen(false)}
                            style={{ textDecoration: 'none', color: 'inherit' }}
                          >
                            <div className="px-3 py-2 d-flex align-items-start gap-2" style={{ borderBottom: '1px solid #f8fafc', cursor: 'pointer', transition: 'background .15s' }}
                              onMouseEnter={e => e.currentTarget.style.background = '#fef2f2'}
                              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                              <div style={{ width: 32, height: 32, borderRadius: 8, background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <i className="bi bi-file-earmark-x text-danger" style={{ fontSize: 14 }}></i>
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div className="fw-semibold text-truncate" style={{ fontSize: 13 }}>
                                  Invoice #{inv.invoice_number || '—'}
                                </div>
                                <div className="text-truncate" style={{ fontSize: 11, color: '#64748b' }}>{inv.company_name}</div>
                                <div className="d-flex gap-2 mt-1 flex-wrap">
                                  <span style={{ fontSize: 11, fontWeight: 600, color: '#dc2626' }}>{fmtMoney(inv.balance)} due</span>
                                  <span style={{ fontSize: 11, color: '#94a3b8' }}>{inv.days_overdue}d overdue</span>
                                </div>
                              </div>
                            </div>
                          </Link>
                        ))}
                      </div>
                    )}

                    {/* Unpaid Commissions */}
                    {unpaidCount > 0 && (
                      <div>
                        <div className="px-3 py-2 d-flex align-items-center gap-2" style={{ background: '#fff7ed', borderBottom: '1px solid #fed7aa' }}>
                          <i className="bi bi-percent text-warning" style={{ fontSize: 12 }}></i>
                          <span className="fw-semibold text-warning" style={{ fontSize: 12 }}>Unpaid Commissions ({unpaidCount})</span>
                        </div>
                        {notifs.unpaidCommissions.map((comm, i) => (
                          <Link
                            key={i}
                            to="/commissions"
                            onClick={() => setNotifOpen(false)}
                            style={{ textDecoration: 'none', color: 'inherit' }}
                          >
                            <div className="px-3 py-2 d-flex align-items-start gap-2" style={{ borderBottom: '1px solid #f8fafc', cursor: 'pointer', transition: 'background .15s' }}
                              onMouseEnter={e => e.currentTarget.style.background = '#fff7ed'}
                              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                              <div style={{ width: 32, height: 32, borderRadius: 8, background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <i className="bi bi-currency-dollar" style={{ fontSize: 15, color: '#d97706' }}></i>
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div className="fw-semibold text-truncate" style={{ fontSize: 13 }}>
                                  Invoice #{comm.invoice_number || '—'}
                                </div>
                                <div className="text-truncate" style={{ fontSize: 11, color: '#64748b' }}>{comm.company_name}</div>
                                {comm.total_commission > 0 && (
                                  <span style={{ fontSize: 11, fontWeight: 600, color: '#d97706' }}>{fmtMoney(comm.total_commission)} commission</span>
                                )}
                              </div>
                            </div>
                          </Link>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Footer */}
              {totalNotifs > 0 && (
                <div className="px-3 py-2 d-flex gap-2" style={{ borderTop: '1px solid #f1f5f9', background: '#f8fafc' }}>
                  <Link to="/invoices" onClick={() => setNotifOpen(false)} className="btn btn-sm btn-outline-danger flex-fill" style={{ fontSize: 11 }}>
                    <i className="bi bi-file-earmark-x me-1"></i>View Overdue
                  </Link>
                  <Link to="/commissions" onClick={() => setNotifOpen(false)} className="btn btn-sm btn-outline-warning flex-fill" style={{ fontSize: 11 }}>
                    <i className="bi bi-percent me-1"></i>View Commissions
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>

        {/* User info */}
        <div className="d-flex align-items-center gap-2">
          <div className="user-avatar" style={{ width: '32px', height: '32px', fontSize: '0.75rem', background: 'linear-gradient(135deg, #3b82f6, #2563eb)' }}>
            {getInitials()}
          </div>
          <div style={{ lineHeight: 1.2 }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>
              {user ? `${user.first_name} ${user.last_name}` : 'Admin'}
            </div>
            <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
              {levelLabels[user?.level] || levelLabels[user?.user_type?.replace('_', '-')] || 'User'}
            </div>
          </div>
        </div>

        <button className="btn btn-sm btn-outline-secondary" onClick={handleLogout} title="Logout" style={{ fontSize: '0.85rem' }}>
          <i className="bi bi-box-arrow-right"></i>
        </button>
      </div>
    </div>
  )
}
