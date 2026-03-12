import { useState, useEffect, useRef } from 'react'
import { Link, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import html2pdf from 'html2pdf.js'
import { api } from '../../lib/api'

const US_STATES = ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY']
const PHONE_TYPES = ['Main', 'Work', 'Desk', 'Home', 'Mobile']

export default function ViewSalesRep() {
  const { id } = useParams()
  const [rep, setRep] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('profile')
  const [customers, setCustomers] = useState([])
  const [custLoading, setCustLoading] = useState(false)
  const [custSearch, setCustSearch] = useState('')
  const [invoices, setInvoices] = useState([])
  const [invLoading, setInvLoading] = useState(false)
  const [invSearch, setInvSearch] = useState('')
  const [commissions, setCommissions] = useState([])
  const [commLoading, setCommLoading] = useState(false)
  const [commSearch, setCommSearch] = useState('')
  const [commStats, setCommStats] = useState({ total_commission: 0, ytd_outstanding: 0, ytd_paid: 0 })
  const [custPage, setCustPage] = useState(1)
  const [custPerPage, setCustPerPage] = useState(10)
  const [invPage, setInvPage] = useState(1)
  const [invPerPage, setInvPerPage] = useState(10)
  const [commPage, setCommPage] = useState(1)
  const [commPerPage, setCommPerPage] = useState(10)
  const [showInvModal, setShowInvModal] = useState(false)
  const [invDetail, setInvDetail] = useState(null)
  const [invDetailLoading, setInvDetailLoading] = useState(false)
  const invPrintRef = useRef(null)
  const packPrintRef = useRef(null)
  const [showPackModal, setShowPackModal] = useState(false)
  const [packDetail, setPackDetail] = useState(null)
  const [packDetailLoading, setPackDetailLoading] = useState(false)
  const [showCustModal, setShowCustModal] = useState(false)
  const [custDetail, setCustDetail] = useState(null)
  const [custDetailLoading, setCustDetailLoading] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editForm, setEditForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [editPhones, setEditPhones] = useState([{ number: '', ext: '', type: 'Main' }])
  const [editAddresses, setEditAddresses] = useState([
    { street: '', city: '', state: '', zip: '', country: 'United States' },
    { street: '', city: '', state: '', zip: '', country: 'United States' }
  ])
  const [showPassword, setShowPassword] = useState(false)
  const [addrLabels, setAddrLabels] = useState(['Address', 'Address'])
  const [editingLabel, setEditingLabel] = useState(null)
  const [labelDraft, setLabelDraft] = useState('')

  useEffect(() => {
    api.getSalesRep(id).then(data => {
      setRep(data)
      setLoading(false)
    }).catch(err => {
      toast.error('Failed to load: ' + err.message)
      setLoading(false)
    })
  }, [id])

  // Load invoices and commissions on mount for header
  useEffect(() => {
    setInvLoading(true)
    api.getSalesRepInvoices(id).then(data => {
      setInvoices(data || [])
      setInvLoading(false)
    }).catch(() => setInvLoading(false))
    setCommLoading(true)
    api.getSalesRepCommissions(id).then(data => {
      setCommissions(data || [])
      setCommLoading(false)
    }).catch(() => setCommLoading(false))
    api.getSalesRepCommissionStats(id).then(data => {
      setCommStats(data || { total_commission: 0, ytd_outstanding: 0, ytd_paid: 0 })
    }).catch(() => {})
  }, [id])

  useEffect(() => {
    if (activeTab === 'customers' && customers.length === 0 && !custLoading) {
      setCustLoading(true)
      api.getSalesRepCustomers(id).then(data => {
        setCustomers(data || [])
        setCustLoading(false)
      }).catch(() => setCustLoading(false))
    }
  }, [activeTab])

  async function openInvModal(inv) {
    setInvDetailLoading(true)
    setShowInvModal(true)
    setInvDetail(null)
    try {
      const data = await api.getInvoiceDetail(inv.legacy_id)
      setInvDetail(data)
    } catch (err) {
      toast.error('Failed to load invoice: ' + err.message)
    }
    setInvDetailLoading(false)
  }

  async function downloadPdf(ref, filename) {
    if (!ref.current) return
    const el = ref.current
    // Hide buttons using a CSS class injection
    const style = document.createElement('style')
    style.textContent = '.pdf-hide { display: none !important; }'
    document.head.appendChild(style)
    // Force layout recalc
    el.offsetHeight
    try {
      await html2pdf().set({
        margin: [10, 10, 10, 10],
        filename: filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, scrollY: 0 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      }).from(el).save()
    } finally {
      document.head.removeChild(style)
    }
  }

  async function openPackModal(inv) {
    setPackDetailLoading(true)
    setShowPackModal(true)
    setPackDetail(null)
    try {
      const data = await api.getInvoiceDetail(inv.legacy_id)
      setPackDetail(data)
    } catch (err) {
      toast.error('Failed to load packing slip: ' + err.message)
    }
    setPackDetailLoading(false)
  }

  async function openCustModal(c) {
    setCustDetailLoading(true)
    setShowCustModal(true)
    setCustDetail(null)
    try {
      const data = await api.getCustomer(c._id)
      setCustDetail(data)
    } catch {
      setCustDetail({ company_name: c.company_name, customer_code: c.customer_code, _error: true })
    }
    setCustDetailLoading(false)
  }

  function openEditModal() {
    setEditForm({
      rep_number: rep.rep_number || '',
      first_name: rep.first_name || '',
      last_name: rep.last_name || '',
      username: rep.username || '',
      email: rep.email || '',
      user_cust_code: rep.rep_number || '',
      user_notes: rep.user_notes || '',
      about: rep.about || '',
      password: '',
    })
    // Populate phones
    if (rep.phones && rep.phones.length > 0) {
      setEditPhones(rep.phones.map(p => ({ number: p.number || '', ext: p.ext || '', type: p.type || 'Main' })))
    } else {
      setEditPhones([{ number: rep.phone || '', ext: rep.extension || '', type: 'Main' }])
    }
    // Populate addresses
    const addrs = rep.addresses || []
    if (addrs.length > 0) {
      setEditAddresses([
        { street: addrs[0]?.address_1 || '', city: addrs[0]?.city || '', state: addrs[0]?.state || '', zip: addrs[0]?.post_code || '', country: addrs[0]?.country || 'United States' },
        { street: addrs[1]?.address_1 || '', city: addrs[1]?.city || '', state: addrs[1]?.state || '', zip: addrs[1]?.post_code || '', country: addrs[1]?.country || 'United States' }
      ])
      setAddrLabels([addrs[0]?.address_label || 'Address', addrs[1]?.address_label || 'Address'])
    } else {
      setEditAddresses([
        { street: '', city: '', state: '', zip: '', country: 'United States' },
        { street: '', city: '', state: '', zip: '', country: 'United States' }
      ])
      setAddrLabels(['Address', 'Address'])
    }
    setShowPassword(false)
    setEditingLabel(null)
    setShowEditModal(true)
  }

  function setEditPhone(idx, key, val) {
    const arr = [...editPhones]
    arr[idx][key] = val
    setEditPhones(arr)
  }

  function setEditAddr(idx, key, val) {
    const arr = [...editAddresses]
    arr[idx][key] = val
    setEditAddresses(arr)
  }

  async function handleSaveEdit(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const validPhones = editPhones.filter(p => p.number.trim())
      const primaryAddr = editAddresses[0] || {}
      const payload = {
        ...editForm,
        phones: validPhones,
        phone: validPhones.length > 0 ? validPhones[0].number : '',
        extension: validPhones.length > 0 ? validPhones[0].ext : '',
        addresses: editAddresses.map((a, i) => ({ ...a, label: addrLabels[i] || 'Address' })),
        address: primaryAddr.street || '',
        city: primaryAddr.city || '',
        state: primaryAddr.state || '',
        zip: primaryAddr.zip || '',
      }
      if (!payload.password) delete payload.password
      await api.updateSalesRep(id, payload)
      const fresh = await api.getSalesRep(id)
      setRep(fresh)
      setShowEditModal(false)
      toast.success('Sales rep updated')
    } catch (err) {
      toast.error('Failed to update: ' + err.message)
    }
    setSaving(false)
  }

  if (loading) return <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>
  if (!rep) return <div className="text-center py-5 text-muted">Sales rep not found</div>

  const name = rep.first_name + ' ' + rep.last_name
  const addresses = rep.addresses || []
  const contacts = rep.contacts || []

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
          <button className="btn btn-primary" onClick={openEditModal}>
            <i className="bi bi-pencil me-1"></i> Edit Rep
          </button>
          <Link to="/sales-reps/active" className="btn btn-outline-secondary">
            <i className="bi bi-arrow-left me-1"></i> Back
          </Link>
        </div>
      </div>

      {/* Top Summary Row */}
      <div className="row g-4 mb-4">
        <div className="col-md-6">
          <div className="stat-card h-100">
            <div className="d-flex align-items-center gap-3">
              <div className="stat-icon" style={{ background: '#eff6ff', color: '#2563eb' }}>
                <i className="bi bi-person-badge-fill"></i>
              </div>
              <div>
                <div className="stat-label">SALES REP</div>
                <div className="stat-value">{name.toUpperCase()}</div>
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
                  {(() => {
                    const fmt = v => '$ ' + (v || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                    return [
                      ['Total Commission', fmt(commStats.total_commission)],
                      ['YTD Commission Outstanding', fmt(commStats.ytd_outstanding)],
                      ['YTD Commission Paid', fmt(commStats.ytd_paid)],
                    ]
                  })().map(([label, val], i) => (
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

                <div className="row g-4">
                  {/* LEFT: Rep Info + Contact Numbers */}
                  <div className="col-md-6">
                    <div className="card border mb-4" style={{ borderRadius: 8, overflow: 'hidden' }}>
                      <div className="card-header d-flex justify-content-between align-items-center text-white py-2 px-3" style={{ background: 'linear-gradient(135deg, #2563eb, #1e40af)', border: 'none' }}>
                        <span className="fw-semibold" style={{ fontSize: '0.9rem' }}><i className="bi bi-link-45deg me-1"></i> Sales REP Information #{rep.rep_number}</span>
                        <button className="btn btn-sm btn-light py-0 px-2" style={{ fontSize: '0.8rem' }} onClick={openEditModal}>
                          <i className="bi bi-pencil me-1"></i>Edit
                        </button>
                      </div>
                      <div className="card-body p-0">
                        <table className="table table-borderless mb-0" style={{ fontSize: '0.9rem' }}>
                          <tbody>
                            <tr><td className="text-muted fw-semibold" style={{ width: 130, padding: '8px 16px' }}>REP #:</td><td className="fw-semibold" style={{ padding: '8px 16px' }}>{rep.rep_number}</td></tr>
                            <tr><td className="text-muted fw-semibold" style={{ padding: '8px 16px' }}>Name:</td><td style={{ padding: '8px 16px' }}>{name}</td></tr>
                            <tr><td className="text-muted fw-semibold" style={{ padding: '8px 16px' }}>Username:</td><td style={{ padding: '8px 16px' }}>{rep.username || '—'}</td></tr>
                            <tr><td className="text-muted fw-semibold" style={{ padding: '8px 16px' }}>Email:</td><td style={{ padding: '8px 16px' }}><a href={'mailto:' + rep.email} className="text-decoration-none">{rep.email}</a></td></tr>
                            <tr><td className="text-muted fw-semibold" style={{ padding: '8px 16px' }}>Phone:</td><td style={{ padding: '8px 16px' }}>{rep.phone || '—'}{rep.extension ? ' x' + rep.extension : ''}</td></tr>
                            {contacts.map((c, i) => (
                              <tr key={'c' + i}><td className="text-muted fw-semibold" style={{ padding: '8px 16px' }}>{c.contact_type}:</td><td style={{ padding: '8px 16px' }}>{c.contact_number || '—'}{c.extension ? ' x' + c.extension : ''}</td></tr>
                            ))}
                            <tr><td className="text-muted fw-semibold" style={{ padding: '8px 16px' }}>Notes:</td><td style={{ padding: '8px 16px' }}>{rep.user_notes ? <span dangerouslySetInnerHTML={{ __html: rep.user_notes }} /> : '—'}</td></tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                  {/* RIGHT: Address Panels */}
                  <div className="col-md-6">
                    {addresses.length > 0 ? addresses.map((addr, i) => (
                      <div className="card border mb-4" key={i} style={{ borderRadius: 8, overflow: 'hidden' }}>
                        <div className="card-header text-white py-2 px-3" style={{ background: 'linear-gradient(135deg, #16a34a, #22c55e)', border: 'none' }}>
                          <span className="fw-semibold" style={{ fontSize: '0.9rem' }}><i className="bi bi-geo-alt me-1"></i> {addr.address_label || 'Address'}</span>
                        </div>
                        <div className="card-body p-0">
                          <table className="table table-borderless mb-0" style={{ fontSize: '0.9rem' }}>
                            <tbody>
                              <tr><td className="text-muted fw-semibold" style={{ width: 150, padding: '8px 16px' }}>Street Address :</td><td style={{ padding: '8px 16px' }}>{addr.address_1 || '—'}</td></tr>
                              {addr.address_2 && <tr><td className="text-muted fw-semibold" style={{ padding: '8px 16px' }}>Address 2 :</td><td style={{ padding: '8px 16px' }}>{addr.address_2}</td></tr>}
                              <tr><td className="text-muted fw-semibold" style={{ padding: '8px 16px' }}>City :</td><td style={{ padding: '8px 16px' }}>{addr.city || '—'}</td></tr>
                              <tr><td className="text-muted fw-semibold" style={{ padding: '8px 16px' }}>State :</td><td style={{ padding: '8px 16px' }}>{addr.state || '—'}</td></tr>
                              <tr><td className="text-muted fw-semibold" style={{ padding: '8px 16px' }}>Zip Code :</td><td style={{ padding: '8px 16px' }}>{addr.post_code || '—'}</td></tr>
                              <tr><td className="text-muted fw-semibold" style={{ padding: '8px 16px' }}>Country :</td><td style={{ padding: '8px 16px' }}>{addr.country || 'US'}</td></tr>
                              {addr.phone_number && <tr><td className="text-muted fw-semibold" style={{ padding: '8px 16px' }}>Phone :</td><td style={{ padding: '8px 16px' }}>{addr.phone_number}{addr.extension ? ' x' + addr.extension : ''}</td></tr>}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )) : (
                      <div className="card border mb-4" style={{ borderRadius: 8, overflow: 'hidden' }}>
                        <div className="card-header text-white py-2 px-3" style={{ background: 'linear-gradient(135deg, #16a34a, #22c55e)', border: 'none' }}>
                          <span className="fw-semibold" style={{ fontSize: '0.9rem' }}><i className="bi bi-geo-alt me-1"></i> Address</span>
                        </div>
                        <div className="card-body text-center text-muted py-4">No address on file</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ===== CUSTOMERS TAB ===== */}
            {activeTab === 'customers' && (() => {
              const filteredCust = customers.filter(c => {
                if (!custSearch) return true
                const s = custSearch.toLowerCase()
                return c.customer_code?.toLowerCase().includes(s) || c.company_name?.toLowerCase().includes(s)
              })
              const totalPages = Math.ceil(filteredCust.length / custPerPage) || 1
              const startIdx = (custPage - 1) * custPerPage
              const pageData = filteredCust.slice(startIdx, startIdx + custPerPage)
              return (
                <div>
                  <div className="d-flex align-items-center gap-3 mb-3">
                    <h6 className="fw-bold mb-0 text-primary">CUSTOMERS</h6>
                    <button className="btn btn-primary btn-sm"><i className="bi bi-plus me-1"></i>New Order</button>
                  </div>
                  <div className="d-flex justify-content-end align-items-center gap-2 mb-3">
                    <input type="text" className="form-control form-control-sm" placeholder="Search" style={{ width: 180 }} value={custSearch} onChange={e => { setCustSearch(e.target.value); setCustPage(1) }} />
                    <button className="btn btn-outline-secondary btn-sm" title="Refresh" onClick={() => { setCustLoading(true); setCustPage(1); api.getSalesRepCustomers(id).then(d => { setCustomers(d || []); setCustLoading(false) }).catch(() => setCustLoading(false)) }}><i className="bi bi-arrow-clockwise"></i></button>
                    <button className="btn btn-outline-secondary btn-sm" title="Table View"><i className="bi bi-table"></i></button>
                    <div className="dropdown">
                      <button className="btn btn-outline-secondary btn-sm dropdown-toggle" title="Grid Options" data-bs-toggle="dropdown"><i className="bi bi-grid-3x3-gap"></i></button>
                    </div>
                  </div>
                  <div className="table-responsive">
                    <table className="table table-hover align-middle mb-0">
                      <thead className="bg-light">
                        <tr>
                          <th style={{ width: 80 }}>Line</th>
                          <th>Cust#</th>
                          <th>CustName</th>
                          <th style={{ width: 100 }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {custLoading ? (
                          <tr><td colSpan="4" className="text-center py-4"><div className="spinner-border spinner-border-sm text-primary me-2"></div>Loading...</td></tr>
                        ) : pageData.length === 0 ? (
                          <tr><td colSpan="4" className="text-center text-muted py-5"><i className="bi bi-building fs-1 d-block mb-2 opacity-25"></i>No customers assigned yet</td></tr>
                        ) : pageData.map((c, i) => (
                          <tr key={c._id || i}>
                            <td className="fw-semibold text-primary">{startIdx + i + 1}</td>
                            <td>{c.customer_code}</td>
                            <td>{c.company_name}</td>
                            <td>
                              <button className="btn btn-sm btn-action btn-outline-info" title="View" onClick={() => openCustModal(c)}>
                                <i className="bi bi-eye"></i>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="d-flex justify-content-between align-items-center mt-2">
                    <div className="text-primary small">Showing {filteredCust.length > 0 ? startIdx + 1 : 0} to {Math.min(startIdx + custPerPage, filteredCust.length)} of {filteredCust.length} rows</div>
                    <div className="d-flex align-items-center gap-2">
                      <select className="form-select form-select-sm" style={{ width: 'auto' }} value={custPerPage} onChange={e => { setCustPerPage(Number(e.target.value)); setCustPage(1) }}>
                        {[10, 25, 50, 100].map(n => <option key={n} value={n}>{n} / page</option>)}
                      </select>
                      <nav><ul className="pagination pagination-sm mb-0">
                        <li className={'page-item' + (custPage <= 1 ? ' disabled' : '')}><button className="page-link" onClick={() => setCustPage(1)}><i className="bi bi-chevron-double-left"></i></button></li>
                        <li className={'page-item' + (custPage <= 1 ? ' disabled' : '')}><button className="page-link" onClick={() => setCustPage(p => Math.max(1, p - 1))}><i className="bi bi-chevron-left"></i></button></li>
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          let p = custPage - 2 + i
                          if (p < 1) p = i + 1
                          if (p > totalPages) return null
                          return <li key={p} className={'page-item' + (p === custPage ? ' active' : '')}><button className="page-link" onClick={() => setCustPage(p)}>{p}</button></li>
                        })}
                        <li className={'page-item' + (custPage >= totalPages ? ' disabled' : '')}><button className="page-link" onClick={() => setCustPage(p => Math.min(totalPages, p + 1))}><i className="bi bi-chevron-right"></i></button></li>
                        <li className={'page-item' + (custPage >= totalPages ? ' disabled' : '')}><button className="page-link" onClick={() => setCustPage(totalPages)}><i className="bi bi-chevron-double-right"></i></button></li>
                      </ul></nav>
                    </div>
                  </div>
                </div>
              )
            })()}

            {/* ===== INVOICES TAB ===== */}
            {activeTab === 'invoices' && (() => {
              const filteredInv = invoices.filter(inv => {
                if (!invSearch) return true
                const s = invSearch.toLowerCase()
                return (inv.company_name || '').toLowerCase().includes(s)
                  || (inv.invoice_number || '').toLowerCase().includes(s)
                  || (inv.po_number || '').toLowerCase().includes(s)
              })
              const fmt = v => '$ ' + (v || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
              const totalPages = Math.ceil(filteredInv.length / invPerPage) || 1
              const startIdx = (invPage - 1) * invPerPage
              const pageData = filteredInv.slice(startIdx, startIdx + invPerPage)
              return (
                <div>
                  <h6 className="fw-bold mb-0 text-primary">INVOICE</h6>
                  <div className="d-flex justify-content-end align-items-center gap-2 mb-3 mt-3">
                    <input type="text" className="form-control form-control-sm" placeholder="Search" style={{ width: 180 }} value={invSearch} onChange={e => { setInvSearch(e.target.value); setInvPage(1) }} />
                    <button className="btn btn-outline-secondary btn-sm" title="Refresh" onClick={() => { setInvoices([]); setInvLoading(true); setInvPage(1); api.getSalesRepInvoices(id).then(d => { setInvoices(d || []); setInvLoading(false) }).catch(() => setInvLoading(false)) }}><i className="bi bi-arrow-clockwise"></i></button>
                    <button className="btn btn-outline-secondary btn-sm" title="Table View"><i className="bi bi-table"></i></button>
                    <div className="dropdown">
                      <button className="btn btn-outline-secondary btn-sm dropdown-toggle" title="Grid Options" data-bs-toggle="dropdown"><i className="bi bi-grid-3x3-gap"></i></button>
                    </div>
                  </div>
                  {invLoading ? (
                    <div className="text-center py-5"><div className="spinner-border text-primary"></div><div className="mt-2 text-muted">Loading invoices...</div></div>
                  ) : (
                    <div className="table-responsive">
                      <table className="table table-hover align-middle mb-0">
                        <thead className="bg-light">
                          <tr>
                            <th style={{ width: 60 }}>Line</th>
                            <th>Customer</th>
                            <th>Date</th>
                            <th>Po#</th>
                            <th>Invoice#</th>
                            <th>Qty</th>
                            <th>InvTotal</th>
                            <th style={{ width: 100 }}>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pageData.length === 0 ? (
                            <tr><td colSpan="8" className="text-center text-muted py-5"><i className="bi bi-file-earmark-text fs-1 d-block mb-2 opacity-25"></i>No invoices found</td></tr>
                          ) : pageData.map((inv, idx) => (
                            <tr key={inv._id}>
                              <td>{startIdx + idx + 1}</td>
                              <td>{inv.company_name}</td>
                              <td>{inv.invoice_date ? new Date(inv.invoice_date).toLocaleDateString() : '-'}</td>
                              <td><span className="badge bg-info text-dark">{inv.po_number || '-'}</span></td>
                              <td><span className="badge bg-info text-dark">{inv.invoice_number || '-'}</span></td>
                              <td>{inv.total_qty}</td>
                              <td>{fmt(inv.net_amount)}</td>
                              <td className="text-center">
                                <button className="btn btn-sm btn-outline-secondary me-1" title="View Invoice" onClick={() => openInvModal(inv)}><i className="bi bi-file-earmark-text"></i></button>
                                <button className="btn btn-sm btn-outline-secondary" title="Packing Slip" onClick={() => openPackModal(inv)}><i className="bi bi-box-seam"></i></button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  <div className="d-flex justify-content-between align-items-center mt-2">
                    <div className="text-primary small">Showing {filteredInv.length > 0 ? startIdx + 1 : 0} to {Math.min(startIdx + invPerPage, filteredInv.length)} of {filteredInv.length} rows</div>
                    <div className="d-flex align-items-center gap-2">
                      <select className="form-select form-select-sm" style={{ width: 'auto' }} value={invPerPage} onChange={e => { setInvPerPage(Number(e.target.value)); setInvPage(1) }}>
                        {[10, 25, 50, 100].map(n => <option key={n} value={n}>{n} / page</option>)}
                      </select>
                      <nav><ul className="pagination pagination-sm mb-0">
                        <li className={'page-item' + (invPage <= 1 ? ' disabled' : '')}><button className="page-link" onClick={() => setInvPage(1)}><i className="bi bi-chevron-double-left"></i></button></li>
                        <li className={'page-item' + (invPage <= 1 ? ' disabled' : '')}><button className="page-link" onClick={() => setInvPage(p => Math.max(1, p - 1))}><i className="bi bi-chevron-left"></i></button></li>
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          let p = invPage - 2 + i
                          if (p < 1) p = i + 1
                          if (p > totalPages) return null
                          return <li key={p} className={'page-item' + (p === invPage ? ' active' : '')}><button className="page-link" onClick={() => setInvPage(p)}>{p}</button></li>
                        })}
                        <li className={'page-item' + (invPage >= totalPages ? ' disabled' : '')}><button className="page-link" onClick={() => setInvPage(p => Math.min(totalPages, p + 1))}><i className="bi bi-chevron-right"></i></button></li>
                        <li className={'page-item' + (invPage >= totalPages ? ' disabled' : '')}><button className="page-link" onClick={() => setInvPage(totalPages)}><i className="bi bi-chevron-double-right"></i></button></li>
                      </ul></nav>
                    </div>
                  </div>
                </div>
              )
            })()}

            {/* ===== COMMISSIONS TAB ===== */}
            {activeTab === 'commissions' && (() => {
              const filteredComm = commissions.filter(c => {
                if (!commSearch) return true
                const s = commSearch.toLowerCase()
                return (c.invoice_number || '').toLowerCase().includes(s)
              })
              const fmt = v => '$ ' + (v || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
              const totalPages = Math.ceil(filteredComm.length / commPerPage) || 1
              const startIdx = (commPage - 1) * commPerPage
              const pageData = filteredComm.slice(startIdx, startIdx + commPerPage)
              return (
                <div>
                  <h6 className="fw-bold mb-0 text-primary">COMMISSION</h6>
                  <div className="d-flex justify-content-end align-items-center gap-2 mb-3 mt-3">
                    <input type="text" className="form-control form-control-sm" placeholder="Search" style={{ width: 180 }} value={commSearch} onChange={e => { setCommSearch(e.target.value); setCommPage(1) }} />
                    <button className="btn btn-outline-secondary btn-sm" title="Refresh" onClick={() => { setCommissions([]); setCommLoading(true); setCommPage(1); api.getSalesRepCommissions(id).then(d => { setCommissions(d || []); setCommLoading(false) }).catch(() => setCommLoading(false)) }}><i className="bi bi-arrow-clockwise"></i></button>
                    <button className="btn btn-outline-secondary btn-sm" title="Table View"><i className="bi bi-table"></i></button>
                    <div className="dropdown">
                      <button className="btn btn-outline-secondary btn-sm dropdown-toggle" title="Grid Options" data-bs-toggle="dropdown"><i className="bi bi-grid-3x3-gap"></i></button>
                    </div>
                  </div>
                  {commLoading ? (
                    <div className="text-center py-5"><div className="spinner-border text-primary"></div><div className="mt-2 text-muted">Loading commissions...</div></div>
                  ) : (
                    <div className="table-responsive">
                      <table className="table table-hover align-middle mb-0">
                        <thead className="bg-light">
                          <tr>
                            <th style={{ width: 60 }}>Line</th>
                            <th>Invoice #</th>
                            <th>Invoice Date</th>
                            <th>Qty</th>
                            <th>PO Total</th>
                            <th>ComTotal</th>
                            <th>REPComTotal</th>
                            <th>CommPaid</th>
                            <th style={{ width: 80 }}>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pageData.length === 0 ? (
                            <tr><td colSpan="9" className="text-center text-muted py-5"><i className="bi bi-cash-stack fs-1 d-block mb-2 opacity-25"></i>No commission records found</td></tr>
                          ) : pageData.map((c, idx) => (
                            <tr key={c._id}>
                              <td className="text-success fw-semibold">{startIdx + idx + 1}</td>
                              <td>{c.invoice_number}</td>
                              <td>{c.invoice_date ? new Date(c.invoice_date).toLocaleDateString() : '-'}</td>
                              <td>{c.total_qty}</td>
                              <td>{fmt(c.po_total)}</td>
                              <td>{fmt(c.com_total)}</td>
                              <td>{fmt(c.rep_com_total)}</td>
                              <td>
                                {c.commission_paid_status === 1 ? (
                                  <span className="px-2 py-1 rounded" style={{ background: '#dcfce7', color: '#16a34a', fontSize: '0.85rem' }}>
                                    Paid{c.comm_paid_date ? ' :\u00a0' : ''}<br />{c.comm_paid_date ? new Date(c.comm_paid_date).toLocaleDateString() : ''}
                                  </span>
                                ) : (
                                  <span className="px-2 py-1 rounded" style={{ background: '#fee2e2', color: '#dc2626', fontSize: '0.85rem' }}>
                                    Zero Payment :{c.comm_paid_date ? <><br />{new Date(c.comm_paid_date).toLocaleDateString()}</> : ''}
                                  </span>
                                )}
                              </td>
                              <td>
                                <button className="btn btn-sm btn-outline-secondary" title="View"><i className="bi bi-eye"></i></button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  <div className="d-flex justify-content-between align-items-center mt-2">
                    <div className="text-primary small">Showing {filteredComm.length > 0 ? startIdx + 1 : 0} to {Math.min(startIdx + commPerPage, filteredComm.length)} of {filteredComm.length} rows</div>
                    <div className="d-flex align-items-center gap-2">
                      <select className="form-select form-select-sm" style={{ width: 'auto' }} value={commPerPage} onChange={e => { setCommPerPage(Number(e.target.value)); setCommPage(1) }}>
                        {[10, 25, 50, 100].map(n => <option key={n} value={n}>{n} / page</option>)}
                      </select>
                      <nav><ul className="pagination pagination-sm mb-0">
                        <li className={'page-item' + (commPage <= 1 ? ' disabled' : '')}><button className="page-link" onClick={() => setCommPage(1)}><i className="bi bi-chevron-double-left"></i></button></li>
                        <li className={'page-item' + (commPage <= 1 ? ' disabled' : '')}><button className="page-link" onClick={() => setCommPage(p => Math.max(1, p - 1))}><i className="bi bi-chevron-left"></i></button></li>
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          let p = commPage - 2 + i
                          if (p < 1) p = i + 1
                          if (p > totalPages) return null
                          return <li key={p} className={'page-item' + (p === commPage ? ' active' : '')}><button className="page-link" onClick={() => setCommPage(p)}>{p}</button></li>
                        })}
                        <li className={'page-item' + (commPage >= totalPages ? ' disabled' : '')}><button className="page-link" onClick={() => setCommPage(p => Math.min(totalPages, p + 1))}><i className="bi bi-chevron-right"></i></button></li>
                        <li className={'page-item' + (commPage >= totalPages ? ' disabled' : '')}><button className="page-link" onClick={() => setCommPage(totalPages)}><i className="bi bi-chevron-double-right"></i></button></li>
                      </ul></nav>
                    </div>
                  </div>
                </div>
              )
            })()}

          </div>
        </div>
      </div>

      {/* ===== INVOICE DETAIL MODAL ===== */}
      {showInvModal && (<>
        <div className="modal-backdrop fade show" style={{ zIndex: 1050 }}></div>
        <div className="modal fade show d-block" tabIndex="-1" style={{ zIndex: 1055 }} onClick={e => { if (e.target === e.currentTarget) setShowInvModal(false) }}>
          <div className="modal-dialog modal-dialog-centered modal-lg" style={{ maxWidth: 960 }}>
            <div className="modal-content border-0 shadow" style={{ borderRadius: 0, overflow: 'hidden' }}>
              {invDetailLoading ? (
                <div className="modal-body text-center py-5"><div className="spinner-border text-primary"></div><div className="mt-2 text-muted">Loading invoice...</div></div>
              ) : invDetail ? (() => {
                const d = invDetail
                const fmtCur = v => '$ ' + (v || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                const fmtDate = v => v ? new Date(v).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }) : ''
                const isPaid = d.paid_value === 'PAID'
                // Calculate running total from line items (already includes shipping if present)
                let runningTotal = (d.line_items || []).reduce((s, it) => s + (it.amount || 0), 0)
                const ccAmt = d.cc_amt || 0
                const salesTax = d.sales_tax_amount || 0
                const grandTotal = runningTotal + ccAmt + salesTax
                let lineNum = (d.line_items || []).length
                return (
                  <>
                    <div className="modal-body p-0" style={{ maxHeight: '85vh', overflowY: 'auto', position: 'relative' }}>
                      {/* Close button */}
                      <button type="button" className="btn-close position-absolute" style={{ top: 10, right: 14, zIndex: 20 }} onClick={() => setShowInvModal(false)}></button>

                      <div className="p-4" ref={invPrintRef}>
                        {/* PAID watermark */}
                        {isPaid && (
                          <div style={{ position: 'absolute', top: '40%', left: '50%', transform: 'translate(-50%, -50%) rotate(-30deg)', fontSize: 150, color: 'rgba(255,0,0,0.15)', fontWeight: 'bold', pointerEvents: 'none', zIndex: 5, whiteSpace: 'nowrap', userSelect: 'none' }}>
                            {d.paid_value}
                            {d.paid_date && <div style={{ fontSize: 25, textAlign: 'center' }}>{d.paid_date}</div>}
                          </div>
                        )}

                        {/* Company Header - invoice-logo row */}
                        <div className="row mb-3 align-items-start">
                          <div className="col-3">
                            <img src="https://staging.stallioni.com/assets/images/logo_insole.png" alt="AIRfeet" style={{ maxWidth: '100%', height: 'auto', maxHeight: 70 }} />
                            <div className="fst-italic mt-1" style={{ color: '#8B6914', fontSize: 12 }}>"It's like walking on air"</div>
                          </div>
                          <div className="col-3" style={{ fontSize: 13 }}>
                            <div className="fw-bold">Airfeet LLC</div>
                            <div>2346 S. Lynhurst Dr</div>
                            <div>Suite 701</div>
                            <div>Indianapolis Indiana 46241</div>
                          </div>
                          <div className="col-2" style={{ fontSize: 13 }}>
                            <div>317-965-5212</div>
                            <div><u className="text-primary">info@myairfeet.com</u></div>
                            <div><u className="text-primary">www.myairfeet.com</u></div>
                          </div>
                          <div className="col-4 text-end">
                            <div className="fw-bold mb-1" style={{ fontSize: 22 }}>Invoice</div>
                            <table className="table table-sm table-bordered mb-0 ms-auto" style={{ fontSize: 12, width: 'auto' }}>
                              <tbody>
                                <tr><th className="px-3 py-1">Date</th><th className="px-3 py-1">Invoice#</th></tr>
                                <tr><td className="px-3 py-1">{fmtDate(d.invoice_date)}</td><td className="px-3 py-1">{d.invoice_number}</td></tr>
                                <tr><td className="px-3 py-1">Po #</td><td className="px-3 py-1">{d.po_number || ''}</td></tr>
                              </tbody>
                            </table>
                          </div>
                        </div>

                        {/* Bill To / Ship To */}
                        <div className="row g-0 mb-3">
                          <div className="col-6 pe-1">
                            <table className="table table-sm table-bordered mb-0" style={{ fontSize: 13 }}>
                              <thead><tr><th className="bg-light">Bill To</th></tr></thead>
                              <tbody><tr><td style={{ minHeight: 60, whiteSpace: 'pre-line' }}>
                                <strong>{d.customer?.company_name || ''}</strong>
                                {d.billing_address ? '\n' + d.billing_address : ''}
                              </td></tr></tbody>
                            </table>
                          </div>
                          <div className="col-6 ps-1">
                            <table className="table table-sm table-bordered mb-0" style={{ fontSize: 13 }}>
                              <thead><tr><th className="bg-light">Ship To</th></tr></thead>
                              <tbody><tr><td style={{ minHeight: 60, whiteSpace: 'pre-line' }}>
                                <strong>{d.customer?.company_name || ''}</strong>
                                {(d.shipping_address || d.billing_address) ? '\n' + (d.shipping_address || d.billing_address) : ''}
                              </td></tr></tbody>
                            </table>
                          </div>
                        </div>

                        {/* Terms / Rep / Ship info */}
                        <table className="table table-sm table-bordered text-center mb-3" style={{ fontSize: 12 }}>
                          <thead><tr style={{ background: '#f5deb3' }}>
                            <th className="py-1">Terms</th>
                            <th className="py-1">Rep</th>
                            <th className="py-1">Ship</th>
                            <th className="py-1" style={{ width: '18%' }}>ShipAcct #</th>
                            <th className="py-1">Via</th>
                            <th className="py-1">F.O.B.</th>
                            <th className="py-1">Project</th>
                          </tr></thead>
                          <tbody><tr>
                            <td>{d.cust_terms || d.paid_value || ''}</td>
                            <td>{d.rep_names?.join(',') || ''}</td>
                            <td>{d.cust_ship || ''}</td>
                            <td>{d.shipping_contact_info || ''}</td>
                            <td>{d.cust_ship_via || ''}</td>
                            <td>{d.customer_FOB || ''}</td>
                            <td>{d.cust_project || d.project || ''}</td>
                          </tr></tbody>
                        </table>

                        {/* Line Items Table */}
                        <table className="table table-sm table-bordered mb-0" style={{ fontSize: 12 }}>
                          <thead><tr style={{ background: '#f5deb3' }}>
                            <th className="py-1 text-center" style={{ width: 45 }}>Line</th>
                            <th className="py-1">Item Code</th>
                            <th className="py-1">Description</th>
                            <th className="py-1 text-center" style={{ width: '11%' }}>Back Order<br />Quantity</th>
                            <th className="py-1 text-center" style={{ width: '10%' }}>Shipped<br />Quantity</th>
                            <th className="py-1 text-end">Price Each</th>
                            <th className="py-1 text-end">Amount in ($)</th>
                          </tr></thead>
                          <tbody>
                            {d.line_items && d.line_items.length > 0 ? d.line_items.map((item, i) => (
                              <tr key={i} style={{ background: i % 2 === 1 ? '#EBEBEB' : '#FFF' }}>
                                <td className="text-center">{item.line}</td>
                                <td>{item.item_code}</td>
                                <td>{item.description}</td>
                                <td className="text-center">{item.bo_qty || ''}</td>
                                <td className="text-center">{item.shipped_qty}</td>
                                <td className="text-end">{item.price_each?.toFixed(2)}</td>
                                <td className="text-end">{item.amount?.toFixed(2)}</td>
                              </tr>
                            )) : (
                              <tr><td colSpan="7" className="text-center text-muted py-3">No line items</td></tr>
                            )}
                            {/* CC Charge row */}
                            {d.charge_ccard && d.charge_ccard !== '0' && ccAmt > 0 && (() => { lineNum++; return (
                              <tr style={{ background: lineNum % 2 === 0 ? '#EBEBEB' : '#FFF' }}>
                                <td className="text-center">{lineNum}</td>
                                <td>CC Charge</td>
                                <td>CC %</td>
                                <td colSpan="2" className="text-center">{d.cc_per} %</td>
                                <td className="text-end">{ccAmt.toFixed(2)}</td>
                                <td className="text-end">{ccAmt.toFixed(2)}</td>
                              </tr>
                            ) })()}
                          </tbody>
                          <tfoot>
                            {/* Notes */}
                            {d.po_notes && (
                              <tr><td colSpan="7" style={{ fontSize: 11 }}>
                                <strong>NOTES:</strong><br />
                                <span dangerouslySetInnerHTML={{ __html: d.po_notes.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\\r\\n|\\n|\r\n|\n/g, '<br />') }} />
                              </td></tr>
                            )}
                            {/* Sales Tax */}
                            {salesTax > 0 && (
                              <tr><td colSpan="5" className="text-center">Sales Tax</td><td colSpan="2" className="text-end">{fmtCur(salesTax)}</td></tr>
                            )}
                            {/* Credit Card notes + Total */}
                            <tr>
                              <td colSpan="5" className="text-end" style={{ fontSize: 11 }}>{d.charge_ccard && d.charge_ccard !== '0' && d.cc_per > 0 && ccAmt > 0 ? 'Credit Card payments are subject to a ' + d.cc_per + '% charge' : ''}</td>
                              <td className="fw-bold">Total</td>
                              <td className="text-end fw-bold">{fmtCur(grandTotal)}</td>
                            </tr>
                          </tfoot>
                        </table>

                        {/* Action buttons */}
                        <div className="mt-4 mb-2 d-flex justify-content-center gap-2 pdf-hide">
                          <button className="btn btn-warning text-white px-4" onClick={() => downloadPdf(invPrintRef, 'Invoice_' + d.invoice_number + '.pdf')}><i className="bi bi-download me-1"></i>Download</button>
                          <button className="btn btn-success px-4" onClick={() => window.print()}><i className="bi bi-printer me-1"></i>Print</button>
                          <button className="btn btn-primary px-4 text-white" style={{ background: '#8e44ad', borderColor: '#8e44ad' }}><i className="bi bi-envelope me-1"></i>Email</button>
                        </div>
                      </div>
                    </div>
                  </>
                )
              })() : (
                <div className="modal-body text-center py-5 text-muted">Invoice not found</div>
              )}
            </div>
          </div>
        </div>
      </>)}

      {/* ===== PACKING SLIP MODAL ===== */}
      {showPackModal && (<>
        <div className="modal-backdrop fade show" style={{ zIndex: 1050 }}></div>
        <div className="modal fade show d-block" tabIndex="-1" style={{ zIndex: 1055 }} onClick={e => { if (e.target === e.currentTarget) setShowPackModal(false) }}>
          <div className="modal-dialog modal-dialog-centered modal-lg" style={{ maxWidth: 960 }}>
            <div className="modal-content border-0 shadow" style={{ borderRadius: 0, overflow: 'hidden' }}>
              {packDetailLoading ? (
                <div className="modal-body text-center py-5"><div className="spinner-border"></div></div>
              ) : packDetail ? (() => {
                const d = packDetail
                const fmtDate = v => v ? new Date(v).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }) : ''
                return (
                  <>
                    <div className="modal-body p-0" style={{ maxHeight: '85vh', overflowY: 'auto', position: 'relative' }}>
                      <button type="button" className="btn-close position-absolute" style={{ top: 10, right: 14, zIndex: 20 }} onClick={() => setShowPackModal(false)}></button>

                      <div className="p-4" ref={packPrintRef}>
                        {/* Company Header */}
                        <div className="row mb-3 align-items-start">
                          <div className="col-3">
                            <img src="https://staging.stallioni.com/assets/images/logo_insole.png" alt="AIRfeet" style={{ maxWidth: '100%', height: 'auto', maxHeight: 70 }} />
                            <div className="fst-italic mt-1" style={{ color: '#8B6914', fontSize: 12 }}>"It's like walking on air"</div>
                          </div>
                          <div className="col-3" style={{ fontSize: 13 }}>
                            <div className="fw-bold">Airfeet LLC</div>
                            <div>2346 S. Lynhurst Dr</div>
                            <div>Suite 701</div>
                            <div>Indianapolis Indiana 46241</div>
                          </div>
                          <div className="col-2" style={{ fontSize: 13 }}>
                            <div>317-965-5212</div>
                            <div><u className="text-primary">info@myairfeet.com</u></div>
                            <div><u className="text-primary">www.myairfeet.com</u></div>
                          </div>
                          <div className="col-4 text-end">
                            <div className="fw-bold mb-1" style={{ fontSize: 22 }}>Packing Slip</div>
                            <table className="table table-sm table-bordered mb-0 ms-auto" style={{ fontSize: 12, width: 'auto' }}>
                              <tbody>
                                <tr><th className="px-3 py-1">Date</th><th className="px-3 py-1">Invoice #</th></tr>
                                <tr><td className="px-3 py-1">{fmtDate(d.invoice_date)}</td><td className="px-3 py-1">{d.invoice_number}</td></tr>
                                <tr><td className="px-3 py-1">Po #</td><td className="px-3 py-1">{d.po_number || ''}</td></tr>
                              </tbody>
                            </table>
                          </div>
                        </div>

                        {/* Bill To / Ship To */}
                        <div className="row g-0 mb-3">
                          <div className="col-6 pe-1">
                            <table className="table table-sm table-bordered mb-0" style={{ fontSize: 13 }}>
                              <thead><tr><th className="bg-light">Bill To</th></tr></thead>
                              <tbody><tr><td style={{ minHeight: 60, whiteSpace: 'pre-line' }}>
                                <strong>{d.customer?.company_name || ''}</strong>
                                {d.billing_address ? '\n' + d.billing_address : ''}
                              </td></tr></tbody>
                            </table>
                          </div>
                          <div className="col-6 ps-1">
                            <table className="table table-sm table-bordered mb-0" style={{ fontSize: 13 }}>
                              <thead><tr><th className="bg-light">Ship To</th></tr></thead>
                              <tbody><tr><td style={{ minHeight: 60, whiteSpace: 'pre-line' }}>
                                <strong>{d.customer?.company_name || ''}</strong>
                                {(d.shipping_address || d.billing_address) ? '\n' + (d.shipping_address || d.billing_address) : ''}
                              </td></tr></tbody>
                            </table>
                          </div>
                        </div>

                        {/* Terms / Rep / Ship info */}
                        <table className="table table-sm table-bordered text-center mb-3" style={{ fontSize: 12 }}>
                          <thead><tr style={{ background: '#f5deb3' }}>
                            <th className="py-1">Terms</th>
                            <th className="py-1">Rep</th>
                            <th className="py-1">Ship</th>
                            <th className="py-1" style={{ width: '18%' }}>ShipAcct #</th>
                            <th className="py-1">Via</th>
                            <th className="py-1">F.O.B.</th>
                            <th className="py-1">Project</th>
                          </tr></thead>
                          <tbody><tr>
                            <td>{d.cust_terms || d.paid_value || ''}</td>
                            <td>{d.rep_names?.join(',') || ''}</td>
                            <td>{d.cust_ship || ''}</td>
                            <td>{d.shipping_contact_info || ''}</td>
                            <td>{d.cust_ship_via || ''}</td>
                            <td>{d.customer_FOB || ''}</td>
                            <td>{d.cust_project || d.project || ''}</td>
                          </tr></tbody>
                        </table>

                        {/* Line Items Table */}
                        <table className="table table-sm table-bordered mb-0" style={{ fontSize: 12 }}>
                          <thead><tr style={{ background: '#f5deb3' }}>
                            <th className="py-1 text-center" style={{ width: 45 }}>Line</th>
                            <th className="py-1">Item Code</th>
                            <th className="py-1">Description</th>
                            <th className="py-1 text-center" style={{ width: '11%' }}>Back Order Quantity</th>
                            <th className="py-1 text-center" style={{ width: '10%' }}>Shipped Quantity</th>
                            <th className="py-1 text-end">Price Each ($)</th>
                            <th className="py-1 text-end">Amount in ($)</th>
                          </tr></thead>
                          <tbody>
                            {(d.line_items || []).map((item, i) => (
                              <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#f9f9f9' }}>
                                <td className="text-center">{item.line}</td>
                                <td>{item.item_code}</td>
                                <td>{item.description}</td>
                                <td className="text-center">{item.bo_qty || ''}</td>
                                <td className="text-center">{item.shipped_qty || ''}</td>
                                <td className="text-end">0.00</td>
                                <td className="text-end">0.00</td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            {d.shipinfo_notes && (
                              <tr><td colSpan="7" style={{ fontSize: 11 }}>
                                <strong>Shipping Info Note:</strong><br />
                                <span dangerouslySetInnerHTML={{ __html: d.shipinfo_notes.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\\r\\n|\\n|\r\n|\n/g, '<br />') }} />
                              </td></tr>
                            )}
                            <tr>
                              <td colSpan="5" className="text-end"></td>
                              <td className="text-end fw-bold">Total</td>
                              <td className="text-end fw-bold">0.00</td>
                            </tr>
                          </tfoot>
                        </table>

                        {/* Action buttons */}
                        <div className="mt-3 d-flex gap-2 pdf-hide">
                          <button className="btn btn-warning" onClick={() => downloadPdf(packPrintRef, 'PackingSlip_' + d.invoice_number + '.pdf')}><i className="bi bi-download me-1"></i>Download</button>
                          <button className="btn btn-primary" onClick={() => window.print()}><i className="bi bi-printer me-1"></i>Print</button>
                          <button className="btn btn-purple" style={{ background: '#8E44AD', color: '#fff' }}><i className="bi bi-envelope me-1"></i>Email</button>
                        </div>
                      </div>
                    </div>
                  </>
                )
              })() : (
                <div className="modal-body text-center py-5 text-muted">Packing slip not found</div>
              )}
            </div>
          </div>
        </div>
      </>)}

      {/* ===== CUSTOMER DETAIL MODAL ===== */}
      {showCustModal && (<>
        <div className="modal-backdrop fade show" style={{ zIndex: 1050 }}></div>
        <div className="modal fade show d-block" tabIndex="-1" style={{ zIndex: 1055 }}>
          <div className="modal-dialog modal-dialog-centered modal-lg" style={{ maxWidth: 900 }}>
            <div className="modal-content border-0 shadow" style={{ borderRadius: 16, overflow: 'hidden' }}>
              <div className="modal-header text-white border-0" style={{ background: 'linear-gradient(135deg, #16a34a, #22c55e)' }}>
                <h5 className="modal-title"><i className="bi bi-building me-2"></i>Customer Information</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowCustModal(false)}></button>
              </div>
              <div className="modal-body py-4" style={{ maxHeight: '75vh', overflowY: 'auto' }}>
                {custDetailLoading ? (
                  <div className="text-center py-5"><div className="spinner-border text-primary"></div><div className="mt-2 text-muted">Loading customer details...</div></div>
                ) : custDetail && custDetail._error ? (
                  <div className="text-center py-4 text-muted">
                    <i className="bi bi-exclamation-circle fs-1 d-block mb-2"></i>
                    Could not load full details for <strong>{custDetail.company_name}</strong>
                  </div>
                ) : custDetail ? (() => {
                  const primaryContact = (custDetail.contacts || []).find(c => c.status === 'active') || custDetail.contacts?.[0]
                  const primaryAddr = (custDetail.addresses || []).find(a => a.status === 'active') || custDetail.addresses?.[0]
                  const assignedEmails = (custDetail.emails || []).filter(e => e.status === 'active')
                  const assignedReps = custDetail.assignedReps || []
                  return (
                    <div className="row g-3">
                      {/* TOP LEFT: Customer Info */}
                      <div className="col-md-6">
                        <div className="card border h-100" style={{ borderRadius: 8, overflow: 'hidden' }}>
                          <div className="card-header text-white py-2 px-3" style={{ background: 'linear-gradient(135deg, #2563eb, #1e40af)', border: 'none' }}>
                            <span className="fw-semibold" style={{ fontSize: '0.9rem' }}><i className="bi bi-building me-1"></i> Customer Info</span>
                          </div>
                          <div className="card-body p-0">
                            <table className="table table-borderless mb-0" style={{ fontSize: '0.85rem' }}>
                              <tbody>
                                <tr><td className="text-muted fw-semibold" style={{ width: 110, padding: '7px 14px' }}>Cust #:</td><td style={{ padding: '7px 14px' }}>{custDetail.customer_code || '—'}</td></tr>
                                <tr><td className="text-muted fw-semibold" style={{ padding: '7px 14px' }}>Name:</td><td style={{ padding: '7px 14px' }}><span className="text-primary text-decoration-underline" style={{ cursor: 'pointer' }}>{custDetail.company_name || '—'}</span></td></tr>
                                <tr><td className="text-muted fw-semibold" style={{ padding: '7px 14px' }}>Type:</td><td style={{ padding: '7px 14px' }}>{custDetail.customer_type || '—'}</td></tr>
                                <tr>
                                  <td className="text-muted fw-semibold" style={{ padding: '7px 14px', verticalAlign: 'top' }}>Assigned REPS:</td>
                                  <td style={{ padding: '7px 14px' }}>
                                    {assignedReps.length > 0 ? (
                                      <div className="d-flex flex-wrap gap-1">
                                        {assignedReps.map((r, i) => (
                                          <span key={i} className="badge text-white px-2 py-1" style={{ background: ['#16a34a','#2563eb','#dc2626','#7c3aed','#d97706'][i % 5], fontSize: '0.78rem' }}>{r.name}</span>
                                        ))}
                                      </div>
                                    ) : '—'}
                                  </td>
                                </tr>
                                <tr>
                                  <td className="text-muted fw-semibold" style={{ padding: '7px 14px', verticalAlign: 'top' }}>Assigned Emails:</td>
                                  <td style={{ padding: '7px 14px' }}>
                                    {assignedEmails.length > 0 ? assignedEmails.map((e, i) => (
                                      <div key={i}><a href={'mailto:' + e.email} className="text-decoration-none" style={{ fontSize: '0.82rem' }}>{e.email}</a></div>
                                    )) : '—'}
                                  </td>
                                </tr>
                                <tr><td className="text-muted fw-semibold" style={{ padding: '7px 14px' }}>Terms:</td><td style={{ padding: '7px 14px' }}><span className="text-primary text-decoration-underline">{custDetail.terms || '—'}</span></td></tr>
                                <tr><td className="text-muted fw-semibold" style={{ padding: '7px 14px' }}>FOB:</td><td style={{ padding: '7px 14px' }}><span className="text-primary text-decoration-underline">{custDetail.fob || '—'}</span></td></tr>
                                <tr><td className="text-muted fw-semibold" style={{ padding: '7px 14px' }}>Ship Info:</td><td style={{ padding: '7px 14px' }}><span className="text-primary text-decoration-underline">{custDetail.ship || '—'}</span></td></tr>
                                <tr><td className="text-muted fw-semibold" style={{ padding: '7px 14px' }}>Ship Via:</td><td style={{ padding: '7px 14px' }}><span className="text-primary text-decoration-underline">{custDetail.ship_via || '—'}</span></td></tr>
                                <tr><td className="text-muted fw-semibold" style={{ padding: '7px 14px' }}>Project:</td><td style={{ padding: '7px 14px' }}><span className="text-primary text-decoration-underline">{custDetail.project || '—'}</span></td></tr>
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>

                      {/* TOP RIGHT: Customer Notes */}
                      <div className="col-md-6">
                        <div className="card border h-100" style={{ borderRadius: 8, overflow: 'hidden' }}>
                          <div className="card-header text-white py-2 px-3" style={{ background: 'linear-gradient(135deg, #16a34a, #22c55e)', border: 'none' }}>
                            <span className="fw-semibold" style={{ fontSize: '0.9rem' }}><i className="bi bi-journal-text me-1"></i> Customer Notes</span>
                          </div>
                          <div className="card-body" style={{ fontSize: '0.85rem', whiteSpace: 'pre-wrap' }}>
                            {custDetail.notes || <span className="text-muted">No notes</span>}
                          </div>
                        </div>
                      </div>

                      {/* BOTTOM LEFT: Primary Contact */}
                      <div className="col-md-6">
                        <div className="card h-100" style={{ borderRadius: 8, overflow: 'hidden', border: '2px solid #f87171' }}>
                          <div className="card-header text-white py-2 px-3" style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)', border: 'none' }}>
                            <span className="fw-semibold" style={{ fontSize: '0.9rem' }}><i className="bi bi-person-fill me-1"></i> {primaryContact?.label || '(Primary)'}</span>
                          </div>
                          <div className="card-body p-0">
                            {primaryContact ? (
                              <table className="table table-borderless mb-0" style={{ fontSize: '0.85rem' }}>
                                <tbody>
                                  <tr><td className="text-muted fw-semibold" style={{ width: 120, padding: '7px 14px' }}>Name:</td><td style={{ padding: '7px 14px' }}>{primaryContact.person || custDetail.contact_name || '—'}</td></tr>
                                  <tr><td className="text-muted fw-semibold" style={{ padding: '7px 14px' }}>Position:</td><td style={{ padding: '7px 14px' }}>{primaryContact.position || '—'}</td></tr>
                                  <tr><td className="text-muted fw-semibold" style={{ padding: '7px 14px' }}>Main Phone:</td><td style={{ padding: '7px 14px' }}>{primaryContact.main_phone || '—'}{primaryContact.main_ext ? ' x' + primaryContact.main_ext : ''}</td></tr>
                                  <tr><td className="text-muted fw-semibold" style={{ padding: '7px 14px' }}>Desk Phone:</td><td style={{ padding: '7px 14px' }}>{primaryContact.desk_phone || '—'}{primaryContact.desk_ext ? ' x' + primaryContact.desk_ext : ''}</td></tr>
                                  <tr><td className="text-muted fw-semibold" style={{ padding: '7px 14px' }}>Mobile Phone:</td><td style={{ padding: '7px 14px' }}>{primaryContact.mobile_phone || '—'}</td></tr>
                                  <tr><td className="text-muted fw-semibold" style={{ padding: '7px 14px' }}>Email:</td><td style={{ padding: '7px 14px' }}>{primaryContact.email ? <a href={'mailto:' + primaryContact.email} className="text-decoration-none">{primaryContact.email}</a> : '—'}</td></tr>
                                </tbody>
                              </table>
                            ) : (
                              <table className="table table-borderless mb-0" style={{ fontSize: '0.85rem' }}>
                                <tbody>
                                  <tr><td className="text-muted fw-semibold" style={{ width: 120, padding: '7px 14px' }}>Name:</td><td style={{ padding: '7px 14px' }}>{custDetail.contact_name || '—'}</td></tr>
                                  <tr><td className="text-muted fw-semibold" style={{ padding: '7px 14px' }}>Phone:</td><td style={{ padding: '7px 14px' }}>{custDetail.phone || '—'}{custDetail.extension ? ' x' + custDetail.extension : ''}</td></tr>
                                  <tr><td className="text-muted fw-semibold" style={{ padding: '7px 14px' }}>Email:</td><td style={{ padding: '7px 14px' }}>{custDetail.email ? <a href={'mailto:' + custDetail.email} className="text-decoration-none">{custDetail.email}</a> : '—'}</td></tr>
                                </tbody>
                              </table>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* BOTTOM RIGHT: Address */}
                      <div className="col-md-6">
                        <div className="card h-100" style={{ borderRadius: 8, overflow: 'hidden', border: '2px solid #2dd4bf' }}>
                          <div className="card-header text-white py-2 px-3" style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)', border: 'none' }}>
                            <span className="fw-semibold" style={{ fontSize: '0.9rem' }}><i className="bi bi-geo-alt-fill me-1"></i> Address</span>
                          </div>
                          <div className="card-body p-0">
                            <table className="table table-borderless mb-0" style={{ fontSize: '0.85rem' }}>
                              <tbody>
                                <tr><td className="text-muted fw-semibold" style={{ width: 130, padding: '7px 14px' }}>Name/Company name:</td><td style={{ padding: '7px 14px' }}>{custDetail.company_name || '—'}</td></tr>
                                <tr><td className="text-muted fw-semibold" style={{ padding: '7px 14px' }}>Address:</td><td style={{ padding: '7px 14px' }}>{primaryAddr?.street || custDetail.address || '—'}</td></tr>
                                <tr><td className="text-muted fw-semibold" style={{ padding: '7px 14px' }}>City:</td><td style={{ padding: '7px 14px' }}>{primaryAddr?.city || custDetail.city || '—'}</td></tr>
                                <tr><td className="text-muted fw-semibold" style={{ padding: '7px 14px' }}>State:</td><td style={{ padding: '7px 14px' }}>{primaryAddr?.state || custDetail.state || '—'}</td></tr>
                                <tr><td className="text-muted fw-semibold" style={{ padding: '7px 14px' }}>Zip Code:</td><td style={{ padding: '7px 14px' }}>{primaryAddr?.zip || custDetail.zip || '—'}</td></tr>
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })() : null}
              </div>
              <div className="modal-footer border-0">
                <Link to={'/customers/' + (custDetail?._id || '')} className="btn btn-outline-primary">
                  <i className="bi bi-box-arrow-up-right me-1"></i>Open Full Page
                </Link>
                <button type="button" className="btn btn-outline-secondary" onClick={() => setShowCustModal(false)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      </>)}

      {/* ===== EDIT MODAL ===== */}
      {showEditModal && (<>
        <div className="modal-backdrop fade show" style={{ zIndex: 1050 }}></div>
        <div className="modal fade show d-block" tabIndex="-1" style={{ zIndex: 1055 }}>
          <div className="modal-dialog modal-dialog-centered modal-lg" style={{ maxHeight: '90vh' }}>
            <div className="modal-content border-0 shadow" style={{ borderRadius: 16, overflow: 'hidden' }}>
              <div className="modal-header text-white border-0" style={{ background: 'linear-gradient(135deg, #2563eb, #1e40af)' }}>
                <h5 className="modal-title"><i className="bi bi-pencil-square me-2"></i>Edit Sales REP Information</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowEditModal(false)}></button>
              </div>
              <form onSubmit={handleSaveEdit}>
                <div className="modal-body py-4" style={{ maxHeight: '70vh', overflowY: 'auto' }}>

                  {/* User Info */}
                  <h6 className="mb-3" style={{ color: '#3b82f6', fontWeight: 400 }}>User Info</h6>

                  {/* Sales REP # */}
                  <div className="row mb-3">
                    <div className="col-md-6">
                      <label className="form-label small fw-semibold">Sales REP # <span className="text-danger">*</span></label>
                      <input type="text" className="form-control" value={editForm.user_cust_code} onChange={e => setEditForm({ ...editForm, user_cust_code: e.target.value })} />
                    </div>
                  </div>

                  {/* First / Last Name */}
                  <div className="row mb-3">
                    <div className="col-md-6">
                      <label className="form-label small fw-semibold">First Name <span className="text-danger">*</span></label>
                      <input type="text" className="form-control" value={editForm.first_name} onChange={e => setEditForm({ ...editForm, first_name: e.target.value })} required />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label small fw-semibold">Last Name <span className="text-danger">*</span></label>
                      <input type="text" className="form-control" value={editForm.last_name} onChange={e => setEditForm({ ...editForm, last_name: e.target.value })} required />
                    </div>
                  </div>

                  {/* Username / Password */}
                  <div className="row mb-3">
                    <div className="col-md-6">
                      <label className="form-label small fw-semibold">User Name</label>
                      <input type="text" className="form-control" value={editForm.username} onChange={e => setEditForm({ ...editForm, username: e.target.value })} />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label small fw-semibold">Password</label>
                      <input type={showPassword ? 'text' : 'password'} className="form-control" value={editForm.password} onChange={e => setEditForm({ ...editForm, password: e.target.value })} placeholder="Leave blank to keep current" />
                      <div className="form-check mt-1">
                        <input className="form-check-input" type="checkbox" id="showPwdEdit" checked={showPassword} onChange={() => setShowPassword(!showPassword)} />
                        <label className="form-check-label small" htmlFor="showPwdEdit" style={{ color: '#16a34a' }}>Show Password</label>
                      </div>
                    </div>
                  </div>

                  {/* Phone Numbers + Email */}
                  <div className="row mb-3">
                    <div className="col-md-6">
                      <label className="form-label small fw-semibold">Phone#</label>
                      {editPhones.map((p, idx) => (
                        <div className="d-flex gap-2 mb-2 align-items-center" key={idx}>
                          <input type="tel" className="form-control" placeholder="Phone#" style={{ maxWidth: 160 }} value={p.number} onChange={e => setEditPhone(idx, 'number', e.target.value)} />
                          <div>
                            {idx === 0 && <small className="text-muted d-block" style={{ fontSize: '0.7rem' }}>Ext#</small>}
                            <input type="text" className="form-control" placeholder="Ext#" style={{ maxWidth: 100 }} value={p.ext} onChange={e => setEditPhone(idx, 'ext', e.target.value)} />
                          </div>
                          <select className="form-select" style={{ maxWidth: 120 }} value={p.type} onChange={e => setEditPhone(idx, 'type', e.target.value)}>
                            {PHONE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                          </select>
                          {editPhones.length > 1 && (
                            <button type="button" className="btn btn-danger btn-sm" style={{ width: 34, height: 34, padding: 0, flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setEditPhones(editPhones.filter((_, i) => i !== idx))}>
                              <i className="bi bi-x-lg"></i>
                            </button>
                          )}
                        </div>
                      ))}
                      <button type="button" className="btn btn-success btn-sm" onClick={() => setEditPhones([...editPhones, { number: '', ext: '', type: 'Main' }])}>
                        <i className="bi bi-plus-lg me-1"></i> Add Phone Number
                      </button>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label small fw-semibold">Email <span className="text-danger">*</span></label>
                      <input type="email" className="form-control" value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })} required />
                    </div>
                  </div>

                  {/* About Sales REP */}
                  <div className="mb-4">
                    <label className="form-label small fw-semibold">About Sales REP</label>
                    <textarea className="form-control" rows="5" value={editForm.about} onChange={e => setEditForm({ ...editForm, about: e.target.value })}></textarea>
                  </div>

                  <hr className="my-4" />

                  {/* Address 1 */}
                  <div className="mb-3 d-flex align-items-center gap-2 position-relative">
                    {editingLabel === 0 ? (
                      <div className="d-flex align-items-center gap-2 p-2 border rounded shadow-sm bg-white" style={{ zIndex: 10 }}>
                        <div>
                          <div className="text-muted small mb-1">Enter Address Label</div>
                          <input type="text" className="form-control form-control-sm" value={labelDraft} onChange={e => setLabelDraft(e.target.value)} autoFocus style={{ width: 180 }} />
                        </div>
                        <button type="button" className="btn btn-primary btn-sm" onClick={() => { const arr = [...addrLabels]; arr[0] = labelDraft || 'Address'; setAddrLabels(arr); setEditingLabel(null) }}><i className="bi bi-check-lg"></i></button>
                        <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setEditingLabel(null)}><i className="bi bi-x-lg"></i></button>
                      </div>
                    ) : (
                      <h6 className="mb-0" style={{ fontWeight: 400 }}>
                        <span style={{ color: '#3b82f6', cursor: 'pointer', borderBottom: '2px dashed #3b82f6' }} onClick={() => { setLabelDraft(addrLabels[0]); setEditingLabel(0) }}>{addrLabels[0]}</span>
                        <small className="text-muted ms-2">(click on "{addrLabels[0]}" to edit)</small>
                      </h6>
                    )}
                  </div>
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Street</label>
                    <input type="text" className="form-control" value={editAddresses[0].street} onChange={e => setEditAddr(0, 'street', e.target.value)} />
                  </div>
                  <div className="row mb-3">
                    <div className="col-md-6">
                      <label className="form-label small fw-semibold">City</label>
                      <input type="text" className="form-control" value={editAddresses[0].city} onChange={e => setEditAddr(0, 'city', e.target.value)} />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label small fw-semibold">State</label>
                      <select className="form-select" value={editAddresses[0].state} onChange={e => setEditAddr(0, 'state', e.target.value)}>
                        <option value="">Please select states</option>
                        {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="row mb-4">
                    <div className="col-md-6">
                      <label className="form-label small fw-semibold">Zip Code</label>
                      <input type="text" className="form-control" value={editAddresses[0].zip} onChange={e => setEditAddr(0, 'zip', e.target.value)} />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label small fw-semibold">Country</label>
                      <select className="form-select" value={editAddresses[0].country} onChange={e => setEditAddr(0, 'country', e.target.value)}>
                        <option value="United States">United States</option>
                      </select>
                    </div>
                  </div>

                  <hr className="my-4" />

                  {/* Address 2 */}
                  <div className="mb-3 d-flex align-items-center gap-2 position-relative">
                    {editingLabel === 1 ? (
                      <div className="d-flex align-items-center gap-2 p-2 border rounded shadow-sm bg-white" style={{ zIndex: 10 }}>
                        <div>
                          <div className="text-muted small mb-1">Enter Address Label</div>
                          <input type="text" className="form-control form-control-sm" value={labelDraft} onChange={e => setLabelDraft(e.target.value)} autoFocus style={{ width: 180 }} />
                        </div>
                        <button type="button" className="btn btn-primary btn-sm" onClick={() => { const arr = [...addrLabels]; arr[1] = labelDraft || 'Address'; setAddrLabels(arr); setEditingLabel(null) }}><i className="bi bi-check-lg"></i></button>
                        <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setEditingLabel(null)}><i className="bi bi-x-lg"></i></button>
                      </div>
                    ) : (
                      <h6 className="mb-0" style={{ fontWeight: 400 }}>
                        <span style={{ color: '#3b82f6', cursor: 'pointer', borderBottom: '2px dashed #3b82f6' }} onClick={() => { setLabelDraft(addrLabels[1]); setEditingLabel(1) }}>{addrLabels[1]}</span>
                        <small className="text-muted ms-2">(click on "{addrLabels[1]}" to edit)</small>
                      </h6>
                    )}
                  </div>
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Street</label>
                    <input type="text" className="form-control" value={editAddresses[1].street} onChange={e => setEditAddr(1, 'street', e.target.value)} />
                  </div>
                  <div className="row mb-3">
                    <div className="col-md-6">
                      <label className="form-label small fw-semibold">City</label>
                      <input type="text" className="form-control" value={editAddresses[1].city} onChange={e => setEditAddr(1, 'city', e.target.value)} />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label small fw-semibold">State</label>
                      <select className="form-select" value={editAddresses[1].state} onChange={e => setEditAddr(1, 'state', e.target.value)}>
                        <option value="">Please select states</option>
                        {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="row mb-4">
                    <div className="col-md-6">
                      <label className="form-label small fw-semibold">Zip Code</label>
                      <input type="text" className="form-control" value={editAddresses[1].zip} onChange={e => setEditAddr(1, 'zip', e.target.value)} />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label small fw-semibold">Country</label>
                      <select className="form-select" value={editAddresses[1].country} onChange={e => setEditAddr(1, 'country', e.target.value)}>
                        <option value="United States">United States</option>
                      </select>
                    </div>
                  </div>

                </div>
                <div className="modal-footer border-0">
                  <button type="button" className="btn btn-outline-secondary" onClick={() => setShowEditModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? <><span className="spinner-border spinner-border-sm me-1"></span>Saving...</> : <><i className="bi bi-check-lg me-1"></i>Save Changes</>}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </>)}
    </div>
  )
}
