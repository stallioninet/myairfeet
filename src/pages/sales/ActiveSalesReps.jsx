import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Tooltip, Legend } from 'chart.js'
import { Bar, Line } from 'react-chartjs-2'
import { api } from '../../lib/api'
import Pagination from '../../components/Pagination'
import exportCSV from '../../lib/exportCSV'
import PageChartHeader from '../../components/PageChartHeader'
import SlidePanel from '../../components/SlidePanel'
import SalesRepDetailView from '../../components/SalesRepDetailView'

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Tooltip, Legend)

const US_STATES = ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY']
const PHONE_TYPES = ['Main', 'Work', 'Desk', 'Home', 'Mobile']

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

export default function ActiveSalesReps() {
  const navigate = useNavigate()
  const [reps, setReps] = useState([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ total: 0, active: 0, inactive: 0 })
  const [panelOpen, setPanelOpen] = useState(false)
  const [selectedRepId, setSelectedRepId] = useState(null)
  const [filter, setFilter] = useState('active')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(10)
  const [deactivateRep, setDeactivateRep] = useState(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editRep, setEditRep] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [editPhones, setEditPhones] = useState([{ number: '', ext: '', type: 'Main' }])
  const [editAddresses, setEditAddresses] = useState([
    { street: '', city: '', state: '', zip: '', country: 'United States' },
    { street: '', city: '', state: '', zip: '', country: 'United States' }
  ])
  const [showPassword, setShowPassword] = useState(false)
  const [addrLabels, setAddrLabels] = useState(['Address', 'Address'])
  const [editingLabel, setEditingLabel] = useState(null)
  const [labelDraft, setLabelDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const [reportMetric, setReportMetric] = useState('sales')
  const [reportPeriod, setReportPeriod] = useState('this-month')
  const [reportPeriodLabel, setReportPeriodLabel] = useState('This Month')
  const [chartType, setChartType] = useState('bar')
  const [selectedRepIds, setSelectedRepIds] = useState(null) // null = all
  const chartRef = useRef(null)

  const chartColors = ['#2563eb', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#6366f1']

  function seedVal(id, period, metric) {
    let base = 0
    for (let i = 0; i < (id || '').length; i++) base += id.charCodeAt(i)
    base = (base % 20 + 5) * 4200 + 18000
    const m = { 'this-month': 1, 'last-month': 0.87, 'q1': 2.4, 'q2': 2.1, 'ytd': 5.5 }[period] || 1
    const v = base * m
    return metric === 'commissions' ? Math.round(v * 0.15) : Math.round(v)
  }

  function getReportData() {
    const activeReps = reps.filter(r => r.status === 'active')
    const filtered = selectedRepIds === null ? activeReps : activeReps.filter(r => selectedRepIds.includes(r._id))
    return filtered.map((r, i) => ({
      name: (r.first_name + ' ' + r.last_name).trim(),
      id: r._id,
      val: seedVal(r._id, reportPeriod, reportMetric),
      color: chartColors[i % chartColors.length],
    }))
  }

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    setLoading(true)
    try {
      const [data, statsData] = await Promise.all([
        api.getSalesReps('active'),
        api.getSalesRepStats()
      ])
      setReps(data || [])
      setStats(statsData || { total: 0, active: 0, inactive: 0 })
    } catch (err) {
      toast.error('Failed to load sales reps: ' + err.message)
    }
    setLoading(false)
  }

  async function handleDeactivate() {
    if (!deactivateRep) return
    try {
      await api.deactivateSalesRep(deactivateRep._id)
      toast.success((deactivateRep.first_name + ' ' + deactivateRep.last_name) + ' deactivated')
      setDeactivateRep(null)
      fetchData()
    } catch (err) {
      toast.error('Failed to deactivate: ' + err.message)
    }
  }

  async function openEditModal(r) {
    try {
      const full = await api.getSalesRep(r._id)
      setEditRep(full)
      setEditForm({
        rep_number: full.rep_number || '',
        first_name: full.first_name || '',
        last_name: full.last_name || '',
        username: full.username || '',
        email: full.email || '',
        user_cust_code: full.rep_number || '',
        user_notes: full.user_notes || '',
        about: full.about || '',
        password: '',
      })
      if (full.phones && full.phones.length > 0) {
        setEditPhones(full.phones.map(p => ({ number: p.number || '', ext: p.ext || '', type: p.type || 'Main' })))
      } else {
        setEditPhones([{ number: full.phone || '', ext: full.extension || '', type: 'Main' }])
      }
      const addrs = full.addresses || []
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
    } catch (err) {
      toast.error('Failed to load rep details: ' + err.message)
    }
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
      await api.updateSalesRep(editRep._id, payload)
      setShowEditModal(false)
      toast.success('Sales rep updated')
      fetchData()
    } catch (err) {
      toast.error('Failed to update: ' + err.message)
    }
    setSaving(false)
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
      r.email?.toLowerCase().includes(s) || r.rep_number?.toLowerCase().includes(s) ||
      r.address?.toLowerCase().includes(s) || r.city?.toLowerCase().includes(s) || r.zip?.toLowerCase().includes(s) ||
      r.phone?.toLowerCase().includes(s)
  })
  const paginatedReps = filteredReps.slice((page - 1) * perPage, page * perPage)

  const headerStats = [
    { label: 'Active Reps', value: stats.active, icon: 'bi-people-fill', bg: '#eff6ff', color: '#2563eb', trend: 5 },
    { label: 'Inactive Reps', value: stats.inactive, icon: 'bi-person-dash-fill', bg: '#fef2f2', color: '#ef4444', trend: -1 },
    { label: 'Total Reps', value: stats.total, icon: 'bi-graph-up', bg: '#ecfdf5', color: '#10b981', trend: 2 },
  ]

  const reportData = getReportData()
  const chartData = {
    labels: reportData.map(r => r.name),
    datasets: [{
      label: reportMetric === 'commissions' ? 'Commissions' : 'Sales Volume',
      data: reportData.map(r => r.val),
      backgroundColor: reportData.map((_, i) => chartColors[i % chartColors.length] + 'cc'),
      borderRadius: 8,
    }],
  }

  const breadcrumbs = [
    { label: 'Dashboard', link: '/dashboard' },
    { label: 'Sales' },
    { label: 'Active Representatives' }
  ]

  return (
    <>
      <PageChartHeader
        title="Sales Representatives"
        subtitle="Monitor performance and handle assignments"
        breadcrumbs={breadcrumbs}
        stats={headerStats}
        chartData={chartData}
        chartType={chartType === 'line' ? 'line' : 'bar'}
        actions={
          <>
            <div className="btn-group shadow-sm">
              <button className={`btn btn-sm ${reportMetric === 'sales' ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => setReportMetric('sales')}>Sales</button>
              <button className={`btn btn-sm ${reportMetric === 'commissions' ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => setReportMetric('commissions')}>Commissions</button>
            </div>
            <div className="dropdown shadow-sm">
              <button className="btn btn-sm btn-outline-secondary dropdown-toggle" data-bs-toggle="dropdown">{reportPeriodLabel}</button>
              <ul className="dropdown-menu shadow border-0">
                {[['this-month','This Month'],['last-month','Last Month'],['q1','Q1 2026'],['q2','Q2 2026'],['ytd','Year to Date']].map(([k,l]) => (
                  <li key={k}><button className="dropdown-item small" onClick={() => { setReportPeriod(k); setReportPeriodLabel(l) }}>{l}</button></li>
                ))}
              </ul>
            </div>
            <Link to="/sales-reps/create" className="btn btn-sm btn-primary shadow-sm" style={{ fontWeight: 600 }}>
              <i className="bi bi-plus-lg"></i>
            </Link>
          </>
        }
      />


      {/* Filter Pills */}
      <div className="filter-pills d-flex gap-2 mb-3">
        {[
          { key: 'active', label: 'Active', count: stats.active, badge: 'bg-success text-white', link: '/sales-reps/active' },
          { key: 'inactive', label: 'Inactive', count: stats.inactive, badge: 'bg-danger text-white', link: '/sales-reps/inactive' },
        ].map(f => (
          <Link
            key={f.key}
            to={f.link}
            className={`btn btn-outline-secondary${filter === f.key ? ' active' : ''}`}
          >
            {f.label} <span className={`badge ${f.badge} ms-1`}>{f.count}</span>
          </Link>
        ))}
      </div>

      {/* Sales Reps Table */}
      <div className="card border-0 shadow-sm">
        <div className="card-header py-3" style={{ background: 'linear-gradient(135deg, #2563eb, #1e40af)', color: '#fff' }}>
          <div className="d-flex justify-content-between align-items-center">
            <h5 className="mb-0"><i className="bi bi-people me-2"></i>Active Representatives</h5>
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
                    <td colSpan="9" className="text-center py-5 text-muted">No active sales reps found</td>
                  </tr>
                ) : paginatedReps.map((r, index) => {
                  const isInactive = r.status === 'inactive'
                  return (
                    <tr key={r._id}>
                      <td className="ps-4"><code className="px-2 py-1 rounded" style={{ background: '#f1f5f9', color: '#475569', fontSize: '0.82rem' }}>{r.rep_number || '-'}</code></td>
                      <td>
                        <div className="d-flex align-items-center gap-2">
                          <div
                            className="user-avatar"
                            style={{
                              background: avatarColors[index % avatarColors.length],
                              opacity: isInactive ? 0.6 : 1
                            }}
                          >
                            {getInitials(r.first_name, r.last_name)}
                          </div>
                          <div>
                            <div className={`fw-medium${isInactive ? ' text-muted' : ''}`}>
                              {r.first_name} {r.last_name}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td><span className="small">{r.address || '-'}</span></td>
                      <td><span className="small">{r.city || '-'}</span></td>
                      <td><span className="small">{r.zip || '-'}</span></td>
                      <td><span className="small">{r.phone || '-'}{r.extension ? ' x' + r.extension : ''}</span></td>
                      <td>
                        <a href={`mailto:${r.email}`} className={`text-decoration-none small${isInactive ? ' text-muted' : ''}`}>
                          {r.email || '-'}
                        </a>
                      </td>
                      <td className="pe-4 text-center">
                        <button className="btn btn-sm btn-action btn-outline-info me-1" title="View" onClick={() => { setSelectedRepId(r._id); setPanelOpen(true) }}>
                          <i className="bi bi-eye"></i>
                        </button>
                        <button className="btn btn-sm btn-action btn-outline-primary me-1" title="Edit" onClick={() => openEditModal(r)}>
                          <i className="bi bi-pencil"></i>
                        </button>
                        <button className="btn btn-sm btn-action btn-outline-danger" title="Deactivate" onClick={() => setDeactivateRep(r)}>
                          <i className="bi bi-person-dash"></i>
                        </button>
                      </td>
                      <td>
                        <span className={`badge badge-${r.status}`}>
                          {r.status === 'active' ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <Pagination total={filteredReps.length} page={page} perPage={perPage} onPageChange={setPage} onPerPageChange={setPerPage} />
        </div>
      </div>

      {/* Deactivate Modal */}
      {deactivateRep && (<>
        <div className="modal-backdrop fade show" style={{ zIndex: 1050 }}></div>
        <div className="modal fade show d-block" tabIndex="-1" style={{ zIndex: 1055 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow" style={{ borderRadius: 16, overflow: 'hidden' }}>
              <div className="modal-header text-white border-0" style={{ background: 'linear-gradient(135deg, #dc2626, #b91c1c)' }}>
                <h5 className="modal-title"><i className="bi bi-exclamation-triangle me-2"></i>Deactivate Sales Rep</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setDeactivateRep(null)}></button>
              </div>
              <div className="modal-body py-4">
                <p>Are you sure you want to deactivate <strong>{deactivateRep.first_name} {deactivateRep.last_name}</strong>? They will be moved to the inactive list.</p>
              </div>
              <div className="modal-footer border-0">
                <button className="btn btn-outline-secondary" onClick={() => setDeactivateRep(null)}>Cancel</button>
                <button className="btn btn-danger" onClick={handleDeactivate}><i className="bi bi-person-dash me-1"></i>Deactivate</button>
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

                  <h6 className="mb-3" style={{ color: '#3b82f6', fontWeight: 400 }}>User Info</h6>

                  <div className="row mb-3">
                    <div className="col-md-6">
                      <label className="form-label small fw-semibold">Sales REP # <span className="text-danger">*</span></label>
                      <input type="text" className="form-control" value={editForm.user_cust_code} onChange={e => setEditForm({ ...editForm, user_cust_code: e.target.value })} />
                    </div>
                  </div>

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

                  <div className="row mb-3">
                    <div className="col-md-6">
                      <label className="form-label small fw-semibold">User Name</label>
                      <input type="text" className="form-control" value={editForm.username} onChange={e => setEditForm({ ...editForm, username: e.target.value })} />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label small fw-semibold">Password</label>
                      <input type={showPassword ? 'text' : 'password'} className="form-control" value={editForm.password} onChange={e => setEditForm({ ...editForm, password: e.target.value })} placeholder="Leave blank to keep current" />
                      <div className="form-check mt-1">
                        <input className="form-check-input" type="checkbox" id="showPwdActive" checked={showPassword} onChange={() => setShowPassword(!showPassword)} />
                        <label className="form-check-label small" htmlFor="showPwdActive" style={{ color: '#16a34a' }}>Show Password</label>
                      </div>
                    </div>
                  </div>

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

      {/* Sales Rep Detail Panel */}
      <SlidePanel
        isOpen={panelOpen}
        onClose={() => setPanelOpen(false)}
        title="Sales Representative Details"
        subtitle="Performance, assignments, and profile"
        width="1100px"
      >
        {selectedRepId && <SalesRepDetailView id={selectedRepId} />}
      </SlidePanel>
    </>
  )
}
