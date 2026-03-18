import React, { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import html2pdf from 'html2pdf.js'
import { api } from '../../lib/api'
import Pagination from '../../components/Pagination'

const TABS = [
  { key: 'year', label: 'Year', icon: 'bi-calendar3' },
  { key: 'month', label: 'Month', icon: 'bi-calendar-month' },
  { key: 'rep-month', label: 'Sales Rep Month', icon: 'bi-people' },
  { key: 'rep-year', label: 'Sales Rep Year', icon: 'bi-person-badge' },
  { key: 'paid', label: 'Paid Invoice', icon: 'bi-check2-circle' },
]

export default function Reports() {
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = searchParams.get('tab') || 'year'
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [years, setYears] = useState([])
  const [filterYear, setFilterYear] = useState(String(new Date().getFullYear()))
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
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
  // Sales Rep Month filters
  const [filterRep, setFilterRep] = useState('')
  const [filterMonth, setFilterMonth] = useState('')
  const [filterOrderBy, setFilterOrderBy] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterCommission, setFilterCommission] = useState('')
  const [reps, setReps] = useState([])

  useEffect(() => {
    api.getReportYears().then(y => setYears(y || [])).catch(() => {})
    api.getInvoiceCustomers().then(c => setCustomers(c || [])).catch(() => {})
    api.getCustomerTypes().then(t => setCustomerTypes(t || [])).catch(() => {})
    api.getCommissionReps().then(r => setReps(r || [])).catch(() => {})
  }, [])
  useEffect(() => { fetchData() }, [tab, filterYear, dateFrom, dateTo])

  async function fetchData() {
    setLoading(true)
    setPage(1)
    try {
      let result
      if (tab === 'year') result = await api.getReportYear()
      else if (tab === 'month') result = await api.getReportMonth(filterYear)
      else if (tab === 'rep-month') result = await api.getReportSalesRepMonth(filterYear)
      else if (tab === 'rep-year') result = await api.getReportSalesRepYear()
      else if (tab === 'paid') result = await api.getReportPaidInvoices(dateFrom, dateTo)
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
      filename: `Report_${tab}_${new Date().toISOString().slice(0, 10)}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' },
    }).from(el).save().then(() => toast.success('PDF exported'))
  }

  function fmtMoney(v) { return '$' + (parseFloat(v) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }
  function fmtDate(d) { if (!d) return '-'; const dt = new Date(d); if (isNaN(dt)) return '-'; return `${String(dt.getMonth()+1).padStart(2,'0')}/${String(dt.getDate()).padStart(2,'0')}/${dt.getFullYear()}` }

  const filtered = data.filter(r => {
    // Customer filter
    if (filterCustomer && String(r.company_id) !== String(filterCustomer)) return false
    // Industry filter (would need customer_type on data - skip if not available)
    // Sales range filter (for year report)
    if (tab === 'year' && salesRange !== 'all') {
      const sales = (r.total_sales || 0) / 1000
      const ranges = { '1': [0, 1], '2': [1, 5], '3': [5, 10], '4': [10, 25], '5': [25, 50], '6': [50, 100], '7': [100, Infinity] }
      const [min, max] = ranges[salesRange] || [0, Infinity]
      if (sales < min || sales >= max) return false
    }
    // Rep filter
    if (filterRep && String(r.rep_id) !== String(filterRep)) return false
    // Month filter
    if (filterMonth && String(r.month) !== String(filterMonth)) return false
    // Search
    if (!search) return true
    const s = search.toLowerCase()
    return (r.company_name || '').toLowerCase().includes(s) ||
      (r.rep_name || '').toLowerCase().includes(s) ||
      (r.invoice_number || '').toLowerCase().includes(s) ||
      (r.po_number || '').toLowerCase().includes(s)
  })

  // Compute totals
  const totals = {
    qty: filtered.reduce((s, r) => s + (r.total_qty || 0), 0),
    sales: filtered.reduce((s, r) => s + (r.total_sales || r.net_amount || 0), 0),
    po: filtered.reduce((s, r) => s + (r.total_po || 0), 0),
    comm: filtered.reduce((s, r) => s + (r.total_commission || r.commission || 0), 0),
  }

  // Apply ordering for rep reports
  const sorted = [...filtered]
  if ((tab === 'rep-month' || tab === 'rep-year') && filterOrderBy) {
    if (filterOrderBy === 'company') sorted.sort((a, b) => (a.company_name || '').localeCompare(b.company_name || ''))
    else if (filterOrderBy === 'rep') sorted.sort((a, b) => (a.rep_name || '').localeCompare(b.rep_name || ''))
  }

  const paginated = sorted.slice((page - 1) * perPage, page * perPage)

  function renderTable() {
    if (tab === 'year') return renderYearTable()
    if (tab === 'month') return renderMonthTable()
    if (tab === 'rep-month') return renderRepMonthTable()
    if (tab === 'rep-year') return renderRepYearTable()
    if (tab === 'paid') return renderPaidTable()
  }

  function renderYearTable() {
    // Pivot data: group by customer, columns = years
    let yearSet = [...new Set(filtered.map(r => r.year))].sort()
    // Filter years if user selected specific ones
    if (selectedYears.length > 0) yearSet = yearSet.filter(y => selectedYears.includes(y))
    const custMap = {}
    filtered.forEach(r => {
      if (!custMap[r.company_id]) custMap[r.company_id] = { company_name: r.company_name, company_id: r.company_id, company_cust_code: r.company_cust_code || '', years: {}, total: 0 }
      custMap[r.company_id].years[r.year] = (custMap[r.company_id].years[r.year] || 0) + (r.total_sales || 0)
      custMap[r.company_id].total += (r.total_sales || 0)
    })
    let rows = Object.values(custMap)
    // Apply top N filter
    if (topCount) {
      const n = parseInt(topCount)
      if (topYear) {
        // Sort by sales in selected year
        rows.sort((a, b) => (b.years[parseInt(topYear)] || 0) - (a.years[parseInt(topYear)] || 0))
      } else {
        rows.sort((a, b) => b.total - a.total)
      }
      rows = rows.slice(0, n)
    } else {
      rows.sort((a, b) => b.total - a.total)
    }
    const paginatedRows = rows.slice((page - 1) * perPage, page * perPage)
    // Year column totals
    const yearTotals = {}
    yearSet.forEach(y => { yearTotals[y] = rows.reduce((s, r) => s + (r.years[y] || 0), 0) })
    const grandTotal = rows.reduce((s, r) => s + r.total, 0)

    return (<>
      {/* Action buttons matching old PHP */}
      <div className="d-flex justify-content-between align-items-center px-3 py-2 bg-light border-bottom">
        <h6 className="mb-0 fw-bold">YEAR ON YEAR - INVOICE</h6>
        <div className="d-flex gap-1">
          <button className="btn btn-sm px-3" style={{ background: '#5bc0de', color: '#fff' }} onClick={exportPdf}>Export</button>
          <button className="btn btn-sm px-3" style={{ background: '#5bc0de', color: '#fff' }} onClick={() => { setSelectedYears([]); setPage(1) }}>FY</button>
          <button className="btn btn-sm px-3" style={{ background: '#f0ad4e', color: '#fff' }} onClick={() => { const cy = new Date().getFullYear(); setSelectedYears([cy]); setPage(1) }}>YTD</button>
          <button className="btn btn-sm px-3" style={{ background: '#d9534f', color: '#fff' }} onClick={exportPdf}>PDF</button>
        </div>
      </div>
      {/* Chart - top customers by sales */}
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
    // Pivot: group by customer -> months as rows, years as column groups (Qty, Sales, Commission)
    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
    const yearSet = [...new Set(filtered.map(r => r.year))].sort()

    // Group by customer
    const custGroups = {}
    filtered.forEach(r => {
      if (!custGroups[r.company_id]) custGroups[r.company_id] = { company_name: r.company_name, data: {} }
      const key = `${r.year}_${r.month}`
      if (!custGroups[r.company_id].data[key]) custGroups[r.company_id].data[key] = { qty: 0, sales: 0, comm: 0 }
      custGroups[r.company_id].data[key].qty += r.total_qty || 0
      custGroups[r.company_id].data[key].sales += r.total_sales || 0
    })

    const custList = Object.entries(custGroups)

    // If only one or no customer, show combined view
    return (<>
      {/* Action buttons */}
      <div className="d-flex justify-content-between align-items-center px-3 py-2 bg-light border-bottom">
        <h6 className="mb-0 fw-bold">MONTH ON MONTH</h6>
        <div className="d-flex gap-1">
          <button className="btn btn-sm px-3 btn-outline-info" onClick={exportPdf}>PDF</button>
          <button className="btn btn-sm px-3 btn-outline-info" onClick={exportPdf}>XLS</button>
        </div>
      </div>

      {/* Chart - Monthly Sales Overview */}
      {custList.length > 0 && (() => {
        const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
        const chartYearSet = [...new Set(filtered.map(r => r.year))].sort()
        // Aggregate all customers by month+year
        const monthTotals = {}
        filtered.forEach(r => {
          const key = `${r.year}_${r.month}`
          monthTotals[key] = (monthTotals[key] || 0) + (r.total_sales || 0)
        })
        const maxVal = Math.max(...Object.values(monthTotals), 1)
        const chartColors = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16']
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

  function renderRepMonthTable() {
    // Chart: commission by rep by month
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
      {/* Chart */}
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
    // Build chart data: group by rep, show commission per year
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
      {/* Year Commission Chart */}
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
                          width: 20,
                          height: `${pct}%`,
                          background: chartColors[yi % chartColors.length],
                          borderRadius: '3px 3px 0 0',
                          cursor: 'pointer',
                          transition: 'height 0.3s',
                          position: 'relative',
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
            {/* Legend */}
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

      {/* Year Sales Chart */}
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
                          width: 20,
                          height: `${pct}%`,
                          background: chartColors[yi % chartColors.length],
                          borderRadius: '3px 3px 0 0',
                          cursor: 'pointer',
                          transition: 'height 0.3s',
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

      {/* Table */}
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

  function renderPaidTable() {
    // Chart: paid amounts by customer (top 15)
    const custTotals = {}
    filtered.forEach(r => {
      const name = r.company_name || 'Unknown'
      custTotals[name] = (custTotals[name] || 0) + (r.net_amount || 0)
    })
    const chartData = Object.entries(custTotals).sort((a, b) => b[1] - a[1]).slice(0, 15)
    const maxPaid = Math.max(...chartData.map(d => d[1]), 1)

    return (<>
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
        <tfoot><tr className="fw-bold bg-light"><td className="ps-4" colSpan="4">TOTAL</td><td className="text-center">{filtered.reduce((s, r) => s + (r.total_qty || 0), 0)}</td><td></td><td>{fmtMoney(filtered.reduce((s, r) => s + (r.net_amount || 0), 0))}</td></tr></tfoot>
      </table>
    </>)
  }

  const gradients = {
    year: 'linear-gradient(135deg, #2563eb, #1e40af)',
    month: 'linear-gradient(135deg, #7c3aed, #5b21b6)',
    'rep-month': 'linear-gradient(135deg, #10b981, #059669)',
    'rep-year': 'linear-gradient(135deg, #f59e0b, #d97706)',
    paid: 'linear-gradient(135deg, #06b6d4, #0891b2)',
  }

  return (
    <div style={{ maxWidth: 'calc(100vw - 260px)', overflowX: 'hidden' }}>
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <nav aria-label="breadcrumb">
            <ol className="breadcrumb mb-0" style={{ fontSize: 13 }}>
              <li className="breadcrumb-item"><Link to="/dashboard"><i className="bi bi-house-door"></i></Link></li>
              <li className="breadcrumb-item active">Reports</li>
            </ol>
          </nav>
          <h4 className="mb-0">Reports</h4>
        </div>
      </div>

      {/* Stats - compact */}
      <div className="row g-2 mb-3">
        {[
          { value: filtered.length, label: 'Records', icon: 'bi-list-ul', bg: '#eff6ff', color: '#2563eb' },
          { value: fmtMoney(totals.sales), label: 'Total Sales', icon: 'bi-currency-dollar', bg: '#ecfdf5', color: '#10b981', raw: true },
          { value: totals.qty, label: 'Total QTY', icon: 'bi-box', bg: '#f5f3ff', color: '#8b5cf6' },
          { value: totals.comm > 0 ? fmtMoney(totals.comm) : totals.po, label: totals.comm > 0 ? 'Commission' : 'Total POs', icon: totals.comm > 0 ? 'bi-cash' : 'bi-receipt', bg: '#fff7ed', color: '#f59e0b', raw: totals.comm > 0 },
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

      {/* Tabs + Filters combined */}
      <div className="card border-0 shadow-sm rounded-4 mb-3">
        <div className="card-body py-2 px-3">
          {/* Tab buttons */}
          <div className="d-flex flex-wrap gap-1 mb-2 pb-2" style={{ borderBottom: '1px solid #e5e7eb' }}>
            {TABS.map(t => (
              <button key={t.key} className={`btn btn-sm px-3 ${tab === t.key ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={() => setTab(t.key)}>
                <i className={`bi ${t.icon} me-1`}></i>{t.label}
              </button>
            ))}
          </div>
          {/* Filters row */}
          <div className="d-flex flex-wrap gap-2 align-items-center">
            <div className="position-relative" style={{ minWidth: 180 }}>
              <i className="bi bi-search position-absolute" style={{ left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: 12 }}></i>
              <input type="text" className="form-control form-control-sm ps-4" style={{ fontSize: 12 }} placeholder="Search..." value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
            </div>
            {/* Customer filter - for year, month, rep tabs */}
            {(tab === 'year' || tab === 'month' || tab === 'rep-month' || tab === 'rep-year') && (
              <div>
                <select className="form-select form-select-sm" style={{ fontSize: 12, minWidth: 140 }} value={filterCustomer} onChange={e => { setFilterCustomer(e.target.value); setPage(1) }}>
                  <option value="">All Customers</option>
                  {customers.map(c => <option key={c._id} value={c.legacy_id}>{c.company_name}</option>)}
                </select>
              </div>
            )}
            {/* Industry filter - year tab */}
            {tab === 'year' && (
              <div>
                <select className="form-select form-select-sm" style={{ fontSize: 12, minWidth: 120 }} value={filterIndustry} onChange={e => { setFilterIndustry(e.target.value); setPage(1) }}>
                  <option value="">All Industries</option>
                  {customerTypes.map(t => <option key={t._id} value={t.name || t.type_name}>{t.name || t.type_name}</option>)}
                </select>
              </div>
            )}
            {/* Sales range filter - year tab */}
            {tab === 'year' && (
              <div>
                <select className="form-select form-select-sm" style={{ fontSize: 12, minWidth: 110 }} value={salesRange} onChange={e => { setSalesRange(e.target.value); setPage(1) }}>
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
            {/* Top customers + Years filter - year tab */}
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
                <select className="form-select form-select-sm" multiple style={{ height: 32, minWidth: 140, fontSize: 12 }}
                  value={selectedYears.map(String)}
                  onChange={e => setSelectedYears([...e.target.selectedOptions].map(o => parseInt(o.value)))}
                  title="Hold Ctrl/Shift to select multiple years">
                  {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </>)}
            {/* Year filter - month, rep-month tabs */}
            {(tab === 'month' || tab === 'rep-month') && (
              <div>
                <select className="form-select form-select-sm" value={filterYear} onChange={e => setFilterYear(e.target.value)}>
                  <option value="">All Years</option>
                  {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            )}
            {/* Month + Status filter - month tab */}
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
            {/* Sales Rep filter - rep-month, rep-year tabs */}
            {(tab === 'rep-month' || tab === 'rep-year') && (
              <div>
                <select className="form-select form-select-sm" value={filterRep} onChange={e => { setFilterRep(e.target.value); setPage(1) }}>
                  <option value="">All Reps</option>
                  {reps.map(r => <option key={r._id} value={r.legacy_id}>{r.first_name} {r.last_name}</option>)}
                </select>
              </div>
            )}
            {/* Month filter - rep-month */}
            {tab === 'rep-month' && (
              <div>
                <select className="form-select form-select-sm" value={filterMonth} onChange={e => { setFilterMonth(e.target.value); setPage(1) }}>
                  <option value="">All Months</option>
                  {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                </select>
              </div>
            )}
            {/* Order By - rep-month, rep-year */}
            {(tab === 'rep-month' || tab === 'rep-year') && (
              <div className="col-md-auto d-flex align-items-center gap-2" style={{ fontSize: 12 }}>
                <span className="fw-semibold text-nowrap">Order:</span>
                <div className="form-check form-check-inline mb-0"><input className="form-check-input" type="radio" name="orderBy" value="" checked={filterOrderBy === ''} onChange={() => setFilterOrderBy('')} /><label className="form-check-label">Default</label></div>
                <div className="form-check form-check-inline mb-0"><input className="form-check-input" type="radio" name="orderBy" value="company" checked={filterOrderBy === 'company'} onChange={() => setFilterOrderBy('company')} /><label className="form-check-label">Customer</label></div>
                <div className="form-check form-check-inline mb-0"><input className="form-check-input" type="radio" name="orderBy" value="rep" checked={filterOrderBy === 'rep'} onChange={() => setFilterOrderBy('rep')} /><label className="form-check-label">Rep</label></div>
              </div>
            )}
            {/* Status - rep-month, rep-year */}
            {(tab === 'rep-month' || tab === 'rep-year') && (
              <div className="col-md-auto d-flex align-items-center gap-2" style={{ fontSize: 12 }}>
                <span className="fw-semibold text-nowrap">Status:</span>
                <select className="form-select form-select-sm" style={{ width: 100 }} value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1) }}>
                  <option value="">Both</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="pilot">Pilot</option>
                </select>
              </div>
            )}
            {/* Commission - rep-month, rep-year */}
            {(tab === 'rep-month' || tab === 'rep-year') && (
              <div className="col-md-auto d-flex align-items-center gap-2" style={{ fontSize: 12 }}>
                <span className="fw-semibold text-nowrap">Comm:</span>
                <select className="form-select form-select-sm" style={{ width: 110 }} value={filterCommission} onChange={e => { setFilterCommission(e.target.value); setPage(1) }}>
                  <option value="">Both</option>
                  <option value="paid">Paid</option>
                  <option value="unpaid">Unpaid</option>
                </select>
              </div>
            )}
            {/* Date range - paid tab */}
            {tab === 'paid' && (<>
              <div className="d-flex align-items-center gap-1">
                <label className="fw-semibold text-nowrap" style={{ fontSize: 12 }}>From:</label>
                <input type="date" className="form-control form-control-sm" style={{ width: 140, fontSize: 12 }} value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
              </div>
              <div className="d-flex align-items-center gap-1">
                <label className="fw-semibold text-nowrap" style={{ fontSize: 12 }}>To:</label>
                <input type="date" className="form-control form-control-sm" style={{ width: 140, fontSize: 12 }} value={dateTo} onChange={e => setDateTo(e.target.value)} />
              </div>
            </>)}
            {/* Export + count */}
            <div className="ms-auto d-flex align-items-center gap-2">
              <button className="btn btn-sm btn-outline-danger" onClick={exportPdf} title="Export PDF" style={{ fontSize: 12 }}>
                <i className="bi bi-file-pdf me-1"></i>PDF
              </button>
              <span className="text-muted" style={{ fontSize: 11 }}>{filtered.length} records</span>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card border-0 shadow-sm rounded-4" style={{ overflow: 'hidden' }}>
        <div className="card-header py-3 border-0" style={{ background: gradients[tab], color: '#fff' }}>
          <div className="d-flex justify-content-between align-items-center">
            <h5 className="mb-0"><i className={`bi ${TABS.find(t => t.key === tab)?.icon} me-2`}></i>{TABS.find(t => t.key === tab)?.label} Report</h5>
            <span className="badge bg-white bg-opacity-25 px-3 py-2">{filtered.length} records</span>
          </div>
        </div>
        <div style={{ overflowX: 'auto' }} id="report-table-area">
          {loading ? (
            <div className="text-center py-5"><div className="spinner-border text-primary"></div><p className="mt-2 text-muted">Loading report...</p></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-5 text-muted"><i className="bi bi-graph-up fs-1 d-block mb-2 opacity-25"></i>No data found</div>
          ) : renderTable()}
        </div>
        {filtered.length > 0 && (
          <div className="card-footer bg-white border-0 py-3">
            <Pagination total={filtered.length} page={page} perPage={perPage}
              onPageChange={setPage} onPerPageChange={v => { setPerPage(v); setPage(1) }} />
          </div>
        )}
      </div>
    </div>
  )
}
