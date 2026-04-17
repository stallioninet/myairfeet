import React, { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { api } from '../../lib/api'
import { isSalesRepUser, getStoredUser, resolveRepId } from '../../lib/repAuth'
import Pagination from '../../components/Pagination'
import PageChartHeader from '../../components/PageChartHeader'

export default function CommissionList() {
  const [_user] = useState(() => getStoredUser())
  const isSalesRep = isSalesRepUser(_user)
  const repIdRef = useRef(null)
  const [commissions, setCommissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ total: 0, totalComm: 0 })
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(10)
  const [filterPaid, setFilterPaid] = useState('') // '' | 'paid' | 'partial' | 'unpaid'
  const [deleteComm, setDeleteComm] = useState(null)
  const [viewComm, setViewComm] = useState(null)
  const [viewLoading, setViewLoading] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [editComm, setEditComm] = useState(null)
  const [availInvoices, setAvailInvoices] = useState([])
  const [allReps, setAllReps] = useState([])
  const [selectedInvoice, setSelectedInvoice] = useState(null)
  const [repRows, setRepRows] = useState([]) // [{sales_rep_id, total_price}]
  const [commItems, setCommItems] = useState([]) // PO line items
  const [commReps, setCommReps] = useState([]) // reps for grid columns
  const [grid, setGrid] = useState({}) // grid[itemIdx][repId] = {base, commission}
  const [calcMode, setCalcMode] = useState('default') // default, percent, dollar
  const [payComm, setPayComm] = useState(null) // commission for payment modal
  const [payLoading, setPayLoading] = useState(false)
  const [payForm, setPayForm] = useState({ commission_paid_date: '', received_date: '', received_amount: '', paid_mode: '', partial_comm_total: '', mark_paid: false })
  const [payRepAmounts, setPayRepAmounts] = useState({}) // {rep_id: paid_amount}

  useEffect(() => {
    if (!isSalesRep) { fetchData(); return }
    resolveRepId(_user.email).then(id => { repIdRef.current = id ?? null; fetchData() })
  }, [])

  async function fetchData() {
    setLoading(true)
    try {
      const params = (isSalesRep && repIdRef.current) ? { rep_id: repIdRef.current } : {}
      const [data, statsData] = await Promise.all([
        api.getCommissions(params),
        api.getCommissionStats(),
      ])
      setCommissions(data || [])
      setStats(statsData || {})
    } catch (err) {
      toast.error('Failed to load: ' + err.message)
    }
    setLoading(false)
  }

  async function openCreate() {
    try {
      const [invoices, reps] = await Promise.all([
        api.getCommissionInvoices(),
        api.getCommissionReps(),
      ])
      setAvailInvoices(invoices || [])
      setAllReps(reps || [])
      setSelectedInvoice(null)
      setRepRows([])
      setCommItems([])
      setCommReps([])
      setGrid({})
      setCalcMode('default')
      setEditComm(null)
      setShowCreate(true)
    } catch (err) { toast.error('Failed to load data: ' + err.message) }
  }

  async function openEdit(comm) {
    try {
      const detail = await api.getCommission(comm._id)
      setEditComm(detail)
      const inv = detail.invoice || {}
      setSelectedInvoice({ legacy_id: inv.legacy_id, invoice_number: inv.invoice_number, po_number: inv.po_number, po_date: inv.po_date, net_amount: inv.net_amount, company_name: detail.company_name, company_id: inv.company_id })
      const items = detail.items || []
      setCommItems(items)
      const reps = detail.reps || []
      setCommReps(reps)
      const commItemDets = detail.commItemDets || []
      const commRepDets = detail.commRepDets || []
      // Build grid from actual stored data
      const g = {}
      items.forEach((item, idx) => {
        const itemId = item.item_id || item.legacy_id
        const itemDet = commItemDets.find(d => d.item_id === itemId)
        g[idx] = {}
        reps.forEach(r => {
          const repDet = commRepDets.find(rd => rd.item_id === itemId && rd.sales_rep_id === r.legacy_id)
          g[idx][r.legacy_id] = {
            base: String(itemDet?.base_price || item.unit_cost || ''),
            commission: String(repDet?.commission_price || ''),
          }
        })
      })
      setGrid(g)
      // Also set repRows for backward compat
      setRepRows((detail.details || []).map(d => ({ sales_rep_id: String(d.sales_rep_id), total_price: String(d.total_price || '') })))
      setCalcMode('default')
      setShowCreate(true)
    } catch (err) { toast.error('Failed to load: ' + err.message) }
  }

  function handleSelectInvoice(invId) {
    const inv = availInvoices.find(i => String(i.legacy_id) === String(invId))
    setSelectedInvoice(inv || null)
    // For create, we don't have items yet - use simple rep rows
    if (inv && allReps.length) {
      setCommReps(allReps)
      setRepRows(allReps.map(r => ({
        sales_rep_id: String(r.legacy_id),
        total_price: String(Math.round(((r.commission_rate || 0) / 100) * (inv.net_amount || 0) * 100) / 100),
      })))
    }
  }

  function updateGridCell(itemIdx, repId, value) {
    setGrid(prev => ({
      ...prev,
      [itemIdx]: { ...prev[itemIdx], [repId]: { ...(prev[itemIdx]?.[repId] || {}), commission: value } }
    }))
  }

  function updateGridBase(itemIdx, repId, value) {
    setGrid(prev => ({
      ...prev,
      [itemIdx]: { ...prev[itemIdx], [repId]: { ...(prev[itemIdx]?.[repId] || {}), base: value } }
    }))
  }

  function getRepTotal(repId) {
    let total = 0
    Object.keys(grid).forEach(idx => {
      const cell = grid[idx]?.[repId]
      if (!cell) return
      if (calcMode === 'default') {
        // commission is per-unit, multiply by qty
        const item = commItems[parseInt(idx)]
        total += (parseFloat(cell.commission) || 0) * (item?.qty || 0)
      } else {
        // percent and dollar modes: commission is the total already
        total += parseFloat(cell.commission) || 0
      }
    })
    return total
  }

  function getRepTotalFromRows(repId) {
    const row = repRows.find(r => String(r.sales_rep_id) === String(repId))
    return parseFloat(row?.total_price) || 0
  }

  function updateRepRowPrice(repId, value) {
    setRepRows(prev => prev.map(r => String(r.sales_rep_id) === String(repId) ? { ...r, total_price: value } : r))
  }

  async function handleSaveCommission(e) {
    e.preventDefault()
    let validReps
    if (commItems.length > 0 && commReps.length > 0) {
      validReps = commReps.map(r => ({
        sales_rep_id: r.legacy_id,
        total_price: Math.round(getRepTotal(r.legacy_id) * 100) / 100,
      })).filter(r => r.total_price > 0)
    } else {
      validReps = repRows.filter(r => r.sales_rep_id && parseFloat(r.total_price) > 0)
    }
    if (!validReps.length) { toast.error('Add at least one rep with commission'); return }
    try {
      if (editComm) {
        await api.updateCommission(editComm._id, { reps: validReps })
        toast.success('Commission updated')
      } else {
        if (!selectedInvoice) { toast.error('Select an invoice'); return }
        await api.createCommission({ po_id: selectedInvoice.legacy_id, company_id: selectedInvoice.company_id, reps: validReps })
        toast.success('Commission created')
      }
      setShowCreate(false)
      fetchData()
    } catch (err) { toast.error(err.message) }
  }

  async function openPayment(comm) {
    setPayLoading(true)
    try {
      const data = await api.getCommission(comm._id)
      setPayComm(data)
      const today = new Date().toISOString().slice(0, 10)
      setPayForm({ commission_paid_date: today, received_date: today, received_amount: '', paid_mode: '', partial_comm_total: '', mark_paid: false })
      // Pre-fill rep amounts with outstanding balance
      const repAmts = {}
      ;(data.details || []).forEach(d => {
        // Find existing payments for this rep
        const paidForRep = (data.payments || []).filter(p => String(p.rep_id) === String(d.sales_rep_id)).reduce((s, p) => s + (parseFloat(p.comm_paid_amount) || 0), 0)
        const repTotal = parseFloat(d.total_price) || 0
        const balance = repTotal - paidForRep
        repAmts[d.sales_rep_id] = { org_amount: repTotal, balance: Math.max(0, balance), paid_amount: '' }
      })
      setPayRepAmounts(repAmts)
    } catch (err) { toast.error('Failed to load: ' + err.message) }
    setPayLoading(false)
  }

  async function handleSavePayment(e) {
    e.preventDefault()
    if (!payForm.received_amount) { toast.error('Enter received amount'); return }
    if (!payForm.partial_comm_total) { toast.error('Enter partial commission total'); return }
    // Validate per-rep amounts don't exceed outstanding
    let hasError = false
    Object.entries(payRepAmounts).forEach(([repId, data]) => {
      const paid = parseFloat(data.paid_amount) || 0
      if (paid > data.balance + 0.01) {
        const detail = (payComm?.details || []).find(d => String(d.sales_rep_id) === repId)
        toast.error(`${detail?.rep_name || 'Rep'}: Amount ${paid.toFixed(2)} exceeds outstanding ${data.balance.toFixed(2)}`)
        hasError = true
      }
    })
    if (hasError) return
    try {
      const rep_payments = Object.entries(payRepAmounts).filter(([_, v]) => parseFloat(v.paid_amount) > 0).map(([repId, v]) => ({
        rep_id: repId,
        org_amount: v.org_amount,
        paid_amount: v.paid_amount,
        balance: v.balance,
      }))
      await api.addCommissionPayment(payComm._id, { ...payForm, rep_payments })
      toast.success('Payment recorded successfully')
      setPayComm(null)
      fetchData()
    } catch (err) { toast.error(err.message) }
  }

  async function openView(comm) {
    setViewLoading(true)
    try {
      const data = await api.getCommission(comm._id)
      setViewComm(data)
    } catch (err) {
      toast.error('Failed to load: ' + err.message)
    }
    setViewLoading(false)
  }

  async function handleTogglePaid(comm) {
    try {
      if (comm.commission_paid_status === 1) {
        await api.markCommissionUnpaid(comm._id)
        toast.success('Marked as Unpaid')
      } else {
        await api.markCommissionPaid(comm._id)
        toast.success('Marked as Paid')
      }
      fetchData()
    } catch (err) { toast.error(err.message) }
  }

  async function handleDelete() {
    if (!deleteComm) return
    try {
      await api.deleteCommission(deleteComm._id)
      toast.success('Commission deleted')
      setDeleteComm(null)
      fetchData()
    } catch (err) { toast.error(err.message) }
  }

  function fmtDate(d) {
    if (!d) return '-'
    const dt = new Date(d)
    if (isNaN(dt)) return '-'
    return `${String(dt.getMonth() + 1).padStart(2, '0')}/${String(dt.getDate()).padStart(2, '0')}/${dt.getFullYear()}`
  }

  function fmtMoney(v) {
    return '$' + (parseFloat(v) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  function getPayBg(status) {
    if (status === 2) return '#E4F7D7' // paid in full - green
    if (status === 1) return '#FEE5CB' // partial - orange
    return '#FFD2D3' // unpaid - red
  }

  function getPayLabel(status) {
    if (status === 2) return 'Paid'
    if (status === 1) return 'Partial'
    return 'Unpaid'
  }

  const filtered = commissions.filter(c => {
    if (filterPaid === 'paid' && c.pay_status !== 2) return false
    if (filterPaid === 'partial' && c.pay_status !== 1) return false
    if (filterPaid === 'unpaid' && c.pay_status !== 0) return false
    
    if (!search) return true
    const s = search.toLowerCase()
    return c.company_name?.toLowerCase().includes(s) ||
      c.invoice_number?.toLowerCase().includes(s) ||
      c.po_number?.toLowerCase().includes(s)
  })

  // Calculate status counts for analytics
  const statusStats = {
    paid: commissions.filter(c => c.pay_status === 2).length,
    partial: commissions.filter(c => c.pay_status === 1).length,
    unpaid: commissions.filter(c => c.pay_status === 0).length,
    totalComm: commissions.reduce((s, c) => s + (c.total_comm || 0), 0)
  }

  const chartData = {
    labels: ['Paid Full', 'Partial', 'Not Paid'],
    onSliceClick: (index) => {
      const statuses = ['paid', 'partial', 'unpaid']
      setFilterPaid(statuses[index])
    },
    datasets: [{
      data: [statusStats.paid, statusStats.partial, statusStats.unpaid],
      backgroundColor: ['#10b981', '#f59e0b', '#ef4444'], // green, orange, red
      borderWidth: 0,
      hoverOffset: 12
    }]
  }

  const paginated = filtered.slice((page - 1) * perPage, page * perPage)

  return (
    <div style={{ width: '100%', overflowX: 'hidden' }}>
      <PageChartHeader
        title="Commission Tracker"
        subtitle="Track and manage sales rep commissions and payments"
        breadcrumbs={[{ label: 'Dashboard', link: '/dashboard' }, { label: 'Commissions' }]}
        chartType="doughnut"
        chartData={chartData}
        stats={[
          {
            label: 'Total Commissions',
            value: statusStats.totalComm ? fmtMoney(statusStats.totalComm) : '$0.00',
            icon: 'bi-cash-stack',
            bg: '#eff6ff',
            color: '#2563eb',
            onClick: () => setFilterPaid('')
          },
          {
            label: 'Paid (🟢)',
            value: statusStats.paid,
            icon: 'bi-check-circle',
            bg: '#f0fdf4',
            color: '#16a34a',
            onClick: () => setFilterPaid('paid')
          },
          {
            label: 'Partial (🟡)',
            value: statusStats.partial,
            icon: 'bi-clock-history',
            bg: '#fff7ed',
            color: '#ea580c',
            onClick: () => setFilterPaid('partial')
          },
          {
            label: 'Not Paid (🔴)',
            value: statusStats.unpaid,
            icon: 'bi-exclamation-circle',
            bg: '#fef2f2',
            color: '#dc2626',
            onClick: () => setFilterPaid('unpaid')
          }
        ]}
        actions={!isSalesRep && (
          <button className="btn btn-primary px-4 shadow-sm" style={{ borderRadius: 12, fontWeight: 600 }} onClick={openCreate}>
            <i className="bi bi-plus-lg me-1"></i> Add Commission
          </button>
        )}
      />

      {/* Search & Filter Badge */}
      <div className="card border-0 shadow-sm rounded-4 mb-3">
        <div className="card-body py-3 px-4">
          <div className="d-flex flex-wrap align-items-center gap-3">
            <div className="position-relative flex-grow-1" style={{ maxWidth: 320 }}>
              <i className="bi bi-search position-absolute" style={{ left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}></i>
              <input type="text" className="form-control form-control-sm ps-5 bg-light border-0 shadow-none" style={{ borderRadius: 10, height: 38 }} placeholder="Search commissions..." value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
            </div>
            
            {filterPaid && (
              <div className="badge d-flex align-items-center gap-2 px-3 py-2" style={{ background: '#f8fafc', color: '#475569', border: '1px solid #e2e8f0', borderRadius: 10 }}>
                <span className="fw-medium">Showing: <span className="text-primary" style={{ textTransform: 'capitalize' }}>{filterPaid === 'unpaid' ? 'Not Paid' : filterPaid} Commissions</span></span>
                <button className="btn btn-sm p-0 d-flex align-items-center justify-content-center" style={{ width: 18, height: 18, background: '#e2e8f0', borderRadius: '50%', color: '#64748b' }} onClick={() => setFilterPaid('')}>
                  <i className="bi bi-x" style={{ fontSize: 14 }}></i>
                </button>
              </div>
            )}

            <div className="ms-auto d-flex align-items-center gap-3">
              {search && (
                <button className="btn btn-sm btn-link text-muted text-decoration-none" onClick={() => { setSearch(''); setPage(1) }}>
                  Clear Search
                </button>
              )}
              <span className="text-muted small fw-medium">{filtered.length} record{filtered.length !== 1 ? 's' : ''}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
        <div className="card-header py-3 border-0" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: '#fff' }}>
          <div className="d-flex justify-content-between align-items-center">
            <h5 className="mb-0"><i className="bi bi-cash-stack me-2"></i>Commissions</h5>
            <span className="badge bg-white bg-opacity-25 px-3 py-2">{filtered.length} records</span>
          </div>
        </div>
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0" style={{ fontSize: 13 }}>
            <thead className="bg-light">
              <tr>
                <th className="ps-4">Customer</th>
                <th>Invoice #</th>
                <th>PO Date</th>
                <th>PO #</th>
                <th className="text-center">QTY</th>
                <th>PO Total</th>
                <th>Com Total</th>
                <th className="text-center">Paid</th>
                <th className="text-center" style={{ width: 140 }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="9" className="text-center py-4"><div className="spinner-border spinner-border-sm text-primary"></div> Loading...</td></tr>
              ) : paginated.length === 0 ? (
                <tr><td colSpan="9" className="text-center py-4 text-muted"><i className="bi bi-cash-stack fs-1 d-block mb-2 opacity-25"></i>No commissions found</td></tr>
              ) : paginated.map(comm => (
                <tr key={comm._id}>
                  <td className="ps-4 fw-semibold">{comm.company_name || '-'}</td>
                  <td style={{ color: '#d97706', fontWeight: 600 }}>{comm.invoice_number || '-'}</td>
                  <td>{fmtDate(comm.po_date)}</td>
                  <td style={{ color: '#198754', fontWeight: 600 }}>{comm.po_number || '-'}</td>
                  <td className="text-center">{comm.total_qty || 0}</td>
                  <td className="fw-semibold">{fmtMoney(comm.net_amount)}</td>
                  <td className="fw-semibold">{fmtMoney(comm.total_comm)}</td>
                  <td className="text-center">
                    <div
                      className="d-inline-flex align-items-center gap-2 px-3 py-1 fw-bold"
                      style={{ background: getPayBg(comm.pay_status) + '40', color: '#333', cursor: 'pointer', fontSize: 11, borderRadius: 12, border: `1px solid ${getPayBg(comm.pay_status)}` }}
                      onClick={() => handleTogglePaid(comm)}
                      title="Click to toggle"
                    >
                      <span style={{ fontSize: 14 }}>{comm.pay_status === 2 ? '🟢' : comm.pay_status === 1 ? '🟡' : '🔴'}</span>
                      <div className="text-start" style={{ lineHeight: 1.1 }}>
                        <div>{getPayLabel(comm.pay_status)}</div>
                        {comm.pay_status === 1 && <div style={{ fontSize: 9, opacity: 0.8 }}>Bal: {fmtMoney(comm.balance)}</div>}
                      </div>
                    </div>
                  </td>
                  <td className="text-center">
                    {!isSalesRep && (
                      <button className="btn btn-sm btn-action btn-outline-primary me-1" title="Edit" onClick={() => openEdit(comm)}>
                        <i className="bi bi-pencil"></i>
                      </button>
                    )}
                    <button className="btn btn-sm btn-action btn-outline-info me-1" title="View" onClick={() => openView(comm)}>
                      <i className="bi bi-eye"></i>
                    </button>
                    {!isSalesRep && (
                      <button className="btn btn-sm btn-action btn-outline-danger" title="Delete" onClick={() => setDeleteComm(comm)}>
                        <i className="bi bi-trash"></i>
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length > 0 && (
          <div className="card-footer bg-white border-0 py-3">
            <Pagination total={filtered.length} page={page} perPage={perPage}
              onPageChange={setPage} onPerPageChange={v => { setPerPage(v); setPage(1) }} />
          </div>
        )}
      </div>

      {/* Create/Edit Commission Modal - matches old PHP design */}
      {showCreate && (<>
        <div className="modal-backdrop fade show"></div>
        <div className="modal fade show d-block" tabIndex="-1">
          <div className="modal-dialog modal-xl modal-dialog-scrollable">
            <div className="modal-content border-0 shadow">
              <div className="modal-header text-white" style={{ background: 'linear-gradient(135deg, #e74c3c, #c0392b)' }}>
                <h5 className="modal-title">
                  <i className="bi bi-lock me-2"></i>Commission Details
                </h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowCreate(false)}></button>
              </div>
              <form onSubmit={handleSaveCommission}>
                <div className="modal-body">
                  {/* Invoice Selection (create only) */}
                  {!editComm && (
                    <div className="mb-4">
                      <label className="form-label fw-semibold">Select Invoice <span className="text-danger">*</span></label>
                      <select className="form-select" value={selectedInvoice?.legacy_id || ''} onChange={e => handleSelectInvoice(e.target.value)} required>
                        <option value="">-- Select Invoice --</option>
                        {availInvoices.map(inv => (
                          <option key={inv._id} value={inv.legacy_id}>
                            {inv.company_name} - Inv#{inv.invoice_number || 'N/A'} - PO#{inv.po_number || 'N/A'} - {fmtMoney(inv.net_amount)}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Invoice Summary - blue header table like old PHP */}
                  {(selectedInvoice || editComm) && (<>
                    <table className="table table-bordered mb-4" style={{ fontSize: 13 }}>
                      <thead>
                        <tr style={{ background: '#3b82f6', color: '#fff' }}>
                          <th className="text-center">Invoice #</th>
                          <th className="text-center">PO #</th>
                          <th className="text-center">PO $</th>
                          <th className="text-center">PO Date</th>
                          <th className="text-center">Customer Name</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="text-center">{selectedInvoice?.invoice_number || editComm?.invoice?.invoice_number || '-'}</td>
                          <td className="text-center">{selectedInvoice?.po_number || editComm?.invoice?.po_number || '-'}</td>
                          <td className="text-center">{(parseFloat(selectedInvoice?.net_amount || editComm?.invoice?.net_amount) || 0).toFixed(2)}</td>
                          <td className="text-center">{fmtDate(selectedInvoice?.po_date || editComm?.invoice?.po_date)}</td>
                          <td className="text-center">{selectedInvoice?.company_name || editComm?.company_name || '-'}</td>
                        </tr>
                      </tbody>
                    </table>

                    {/* Mode buttons - matching old PHP */}
                    <div className="d-flex justify-content-end gap-2 mb-3">
                      <button type="button" className={`btn px-4 ${calcMode === 'percent' ? '' : 'btn-fade'}`} style={{ background: '#1abc9c', color: '#fff', opacity: calcMode === 'percent' ? 1 : 0.65 }} onClick={() => setCalcMode('percent')}>Pay by % of Total</button>
                      <button type="button" className={`btn px-4 ${calcMode === 'dollar' ? '' : 'btn-fade'}`} style={{ background: '#1abc9c', color: '#fff', opacity: calcMode === 'dollar' ? 1 : 0.65 }} onClick={() => setCalcMode('dollar')}>Pay by $</button>
                      <button type="button" className={`btn px-4 ${calcMode === 'default' ? '' : 'btn-fade'}`} style={{ background: '#333', color: '#fff', opacity: calcMode === 'default' ? 1 : 0.65 }} onClick={() => setCalcMode('default')}>Default View</button>
                    </div>

                    {/* Commission Grid - items x reps */}
                    {commItems.length > 0 && commReps.length > 0 ? (
                      <div className="table-responsive">
                        <table className="table table-bordered table-sm mb-0" style={{ fontSize: 12, textAlign: 'center' }}>
                          <thead>
                            <tr>
                              <th style={{ minWidth: 150, background: '#EDF6ED' }}>Style</th>
                              <th style={{ width: 60, background: '#EDF6ED' }}>QTY</th>
                              <th style={{ width: 80, background: '#EDF6ED' }}>UNIT COST</th>
                              <th style={{ width: 90, background: '#EDF6ED' }}>BASE $</th>
                              <th style={{ width: 90, background: '#EDF6ED' }}>TOTAL</th>
                              {commReps.map(r => (
                                <th key={r.legacy_id} colSpan={calcMode === 'percent' ? 2 : 1} style={{ minWidth: calcMode === 'percent' ? 160 : 130, background: '#FFFFD4', fontSize: 12 }}>
                                  {r.first_name} {r.last_name}<br/>
                                  <span style={{ fontSize: 10, color: '#666' }}>{r.user_cust_code || ''}</span>
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {/* Totals row */}
                            <tr>
                              <td colSpan="4" style={{ background: '#EDF6ED' }}></td>
                              <td style={{ background: '#EDF6ED', fontWeight: 'bold' }}>{fmtMoney(commReps.reduce((s, r) => s + getRepTotal(r.legacy_id), 0))}</td>
                              {commReps.map(r => (
                                <td key={r.legacy_id} colSpan={calcMode === 'percent' ? 2 : 1} style={{ background: '#FFFFD4', fontWeight: 'bold' }}>
                                  {fmtMoney(getRepTotal(r.legacy_id))}
                                </td>
                              ))}
                            </tr>
                            {/* Item rows */}
                            {commItems.map((item, idx) => {
                              const baseVal = parseFloat(grid[idx]?.[commReps[0]?.legacy_id]?.base || item.unit_cost || 0)
                              const qty = item.qty || 0
                              // TOTAL depends on mode:
                              // Default: sum of all reps' per-unit commission
                              // Percent/Dollar: qty × base (item net value)
                              const itemNetValue = qty * baseVal
                              const itemCommTotal = commReps.reduce((s, r) => s + (parseFloat(grid[idx]?.[r.legacy_id]?.commission) || 0), 0)
                              const itemTotal = calcMode === 'default' ? itemCommTotal : itemNetValue
                              return (
                                <tr key={idx}>
                                  <td style={{ textAlign: 'left' }}>{item.item_name || '-'}{item.item_size_name ? ` Size ${item.item_size_name}` : ''}</td>
                                  <td>{qty}</td>
                                  <td>{calcMode === 'default' ? (item.unit_cost || 0).toFixed(2) : ''}</td>
                                  <td>{calcMode === 'default' ? (
                                    <input type="number" step="0.01" className="form-control form-control-sm text-center" style={{ width: 75, margin: '0 auto' }}
                                      value={grid[idx]?.[commReps[0]?.legacy_id]?.base ?? item.unit_cost ?? ''}
                                      onChange={e => commReps.forEach(r => updateGridBase(idx, r.legacy_id, e.target.value))} />
                                  ) : ''}</td>
                                  <td>{calcMode === 'default' ? itemCommTotal.toFixed(2) : ''}</td>
                                  {commReps.map(r => {
                                    const cell = grid[idx]?.[r.legacy_id] || {}
                                    const commVal = parseFloat(cell.commission) || 0
                                    if (calcMode === 'percent') {
                                      // Pay by % of Total: TWO inputs per rep - % and calculated $
                                      const pctVal = cell.percent || ''
                                      const calcComm = itemNetValue * (parseFloat(pctVal) || 0) / 100
                                      return (<React.Fragment key={r.legacy_id}>
                                        <td style={{ background: '#FFFFD4' }}>
                                          <input type="number" step="0.01" className="form-control form-control-sm text-center" style={{ width: 60, margin: '0 auto' }}
                                            value={pctVal}
                                            onChange={e => {
                                              const pct = e.target.value
                                              const calc = (itemNetValue * (parseFloat(pct) || 0) / 100).toFixed(2)
                                              setGrid(prev => ({ ...prev, [idx]: { ...prev[idx], [r.legacy_id]: { ...prev[idx]?.[r.legacy_id], percent: pct, commission: calc } } }))
                                            }}
                                            placeholder="0" />
                                        </td>
                                        <td style={{ background: '#FFFFD4' }}>
                                          <input type="text" className="form-control form-control-sm text-center" style={{ width: 60, margin: '0 auto', background: '#f8f9fa' }} readOnly
                                            value={calcComm ? calcComm.toFixed(2) : '0'} />
                                        </td>
                                      </React.Fragment>)
                                    } else if (calcMode === 'dollar') {
                                      // Pay by $: single input per rep
                                      return (
                                        <td key={r.legacy_id} style={{ background: '#FFFFD4' }}>
                                          <input type="number" step="0.01" className="form-control form-control-sm text-center" style={{ width: 70, margin: '0 auto' }}
                                            value={cell.commission || ''}
                                            onChange={e => updateGridCell(idx, r.legacy_id, e.target.value)}
                                            placeholder="0" />
                                        </td>
                                      )
                                    } else {
                                      // Default view: per-unit commission input + (unit × qty) shown
                                      return (
                                        <td key={r.legacy_id} style={{ background: '#FFFFD4' }}>
                                          <div className="d-flex align-items-center gap-1 justify-content-center">
                                            <input type="number" step="0.01" className="form-control form-control-sm text-center" style={{ width: 50 }}
                                              value={cell.commission || ''}
                                              onChange={e => updateGridCell(idx, r.legacy_id, e.target.value)}
                                              placeholder="0" />
                                            <span style={{ fontSize: 10, color: '#666' }}>{(commVal * qty).toFixed(2)}</span>
                                          </div>
                                        </td>
                                      )
                                    }
                                  })}
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      /* Simple rep rows when no items available */
                      <table className="table table-sm table-bordered" style={{ fontSize: 13 }}>
                        <thead className="bg-light">
                          <tr>
                            <th>Sales Rep</th>
                            <th style={{ width: 200 }}>Commission ($)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(commReps.length > 0 ? commReps : allReps).map(r => (
                            <tr key={r.legacy_id}>
                              <td>{r.first_name} {r.last_name} <span className="text-muted">({r.user_cust_code || '-'})</span></td>
                              <td>
                                <input type="number" step="0.01" className="form-control form-control-sm"
                                  value={repRows.find(rr => String(rr.sales_rep_id) === String(r.legacy_id))?.total_price || ''}
                                  onChange={e => updateRepRowPrice(r.legacy_id, e.target.value)} placeholder="0.00" />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="fw-bold">
                            <td className="text-end">Total:</td>
                            <td>{fmtMoney(repRows.reduce((s, r) => s + (parseFloat(r.total_price) || 0), 0))}</td>
                          </tr>
                        </tfoot>
                      </table>
                    )}
                  </>)}
                </div>
                <div className="modal-footer">
                  <button type="submit" className="btn btn-success px-4">Save</button>
                  <button type="button" className="btn btn-outline-secondary px-4" onClick={() => setShowCreate(false)}>Cancel</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </>)}

      {/* Add Payment Modal */}
      {(payComm || payLoading) && (<>
        <div className="modal-backdrop fade show"></div>
        <div className="modal fade show d-block" tabIndex="-1" style={{ overflowY: 'auto', height: '100vh' }}>
          <div className="modal-dialog modal-lg" style={{ margin: '1rem auto' }}>
            <div className="modal-content border-0 shadow">
              <div className="modal-header" style={{ background: '#006BF9', color: '#fff' }}>
                <div>
                  <h5 className="modal-title mb-1">Partial Comm. Payment: <strong>Invoice #{payComm?.invoice?.invoice_number || ''}</strong></h5>
                  {payComm && (
                    <div style={{ fontSize: 13 }}>
                      <span><strong>Invoice Amt: {fmtMoney(parseFloat(payComm.invoice?.net_amount) || 0)}</strong></span>
                      <span className="ms-4"><strong>CommTotal: {fmtMoney((() => { const s = payComm.save_status || 'default'; return s === 'percent' ? (parseFloat(payComm.total_commission_percentage) || parseFloat(payComm.total_commission) || 0) : s === 'dollar' ? (parseFloat(payComm.total_commission_dollar) || parseFloat(payComm.total_commission) || 0) : (parseFloat(payComm.total_commission) || 0) })())}</strong></span>
                      <span className="ms-4"><strong>Balance Due: {fmtMoney(Math.max(0, (parseFloat(payComm.invoice?.net_amount) || 0) - (parseFloat(payComm.invoice?.total_received) || 0)))}</strong></span>
                    </div>
                  )}
                </div>
                <button type="button" className="btn-close btn-close-white" onClick={() => setPayComm(null)}></button>
              </div>
              <div className="modal-body">
                {payLoading ? (
                  <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>
                ) : payComm && (
                  <form id="payForm" onSubmit={handleSavePayment}>
                    {(() => {
                      const pNetAmt = parseFloat(payComm.invoice?.net_amount) || 0
                      const ss = payComm.save_status || 'default'
                      const pCommTotal = ss === 'percent' ? (parseFloat(payComm.total_commission_percentage) || parseFloat(payComm.total_commission) || 0) : ss === 'dollar' ? (parseFloat(payComm.total_commission_dollar) || parseFloat(payComm.total_commission) || 0) : (parseFloat(payComm.total_commission) || 0)
                      const pRecAmt = parseFloat(payForm.received_amount) || 0
                      const pPct = pNetAmt > 0 ? ((pRecAmt / pNetAmt) * 100).toFixed(2) : '0.00'
                      return (<>
                        {/* Row 1 */}
                        <div className="row g-3 mb-3">
                          <div className="col-md-4">
                            <label className="form-label fw-semibold">Comm Paid Date</label>
                            <input type="date" className="form-control" value={payForm.commission_paid_date} onChange={e => setPayForm({ ...payForm, commission_paid_date: e.target.value })} />
                          </div>
                          <div className="col-md-4">
                            <label className="form-label fw-semibold">Received Amount <span className="text-danger">*</span></label>
                            <input type="number" step="0.01" className="form-control" value={payForm.received_amount} onChange={e => {
                              const val = e.target.value
                              const recAmt = parseFloat(val) || 0
                              // Partial Comm = (received / invoice_amt) * commission_total
                              const partialComm = pNetAmt > 0 ? (recAmt / pNetAmt) * pCommTotal : 0
                              const partial = Math.round(partialComm * 100) / 100
                              // Auto-split to reps proportionally by their commission share
                              const totalRepComm = (payComm.details || []).reduce((s, d) => s + (parseFloat(d.total_price) || 0), 0)
                              const newAmts = { ...payRepAmounts }
                              Object.entries(newAmts).forEach(([repId, data]) => {
                                const repShare = totalRepComm > 0 ? (parseFloat(data.org_amount) || 0) / totalRepComm : 0
                                const repPartial = Math.round(partial * repShare * 100) / 100
                                // Don't exceed outstanding balance
                                const capped = Math.min(repPartial, data.balance)
                                newAmts[repId] = { ...data, paid_amount: String(capped > 0 ? capped : repPartial) }
                              })
                              setPayForm({ ...payForm, received_amount: val, partial_comm_total: String(partial) })
                              setPayRepAmounts(newAmts)
                            }} placeholder="0.00" required />
                          </div>
                          <div className="col-md-4">
                            <label className="form-label fw-semibold">SalesTax</label>
                            <input type="text" className="form-control" value={payComm.invoice?.sales_tax_amount || 0} readOnly style={{ background: '#f8f9fa' }} />
                          </div>
                        </div>
                        {/* Row 2 */}
                        <div className="row g-3 mb-3">
                          <div className="col-md-4">
                            <label className="form-label fw-semibold">Commi Amount</label>
                            <input type="text" className="form-control" value={fmtMoney(pNetAmt)} readOnly style={{ background: '#f8f9fa' }} />
                          </div>
                          <div className="col-md-4">
                            <label className="form-label fw-semibold">Shipping</label>
                            <input type="text" className="form-control" value={payComm.invoice?.shipping_costs || '0.00'} readOnly style={{ background: '#f8f9fa' }} />
                          </div>
                          <div className="col-md-4 d-flex align-items-end">
                            {pRecAmt > 0 && <div style={{ fontSize: 12, fontWeight: 600 }}>Amount Received: {pPct}% of {fmtMoney(pNetAmt)}</div>}
                          </div>
                        </div>
                        {/* Row 3 */}
                        <div className="row g-3 mb-3">
                          <div className="col-md-4">
                            <label className="form-label fw-semibold">Date Received</label>
                            <input type="date" className="form-control" value={payForm.received_date} onChange={e => setPayForm({ ...payForm, received_date: e.target.value })} />
                          </div>
                          <div className="col-md-4 d-flex align-items-end">
                            <div className="d-flex align-items-center gap-2 pb-2">
                              <input type="checkbox" className="form-check-input" style={{ width: 30, height: 30 }} checked={payForm.mark_paid} onChange={async e => {
                                const checked = e.target.checked
                                setPayForm({ ...payForm, mark_paid: checked })
                                // Immediately update paid status like old PHP
                                if (payComm) {
                                  try {
                                    if (checked) {
                                      await api.markCommissionPaid(payComm._id)
                                      toast.success('Payment Updated to PAID')
                                    } else {
                                      await api.markCommissionUnpaid(payComm._id)
                                      toast.success('Payment Unpaid updated')
                                    }
                                  } catch {}
                                }
                              }} id="markPaidChk2" />
                              <label className="form-check-label fw-bold" htmlFor="markPaidChk2" style={{ fontSize: 20 }}>PAID</label>
                            </div>
                          </div>
                        </div>
                        {/* Row 4 */}
                        <div className="row g-3 mb-3">
                          <div className="col-md-4">
                            <label className="form-label fw-semibold">Received Check or CC</label>
                            <input type="text" className="form-control" value={payForm.paid_mode} onChange={e => setPayForm({ ...payForm, paid_mode: e.target.value })} placeholder="Enter Check or CC last 4 digit" />
                          </div>
                        </div>
                        {/* Row 5: Check Image */}
                        <div className="row g-3 mb-3">
                          <div className="col-md-4">
                            <label className="form-label fw-semibold">Check Image</label>
                            <div style={{ border: '2px dashed #b0bec5', borderRadius: 8, padding: '12px 10px', textAlign: 'center', cursor: 'pointer', background: '#fafbfc' }}
                              onClick={() => document.getElementById('checkImgPay')?.click()}>
                              <div style={{ fontSize: 24, color: '#90a4ae' }}><i className="bi bi-image"></i></div>
                              <div style={{ fontSize: 12, color: '#546e7a' }}>Drag & drop check image</div>
                              <div style={{ fontSize: 11, color: '#90a4ae' }}>or <span style={{ color: '#4CB755', fontWeight: 'bold' }}>browse</span></div>
                            </div>
                            <input type="file" id="checkImgPay" accept=".png,.jpg,.jpeg" style={{ display: 'none' }} />
                          </div>
                        </div>
                        {/* Row 6: Partial CommTotal + Round off */}
                        <div className="row g-3 mb-3">
                          <div className="col-md-4">
                            <label className="form-label fw-semibold">Partial CommTotal <span className="text-danger">*</span></label>
                            <input type="number" step="0.01" className="form-control" value={payForm.partial_comm_total} onChange={e => setPayForm({ ...payForm, partial_comm_total: e.target.value })} placeholder="0.00" />
                          </div>
                          <div className="col-md-4 d-flex align-items-end">
                            <button type="button" className="btn btn-success mb-0" onClick={() => setPayForm({ ...payForm, partial_comm_total: String(Math.round(parseFloat(payForm.partial_comm_total) || 0)) })}>Round off</button>
                          </div>
                        </div>
                      </>)
                    })()}

                    {/* Per-Rep Commission Amounts */}
                    {Object.entries(payRepAmounts).map(([repId, data]) => {
                      const detail = (payComm.details || []).find(d => String(d.sales_rep_id) === repId)
                      return (
                        <div className="row g-3 mb-3 align-items-center" key={repId}>
                          <div className="col-md-4 text-end">
                            <div className="fw-semibold">{detail?.rep_name || `Rep #${repId}`} ({detail?.rep_code || ''})</div>
                            <div style={{ fontSize: 12 }}><strong>({fmtMoney(data.org_amount || 0)})</strong></div>
                            <div style={{ fontSize: 11, fontStyle: 'italic', color: '#666' }}>Outstanding: <span style={{ color: data.balance > 0 ? '#dc2626' : '#198754' }}>{fmtMoney(data.balance)}</span></div>
                          </div>
                          <div className="col-md-4">
                            <input type="number" step="0.01" className="form-control" placeholder="Commission Amount"
                              value={data.paid_amount}
                              onChange={e => setPayRepAmounts(prev => ({ ...prev, [repId]: { ...prev[repId], paid_amount: e.target.value } }))} />
                          </div>
                        </div>
                      )
                    })}

                    {/* Email */}
                    <div className="row g-3 mb-4">
                      <div className="col-md-4 text-end">
                        <label className="form-label fw-semibold">Email ID :</label>
                      </div>
                      <div className="col-md-5">
                        <input type="text" className="form-control" placeholder="Enter Recipient Emails" />
                      </div>
                    </div>

                    <div className="d-flex gap-2">
                      <button type="submit" className="btn btn-primary px-4">Save/Send</button>
                      <button type="button" className="btn btn-outline-secondary px-4" onClick={() => setPayComm(null)}>Cancel</button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </>)}

      {/* Delete Modal */}
      {deleteComm && (<>
        <div className="modal-backdrop fade show"></div>
        <div className="modal fade show d-block" tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow">
              <div className="modal-header text-white bg-danger">
                <h5 className="modal-title"><i className="bi bi-trash me-2"></i>Delete Commission</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setDeleteComm(null)}></button>
              </div>
              <div className="modal-body">
                <p>Are you sure you want to delete this commission?</p>
                <p className="text-muted small">Customer: {deleteComm.company_name} | PO#: {deleteComm.po_number} | Commission: {fmtMoney(deleteComm.total_comm)}</p>
              </div>
              <div className="modal-footer">
                <button className="btn btn-outline-secondary" onClick={() => setDeleteComm(null)}>Cancel</button>
                <button className="btn btn-danger" onClick={handleDelete}>Delete</button>
              </div>
            </div>
          </div>
        </div>
      </>)}

      {/* View Commission Modal */}
      {(viewComm || viewLoading) && (<>
        <div className="modal-backdrop fade show"></div>
        <div className="modal fade show d-block" tabIndex="-1" style={{ overflowY: 'auto', height: '100vh' }}>
          <div className="modal-dialog modal-xl" style={{ margin: '1rem auto' }}>
            <div className="modal-content border-0 shadow">
              <div className="modal-header border-bottom" style={{ background: '#f8f9fa' }}>
                <h5 className="modal-title fw-bold">Commission Details</h5>
                <button type="button" className="btn-close" onClick={() => setViewComm(null)}></button>
              </div>
              <div className="modal-body">
                {viewLoading ? (
                  <div className="text-center py-5"><div className="spinner-border text-primary"></div><p className="mt-2 text-muted">Loading...</p></div>
                ) : viewComm && (() => {
                  const inv = viewComm.invoice || {}
                  const details = viewComm.details || []
                  const payments = viewComm.payments || []
                  const mainPayments = viewComm.mainPayments || []
                  const items = viewComm.items || []
                  const commItemDets = viewComm.commItemDets || []
                  const commRepDets = viewComm.commRepDets || []
                  return (
                  <div>
                    {/* Archive + Update */}
                    <div className="mb-3 d-flex align-items-center gap-3">
                      <div className="form-check">
                        <input className="form-check-input" type="checkbox" id="archiveChk" defaultChecked={inv.po_status === 2 || inv.po_status === '2'} />
                        <label className="form-check-label" htmlFor="archiveChk">Archive invoice</label>
                      </div>
                      <button className="btn btn-sm btn-success" onClick={() => toast.success('Updated')}>Update</button>
                    </div>

                    {/* Commission Info - blue header */}
                    <table className="table table-bordered table-sm mb-3" style={{ fontSize: 13 }}>
                      <thead><tr style={{ background: '#006BF9', color: '#fff' }}>
                        <th>Commission Invoice #</th><th>Invoice $</th><th>Invoice Date</th><th>Customer Name</th>
                      </tr></thead>
                      <tbody><tr>
                        <td>{inv.invoice_number || '-'}</td><td>{fmtMoney(inv.net_amount)}</td><td>{fmtDate(inv.invoice_date)}</td><td>{viewComm.company_name || '-'}</td>
                      </tr></tbody>
                    </table>

                    {/* Invoice Payment Details - matching old PHP */}
                    <h6 className="fw-semibold mb-2">Invoice Payment Details</h6>
                    <div style={{ overflowX: 'auto' }}>
                      <table className="table table-bordered table-sm mb-3" style={{ fontSize: 12 }}>
                        <thead><tr style={{ background: '#3b82f6', color: '#fff' }}>
                          <th>commission Invoice #</th><th>Balance Due $</th><th>Received $</th><th>Date Rcvd</th><th>Check# CC#</th><th>Partial ComTotal</th><th>Compaid</th>
                          {details.map(d => <th key={d.sales_rep_id} className="text-center">{d.rep_code || d.rep_name || '-'}</th>)}
                        </tr></thead>
                        <tbody>
                          {(() => {
                            const rows = []
                            let grandReceived = 0
                            let grandPartial = 0
                            const grandRepAmts = {}
                            details.forEach(d => { grandRepAmts[d.sales_rep_id] = 0 })

                            // Use mainPayments (invoice_payment records) for left columns
                            // Use payments (per-rep records) for right columns
                            if (mainPayments.length > 0) {
                              mainPayments.forEach((mp, i) => {
                                const mpId = String(mp._id)
                                const received = parseFloat(mp.received_amt) || 0
                                const partial = parseFloat(mp.partial_com_total) || 0
                                const balanceDue = Math.max(0, (inv.net_amount || 0) - received)
                                grandReceived += received
                                grandPartial += partial

                                // Find per-rep payments for this main payment
                                const repPays = payments.filter(p => String(p.id_inv_payment) === mpId)

                                rows.push(
                                  <tr key={i}>
                                    <td>{inv.invoice_number || '-'} <a href="#" className="text-primary" style={{ fontSize: 11 }} onClick={e => e.preventDefault()}>Edit</a></td>
                                    <td>{fmtMoney(balanceDue)}</td>
                                    <td>{fmtMoney(received)}</td>
                                    <td>{mp.received_date ? fmtDate(mp.received_date) : (mp.commission_paid_date ? fmtDate(mp.commission_paid_date) : '-')}</td>
                                    <td>{mp.compaid_mode || ''}</td>
                                    <td>{fmtMoney(partial)}</td>
                                    <td>{mp.commission_paid_date || ''}</td>
                                    {details.map(d => {
                                      const repPay = repPays.find(rp => String(rp.rep_id) === String(d.sales_rep_id))
                                      const amt = parseFloat(repPay?.comm_paid_amount) || 0
                                      grandRepAmts[d.sales_rep_id] = (grandRepAmts[d.sales_rep_id] || 0) + amt
                                      return <td key={d.sales_rep_id} className="text-end">{fmtMoney(amt)}</td>
                                    })}
                                  </tr>
                                )
                              })
                            } else {
                              // No main payment records - show empty row
                              rows.push(
                                <tr key="empty">
                                  <td>{inv.invoice_number || '-'}</td><td></td><td>{fmtMoney(0)}</td><td></td><td></td><td>{fmtMoney(0)}</td><td></td>
                                  {details.map(d => <td key={d.sales_rep_id} className="text-end">{fmtMoney(0)}</td>)}
                                </tr>
                              )
                            }

                            // Totals row
                            rows.push(
                              <tr key="totals" className="fw-bold">
                                <td></td><td></td><td>{fmtMoney(grandReceived)}</td><td></td><td></td><td>{fmtMoney(grandPartial)}</td><td></td>
                                {details.map(d => <td key={d.sales_rep_id} className="text-end">{fmtMoney(grandRepAmts[d.sales_rep_id] || 0)}</td>)}
                              </tr>
                            )

                            return rows
                          })()}
                        </tbody>
                      </table>
                    </div>

                    {/* Commission Items - green section */}
                    <div style={{ background: '#d4edda', borderRadius: 8, padding: 16 }}>
                      <div className="text-center mb-3">
                        <button className="btn btn-danger px-4" onClick={() => { const vc = viewComm; setViewComm(null); setTimeout(() => openPayment(vc), 100) }}>Add Payment Details</button>
                      </div>
                      <div style={{ overflowX: 'auto' }}>
                        <table className="table table-bordered table-sm mb-0" style={{ fontSize: 12 }}>
                          <thead>
                            <tr>
                              <th style={{ background: '#4CB755', color: '#fff' }} colSpan="5"></th>
                              {details.map(d => <th key={d.sales_rep_id} colSpan="2" className="text-center" style={{ background: '#FFFFD4' }}>{d.rep_name || '-'}</th>)}
                            </tr>
                            <tr>
                              <th style={{ background: '#4CB755', color: '#fff' }}>Style</th>
                              <th style={{ background: '#4CB755', color: '#fff' }}>QTY</th>
                              <th style={{ background: '#4CB755', color: '#fff' }}>UNIT COST</th>
                              <th style={{ background: '#4CB755', color: '#fff' }}>BASE $</th>
                              <th style={{ background: '#4CB755', color: '#fff' }}>TOTAL</th>
                              {details.map(d => (<React.Fragment key={d.sales_rep_id}>
                                <th className="text-center" style={{ background: '#FFFFD4', fontSize: 11 }}>{d.rep_code || '-'}</th>
                                <th className="text-center" style={{ background: '#FFFFD4', fontSize: 11 }}></th>
                              </React.Fragment>))}
                            </tr>
                          </thead>
                          <tbody>
                            <tr className="fw-bold">
                              <td colSpan="4" style={{ background: '#e8f5e9' }}></td>
                              <td style={{ background: '#e8f5e9' }}>{fmtMoney(viewComm.total_commission)}</td>
                              {details.map(d => <td key={d.sales_rep_id} colSpan="2" className="text-center" style={{ background: '#FFFFD4' }}>{fmtMoney(d.total_price || 0)}</td>)}
                            </tr>
                            {items.length > 0 ? items.map((item, idx) => {
                              const itemId = item.item_id || item.legacy_id
                              const itemDet = commItemDets.find(d => d.item_id === itemId)
                              return (
                                <tr key={idx} style={{ background: '#e8f5e9' }}>
                                  <td>{item.item_name || '-'}</td>
                                  <td>{item.qty || 0}</td>
                                  <td>{fmtMoney(item.unit_cost)}</td>
                                  <td>{fmtMoney(itemDet?.base_price || item.unit_cost)}</td>
                                  <td>{fmtMoney(itemDet?.total_price || 0)}</td>
                                  {details.map(d => {
                                    const repDet = commRepDets.find(r => r.item_id === itemId && r.sales_rep_id === d.sales_rep_id)
                                    return (<React.Fragment key={d.sales_rep_id}>
                                      <td className="text-center" style={{ background: '#FFFFD4' }}>{fmtMoney(repDet?.commission_price || 0)}</td>
                                      <td className="text-center" style={{ background: '#FFFFD4' }}>{fmtMoney(repDet?.total_commission_price || 0)}</td>
                                    </React.Fragment>)
                                  })}
                                </tr>
                              )
                            }) : (
                              <tr><td colSpan={5 + details.length * 2} className="text-center text-muted">No items</td></tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                  )
                })()}
              </div>
              <div className="modal-footer">
                <button className="btn btn-outline-secondary" onClick={() => setViewComm(null)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      </>)}
    </div>
  )
}
