import { useState, useEffect, useRef } from 'react'
import toast from 'react-hot-toast'
import { api } from '../../lib/api'
import Pagination from '../../components/Pagination'
import SlidePanel from '../../components/SlidePanel'
import PageChartHeader from '../../components/PageChartHeader'

const DOC_CATEGORIES = ['reports', 'photos', 'results', 'agreements']

const emptyForm = {
  customer_id: '', customer_name: '', quantity: '', program_cost: '',
  payment_status: 'outstanding', paid_date: '', paid_amount: '',
  before_data: '', after_data: '', notes: '',
  sales_rep_id: '', sales_rep_name: '',
  start_date: '', end_date: '', status: 'active',
}

function fmtCurrency(v) {
  return '$' + (parseFloat(v) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtDate(d) {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function fileSizeStr(bytes) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

export default function PilotProgramList() {
  const [programs, setPrograms] = useState([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({})
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterPayment, setFilterPayment] = useState('')
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(10)

  // Modal
  const [showModal, setShowModal] = useState(false)
  const [editProgram, setEditProgram] = useState(null)
  const [form, setForm] = useState({ ...emptyForm })
  const [customers, setCustomers] = useState([])
  const [reps, setReps] = useState([])
  const [saving, setSaving] = useState(false)

  // Delete
  const [deleteProgram, setDeleteProgram] = useState(null)

  // Detail panel
  const [panelOpen, setPanelOpen] = useState(false)
  const [selectedProgram, setSelectedProgram] = useState(null)
  const [panelTab, setPanelTab] = useState('details')

  // Document upload
  const [uploadCategory, setUploadCategory] = useState('reports')
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const fileRef = useRef(null)

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    setLoading(true)
    try {
      const [data, statsData] = await Promise.all([
        api.getPilotPrograms(),
        api.getPilotProgramStats(),
      ])
      setPrograms(data || [])
      setStats(statsData || {})
    } catch (err) {
      toast.error('Failed to load: ' + err.message)
    }
    setLoading(false)
  }

  async function loadLookups() {
    try {
      const [c, r] = await Promise.all([
        api.getPilotProgramCustomers(),
        api.getPilotProgramReps(),
      ])
      setCustomers(c || [])
      setReps(r || [])
    } catch {}
  }

  function openCreate() {
    setEditProgram(null)
    setForm({ ...emptyForm })
    loadLookups()
    setShowModal(true)
  }

  function openEdit(prog) {
    setEditProgram(prog)
    setForm({
      customer_id: prog.customer_id || '',
      customer_name: prog.customer_name || '',
      quantity: prog.quantity || '',
      program_cost: prog.program_cost || '',
      payment_status: prog.payment_status || 'outstanding',
      paid_date: prog.paid_date ? new Date(prog.paid_date).toISOString().slice(0, 10) : '',
      paid_amount: prog.paid_amount || '',
      before_data: prog.before_data || '',
      after_data: prog.after_data || '',
      notes: prog.notes || '',
      sales_rep_id: prog.sales_rep_id || '',
      sales_rep_name: prog.sales_rep_name || '',
      start_date: prog.start_date ? new Date(prog.start_date).toISOString().slice(0, 10) : '',
      end_date: prog.end_date ? new Date(prog.end_date).toISOString().slice(0, 10) : '',
      status: prog.status || 'active',
    })
    loadLookups()
    setShowModal(true)
  }

  async function handleSave(e) {
    e.preventDefault()
    if (!form.customer_name) { toast.error('Customer name is required'); return }
    setSaving(true)
    try {
      if (editProgram) {
        await api.updatePilotProgram(editProgram._id, form)
        toast.success('Pilot program updated')
      } else {
        await api.createPilotProgram(form)
        toast.success('Pilot program created')
      }
      setShowModal(false)
      fetchData()
    } catch (err) {
      toast.error(err.message)
    }
    setSaving(false)
  }

  async function handleDelete() {
    if (!deleteProgram) return
    try {
      await api.deletePilotProgram(deleteProgram._id)
      toast.success('Pilot program deleted')
      setDeleteProgram(null)
      if (selectedProgram?._id === deleteProgram._id) { setPanelOpen(false); setSelectedProgram(null) }
      fetchData()
    } catch (err) {
      toast.error(err.message)
    }
  }

  async function handleStatusChange(prog, newStatus) {
    try {
      await api.updatePilotProgramStatus(prog._id, newStatus)
      toast.success(`Status changed to ${newStatus}`)
      fetchData()
      if (selectedProgram?._id === prog._id) {
        setSelectedProgram({ ...selectedProgram, status: newStatus })
      }
    } catch (err) {
      toast.error(err.message)
    }
  }

  async function handlePaymentToggle(prog) {
    try {
      if (prog.payment_status === 'paid') {
        await api.markPilotProgramUnpaid(prog._id)
        toast.success('Marked as outstanding')
      } else {
        await api.markPilotProgramPaid(prog._id, { paid_date: new Date().toISOString().slice(0, 10), paid_amount: prog.program_cost })
        toast.success('Marked as paid')
      }
      fetchData()
      if (selectedProgram?._id === prog._id) {
        const updated = await api.getPilotProgram(prog._id)
        setSelectedProgram(updated)
      }
    } catch (err) {
      toast.error(err.message)
    }
  }

  function openDetail(prog) {
    setSelectedProgram(prog)
    setPanelTab('details')
    setPanelOpen(true)
  }

  // Document upload
  async function handleFileUpload(files) {
    if (!selectedProgram || !files.length) return
    setUploading(true)
    try {
      const result = await api.uploadPilotProgramDocs(selectedProgram._id, Array.from(files), uploadCategory)
      toast.success(`${result.count} file(s) uploaded`)
      const updated = await api.getPilotProgram(selectedProgram._id)
      setSelectedProgram(updated)
      fetchData()
    } catch (err) {
      toast.error(err.message)
    }
    setUploading(false)
  }

  async function handleDeleteDoc(docId) {
    if (!selectedProgram) return
    try {
      await api.deletePilotProgramDoc(selectedProgram._id, docId)
      toast.success('Document deleted')
      const updated = await api.getPilotProgram(selectedProgram._id)
      setSelectedProgram(updated)
    } catch (err) {
      toast.error(err.message)
    }
  }

  // Filtering
  let filtered = programs
  if (search) {
    const s = search.toLowerCase()
    filtered = filtered.filter(p =>
      p.customer_name?.toLowerCase().includes(s) ||
      p.sales_rep_name?.toLowerCase().includes(s) ||
      p.notes?.toLowerCase().includes(s)
    )
  }
  if (filterStatus) filtered = filtered.filter(p => p.status === filterStatus)
  if (filterPayment) filtered = filtered.filter(p => p.payment_status === filterPayment)

  const totalFiltered = filtered.length
  const paged = filtered.slice((page - 1) * perPage, page * perPage)

  const statusBadge = (s) => {
    const map = { active: 'primary', completed: 'success', cancelled: 'secondary' }
    return <span className={`badge bg-${map[s] || 'secondary'}`}>{s}</span>
  }

  const paymentBadge = (s) => {
    return s === 'paid'
      ? <span className="badge bg-success">Paid</span>
      : <span className="badge bg-warning text-dark">Outstanding</span>
  }

  const categoryIcon = (cat) => {
    const map = { reports: 'bi-file-earmark-bar-graph', photos: 'bi-image', results: 'bi-clipboard-data', agreements: 'bi-file-earmark-check' }
    return map[cat] || 'bi-file-earmark'
  }

  // Chart data - status breakdown doughnut
  const statusCounts = {
    active: programs.filter(p => p.status === 'active').length,
    completed: programs.filter(p => p.status === 'completed').length,
    cancelled: programs.filter(p => p.status === 'cancelled').length,
  }

  const paymentCounts = {
    paid: programs.filter(p => p.payment_status === 'paid').length,
    outstanding: programs.filter(p => p.payment_status === 'outstanding').length,
  }

  const chartData = {
    labels: ['Active', 'Completed', 'Cancelled', 'Paid', 'Outstanding'],
    onSliceClick: (index) => {
      if (index <= 2) {
        const statuses = ['active', 'completed', 'cancelled']
        setFilterStatus(statuses[index])
        setFilterPayment('')
      } else {
        const payments = ['', '', '', 'paid', 'outstanding']
        setFilterPayment(payments[index])
        setFilterStatus('')
      }
      setPage(1)
    },
    datasets: [{
      data: [statusCounts.active, statusCounts.completed, statusCounts.cancelled, paymentCounts.paid, paymentCounts.outstanding],
      backgroundColor: ['#2563eb', '#10b981', '#94a3b8', '#16a34a', '#f59e0b'],
      borderWidth: 0,
      hoverOffset: 12,
    }]
  }

  return (
    <div style={{ width: '100%', overflowX: 'hidden' }}>
      <PageChartHeader
        title="Pilot Programs"
        subtitle="Track insole pilot programs with customers"
        breadcrumbs={[{ label: 'Dashboard', link: '/dashboard' }, { label: 'Pilot Programs' }]}
        chartType="doughnut"
        chartData={chartData}
        stats={[
          {
            label: 'Total Cost',
            value: fmtCurrency(stats.totalCost),
            icon: 'bi-currency-dollar',
            bg: '#eff6ff',
            color: '#2563eb',
            onClick: () => { setFilterStatus(''); setFilterPayment(''); setPage(1) }
          },
          {
            label: 'Active Programs',
            value: statusCounts.active,
            icon: 'bi-play-circle',
            bg: '#f0fdf4',
            color: '#16a34a',
            onClick: () => { setFilterStatus('active'); setFilterPayment(''); setPage(1) }
          },
          {
            label: 'Insoles Sent',
            value: stats.totalQuantity || 0,
            icon: 'bi-box-seam',
            bg: '#f5f3ff',
            color: '#7c3aed',
            onClick: () => { setFilterStatus(''); setFilterPayment(''); setPage(1) }
          },
          {
            label: 'Outstanding',
            value: fmtCurrency(stats.totalOutstanding),
            icon: 'bi-exclamation-circle',
            bg: '#fff7ed',
            color: '#ea580c',
            onClick: () => { setFilterPayment('outstanding'); setFilterStatus(''); setPage(1) }
          }
        ]}
        actions={
          <button className="btn btn-primary px-4 shadow-sm" style={{ borderRadius: 12, fontWeight: 600 }} onClick={openCreate}>
            <i className="bi bi-plus-lg me-1"></i> New Program
          </button>
        }
      />

      {/* Filter Badges */}
      {(filterStatus || filterPayment) && (
        <div className="mb-3">
          <div className="badge d-inline-flex align-items-center gap-2 px-3 py-2" style={{ background: '#f8fafc', color: '#475569', border: '1px solid #e2e8f0', borderRadius: 10 }}>
            <span className="fw-medium">Showing: <span className="text-primary" style={{ textTransform: 'capitalize' }}>{filterStatus || filterPayment} Programs</span></span>
            <button className="btn btn-sm p-0 d-flex align-items-center justify-content-center" style={{ width: 18, height: 18, background: '#e2e8f0', borderRadius: '50%', color: '#64748b' }} onClick={() => { setFilterStatus(''); setFilterPayment('') }}>
              <i className="bi bi-x" style={{ fontSize: 14 }}></i>
            </button>
          </div>
        </div>
      )}

      {/* Filters & Search */}
      <div className="card border-0 shadow-sm">
        <div className="card-header bg-white d-flex justify-content-between align-items-center flex-wrap gap-2 py-3">
          <div className="d-flex gap-2 align-items-center flex-wrap">
            <div className="input-group input-group-sm" style={{ width: 260 }}>
              <span className="input-group-text bg-white"><i className="bi bi-search"></i></span>
              <input type="text" className="form-control" placeholder="Search customer, rep, notes..."
                value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
            </div>
            <select className="form-select form-select-sm" style={{ width: 140 }}
              value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1) }}>
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <select className="form-select form-select-sm" style={{ width: 150 }}
              value={filterPayment} onChange={e => { setFilterPayment(e.target.value); setPage(1) }}>
              <option value="">All Payments</option>
              <option value="paid">Paid</option>
              <option value="outstanding">Outstanding</option>
            </select>
          </div>
          <span className="text-muted" style={{ fontSize: '0.85rem' }}>{totalFiltered} program{totalFiltered !== 1 ? 's' : ''}</span>
        </div>

        {/* Table */}
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="bg-light">
              <tr>
                <th style={{ fontSize: '0.85rem' }}>Customer</th>
                <th style={{ fontSize: '0.85rem' }}>Rep</th>
                <th style={{ fontSize: '0.85rem' }} className="text-center">Qty</th>
                <th style={{ fontSize: '0.85rem' }} className="text-end">Cost</th>
                <th style={{ fontSize: '0.85rem' }} className="text-center">Payment</th>
                <th style={{ fontSize: '0.85rem' }} className="text-center">Status</th>
                <th style={{ fontSize: '0.85rem' }}>Dates</th>
                <th style={{ fontSize: '0.85rem' }} className="text-center">Docs</th>
                <th style={{ fontSize: '0.85rem', width: 120 }} className="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="text-center py-5"><div className="spinner-border spinner-border-sm text-primary"></div></td></tr>
              ) : paged.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-5 text-muted">No pilot programs found</td></tr>
              ) : paged.map(prog => (
                <tr key={prog._id} style={{ cursor: 'pointer' }} onClick={() => openDetail(prog)}>
                  <td>
                    <div className="fw-semibold" style={{ fontSize: '0.9rem' }}>{prog.customer_name}</div>
                  </td>
                  <td>
                    <span style={{ fontSize: '0.85rem' }}>{prog.sales_rep_name || '-'}</span>
                  </td>
                  <td className="text-center">
                    <span className="badge bg-light text-dark">{prog.quantity}</span>
                  </td>
                  <td className="text-end fw-semibold" style={{ fontSize: '0.9rem' }}>
                    {fmtCurrency(prog.program_cost)}
                  </td>
                  <td className="text-center">{paymentBadge(prog.payment_status)}</td>
                  <td className="text-center">{statusBadge(prog.status)}</td>
                  <td style={{ fontSize: '0.82rem' }}>
                    <div>{prog.start_date ? fmtDate(prog.start_date) : '-'}</div>
                    {prog.end_date && <div className="text-muted">to {fmtDate(prog.end_date)}</div>}
                  </td>
                  <td className="text-center">
                    {prog.documents?.length > 0 && (
                      <span className="badge bg-info">{prog.documents.length}</span>
                    )}
                  </td>
                  <td className="text-end" onClick={e => e.stopPropagation()}>
                    <div className="d-flex gap-1 justify-content-end">
                      <button className="btn btn-sm btn-outline-primary" title="Edit" onClick={() => openEdit(prog)}>
                        <i className="bi bi-pencil"></i>
                      </button>
                      <button className="btn btn-sm btn-outline-danger" title="Delete" onClick={() => setDeleteProgram(prog)}>
                        <i className="bi bi-trash"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination total={totalFiltered} page={page} perPage={perPage}
          onPageChange={setPage} onPerPageChange={setPerPage} />
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="modal show d-block" style={{ background: 'rgba(0,0,0,0.5)', zIndex: 1080 }}>
          <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
            <div className="modal-content border-0 shadow-lg">
              <div className="modal-header" style={{ background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)' }}>
                <h5 className="modal-title text-white fw-bold">
                  <i className="bi bi-clipboard2-pulse me-2"></i>
                  {editProgram ? 'Edit Pilot Program' : 'New Pilot Program'}
                </h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowModal(false)}></button>
              </div>
              <form onSubmit={handleSave}>
                <div className="modal-body p-4">
                  <div className="row g-3">
                    {/* Customer */}
                    <div className="col-md-8">
                      <label className="form-label fw-semibold">Customer <span className="text-danger">*</span></label>
                      <select className="form-select" value={form.customer_id}
                        onChange={e => {
                          const cust = customers.find(c => String(c.legacy_id || c._id) === e.target.value)
                          setForm(f => ({ ...f, customer_id: e.target.value, customer_name: cust?.company_name || '' }))
                        }}>
                        <option value="">-- Select or type below --</option>
                        {customers.map(c => (
                          <option key={c._id} value={c.legacy_id || c._id}>{c.company_name}</option>
                        ))}
                      </select>
                      <input type="text" className="form-control mt-1" placeholder="Or type customer name"
                        value={form.customer_name} onChange={e => setForm(f => ({ ...f, customer_name: e.target.value }))} />
                    </div>

                    {/* Sales Rep */}
                    <div className="col-md-4">
                      <label className="form-label fw-semibold">Sales Rep</label>
                      <select className="form-select" value={form.sales_rep_id}
                        onChange={e => {
                          const rep = reps.find(r => String(r.legacy_id || r._id) === e.target.value)
                          setForm(f => ({ ...f, sales_rep_id: e.target.value, sales_rep_name: rep ? `${rep.first_name} ${rep.last_name}` : '' }))
                        }}>
                        <option value="">-- None --</option>
                        {reps.map(r => (
                          <option key={r._id} value={r.legacy_id || r._id}>{r.first_name} {r.last_name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Quantity & Cost */}
                    <div className="col-md-4">
                      <label className="form-label fw-semibold">Quantity of Insoles</label>
                      <input type="number" className="form-control" min="0"
                        value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label fw-semibold">Program Cost ($)</label>
                      <input type="number" className="form-control" min="0" step="0.01"
                        value={form.program_cost} onChange={e => setForm(f => ({ ...f, program_cost: e.target.value }))} />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label fw-semibold">Payment Status</label>
                      <select className="form-select" value={form.payment_status}
                        onChange={e => setForm(f => ({ ...f, payment_status: e.target.value }))}>
                        <option value="outstanding">Outstanding</option>
                        <option value="paid">Paid</option>
                      </select>
                    </div>

                    {/* Paid details (conditional) */}
                    {form.payment_status === 'paid' && (
                      <>
                        <div className="col-md-4">
                          <label className="form-label fw-semibold">Paid Date</label>
                          <input type="date" className="form-control"
                            value={form.paid_date} onChange={e => setForm(f => ({ ...f, paid_date: e.target.value }))} />
                        </div>
                        <div className="col-md-4">
                          <label className="form-label fw-semibold">Paid Amount ($)</label>
                          <input type="number" className="form-control" min="0" step="0.01"
                            value={form.paid_amount} onChange={e => setForm(f => ({ ...f, paid_amount: e.target.value }))} />
                        </div>
                      </>
                    )}

                    {/* Dates */}
                    <div className="col-md-4">
                      <label className="form-label fw-semibold">Start Date</label>
                      <input type="date" className="form-control"
                        value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label fw-semibold">End Date</label>
                      <input type="date" className="form-control"
                        value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label fw-semibold">Program Status</label>
                      <select className="form-select" value={form.status}
                        onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                        <option value="active">Active</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>

                    {/* Before / After Data */}
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Before Data</label>
                      <textarea className="form-control" rows={3} placeholder="Baseline metrics, conditions before pilot..."
                        value={form.before_data} onChange={e => setForm(f => ({ ...f, before_data: e.target.value }))} />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">After Data</label>
                      <textarea className="form-control" rows={3} placeholder="Results, improvements after pilot..."
                        value={form.after_data} onChange={e => setForm(f => ({ ...f, after_data: e.target.value }))} />
                    </div>

                    {/* Notes */}
                    <div className="col-12">
                      <label className="form-label fw-semibold">Notes</label>
                      <textarea className="form-control" rows={2}
                        value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-light" onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? <span className="spinner-border spinner-border-sm me-1"></span> : null}
                    {editProgram ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteProgram && (
        <div className="modal show d-block" style={{ background: 'rgba(0,0,0,0.5)', zIndex: 1090 }}>
          <div className="modal-dialog modal-dialog-centered modal-sm">
            <div className="modal-content border-0 shadow">
              <div className="modal-body text-center p-4">
                <div className="mb-3"><i className="bi bi-exclamation-triangle text-danger" style={{ fontSize: '2.5rem' }}></i></div>
                <h6 className="fw-bold">Delete Pilot Program?</h6>
                <p className="text-muted mb-3" style={{ fontSize: '0.9rem' }}>
                  This will permanently delete <strong>{deleteProgram.customer_name}</strong>'s pilot program and all uploaded documents.
                </p>
                <div className="d-flex gap-2 justify-content-center">
                  <button className="btn btn-light btn-sm" onClick={() => setDeleteProgram(null)}>Cancel</button>
                  <button className="btn btn-danger btn-sm" onClick={handleDelete}>Delete</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Detail Slide Panel */}
      <SlidePanel isOpen={panelOpen} onClose={() => setPanelOpen(false)}
        title={selectedProgram?.customer_name || ''}
        subtitle="Pilot Program Details"
        width="600px">
        {selectedProgram && (
          <div>
            {/* Tab navigation */}
            <ul className="nav nav-tabs nav-fill mb-3">
              {['details', 'before_after', 'documents'].map(tab => (
                <li className="nav-item" key={tab}>
                  <button className={`nav-link${panelTab === tab ? ' active' : ''}`}
                    onClick={() => setPanelTab(tab)}>
                    {tab === 'details' && <><i className="bi bi-info-circle me-1"></i>Details</>}
                    {tab === 'before_after' && <><i className="bi bi-arrow-left-right me-1"></i>Before / After</>}
                    {tab === 'documents' && <><i className="bi bi-folder me-1"></i>Documents ({selectedProgram.documents?.length || 0})</>}
                  </button>
                </li>
              ))}
            </ul>

            {/* Details Tab */}
            {panelTab === 'details' && (
              <div>
                <div className="d-flex gap-2 mb-3">
                  {statusBadge(selectedProgram.status)}
                  {paymentBadge(selectedProgram.payment_status)}
                </div>

                <div className="row g-3">
                  <div className="col-6">
                    <div className="text-muted small">Customer</div>
                    <div className="fw-semibold">{selectedProgram.customer_name}</div>
                  </div>
                  <div className="col-6">
                    <div className="text-muted small">Sales Rep</div>
                    <div className="fw-semibold">{selectedProgram.sales_rep_name || '-'}</div>
                  </div>
                  <div className="col-6">
                    <div className="text-muted small">Quantity of Insoles</div>
                    <div className="fw-bold" style={{ fontSize: '1.2rem' }}>{selectedProgram.quantity}</div>
                  </div>
                  <div className="col-6">
                    <div className="text-muted small">Program Cost</div>
                    <div className="fw-bold" style={{ fontSize: '1.2rem' }}>{fmtCurrency(selectedProgram.program_cost)}</div>
                  </div>
                  <div className="col-6">
                    <div className="text-muted small">Start Date</div>
                    <div>{fmtDate(selectedProgram.start_date)}</div>
                  </div>
                  <div className="col-6">
                    <div className="text-muted small">End Date</div>
                    <div>{fmtDate(selectedProgram.end_date)}</div>
                  </div>
                  {selectedProgram.payment_status === 'paid' && (
                    <>
                      <div className="col-6">
                        <div className="text-muted small">Paid Date</div>
                        <div>{fmtDate(selectedProgram.paid_date)}</div>
                      </div>
                      <div className="col-6">
                        <div className="text-muted small">Paid Amount</div>
                        <div>{fmtCurrency(selectedProgram.paid_amount)}</div>
                      </div>
                    </>
                  )}
                  {selectedProgram.notes && (
                    <div className="col-12">
                      <div className="text-muted small">Notes</div>
                      <div className="bg-light rounded p-2 mt-1" style={{ fontSize: '0.9rem' }}>{selectedProgram.notes}</div>
                    </div>
                  )}
                </div>

                {/* Quick actions */}
                <hr className="my-3" />
                <div className="d-flex gap-2 flex-wrap">
                  <button className="btn btn-sm btn-outline-primary" onClick={() => openEdit(selectedProgram)}>
                    <i className="bi bi-pencil me-1"></i>Edit
                  </button>
                  <button className={`btn btn-sm ${selectedProgram.payment_status === 'paid' ? 'btn-outline-warning' : 'btn-outline-success'}`}
                    onClick={() => handlePaymentToggle(selectedProgram)}>
                    <i className={`bi ${selectedProgram.payment_status === 'paid' ? 'bi-x-circle' : 'bi-check-circle'} me-1`}></i>
                    {selectedProgram.payment_status === 'paid' ? 'Mark Outstanding' : 'Mark Paid'}
                  </button>
                  {selectedProgram.status === 'active' && (
                    <button className="btn btn-sm btn-outline-success" onClick={() => handleStatusChange(selectedProgram, 'completed')}>
                      <i className="bi bi-check-all me-1"></i>Complete
                    </button>
                  )}
                  {selectedProgram.status !== 'cancelled' && (
                    <button className="btn btn-sm btn-outline-secondary" onClick={() => handleStatusChange(selectedProgram, 'cancelled')}>
                      <i className="bi bi-x-lg me-1"></i>Cancel
                    </button>
                  )}
                  {selectedProgram.status !== 'active' && (
                    <button className="btn btn-sm btn-outline-primary" onClick={() => handleStatusChange(selectedProgram, 'active')}>
                      <i className="bi bi-arrow-counterclockwise me-1"></i>Reactivate
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Before / After Tab */}
            {panelTab === 'before_after' && (
              <div>
                <div className="card border mb-3">
                  <div className="card-header bg-light py-2">
                    <h6 className="mb-0 fw-semibold"><i className="bi bi-arrow-bar-right me-2 text-primary"></i>Before Data</h6>
                  </div>
                  <div className="card-body">
                    {selectedProgram.before_data ? (
                      <div style={{ whiteSpace: 'pre-wrap', fontSize: '0.9rem' }}>{selectedProgram.before_data}</div>
                    ) : (
                      <p className="text-muted mb-0">No before data recorded</p>
                    )}
                  </div>
                </div>
                <div className="card border">
                  <div className="card-header bg-light py-2">
                    <h6 className="mb-0 fw-semibold"><i className="bi bi-arrow-bar-left me-2 text-success"></i>After Data</h6>
                  </div>
                  <div className="card-body">
                    {selectedProgram.after_data ? (
                      <div style={{ whiteSpace: 'pre-wrap', fontSize: '0.9rem' }}>{selectedProgram.after_data}</div>
                    ) : (
                      <p className="text-muted mb-0">No after data recorded</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Documents Tab */}
            {panelTab === 'documents' && (
              <div>
                {/* Upload area */}
                <div className="mb-3">
                  <div className="d-flex gap-2 align-items-center mb-2">
                    <select className="form-select form-select-sm" style={{ width: 160 }}
                      value={uploadCategory} onChange={e => setUploadCategory(e.target.value)}>
                      {DOC_CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
                      ))}
                    </select>
                    <button className="btn btn-sm btn-primary" onClick={() => fileRef.current?.click()} disabled={uploading}>
                      {uploading ? <span className="spinner-border spinner-border-sm me-1"></span> : <i className="bi bi-upload me-1"></i>}
                      Upload
                    </button>
                    <input ref={fileRef} type="file" multiple hidden
                      onChange={e => { handleFileUpload(e.target.files); e.target.value = '' }} />
                  </div>

                  {/* Drop zone */}
                  <div
                    className={`border border-2 border-dashed rounded-3 p-3 text-center ${dragOver ? 'border-primary bg-primary bg-opacity-10' : 'border-secondary'}`}
                    onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={e => { e.preventDefault(); setDragOver(false); handleFileUpload(e.dataTransfer.files) }}
                    style={{ cursor: 'pointer' }}
                    onClick={() => fileRef.current?.click()}
                  >
                    <i className="bi bi-cloud-arrow-up text-muted" style={{ fontSize: '1.5rem' }}></i>
                    <div className="text-muted small mt-1">Drag & drop files here or click to browse</div>
                  </div>
                </div>

                {/* Document list by category */}
                {DOC_CATEGORIES.map(cat => {
                  const docs = (selectedProgram.documents || []).filter(d => d.category === cat)
                  if (!docs.length) return null
                  return (
                    <div key={cat} className="mb-3">
                      <h6 className="fw-semibold text-muted mb-2" style={{ fontSize: '0.85rem' }}>
                        <i className={`bi ${categoryIcon(cat)} me-1`}></i>
                        {cat.charAt(0).toUpperCase() + cat.slice(1)} ({docs.length})
                      </h6>
                      {docs.map(doc => (
                        <div key={doc._id} className="d-flex align-items-center justify-content-between p-2 border rounded mb-1 bg-light">
                          <div className="d-flex align-items-center gap-2 text-truncate">
                            <i className={`bi ${categoryIcon(cat)} text-primary`}></i>
                            <div className="text-truncate">
                              <a href={api.pilotProgramFileUrl(doc.filename)} target="_blank" rel="noopener noreferrer"
                                className="text-decoration-none fw-medium" style={{ fontSize: '0.85rem' }}>
                                {doc.original_name}
                              </a>
                              <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                                {fileSizeStr(doc.size)} &middot; {fmtDate(doc.uploaded_at)}
                              </div>
                            </div>
                          </div>
                          <button className="btn btn-sm btn-outline-danger flex-shrink-0" onClick={() => handleDeleteDoc(doc._id)}>
                            <i className="bi bi-trash"></i>
                          </button>
                        </div>
                      ))}
                    </div>
                  )
                })}

                {(!selectedProgram.documents || selectedProgram.documents.length === 0) && (
                  <p className="text-muted text-center mt-3">No documents uploaded yet</p>
                )}
              </div>
            )}
          </div>
        )}
      </SlidePanel>
    </div>
  )
}
