import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import html2pdf from 'html2pdf.js'
import { Bar, Doughnut } from 'react-chartjs-2'
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement,
  Title, Tooltip, Legend, ArcElement
} from 'chart.js'
import { api } from '../../lib/api'
import exportCSV from '../../lib/exportCSV'
import Pagination from '../../components/Pagination'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement)

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

  const [modalRow, setModalRow] = useState(null)
  const [breakdown, setBreakdown] = useState(null)
  const [loadingBreakdown, setLoadingBreakdown] = useState(false)

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

  const monthlyChart = useMemo(() => {
    const map = {}
    filtered.forEach(r => {
      if (!r.shipped_date) return
      const d = new Date(r.shipped_date)
      if (isNaN(d)) return
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      if (!map[key]) map[key] = { paid: 0, unpaid: 0 }
      if (r.is_paid) map[key].paid += r.commission || 0
      else map[key].unpaid += r.commission || 0
    })
    const sorted = Object.keys(map).sort()
    return {
      labels: sorted.map(k => {
        const [y, m] = k.split('-')
        return new Date(parseInt(y), parseInt(m) - 1).toLocaleString('en-US', { month: 'short', year: '2-digit' })
      }),
      datasets: [
        {
          label: 'Paid',
          data: sorted.map(k => parseFloat(map[k].paid.toFixed(2))),
          backgroundColor: 'rgba(16,185,129,0.75)',
          borderRadius: 4,
          stack: 'stack0',
        },
        {
          label: 'Outstanding',
          data: sorted.map(k => parseFloat(map[k].unpaid.toFixed(2))),
          backgroundColor: 'rgba(245,158,11,0.75)',
          borderRadius: 4,
          stack: 'stack0',
        },
      ],
    }
  }, [filtered])

  const doughnutChart = useMemo(() => ({
    labels: ['Paid', 'Outstanding'],
    datasets: [{
      data: [parseFloat(totals.commPaid.toFixed(2)), parseFloat(totals.commUnpaid.toFixed(2))],
      backgroundColor: ['rgba(16,185,129,0.8)', 'rgba(245,158,11,0.8)'],
      borderColor: ['#10b981', '#f59e0b'],
      borderWidth: 2,
    }],
  }), [totals])

  async function openBreakdown(row) {
    setModalRow(row)
    setBreakdown(null)
    setLoadingBreakdown(true)
    try {
      const result = await api.getCommissionBreakdown(
        row.commission_detail_id,
        isSalesRep ? myRepId : null
      )
      setBreakdown(result)
    } catch (err) {
      toast.error(err.message)
    }
    setLoadingBreakdown(false)
  }

  function closeModal() {
    setModalRow(null)
    setBreakdown(null)
  }

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

  const hasChartData = !loading && filtered.length > 0 && monthlyChart.labels.length > 0

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

      {/* Charts */}
      {hasChartData && (
        <div className="row g-3 mb-3">
          <div className="col-lg-8">
            <div className="card border-0 shadow-sm rounded-4 h-100">
              <div className="card-body py-2 px-3">
                <div className="text-muted mb-1" style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Commission by Month
                </div>
                <div style={{ height: 180 }}>
                  <Bar
                    data={monthlyChart}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: { position: 'top', labels: { font: { size: 11 }, boxWidth: 12, padding: 8 } },
                        tooltip: {
                          callbacks: {
                            label: ctx => ` ${ctx.dataset.label}: $${ctx.parsed.y.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                          }
                        },
                      },
                      scales: {
                        x: { stacked: true, ticks: { font: { size: 10 } }, grid: { display: false } },
                        y: {
                          stacked: true,
                          ticks: {
                            font: { size: 10 },
                            callback: v => '$' + (v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v),
                          },
                          grid: { color: 'rgba(0,0,0,0.05)' },
                        },
                      },
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
          <div className="col-lg-4">
            <div className="card border-0 shadow-sm rounded-4 h-100">
              <div className="card-body py-2 px-3 d-flex flex-column align-items-center justify-content-center">
                <div className="text-muted mb-1 align-self-start" style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Paid vs Outstanding
                </div>
                <div style={{ height: 160, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {totals.commission > 0 ? (
                    <Doughnut
                      data={doughnutChart}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        cutout: '65%',
                        plugins: {
                          legend: { position: 'bottom', labels: { font: { size: 11 }, boxWidth: 12, padding: 8 } },
                          tooltip: {
                            callbacks: {
                              label: ctx => ` ${ctx.label}: $${ctx.parsed.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                            }
                          },
                        },
                      }}
                    />
                  ) : (
                    <span className="text-muted" style={{ fontSize: 12 }}>No data</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

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
            <div className="d-flex align-items-center gap-2">
              <span className="badge bg-white bg-opacity-25 px-2 py-1" style={{ fontSize: 11 }}>{filtered.length} records</span>
              <span className="text-white-50" style={{ fontSize: 11 }}>
                <i className="bi bi-hand-index me-1"></i>Click a row to view breakdown
              </span>
            </div>
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
                  <th className="text-center" style={{ width: 60 }}></th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((r, i) => (
                  <tr
                    key={i}
                    style={{ cursor: 'pointer' }}
                    onClick={() => openBreakdown(r)}
                    title="Click to view commission breakdown"
                  >
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
                    <td className="text-center">
                      <i className="bi bi-chevron-right text-muted" style={{ fontSize: 11 }}></i>
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

      {/* Breakdown Modal */}
      {modalRow && (
        <>
          <div className="modal-backdrop fade show" style={{ zIndex: 1050 }}></div>
          <div
            className="modal fade show d-block"
            tabIndex="-1"
            style={{ zIndex: 1055 }}
            onClick={e => { if (e.target === e.currentTarget) closeModal() }}
          >
            <div className="modal-dialog modal-dialog-centered modal-lg" style={{ maxWidth: 760 }}>
              <div className="modal-content rounded-4 border-0 shadow">
                <div className="modal-header border-0 pb-0" style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)', borderRadius: '16px 16px 0 0' }}>
                  <div className="text-white">
                    <h6 className="mb-0 fw-bold">
                      <i className="bi bi-receipt me-2"></i>
                      Commission Breakdown
                    </h6>
                    <div style={{ fontSize: 12, opacity: 0.85 }}>
                      Invoice #{modalRow.invoice_number || '—'} &nbsp;·&nbsp; {modalRow.company_name}
                      {!isSalesRep && modalRow.rep_name && (
                        <> &nbsp;·&nbsp; {modalRow.rep_name}</>
                      )}
                    </div>
                  </div>
                  <button type="button" className="btn-close btn-close-white ms-auto" onClick={closeModal}></button>
                </div>

                <div className="modal-body px-4 py-3">
                  {/* Invoice summary row */}
                  <div className="d-flex gap-3 flex-wrap mb-3">
                    <div className="rounded-3 px-3 py-2" style={{ background: '#f8fafc', fontSize: 12 }}>
                      <div className="text-muted" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Date Shipped</div>
                      <div className="fw-semibold">{fmtDate(modalRow.shipped_date)}</div>
                    </div>
                    <div className="rounded-3 px-3 py-2" style={{ background: '#f8fafc', fontSize: 12 }}>
                      <div className="text-muted" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Subtotal</div>
                      <div className="fw-semibold">{fmtMoney(modalRow.subtotal)}</div>
                    </div>
                    <div className="rounded-3 px-3 py-2" style={{ background: '#f8fafc', fontSize: 12 }}>
                      <div className="text-muted" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ship + Tax</div>
                      <div className="fw-semibold">{fmtMoney(modalRow.shipping_and_tax)}</div>
                    </div>
                    <div className="rounded-3 px-3 py-2" style={{ background: '#eef2ff', fontSize: 12 }}>
                      <div className="text-muted" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Commission</div>
                      <div className="fw-bold" style={{ color: '#6366f1' }}>{fmtMoney(modalRow.commission)}</div>
                    </div>
                    <div className="rounded-3 px-3 py-2" style={{ background: modalRow.is_paid ? '#f0fdf4' : '#fff7ed', fontSize: 12 }}>
                      <div className="text-muted" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</div>
                      <div className="fw-semibold" style={{ color: modalRow.is_paid ? '#16a34a' : '#f59e0b' }}>
                        {modalRow.is_paid ? 'Paid' : 'Outstanding'}
                      </div>
                    </div>
                  </div>

                  {/* Line items */}
                  {loadingBreakdown ? (
                    <div className="text-center py-4">
                      <div className="spinner-border spinner-border-sm text-primary me-2"></div>
                      <span className="text-muted" style={{ fontSize: 13 }}>Loading line items...</span>
                    </div>
                  ) : breakdown ? (
                    <>
                      {!breakdown.has_item_detail && (
                        <div className="alert alert-info py-2 px-3 mb-2" style={{ fontSize: 12 }}>
                          <i className="bi bi-info-circle me-1"></i>
                          Commission calculated as{' '}
                          {breakdown.commission_percentage
                            ? `${breakdown.commission_percentage}% of subtotal`
                            : breakdown.commission_dollar
                              ? `fixed $${breakdown.commission_dollar}`
                              : 'a flat rate'}.
                          {' '}Line items shown for reference.
                        </div>
                      )}

                      {breakdown.line_items.length === 0 ? (
                        <div className="text-center py-3 text-muted" style={{ fontSize: 13 }}>
                          <i className="bi bi-inbox d-block mb-1 fs-4 opacity-25"></i>
                          No line items found for this invoice
                        </div>
                      ) : (
                        <div style={{ overflowX: 'auto' }}>
                          <table className="table table-sm align-middle mb-0" style={{ fontSize: 12 }}>
                            <thead style={{ background: '#f1f5f9' }}>
                              <tr>
                                <th className="ps-2">Item</th>
                                <th className="text-center">Qty</th>
                                <th className="text-end">Unit Cost</th>
                                <th className="text-end">Line Total</th>
                                {breakdown.has_item_detail && (
                                  <>
                                    <th className="text-end">Comm/Unit</th>
                                    <th className="text-end" style={{ color: '#6366f1' }}>Commission</th>
                                  </>
                                )}
                              </tr>
                            </thead>
                            <tbody>
                              {breakdown.line_items.map((it, i) => (
                                <tr key={i}>
                                  <td className="ps-2 fw-semibold">{it.item_name || `Item #${it.item_id}`}</td>
                                  <td className="text-center">{it.qty}</td>
                                  <td className="text-end">{fmtMoney(it.unit_cost)}</td>
                                  <td className="text-end">{fmtMoney(it.line_total)}</td>
                                  {breakdown.has_item_detail && (
                                    <>
                                      <td className="text-end text-muted">{fmtMoney(it.comm_per_unit)}</td>
                                      <td className="text-end fw-semibold" style={{ color: '#6366f1' }}>
                                        {fmtMoney(it.comm_total)}
                                      </td>
                                    </>
                                  )}
                                </tr>
                              ))}
                            </tbody>
                            <tfoot>
                              <tr className="fw-bold" style={{ background: '#f8fafc', borderTop: '2px solid #e2e8f0' }}>
                                <td className="ps-2">TOTAL</td>
                                <td></td>
                                <td></td>
                                <td className="text-end">
                                  {fmtMoney(breakdown.line_items.reduce((s, it) => s + it.line_total, 0))}
                                </td>
                                {breakdown.has_item_detail && (
                                  <>
                                    <td></td>
                                    <td className="text-end" style={{ color: '#6366f1' }}>
                                      {fmtMoney(breakdown.total_commission)}
                                    </td>
                                  </>
                                )}
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      )}
                    </>
                  ) : null}
                </div>

                <div className="modal-footer border-0 pt-0">
                  <button className="btn btn-sm btn-outline-secondary" onClick={closeModal} style={{ fontSize: 12 }}>
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
