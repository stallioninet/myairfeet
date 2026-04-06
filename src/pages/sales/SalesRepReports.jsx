import React, { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import html2pdf from 'html2pdf.js'
import { api } from '../../lib/api'
import Pagination from '../../components/Pagination'

const TABS = [
  { key: 'rep-month', label: 'Monthly', icon: 'bi-people' },
  { key: 'rep-year', label: 'Yearly', icon: 'bi-person-badge' },
]

export default function SalesRepReports() {
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = searchParams.get('tab') || 'rep-month'
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [years, setYears] = useState([])
  const [filterYear, setFilterYear] = useState(String(new Date().getFullYear()))
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(25)
  const [customers, setCustomers] = useState([])
  const [filterCustomer, setFilterCustomer] = useState('')
  const [filterRep, setFilterRep] = useState('')
  const [filterMonth, setFilterMonth] = useState('')
  const [filterOrderBy, setFilterOrderBy] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterCommission, setFilterCommission] = useState('')
  const [reps, setReps] = useState([])

  useEffect(() => {
    api.getReportYears().then(y => setYears(y || [])).catch(() => {})
    api.getInvoiceCustomers().then(c => setCustomers(c || [])).catch(() => {})
    api.getCommissionReps().then(r => setReps(r || [])).catch(() => {})
  }, [])
  useEffect(() => { fetchData() }, [tab, filterYear])

  async function fetchData() {
    setLoading(true)
    setPage(1)
    try {
      let result
      if (tab === 'rep-month') result = await api.getReportSalesRepMonth(filterYear)
      else if (tab === 'rep-year') result = await api.getReportSalesRepYear()
      setData(result || [])
    } catch (err) { toast.error(err.message) }
    setLoading(false)
  }

  function setTab(t) { setSearchParams({ tab: t }); setSearch(''); setPage(1) }

  function exportPdf() {
    const el = document.getElementById('report-table-area')
    if (!el) return
    html2pdf().set({
      margin: [10, 10, 10, 10],
      filename: `SalesRep_Report_${tab}_${new Date().toISOString().slice(0, 10)}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' },
    }).from(el).save().then(() => toast.success('PDF exported'))
  }

  function fmtMoney(v) { return '$' + (parseFloat(v) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }

  const filtered = data.filter(r => {
    if (filterCustomer && String(r.company_id) !== String(filterCustomer)) return false
    if (filterRep && String(r.rep_id) !== String(filterRep)) return false
    if (filterMonth && String(r.month) !== String(filterMonth)) return false
    if (!search) return true
    const s = search.toLowerCase()
    return (r.company_name || '').toLowerCase().includes(s) ||
      (r.rep_name || '').toLowerCase().includes(s) ||
      (r.invoice_number || '').toLowerCase().includes(s) ||
      (r.po_number || '').toLowerCase().includes(s)
  })

  const totals = {
    qty: filtered.reduce((s, r) => s + (r.total_qty || 0), 0),
    sales: filtered.reduce((s, r) => s + (r.total_sales || 0), 0),
    po: filtered.reduce((s, r) => s + (r.total_po || 0), 0),
    comm: filtered.reduce((s, r) => s + (r.total_commission || r.commission || 0), 0),
  }

  const sorted = [...filtered]
  if (filterOrderBy) {
    if (filterOrderBy === 'company') sorted.sort((a, b) => (a.company_name || '').localeCompare(b.company_name || ''))
    else if (filterOrderBy === 'rep') sorted.sort((a, b) => (a.rep_name || '').localeCompare(b.rep_name || ''))
  }

  const paginated = sorted.slice((page - 1) * perPage, page * perPage)

  function renderRepMonthTable() {
    const chartMonths = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
    const repNames = [...new Set(filtered.map(r => r.rep_name))]
    const repMonthComm = {}
    filtered.forEach(r => {
      if (!repMonthComm[r.rep_name]) repMonthComm[r.rep_name] = {}
      const mKey = r.month
      repMonthComm[r.rep_name][mKey] = (repMonthComm[r.rep_name][mKey] || 0) + (r.commission || 0)
    })
    const maxComm = Math.max(...Object.values(repMonthComm).flatMap(r => Object.values(r)), 1)
    const chartColors = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16']

    return (<>
      {repNames.length > 0 && (
        <div className="px-3 py-3" style={{ borderBottom: '1px solid #e5e7eb' }}>
          <h6 className="fw-bold mb-3"><i className="bi bi-bar-chart me-2"></i>Commission by Rep & Month</h6>
          <div style={{ overflowX: 'auto' }}>
            <div className="d-flex gap-2 align-items-end" style={{ minHeight: 180, paddingBottom: 24 }}>
              {chartMonths.map((mName, mIdx) => (
                <div key={mIdx} className="text-center" style={{ flex: '0 0 auto', minWidth: 50 }}>
                  <div className="d-flex gap-1 align-items-end justify-content-center" style={{ height: 150 }}>
                    {repNames.map((rn, ri) => {
                      const val = repMonthComm[rn]?.[mIdx + 1] || 0
                      const pct = Math.max((val / maxComm) * 100, 2)
                      return (
                        <div key={rn} title={`${rn} - ${mName}: ${fmtMoney(val)}`} style={{
                          width: Math.max(10, Math.min(18, 80 / repNames.length)), height: val > 0 ? `${pct}%` : '2px',
                          background: chartColors[ri % chartColors.length], borderRadius: '2px 2px 0 0', cursor: 'pointer',
                        }}></div>
                      )
                    })}
                  </div>
                  <div style={{ fontSize: 10, color: '#555', marginTop: 3 }}>{mName}</div>
                </div>
              ))}
            </div>
            <div className="d-flex gap-3 mt-1 flex-wrap">
              {repNames.map((rn, i) => (
                <div key={rn} className="d-flex align-items-center gap-1" style={{ fontSize: 11 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 2, background: chartColors[i % chartColors.length] }}></div>
                  <span>{rn}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <table className="table table-hover align-middle mb-0" style={{ fontSize: 13 }}>
        <thead className="bg-light">
          <tr><th className="ps-4">Sales Rep</th><th>Customer</th><th>Month</th><th>Invoice #</th><th className="text-center">QTY</th><th>Sales</th><th>Commission</th></tr>
        </thead>
        <tbody>
          {paginated.map((r, i) => (
            <tr key={i}>
              <td className="ps-4"><span className="fw-semibold">{r.rep_name}</span> <span className="text-muted small">({r.rep_code})</span></td>
              <td>{r.company_name || '-'}</td>
              <td><span className="badge bg-info-subtle text-info">{r.month_name} {r.year}</span></td>
              <td><span className="badge bg-warning-subtle text-warning">{r.invoice_number || '-'}</span></td>
              <td className="text-center">{r.total_qty}</td>
              <td className="fw-semibold">{fmtMoney(r.total_sales)}</td>
              <td style={{ color: '#10b981', fontWeight: 600 }}>{fmtMoney(r.commission)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot><tr className="fw-bold bg-light"><td className="ps-4">TOTAL</td><td></td><td></td><td></td><td className="text-center">{totals.qty}</td><td>{fmtMoney(totals.sales)}</td><td style={{ color: '#10b981' }}>{fmtMoney(totals.comm)}</td></tr></tfoot>
      </table>
    </>)
  }

  function renderRepYearTable() {
    const repCommData = {}
    const repSalesData = {}
    const chartYears = [...new Set(filtered.map(r => r.year))].sort()
    filtered.forEach(r => {
      if (!repCommData[r.rep_name]) { repCommData[r.rep_name] = { years: {} }; repSalesData[r.rep_name] = { years: {} } }
      repCommData[r.rep_name].years[r.year] = (repCommData[r.rep_name].years[r.year] || 0) + (r.total_commission || 0)
      repSalesData[r.rep_name].years[r.year] = (repSalesData[r.rep_name].years[r.year] || 0) + (r.total_sales || 0)
    })
    const maxComm = Math.max(...Object.values(repCommData).flatMap(r => Object.values(r.years)), 1)
    const maxSales = Math.max(...Object.values(repSalesData).flatMap(r => Object.values(r.years)), 1)
    const chartColors = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16']

    return (<>
      {Object.keys(repCommData).length > 0 && (
        <div className="px-3 py-3" style={{ borderBottom: '1px solid #e5e7eb' }}>
          <h6 className="fw-bold mb-3"><i className="bi bi-bar-chart me-2"></i>Year Commission Chart</h6>
          <div style={{ overflowX: 'auto' }}>
            <div className="d-flex gap-4 align-items-end" style={{ minHeight: 220, paddingBottom: 30, minWidth: Object.keys(repCommData).length * 120 }}>
              {Object.entries(repCommData).map(([repName, data], ri) => (
                <div key={ri} className="text-center" style={{ flex: '0 0 auto', minWidth: 80 }}>
                  <div className="d-flex gap-1 align-items-end justify-content-center" style={{ height: 180 }}>
                    {chartYears.map((y, yi) => {
                      const commVal = data.years[y] || 0
                      const salesVal = repSalesData[repName]?.years[y] || 0
                      const pct = Math.max((commVal / maxComm) * 100, 2)
                      return (
                        <div key={y} title={`${repName} ${y}\nCommission: ${fmtMoney(commVal)}\nSales: ${fmtMoney(salesVal)}`} style={{
                          width: 20, height: `${pct}%`, background: chartColors[yi % chartColors.length],
                          borderRadius: '3px 3px 0 0', cursor: 'pointer', transition: 'height 0.3s', position: 'relative',
                        }}>
                          {pct > 20 && <span style={{ position: 'absolute', top: 2, left: '50%', transform: 'translateX(-50%)', fontSize: 7, color: '#fff', whiteSpace: 'nowrap' }}>{fmtMoney(commVal).replace('$', '')}</span>}
                        </div>
                      )
                    })}
                  </div>
                  <div style={{ fontSize: 10, color: '#555', marginTop: 4, maxWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={repName}>{repName}</div>
                </div>
              ))}
            </div>
            <div className="d-flex gap-3 mt-2 flex-wrap">
              {chartYears.map((y, i) => (
                <div key={y} className="d-flex align-items-center gap-1" style={{ fontSize: 11 }}>
                  <div style={{ width: 12, height: 12, borderRadius: 2, background: chartColors[i % chartColors.length] }}></div>
                  <span>{y}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {Object.keys(repSalesData).length > 0 && (
        <div className="px-3 py-3" style={{ borderBottom: '1px solid #e5e7eb' }}>
          <h6 className="fw-bold mb-3"><i className="bi bi-graph-up me-2"></i>Year Sales Chart</h6>
          <div style={{ overflowX: 'auto' }}>
            <div className="d-flex gap-4 align-items-end" style={{ minHeight: 220, paddingBottom: 30, minWidth: Object.keys(repSalesData).length * 120 }}>
              {Object.entries(repSalesData).map(([repName, data], ri) => (
                <div key={ri} className="text-center" style={{ flex: '0 0 auto', minWidth: 80 }}>
                  <div className="d-flex gap-1 align-items-end justify-content-center" style={{ height: 180 }}>
                    {chartYears.map((y, yi) => {
                      const val = data.years[y] || 0
                      const pct = Math.max((val / maxSales) * 100, 2)
                      return (
                        <div key={y} title={`${repName} ${y}: ${fmtMoney(val)}`} style={{
                          width: 20, height: `${pct}%`, background: chartColors[yi % chartColors.length],
                          borderRadius: '3px 3px 0 0', cursor: 'pointer', transition: 'height 0.3s',
                        }} />
                      )
                    })}
                  </div>
                  <div style={{ fontSize: 10, color: '#555', marginTop: 4, maxWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={repName}>{repName}</div>
                </div>
              ))}
            </div>
            <div className="d-flex gap-3 mt-2 flex-wrap">
              {chartYears.map((y, i) => (
                <div key={y} className="d-flex align-items-center gap-1" style={{ fontSize: 11 }}>
                  <div style={{ width: 12, height: 12, borderRadius: 2, background: chartColors[i % chartColors.length] }}></div>
                  <span>{y}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <table className="table table-hover align-middle mb-0" style={{ fontSize: 13 }}>
        <thead className="bg-light">
          <tr><th className="ps-4">Sales Rep</th><th>Year</th><th className="text-center">QTY</th><th>Total Sales</th><th>Commission</th><th className="text-center">PO Count</th></tr>
        </thead>
        <tbody>
          {paginated.map((r, i) => (
            <tr key={i}>
              <td className="ps-4"><span className="fw-semibold">{r.rep_name}</span> <span className="text-muted small">({r.rep_code})</span></td>
              <td><span className="badge bg-primary-subtle text-primary">{r.year}</span></td>
              <td className="text-center">{r.total_qty}</td>
              <td className="fw-semibold">{fmtMoney(r.total_sales)}</td>
              <td style={{ color: '#10b981', fontWeight: 600 }}>{fmtMoney(r.total_commission)}</td>
              <td className="text-center">{r.total_po}</td>
            </tr>
          ))}
        </tbody>
        <tfoot><tr className="fw-bold bg-light"><td className="ps-4">TOTAL</td><td></td><td className="text-center">{totals.qty}</td><td>{fmtMoney(totals.sales)}</td><td style={{ color: '#10b981' }}>{fmtMoney(totals.comm)}</td><td className="text-center">{totals.po}</td></tr></tfoot>
      </table>
    </>)
  }

  const gradients = {
    'rep-month': 'linear-gradient(135deg, #10b981, #059669)',
    'rep-year': 'linear-gradient(135deg, #f59e0b, #d97706)',
  }

  return (
    <div style={{ width: '100%', overflowX: 'hidden' }}>
      <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap">
        <div>
          <nav aria-label="breadcrumb">
            <ol className="breadcrumb mb-0" style={{ fontSize: 13 }}>
              <li className="breadcrumb-item"><Link to="/dashboard"><i className="bi bi-house-door"></i></Link></li>
              <li className="breadcrumb-item"><Link to="/sales-reps/active">Sales Reps</Link></li>
              <li className="breadcrumb-item active">Reports</li>
            </ol>
          </nav>
          <h4 className="mb-0">Sales Rep Reports</h4>
        </div>
      </div>

      <div className="row g-2 mb-3">
        {[
          { value: filtered.length, label: 'Records', icon: 'bi-list-ul', bg: '#eff6ff', color: '#2563eb' },
          { value: fmtMoney(totals.sales), label: 'Total Sales', icon: 'bi-currency-dollar', bg: '#ecfdf5', color: '#10b981', raw: true },
          { value: totals.qty, label: 'Total QTY', icon: 'bi-box', bg: '#f5f3ff', color: '#8b5cf6' },
          { value: fmtMoney(totals.comm), label: 'Commission', icon: 'bi-cash', bg: '#fff7ed', color: '#f59e0b', raw: true },
        ].map((stat, i) => (
          <div className="col-md-3 col-6" key={i}>
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
          <div className="d-flex flex-wrap gap-1 mb-2 pb-2" style={{ borderBottom: '1px solid #e5e7eb' }}>
            {TABS.map(t => (
              <button key={t.key} className={`btn btn-sm px-3 ${tab === t.key ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={() => setTab(t.key)}>
                <i className={`bi ${t.icon} me-1`}></i>{t.label}
              </button>
            ))}
          </div>
          <div className="d-flex flex-wrap gap-2 align-items-center" style={{ fontSize: 12 }}>
            <div className="position-relative" style={{ minWidth: 140, flex: '1 1 140px', maxWidth: 200 }}>
              <i className="bi bi-search position-absolute" style={{ left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: 12 }}></i>
              <input type="text" className="form-control form-control-sm ps-4" style={{ fontSize: 12 }} placeholder="Search..." value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
            </div>
            <div>
              <select className="form-select form-select-sm" style={{ fontSize: 12, minWidth: 100 }} value={filterCustomer} onChange={e => { setFilterCustomer(e.target.value); setPage(1) }}>
                <option value="">All Customers</option>
                {customers.map(c => <option key={c._id} value={c.legacy_id}>{c.company_name}</option>)}
              </select>
            </div>
            <div>
              <select className="form-select form-select-sm" value={filterRep} onChange={e => { setFilterRep(e.target.value); setPage(1) }}>
                <option value="">All Reps</option>
                {reps.map(r => <option key={r._id} value={r.legacy_id}>{r.first_name} {r.last_name}</option>)}
              </select>
            </div>
            {tab === 'rep-month' && (
              <div>
                <select className="form-select form-select-sm" value={filterYear} onChange={e => setFilterYear(e.target.value)}>
                  <option value="">All Years</option>
                  {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            )}
            {tab === 'rep-month' && (
              <div>
                <select className="form-select form-select-sm" value={filterMonth} onChange={e => { setFilterMonth(e.target.value); setPage(1) }}>
                  <option value="">All Months</option>
                  {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                </select>
              </div>
            )}
            <div className="d-flex align-items-center gap-1 flex-wrap" style={{ fontSize: 11 }}>
              <span className="fw-semibold text-nowrap">Order:</span>
              <div className="form-check form-check-inline mb-0"><input className="form-check-input" type="radio" name="orderBy" value="" checked={filterOrderBy === ''} onChange={() => setFilterOrderBy('')} style={{ width: 14, height: 14 }} /><label className="form-check-label">Default</label></div>
              <div className="form-check form-check-inline mb-0"><input className="form-check-input" type="radio" name="orderBy" value="company" checked={filterOrderBy === 'company'} onChange={() => setFilterOrderBy('company')} style={{ width: 14, height: 14 }} /><label className="form-check-label">Customer</label></div>
              <div className="form-check form-check-inline mb-0"><input className="form-check-input" type="radio" name="orderBy" value="rep" checked={filterOrderBy === 'rep'} onChange={() => setFilterOrderBy('rep')} style={{ width: 14, height: 14 }} /><label className="form-check-label">Rep</label></div>
            </div>
            <div className="col-md-auto d-flex align-items-center gap-2" style={{ fontSize: 12 }}>
              <span className="fw-semibold text-nowrap">Status:</span>
              <select className="form-select form-select-sm" style={{ width: 100 }} value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1) }}>
                <option value="">Both</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="pilot">Pilot</option>
              </select>
            </div>
            <div className="col-md-auto d-flex align-items-center gap-2" style={{ fontSize: 12 }}>
              <span className="fw-semibold text-nowrap">Comm:</span>
              <select className="form-select form-select-sm" style={{ width: 110 }} value={filterCommission} onChange={e => { setFilterCommission(e.target.value); setPage(1) }}>
                <option value="">Both</option>
                <option value="paid">Paid</option>
                <option value="unpaid">Unpaid</option>
              </select>
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
        <div className="card-header py-2 py-md-3 border-0" style={{ background: gradients[tab], color: '#fff' }}>
          <div className="d-flex justify-content-between align-items-center flex-wrap gap-1">
            <h6 className="mb-0 fw-bold"><i className={`bi ${TABS.find(t => t.key === tab)?.icon} me-1`}></i>{TABS.find(t => t.key === tab)?.label} Report</h6>
            <span className="badge bg-white bg-opacity-25 px-2 py-1" style={{ fontSize: 11 }}>{filtered.length} records</span>
          </div>
        </div>
        <div style={{ overflowX: 'auto' }} id="report-table-area">
          {loading ? (
            <div className="text-center py-5"><div className="spinner-border text-primary"></div><p className="mt-2 text-muted">Loading report...</p></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-5 text-muted"><i className="bi bi-graph-up fs-1 d-block mb-2 opacity-25"></i>No data found</div>
          ) : tab === 'rep-month' ? renderRepMonthTable() : renderRepYearTable()}
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
