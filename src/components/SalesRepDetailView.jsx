import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { Link, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import html2pdf from 'html2pdf.js'
import { api } from '../lib/api'

const US_STATES = ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY']
const PHONE_TYPES = ['Main', 'Work', 'Desk', 'Home', 'Mobile']

const spinCSS = document.createElement('style')
spinCSS.textContent = `.spin{animation:spin 1s linear infinite}@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}} .table-uf tbody tr{transition:background 0.15s} .table-uf tbody tr:hover{filter:brightness(0.95)} .table-uf thead th:hover{background:#e2e8f0!important}`
if (!document.querySelector('[data-uf-spin]')) { spinCSS.setAttribute('data-uf-spin','1'); document.head.appendChild(spinCSS) }

const fmt = v => '$ ' + (v || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmtDate = v => v ? new Date(v).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }) : '-'

const thStyle = { padding: '10px 12px', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em', whiteSpace: 'nowrap', borderBottom: '2px solid #dee2e6', cursor: 'pointer', userSelect: 'none', position: 'sticky', top: 0, zIndex: 2, background: '#f1f5f9' }
const tdStyle = { padding: '8px 12px', fontSize: '0.85rem', verticalAlign: 'middle' }
const tdRight = { ...tdStyle, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }
const tdCenter = { ...tdStyle, textAlign: 'center' }

function SortIcon({ field, sort }) {
  if (sort.field !== field) return <i className="bi bi-chevron-expand ms-1 opacity-25" style={{ fontSize: '0.7rem' }}></i>
  return sort.dir === 'asc'
    ? <i className="bi bi-caret-up-fill ms-1 text-primary" style={{ fontSize: '0.7rem' }}></i>
    : <i className="bi bi-caret-down-fill ms-1 text-primary" style={{ fontSize: '0.7rem' }}></i>
}

function Toolbar({ search, onSearch, onRefresh, viewMode, onViewMode, colDefs, cols, onColToggle, loading, resetPage }) {
  return (
    <div className="d-flex justify-content-end align-items-center gap-2 mb-3 flex-wrap">
      <div className="position-relative">
        <i className="bi bi-search position-absolute" style={{ left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: '0.8rem', color: '#94a3b8' }}></i>
        <input type="text" className="form-control form-control-sm" placeholder="Search..." style={{ width: 200, paddingLeft: 32, borderRadius: 20, border: '1px solid #e2e8f0' }} value={search} onChange={e => { onSearch(e.target.value); resetPage() }} />
      </div>
      <div className="btn-group btn-group-sm">
        <button className="btn btn-outline-secondary" title="Refresh" onClick={onRefresh} disabled={loading}><i className={'bi bi-arrow-clockwise' + (loading ? ' spin' : '')}></i></button>
        <button className={'btn ' + (viewMode === 'table' ? 'btn-primary' : 'btn-outline-secondary')} title="Table View" onClick={() => onViewMode('table')}><i className="bi bi-table"></i></button>
        <button className={'btn ' + (viewMode === 'grid' ? 'btn-primary' : 'btn-outline-secondary')} title="Grid View" onClick={() => onViewMode('grid')}><i className="bi bi-grid-3x3-gap"></i></button>
      </div>
      <div className="dropdown">
        <button className="btn btn-outline-secondary btn-sm dropdown-toggle" title="Columns" data-bs-toggle="dropdown" data-bs-auto-close="outside"><i className="bi bi-layout-three-columns me-1"></i>Columns</button>
        <ul className="dropdown-menu dropdown-menu-end shadow-sm" style={{ minWidth: 170 }}>
          {colDefs.map(col => (
            <li key={col.key}>
              <label className="dropdown-item d-flex align-items-center gap-2 py-1" style={{ cursor: 'pointer', fontSize: '0.85rem' }}>
                <input type="checkbox" className="form-check-input m-0" checked={!!cols[col.key]} onChange={() => onColToggle(col.key)} />
                {col.label}
              </label>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function Pagination({ page, setPage, totalPages, total, perPage, setPerPage, startIdx }) {
  const end = Math.min(startIdx + perPage, total)
  return (
    <div className="d-flex justify-content-between align-items-center mt-3 flex-wrap gap-2" style={{ fontSize: '0.82rem' }}>
      <div className="text-muted">Showing <strong>{total > 0 ? startIdx + 1 : 0}</strong> - <strong>{end}</strong> of <strong>{total}</strong></div>
      <div className="d-flex align-items-center gap-2">
        <select className="form-select form-select-sm" style={{ width: 'auto', fontSize: '0.8rem' }} value={perPage} onChange={e => { setPerPage(Number(e.target.value)); setPage(1) }}>
          {[10, 25, 50, 100].map(n => <option key={n} value={n}>{n} / page</option>)}
        </select>
        <nav><ul className="pagination pagination-sm mb-0">
          <li className={'page-item' + (page <= 1 ? ' disabled' : '')}><button className="page-link" onClick={() => setPage(1)} title="First"><i className="bi bi-chevron-double-left"></i></button></li>
          <li className={'page-item' + (page <= 1 ? ' disabled' : '')}><button className="page-link" onClick={() => setPage(p => Math.max(1, p - 1))} title="Previous"><i className="bi bi-chevron-left"></i></button></li>
          {(() => {
            let s = Math.max(1, page - 2), e = Math.min(totalPages, s + 4)
            s = Math.max(1, e - 4)
            const pages = []
            for (let p = s; p <= e; p++) pages.push(p)
            return pages.map(p => (
              <li key={p} className={'page-item' + (p === page ? ' active' : '')}><button className="page-link" onClick={() => setPage(p)}>{p}</button></li>
            ))
          })()}
          <li className={'page-item' + (page >= totalPages ? ' disabled' : '')}><button className="page-link" onClick={() => setPage(p => Math.min(totalPages, p + 1))} title="Next"><i className="bi bi-chevron-right"></i></button></li>
          <li className={'page-item' + (page >= totalPages ? ' disabled' : '')}><button className="page-link" onClick={() => setPage(totalPages)} title="Last"><i className="bi bi-chevron-double-right"></i></button></li>
        </ul></nav>
        <span className="text-muted" style={{ fontSize: '0.78rem', whiteSpace: 'nowrap' }}>Page {page} of {totalPages}</span>
      </div>
    </div>
  )
}

function sortData(data, sort, getVal) {
  if (!sort.field) return data
  const arr = [...data]
  arr.sort((a, b) => {
    let va = getVal(a, sort.field), vb = getVal(b, sort.field)
    if (va == null) va = ''
    if (vb == null) vb = ''
    if (typeof va === 'number' && typeof vb === 'number') return sort.dir === 'asc' ? va - vb : vb - va
    va = String(va).toLowerCase(); vb = String(vb).toLowerCase()
    return sort.dir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va)
  })
  return arr
}

export default function SalesRepDetailView({ id: propId }) {
  const { id: paramId } = useParams()
  const id = propId || paramId
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
  const [viewCommDetail, setViewCommDetail] = useState(null)
  const [viewCommLoading, setViewCommLoading] = useState(false)
  const [payCommDetail, setPayCommDetail] = useState(null) // kept for backward compat
  const [showPaySection, setShowPaySection] = useState(false) // toggle payment section inside commission modal
  const [payForm, setPayForm] = useState({ commission_paid_date: '', received_date: '', received_amount: '', paid_mode: '', partial_comm_total: '', mark_paid: false })
  const [payRepAmounts, setPayRepAmounts] = useState({})

  async function openCommView(c) {
    const commId = c.comm_id || c._id
    if (!commId) { toast.error('No commission ID found'); return }
    setShowPaySection(false)
    setViewCommLoading(true)
    try {
      const data = await api.getCommission(commId)
      setViewCommDetail(data)
    } catch (err) { toast.error('Failed to load commission: ' + err.message) }
    setViewCommLoading(false)
  }

  function openPayFromView() {
    if (!viewCommDetail) return
    const data = viewCommDetail
    const today = new Date().toISOString().slice(0, 10)
    setPayForm({ commission_paid_date: today, received_date: today, received_amount: '', paid_mode: '', partial_comm_total: '', mark_paid: false })
    const repAmts = {}
    ;(data.details || []).forEach(d => {
      const paidForRep = (data.payments || []).filter(p => String(p.rep_id) === String(d.sales_rep_id)).reduce((s, p) => s + (parseFloat(p.comm_paid_amount) || 0), 0)
      const balance = (d.total_price || 0) - paidForRep
      repAmts[d.sales_rep_id] = { org_amount: d.total_price || 0, balance: Math.max(0, balance), paid_amount: '', rep_name: d.rep_name || '', rep_code: d.rep_code || '' }
    })
    setPayRepAmounts(repAmts)
    setShowPaySection(true)
  }

  // Auto-calculate when received amount changes
  function onReceivedAmountChange(val) {
    const recAmt = parseFloat(val) || 0
    const pInv = viewCommDetail?.invoice || {}
    const pNetAmt = pInv.net_amount || 0
    const pCommTotal = viewCommDetail?.total_commission || 0
    // Calculate partial commission: (received / invoice amount) * commission total
    const partialComm = pNetAmt > 0 ? (recAmt / pNetAmt) * pCommTotal : 0
    const partialRounded = Math.round(partialComm * 100) / 100
    // Auto-split to reps proportionally
    const details = viewCommDetail?.details || []
    const totalRepComm = details.reduce((s, d) => s + (d.total_price || 0), 0)
    const newRepAmts = { ...payRepAmounts }
    details.forEach(d => {
      const repShare = totalRepComm > 0 ? (d.total_price || 0) / totalRepComm : 0
      const repPartial = Math.round(partialRounded * repShare * 100) / 100
      if (newRepAmts[d.sales_rep_id]) {
        newRepAmts[d.sales_rep_id] = { ...newRepAmts[d.sales_rep_id], paid_amount: String(repPartial) }
      }
    })
    setPayForm(prev => ({ ...prev, received_amount: val, partial_comm_total: String(partialRounded) }))
    setPayRepAmounts(newRepAmts)
  }

  async function handleSavePayment(e) {
    e.preventDefault()
    if (!payForm.received_amount) { toast.error('Enter received amount'); return }
    try {
      const commDetail = viewCommDetail
      if (!commDetail) return
      const rep_payments = Object.entries(payRepAmounts).filter(([_, v]) => parseFloat(v.paid_amount) > 0).map(([repId, v]) => ({
        rep_id: repId, org_amount: v.org_amount, paid_amount: v.paid_amount,
      }))
      await api.addCommissionPayment(commDetail._id, { ...payForm, rep_payments })
      toast.success('Payment recorded')
      setShowPaySection(false)
      setViewCommDetail(null)
      // Refresh commissions
      setCommissions([]); setCommLoading(true)
      api.getSalesRepCommissions(id).then(d => { setCommissions(d || []); setCommLoading(false) }).catch(() => setCommLoading(false))
      api.getSalesRepCommissionStats(id).then(d => setCommStats(d || {})).catch(() => {})
    } catch (err) { toast.error(err.message) }
  }
  const [custPage, setCustPage] = useState(1)
  const [custPerPage, setCustPerPage] = useState(10)
  const [custViewMode, setCustViewMode] = useState('table')
  const [custCols, setCustCols] = useState({ line: true, cust: true, custname: true, action: true })
  const [invViewMode, setInvViewMode] = useState('table')
  const [invCols, setInvCols] = useState({ line: true, customer: true, date: true, po: true, invoice: true, qty: true, total: true, action: true })
  const [commViewMode, setCommViewMode] = useState('table')
  const [commCols, setCommCols] = useState({ line: true, invoice: true, date: true, qty: true, poTotal: true, comTotal: true, repComTotal: true, commPaid: true, action: true })
  const [invPage, setInvPage] = useState(1)
  const [invPerPage, setInvPerPage] = useState(10)
  const [commPage, setCommPage] = useState(1)
  const [commPerPage, setCommPerPage] = useState(10)
  const [custSort, setCustSort] = useState({ field: '', dir: 'asc' })
  const [invSort, setInvSort] = useState({ field: '', dir: 'asc' })
  const [commSort, setCommSort] = useState({ field: '', dir: 'asc' })

  const toggleSort = useCallback((setter, field) => {
    setter(prev => prev.field === field ? { field, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { field, dir: 'asc' })
  }, [])
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

  const tabIcons = { profile: 'bi-person-vcard', customers: 'bi-building', invoices: 'bi-receipt', commissions: 'bi-cash-stack' }
  const tabCounts = { customers: customers.length, invoices: invoices.length, commissions: commissions.length }

  return (
    <div style={{ width: '100%', overflowX: 'hidden' }}>
      {!propId && (
        <nav aria-label="breadcrumb" className="mb-2">
          <ol className="breadcrumb mb-0" style={{ fontSize: 'clamp(.7rem, 1.5vw, .82rem)' }}>
            <li className="breadcrumb-item"><Link to="/dashboard"><i className="bi bi-house-door"></i></Link></li>
            <li className="breadcrumb-item"><Link to="/sales-reps/active">Sales Reps</Link></li>
            <li className="breadcrumb-item active">{name}</li>
          </ol>
        </nav>
      )}

      {/* Hero Header */}
      <div className="mb-4" style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)', borderRadius: 16, overflow: 'hidden', boxShadow: '0 4px 24px rgba(37,99,235,0.18)' }}>
        <div className="p-4">
          <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
            <div className="d-flex align-items-center gap-3">
              <div style={{ width: 64, height: 64, borderRadius: 16, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 800, color: '#fff', letterSpacing: 1, border: '2px solid rgba(255,255,255,0.25)' }}>
                {(rep.first_name?.[0] || '') + (rep.last_name?.[0] || '')}
              </div>
              <div>
                <h4 className="fw-bold text-white mb-0">{name.toUpperCase()}</h4>
                <div className="d-flex align-items-center gap-3 mt-1">
                  <span className="badge px-2 py-1" style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', fontSize: '0.78rem', borderRadius: 6 }}>REP# {rep.rep_number}</span>
                  {rep.email && <span className="text-white" style={{ fontSize: '0.8rem', opacity: 0.8 }}><i className="bi bi-envelope me-1"></i>{rep.email}</span>}
                  {rep.phone && <span className="text-white" style={{ fontSize: '0.8rem', opacity: 0.8 }}><i className="bi bi-telephone me-1"></i>{rep.phone}</span>}
                </div>
              </div>
            </div>
            <div className="d-flex gap-2">
              <button className="btn btn-light btn-sm px-3" style={{ borderRadius: 8, fontWeight: 600 }} onClick={openEditModal}>
                <i className="bi bi-pencil me-1"></i>Edit Rep
              </button>
              {!propId && (
                <Link to="/sales-reps/active" className="btn btn-outline-light btn-sm px-3" style={{ borderRadius: 8 }}>
                  <i className="bi bi-arrow-left me-1"></i>Back
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Commission Stats Row inside hero */}
        <div className="d-flex flex-wrap" style={{ background: 'rgba(0,0,0,0.15)', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          {[
            { label: 'Total Commission', value: fmt(commStats.total_commission), icon: 'bi-wallet2', color: '#fbbf24' },
            { label: 'YTD Outstanding', value: fmt(commStats.ytd_outstanding), icon: 'bi-clock-history', color: '#fb923c' },
            { label: 'YTD Paid', value: fmt(commStats.ytd_paid), icon: 'bi-check-circle', color: '#4ade80' },
            { label: 'Total Invoices', value: invoices.length.toLocaleString(), icon: 'bi-receipt', color: '#60a5fa' },
            { label: 'Total Customers', value: customers.length.toLocaleString(), icon: 'bi-people', color: '#c084fc' },
          ].map((s, i) => (
            <div key={i} className="flex-fill text-center py-3 px-2" style={{ borderRight: i < 4 ? '1px solid rgba(255,255,255,0.08)' : 'none', minWidth: 140 }}>
              <div className="d-flex align-items-center justify-content-center gap-2">
                <i className={`bi ${s.icon}`} style={{ color: s.color, fontSize: '1rem' }}></i>
                <div className="text-start">
                  <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.6)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{s.label}</div>
                  <div className="text-white fw-bold" style={{ fontSize: '1rem' }}>{s.value}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="d-flex gap-2 mb-3">
        {tabs.map(tab => {
          const isActive = activeTab === tab.key
          return (
            <button
              key={tab.key}
              className="btn btn-sm px-3 py-2 d-flex align-items-center gap-2"
              style={{
                borderRadius: 10,
                border: isActive ? 'none' : '1px solid #e2e8f0',
                background: isActive ? 'linear-gradient(135deg, #2563eb, #1e40af)' : '#fff',
                color: isActive ? '#fff' : '#64748b',
                fontWeight: 600,
                fontSize: '0.85rem',
                boxShadow: isActive ? '0 2px 8px rgba(37,99,235,0.3)' : '0 1px 3px rgba(0,0,0,0.04)',
                transition: 'all 0.2s',
              }}
              onClick={() => setActiveTab(tab.key)}
            >
              <i className={`bi ${tabIcons[tab.key]}`}></i>
              {tab.label}
              {tabCounts[tab.key] > 0 && (
                <span className="badge rounded-pill" style={{ background: isActive ? 'rgba(255,255,255,0.25)' : '#e2e8f0', color: isActive ? '#fff' : '#64748b', fontSize: '0.7rem' }}>
                  {tabCounts[tab.key]}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Tab Content */}
      <div className="card border-0 shadow-sm" style={{ borderRadius: 14, overflow: 'hidden' }}>
        <div className="card-body p-4">

            {/* ===== DETAILS TAB ===== */}
            {activeTab === 'profile' && (
              <div className="row g-4">
                {/* LEFT: Rep Info */}
                <div className="col-lg-6">
                  <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                    <div className="d-flex align-items-center justify-content-between px-3 py-2" style={{ background: 'linear-gradient(135deg, #2563eb, #1e40af)' }}>
                      <span className="fw-semibold text-white" style={{ fontSize: '0.88rem' }}><i className="bi bi-person-vcard me-2"></i>Rep Information</span>
                    </div>
                    <div className="p-0">
                      {[
                        { icon: 'bi-hash', label: 'REP #', value: <span className="badge px-2 py-1" style={{ background: '#eff6ff', color: '#2563eb', fontWeight: 700, fontSize: '0.82rem' }}>{rep.rep_number}</span> },
                        { icon: 'bi-person', label: 'Name', value: <span className="fw-semibold">{name}</span> },
                        { icon: 'bi-at', label: 'Username', value: rep.username || '—' },
                        { icon: 'bi-envelope', label: 'Email', value: rep.email ? <a href={'mailto:' + rep.email} className="text-decoration-none">{rep.email}</a> : '—' },
                        { icon: 'bi-telephone', label: 'Phone', value: rep.phone ? <span>{rep.phone}{rep.extension ? ' x' + rep.extension : ''}</span> : '—' },
                        ...contacts.map(c => ({ icon: 'bi-phone', label: c.contact_type || 'Phone', value: c.contact_number ? <span>{c.contact_number}{c.extension ? ' x' + c.extension : ''}</span> : '—' })),
                        { icon: 'bi-journal-text', label: 'Notes', value: rep.user_notes ? <span dangerouslySetInnerHTML={{ __html: rep.user_notes }} /> : <span className="text-muted fst-italic">—</span> },
                        { icon: 'bi-shield-lock', label: 'Admin', value: rep.site_admin ? <span className="badge bg-primary">Site Admin</span> : <span className="text-muted">No</span> },
                        { icon: 'bi-lock', label: 'Blocked', value: rep.blocked ? <span className="badge bg-danger">Blocked</span> : <span className="badge bg-success-subtle text-success">Active</span> },
                      ].map((row, i) => (
                        <div key={i} className="d-flex align-items-start" style={{ padding: '10px 16px', borderBottom: '1px solid #f1f5f9' }}>
                          <div className="d-flex align-items-center gap-2" style={{ width: 130, flexShrink: 0 }}>
                            <i className={`bi ${row.icon}`} style={{ color: '#94a3b8', fontSize: '0.82rem', width: 16 }}></i>
                            <span style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 600 }}>{row.label}</span>
                          </div>
                          <div style={{ fontSize: '0.85rem', color: '#1e293b' }}>{row.value}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* RIGHT: Address Panels */}
                <div className="col-lg-6">
                  {addresses.length > 0 ? addresses.map((addr, i) => (
                    <div key={i} className="mb-3" style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                      <div className="px-3 py-2" style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)' }}>
                        <span className="fw-semibold text-white" style={{ fontSize: '0.88rem' }}><i className="bi bi-geo-alt-fill me-2"></i>{addr.address_label || 'Address'}</span>
                      </div>
                      <div className="p-3">
                        <div className="d-flex gap-3">
                          <div style={{ width: 42, height: 42, borderRadius: 10, background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <i className="bi bi-geo-alt-fill" style={{ color: '#16a34a', fontSize: '1.1rem' }}></i>
                          </div>
                          <div style={{ fontSize: '0.85rem', color: '#334155', lineHeight: 1.6 }}>
                            <div>{addr.address_1 || '—'}</div>
                            {addr.address_2 && <div>{addr.address_2}</div>}
                            <div>{[addr.city, addr.state, addr.post_code].filter(Boolean).join(', ')}</div>
                            <div className="text-muted">{addr.country || 'US'}</div>
                          </div>
                        </div>
                        {addr.phone_number && (
                          <div className="mt-2 pt-2 d-flex align-items-center gap-2" style={{ borderTop: '1px solid #f1f5f9' }}>
                            <i className="bi bi-telephone" style={{ color: '#64748b', fontSize: '0.78rem' }}></i>
                            <span style={{ fontSize: '0.82rem' }}>{addr.phone_number}{addr.extension ? ' x' + addr.extension : ''}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )) : (
                    <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                      <div className="px-3 py-2" style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)' }}>
                        <span className="fw-semibold text-white" style={{ fontSize: '0.88rem' }}><i className="bi bi-geo-alt-fill me-2"></i>Address</span>
                      </div>
                      <div className="text-center text-muted py-4" style={{ fontSize: '0.85rem' }}>
                        <i className="bi bi-geo-alt d-block mb-1" style={{ fontSize: '1.5rem', opacity: 0.3 }}></i>No address on file
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ===== CUSTOMERS TAB ===== */}
            {activeTab === 'customers' && (() => {
              const filtered = customers.filter(c => {
                if (!custSearch) return true
                const s = custSearch.toLowerCase()
                return c.customer_code?.toLowerCase().includes(s) || c.company_name?.toLowerCase().includes(s)
              })
              const sorted = sortData(filtered, custSort, (c, f) => {
                if (f === 'customer_code') return c.customer_code || ''
                if (f === 'company_name') return c.company_name || ''
                return ''
              })
              const totalPages = Math.ceil(sorted.length / custPerPage) || 1
              const startIdx = (custPage - 1) * custPerPage
              const pageData = sorted.slice(startIdx, startIdx + custPerPage)
              const colDefs = [
                { key: 'line', label: 'Line' },
                { key: 'cust', label: 'Cust#' },
                { key: 'custname', label: 'CustName' },
                { key: 'action', label: 'Action' },
              ]
              const colSpan = colDefs.filter(c => custCols[c.key]).length || 1
              return (
                <div>
                  {/* Stats Bar */}
                  <div className="d-flex flex-wrap gap-3 mb-3">
                    {[
                      { icon: 'bi-people-fill', label: 'Total Customers', value: customers.length, color: '#2563eb', bg: '#eff6ff' },
                      { icon: 'bi-search', label: 'Filtered', value: filtered.length, color: '#7c3aed', bg: '#f5f3ff' },
                    ].map((s, i) => (
                      <div key={i} className="d-flex align-items-center gap-2 px-3 py-2" style={{ background: s.bg, borderRadius: 10, border: `1px solid ${s.color}20` }}>
                        <div style={{ width: 34, height: 34, borderRadius: 8, background: s.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <i className={`bi ${s.icon}`} style={{ color: s.color, fontSize: '0.9rem' }}></i>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{s.label}</div>
                          <div className="fw-bold" style={{ fontSize: '1rem', color: s.color }}>{s.value}</div>
                        </div>
                      </div>
                    ))}
                    <div className="ms-auto d-flex align-items-center">
                      <button className="btn btn-primary btn-sm px-3" style={{ borderRadius: 8, fontWeight: 600 }}><i className="bi bi-plus-lg me-1"></i>New Order</button>
                    </div>
                  </div>
                  <Toolbar search={custSearch} onSearch={setCustSearch} onRefresh={() => { setCustLoading(true); setCustPage(1); api.getSalesRepCustomers(id).then(d => { setCustomers(d || []); setCustLoading(false) }).catch(() => setCustLoading(false)) }} viewMode={custViewMode} onViewMode={setCustViewMode} colDefs={colDefs} cols={custCols} onColToggle={k => setCustCols(prev => ({ ...prev, [k]: !prev[k] }))} loading={custLoading} resetPage={() => setCustPage(1)} />

                  {custViewMode === 'table' ? (
                    <>
                      <div className="table-responsive" style={{ maxHeight: 520, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                        <table className="table table-uf align-middle mb-0" style={{ fontSize: '0.85rem' }}>
                          <thead>
                            <tr>
                              {custCols.line && <th style={{ ...thStyle, width: 70, textAlign: 'center' }}>#</th>}
                              {custCols.cust && <th style={thStyle} onClick={() => toggleSort(setCustSort, 'customer_code')}>Cust# <SortIcon field="customer_code" sort={custSort} /></th>}
                              {custCols.custname && <th style={thStyle} onClick={() => toggleSort(setCustSort, 'company_name')}>Customer Name <SortIcon field="company_name" sort={custSort} /></th>}
                              {custCols.action && <th style={{ ...thStyle, width: 90, textAlign: 'center', cursor: 'default' }}>Action</th>}
                            </tr>
                          </thead>
                          <tbody>
                            {custLoading ? (
                              <tr><td colSpan={colSpan} className="text-center py-5"><div className="spinner-border spinner-border-sm text-primary me-2"></div>Loading customers...</td></tr>
                            ) : pageData.length === 0 ? (
                              <tr><td colSpan={colSpan} className="text-center text-muted py-5"><i className="bi bi-building fs-1 d-block mb-2 opacity-25"></i>No customers found</td></tr>
                            ) : pageData.map((c, i) => (
                              <tr key={c._id || i} style={{ background: i % 2 === 0 ? '#fff' : '#f8fafc' }}>
                                {custCols.line && <td style={{ ...tdCenter, color: '#94a3b8', fontWeight: 600 }}>{startIdx + i + 1}</td>}
                                {custCols.cust && <td style={tdStyle}><span className="badge bg-light text-dark border" style={{ fontSize: '0.82rem' }}>{c.customer_code}</span></td>}
                                {custCols.custname && <td style={tdStyle}>
                                  <div className="d-flex align-items-center gap-2">
                                    <div className="rounded-circle d-flex align-items-center justify-content-center fw-bold text-white" style={{ width: 30, height: 30, fontSize: '0.7rem', background: '#2563eb', flexShrink: 0 }}>
                                      {(c.company_name || '').split(/\s+/).map(w => w[0] || '').join('').toUpperCase().slice(0, 2)}
                                    </div>
                                    <span className="fw-semibold">{c.company_name}</span>
                                  </div>
                                </td>}
                                {custCols.action && <td style={tdCenter}>
                                  <button className="btn btn-sm btn-outline-primary" style={{ borderRadius: 6, fontSize: '0.78rem' }} title="View Details" onClick={() => openCustModal(c)}>
                                    <i className="bi bi-eye me-1"></i>View
                                  </button>
                                </td>}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <Pagination page={custPage} setPage={setCustPage} totalPages={totalPages} total={sorted.length} perPage={custPerPage} setPerPage={setCustPerPage} startIdx={startIdx} />
                    </>
                  ) : (
                    <>
                      {custLoading ? (
                        <div className="text-center py-5"><div className="spinner-border text-primary"></div><div className="mt-2 text-muted">Loading...</div></div>
                      ) : pageData.length === 0 ? (
                        <div className="text-center text-muted py-5"><i className="bi bi-building fs-1 d-block mb-2 opacity-25"></i>No customers found</div>
                      ) : (
                        <div className="row g-3">
                          {pageData.map((c, i) => (
                            <div className="col-md-4 col-sm-6" key={c._id || i}>
                              <div className="card border-0 shadow-sm h-100" style={{ borderRadius: 12, overflow: 'hidden', transition: 'transform 0.15s, box-shadow 0.15s' }} onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.1)' }} onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '' }}>
                                <div className="card-body p-3">
                                  <div className="d-flex align-items-center gap-2 mb-2">
                                    <div className="rounded-circle d-flex align-items-center justify-content-center fw-bold text-white" style={{ width: 40, height: 40, fontSize: '0.8rem', background: 'linear-gradient(135deg, #2563eb, #1e40af)', flexShrink: 0 }}>
                                      {(c.company_name || '').split(/\s+/).map(w => w[0] || '').join('').toUpperCase().slice(0, 2)}
                                    </div>
                                    <div style={{ minWidth: 0 }}>
                                      <div className="fw-semibold text-truncate" style={{ fontSize: '0.9rem' }}>{c.company_name}</div>
                                      <div className="text-muted" style={{ fontSize: '0.75rem' }}><i className="bi bi-hash"></i>{c.customer_code || '—'}</div>
                                    </div>
                                  </div>
                                  <button className="btn btn-sm btn-primary w-100 mt-1" style={{ borderRadius: 8, fontSize: '0.8rem' }} onClick={() => openCustModal(c)}>
                                    <i className="bi bi-eye me-1"></i>View Details
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      <Pagination page={custPage} setPage={setCustPage} totalPages={totalPages} total={sorted.length} perPage={custPerPage} setPerPage={setCustPerPage} startIdx={startIdx} />
                    </>
                  )}
                </div>
              )
            })()}

            {/* ===== INVOICES TAB ===== */}
            {activeTab === 'invoices' && (() => {
              const filtered = invoices.filter(inv => {
                if (!invSearch) return true
                const s = invSearch.toLowerCase()
                return (inv.company_name || '').toLowerCase().includes(s)
                  || (inv.invoice_number || '').toLowerCase().includes(s)
                  || (inv.po_number || '').toLowerCase().includes(s)
              })
              const sorted = sortData(filtered, invSort, (inv, f) => {
                if (f === 'company_name') return inv.company_name || ''
                if (f === 'invoice_date') return inv.invoice_date || ''
                if (f === 'po_number') return inv.po_number || ''
                if (f === 'invoice_number') return inv.invoice_number || ''
                if (f === 'total_qty') return inv.total_qty || 0
                if (f === 'net_amount') return inv.net_amount || 0
                return ''
              })
              const totalPages = Math.ceil(sorted.length / invPerPage) || 1
              const startIdx = (invPage - 1) * invPerPage
              const pageData = sorted.slice(startIdx, startIdx + invPerPage)
              const invColDefs = [
                { key: 'line', label: 'Line' },
                { key: 'customer', label: 'Customer' },
                { key: 'date', label: 'Date' },
                { key: 'po', label: 'Po#' },
                { key: 'invoice', label: 'Invoice#' },
                { key: 'qty', label: 'Qty' },
                { key: 'total', label: 'InvTotal' },
                { key: 'action', label: 'Action' },
              ]
              const invColSpan = invColDefs.filter(c => invCols[c.key]).length || 1
              const invTotalAmt = invoices.reduce((s, inv) => s + (inv.net_amount || 0), 0)
              const invTotalQty = invoices.reduce((s, inv) => s + (inv.total_qty || 0), 0)
              const uniqueCusts = new Set(invoices.map(inv => inv.company_name)).size
              return (
                <div>
                  {/* Stats Bar */}
                  <div className="d-flex flex-wrap gap-3 mb-3">
                    {[
                      { icon: 'bi-receipt', label: 'Total Invoices', value: invoices.length.toLocaleString(), color: '#2563eb', bg: '#eff6ff' },
                      { icon: 'bi-currency-dollar', label: 'Total Amount', value: fmt(invTotalAmt), color: '#16a34a', bg: '#f0fdf4' },
                      { icon: 'bi-box-seam', label: 'Total Qty', value: invTotalQty.toLocaleString(), color: '#e67e22', bg: '#fff7ed' },
                      { icon: 'bi-building', label: 'Unique Customers', value: uniqueCusts, color: '#7c3aed', bg: '#f5f3ff' },
                    ].map((s, i) => (
                      <div key={i} className="d-flex align-items-center gap-2 px-3 py-2 flex-fill" style={{ background: s.bg, borderRadius: 10, border: `1px solid ${s.color}20`, minWidth: 150 }}>
                        <div style={{ width: 34, height: 34, borderRadius: 8, background: s.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <i className={`bi ${s.icon}`} style={{ color: s.color, fontSize: '0.9rem' }}></i>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{s.label}</div>
                          <div className="fw-bold" style={{ fontSize: '0.95rem', color: s.color }}>{s.value}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Toolbar search={invSearch} onSearch={setInvSearch} onRefresh={() => { setInvoices([]); setInvLoading(true); setInvPage(1); api.getSalesRepInvoices(id).then(d => { setInvoices(d || []); setInvLoading(false) }).catch(() => setInvLoading(false)) }} viewMode={invViewMode} onViewMode={setInvViewMode} colDefs={invColDefs} cols={invCols} onColToggle={k => setInvCols(prev => ({ ...prev, [k]: !prev[k] }))} loading={invLoading} resetPage={() => setInvPage(1)} />

                  {invViewMode === 'table' ? (
                    <>
                      {invLoading ? (
                        <div className="text-center py-5"><div className="spinner-border text-primary"></div><div className="mt-2 text-muted">Loading invoices...</div></div>
                      ) : (
                        <div className="table-responsive" style={{ maxHeight: 520, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                          <table className="table table-uf align-middle mb-0" style={{ fontSize: '0.85rem' }}>
                            <thead>
                              <tr>
                                {invCols.line && <th style={{ ...thStyle, width: 60, textAlign: 'center' }}>#</th>}
                                {invCols.customer && <th style={thStyle} onClick={() => toggleSort(setInvSort, 'company_name')}>Customer <SortIcon field="company_name" sort={invSort} /></th>}
                                {invCols.date && <th style={{ ...thStyle, width: 110 }} onClick={() => toggleSort(setInvSort, 'invoice_date')}>Date <SortIcon field="invoice_date" sort={invSort} /></th>}
                                {invCols.po && <th style={{ ...thStyle, width: 100, textAlign: 'center' }} onClick={() => toggleSort(setInvSort, 'po_number')}>PO# <SortIcon field="po_number" sort={invSort} /></th>}
                                {invCols.invoice && <th style={{ ...thStyle, width: 110, textAlign: 'center' }} onClick={() => toggleSort(setInvSort, 'invoice_number')}>Invoice# <SortIcon field="invoice_number" sort={invSort} /></th>}
                                {invCols.qty && <th style={{ ...thStyle, width: 70, textAlign: 'right' }} onClick={() => toggleSort(setInvSort, 'total_qty')}>Qty <SortIcon field="total_qty" sort={invSort} /></th>}
                                {invCols.total && <th style={{ ...thStyle, width: 120, textAlign: 'right' }} onClick={() => toggleSort(setInvSort, 'net_amount')}>Total <SortIcon field="net_amount" sort={invSort} /></th>}
                                {invCols.action && <th style={{ ...thStyle, width: 100, textAlign: 'center', cursor: 'default' }}>Action</th>}
                              </tr>
                            </thead>
                            <tbody>
                              {pageData.length === 0 ? (
                                <tr><td colSpan={invColSpan} className="text-center text-muted py-5"><i className="bi bi-file-earmark-text fs-1 d-block mb-2 opacity-25"></i>No invoices found</td></tr>
                              ) : pageData.map((inv, idx) => (
                                <tr key={inv._id} style={{ background: idx % 2 === 0 ? '#fff' : '#f8fafc' }}>
                                  {invCols.line && <td style={{ ...tdCenter, color: '#94a3b8', fontWeight: 600 }}>{startIdx + idx + 1}</td>}
                                  {invCols.customer && <td style={tdStyle} className="fw-semibold">{inv.company_name}</td>}
                                  {invCols.date && <td style={tdStyle}>{fmtDate(inv.invoice_date)}</td>}
                                  {invCols.po && <td style={tdCenter}><span className="badge text-white px-2 py-1" style={{ background: '#e67e22', fontSize: '0.8rem', borderRadius: 5 }}>{inv.po_number || '-'}</span></td>}
                                  {invCols.invoice && <td style={tdCenter}><span className="badge text-white px-2 py-1" style={{ background: '#2563eb', fontSize: '0.8rem', borderRadius: 5 }}>{inv.invoice_number || '-'}</span></td>}
                                  {invCols.qty && <td style={tdRight}>{inv.total_qty}</td>}
                                  {invCols.total && <td style={{ ...tdRight, fontWeight: 600 }}>{fmt(inv.net_amount)}</td>}
                                  {invCols.action && <td style={tdCenter}>
                                    <div className="btn-group btn-group-sm">
                                      <button className="btn btn-outline-primary" title="View Invoice" onClick={() => openInvModal(inv)} style={{ fontSize: '0.78rem' }}><i className="bi bi-file-earmark-text"></i></button>
                                      <button className="btn btn-outline-secondary" title="Packing Slip" onClick={() => openPackModal(inv)} style={{ fontSize: '0.78rem' }}><i className="bi bi-box-seam"></i></button>
                                    </div>
                                  </td>}
                                </tr>
                              ))}
                            </tbody>
                            {pageData.length > 0 && (
                              <tfoot>
                                <tr style={{ background: '#f1f5f9', borderTop: '2px solid #cbd5e1' }}>
                                  {invCols.line && <td style={{ ...tdCenter, fontWeight: 700 }}></td>}
                                  {invCols.customer && <td style={{ ...tdStyle, fontWeight: 700, fontSize: '0.82rem' }}>Page Total</td>}
                                  {invCols.date && <td style={tdStyle}></td>}
                                  {invCols.po && <td style={tdCenter}></td>}
                                  {invCols.invoice && <td style={tdCenter}></td>}
                                  {invCols.qty && <td style={{ ...tdRight, fontWeight: 700 }}>{pageData.reduce((s, inv) => s + (inv.total_qty || 0), 0)}</td>}
                                  {invCols.total && <td style={{ ...tdRight, fontWeight: 700, color: '#16a34a' }}>{fmt(pageData.reduce((s, inv) => s + (inv.net_amount || 0), 0))}</td>}
                                  {invCols.action && <td style={tdCenter}></td>}
                                </tr>
                              </tfoot>
                            )}
                          </table>
                        </div>
                      )}
                      <Pagination page={invPage} setPage={setInvPage} totalPages={totalPages} total={sorted.length} perPage={invPerPage} setPerPage={setInvPerPage} startIdx={startIdx} />
                    </>
                  ) : (
                    <>
                      {invLoading ? (
                        <div className="text-center py-5"><div className="spinner-border text-primary"></div><div className="mt-2 text-muted">Loading invoices...</div></div>
                      ) : pageData.length === 0 ? (
                        <div className="text-center text-muted py-5"><i className="bi bi-file-earmark-text fs-1 d-block mb-2 opacity-25"></i>No invoices found</div>
                      ) : (
                        <div className="row g-3">
                          {pageData.map((inv, idx) => (
                            <div className="col-md-4 col-sm-6" key={inv._id}>
                              <div className="card border-0 shadow-sm h-100" style={{ borderRadius: 12, overflow: 'hidden', transition: 'transform 0.15s, box-shadow 0.15s' }} onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.1)' }} onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '' }}>
                                <div className="card-header py-2 px-3 text-white" style={{ background: 'linear-gradient(135deg, #2563eb, #1e40af)', border: 'none' }}>
                                  <div className="d-flex justify-content-between align-items-center">
                                    <span className="fw-semibold" style={{ fontSize: '0.85rem' }}><i className="bi bi-receipt me-1"></i>Invoice #{inv.invoice_number || '-'}</span>
                                    <span className="badge bg-white bg-opacity-25" style={{ fontSize: '0.7rem' }}>#{startIdx + idx + 1}</span>
                                  </div>
                                </div>
                                <div className="card-body p-3" style={{ fontSize: '0.83rem' }}>
                                  <div className="mb-1"><i className="bi bi-building text-muted me-1"></i><strong>{inv.company_name}</strong></div>
                                  <div className="mb-1"><i className="bi bi-calendar text-muted me-1"></i>{fmtDate(inv.invoice_date)}</div>
                                  <div className="d-flex gap-2 mb-2">
                                    <span className="badge text-white px-2 py-1" style={{ background: '#e67e22', fontSize: '0.75rem' }}>PO# {inv.po_number || '-'}</span>
                                    <span className="text-muted">Qty: <strong>{inv.total_qty}</strong></span>
                                  </div>
                                  <div className="fw-bold mb-2" style={{ fontSize: '1rem', color: '#1e40af' }}>{fmt(inv.net_amount)}</div>
                                  <div className="d-flex gap-1">
                                    <button className="btn btn-sm btn-primary flex-fill" style={{ borderRadius: 6, fontSize: '0.78rem' }} onClick={() => openInvModal(inv)}><i className="bi bi-file-earmark-text me-1"></i>Invoice</button>
                                    <button className="btn btn-sm btn-outline-secondary flex-fill" style={{ borderRadius: 6, fontSize: '0.78rem' }} onClick={() => openPackModal(inv)}><i className="bi bi-box-seam me-1"></i>Packing</button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      <Pagination page={invPage} setPage={setInvPage} totalPages={totalPages} total={sorted.length} perPage={invPerPage} setPerPage={setInvPerPage} startIdx={startIdx} />
                    </>
                  )}
                </div>
              )
            })()}

            {/* ===== COMMISSIONS TAB ===== */}
            {activeTab === 'commissions' && (() => {
              const filtered = commissions.filter(c => {
                if (!commSearch) return true
                const s = commSearch.toLowerCase()
                return (c.invoice_number || '').toLowerCase().includes(s)
              })
              const sorted = sortData(filtered, commSort, (c, f) => {
                if (f === 'invoice_number') return c.invoice_number || ''
                if (f === 'invoice_date') return c.invoice_date || ''
                if (f === 'total_qty') return c.total_qty || 0
                if (f === 'po_total') return c.po_total || 0
                if (f === 'com_total') return c.com_total || 0
                if (f === 'rep_com_total') return c.rep_com_total || 0
                if (f === 'commission_paid_status') return c.commission_paid_status || 0
                return ''
              })
              const totalPages = Math.ceil(sorted.length / commPerPage) || 1
              const startIdx = (commPage - 1) * commPerPage
              const pageData = sorted.slice(startIdx, startIdx + commPerPage)
              const commColDefs = [
                { key: 'line', label: 'Line' },
                { key: 'invoice', label: 'Invoice #' },
                { key: 'date', label: 'Invoice Date' },
                { key: 'qty', label: 'Qty' },
                { key: 'poTotal', label: 'PO Total' },
                { key: 'comTotal', label: 'ComTotal' },
                { key: 'repComTotal', label: 'REPComTotal' },
                { key: 'commPaid', label: 'CommPaid' },
                { key: 'action', label: 'Action' },
              ]
              const commColSpan = commColDefs.filter(c => commCols[c.key]).length || 1
              const paidInfo = c => {
                const dt = c.comm_paid_date ? new Date(c.comm_paid_date).toLocaleDateString() : '-/-/-'
                if (c.commission_paid_status === 2) return { label: 'Paid in Full', bg: '#E4F7D7', color: '#2e7d32', icon: 'bi-check-circle-fill', date: dt }
                if (c.commission_paid_status === 1) return { label: 'Partial Payment', bg: '#FEE5CB', color: '#e65100', icon: 'bi-clock-fill', date: dt }
                return { label: 'Zero Payment', bg: '#FFD2D3', color: '#c62828', icon: 'bi-x-circle-fill', date: dt }
              }
              const commTotalPO = commissions.reduce((s, c) => s + (c.po_total || 0), 0)
              const commTotalRep = commissions.reduce((s, c) => s + (c.rep_com_total || 0), 0)
              const paidCount = commissions.filter(c => c.commission_paid_status === 2).length
              const unpaidCount = commissions.filter(c => c.commission_paid_status === 0).length
              return (
                <div>
                  {/* Stats Bar */}
                  <div className="d-flex flex-wrap gap-3 mb-3">
                    {[
                      { icon: 'bi-cash-stack', label: 'Total Records', value: commissions.length.toLocaleString(), color: '#2563eb', bg: '#eff6ff' },
                      { icon: 'bi-wallet2', label: 'Total PO Amount', value: fmt(commTotalPO), color: '#e67e22', bg: '#fff7ed' },
                      { icon: 'bi-currency-dollar', label: 'REP Commission', value: fmt(commTotalRep), color: '#16a34a', bg: '#f0fdf4' },
                      { icon: 'bi-check-circle-fill', label: 'Paid', value: paidCount, color: '#2e7d32', bg: '#f0fdf4' },
                      { icon: 'bi-x-circle-fill', label: 'Unpaid', value: unpaidCount, color: '#c62828', bg: '#fef2f2' },
                    ].map((s, i) => (
                      <div key={i} className="d-flex align-items-center gap-2 px-3 py-2 flex-fill" style={{ background: s.bg, borderRadius: 10, border: `1px solid ${s.color}20`, minWidth: 130 }}>
                        <div style={{ width: 34, height: 34, borderRadius: 8, background: s.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <i className={`bi ${s.icon}`} style={{ color: s.color, fontSize: '0.9rem' }}></i>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{s.label}</div>
                          <div className="fw-bold" style={{ fontSize: '0.95rem', color: s.color }}>{s.value}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Toolbar search={commSearch} onSearch={setCommSearch} onRefresh={() => { setCommissions([]); setCommLoading(true); setCommPage(1); api.getSalesRepCommissions(id).then(d => { setCommissions(d || []); setCommLoading(false) }).catch(() => setCommLoading(false)) }} viewMode={commViewMode} onViewMode={setCommViewMode} colDefs={commColDefs} cols={commCols} onColToggle={k => setCommCols(prev => ({ ...prev, [k]: !prev[k] }))} loading={commLoading} resetPage={() => setCommPage(1)} />

                  {commViewMode === 'table' ? (
                    <>
                      {commLoading ? (
                        <div className="text-center py-5"><div className="spinner-border text-primary"></div><div className="mt-2 text-muted">Loading commissions...</div></div>
                      ) : (
                        <div className="table-responsive" style={{ maxHeight: 520, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                          <table className="table table-uf align-middle mb-0" style={{ fontSize: '0.85rem' }}>
                            <thead>
                              <tr>
                                {commCols.line && <th style={{ ...thStyle, width: 60, textAlign: 'center' }}>#</th>}
                                {commCols.invoice && <th style={{ ...thStyle, width: 110 }} onClick={() => toggleSort(setCommSort, 'invoice_number')}>Invoice # <SortIcon field="invoice_number" sort={commSort} /></th>}
                                {commCols.date && <th style={{ ...thStyle, width: 110 }} onClick={() => toggleSort(setCommSort, 'invoice_date')}>Date <SortIcon field="invoice_date" sort={commSort} /></th>}
                                {commCols.qty && <th style={{ ...thStyle, width: 70, textAlign: 'right' }} onClick={() => toggleSort(setCommSort, 'total_qty')}>Qty <SortIcon field="total_qty" sort={commSort} /></th>}
                                {commCols.poTotal && <th style={{ ...thStyle, textAlign: 'right' }} onClick={() => toggleSort(setCommSort, 'po_total')}>PO Total <SortIcon field="po_total" sort={commSort} /></th>}
                                {commCols.comTotal && <th style={{ ...thStyle, textAlign: 'right' }} onClick={() => toggleSort(setCommSort, 'com_total')}>ComTotal <SortIcon field="com_total" sort={commSort} /></th>}
                                {commCols.repComTotal && <th style={{ ...thStyle, textAlign: 'right' }} onClick={() => toggleSort(setCommSort, 'rep_com_total')}>REP Com <SortIcon field="rep_com_total" sort={commSort} /></th>}
                                {commCols.commPaid && <th style={{ ...thStyle, width: 170 }} onClick={() => toggleSort(setCommSort, 'commission_paid_status')}>CommPaid <SortIcon field="commission_paid_status" sort={commSort} /></th>}
                                {commCols.action && <th style={{ ...thStyle, width: 70, textAlign: 'center', cursor: 'default' }}>Action</th>}
                              </tr>
                            </thead>
                            <tbody>
                              {pageData.length === 0 ? (
                                <tr><td colSpan={commColSpan} className="text-center text-muted py-5"><i className="bi bi-cash-stack fs-1 d-block mb-2 opacity-25"></i>No commission records found</td></tr>
                              ) : pageData.map((c, idx) => {
                                const pi = paidInfo(c)
                                return (
                                <tr key={c._id} style={{ background: pi.bg, borderLeft: `4px solid ${pi.color}` }}>
                                  {commCols.line && <td style={{ ...tdCenter, color: '#64748b', fontWeight: 600 }}>{startIdx + idx + 1}</td>}
                                  {commCols.invoice && <td style={{ ...tdStyle, fontWeight: 600 }}>{c.invoice_number}</td>}
                                  {commCols.date && <td style={tdStyle}>{fmtDate(c.invoice_date)}</td>}
                                  {commCols.qty && <td style={tdRight}>{c.total_qty}</td>}
                                  {commCols.poTotal && <td style={tdRight}>{fmt(c.po_total)}</td>}
                                  {commCols.comTotal && <td style={tdRight}>{fmt(c.com_total)}</td>}
                                  {commCols.repComTotal && <td style={{ ...tdRight, fontWeight: 700 }}>{fmt(c.rep_com_total)}</td>}
                                  {commCols.commPaid && <td style={tdStyle}>
                                    <div className="d-flex align-items-center gap-1">
                                      <i className={`bi ${pi.icon}`} style={{ color: pi.color, fontSize: '0.9rem' }}></i>
                                      <div style={{ lineHeight: 1.2 }}>
                                        <div style={{ fontSize: '0.78rem', fontWeight: 700, color: pi.color }}>{pi.label}</div>
                                        <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{pi.date}</div>
                                      </div>
                                    </div>
                                  </td>}
                                  {commCols.action && <td style={tdCenter}>
                                    <div className="d-flex gap-1 justify-content-center">
                                      {c.comm_id ? (
                                        <button className="btn btn-sm btn-outline-info" style={{ borderRadius: 6, fontSize: '0.72rem', padding: '2px 6px' }} title="View Commission" onClick={() => openCommView(c)}><i className="bi bi-eye"></i></button>
                                      ) : (
                                        <Link to={`/commissions`} className="btn btn-sm btn-outline-success" style={{ borderRadius: 6, fontSize: '0.72rem', padding: '2px 6px' }} title="Add Commission"><i className="bi bi-plus"></i></Link>
                                      )}
                                    </div>
                                  </td>}
                                </tr>
                                )
                              })}
                            </tbody>
                            {pageData.length > 0 && (
                              <tfoot>
                                <tr style={{ background: '#f1f5f9', borderTop: '2px solid #cbd5e1' }}>
                                  {commCols.line && <td style={{ ...tdCenter, fontWeight: 700 }}></td>}
                                  {commCols.invoice && <td style={{ ...tdStyle, fontWeight: 700, fontSize: '0.82rem' }}>Page Total</td>}
                                  {commCols.date && <td style={tdStyle}></td>}
                                  {commCols.qty && <td style={{ ...tdRight, fontWeight: 700 }}>{pageData.reduce((s, c) => s + (c.total_qty || 0), 0)}</td>}
                                  {commCols.poTotal && <td style={{ ...tdRight, fontWeight: 700 }}>{fmt(pageData.reduce((s, c) => s + (c.po_total || 0), 0))}</td>}
                                  {commCols.comTotal && <td style={{ ...tdRight, fontWeight: 700 }}>{fmt(pageData.reduce((s, c) => s + (c.com_total || 0), 0))}</td>}
                                  {commCols.repComTotal && <td style={{ ...tdRight, fontWeight: 700, color: '#16a34a' }}>{fmt(pageData.reduce((s, c) => s + (c.rep_com_total || 0), 0))}</td>}
                                  {commCols.commPaid && <td style={tdStyle}></td>}
                                  {commCols.action && <td style={tdCenter}></td>}
                                </tr>
                              </tfoot>
                            )}
                          </table>
                        </div>
                      )}
                      <Pagination page={commPage} setPage={setCommPage} totalPages={totalPages} total={sorted.length} perPage={commPerPage} setPerPage={setCommPerPage} startIdx={startIdx} />
                    </>
                  ) : (
                    <>
                      {commLoading ? (
                        <div className="text-center py-5"><div className="spinner-border text-primary"></div><div className="mt-2 text-muted">Loading commissions...</div></div>
                      ) : pageData.length === 0 ? (
                        <div className="text-center text-muted py-5"><i className="bi bi-cash-stack fs-1 d-block mb-2 opacity-25"></i>No commission records found</div>
                      ) : (
                        <div className="row g-3">
                          {pageData.map((c, idx) => {
                            const pi = paidInfo(c)
                            return (
                            <div className="col-md-4 col-sm-6" key={c._id}>
                              <div className="card border-0 shadow-sm h-100" style={{ borderRadius: 12, overflow: 'hidden', borderLeft: `4px solid ${pi.color}`, transition: 'transform 0.15s, box-shadow 0.15s' }} onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.1)' }} onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '' }}>
                                <div className="card-header py-2 px-3 d-flex justify-content-between align-items-center" style={{ background: pi.bg, border: 'none' }}>
                                  <span className="fw-bold" style={{ fontSize: '0.85rem', color: pi.color }}><i className={`bi ${pi.icon} me-1`}></i>Invoice #{c.invoice_number}</span>
                                  <span className="badge text-white px-2" style={{ background: pi.color, fontSize: '0.68rem', borderRadius: 10 }}>{pi.label}</span>
                                </div>
                                <div className="card-body p-3" style={{ fontSize: '0.83rem' }}>
                                  <div className="row g-1 mb-2">
                                    <div className="col-6"><span className="text-muted">Date:</span> {fmtDate(c.invoice_date)}</div>
                                    <div className="col-6 text-end"><span className="text-muted">Qty:</span> <strong>{c.total_qty}</strong></div>
                                  </div>
                                  <div className="row g-1 mb-2">
                                    <div className="col-6"><span className="text-muted">PO Total:</span><br/><strong>{fmt(c.po_total)}</strong></div>
                                    <div className="col-6 text-end"><span className="text-muted">REP Com:</span><br/><strong style={{ color: '#1e40af' }}>{fmt(c.rep_com_total)}</strong></div>
                                  </div>
                                  {c.com_total > 0 && <div className="text-muted mb-1" style={{ fontSize: '0.78rem' }}>ComTotal: {fmt(c.com_total)}</div>}
                                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{pi.date !== '-/-/-' ? `Paid: ${pi.date}` : ''}</div>
                                </div>
                              </div>
                            </div>
                            )
                          })}
                        </div>
                      )}
                      <Pagination page={commPage} setPage={setCommPage} totalPages={totalPages} total={sorted.length} perPage={commPerPage} setPerPage={setCommPerPage} startIdx={startIdx} />
                    </>
                  )}
                </div>
              )
            })()}

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
        <div className="modal fade show d-block" tabIndex="-1" style={{ zIndex: 1055 }} onClick={e => { if (e.target === e.currentTarget) setShowCustModal(false) }}>
          <div className="modal-dialog modal-dialog-centered modal-lg" style={{ maxWidth: 1000 }}>
            <div className="modal-content border-0" style={{ borderRadius: 16, overflow: 'hidden', boxShadow: '0 25px 60px rgba(0,0,0,0.3)' }}>
              {/* Header */}
              <div className="modal-header border-0 py-3 px-4" style={{ background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)' }}>
                <div className="d-flex align-items-center gap-3">
                  <div style={{ width: 42, height: 42, borderRadius: 12, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <i className="bi bi-building text-white fs-5"></i>
                  </div>
                  <div>
                    <h5 className="modal-title fw-bold text-white mb-0" style={{ fontSize: '1.1rem' }}>Customer History</h5>
                    <div className="text-white" style={{ fontSize: '0.82rem', opacity: 0.85 }}>{custDetail?.company_name || ''}{custDetail?.customer_code ? ' — ' + custDetail.customer_code : ''}</div>
                  </div>
                </div>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowCustModal(false)}></button>
              </div>
              <div className="modal-body px-4 py-3" style={{ maxHeight: '76vh', overflowY: 'auto', background: '#f8fafb' }}>
                {custDetailLoading ? (
                  <div className="text-center py-5"><div className="spinner-border text-success"></div><div className="mt-2 text-muted">Loading customer details...</div></div>
                ) : custDetail && custDetail._error ? (
                  <div className="text-center py-4 text-muted">
                    <i className="bi bi-exclamation-circle fs-1 d-block mb-2"></i>
                    Could not load full details for <strong>{custDetail.company_name}</strong>
                  </div>
                ) : custDetail ? (() => {
                  const assignedEmails = (custDetail.emails || []).filter(e => e.status === 'active')
                  const assignedReps = custDetail.assignedReps || []
                  const contacts = custDetail.contacts || []
                  const addresses = custDetail.addresses || []
                  const nn = v => v && v !== 'Null' ? v : ''
                  const lbl = { width: 135, padding: '7px 14px', fontSize: '0.82rem', color: '#64748b', fontWeight: 600, background: '#f8fafc', whiteSpace: 'nowrap' }
                  const val = { padding: '7px 14px', fontSize: '0.82rem', color: '#1e293b' }
                  const sectionHead = (icon, title, color) => (
                    <div className="d-flex align-items-center gap-2 px-3 py-2" style={{ background: color || '#16a34a', borderRadius: '8px 8px 0 0' }}>
                      <i className={`bi ${icon} text-white`} style={{ fontSize: '0.85rem' }}></i>
                      <span className="fw-semibold text-white" style={{ fontSize: '0.85rem' }}>{title}</span>
                    </div>
                  )
                  return (
                    <>
                      {/* Top summary bar */}
                      <div className="d-flex flex-wrap gap-3 mb-3 p-3" style={{ background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                        <div className="d-flex align-items-center gap-2">
                          <div style={{ width: 36, height: 36, borderRadius: 8, background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <i className="bi bi-hash" style={{ color: '#16a34a', fontWeight: 700 }}></i>
                          </div>
                          <div>
                            <div className="text-muted" style={{ fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Cust Code</div>
                            <div className="fw-bold" style={{ fontSize: '0.88rem' }}>{custDetail.customer_code || '—'}</div>
                          </div>
                        </div>
                        <div className="d-flex align-items-center gap-2">
                          <div style={{ width: 36, height: 36, borderRadius: 8, background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <i className="bi bi-tag" style={{ color: '#2563eb' }}></i>
                          </div>
                          <div>
                            <div className="text-muted" style={{ fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Type</div>
                            <div className="fw-bold" style={{ fontSize: '0.88rem', textTransform: 'capitalize' }}>{custDetail.customer_type || '—'}</div>
                          </div>
                        </div>
                        {assignedReps.length > 0 && (
                          <div className="d-flex align-items-center gap-2 ms-auto">
                            <div style={{ width: 36, height: 36, borderRadius: 8, background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <i className="bi bi-people-fill" style={{ color: '#16a34a' }}></i>
                            </div>
                            <div>
                              <div className="text-muted" style={{ fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Assigned Reps</div>
                              <div className="d-flex flex-wrap gap-1">
                                {assignedReps.map((r, i) => (
                                  <span key={i} className="badge px-2 py-1" style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)', color: '#fff', fontSize: '0.72rem', fontWeight: 600, borderRadius: 6 }}>{r.name}</span>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="row g-3">
                        {/* Customer Info */}
                        <div className="col-md-6">
                          <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                            {sectionHead('bi-info-circle-fill', 'Customer Info')}
                            <table className="table table-borderless mb-0">
                              <tbody>
                                <tr style={{ borderBottom: '1px solid #f1f5f9' }}><td style={lbl}>Cust #:</td><td style={val}><span className="fw-semibold">{custDetail.customer_code || '—'}</span></td></tr>
                                <tr style={{ borderBottom: '1px solid #f1f5f9' }}><td style={lbl}>Name:</td><td style={val}><span style={{ color: '#2563eb', fontWeight: 600 }}>{custDetail.company_name || '—'}</span></td></tr>
                                <tr style={{ borderBottom: '1px solid #f1f5f9' }}><td style={lbl}>Type:</td><td style={{ ...val, textTransform: 'capitalize' }}>{custDetail.customer_type || '—'}</td></tr>
                                {assignedEmails.length > 0 && (
                                  <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                                    <td style={{ ...lbl, verticalAlign: 'top' }}>Assigned Emails:</td>
                                    <td style={val}>
                                      <div className="d-flex flex-wrap gap-1">
                                        {assignedEmails.map((e, i) => (
                                          <span key={i} className="badge px-2 py-1" style={{ background: '#dcfce7', color: '#15803d', fontSize: '0.75rem', borderRadius: 6 }}>{e.email}</span>
                                        ))}
                                      </div>
                                    </td>
                                  </tr>
                                )}
                                <tr style={{ borderBottom: '1px solid #f1f5f9' }}><td style={lbl}>Terms:</td><td style={val}>{custDetail.terms || <span className="text-muted fst-italic">—</span>}</td></tr>
                                <tr style={{ borderBottom: '1px solid #f1f5f9' }}><td style={lbl}>FOB:</td><td style={val}>{custDetail.fob || <span className="text-muted fst-italic">—</span>}</td></tr>
                                <tr style={{ borderBottom: '1px solid #f1f5f9' }}><td style={lbl}>Ship Info:</td><td style={val}>{custDetail.ship || <span className="text-muted fst-italic">—</span>}</td></tr>
                                <tr style={{ borderBottom: '1px solid #f1f5f9' }}><td style={lbl}>Ship Via:</td><td style={val}>{custDetail.ship_via || <span className="text-muted fst-italic">—</span>}</td></tr>
                                <tr><td style={lbl}>Project:</td><td style={val}>{custDetail.project ? <span className="fw-semibold" style={{ color: '#7c3aed' }}>{custDetail.project}</span> : <span className="text-muted fst-italic">—</span>}</td></tr>
                              </tbody>
                            </table>
                          </div>
                        </div>

                        {/* Customer Notes */}
                        <div className="col-md-6">
                          <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0', overflow: 'hidden', height: '100%', display: 'flex', flexDirection: 'column' }}>
                            {sectionHead('bi-journal-text', 'Customer Notes')}
                            <div className="p-3 flex-grow-1" style={{ fontSize: '0.82rem', color: '#334155', lineHeight: 1.6, overflowY: 'auto', maxHeight: 320 }}>
                              {custDetail.notes ? <div dangerouslySetInnerHTML={{ __html: custDetail.notes.replace(/\\n/g, '') }} /> : <div className="text-center text-muted py-4"><i className="bi bi-journal d-block mb-1" style={{ fontSize: '1.5rem', opacity: 0.3 }}></i><span style={{ fontSize: '0.8rem' }}>No notes</span></div>}
                            </div>
                          </div>
                        </div>

                        {/* Contact Cards */}
                        {contacts.length > 0 ? contacts.map((ct, ci) => {
                          const orderLabel = ct.display_order === 0 ? 'Primary' : ct.display_order === 1 ? 'Backup' : 'Other'
                          const contactName = [nn(ct.title), nn(ct.person)].filter(Boolean).join('. ') || custDetail.contact_name || '—'
                          return (
                            <div className="col-md-6" key={'ct' + ci}>
                              <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                                {sectionHead('bi-person-fill', (nn(ct.label) || 'Contact') + ' (' + orderLabel + ')', '#0d9488')}
                                <div className="p-3">
                                  <div className="d-flex align-items-center gap-3 mb-3 pb-3" style={{ borderBottom: '1px solid #f1f5f9' }}>
                                    <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg, #14b8a6, #0d9488)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                      <i className="bi bi-person-fill text-white" style={{ fontSize: '1.1rem' }}></i>
                                    </div>
                                    <div>
                                      <div className="fw-bold" style={{ fontSize: '0.9rem', color: '#1e293b' }}>{contactName}</div>
                                      {nn(ct.position) && <div className="text-muted" style={{ fontSize: '0.78rem' }}>{ct.position}</div>}
                                    </div>
                                  </div>
                                  <div className="d-flex flex-column gap-2">
                                    {nn(ct.main_phone) && (
                                      <div className="d-flex align-items-center gap-2">
                                        <i className="bi bi-telephone-fill" style={{ color: '#16a34a', fontSize: '0.78rem', width: 16 }}></i>
                                        <span className="text-muted" style={{ fontSize: '0.75rem', width: 70 }}>Main</span>
                                        <span style={{ fontSize: '0.82rem' }}>{ct.main_phone}{nn(ct.main_ext) && ct.main_ext !== '-' ? ', ext ' + ct.main_ext : ''}</span>
                                      </div>
                                    )}
                                    {nn(ct.desk_phone) && (
                                      <div className="d-flex align-items-center gap-2">
                                        <i className="bi bi-telephone" style={{ color: '#64748b', fontSize: '0.78rem', width: 16 }}></i>
                                        <span className="text-muted" style={{ fontSize: '0.75rem', width: 70 }}>Desk</span>
                                        <span style={{ fontSize: '0.82rem' }}>{ct.desk_phone}{nn(ct.desk_ext) && ct.desk_ext !== '-' ? ', ext ' + ct.desk_ext : ''}</span>
                                      </div>
                                    )}
                                    {nn(ct.mobile_phone) && (
                                      <div className="d-flex align-items-center gap-2">
                                        <i className="bi bi-phone-fill" style={{ color: '#8b5cf6', fontSize: '0.78rem', width: 16 }}></i>
                                        <span className="text-muted" style={{ fontSize: '0.75rem', width: 70 }}>Mobile</span>
                                        <span style={{ fontSize: '0.82rem' }}>{ct.mobile_phone}</span>
                                      </div>
                                    )}
                                    {nn(ct.email) && (
                                      <div className="d-flex align-items-center gap-2">
                                        <i className="bi bi-envelope-fill" style={{ color: '#2563eb', fontSize: '0.78rem', width: 16 }}></i>
                                        <span className="text-muted" style={{ fontSize: '0.75rem', width: 70 }}>Email</span>
                                        <a href={'mailto:' + ct.email} className="text-decoration-none" style={{ fontSize: '0.82rem' }}>{ct.email}</a>
                                      </div>
                                    )}
                                    {!nn(ct.main_phone) && !nn(ct.desk_phone) && !nn(ct.mobile_phone) && !nn(ct.email) && (
                                      <div className="text-muted text-center py-2" style={{ fontSize: '0.8rem' }}>No contact details</div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )
                        }) : (
                          <div className="col-md-6">
                            <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                              {sectionHead('bi-person-fill', 'Contact (Primary)', '#0d9488')}
                              <div className="p-3">
                                <div className="d-flex align-items-center gap-3 mb-3 pb-3" style={{ borderBottom: '1px solid #f1f5f9' }}>
                                  <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg, #14b8a6, #0d9488)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <i className="bi bi-person-fill text-white" style={{ fontSize: '1.1rem' }}></i>
                                  </div>
                                  <div className="fw-bold" style={{ fontSize: '0.9rem' }}>{custDetail.contact_name || '—'}</div>
                                </div>
                                <div className="d-flex flex-column gap-2">
                                  {custDetail.phone && (
                                    <div className="d-flex align-items-center gap-2">
                                      <i className="bi bi-telephone-fill" style={{ color: '#16a34a', fontSize: '0.78rem', width: 16 }}></i>
                                      <span className="text-muted" style={{ fontSize: '0.75rem', width: 70 }}>Phone</span>
                                      <span style={{ fontSize: '0.82rem' }}>{custDetail.phone}{custDetail.extension ? ' x' + custDetail.extension : ''}</span>
                                    </div>
                                  )}
                                  {custDetail.email && (
                                    <div className="d-flex align-items-center gap-2">
                                      <i className="bi bi-envelope-fill" style={{ color: '#2563eb', fontSize: '0.78rem', width: 16 }}></i>
                                      <span className="text-muted" style={{ fontSize: '0.75rem', width: 70 }}>Email</span>
                                      <a href={'mailto:' + custDetail.email} className="text-decoration-none" style={{ fontSize: '0.82rem' }}>{custDetail.email}</a>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Address Cards */}
                        {addresses.length > 0 ? addresses.map((addr, ai) => (
                          <div className="col-md-6" key={'addr' + ai}>
                            <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                              {sectionHead('bi-geo-alt-fill', addr.label || 'Address', '#1d4ed8')}
                              <div className="p-3">
                                <div className="d-flex gap-3">
                                  <div style={{ width: 40, height: 40, borderRadius: 10, background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <i className="bi bi-geo-alt-fill" style={{ color: '#2563eb', fontSize: '1rem' }}></i>
                                  </div>
                                  <div style={{ fontSize: '0.82rem', lineHeight: 1.5, color: '#334155' }}>
                                    {addr.name && <div className="fw-semibold mb-1">{addr.name}</div>}
                                    <div>{addr.street || '—'}</div>
                                    {addr.street2 && <div>{addr.street2}</div>}
                                    <div>{[addr.city, addr.state, addr.zip].filter(Boolean).join(', ')}{addr.country ? ' ' + addr.country : ''}</div>
                                  </div>
                                </div>
                                {(addr.email || addr.phone || addr.shipping_acnt) && (
                                  <div className="mt-3 pt-3 d-flex flex-column gap-1" style={{ borderTop: '1px solid #f1f5f9' }}>
                                    {addr.email && (
                                      <div className="d-flex align-items-center gap-2">
                                        <i className="bi bi-envelope" style={{ color: '#64748b', fontSize: '0.75rem', width: 16 }}></i>
                                        <span style={{ fontSize: '0.8rem' }}>{addr.email}</span>
                                      </div>
                                    )}
                                    {addr.phone && (
                                      <div className="d-flex align-items-center gap-2">
                                        <i className="bi bi-telephone" style={{ color: '#64748b', fontSize: '0.75rem', width: 16 }}></i>
                                        <span style={{ fontSize: '0.8rem' }}>{addr.phone}</span>
                                      </div>
                                    )}
                                    {addr.shipping_acnt && (
                                      <div className="d-flex align-items-center gap-2">
                                        <i className="bi bi-truck" style={{ color: '#64748b', fontSize: '0.75rem', width: 16 }}></i>
                                        <span className="text-muted" style={{ fontSize: '0.75rem' }}>Shipping:</span>
                                        <span style={{ fontSize: '0.8rem' }}>{addr.shipping_acnt}</span>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )) : (
                          <div className="col-md-6">
                            <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                              {sectionHead('bi-geo-alt-fill', 'Address', '#1d4ed8')}
                              <div className="p-3">
                                <div className="d-flex gap-3">
                                  <div style={{ width: 40, height: 40, borderRadius: 10, background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <i className="bi bi-geo-alt-fill" style={{ color: '#2563eb', fontSize: '1rem' }}></i>
                                  </div>
                                  <div style={{ fontSize: '0.82rem', lineHeight: 1.5, color: '#334155' }}>
                                    <div className="fw-semibold mb-1">{custDetail.company_name || '—'}</div>
                                    <div>{custDetail.address || '—'}</div>
                                    <div>{[custDetail.city, custDetail.state, custDetail.zip].filter(Boolean).join(', ')}</div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </>
                  )
                })() : null}
              </div>
              <div className="modal-footer border-0 px-4 py-3" style={{ background: '#f8fafb' }}>
                <Link to={'/customers/' + (custDetail?._id || '')} className="btn btn-outline-success btn-sm px-3" style={{ borderRadius: 8 }}>
                  <i className="bi bi-box-arrow-up-right me-1"></i>Open Full Page
                </Link>
                <button type="button" className="btn btn-secondary btn-sm px-4" style={{ borderRadius: 8 }} onClick={() => setShowCustModal(false)}>Close</button>
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

      {/* View Commission Detail Modal - matches old PHP */}
      {(viewCommDetail || viewCommLoading) && (<>
        <div className="modal-backdrop fade show"></div>
        <div className="modal fade show d-block" tabIndex="-1" style={{ overflow: 'auto' }}>
          <div className="modal-dialog modal-xl modal-dialog-scrollable" style={{ maxHeight: '95vh' }}>
            <div className="modal-content border-0 shadow" style={{ maxHeight: '95vh' }}>
              <div className="modal-header border-bottom">
                <h5 className="modal-title">Commission Details</h5>
                <button type="button" className="btn-close" onClick={() => setViewCommDetail(null)}></button>
              </div>
              <div className="modal-body" style={{ overflow: 'auto' }}>
                {viewCommLoading ? (
                  <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>
                ) : viewCommDetail && (() => {
                  const inv = viewCommDetail.invoice || {}
                  const details = viewCommDetail.details || []
                  const payments = viewCommDetail.payments || []
                  const items = viewCommDetail.items || []
                  const reps = viewCommDetail.reps || details
                  const commItemDets = viewCommDetail.commItemDets || []
                  const commRepDets = viewCommDetail.commRepDets || []
                  return (
                    <div>
                      {/* Archive + Update */}
                      <div className="mb-3 d-flex align-items-center gap-3">
                        <div className="form-check">
                          <input className="form-check-input" type="checkbox" id="archiveInv" />
                          <label className="form-check-label" htmlFor="archiveInv">Archive invoice</label>
                        </div>
                        <button className="btn btn-sm btn-primary">Update</button>
                      </div>

                      {/* Commission Info - blue header */}
                      <table className="table table-bordered table-sm mb-4" style={{ fontSize: 13 }}>
                        <thead>
                          <tr style={{ background: '#006BF9', color: '#fff' }}>
                            <th>Commission Invoice #</th>
                            <th>Invoice $</th>
                            <th>Invoice Date</th>
                            <th>Customer Name</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td>{inv.invoice_number || '-'}</td>
                            <td>{fmt(inv.net_amount)}</td>
                            <td>{fmtDate(inv.invoice_date)}</td>
                            <td>{viewCommDetail.company_name || '-'}</td>
                          </tr>
                        </tbody>
                      </table>

                      {/* Invoice Payment Details */}
                      <h6 className="fw-semibold mb-2">Invoice Payment Details</h6>
                      <div style={{ overflowX: 'auto' }}>
                        <table className="table table-bordered table-sm mb-4" style={{ fontSize: 12 }}>
                          <thead>
                            <tr style={{ background: '#3b82f6', color: '#fff' }}>
                              <th>Commission Invoice #</th>
                              <th>Balance Due $</th>
                              <th>Received $</th>
                              <th>Date Rcvd</th>
                              <th>Check# CC#</th>
                              <th>Partial ComTotal</th>
                              <th>Compaid</th>
                              {details.map(d => <th key={d.sales_rep_id} className="text-center">{d.rep_code || d.rep_name || '-'}</th>)}
                            </tr>
                          </thead>
                          <tbody>
                            {payments.length > 0 ? payments.map((p, i) => (
                              <tr key={i}>
                                <td>{inv.invoice_number || '-'}</td>
                                <td>{fmt(parseFloat(p.balance_comm_amount) || 0)}</td>
                                <td>{fmt(parseFloat(p.comm_paid_amount) || 0)}</td>
                                <td>{p.inv_pay_rep_created_on ? fmtDate(p.inv_pay_rep_created_on) : '-'}</td>
                                <td>{p.compaid_mode || '-'}</td>
                                <td>{fmt(parseFloat(p.partial_com_total) || 0)}</td>
                                <td>{p.commission_paid_date || '-'}</td>
                                {details.map(d => {
                                  const match = String(p.rep_id) === String(d.sales_rep_id)
                                  return <td key={d.sales_rep_id} className="text-end">{match ? fmt(parseFloat(p.comm_paid_amount) || 0) : '-'}</td>
                                })}
                              </tr>
                            )) : (
                              <tr>
                                <td></td>
                                <td></td>
                                <td>{fmt(0)}</td>
                                <td></td>
                                <td></td>
                                <td>{fmt(0)}</td>
                                <td></td>
                                {details.map(d => <td key={d.sales_rep_id} className="text-end">{fmt(0)}</td>)}
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>

                      {/* Commission Items - green section matching old PHP */}
                      {(() => {
                        // Calculate totals
                        const totalQty = items.reduce((s, it) => s + (it.qty || 0), 0)
                        const totalNetAmount = items.reduce((s, it) => s + ((it.qty || 0) * (it.unit_cost || 0)), 0)

                        return (
                        <div style={{ background: '#d4edda', borderRadius: 8, padding: 16 }}>
                          <div className="text-center mb-3">
                            <button className="btn btn-danger px-4" onClick={openPayFromView}>Add Payment Details</button>
                          </div>
                          <div style={{ overflowX: 'auto' }}>
                            <table className="table table-bordered table-sm mb-0" style={{ fontSize: 12 }}>
                              <thead>
                                <tr>
                                  <th style={{ background: '#4CB755', color: '#fff' }} colSpan="5"></th>
                                  {details.map(d => (
                                    <th key={d.sales_rep_id} colSpan="2" className="text-center" style={{ background: '#FFFFD4' }}>{d.rep_name || '-'}</th>
                                  ))}
                                </tr>
                                <tr>
                                  <th style={{ background: '#4CB755', color: '#fff' }}>Style</th>
                                  <th style={{ background: '#4CB755', color: '#fff' }}>QTY</th>
                                  <th style={{ background: '#4CB755', color: '#fff' }}>UNIT COST</th>
                                  <th style={{ background: '#4CB755', color: '#fff' }}>BASE $</th>
                                  <th style={{ background: '#4CB755', color: '#fff' }}>TOTAL</th>
                                  {details.map(d => (
                                    <React.Fragment key={d.sales_rep_id}>
                                      <th className="text-center" style={{ background: '#FFFFD4', fontSize: 11 }}>{d.rep_code || '-'}</th>
                                      <th className="text-center" style={{ background: '#FFFFD4', fontSize: 11 }}></th>
                                    </React.Fragment>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {/* Totals row */}
                                <tr className="fw-bold">
                                  <td colSpan="4" style={{ background: '#e8f5e9' }}></td>
                                  <td style={{ background: '#e8f5e9' }}>{fmt(viewCommDetail.total_commission || 0)}</td>
                                  {details.map(d => (
                                    <td key={d.sales_rep_id} colSpan="2" className="text-center" style={{ background: '#FFFFD4' }}>{fmt(d.total_price || 0)}</td>
                                  ))}
                                </tr>
                                {/* Item rows */}
                                {items.length > 0 ? items.map((item, idx) => {
                                  const qty = item.qty || 0
                                  const unitCost = item.unit_cost || 0
                                  const itemId = item.item_id || item.legacy_id
                                  // Get stored commission item detail for this item
                                  const itemDet = commItemDets.find(d => d.item_id === itemId)
                                  // BASE $ from stored data, fallback to unit cost
                                  const basePrice = itemDet?.base_price || unitCost
                                  // TOTAL = stored total_price (per-unit commission total for all reps), fallback to calculation
                                  const totalPerUnit = itemDet?.total_price || 0
                                  return (
                                    <tr key={idx} style={{ background: '#e8f5e9' }}>
                                      <td>{item.item_name || '-'}</td>
                                      <td>{qty}</td>
                                      <td>{fmt(unitCost)}</td>
                                      <td>{fmt(basePrice)}</td>
                                      <td>{fmt(totalPerUnit)}</td>
                                      {details.map(d => {
                                        // Get stored per-rep per-item commission
                                        const repDet = commRepDets.find(r => r.item_id === itemId && r.sales_rep_id === d.sales_rep_id)
                                        const perUnit = repDet?.commission_price || 0
                                        const repItemTotal = repDet?.total_commission_price || (perUnit * qty)
                                        return (
                                          <React.Fragment key={d.sales_rep_id}>
                                            <td className="text-center" style={{ background: '#FFFFD4' }}>{fmt(perUnit)}</td>
                                            <td className="text-center" style={{ background: '#FFFFD4' }}>{fmt(repItemTotal)}</td>
                                          </React.Fragment>
                                        )
                                      })}
                                    </tr>
                                  )
                                }) : (
                                  <tr><td colSpan={5 + details.length * 2} className="text-center text-muted py-2">No items</td></tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                        )
                      })()}
                    </div>
                  )
                })()}
              </div>
              {/* Payment Section - slides in when Add Payment Details clicked */}
              {showPaySection && viewCommDetail && (() => {
                const pInv = viewCommDetail.invoice || {}
                const pNetAmt = pInv.net_amount || 0
                const pCommTotal = viewCommDetail.total_commission || 0
                const pRecAmt = parseFloat(payForm.received_amount) || 0
                const pPct = pNetAmt > 0 ? ((pRecAmt / pNetAmt) * 100).toFixed(2) : '0.00'
                return (
                  <div className="border-top" style={{ background: '#f0f7ff' }}>
                    <div className="px-4 py-3">
                      <div className="d-flex justify-content-between align-items-center mb-3">
                        <h6 className="fw-bold mb-0" style={{ color: '#006BF9' }}>
                          <i className="bi bi-credit-card me-2"></i>Partial Comm. Payment: Invoice #{pInv.invoice_number || ''}
                        </h6>
                        <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setShowPaySection(false)}>
                          <i className="bi bi-x-lg me-1"></i>Cancel
                        </button>
                      </div>
                      <div className="mb-3" style={{ fontSize: 13 }}>
                        <span>Invoice Amt: <strong>{fmt(pNetAmt)}</strong></span>
                        <span className="ms-3">CommTotal: <strong>{fmt(pCommTotal)}</strong></span>
                        {pRecAmt > 0 && <span className="ms-3" style={{ color: '#006BF9', fontWeight: 600 }}>Amount Received: {pPct}% of {fmt(pNetAmt)}</span>}
                      </div>
                      <form onSubmit={handleSavePayment}>
                        <div className="row g-2 mb-2">
                          <div className="col-md-3">
                            <label className="form-label small fw-semibold mb-1">Comm Paid Date</label>
                            <input type="date" className="form-control form-control-sm" value={payForm.commission_paid_date} onChange={e => setPayForm({ ...payForm, commission_paid_date: e.target.value })} />
                          </div>
                          <div className="col-md-2">
                            <label className="form-label small fw-semibold mb-1">Received Amt <span className="text-danger">*</span></label>
                            <input type="number" step="0.01" className="form-control form-control-sm" value={payForm.received_amount} onChange={e => onReceivedAmountChange(e.target.value)} placeholder="0.00" required />
                          </div>
                          <div className="col-md-2">
                            <label className="form-label small fw-semibold mb-1">Commi Amount</label>
                            <input type="text" className="form-control form-control-sm" value={fmt(pNetAmt)} readOnly style={{ background: '#e9ecef' }} />
                          </div>
                          <div className="col-md-2">
                            <label className="form-label small fw-semibold mb-1">SalesTax</label>
                            <input type="text" className="form-control form-control-sm" value={pInv.sales_tax_amount || 0} readOnly style={{ background: '#e9ecef' }} />
                          </div>
                          <div className="col-md-2">
                            <label className="form-label small fw-semibold mb-1">Shipping</label>
                            <input type="text" className="form-control form-control-sm" value={pInv.shipping_costs || '0.00'} readOnly style={{ background: '#e9ecef' }} />
                          </div>
                        </div>
                        <div className="row g-2 mb-2">
                          <div className="col-md-3">
                            <label className="form-label small fw-semibold mb-1">Date Received</label>
                            <input type="date" className="form-control form-control-sm" value={payForm.received_date} onChange={e => setPayForm({ ...payForm, received_date: e.target.value })} />
                          </div>
                          <div className="col-md-2">
                            <label className="form-label small fw-semibold mb-1">Check / CC</label>
                            <input type="text" className="form-control form-control-sm" value={payForm.paid_mode} onChange={e => setPayForm({ ...payForm, paid_mode: e.target.value })} placeholder="Check# or CC" />
                          </div>
                          <div className="col-md-2">
                            <label className="form-label small fw-semibold mb-1">Partial CommTotal</label>
                            <div className="d-flex gap-1">
                              <input type="number" step="0.01" className="form-control form-control-sm" value={payForm.partial_comm_total} onChange={e => setPayForm({ ...payForm, partial_comm_total: e.target.value })} />
                              <button type="button" className="btn btn-sm btn-success px-2" style={{ fontSize: 10 }} onClick={() => setPayForm({ ...payForm, partial_comm_total: String(Math.round(parseFloat(payForm.partial_comm_total) || 0)) })}>Round</button>
                            </div>
                          </div>
                          <div className="col-md-2 d-flex align-items-end pb-1">
                            <div className="d-flex align-items-center gap-2">
                              <input type="checkbox" className="form-check-input" style={{ width: 22, height: 22 }} checked={payForm.mark_paid} onChange={e => setPayForm({ ...payForm, mark_paid: e.target.checked })} id="markPaidInline" />
                              <label className="form-check-label fw-bold" htmlFor="markPaidInline" style={{ fontSize: 14 }}>PAID</label>
                            </div>
                          </div>
                        </div>
                        {/* Check Image */}
                        <div className="row g-2 mb-2">
                          <div className="col-md-3">
                            <label className="form-label small fw-semibold mb-1">Check Image</label>
                            <div style={{ border: '2px dashed #b0bec5', borderRadius: 6, padding: 8, textAlign: 'center', cursor: 'pointer', background: '#fff', fontSize: 12 }}
                              onClick={() => document.getElementById('checkImgInline')?.click()}>
                              <i className="bi bi-image" style={{ fontSize: 20, color: '#90a4ae' }}></i>
                              <div style={{ color: '#546e7a' }}>Drag & drop or <span style={{ color: '#4CB755', fontWeight: 'bold' }}>browse</span></div>
                            </div>
                            <input type="file" id="checkImgInline" accept=".png,.jpg,.jpeg" style={{ display: 'none' }} />
                          </div>
                        </div>
                        {/* Per-Rep */}
                        <div className="mt-2 mb-2">
                          <div className="fw-semibold mb-2" style={{ color: '#4CB755', fontSize: 13 }}><i className="bi bi-people me-1"></i>Sales Rep Commission Payment</div>
                          {Object.entries(payRepAmounts).map(([repId, data]) => (
                            <div className="d-flex align-items-center gap-3 mb-2" key={repId}>
                              <div style={{ width: 220 }}>
                                <div className="fw-semibold" style={{ fontSize: 13 }}>{data.rep_name || `Rep #${repId}`} ({data.rep_code || ''})</div>
                                <div style={{ fontSize: 11 }}>
                                  <strong>({fmt(data.org_amount || 0)})</strong>
                                  <span className="ms-1 fst-italic">Outstanding: <span style={{ color: data.balance > 0 ? '#dc2626' : '#198754' }}>{fmt(data.balance)}</span></span>
                                </div>
                              </div>
                              <input type="number" step="0.01" className="form-control form-control-sm" style={{ width: 160 }} placeholder="Commission Amount"
                                value={data.paid_amount}
                                onChange={e => setPayRepAmounts(prev => ({ ...prev, [repId]: { ...prev[repId], paid_amount: e.target.value } }))} />
                            </div>
                          ))}
                        </div>
                        {/* Email */}
                        <div className="d-flex align-items-center gap-2 mb-3">
                          <label className="form-label small fw-semibold mb-0">Email ID:</label>
                          <input type="text" className="form-control form-control-sm" style={{ maxWidth: 300 }} placeholder="Enter Recipient Emails" />
                        </div>
                        <div className="d-flex gap-2">
                          <button type="submit" className="btn btn-primary px-4">Save/Send</button>
                          <button type="button" className="btn btn-outline-secondary px-3" onClick={() => setShowPaySection(false)}>Cancel</button>
                        </div>
                      </form>
                    </div>
                  </div>
                )
              })()}
              <div className="modal-footer">
                <button className="btn btn-outline-secondary" onClick={() => { setShowPaySection(false); setViewCommDetail(null) }}>Close</button>
              </div>
            </div>
          </div>
        </div>
      </>)}
    </div>
  )
}
