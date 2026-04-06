import React, { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import html2pdf from 'html2pdf.js'
import { api } from '../../lib/api'
import Pagination from '../../components/Pagination'

const TABS = [
  { key: 'year', label: 'Yearly', icon: 'bi-calendar3' },
  { key: 'month', label: 'Monthly', icon: 'bi-calendar-month' },
]

export default function CustomerReports() {
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = searchParams.get('tab') || 'year'
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [years, setYears] = useState([])
  const [filterYear, setFilterYear] = useState(String(new Date().getFullYear()))
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(25)
  const [customers, setCustomers] = useState([])
  const [filterCustomer, setFilterCustomer] = useState('')
  const [salesRange, setSalesRange] = useState('all')
  const [customerTypes, setCustomerTypes] = useState([])
  const [filterIndustry, setFilterIndustry] = useState('')
  const [topCount, setTopCount] = useState('')
  const [topYear, setTopYear] = useState('')
  const [selectedYears, setSelectedYears] = useState([])
  const [filterMonth, setFilterMonth] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  useEffect(() => {
    api.getReportYears().then(y => setYears(y || [])).catch(() => {})
    api.getInvoiceCustomers().then(c => setCustomers(c || [])).catch(() => {})
    api.getCustomerTypes().then(t => setCustomerTypes(t || [])).catch(() => {})
  }, [])
  useEffect(() => { fetchData() }, [tab, filterYear])

  async function fetchData() {
    setLoading(true)
    setPage(1)
    try {
      let result
      if (tab === 'year') result = await api.getReportYear()
      else if (tab === 'month') result = await api.getReportMonth(filterYear)
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
      filename: `Customer_Report_${tab}_${new Date().toISOString().slice(0, 10)}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' },
    }).from(el).save().then(() => toast.success('PDF exported'))
  }

  function fmtMoney(v) { return '$' + (parseFloat(v) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }

  const filtered = data.filter(r => {
    if (filterCustomer && String(r.company_id) !== String(filterCustomer)) return false
    if (tab === 'year' && salesRange !== 'all') {
      const sales = (r.total_sales || 0) / 1000
      const ranges = { '1': [0, 1], '2': [1, 5], '3': [5, 10], '4': [10, 25], '5': [25, 50], '6': [50, 100], '7': [100, Infinity] }
      const [min, max] = ranges[salesRange] || [0, Infinity]
      if (sales < min || sales >= max) return false
    }
    if (filterMonth && String(r.month) !== String(filterMonth)) return false
    if (!search) return true
    const s = search.toLowerCase()
    return (r.company_name || '').toLowerCase().includes(s) ||
      (r.invoice_number || '').toLowerCase().includes(s) ||
      (r.po_number || '').toLowerCase().includes(s)
  })

  const totals = {
    qty: filtered.reduce((s, r) => s + (r.total_qty || 0), 0),
    sales: filtered.reduce((s, r) => s + (r.total_sales || r.net_amount || 0), 0),
    comm: filtered.reduce((s, r) => s + (r.total_commission || r.commission || 0), 0),
  }

  const paginated = filtered.slice((page - 1) * perPage, page * perPage)

  function renderYearTable() {
    let yearSet = [...new Set(filtered.map(r => r.year))].sort()
    if (selectedYears.length > 0) yearSet = yearSet.filter(y => selectedYears.includes(y))
    const custMap = {}
    filtered.forEach(r => {
      if (!custMap[r.company_id]) custMap[r.company_id] = { company_name: r.company_name, company_id: r.company_id, company_cust_code: r.company_cust_code || '', years: {}, total: 0 }
      custMap[r.company_id].years[r.year] = (custMap[r.company_id].years[r.year] || 0) + (r.total_sales || 0)
      custMap[r.company_id].total += (r.total_sales || 0)
    })
    let rows = Object.values(custMap)
    if (topCount) {
      const n = parseInt(topCount)
      if (topYear) {
        rows.sort((a, b) => (b.years[parseInt(topYear)] || 0) - (a.years[parseInt(topYear)] || 0))
      } else {
        rows.sort((a, b) => b.total - a.total)
      }
      rows = rows.slice(0, n)
    } else {
      rows.sort((a, b) => b.total - a.total)
    }
    const paginatedRows = rows.slice((page - 1) * perPage, page * perPage)
    const yearTotals = {}
    yearSet.forEach(y => { yearTotals[y] = rows.reduce((s, r) => s + (r.years[y] || 0), 0) })
    const grandTotal = rows.reduce((s, r) => s + r.total, 0)

    return (<>
      <div className="d-flex justify-content-between align-items-center px-3 py-2 bg-light border-bottom">
        <h6 className="mb-0 fw-bold">YEAR ON YEAR - INVOICE</h6>
        <div className="d-flex gap-1">
          <button className="btn btn-sm px-3" style={{ background: '#5bc0de', color: '#fff' }} onClick={exportPdf}>Export</button>
          <button className="btn btn-sm px-3" style={{ background: '#5bc0de', color: '#fff' }} onClick={() => { setSelectedYears([]); setPage(1) }}>FY</button>
          <button className="btn btn-sm px-3" style={{ background: '#f0ad4e', color: '#fff' }} onClick={() => { const cy = new Date().getFullYear(); setSelectedYears([cy]); setPage(1) }}>YTD</button>
          <button className="btn btn-sm px-3" style={{ background: '#d9534f', color: '#fff' }} onClick={exportPdf}>PDF</button>
        </div>
      </div>
      {rows.length > 0 && (
        <div className="px-3 py-3" style={{ borderBottom: '1px solid #e5e7eb' }}>
          <h6 className="fw-bold mb-3"><i className="bi bi-bar-chart me-2"></i>Top Customers by Sales</h6>
          <div style={{ overflowX: 'auto' }}>
            {(() => {
              const chartRows = rows.slice(0, 15)
              const maxVal = Math.max(...chartRows.map(r => r.total), 1)
              return (
                <div className="d-flex gap-3 align-items-end" style={{ minHeight: 180, paddingBottom: 24 }}>
                  {chartRows.map((r, i) => {
                    const pct = Math.max((r.total / maxVal) * 100, 3)
                    return (
                      <div key={i} className="text-center" style={{ flex: '0 0 auto', minWidth: 50 }}>
                        <div style={{ height: 150, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                          <div title={`${r.company_name}: ${fmtMoney(r.total)}`} style={{
                            width: 30, height: `${pct}%`, background: `hsl(${i * 25}, 65%, 55%)`,
                            borderRadius: '4px 4px 0 0', cursor: 'pointer', transition: 'height 0.3s',
                          }}></div>
                        </div>
                        <div style={{ fontSize: 9, color: '#555', marginTop: 3, maxWidth: 60, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.company_name}>{r.company_name}</div>
                      </div>
                    )
                  })}
                </div>
              )
            })()}
          </div>
        </div>
      )}
      <div style={{ overflowX: 'auto', maxWidth: '100%' }}>
        <table className="table table-hover table-bordered align-middle mb-0" style={{ fontSize: 12, minWidth: yearSet.length * 100 + 300 }}>
          <thead className="bg-light">
            <tr>
              <th className="ps-3" style={{ minWidth: 90, position: 'sticky', left: 0, background: '#f8f9fa', zIndex: 2 }}>Customer #</th>
              <th style={{ minWidth: 180, position: 'sticky', left: 90, background: '#f8f9fa', zIndex: 2 }}>Customer Name</th>
              {yearSet.map(y => <th key={y} className="text-end" style={{ minWidth: 95 }}>{y}</th>)}
              <th className="text-end fw-bold" style={{ minWidth: 100 }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {paginatedRows.map((r, i) => (
              <tr key={i}>
                <td className="ps-3" style={{ position: 'sticky', left: 0, background: '#fff', zIndex: 1 }}><span className="badge bg-secondary-subtle text-secondary">{r.company_cust_code || r.company_id}</span></td>
                <td className="fw-semibold" style={{ position: 'sticky', left: 90, background: '#fff', zIndex: 1 }}>{r.company_name || '-'}</td>
                {yearSet.map(y => <td key={y} className="text-end">{r.years[y] ? fmtMoney(r.years[y]) : '-'}</td>)}
                <td className="text-end fw-bold">{fmtMoney(r.total)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="fw-bold" style={{ background: '#e8f5e9' }}>
              <td className="ps-3" style={{ position: 'sticky', left: 0, background: '#e8f5e9', zIndex: 1 }}>TOTAL</td>
              <td style={{ position: 'sticky', left: 90, background: '#e8f5e9', zIndex: 1 }}></td>
              {yearSet.map(y => <td key={y} className="text-end">{fmtMoney(yearTotals[y])}</td>)}
              <td className="text-end">{fmtMoney(grandTotal)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      {rows.length > perPage && (
        <div className="p-3"><Pagination total={rows.length} page={page} perPage={perPage} onPageChange={setPage} onPerPageChange={v => { setPerPage(v); setPage(1) }} /></div>
      )}
    </>)
  }

  function renderMonthTable() {
    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
    const yearSet = [...new Set(filtered.map(r => r.year))].sort()
    const custGroups = {}
    filtered.forEach(r => {
      if (!custGroups[r.company_id]) custGroups[r.company_id] = { company_name: r.company_name, data: {} }
      const key = `${r.year}_${r.month}`
      if (!custGroups[r.company_id].data[key]) custGroups[r.company_id].data[key] = { qty: 0, sales: 0, comm: 0 }
      custGroups[r.company_id].data[key].qty += r.total_qty || 0
      custGroups[r.company_id].data[key].sales += r.total_sales || 0
    })
    const custList = Object.entries(custGroups)
    const chartColors = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16']

    return (<>
      <div className="d-flex justify-content-between align-items-center px-3 py-2 bg-light border-bottom">
        <h6 className="mb-0 fw-bold">MONTH ON MONTH</h6>
        <div className="d-flex gap-1">
          <button className="btn btn-sm px-3 btn-outline-info" onClick={exportPdf}>PDF</button>
          <button className="btn btn-sm px-3 btn-outline-info" onClick={exportPdf}>XLS</button>
        </div>
      </div>

      {custList.length > 0 && (() => {
        const chartYearSet = [...new Set(filtered.map(r => r.year))].sort()
        const monthTotals = {}
        filtered.forEach(r => {
          const key = `${r.year}_${r.month}`
          monthTotals[key] = (monthTotals[key] || 0) + (r.total_sales || 0)
        })
        const maxVal = Math.max(...Object.values(monthTotals), 1)
        return (
          <div className="px-3 py-3" style={{ borderBottom: '1px solid #e5e7eb' }}>
            <h6 className="fw-bold mb-3"><i className="bi bi-bar-chart me-2"></i>Monthly Sales Overview</h6>
            <div style={{ overflowX: 'auto' }}>
              <div className="d-flex gap-2 align-items-end" style={{ minHeight: 180, paddingBottom: 24 }}>
                {monthNames.map((mName, mIdx) => (
                  <div key={mIdx} className="text-center" style={{ flex: '0 0 auto', minWidth: 50 }}>
                    <div className="d-flex gap-1 align-items-end justify-content-center" style={{ height: 150 }}>
                      {chartYearSet.map((y, yi) => {
                        const val = monthTotals[`${y}_${mIdx + 1}`] || 0
                        const pct = Math.max((val / maxVal) * 100, 2)
                        return (
                          <div key={y} title={`${mName} ${y}: ${fmtMoney(val)}`} style={{
                            width: 14, height: `${pct}%`, background: chartColors[yi % chartColors.length],
                            borderRadius: '2px 2px 0 0', cursor: 'pointer', transition: 'height 0.3s',
                          }}></div>
                        )
                      })}
                    </div>
                    <div style={{ fontSize: 10, color: '#555', marginTop: 3 }}>{mName}</div>
                  </div>
                ))}
              </div>
              <div className="d-flex gap-3 mt-1 flex-wrap">
                {chartYearSet.map((y, i) => (
                  <div key={y} className="d-flex align-items-center gap-1" style={{ fontSize: 11 }}>
                    <div style={{ width: 10, height: 10, borderRadius: 2, background: chartColors[i % chartColors.length] }}></div>
                    <span>{y}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )
      })()}

      {custList.length === 0 ? (
        <div className="text-center py-4 text-muted">No data found</div>
      ) : custList.map(([cid, cust]) => (
        <div key={cid} className="mb-4">
          <div className="px-3 py-2 fw-bold" style={{ fontSize: 14 }}>Customer: <span className="text-primary">{cust.company_name || '-'}</span></div>
          <div style={{ overflowX: 'auto' }}>
            <table className="table table-bordered table-sm mb-0" style={{ fontSize: 12, minWidth: yearSet.length * 280 + 80 }}>
              <thead>
                <tr className="bg-light">
                  <th rowSpan="2" style={{ position: 'sticky', left: 0, background: '#f8f9fa', zIndex: 2, minWidth: 70, verticalAlign: 'middle' }}>Month</th>
                  {yearSet.map(y => <th key={y} colSpan="3" className="text-center">{y}</th>)}
                </tr>
                <tr className="bg-light">
                  {yearSet.map(y => (
                    <React.Fragment key={y}>
                      <th className="text-center" style={{ minWidth: 70 }}>Total Qty</th>
                      <th className="text-center" style={{ minWidth: 90 }}>Total Sales</th>
                      <th className="text-center" style={{ minWidth: 90 }}>Total Commission</th>
                    </React.Fragment>
                  ))}
                </tr>
              </thead>
              <tbody>
                {monthNames.map((mName, mIdx) => (
                  <tr key={mIdx}>
                    <td style={{ position: 'sticky', left: 0, background: '#fff', zIndex: 1, fontWeight: 600 }}>{mName}</td>
                    {yearSet.map(y => {
                      const d = cust.data[`${y}_${mIdx + 1}`]
                      return (
                        <React.Fragment key={y}>
                          <td className="text-center">{d?.qty || 0}</td>
                          <td className="text-end">{d?.sales ? fmtMoney(d.sales) : '$0.00'}</td>
                          <td className="text-end">{d?.comm ? fmtMoney(d.comm) : '$0.00'}</td>
                        </React.Fragment>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="fw-bold" style={{ background: '#e8f5e9' }}>
                  <td style={{ position: 'sticky', left: 0, background: '#e8f5e9', zIndex: 1 }}>TOTAL</td>
                  {yearSet.map(y => {
                    let tQty = 0, tSales = 0, tComm = 0
                    monthNames.forEach((_, mIdx) => {
                      const d = cust.data[`${y}_${mIdx + 1}`]
                      if (d) { tQty += d.qty; tSales += d.sales; tComm += d.comm }
                    })
                    return (
                      <React.Fragment key={y}>
                        <td className="text-center">{tQty}</td>
                        <td className="text-end">{fmtMoney(tSales)}</td>
                        <td className="text-end">{fmtMoney(tComm)}</td>
                      </React.Fragment>
                    )
                  })}
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      ))}
    </>)
  }

  const gradients = {
    year: 'linear-gradient(135deg, #2563eb, #1e40af)',
    month: 'linear-gradient(135deg, #7c3aed, #5b21b6)',
  }

  return (
    <div style={{ width: '100%', overflowX: 'hidden' }}>
      <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap">
        <div>
          <nav aria-label="breadcrumb">
            <ol className="breadcrumb mb-0" style={{ fontSize: 13 }}>
              <li className="breadcrumb-item"><Link to="/dashboard"><i className="bi bi-house-door"></i></Link></li>
              <li className="breadcrumb-item"><Link to="/customers/active">Customers</Link></li>
              <li className="breadcrumb-item active">Reports</li>
            </ol>
          </nav>
          <h4 className="mb-0">Customer Reports</h4>
        </div>
      </div>

      <div className="row g-2 mb-3">
        {[
          { value: filtered.length, label: 'Records', icon: 'bi-list-ul', bg: '#eff6ff', color: '#2563eb' },
          { value: fmtMoney(totals.sales), label: 'Total Sales', icon: 'bi-currency-dollar', bg: '#ecfdf5', color: '#10b981', raw: true },
          { value: totals.qty, label: 'Total QTY', icon: 'bi-box', bg: '#f5f3ff', color: '#8b5cf6' },
          { value: totals.comm > 0 ? fmtMoney(totals.comm) : '-', label: 'Commission', icon: 'bi-cash', bg: '#fff7ed', color: '#f59e0b', raw: totals.comm > 0 },
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
            {tab === 'year' && (
              <div>
                <select className="form-select form-select-sm" style={{ fontSize: 12, minWidth: 100 }} value={filterIndustry} onChange={e => { setFilterIndustry(e.target.value); setPage(1) }}>
                  <option value="">All Industries</option>
                  {customerTypes.map(t => <option key={t._id} value={t.name || t.type_name}>{t.name || t.type_name}</option>)}
                </select>
              </div>
            )}
            {tab === 'year' && (
              <div>
                <select className="form-select form-select-sm" style={{ fontSize: 12, minWidth: 100 }} value={salesRange} onChange={e => { setSalesRange(e.target.value); setPage(1) }}>
                  <option value="all">Sales ($k) - All</option>
                  <option value="1">0 - 1k</option>
                  <option value="2">1k - 5k</option>
                  <option value="3">5k - 10k</option>
                  <option value="4">10k - 25k</option>
                  <option value="5">25k - 50k</option>
                  <option value="6">50k - 100k</option>
                  <option value="7">&gt; 100k</option>
                </select>
              </div>
            )}
            {tab === 'year' && (<>
              <div>
                <select className="form-select form-select-sm" value={topCount} onChange={e => { setTopCount(e.target.value); setPage(1) }}>
                  <option value="">Top All</option>
                  <option value="5">Top 5</option>
                  <option value="10">Top 10</option>
                  <option value="15">Top 15</option>
                  <option value="20">Top 20</option>
                  <option value="25">Top 25</option>
                  <option value="50">Top 50</option>
                </select>
              </div>
              <div>
                <select className="form-select form-select-sm" multiple style={{ height: 32, minWidth: 100, fontSize: 12 }}
                  value={selectedYears.map(String)}
                  onChange={e => setSelectedYears([...e.target.selectedOptions].map(o => parseInt(o.value)))}
                  title="Hold Ctrl/Shift to select multiple years">
                  {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </>)}
            {tab === 'month' && (
              <div>
                <select className="form-select form-select-sm" value={filterYear} onChange={e => setFilterYear(e.target.value)}>
                  <option value="">All Years</option>
                  {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            )}
            {tab === 'month' && (<>
              <div>
                <select className="form-select form-select-sm" value={filterMonth} onChange={e => { setFilterMonth(e.target.value); setPage(1) }}>
                  <option value="">All Months</option>
                  {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                </select>
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
            </>)}
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
          ) : tab === 'year' ? renderYearTable() : renderMonthTable()}
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
