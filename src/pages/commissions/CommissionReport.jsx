import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import html2pdf from 'html2pdf.js'
import { api } from '../../lib/api'
import exportCSV from '../../lib/exportCSV'
import Pagination from '../../components/Pagination'

export default function CommissionReport() {
  const [user] = useState(() => {
    try { return JSON.parse(localStorage.getItem('ct_user') || '{}') } catch { return {} }
  })
  const isSalesRep = user?.level === 'sales-rep'

  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [reps, setReps] = useState([])
  const [filterRep, setFilterRep] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(25)
  const [myRepId, setMyRepId] = useState(null)
  const [repName, setRepName] = useState('')
  const [ready, setReady] = useState(false)

  // On mount: resolve sales-rep identity or load rep list for admins
  useEffect(() => {
    if (isSalesRep) {
      api.getSalesReps('active')
        .then(allReps => {
          const mine = (allReps || []).find(r => r.email === user.email)
          if (mine) {
            setMyRepId(mine.legacy_id)
            setRepName(`${mine.first_name || ''} ${mine.last_name || ''}`.trim())
          } else {
            toast.error('Could not match your account to a sales rep profile')
          }
          setReady(true)
        })
        .catch(err => { toast.error(err.message); setLoading(false) })
    } else {
      api.getCommissionReps().then(r => setReps(r || [])).catch(() => {})
      setReady(true)
    }
  }, [])

  // Fetch report whenever filters or rep identity changes
  useEffect(() => {
    if (!ready) return
    if (isSalesRep && myRepId == null) return
    fetchReport()
  }, [ready, myRepId, filterRep, filterStatus, dateFrom, dateTo])

  async function fetchReport() {
    setLoading(true)
    setPage(1)
    try {
      const params = {}
      if (isSalesRep) {
        params.rep_id = myRepId
      } else if (filterRep) {
        params.rep_id = filterRep
      }
      if (filterStatus) params.status = filterStatus
      if (dateFrom) params.date_from = dateFrom
      if (dateTo) params.date_to = dateTo
      const result = await api.getCommissionReport(params)
      setData(result || [])
    } catch (err) {
      toast.error(err.message)
    }
    setLoading(false)
  }

  function fmtMoney(v) {
    return '$' + (parseFloat(v) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  function fmtDate(d) {
    if (!d) return '-'
    try {
      const dt = new Date(d)
      if (isNaN(dt)) return d
      return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    } catch { return d }
  }

  const filtered = data.filter(r => {
    if (!search) return true
    const s = search.toLowerCase()
    return (r.company_name || '').toLowerCase().includes(s) ||
      (r.invoice_number || '').toLowerCase().includes(s) ||
      (r.rep_name || '').toLowerCase().includes(s) ||
      (r.contact_phone || '').includes(s)
  })

  const totals = {
    commission: filtered.reduce((s, r) => s + (r.commission || 0), 0),
    commPaid: filtered.filter(r => r.is_paid).reduce((s, r) => s + (r.commission || 0), 0),
    commUnpaid: filtered.filter(r => !r.is_paid).reduce((s, r) => s + (r.commission || 0), 0),
    subtotal: filtered.reduce((s, r) => s + (r.subtotal || 0), 0),
  }

  const paginated = filtered.slice((page - 1) * perPage, page * perPage)

  function doExportPdf() {
    const el = document.getElementById('report-table-area')
    if (!el) return
    html2pdf().set({
      margin: [8, 6, 8, 6],
      filename: `Commission_Report_${new Date().toISOString().slice(0, 10)}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' },
    }).from(el).save().then(() => toast.success('PDF exported'))
  }

  function doExportCSV() {
    const headers = ['Sales Rep', 'Customer', 'Contact Phone', 'Invoice #', 'Date Shipped', 'Subtotal', 'Shipping+Tax', 'Commission Owed', 'Status', 'Paid Date']
    const rows = filtered.map(r => [
      r.rep_name, r.company_name, r.contact_phone,
      r.invoice_number, r.shipped_date,
      (r.subtotal || 0).toFixed(2),
      (r.shipping_and_tax || 0).toFixed(2),
      (r.commission || 0).toFixed(2),
      r.is_paid ? 'Paid' : 'Unpaid',
      r.paid_date || '',
    ])
    exportCSV(rows, headers, `Commission_Report_${new Date().toISOString().slice(0, 10)}`)
  }

  const statsConfig = [
    { value: filtered.length, label: 'Total Invoices', icon: 'bi-receipt', bg: '#eff6ff', color: '#2563eb' },
    { value: fmtMoney(totals.commission), label: 'Total Commission', icon: 'bi-cash-stack', bg: '#ecfdf5', color: '#10b981' },
    { value: fmtMoney(totals.commPaid), label: 'Comm. on Paid', icon: 'bi-check-circle', bg: '#f0fdf4', color: '#16a34a' },
    { value: fmtMoney(totals.commUnpaid), label: 'Comm. Outstanding', icon: 'bi-exclamation-circle', bg: '#fff7ed', color: '#f59e0b' },
  ]

  return (
    <div style={{ width: '100%', overflowX: 'hidden' }}>
      {/* Breadcrumb + Title */}
      <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
        <div>
          <nav aria-label="breadcrumb">
            <ol className="breadcrumb mb-0" style={{ fontSize: 13 }}>
              <li className="breadcrumb-item"><Link to="/dashboard"><i className="bi bi-house-door"></i></Link></li>
              <li className="breadcrumb-item"><Link to="/commissions">Commissions</Link></li>
              <li className="breadcrumb-item active">Commission Report</li>
            </ol>
          </nav>
          <h4 className="mb-0">
            {isSalesRep
              ? <>My Commission Report {repName && <span className="text-muted fs-6 fw-normal ms-2">— {repName}</span>}</>
              : 'Commission Report'}
          </h4>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="row g-2 mb-3">
        {statsConfig.map((stat, i) => (
          <div className="col-md-3 col-6" key={i}>
            <div className="stat-card" style={{ padding: '12px 16px' }}>
              <div className="d-flex align-items-center gap-2">
                <div className="stat-icon" style={{ background: stat.bg, color: stat.color, width: 36, height: 36, fontSize: 16 }}>
                  <i className={`bi ${stat.icon}`}></i>
                </div>
                <div>
                  <div className="stat-value" style={{ fontSize: 16 }}>{loading ? '—' : stat.value}</div>
                  <div className="stat-label" style={{ fontSize: 11 }}>{stat.label}</div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filter Bar */}
      <div className="card border-0 shadow-sm rounded-4 mb-3">
        <div className="card-body py-2 px-3">
          <div className="d-flex flex-wrap gap-2 align-items-center" style={{ fontSize: 12 }}>
            <div className="position-relative" style={{ minWidth: 170, flex: '1 1 170px', maxWidth: 230 }}>
              <i className="bi bi-search position-absolute" style={{ left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: 12 }}></i>
              <input
                type="text" className="form-control form-control-sm ps-4" style={{ fontSize: 12 }}
                placeholder="Search customer, invoice..." value={search}
                onChange={e => { setSearch(e.target.value); setPage(1) }}
              />
            </div>

            {!isSalesRep && (
              <select className="form-select form-select-sm" style={{ fontSize: 12, minWidth: 150 }} value={filterRep} onChange={e => setFilterRep(e.target.value)}>
                <option value="">All Sales Reps</option>
                {reps.map(r => <option key={r._id} value={r.legacy_id}>{r.first_name} {r.last_name}</option>)}
              </select>
            )}

            <select className="form-select form-select-sm" style={{ fontSize: 12, minWidth: 120 }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="">All Invoices</option>
              <option value="paid">Paid Only</option>
              <option value="unpaid">Unpaid Only</option>
            </select>

            <div className="d-flex align-items-center gap-1">
              <span className="text-muted text-nowrap" style={{ fontSize: 11 }}>Shipped:</span>
              <input type="date" className="form-control form-control-sm" style={{ fontSize: 12, width: 130 }} value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
              <span className="text-muted px-1">–</span>
              <input type="date" className="form-control form-control-sm" style={{ fontSize: 12, width: 130 }} value={dateTo} onChange={e => setDateTo(e.target.value)} />
            </div>

            <div className="ms-auto d-flex gap-2">
              <button className="btn btn-sm btn-outline-success" onClick={doExportCSV} style={{ fontSize: 12 }}>
                <i className="bi bi-file-earmark-spreadsheet me-1"></i>CSV
              </button>
              <button className="btn btn-sm btn-outline-danger" onClick={doExportPdf} style={{ fontSize: 12 }}>
                <i className="bi bi-file-pdf me-1"></i>PDF
              </button>
              <span className="text-muted d-flex align-items-center" style={{ fontSize: 11 }}>{filtered.length} records</span>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card border-0 shadow-sm rounded-4" style={{ overflow: 'hidden' }}>
        <div className="card-header py-2 border-0" style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)', color: '#fff' }}>
          <div className="d-flex justify-content-between align-items-center flex-wrap gap-1">
            <h6 className="mb-0 fw-bold">
              <i className="bi bi-file-earmark-bar-graph me-2"></i>
              {isSalesRep ? 'My Commission Invoices' : 'Commission Invoices by Rep'}
            </h6>
            <span className="badge bg-white bg-opacity-25 px-2 py-1" style={{ fontSize: 11 }}>{filtered.length} records</span>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }} id="report-table-area">
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary"></div>
              <p className="mt-2 text-muted">Loading report...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-5 text-muted">
              <i className="bi bi-file-earmark-bar-graph fs-1 d-block mb-2 opacity-25"></i>
              No records found
            </div>
          ) : (
            <table className="table table-hover align-middle mb-0" style={{ fontSize: 13 }}>
              <thead className="bg-light">
                <tr>
                  {!isSalesRep && <th className="ps-3">Sales Rep</th>}
                  <th>Customer</th>
                  <th>Contact Phone</th>
                  <th>Invoice #</th>
                  <th>Date Shipped</th>
                  <th className="text-end">Subtotal</th>
                  <th className="text-end">Ship + Tax</th>
                  <th className="text-end">Commission</th>
                  <th className="text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((r, i) => (
                  <tr key={i}>
                    {!isSalesRep && (
                      <td className="ps-3">
                        <span className="fw-semibold">{r.rep_name}</span>
                        {r.rep_code && <span className="text-muted small ms-1">({r.rep_code})</span>}
                      </td>
                    )}
                    <td className="fw-semibold">{r.company_name || '—'}</td>
                    <td className="text-muted">{r.contact_phone || '—'}</td>
                    <td>
                      <span className="badge bg-warning-subtle text-warning fw-semibold">
                        {r.invoice_number || '—'}
                      </span>
                    </td>
                    <td className="text-muted">{fmtDate(r.shipped_date)}</td>
                    <td className="text-end">{fmtMoney(r.subtotal)}</td>
                    <td className="text-end text-muted">{fmtMoney(r.shipping_and_tax)}</td>
                    <td className="text-end fw-semibold" style={{ color: '#6366f1' }}>
                      {fmtMoney(r.commission)}
                    </td>
                    <td className="text-center">
                      {r.is_paid
                        ? <span className="badge bg-success-subtle text-success px-2">Paid</span>
                        : <span className="badge bg-danger-subtle text-danger px-2">Unpaid</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="fw-bold bg-light">
                  {!isSalesRep && <td className="ps-3">TOTAL</td>}
                  <td colSpan={isSalesRep ? 4 : 3}>{isSalesRep ? 'TOTAL' : ''}</td>
                  <td></td>
                  <td className="text-end">{fmtMoney(totals.subtotal)}</td>
                  <td></td>
                  <td className="text-end fw-bold" style={{ color: '#6366f1' }}>{fmtMoney(totals.commission)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>

        {filtered.length > 0 && (
          <div className="card-footer bg-white border-0 py-2">
            <Pagination
              total={filtered.length}
              page={page}
              perPage={perPage}
              onPageChange={setPage}
              onPerPageChange={v => { setPerPage(v); setPage(1) }}
            />
          </div>
        )}
      </div>
    </div>
  )
}
