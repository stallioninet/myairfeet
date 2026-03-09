import { useState, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { api } from '../../lib/api'

export default function ViewSalesRep() {
  const { id } = useParams()
  const [rep, setRep] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('profile')

  useEffect(() => {
    api.getSalesRep(id).then(data => {
      setRep(data)
      setLoading(false)
    }).catch(err => {
      toast.error('Failed to load: ' + err.message)
      setLoading(false)
    })
  }, [id])

  if (loading) return <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>
  if (!rep) return <div className="text-center py-5 text-muted">Sales rep not found</div>

  const name = rep.first_name + ' ' + rep.last_name
  const primaryAddr = (rep.addresses && rep.addresses[0]) || {}
  const secondaryAddr = (rep.addresses && rep.addresses[1]) || {}

  const tabs = [
    { key: 'profile', label: 'Details' },
    { key: 'customers', label: 'Customers' },
    { key: 'invoices', label: 'Invoices' },
    { key: 'commissions', label: 'Commissions' },
  ]

  return (
    <div>
      {/* Page Header */}
      <div className="d-flex justify-content-between align-items-start mb-4 flex-wrap gap-2">
        <div>
          <h2 className="mb-1">View Sales REP</h2>
          <nav aria-label="breadcrumb">
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item"><Link to="/dashboard"><i className="bi bi-house-door"></i></Link></li>
              <li className="breadcrumb-item"><Link to="/sales-reps/active">Sales Reps</Link></li>
              <li className="breadcrumb-item active">View Sales REP</li>
            </ol>
          </nav>
        </div>
        <div className="d-flex gap-2">
          <Link to={'/sales-reps/' + id + '/edit'} className="btn btn-primary">
            <i className="bi bi-pencil me-1"></i> Edit Rep
          </Link>
          <Link to="/sales-reps/active" className="btn btn-outline-secondary">
            <i className="bi bi-arrow-left me-1"></i> Back
          </Link>
        </div>
      </div>

      {/* Top Summary Row */}
      <div className="row g-4 mb-4">
        <div className="col-md-6">
          <div className="card border-0 shadow-sm h-100" style={{ borderRadius: 12 }}>
            <div className="card-body d-flex align-items-center gap-3">
              <div className="rounded-3 d-flex align-items-center justify-content-center" style={{ width: 44, height: 44, background: 'linear-gradient(135deg, #dbeafe, #bfdbfe)', color: '#2563eb' }}>
                <i className="bi bi-person-badge-fill fs-5"></i>
              </div>
              <div>
                <div className="text-muted small fw-semibold">SALES REP</div>
                <div className="fw-bold fs-5">{name.toUpperCase()}</div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-6">
          <div className="card border-0 shadow-sm h-100" style={{ borderRadius: 12 }}>
            <div className="card-body">
              <div className="text-muted small fw-semibold mb-2">SALES REP - COMMISSION DETAILS</div>
              <table className="w-100" style={{ fontSize: '0.85rem', borderCollapse: 'separate', borderSpacing: '0 2px' }}>
                <tbody>
                  {[
                    ['Total Commission', '$ 0.00'],
                    ['YTD Commission Outstanding', '$ 0.00'],
                    ['YTD Commission Paid', '$ 0.00'],
                  ].map(([label, val], i) => (
                    <tr key={i}>
                      <td className="text-white fw-semibold px-3 py-2" style={{ background: '#2563eb' }}>{label}</td>
                      <td className="text-white fw-semibold px-3 py-2" style={{ background: '#3b82f6', width: 120 }}>{val}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Card */}
      <div className="card border-0 shadow-sm" style={{ borderRadius: 12, overflow: 'hidden' }}>
        <div className="card-body p-0">
          <ul className="nav nav-tabs px-4 pt-2" style={{ borderBottom: '1px solid #e2e8f0' }}>
            {tabs.map(tab => (
              <li className="nav-item" key={tab.key}>
                <button
                  className={'nav-link border-0 ' + (activeTab === tab.key ? 'text-primary fw-bold' : 'text-secondary')}
                  style={{ fontSize: '0.9rem', padding: '10px 16px', borderBottom: activeTab === tab.key ? '2px solid #2563eb' : '2px solid transparent', background: 'transparent' }}
                  onClick={() => setActiveTab(tab.key)}
                >
                  {tab.label}
                </button>
              </li>
            ))}
          </ul>

          <div className="p-4">

            {/* ===== DETAILS TAB ===== */}
            {activeTab === 'profile' && (
              <div>
                <h6 className="mb-4 d-flex align-items-center gap-2">
                  <i className="bi bi-bar-chart-line text-primary"></i>
                  <span className="text-primary fw-bold">SALES REP INFORMATION</span>
                  <span className="text-muted fw-normal" style={{ fontSize: '0.85rem' }}>(REP# {rep.rep_number})</span>
                </h6>

                {/* Rep Info Panel */}
                <div className="card border mb-4" style={{ borderRadius: 8, overflow: 'hidden', maxWidth: 600 }}>
                  <div className="card-header d-flex justify-content-between align-items-center text-white py-2 px-3" style={{ background: 'linear-gradient(135deg, #2563eb, #3b82f6)', border: 'none' }}>
                    <span className="fw-semibold" style={{ fontSize: '0.9rem' }}><i className="bi bi-link-45deg me-1"></i> Sales REP Information #{rep.rep_number}</span>
                    <Link to={'/sales-reps/' + id + '/edit'} className="btn btn-sm btn-light py-0 px-2" style={{ fontSize: '0.8rem' }}>
                      <i className="bi bi-pencil me-1"></i>Edit
                    </Link>
                  </div>
                  <div className="card-body p-0">
                    <table className="table table-borderless mb-0" style={{ fontSize: '0.9rem' }}>
                      <tbody>
                        <tr><td className="text-muted fw-semibold" style={{ width: 130, padding: '8px 16px' }}>REP #:</td><td className="fw-semibold" style={{ padding: '8px 16px' }}>{rep.rep_number}</td></tr>
                        <tr><td className="text-muted fw-semibold" style={{ padding: '8px 16px' }}>Name:</td><td style={{ padding: '8px 16px' }}>{name}</td></tr>
                        <tr><td className="text-muted fw-semibold" style={{ padding: '8px 16px' }}>Email:</td><td style={{ padding: '8px 16px' }}><a href={'mailto:' + rep.email} className="text-decoration-none">{rep.email}</a></td></tr>
                        <tr><td className="text-muted fw-semibold" style={{ padding: '8px 16px' }}>Phone#</td><td style={{ padding: '8px 16px' }}></td></tr>
                        {rep.phones && rep.phones.length > 0 ? rep.phones.map((p, i) => (
                          <tr key={i}><td className="text-muted fw-semibold" style={{ padding: '4px 16px 4px 30px' }}>{p.type}:</td><td style={{ padding: '4px 16px' }}>{p.number}{p.ext ? ', ext ' + p.ext : ''}</td></tr>
                        )) : (
                          <tr><td className="text-muted fw-semibold" style={{ padding: '4px 16px 4px 30px' }}>Main:</td><td style={{ padding: '4px 16px' }}>{rep.phone || '—'}</td></tr>
                        )}
                        <tr><td className="text-muted fw-semibold" style={{ padding: '8px 16px' }}>Notes:</td><td style={{ padding: '8px 16px' }}>{rep.about || '—'}</td></tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Address Panel */}
                <div className="card border mb-4" style={{ borderRadius: 8, overflow: 'hidden', maxWidth: 600 }}>
                  <div className="card-header text-white py-2 px-3" style={{ background: 'linear-gradient(135deg, #16a34a, #22c55e)', border: 'none' }}>
                    <span className="fw-semibold" style={{ fontSize: '0.9rem' }}><i className="bi bi-geo-alt me-1"></i> {primaryAddr.label || 'Address'}</span>
                  </div>
                  <div className="card-body p-0">
                    <table className="table table-borderless mb-0" style={{ fontSize: '0.9rem' }}>
                      <tbody>
                        <tr><td className="text-muted fw-semibold" style={{ width: 150, padding: '8px 16px' }}>Street Address :</td><td style={{ padding: '8px 16px' }}>{primaryAddr.street || rep.address || '—'}</td></tr>
                        <tr><td className="text-muted fw-semibold" style={{ padding: '8px 16px' }}>City :</td><td style={{ padding: '8px 16px' }}>{primaryAddr.city || rep.city || '—'}</td></tr>
                        <tr><td className="text-muted fw-semibold" style={{ padding: '8px 16px' }}>State :</td><td style={{ padding: '8px 16px' }}>{primaryAddr.state || rep.state || '—'}</td></tr>
                        <tr><td className="text-muted fw-semibold" style={{ padding: '8px 16px' }}>Zip Code :</td><td style={{ padding: '8px 16px' }}>{primaryAddr.zip || rep.zip || '—'}</td></tr>
                        <tr><td className="text-muted fw-semibold" style={{ padding: '8px 16px' }}>Country :</td><td style={{ padding: '8px 16px' }}>{primaryAddr.country || 'US'}</td></tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Address 2 */}
                {(secondaryAddr.street || secondaryAddr.city) && (
                  <div className="card border mb-4" style={{ borderRadius: 8, overflow: 'hidden', maxWidth: 600 }}>
                    <div className="card-header text-white py-2 px-3" style={{ background: 'linear-gradient(135deg, #16a34a, #22c55e)', border: 'none' }}>
                      <span className="fw-semibold" style={{ fontSize: '0.9rem' }}><i className="bi bi-geo-alt me-1"></i> {secondaryAddr.label || 'Address 2'}</span>
                    </div>
                    <div className="card-body p-0">
                      <table className="table table-borderless mb-0" style={{ fontSize: '0.9rem' }}>
                        <tbody>
                          <tr><td className="text-muted fw-semibold" style={{ width: 150, padding: '8px 16px' }}>Street Address :</td><td style={{ padding: '8px 16px' }}>{secondaryAddr.street || '—'}</td></tr>
                          <tr><td className="text-muted fw-semibold" style={{ padding: '8px 16px' }}>City :</td><td style={{ padding: '8px 16px' }}>{secondaryAddr.city || '—'}</td></tr>
                          <tr><td className="text-muted fw-semibold" style={{ padding: '8px 16px' }}>State :</td><td style={{ padding: '8px 16px' }}>{secondaryAddr.state || '—'}</td></tr>
                          <tr><td className="text-muted fw-semibold" style={{ padding: '8px 16px' }}>Zip Code :</td><td style={{ padding: '8px 16px' }}>{secondaryAddr.zip || '—'}</td></tr>
                          <tr><td className="text-muted fw-semibold" style={{ padding: '8px 16px' }}>Country :</td><td style={{ padding: '8px 16px' }}>{secondaryAddr.country || 'US'}</td></tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ===== CUSTOMERS TAB ===== */}
            {activeTab === 'customers' && (
              <div>
                <div className="d-flex align-items-center gap-3 mb-3">
                  <h6 className="fw-bold mb-0 text-primary">CUSTOMERS</h6>
                  <button className="btn btn-primary btn-sm"><i className="bi bi-plus me-1"></i>New Order</button>
                </div>
                <div className="d-flex justify-content-end align-items-center gap-2 mb-3">
                  <input type="text" className="form-control form-control-sm" placeholder="Search" style={{ width: 180 }} />
                  <button className="btn btn-outline-secondary btn-sm" title="Refresh"><i className="bi bi-arrow-clockwise"></i></button>
                  <button className="btn btn-outline-secondary btn-sm" title="Table View"><i className="bi bi-table"></i></button>
                  <div className="dropdown">
                    <button className="btn btn-outline-secondary btn-sm dropdown-toggle" title="Grid Options" data-bs-toggle="dropdown"><i className="bi bi-grid-3x3-gap"></i></button>
                  </div>
                </div>
                <div className="table-responsive">
                  <table className="table table-bordered table-hover align-middle mb-0">
                    <thead className="bg-light"><tr><th style={{ width: 80 }}>Line</th><th>Cust#</th><th>CustName</th><th style={{ width: 100 }}>Action</th></tr></thead>
                    <tbody><tr><td colSpan="4" className="text-center text-muted py-5"><i className="bi bi-building fs-1 d-block mb-2 opacity-25"></i>No customers assigned yet</td></tr></tbody>
                  </table>
                </div>
                <div className="text-primary small mt-2">Showing 0 to 0 of 0 rows</div>
              </div>
            )}

            {/* ===== INVOICES TAB ===== */}
            {activeTab === 'invoices' && (
              <div>
                <h6 className="fw-bold mb-0 text-primary">INVOICE</h6>
                <div className="d-flex justify-content-end align-items-center gap-2 mb-3 mt-3">
                  <input type="text" className="form-control form-control-sm" placeholder="Search" style={{ width: 180 }} />
                  <button className="btn btn-outline-secondary btn-sm" title="Refresh"><i className="bi bi-arrow-clockwise"></i></button>
                  <button className="btn btn-outline-secondary btn-sm" title="Table View"><i className="bi bi-table"></i></button>
                  <div className="dropdown">
                    <button className="btn btn-outline-secondary btn-sm dropdown-toggle" title="Grid Options" data-bs-toggle="dropdown"><i className="bi bi-grid-3x3-gap"></i></button>
                  </div>
                </div>
                <div className="table-responsive">
                  <table className="table table-bordered table-hover align-middle mb-0">
                    <thead className="bg-light"><tr><th style={{ width: 70 }}>Line</th><th>Customer</th><th>Date</th><th>Po#</th><th>Invoice#</th><th>Qty</th><th>InvTotal</th><th style={{ width: 100 }}>Action</th></tr></thead>
                    <tbody><tr><td colSpan="8" className="text-center text-muted py-5"><i className="bi bi-file-earmark-text fs-1 d-block mb-2 opacity-25"></i>No invoices yet</td></tr></tbody>
                  </table>
                </div>
                <div className="text-primary small mt-2">Showing 0 to 0 of 0 rows</div>
              </div>
            )}

            {/* ===== COMMISSIONS TAB ===== */}
            {activeTab === 'commissions' && (
              <div>
                <h6 className="fw-bold mb-0 text-primary">COMMISSION</h6>
                <div className="d-flex justify-content-end align-items-center gap-2 mb-3 mt-3">
                  <input type="text" className="form-control form-control-sm" placeholder="Search" style={{ width: 180 }} />
                  <button className="btn btn-outline-secondary btn-sm" title="Refresh"><i className="bi bi-arrow-clockwise"></i></button>
                  <button className="btn btn-outline-secondary btn-sm" title="Table View"><i className="bi bi-table"></i></button>
                  <div className="dropdown">
                    <button className="btn btn-outline-secondary btn-sm dropdown-toggle" title="Grid Options" data-bs-toggle="dropdown"><i className="bi bi-grid-3x3-gap"></i></button>
                  </div>
                </div>
                <div className="table-responsive">
                  <table className="table table-bordered table-hover align-middle mb-0">
                    <thead className="bg-light"><tr><th style={{ width: 70 }}>Line</th><th>Invoice #</th><th>Invoice Date</th><th>Qty</th><th>PO Total</th><th>ComTotal</th><th>REPComTotal</th><th>CommPaid</th><th style={{ width: 80 }}>Action</th></tr></thead>
                    <tbody><tr><td colSpan="9" className="text-center text-muted py-5"><i className="bi bi-cash-stack fs-1 d-block mb-2 opacity-25"></i>No commission records yet</td></tr></tbody>
                  </table>
                </div>
                <div className="text-primary small mt-2">Showing 0 to 0 of 0 rows</div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  )
}
