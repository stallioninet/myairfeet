import React, { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Chart, registerables } from 'chart.js'
import html2pdf from 'html2pdf.js'
import { api } from '../../lib/api'
import Pagination from '../../components/Pagination'
import exportCSV from '../../lib/exportCSV'

Chart.register(...registerables)

function fmtMoney(v) { return '$' + (parseFloat(v) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }
function fmtDate(d) { if (!d) return '-'; const dt = new Date(d); if (isNaN(dt)) return '-'; return `${String(dt.getMonth()+1).padStart(2,'0')}/${String(dt.getDate()).padStart(2,'0')}/${dt.getFullYear()}` }

function useChart(ref, config, deps) {
  const inst = useRef(null)
  useEffect(() => {
    if (!ref.current) return
    if (inst.current) { inst.current.destroy(); inst.current = null }
    if (config) inst.current = new Chart(ref.current, config)
    return () => { if (inst.current) { inst.current.destroy(); inst.current = null } }
  }, deps)
}

export default function InvoiceReports() {
  const [viewType, setViewType] = useState('yearly')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [selectedCustomer, setSelectedCustomer] = useState('')
  const [customers, setCustomers] = useState([])
  const [summary, setSummary] = useState(null)
  const [summaryLoading, setSummaryLoading] = useState(false)
  // Detail list (raw rows)
  const [detail, setDetail] = useState([])
  const [detailLoading, setDetailLoading] = useState(false)
  const [showDetail, setShowDetail] = useState(false)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(25)

  // Chart refs
  const barRef = useRef(null)
  const donutRef = useRef(null)
  const lineRef = useRef(null)
  const topCustRef = useRef(null)
  const reportRef = useRef(null)
  const [pdfLoading, setPdfLoading] = useState(false)

  // Load customers for dropdown
  useEffect(() => {
    api.getCustomers('active').then(d => setCustomers(d || [])).catch(() => {})
    fetchSummary()
  }, [])

  async function fetchSummary() {
    setSummaryLoading(true)
    try {
      const data = await api.getReportPaidSummary(dateFrom, dateTo, selectedCustomer)
      setSummary(data)
    } catch (err) { toast.error('Failed to load report: ' + err.message) }
    setSummaryLoading(false)
  }

  async function fetchDetail() {
    setDetailLoading(true)
    setPage(1)
    try {
      const data = await api.getReportPaidInvoices(dateFrom, dateTo, selectedCustomer)
      setDetail(data || [])
    } catch (err) { toast.error(err.message) }
    setDetailLoading(false)
  }

  function handleGenerate() {
    fetchSummary()
    if (showDetail) fetchDetail()
  }

  // Build bar chart config (yearly or monthly data)
  const barConfig = !summary ? null : (() => {
    const rows = viewType === 'yearly' ? summary.yearly : summary.monthly
    const labels = viewType === 'yearly'
      ? rows.map(r => String(r.year))
      : rows.map(r => `${r.month_name} ${r.year}`)
    return {
      type: 'bar',
      data: {
        labels,
        datasets: [{ label: 'Total Paid ($)', data: rows.map(r => r.total_paid), backgroundColor: 'rgba(37,99,235,0.75)', borderRadius: 4 }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { ticks: { callback: v => '$' + Number(v).toLocaleString() }, grid: { color: '#f1f5f9' } },
          x: { grid: { display: false }, ticks: { maxRotation: 45 } },
        },
      },
    }
  })()

  // Donut — distribution by year
  const donutConfig = !summary ? null : (() => {
    const rows = summary.yearly
    if (!rows.length) return null
    const palette = ['#2563eb','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#06b6d4','#84cc16','#f97316','#6366f1','#14b8a6']
    return {
      type: 'doughnut',
      data: {
        labels: rows.map(r => String(r.year)),
        datasets: [{ data: rows.map(r => r.total_paid), backgroundColor: rows.map((_, i) => palette[i % palette.length]), borderWidth: 2 }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom', labels: { font: { size: 11 } } } },
        cutout: '55%',
      },
    }
  })()

  // Line — payment trend over time
  const lineConfig = !summary ? null : (() => {
    const rows = viewType === 'yearly' ? summary.yearly : summary.monthly
    const labels = viewType === 'yearly'
      ? rows.map(r => String(r.year))
      : rows.map(r => `${r.month_name} ${r.year}`)
    return {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Payment Trend',
          data: rows.map(r => r.total_paid),
          borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.1)',
          tension: 0.4, fill: true, pointRadius: 4, pointBackgroundColor: '#10b981',
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { ticks: { callback: v => '$' + Number(v).toLocaleString() }, grid: { color: '#f1f5f9' } },
          x: { grid: { display: false }, ticks: { maxRotation: 45 } },
        },
      },
    }
  })()

  // Top customers donut
  const topCustConfig = !summary ? null : (() => {
    const rows = summary.top_customers || []
    if (!rows.length) return null
    const palette = ['#2563eb','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#06b6d4','#84cc16','#f97316','#6366f1']
    return {
      type: 'doughnut',
      data: {
        labels: rows.map(r => r.company_name),
        datasets: [{ data: rows.map(r => r.total_paid), backgroundColor: rows.map((_, i) => palette[i % palette.length]), borderWidth: 2 }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom', labels: { font: { size: 10 }, boxWidth: 12 } } },
        cutout: '55%',
      },
    }
  })()

  useChart(barRef, barConfig, [summary, viewType])
  useChart(donutRef, donutConfig, [summary])
  useChart(lineRef, lineConfig, [summary, viewType])
  useChart(topCustRef, topCustConfig, [summary])

  // Build monthly pivot for monthly table view (rows = month labels, cols = years)
  const monthlyPivot = (() => {
    if (!summary) return { years: [], rows: [] }
    const years = [...new Set(summary.monthly.map(r => r.year))].sort((a, b) => a - b)
    const rowMap = {}
    summary.monthly.forEach(r => {
      const key = r.month
      if (!rowMap[key]) rowMap[key] = { month: r.month, month_name: r.month_name, byYear: {} }
      rowMap[key].byYear[r.year] = r
    })
    const rows = Object.values(rowMap).sort((a, b) => a.month - b.month)
    return { years, rows }
  })()

  function csvExport() {
    if (!summary) return
    if (viewType === 'yearly') {
      exportCSV(summary.yearly.map(r => ({ Year: r.year, 'Total Paid ($)': r.total_paid.toFixed(2), 'Total QTY': r.total_qty, 'Total Invoices': r.total_invoices })), 'paid_report_yearly')
    } else {
      const { years, rows } = monthlyPivot
      const csvRows = rows.map(r => {
        const obj = { Month: r.month_name }
        years.forEach(y => {
          obj[`${y} Paid ($)`] = (r.byYear[y]?.total_paid || 0).toFixed(2)
          obj[`${y} Invoices`] = r.byYear[y]?.total_invoices || 0
        })
        return obj
      })
      exportCSV(csvRows, 'paid_report_monthly')
    }
  }

  async function exportPdf() {
    const el = reportRef.current
    if (!el) return
    setPdfLoading(true)
    const dateLabel = dateFrom || dateTo ? `_${dateFrom || ''}_to_${dateTo || ''}` : ''
    const filename = `Paid_Invoice_Report${dateLabel}_${new Date().toISOString().slice(0, 10)}.pdf`
    try {
      await html2pdf().set({
        margin: [8, 8, 8, 8],
        filename,
        image: { type: 'jpeg', quality: 0.95 },
        html2canvas: { scale: 2, useCORS: true, allowTaint: true, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' },
      }).from(el).save()
      toast.success('PDF exported')
    } catch (err) { toast.error('PDF export failed: ' + err.message) }
    setPdfLoading(false)
  }

  const filteredDetail = detail.filter(r => {
    if (!search) return true
    const s = search.toLowerCase()
    return (r.company_name || '').toLowerCase().includes(s) || (r.invoice_number || '').toLowerCase().includes(s) || (r.po_number || '').toLowerCase().includes(s)
  })
  const detailTotals = { qty: filteredDetail.reduce((s, r) => s + (r.total_qty || 0), 0), amount: filteredDetail.reduce((s, r) => s + (r.net_amount || 0), 0) }
  const paginated = filteredDetail.slice((page - 1) * perPage, page * perPage)

  const stats = summary?.stats || {}
  const grandTotal = (arr, field) => arr?.reduce((s, r) => s + (r[field] || 0), 0) || 0

  return (
    <div style={{ width: '100%', overflowX: 'hidden' }}>
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
        <div>
          <nav aria-label="breadcrumb"><ol className="breadcrumb mb-0" style={{ fontSize: 13 }}>
            <li className="breadcrumb-item"><Link to="/dashboard"><i className="bi bi-house-door"></i></Link></li>
            <li className="breadcrumb-item"><Link to="/invoices">Invoices</Link></li>
            <li className="breadcrumb-item active">Paid Report</li>
          </ol></nav>
          <h4 className="mb-0 fw-bold">Invoice Reports — Paid</h4>
        </div>
        <div className="d-flex gap-2">
          <button className="btn btn-sm btn-outline-success" onClick={csvExport} disabled={!summary}><i className="bi bi-filetype-csv me-1"></i>CSV</button>
          <button className="btn btn-sm btn-outline-danger" onClick={exportPdf} disabled={!summary || pdfLoading}>
            {pdfLoading ? <><span className="spinner-border spinner-border-sm me-1" style={{ width: 12, height: 12, borderWidth: 2 }}></span>Exporting…</> : <><i className="bi bi-file-pdf me-1"></i>PDF</>}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card border-0 shadow-sm rounded-4 mb-3">
        <div className="card-body py-2 px-3">
          <div className="d-flex flex-wrap gap-2 align-items-end" style={{ fontSize: 13 }}>
            <div style={{ minWidth: 200, flex: '1 1 200px' }}>
              <label className="fw-semibold d-block mb-1" style={{ fontSize: 12 }}>Customer</label>
              <select className="form-select form-select-sm" style={{ fontSize: 12 }} value={selectedCustomer} onChange={e => setSelectedCustomer(e.target.value)}>
                <option value="">All Customers</option>
                {customers.map(c => <option key={c._id} value={c.legacy_id}>{c.company_name}</option>)}
              </select>
            </div>
            <div>
              <label className="fw-semibold d-block mb-1" style={{ fontSize: 12 }}>From</label>
              <input type="date" className="form-control form-control-sm" style={{ width: 140, fontSize: 12 }} value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
            </div>
            <div>
              <label className="fw-semibold d-block mb-1" style={{ fontSize: 12 }}>To</label>
              <input type="date" className="form-control form-control-sm" style={{ width: 140, fontSize: 12 }} value={dateTo} onChange={e => setDateTo(e.target.value)} />
            </div>
            <div>
              <label className="fw-semibold d-block mb-1" style={{ fontSize: 12 }}>View</label>
              <div className="btn-group btn-group-sm">
                {['yearly', 'monthly'].map(v => (
                  <button key={v} type="button" className={`btn ${viewType === v ? 'btn-primary' : 'btn-outline-secondary'}`} style={{ fontSize: 12 }} onClick={() => setViewType(v)}>
                    {v.charAt(0).toUpperCase() + v.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <div className="align-self-end">
              <button className="btn btn-sm btn-success px-3" onClick={handleGenerate} disabled={summaryLoading}>
                {summaryLoading ? <><span className="spinner-border spinner-border-sm me-1"></span>Loading…</> : <><i className="bi bi-play-fill me-1"></i>Generate</>}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="row g-2 mb-3">
        {[
          { value: summaryLoading ? '…' : fmtMoney(stats.total_paid), label: 'Total Paid', icon: 'bi-currency-dollar', bg: '#ecfdf5', color: '#10b981' },
          { value: summaryLoading ? '…' : (stats.total_invoices || 0), label: 'Total Paid Invoices', icon: 'bi-receipt-cutoff', bg: '#eff6ff', color: '#2563eb' },
          { value: summaryLoading ? '…' : (stats.total_qty || 0).toLocaleString(), label: 'Total Quantity', icon: 'bi-box', bg: '#f5f3ff', color: '#8b5cf6' },
        ].map((s, i) => (
          <div className="col-md-4 col-6" key={i}>
            <div className="stat-card" style={{ padding: '12px 16px' }}>
              <div className="d-flex align-items-center gap-2">
                <div className="stat-icon" style={{ background: s.bg, color: s.color, width: 38, height: 38, fontSize: 17 }}><i className={`bi ${s.icon}`}></i></div>
                <div><div className="stat-value" style={{ fontSize: 17, color: s.color }}>{s.value}</div><div className="stat-label" style={{ fontSize: 11 }}>{s.label}</div></div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {summaryLoading && <div className="text-center py-5"><div className="spinner-border text-primary"></div><p className="mt-2 text-muted">Generating report…</p></div>}

      {!summaryLoading && summary && (<><div ref={reportRef}>

        {/* Charts Row */}
        <div className="row g-3 mb-3">
          <div className="col-md-8">
            <div className="card border-0 shadow-sm rounded-4 h-100">
              <div className="card-body">
                <h6 className="fw-bold mb-3" style={{ fontSize: 13 }}><i className="bi bi-bar-chart me-2 text-primary"></i>Paid Invoice Overview</h6>
                <div style={{ height: 220 }}><canvas ref={barRef}></canvas></div>
              </div>
            </div>
          </div>
          <div className="col-md-4">
            <div className="card border-0 shadow-sm rounded-4 h-100">
              <div className="card-body">
                <h6 className="fw-bold mb-3" style={{ fontSize: 13 }}><i className="bi bi-pie-chart me-2 text-primary"></i>Analytics Overview</h6>
                <div style={{ height: 220 }}><canvas ref={donutRef}></canvas></div>
              </div>
            </div>
          </div>
        </div>
        <div className="row g-3 mb-3">
          <div className="col-md-8">
            <div className="card border-0 shadow-sm rounded-4 h-100">
              <div className="card-body">
                <h6 className="fw-bold mb-3" style={{ fontSize: 13 }}><i className="bi bi-graph-up me-2 text-success"></i>Payment Trend</h6>
                <div style={{ height: 200 }}><canvas ref={lineRef}></canvas></div>
              </div>
            </div>
          </div>
          <div className="col-md-4">
            <div className="card border-0 shadow-sm rounded-4 h-100">
              <div className="card-body">
                <h6 className="fw-bold mb-3" style={{ fontSize: 13 }}><i className="bi bi-people me-2 text-warning"></i>Top 10 Customers</h6>
                <div style={{ height: 200 }}><canvas ref={topCustRef}></canvas></div>
              </div>
            </div>
          </div>
        </div>

        {/* Aggregated Report Table */}
        <div className="card border-0 shadow-sm rounded-4 mb-3" style={{ overflow: 'hidden' }}>
          <div className="card-header border-0 py-2 px-3 d-flex justify-content-between align-items-center" style={{ background: 'linear-gradient(135deg,#06b6d4,#0891b2)', color: '#fff' }}>
            <h6 className="mb-0 fw-bold" style={{ fontSize: 13 }}><i className="bi bi-table me-2"></i>{viewType === 'yearly' ? 'Yearly' : 'Monthly'} Breakdown</h6>
            <button className="btn btn-sm btn-light btn-sm px-2 py-0" style={{ fontSize: 11 }} onClick={csvExport}><i className="bi bi-download me-1"></i>CSV</button>
          </div>
          <div style={{ overflowX: 'auto' }}>
            {viewType === 'yearly' ? (
              <table className="table table-hover align-middle mb-0" style={{ fontSize: 13 }}>
                <thead className="bg-light"><tr>
                  <th className="ps-4">Year</th>
                  <th className="text-end">Total Paid ($)</th>
                  <th className="text-center">Total QTY</th>
                  <th className="text-center">Total Invoices</th>
                </tr></thead>
                <tbody>
                  {summary.yearly.map(r => (
                    <tr key={r.year}>
                      <td className="ps-4 fw-semibold">{r.year}</td>
                      <td className="text-end fw-semibold text-success">{fmtMoney(r.total_paid)}</td>
                      <td className="text-center">{r.total_qty.toLocaleString()}</td>
                      <td className="text-center">{r.total_invoices}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot><tr className="fw-bold bg-light">
                  <td className="ps-4">TOTAL</td>
                  <td className="text-end text-success">{fmtMoney(grandTotal(summary.yearly, 'total_paid'))}</td>
                  <td className="text-center">{grandTotal(summary.yearly, 'total_qty').toLocaleString()}</td>
                  <td className="text-center">{grandTotal(summary.yearly, 'total_invoices')}</td>
                </tr></tfoot>
              </table>
            ) : (
              <table className="table table-hover align-middle mb-0" style={{ fontSize: 12 }}>
                <thead className="bg-light"><tr>
                  <th className="ps-4">Month</th>
                  {monthlyPivot.years.map(y => <React.Fragment key={y}><th className="text-end">{y} Paid ($)</th><th className="text-center">{y} Invoices</th></React.Fragment>)}
                </tr></thead>
                <tbody>
                  {monthlyPivot.rows.map(r => (
                    <tr key={r.month}>
                      <td className="ps-4 fw-semibold">{r.month_name}</td>
                      {monthlyPivot.years.map(y => (
                        <React.Fragment key={y}>
                          <td className="text-end">{r.byYear[y] ? fmtMoney(r.byYear[y].total_paid) : '—'}</td>
                          <td className="text-center">{r.byYear[y]?.total_invoices || '—'}</td>
                        </React.Fragment>
                      ))}
                    </tr>
                  ))}
                </tbody>
                <tfoot><tr className="fw-bold bg-light">
                  <td className="ps-4">TOTAL</td>
                  {monthlyPivot.years.map(y => {
                    const yRows = summary.monthly.filter(r => r.year === y)
                    return <React.Fragment key={y}>
                      <td className="text-end">{fmtMoney(grandTotal(yRows, 'total_paid'))}</td>
                      <td className="text-center">{grandTotal(yRows, 'total_invoices')}</td>
                    </React.Fragment>
                  })}
                </tr></tfoot>
              </table>
            )}
          </div>
        </div>

        {/* Top 10 Customers Table */}
        <div className="card border-0 shadow-sm rounded-4 mb-3" style={{ overflow: 'hidden' }}>
          <div className="card-header border-0 py-2 px-3" style={{ background: 'linear-gradient(135deg,#f59e0b,#d97706)', color: '#fff' }}>
            <h6 className="mb-0 fw-bold" style={{ fontSize: 13 }}><i className="bi bi-trophy me-2"></i>Top 10 Customers</h6>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="table table-hover align-middle mb-0" style={{ fontSize: 13 }}>
              <thead className="bg-light"><tr>
                <th className="ps-4 text-center" style={{ width: 50 }}>#</th>
                <th>Customer Code</th>
                <th>Customer Name</th>
                <th className="text-end">Total Paid ($)</th>
                <th className="text-center">Invoices</th>
              </tr></thead>
              <tbody>
                {(summary.top_customers || []).map((c, i) => (
                  <tr key={i}>
                    <td className="ps-4 text-center"><span className="badge rounded-pill" style={{ background: i < 3 ? '#f59e0b' : '#e2e8f0', color: i < 3 ? '#fff' : '#475569', minWidth: 24 }}>{c.rank}</span></td>
                    <td><span className="badge bg-secondary-subtle text-secondary">{c.company_cust_code || '—'}</span></td>
                    <td className="fw-semibold">{c.company_name}</td>
                    <td className="text-end fw-semibold text-success">{fmtMoney(c.total_paid)}</td>
                    <td className="text-center">{c.total_invoices}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        </div>{/* end reportRef */}

        {/* Detail Invoice List (toggle) */}
        <div className="card border-0 shadow-sm rounded-4" style={{ overflow: 'hidden' }}>
          <div className="card-header border-0 py-2 px-3 d-flex justify-content-between align-items-center" style={{ background: '#f8fafc' }}>
            <h6 className="mb-0 fw-semibold" style={{ fontSize: 13 }}><i className="bi bi-list-ul me-2 text-muted"></i>Invoice Detail List</h6>
            <button className="btn btn-sm btn-outline-secondary" style={{ fontSize: 11 }} onClick={() => { if (!showDetail) { setShowDetail(true); fetchDetail() } else setShowDetail(v => !v) }}>
              {showDetail ? 'Hide' : 'Show'} Detail
            </button>
          </div>
          {showDetail && (
            detailLoading ? <div className="text-center py-4"><div className="spinner-border text-primary spinner-border-sm"></div></div> : (<>
              <div className="px-3 py-2 border-bottom d-flex gap-2 align-items-center flex-wrap" style={{ fontSize: 12 }}>
                <input type="text" className="form-control form-control-sm" style={{ maxWidth: 200, fontSize: 12 }} placeholder="Search…" value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
                <span className="text-muted ms-auto">{filteredDetail.length} records</span>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="table table-hover align-middle mb-0" style={{ fontSize: 12 }}>
                  <thead className="bg-light"><tr>
                    <th className="ps-3">Cust #</th><th>Customer Name</th><th>Date</th>
                    <th>Invoice #</th><th className="text-center">QTY</th><th className="text-end">Amount</th>
                  </tr></thead>
                  <tbody>
                    {paginated.map((r, i) => (
                      <tr key={i}>
                        <td className="ps-3"><span className="badge bg-secondary-subtle text-secondary" style={{ fontSize: 10 }}>{r.company_cust_code || '—'}</span></td>
                        <td className="fw-semibold" style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.company_name || '—'}</td>
                        <td>{fmtDate(r.invoice_date || r.po_date)}</td>
                        <td><span className="badge bg-warning-subtle text-warning">{r.invoice_number || '—'}</span></td>
                        <td className="text-center">{r.total_qty || 0}</td>
                        <td className="text-end fw-semibold">{fmtMoney(r.net_amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot><tr className="fw-bold bg-light">
                    <td className="ps-3" colSpan="4">TOTAL</td>
                    <td className="text-center">{detailTotals.qty.toLocaleString()}</td>
                    <td className="text-end">{fmtMoney(detailTotals.amount)}</td>
                  </tr></tfoot>
                </table>
              </div>
              <div className="card-footer bg-white border-0 py-2">
                <Pagination total={filteredDetail.length} page={page} perPage={perPage} onPageChange={setPage} onPerPageChange={v => { setPerPage(v); setPage(1) }} />
              </div>
            </>)
          )}
        </div>
      </>)}
    </div>
  )
}

