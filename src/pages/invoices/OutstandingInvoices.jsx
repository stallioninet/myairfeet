import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { api } from '../../lib/api'
import Pagination from '../../components/Pagination'

export default function OutstandingInvoices() {
  const [allInvoices, setAllInvoices] = useState([])
  const [loading, setLoading] = useState(true)
  const [customers, setCustomers] = useState([])
  const [customerTypes, setCustomerTypes] = useState([])
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(10)
  const [selected, setSelected] = useState([])
  const [selectAll, setSelectAll] = useState(false)
  const [bulkPaid, setBulkPaid] = useState(false)
  const [bulkArchive, setBulkArchive] = useState(false)

  // Filters matching old PHP
  const [fCustomer, setFCustomer] = useState('')
  const [fCustType, setFCustType] = useState('')
  const [fDateFrom, setFDateFrom] = useState('')
  const [fDateTo, setFDateTo] = useState('')
  const [fInvDate, setFInvDate] = useState('')
  const [fInvNumber, setFInvNumber] = useState('')
  const [fShow, setFShow] = useState('outstanding') // outstanding, archive, all

  useEffect(() => { fetchData(); fetchLookups() }, [])

  async function fetchData() {
    setLoading(true)
    try {
      const data = await api.getInvoices()
      setAllInvoices(data || [])
    } catch (err) {
      toast.error('Failed to load: ' + err.message)
    }
    setLoading(false)
  }

  async function fetchLookups() {
    try {
      const [custs, types] = await Promise.all([
        api.getInvoiceCustomers(),
        api.getCustomerTypes(),
      ])
      setCustomers(custs || [])
      setCustomerTypes(types || [])
    } catch {}
  }

  function resetFilters() {
    setFCustomer(''); setFCustType(''); setFDateFrom(''); setFDateTo('')
    setFInvDate(''); setFInvNumber(''); setFShow('outstanding'); setPage(1)
  }

  async function handleBulkSave() {
    if (selected.length === 0) { toast.error('Select invoices first'); return }
    if (!bulkPaid && !bulkArchive) { toast.error('Select PAID or Archive'); return }
    try {
      const result = await api.bulkUpdateInvoices(selected, bulkPaid, bulkArchive)
      toast.success(result.message || 'Updated successfully')
      setSelected([]); setSelectAll(false); setBulkPaid(false); setBulkArchive(false)
      fetchData()
    } catch (err) { toast.error(err.message) }
  }

  async function handleMarkPaid(inv) {
    try {
      await api.updateInvoicePaid(inv._id, 'PAID', new Date().toISOString().slice(0, 10))
      toast.success('Marked as PAID')
      fetchData()
    } catch (err) { toast.error(err.message) }
  }

  async function handleUpdateDueDate(inv, newDate) {
    try {
      await api.updateInvoiceDueDate(inv._id, newDate)
      toast.success('Due date updated')
      fetchData()
    } catch (err) { toast.error(err.message) }
  }

  function toggleSelect(id) {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  function toggleSelectAll(checked) {
    setSelectAll(checked)
    if (checked) setSelected(paginated.map(inv => inv._id))
    else setSelected([])
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

  function getDaysOverdue(inv) {
    if (!inv.due_date) return null
    const due = new Date(inv.due_date); const now = new Date()
    now.setHours(0, 0, 0, 0); due.setHours(0, 0, 0, 0)
    return Math.floor((now - due) / (1000 * 60 * 60 * 24))
  }

  function getRowStyle(inv) {
    const days = getDaysOverdue(inv)
    if (days === null) return {}
    if (days > 30) return { background: '#fee2e2' }
    if (days > 0) return { background: '#fff7ed' }
    return {}
  }

  // Apply all filters
  const now = new Date()
  const filtered = allInvoices.filter(inv => {
    // Show filter
    if (fShow === 'outstanding' && inv.paid_value === 'PAID') return false
    if (fShow === 'archive' && inv.po_status !== 2 && inv.po_status !== '2') return false
    // Customer
    if (fCustomer && String(inv.company_id) !== String(fCustomer)) return false
    // Customer type - would need customer type on invoice, skip if not available
    // Date from/to (PO date)
    if (fDateFrom && inv.po_date) {
      if (new Date(inv.po_date) < new Date(fDateFrom)) return false
    }
    if (fDateTo && inv.po_date) {
      if (new Date(inv.po_date) > new Date(fDateTo + 'T23:59:59')) return false
    }
    // Invoice date
    if (fInvDate && inv.invoice_date) {
      const invDt = new Date(inv.invoice_date).toISOString().slice(0, 10)
      if (invDt !== fInvDate) return false
    }
    // Invoice number search
    if (fInvNumber) {
      const s = fInvNumber.toLowerCase()
      if (!(inv.invoice_number || '').toLowerCase().includes(s) &&
          !(inv.po_number || '').toLowerCase().includes(s) &&
          !(inv.company_name || '').toLowerCase().includes(s)) return false
    }
    return true
  })

  const totalOutstanding = filtered.reduce((s, inv) => s + (parseFloat(inv.net_amount) || 0), 0)
  const overdueList = filtered.filter(inv => inv.due_date && new Date(inv.due_date) < now && inv.paid_value !== 'PAID')
  const overdueAmount = overdueList.reduce((s, inv) => s + (parseFloat(inv.net_amount) || 0), 0)
  const unpaidCount = filtered.filter(inv => inv.paid_value !== 'PAID').length

  const paginated = filtered.slice((page - 1) * perPage, page * perPage)

  return (
    <div>
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <nav aria-label="breadcrumb">
            <ol className="breadcrumb mb-1">
              <li className="breadcrumb-item"><Link to="/dashboard"><i className="bi bi-house-door"></i></Link></li>
              <li className="breadcrumb-item"><Link to="/invoices">Invoices</Link></li>
              <li className="breadcrumb-item active">Outstanding</li>
            </ol>
          </nav>
          <h3 className="mb-0">Outstanding Invoices</h3>
        </div>
      </div>

      {/* Stats */}
      <div className="row g-3 mb-4">
        {[
          { value: unpaidCount, label: 'Total Unpaid', icon: 'bi-exclamation-circle-fill', bg: '#fef2f2', color: '#ef4444' },
          { value: overdueList.length, label: 'Overdue', icon: 'bi-clock-fill', bg: '#fff7ed', color: '#f59e0b' },
          { value: fmtMoney(totalOutstanding), label: 'Outstanding Amount', icon: 'bi-currency-dollar', bg: '#eff6ff', color: '#2563eb', raw: true },
          { value: fmtMoney(overdueAmount), label: 'Overdue Amount', icon: 'bi-exclamation-triangle-fill', bg: '#fef2f2', color: '#dc2626', raw: true },
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

      {/* Filter Panel - matches old PHP */}
      <div className="card border-0 shadow-sm rounded-4 mb-3">
        <div className="card-body py-3 px-4">
          <div className="row g-2 align-items-end">
            <div className="col-md-3">
              <label className="form-label small fw-semibold mb-1">Customer Name</label>
              <select className="form-select form-select-sm" value={fCustomer} onChange={e => { setFCustomer(e.target.value); setPage(1) }}>
                <option value="">All Customers</option>
                {customers.map(c => <option key={c._id} value={c.legacy_id}>{c.company_name}</option>)}
              </select>
            </div>
            <div className="col-md-2">
              <label className="form-label small fw-semibold mb-1">Customer Type</label>
              <select className="form-select form-select-sm" value={fCustType} onChange={e => { setFCustType(e.target.value); setPage(1) }}>
                <option value="">All Types</option>
                {customerTypes.map(t => <option key={t._id} value={t.name || t.type_name}>{t.name || t.type_name}</option>)}
              </select>
            </div>
            <div className="col-md-2">
              <label className="form-label small fw-semibold mb-1">Date From</label>
              <input type="date" className="form-control form-control-sm" value={fDateFrom} onChange={e => { setFDateFrom(e.target.value); setPage(1) }} />
            </div>
            <div className="col-md-2">
              <label className="form-label small fw-semibold mb-1">Date To</label>
              <input type="date" className="form-control form-control-sm" value={fDateTo} onChange={e => { setFDateTo(e.target.value); setPage(1) }} />
            </div>
            <div className="col-md-2">
              <label className="form-label small fw-semibold mb-1">Invoice Date</label>
              <input type="date" className="form-control form-control-sm" value={fInvDate} onChange={e => { setFInvDate(e.target.value); setPage(1) }} />
            </div>
          </div>
          <div className="row g-2 align-items-end mt-2">
            <div className="col-md-3">
              <label className="form-label small fw-semibold mb-1">Invoice #</label>
              <input type="text" className="form-control form-control-sm" placeholder="Search invoice..." value={fInvNumber} onChange={e => { setFInvNumber(e.target.value); setPage(1) }} />
            </div>
            <div className="col-md-5">
              <div className="d-flex gap-3 align-items-center" style={{ paddingBottom: 2 }}>
                <div className="form-check form-check-inline">
                  <input className="form-check-input" type="radio" name="showFilter" id="showOutstanding" checked={fShow === 'outstanding'} onChange={() => { setFShow('outstanding'); setPage(1) }} />
                  <label className="form-check-label small" htmlFor="showOutstanding">Outstanding</label>
                </div>
                <div className="form-check form-check-inline">
                  <input className="form-check-input" type="radio" name="showFilter" id="showArchive" checked={fShow === 'archive'} onChange={() => { setFShow('archive'); setPage(1) }} />
                  <label className="form-check-label small" htmlFor="showArchive">Archive</label>
                </div>
                <div className="form-check form-check-inline">
                  <input className="form-check-input" type="radio" name="showFilter" id="showAll" checked={fShow === 'all'} onChange={() => { setFShow('all'); setPage(1) }} />
                  <label className="form-check-label small" htmlFor="showAll">Show All</label>
                </div>
              </div>
            </div>
            <div className="col-md-4 d-flex gap-2 justify-content-end">
              <button className="btn btn-sm btn-outline-secondary" onClick={resetFilters}>
                <i className="bi bi-x-lg me-1"></i>Reset
              </button>
              <span className="text-muted small align-self-center">{filtered.length} result{filtered.length !== 1 ? 's' : ''}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bulk Actions - hidden until needed, shown after table like old PHP */}

      {/* Table */}
      <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
        <div className="card-header py-3 border-0" style={{ background: 'linear-gradient(135deg, #dc2626, #991b1b)', color: '#fff' }}>
          <div className="d-flex justify-content-between align-items-center">
            <h5 className="mb-0"><i className="bi bi-exclamation-circle me-2"></i>Outstanding Invoices</h5>
            <span className="badge bg-white bg-opacity-25 px-3 py-2">{filtered.length} invoices</span>
          </div>
        </div>
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0" style={{ fontSize: 13 }}>
            <thead className="bg-light">
              <tr>
                <th style={{ width: 40 }} className="ps-3">
                  <input type="checkbox" className="form-check-input" style={{ width: 20, height: 20, cursor: 'pointer', border: '2px solid #6c757d' }} checked={selectAll} onChange={e => toggleSelectAll(e.target.checked)} />
                </th>
                <th>Customer</th>
                <th>PO Date</th>
                <th>PO #</th>
                <th>Invoice #</th>
                <th>Payment Due</th>
                <th className="text-center">Days</th>
                <th>QTY</th>
                <th>Inv Total ($)</th>
                <th className="text-center" style={{ width: 100 }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="10" className="text-center py-4"><div className="spinner-border spinner-border-sm text-primary"></div> Loading...</td></tr>
              ) : paginated.length === 0 ? (
                <tr><td colSpan="10" className="text-center py-4 text-muted"><i className="bi bi-check-circle fs-1 d-block mb-2 opacity-25"></i>No outstanding invoices</td></tr>
              ) : paginated.map(inv => {
                const days = getDaysOverdue(inv)
                const isPaid = inv.paid_value === 'PAID'
                return (
                  <tr key={inv._id} style={getRowStyle(inv)}>
                    <td className="ps-3">
                      <input type="checkbox" className="form-check-input" style={{ width: 20, height: 20, cursor: 'pointer', border: '2px solid #6c757d' }} checked={selected.includes(inv._id)} onChange={() => toggleSelect(inv._id)} />
                    </td>
                    <td className="fw-semibold">{inv.company_name || '-'}</td>
                    <td>{fmtDate(inv.po_date)}</td>
                    <td><span className="badge bg-success-subtle text-success rounded-pill px-2">{inv.po_number || '-'}</span></td>
                    <td><span className="badge bg-warning-subtle text-warning rounded-pill px-2">{inv.invoice_number || '-'}</span></td>
                    <td>
                      <input
                        type="date"
                        className="form-control form-control-sm"
                        style={{ width: 135, fontSize: 12, color: (days > 0 && !isPaid) ? '#dc2626' : isPaid ? '#198754' : '#333', fontWeight: (days > 0 && !isPaid) ? 600 : 400 }}
                        value={inv.due_date ? new Date(inv.due_date).toISOString().slice(0, 10) : ''}
                        onChange={e => handleUpdateDueDate(inv, e.target.value)}
                      />
                    </td>
                    <td className="text-center">
                      {isPaid ? (
                        <span className="badge bg-success rounded-pill px-2">PAID</span>
                      ) : days !== null ? (
                        days > 0 ? (
                          <span className="badge bg-danger rounded-pill px-2">{days}d</span>
                        ) : days === 0 ? (
                          <span className="badge bg-warning rounded-pill px-2">Today</span>
                        ) : (
                          <span className="badge bg-info-subtle text-info rounded-pill px-2">{Math.abs(days)}d</span>
                        )
                      ) : '-'}
                    </td>
                    <td>{inv.total_qty || 0}</td>
                    <td className="fw-semibold">{fmtMoney(inv.net_amount)}</td>
                    <td className="text-center">
                      {!isPaid && (
                        <button className="btn btn-sm btn-success" title="Mark as Paid" onClick={() => handleMarkPaid(inv)}>
                          <i className="bi bi-check-lg"></i>
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
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
      {/* Select the order and change the status - matches old PHP */}
      <div className="card border-0 shadow-sm rounded-4 mt-3">
        <div className="card-body py-3 px-4">
          <h6 className="fw-semibold mb-3">Select the order and change the status</h6>
          <div className="d-flex align-items-center gap-4 flex-wrap">
            <div className="d-flex align-items-center gap-2">
              <span style={{ fontSize: 15 }}>PAID</span>
              <input
                type="checkbox"
                className="form-check-input"
                style={{ width: 20, height: 20 }}
                checked={bulkPaid}
                onChange={e => setBulkPaid(e.target.checked)}
              />
            </div>
            <div className="d-flex align-items-center gap-2">
              <span style={{ fontSize: 15 }}>Archive</span>
              <input
                type="checkbox"
                className="form-check-input"
                style={{ width: 20, height: 20 }}
                checked={bulkArchive}
                onChange={e => setBulkArchive(e.target.checked)}
              />
            </div>
            {selected.length > 0 && (
              <span className="badge bg-primary rounded-pill px-3 py-2">{selected.length} selected</span>
            )}
            <button className="btn btn-success px-4" onClick={handleBulkSave} disabled={selected.length === 0}>
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
