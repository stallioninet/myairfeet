import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import html2pdf from 'html2pdf.js'
import { api } from '../../lib/api'
import Pagination from '../../components/Pagination'

export default function InvoiceReports() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(25)

  useEffect(() => { fetchData() }, [dateFrom, dateTo])

  async function fetchData() {
    setLoading(true)
    setPage(1)
    try {
      const result = await api.getReportPaidInvoices(dateFrom, dateTo)
      setData(result || [])
    } catch (err) { toast.error(err.message) }
    setLoading(false)
  }

  function exportPdf() {
    const el = document.getElementById('report-table-area')
    if (!el) return
    html2pdf().set({
      margin: [10, 10, 10, 10],
      filename: `Invoice_Report_Paid_${new Date().toISOString().slice(0, 10)}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' },
    }).from(el).save().then(() => toast.success('PDF exported'))
  }

  function fmtMoney(v) { return '$' + (parseFloat(v) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }
  function fmtDate(d) { if (!d) return '-'; const dt = new Date(d); if (isNaN(dt)) return '-'; return `${String(dt.getMonth()+1).padStart(2,'0')}/${String(dt.getDate()).padStart(2,'0')}/${dt.getFullYear()}` }

  const filtered = data.filter(r => {
    if (!search) return true
    const s = search.toLowerCase()
    return (r.company_name || '').toLowerCase().includes(s) ||
      (r.invoice_number || '').toLowerCase().includes(s) ||
      (r.po_number || '').toLowerCase().includes(s)
  })

  const totals = {
    qty: filtered.reduce((s, r) => s + (r.total_qty || 0), 0),
    amount: filtered.reduce((s, r) => s + (r.net_amount || 0), 0),
  }

  const paginated = filtered.slice((page - 1) * perPage, page * perPage)

  // Chart: paid amounts by customer (top 15)
  const custTotals = {}
  filtered.forEach(r => {
    const name = r.company_name || 'Unknown'
    custTotals[name] = (custTotals[name] || 0) + (r.net_amount || 0)
  })
  const chartData = Object.entries(custTotals).sort((a, b) => b[1] - a[1]).slice(0, 15)
  const maxPaid = Math.max(...chartData.map(d => d[1]), 1)

  return (
    <div style={{ width: '100%', overflowX: 'hidden' }}>
      <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap">
        <div>
          <nav aria-label="breadcrumb">
            <ol className="breadcrumb mb-0" style={{ fontSize: 13 }}>
              <li className="breadcrumb-item"><Link to="/dashboard"><i className="bi bi-house-door"></i></Link></li>
              <li className="breadcrumb-item"><Link to="/invoices">Invoices</Link></li>
              <li className="breadcrumb-item active">Reports</li>
            </ol>
          </nav>
          <h4 className="mb-0">Invoice Reports - Paid</h4>
        </div>
      </div>

      <div className="row g-2 mb-3">
        {[
          { value: filtered.length, label: 'Records', icon: 'bi-list-ul', bg: '#eff6ff', color: '#2563eb' },
          { value: fmtMoney(totals.amount), label: 'Total Amount', icon: 'bi-currency-dollar', bg: '#ecfdf5', color: '#10b981', raw: true },
          { value: totals.qty, label: 'Total QTY', icon: 'bi-box', bg: '#f5f3ff', color: '#8b5cf6' },
        ].map((stat, i) => (
          <div className="col-md-4 col-6" key={i}>
            <div className="stat-card" style={{ padding: '12px 16px' }}>
              <div className="d-flex align-items-center gap-2">
                <div className="stat-icon" style={{ background: stat.bg, color: stat.color, width: 36, height: 36, fontSize: 16 }}><i className={`bi ${stat.icon}`}></i></div>
                <div><div className="stat-value" style={{ fontSize: 16 }}>{loading ? '-' : stat.value}</div><div className="stat-label" style={{ fontSize: 11 }}>{stat.label}</div></div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="card border-0 shadow-sm rounded-4 mb-3">
        <div className="card-body py-2 px-3">
          <div className="d-flex flex-wrap gap-2 align-items-center" style={{ fontSize: 12 }}>
            <div className="position-relative" style={{ minWidth: 140, flex: '1 1 140px', maxWidth: 200 }}>
              <i className="bi bi-search position-absolute" style={{ left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: 12 }}></i>
              <input type="text" className="form-control form-control-sm ps-4" style={{ fontSize: 12 }} placeholder="Search..." value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
            </div>
            <div className="d-flex align-items-center gap-1">
              <label className="fw-semibold text-nowrap" style={{ fontSize: 12 }}>From:</label>
              <input type="date" className="form-control form-control-sm" style={{ width: 140, fontSize: 12 }} value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
            </div>
            <div className="d-flex align-items-center gap-1">
              <label className="fw-semibold text-nowrap" style={{ fontSize: 12 }}>To:</label>
              <input type="date" className="form-control form-control-sm" style={{ width: 140, fontSize: 12 }} value={dateTo} onChange={e => setDateTo(e.target.value)} />
            </div>
            <div className="ms-auto d-flex align-items-center gap-2">
              <button className="btn btn-sm btn-outline-danger" onClick={exportPdf} title="Export PDF" style={{ fontSize: 12 }}>
                <i className="bi bi-file-pdf me-1"></i>PDF
              </button>
              <span className="text-muted" style={{ fontSize: 11 }}>{filtered.length} records</span>
            </div>
          </div>
        </div>
      </div>

      <div className="card border-0 shadow-sm rounded-4" style={{ overflow: 'hidden' }}>
        <div className="card-header py-2 py-md-3 border-0" style={{ background: 'linear-gradient(135deg, #06b6d4, #0891b2)', color: '#fff' }}>
          <div className="d-flex justify-content-between align-items-center flex-wrap gap-1">
            <h6 className="mb-0 fw-bold"><i className="bi bi-check2-circle me-1"></i>Paid Invoice Report</h6>
            <span className="badge bg-white bg-opacity-25 px-2 py-1" style={{ fontSize: 11 }}>{filtered.length} records</span>
          </div>
        </div>
        <div style={{ overflowX: 'auto' }} id="report-table-area">
          {loading ? (
            <div className="text-center py-5"><div className="spinner-border text-primary"></div><p className="mt-2 text-muted">Loading report...</p></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-5 text-muted"><i className="bi bi-graph-up fs-1 d-block mb-2 opacity-25"></i>No data found</div>
          ) : (<>
            {chartData.length > 0 && (
              <div className="px-3 py-3" style={{ borderBottom: '1px solid #e5e7eb' }}>
                <h6 className="fw-bold mb-3"><i className="bi bi-bar-chart me-2"></i>Paid Amount by Customer</h6>
                <div style={{ overflowX: 'auto' }}>
                  <div className="d-flex gap-3 align-items-end" style={{ minHeight: 180, paddingBottom: 24 }}>
                    {chartData.map(([name, amt], i) => {
                      const pct = Math.max((amt / maxPaid) * 100, 3)
                      return (
                        <div key={i} className="text-center" style={{ flex: '0 0 auto', minWidth: 50 }}>
                          <div style={{ height: 150, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                            <div title={`${name}: ${fmtMoney(amt)}`} style={{
                              width: 30, height: `${pct}%`, background: `hsl(${160 + i * 15}, 60%, 50%)`,
                              borderRadius: '4px 4px 0 0', cursor: 'pointer',
                            }}></div>
                          </div>
                          <div style={{ fontSize: 9, color: '#555', marginTop: 3, maxWidth: 60, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={name}>{name}</div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}

            <table className="table table-hover align-middle mb-0" style={{ fontSize: 13 }}>
              <thead className="bg-light">
                <tr><th className="ps-4">Customer #</th><th>Customer Name</th><th>Date</th><th>Invoice #</th><th className="text-center">QTY</th><th>Payment</th><th>Amount</th></tr>
              </thead>
              <tbody>
                {paginated.map((r, i) => (
                  <tr key={i}>
                    <td className="ps-4"><span className="badge bg-secondary-subtle text-secondary">{r.company_cust_code || '-'}</span></td>
                    <td className="fw-semibold">{r.company_name || '-'}</td>
                    <td>{fmtDate(r.paid_date || r.po_date)}</td>
                    <td><span className="badge bg-warning-subtle text-warning">{r.invoice_number || '-'}</span></td>
                    <td className="text-center">{r.total_qty || 0}</td>
                    <td>{r.credit_card_notes || '-'}</td>
                    <td className="fw-semibold">{fmtMoney(r.net_amount)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot><tr className="fw-bold bg-light"><td className="ps-4" colSpan="4">TOTAL</td><td className="text-center">{totals.qty}</td><td></td><td>{fmtMoney(totals.amount)}</td></tr></tfoot>
            </table>
          </>)}
        </div>
        {filtered.length > 0 && (
          <div className="card-footer bg-white border-0 py-2" style={{ overflowX: 'auto' }}>
            <Pagination total={filtered.length} page={page} perPage={perPage}
              onPageChange={setPage} onPerPageChange={v => { setPerPage(v); setPage(1) }} />
          </div>
        )}
      </div>
    </div>
  )
}
