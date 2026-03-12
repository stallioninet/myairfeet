import { useState, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { api } from '../../lib/api'

const avatarColors = ['#2563eb', '#7c3aed', '#06b6d4', '#16a34a', '#f59e0b', '#ef4444', '#ec4899', '#8b5cf6']

function hashColor(name) {
  let h = 0
  for (let i = 0; i < name.length; i++) { h = ((h << 5) - h) + name.charCodeAt(i); h |= 0 }
  return avatarColors[Math.abs(h) % avatarColors.length]
}

function getInitials(name) {
  return (name || '').split(/\s+/).map(w => w[0] || '').join('').toUpperCase().slice(0, 2)
}

export default function ViewCustomer() {
  const { id } = useParams()
  const [cust, setCust] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('details')

  useEffect(() => {
    api.getCustomer(id).then(data => {
      setCust(data)
      setLoading(false)
    }).catch(err => {
      toast.error('Failed to load: ' + err.message)
      setLoading(false)
    })
  }, [id])

  if (loading) return <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>
  if (!cust) return <div className="text-center py-5 text-muted">Customer not found</div>

  const contacts = cust.contacts || []
  const addresses = cust.addresses || []
  const emails = cust.emails || []
  const assignedReps = cust.assignedReps || []
  const color = hashColor(cust.company_name || '')

  const tabs = [
    { key: 'invoices', label: 'Invoices', icon: 'bi-receipt', badge: '0' },
    { key: 'commissions', label: 'Commissions', icon: 'bi-percent' },
    { key: 'payments', label: 'Payments', icon: 'bi-credit-card' },
    { key: 'documents', label: 'Documents', icon: 'bi-folder' },
    { key: 'email', label: 'Email Center', icon: 'bi-envelope' },
    { key: 'details', label: 'Details', icon: 'bi-info-circle' },
    { key: 'salesreps', label: 'Sales Reps', icon: 'bi-people' },
    { key: 'history', label: 'History', icon: 'bi-clock-history' },
  ]

  function formatDate(d) {
    if (!d) return '—'
    return new Date(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  }

  return (
    <div>
      {/* Breadcrumb */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <nav aria-label="breadcrumb">
          <ol className="breadcrumb mb-0">
            <li className="breadcrumb-item"><Link to="/dashboard"><i className="bi bi-house-door me-1"></i>Dashboard</Link></li>
            <li className="breadcrumb-item"><Link to="/customers/active">Customers</Link></li>
            <li className="breadcrumb-item active">{cust.company_name}</li>
          </ol>
        </nav>
        <div className="d-flex gap-2">
          <button className="btn btn-sm btn-outline-primary rounded-pill" onClick={() => window.print()}><i className="bi bi-printer me-1"></i>Print</button>
          <Link to="/customers/active" className="btn btn-sm btn-outline-secondary rounded-pill"><i className="bi bi-arrow-left me-1"></i>Back to List</Link>
        </div>
      </div>

      {/* Customer Header Bar */}
      <div className="card border-0 shadow-sm mb-3" style={{ borderRadius: 16, overflow: 'hidden', position: 'relative' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg, #2563eb, #7c3aed, #2563eb)' }}></div>
        <div className="card-body d-flex align-items-center gap-3 flex-wrap py-3 px-4">
          <div className="d-flex align-items-center justify-content-center fw-bold text-white" style={{ width: 64, height: 64, borderRadius: 16, background: `linear-gradient(135deg, ${color}, #7c3aed)`, fontSize: '1.4rem', boxShadow: '0 4px 12px rgba(37,99,235,.25)', flexShrink: 0 }}>
            {getInitials(cust.company_name)}
          </div>
          <div className="flex-grow-1">
            <div style={{ fontSize: '1.25rem', fontWeight: 800 }}>{cust.company_name}</div>
            <div className="text-muted" style={{ fontSize: '.82rem', fontWeight: 600 }}>Cust #: {cust.customer_code || '—'} &nbsp;|&nbsp; Type: {cust.customer_type || '—'}</div>
            <div className="d-flex gap-3 mt-1 flex-wrap">
              {cust.phone && <span className="d-flex align-items-center gap-1 text-muted" style={{ fontSize: '.78rem', fontWeight: 500 }}><i className="bi bi-telephone text-primary" style={{ fontSize: '.85rem' }}></i>{cust.phone}</span>}
              {cust.website && <span className="d-flex align-items-center gap-1 text-muted" style={{ fontSize: '.78rem', fontWeight: 500 }}><i className="bi bi-globe text-primary" style={{ fontSize: '.85rem' }}></i>{cust.website}</span>}
              {cust.created_at && <span className="d-flex align-items-center gap-1 text-muted" style={{ fontSize: '.78rem', fontWeight: 500 }}><i className="bi bi-calendar-check text-primary" style={{ fontSize: '.85rem' }}></i>Since {new Date(cust.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>}
              {assignedReps.length > 0 && <span className="d-flex align-items-center gap-1 text-muted" style={{ fontSize: '.78rem', fontWeight: 500 }}><i className="bi bi-people text-primary" style={{ fontSize: '.85rem' }}></i>{assignedReps.length} Reps Assigned</span>}
            </div>
          </div>
          <div className="d-flex align-items-center gap-2">
            {['pilot', 'active', 'inactive'].map(s => (
              <label key={s} className="d-flex align-items-center gap-1 px-3 py-1 border rounded-pill" style={{ fontSize: '.8rem', fontWeight: 600, cursor: 'pointer', background: cust.status === s ? '#eff6ff' : '#fff', borderColor: cust.status === s ? '#2563eb' : '#e2e8f0' }}>
                <input type="radio" name="custStatus" value={s} checked={cust.status === s} readOnly style={{ accentColor: '#2563eb', width: 14, height: 14 }} />
                <span style={{ color: cust.status === s ? '#2563eb' : undefined }}>{s.charAt(0).toUpperCase() + s.slice(1)}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="row g-3 mb-3">
        {[
          { value: '0', label: 'Total Invoices', icon: 'bi-receipt', bg: '#eff6ff', color: '#2563eb' },
          { value: '$0.00', label: 'Total Revenue', icon: 'bi-cash-stack', bg: '#ecfdf5', color: '#10b981' },
          { value: '$0.00', label: 'Outstanding', icon: 'bi-exclamation-triangle', bg: '#fef2f2', color: '#ef4444' },
          { value: '$0.00', label: 'Commissions Due', icon: 'bi-percent', bg: '#fffbeb', color: '#d97706' },
          { value: '$0.00', label: 'Total Payments', icon: 'bi-credit-card', bg: '#f5f3ff', color: '#7c3aed' },
        ].map((stat, i) => (
          <div className="col" key={i}>
            <div className="stat-card">
              <div className="d-flex align-items-center gap-3">
                <div className="stat-icon" style={{ background: stat.bg, color: stat.color }}><i className={`bi ${stat.icon}`}></i></div>
                <div>
                  <div className="stat-value" style={{ color: stat.color }}>{stat.value}</div>
                  <div className="stat-label">{stat.label}</div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Tab Card */}
      <div className="card border-0 shadow-sm" style={{ borderRadius: 16, overflow: 'hidden' }}>
        <ul className="nav nav-tabs px-3 pt-1" style={{ borderBottom: '2px solid #e2e8f0', background: 'linear-gradient(180deg, #fafbfc, #f6f8fa)', flexWrap: 'nowrap', overflowX: 'auto' }}>
          {tabs.map(tab => (
            <li className="nav-item" key={tab.key}>
              <button
                className={'nav-link border-0 ' + (activeTab === tab.key ? 'text-primary fw-bold' : 'text-secondary')}
                style={{ fontSize: '.82rem', fontWeight: 600, padding: '14px 16px', borderBottom: activeTab === tab.key ? '2.5px solid #2563eb' : '2.5px solid transparent', background: 'transparent', whiteSpace: 'nowrap', marginBottom: -2 }}
                onClick={() => setActiveTab(tab.key)}
              >
                <i className={`bi ${tab.icon} me-1`}></i>{tab.label}
              </button>
            </li>
          ))}
        </ul>

        <div className="p-4">

          {/* ===== DETAILS TAB ===== */}
          {activeTab === 'details' && (
            <div>
              {/* Action Bar */}
              <div className="d-flex gap-2 flex-wrap mb-4">
                <button className="btn btn-success" style={{ borderRadius: 10, fontWeight: 600, fontSize: '.82rem', padding: '8px 16px' }}><i className="bi bi-person-plus me-1"></i>Add Contact</button>
                <button className="btn btn-primary" style={{ borderRadius: 10, fontWeight: 600, fontSize: '.82rem', padding: '8px 16px' }}><i className="bi bi-geo-alt me-1"></i>Add Address</button>
                <button className="btn btn-info text-white" style={{ borderRadius: 10, fontWeight: 600, fontSize: '.82rem', padding: '8px 16px' }}><i className="bi bi-envelope-plus me-1"></i>Add Email</button>
              </div>

              <div className="row">
                {/* LEFT: Customer Info */}
                <div className="col-lg-7">
                  {/* Info Panel */}
                  <div className="border rounded-3 mb-4" style={{ overflow: 'hidden', borderColor: '#d1e3ff' }}>
                    <div className="d-flex justify-content-between align-items-center text-white px-3 py-2" style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', fontWeight: 700, fontSize: '.9rem' }}>
                      <span><i className="bi bi-gear me-2"></i>Customer Info</span>
                      <button className="btn btn-sm btn-outline-light" style={{ fontSize: '.78rem', padding: '4px 12px' }}><i className="bi bi-pencil me-1"></i>Edit</button>
                    </div>
                    <div className="p-3">
                      {[
                        ['Cust #:', cust.customer_code || '—'],
                        ['Name:', <span key="n" className="text-primary text-decoration-underline" style={{ cursor: 'pointer' }}>{cust.company_name}</span>],
                        ['Type:', cust.customer_type || '—'],
                        ['Assigned REPS:', assignedReps.length > 0 ? (
                          <div key="r" className="d-flex flex-wrap gap-1 align-items-center">
                            {assignedReps.map((r, i) => (
                              <span key={i} className="d-inline-block text-white fw-bold px-2 py-1" style={{ background: ['#10b981', '#7c3aed', '#2563eb', '#ef4444', '#d97706'][i % 5], borderRadius: 6, fontSize: '.78rem' }}>{r.name}</span>
                            ))}
                          </div>
                        ) : '—'],
                        ['Assigned Emails:', emails.length > 0 ? emails.filter(e => e.status === 'active').map(e => e.email).join(', ') || '—' : '—'],
                        ['Terms:', cust.terms || '—'],
                        ['FOB:', cust.fob || '—'],
                        ['Phone:', cust.phone ? cust.phone + (cust.extension ? ' x' + cust.extension : '') : '—'],
                        ['Website:', cust.website ? <a key="w" href={cust.website.startsWith('http') ? cust.website : 'https://' + cust.website} className="text-decoration-none" target="_blank" rel="noreferrer">{cust.website}</a> : '—'],
                        ['Created:', formatDate(cust.created_at)],
                      ].map(([label, val], i) => (
                        <div key={i} className="d-flex py-2 px-2" style={{ borderBottom: '1px solid #f1f5f9', fontSize: '.875rem', borderRadius: 6 }}>
                          <div className="fw-semibold text-muted" style={{ width: 140, flexShrink: 0 }}>{label}</div>
                          <div className="fw-medium flex-grow-1">{val}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Contacts Table */}
                  <h6 className="fw-bold mt-4 mb-2"><i className="bi bi-people me-2 text-primary"></i>Contacts</h6>
                  <div className="table-responsive">
                    <table className="table table-hover table-sm align-middle">
                      <thead><tr><th style={{ fontSize: '.78rem', textTransform: 'uppercase', letterSpacing: '.3px', color: '#64748b' }}>Name</th><th style={{ fontSize: '.78rem', textTransform: 'uppercase', letterSpacing: '.3px', color: '#64748b' }}>Position</th><th style={{ fontSize: '.78rem', textTransform: 'uppercase', letterSpacing: '.3px', color: '#64748b' }}>Email</th><th style={{ fontSize: '.78rem', textTransform: 'uppercase', letterSpacing: '.3px', color: '#64748b' }}>Phone</th><th className="text-end" style={{ fontSize: '.78rem', textTransform: 'uppercase', letterSpacing: '.3px', color: '#64748b' }}>Action</th></tr></thead>
                      <tbody>
                        {contacts.length === 0 ? (
                          <tr><td colSpan="5" className="text-center text-muted py-3">No contacts on file</td></tr>
                        ) : contacts.map((c, i) => (
                          <tr key={i}>
                            <td className="fw-semibold" style={{ fontSize: '.875rem' }}>{c.person || c.name || '—'}</td>
                            <td style={{ fontSize: '.875rem' }}>{c.position || c.title || '—'}</td>
                            <td style={{ fontSize: '.875rem' }}>{c.email ? <a href={'mailto:' + c.email} className="text-decoration-none">{c.email}</a> : '—'}</td>
                            <td style={{ fontSize: '.875rem' }}>{c.main_phone || c.phone || '—'}</td>
                            <td className="text-end">
                              <button className="btn btn-sm btn-outline-primary me-1" title="Edit"><i className="bi bi-pencil"></i></button>
                              <button className="btn btn-sm btn-outline-danger" title="Delete"><i className="bi bi-trash"></i></button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Addresses Table */}
                  <h6 className="fw-bold mt-4 mb-2"><i className="bi bi-geo-alt me-2 text-danger"></i>Addresses</h6>
                  <div className="table-responsive">
                    <table className="table table-hover table-sm align-middle">
                      <thead><tr><th style={{ fontSize: '.78rem', textTransform: 'uppercase', letterSpacing: '.3px', color: '#64748b' }}>Type</th><th style={{ fontSize: '.78rem', textTransform: 'uppercase', letterSpacing: '.3px', color: '#64748b' }}>Street</th><th style={{ fontSize: '.78rem', textTransform: 'uppercase', letterSpacing: '.3px', color: '#64748b' }}>City</th><th style={{ fontSize: '.78rem', textTransform: 'uppercase', letterSpacing: '.3px', color: '#64748b' }}>State</th><th style={{ fontSize: '.78rem', textTransform: 'uppercase', letterSpacing: '.3px', color: '#64748b' }}>Zip</th><th className="text-end" style={{ fontSize: '.78rem', textTransform: 'uppercase', letterSpacing: '.3px', color: '#64748b' }}>Action</th></tr></thead>
                      <tbody>
                        {addresses.length === 0 ? (
                          <tr><td colSpan="6" className="text-center text-muted py-3">No addresses on file</td></tr>
                        ) : addresses.map((a, i) => (
                          <tr key={i}>
                            <td><span className="badge bg-primary-subtle text-primary">{a.label || a.address_type || 'Main'}</span></td>
                            <td style={{ fontSize: '.875rem' }}>{a.street || '—'}</td>
                            <td style={{ fontSize: '.875rem' }}>{a.city || '—'}</td>
                            <td style={{ fontSize: '.875rem' }}>{a.state || '—'}</td>
                            <td style={{ fontSize: '.875rem' }}>{a.zip || '—'}</td>
                            <td className="text-end">
                              <button className="btn btn-sm btn-outline-primary me-1" title="Edit"><i className="bi bi-pencil"></i></button>
                              <button className="btn btn-sm btn-outline-danger" title="Delete"><i className="bi bi-trash"></i></button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Emails Table */}
                  <h6 className="fw-bold mt-4 mb-2"><i className="bi bi-envelope me-2 text-info"></i>Email Addresses</h6>
                  <div className="table-responsive">
                    <table className="table table-hover table-sm align-middle">
                      <thead><tr><th style={{ fontSize: '.78rem', textTransform: 'uppercase', letterSpacing: '.3px', color: '#64748b' }}>Email</th><th style={{ fontSize: '.78rem', textTransform: 'uppercase', letterSpacing: '.3px', color: '#64748b' }}>Name</th><th style={{ fontSize: '.78rem', textTransform: 'uppercase', letterSpacing: '.3px', color: '#64748b' }}>Status</th><th className="text-end" style={{ fontSize: '.78rem', textTransform: 'uppercase', letterSpacing: '.3px', color: '#64748b' }}>Action</th></tr></thead>
                      <tbody>
                        {emails.length === 0 ? (
                          <tr><td colSpan="4" className="text-center text-muted py-3">No email addresses on file</td></tr>
                        ) : emails.map((e, i) => (
                          <tr key={i}>
                            <td style={{ fontSize: '.875rem' }}>{e.email || '—'}</td>
                            <td style={{ fontSize: '.875rem' }}>{e.name || '—'}</td>
                            <td><span className={`badge ${e.status === 'active' ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger'} rounded-pill`}>{e.status}</span></td>
                            <td className="text-end">
                              <button className="btn btn-sm btn-outline-danger" title="Delete"><i className="bi bi-trash"></i></button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* RIGHT: Notes */}
                <div className="col-lg-5">
                  <div className="border rounded-3" style={{ overflow: 'hidden', borderColor: '#d1e3ff' }}>
                    <div className="d-flex justify-content-between align-items-center text-white px-3 py-2" style={{ background: 'linear-gradient(135deg, #475569, #334155)', fontWeight: 700, fontSize: '.9rem' }}>
                      <span><i className="bi bi-journal-text me-2"></i>Customer Notes</span>
                      <button className="btn btn-sm btn-outline-light" style={{ fontSize: '.78rem', padding: '4px 12px', color: '#fff', borderColor: 'rgba(255,255,255,.4)' }}><i className="bi bi-pencil me-1"></i>Add</button>
                    </div>
                    <div className="p-3">
                      {cust.notes ? (
                        <div className="py-2 px-2" style={{ fontSize: '.875rem', whiteSpace: 'pre-wrap' }}>
                          {cust.notes}
                        </div>
                      ) : (
                        <div className="text-center text-muted py-4">No notes yet</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ===== INVOICES TAB ===== */}
          {activeTab === 'invoices' && (
            <div>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h6 className="fw-bold mb-0"><i className="bi bi-receipt me-2 text-primary"></i>Invoices for {cust.company_name}</h6>
                <button className="btn btn-sm btn-primary rounded-pill"><i className="bi bi-plus-lg me-1"></i>New Invoice</button>
              </div>
              <div className="table-responsive">
                <table className="table table-hover align-middle">
                  <thead><tr><th>Invoice #</th><th>Date</th><th>Due Date</th><th>Amount</th><th>Paid</th><th>Balance</th><th>Status</th><th className="text-end">Actions</th></tr></thead>
                  <tbody><tr><td colSpan="8" className="text-center text-muted py-5"><i className="bi bi-receipt fs-1 d-block mb-2 opacity-25"></i>No invoices yet</td></tr></tbody>
                </table>
              </div>
            </div>
          )}

          {/* ===== COMMISSIONS TAB ===== */}
          {activeTab === 'commissions' && (
            <div>
              <h6 className="fw-bold mb-3"><i className="bi bi-percent me-2 text-primary"></i>Commissions</h6>
              <div className="table-responsive">
                <table className="table table-hover align-middle">
                  <thead><tr><th>Invoice #</th><th>Rep</th><th>Rate</th><th>Amount</th><th>Status</th><th className="text-end">Action</th></tr></thead>
                  <tbody><tr><td colSpan="6" className="text-center text-muted py-5"><i className="bi bi-percent fs-1 d-block mb-2 opacity-25"></i>No commission records yet</td></tr></tbody>
                </table>
              </div>
            </div>
          )}

          {/* ===== PAYMENTS TAB ===== */}
          {activeTab === 'payments' && (
            <div>
              <h6 className="fw-bold mb-3"><i className="bi bi-credit-card me-2 text-primary"></i>Payments</h6>
              <div className="table-responsive">
                <table className="table table-hover align-middle">
                  <thead><tr><th>Payment #</th><th>Date</th><th>Invoice</th><th>Amount</th><th>Method</th><th className="text-end">Action</th></tr></thead>
                  <tbody><tr><td colSpan="6" className="text-center text-muted py-5"><i className="bi bi-credit-card fs-1 d-block mb-2 opacity-25"></i>No payments yet</td></tr></tbody>
                </table>
              </div>
            </div>
          )}

          {/* ===== DOCUMENTS TAB ===== */}
          {activeTab === 'documents' && (
            <div>
              <h6 className="fw-bold mb-3"><i className="bi bi-folder me-2 text-primary"></i>Documents</h6>
              <div className="border rounded-3 p-4 text-center text-muted" style={{ borderStyle: 'dashed', borderColor: '#cbd5e1', cursor: 'pointer', background: '#fafbfc' }}>
                <i className="bi bi-cloud-arrow-up fs-1 d-block mb-2 opacity-50"></i>
                <div className="fw-semibold">Drop files here or click to upload</div>
                <div style={{ fontSize: '.8rem' }}>PDF, DOC, XLS, Images up to 10MB</div>
              </div>
            </div>
          )}

          {/* ===== EMAIL CENTER TAB ===== */}
          {activeTab === 'email' && (
            <div>
              <h6 className="fw-bold mb-3"><i className="bi bi-envelope me-2 text-primary"></i>Email Center</h6>
              <div className="text-center text-muted py-5"><i className="bi bi-envelope fs-1 d-block mb-2 opacity-25"></i>Email center coming soon</div>
            </div>
          )}

          {/* ===== SALES REPS TAB ===== */}
          {activeTab === 'salesreps' && (
            <div>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h6 className="fw-bold mb-0"><i className="bi bi-people me-2 text-primary"></i>Assigned Sales Reps</h6>
                <button className="btn btn-sm btn-primary rounded-pill"><i className="bi bi-plus-lg me-1"></i>Assign Rep</button>
              </div>
              {assignedReps.length === 0 ? (
                <div className="text-center text-muted py-5"><i className="bi bi-people fs-1 d-block mb-2 opacity-25"></i>No reps assigned</div>
              ) : (
                <div className="row g-3">
                  {assignedReps.map((r, i) => (
                    <div className="col-md-4" key={i}>
                      <div className="card border h-100" style={{ borderRadius: 12, transition: 'all .2s' }}>
                        <div className="card-body text-center py-4">
                          <div className="d-inline-flex align-items-center justify-content-center fw-bold text-white mb-2" style={{ width: 48, height: 48, borderRadius: 12, background: ['#2563eb', '#7c3aed', '#16a34a', '#ef4444', '#d97706'][i % 5], fontSize: '1rem' }}>
                            {(r.name || '').split(/\s+/).map(w => w[0] || '').join('').toUpperCase().slice(0, 2)}
                          </div>
                          <div className="fw-bold">{r.name}</div>
                          <div className="text-muted small">REP# {r.rep_number || '—'}</div>
                          <Link to={'/sales-reps/' + r._id} className="btn btn-sm btn-outline-primary mt-2 rounded-pill"><i className="bi bi-eye me-1"></i>View</Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ===== HISTORY TAB ===== */}
          {activeTab === 'history' && (
            <div>
              <h6 className="fw-bold mb-3"><i className="bi bi-clock-history me-2 text-primary"></i>Activity History</h6>
              <div className="text-center text-muted py-5"><i className="bi bi-clock-history fs-1 d-block mb-2 opacity-25"></i>No history records yet</div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
