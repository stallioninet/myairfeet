import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Chart, registerables } from 'chart.js'
import { api } from '../lib/api'

Chart.register(...registerables)

const fmt = v => '$' + (parseFloat(v) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmtDate = d => { if (!d) return '—'; try { return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) } catch { return d } }

function getUser() {
  try { return JSON.parse(localStorage.getItem('ct_user') || '{}') } catch { return {} }
}

// ─────────────────────────────────────────────────────────────────
// SALES REP DASHBOARD
// ─────────────────────────────────────────────────────────────────
function RepDashboard({ user }) {
  const [loading, setLoading]       = useState(true)
  const [rows, setRows]             = useState([])    // commission report rows
  const [repName, setRepName]       = useState(user.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : 'Sales Rep')

  const monthlyCanvasRef  = useRef(null)
  const pieCanvasRef      = useRef(null)
  const monthlyChartRef   = useRef(null)
  const pieChartRef       = useRef(null)

  useEffect(() => {
    if (!user.email) { setLoading(false); return }
    api.getCommissionReport({ rep_email: user.email })
      .then(data => {
        const r = data || []
        setRows(r)
        // If we got a rep_name from the data, use it
        if (r.length > 0 && r[0].rep_name) setRepName(r[0].rep_name)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  // ── Monthly commission chart ──────────────────────────────────
  useEffect(() => {
    if (loading || !monthlyCanvasRef.current) return
    const ctx = monthlyCanvasRef.current.getContext('2d')
    if (monthlyChartRef.current) monthlyChartRef.current.destroy()

    const currentYear = new Date().getFullYear()
    const monthTotals = new Array(12).fill(0)
    rows.forEach(r => {
      if (!r.shipped_date) return
      const d = new Date(r.shipped_date)
      if (d.getFullYear() === currentYear) monthTotals[d.getMonth()] += (r.commission || 0)
    })

    const gradient = ctx.createLinearGradient(0, 0, 0, 260)
    gradient.addColorStop(0, 'rgba(99,102,241,0.18)')
    gradient.addColorStop(1, 'rgba(99,102,241,0)')

    monthlyChartRef.current = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
        datasets: [{
          label: 'Commission',
          data: monthTotals,
          backgroundColor: monthTotals.map((_, i) => i === new Date().getMonth() ? '#6366f1' : 'rgba(99,102,241,0.35)'),
          borderRadius: 6,
          borderSkipped: false,
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true, ticks: { callback: v => '$' + (v/1000).toFixed(0) + 'k', font: { size: 11 } }, grid: { color: 'rgba(0,0,0,0.05)' } }, x: { grid: { display: false } } }
      }
    })
    return () => { if (monthlyChartRef.current) monthlyChartRef.current.destroy() }
  }, [loading, rows])

  // ── Paid vs Unpaid pie ────────────────────────────────────────
  useEffect(() => {
    if (loading || !pieCanvasRef.current) return
    const ctx = pieCanvasRef.current.getContext('2d')
    if (pieChartRef.current) pieChartRef.current.destroy()

    const paid   = rows.filter(r => r.is_paid).reduce((s, r) => s + (r.commission || 0), 0)
    const unpaid = rows.filter(r => !r.is_paid).reduce((s, r) => s + (r.commission || 0), 0)

    pieChartRef.current = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Paid', 'Unpaid'],
        datasets: [{ data: [paid, unpaid], backgroundColor: ['#10b981','#f59e0b'], borderWidth: 0 }]
      },
      options: {
        responsive: true, maintainAspectRatio: false, cutout: '68%',
        plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, padding: 12, font: { size: 11 } } } }
      }
    })
    return () => { if (pieChartRef.current) pieChartRef.current.destroy() }
  }, [loading, rows])

  // ── Derived stats ─────────────────────────────────────────────
  const totalComm  = rows.reduce((s, r) => s + (r.commission || 0), 0)
  const paidComm   = rows.filter(r => r.is_paid).reduce((s, r) => s + (r.commission || 0), 0)
  const unpaidComm = rows.filter(r => !r.is_paid).reduce((s, r) => s + (r.commission || 0), 0)
  const uniqueCusts = new Set(rows.map(r => r.company_name).filter(Boolean)).size

  // YTD (current year) rows
  const currentYear = new Date().getFullYear()
  const ytdRows     = rows.filter(r => r.shipped_date && new Date(r.shipped_date).getFullYear() === currentYear)
  const ytdComm     = ytdRows.reduce((s, r) => s + (r.commission || 0), 0)

  // Recent invoices — latest 10 by shipped_date
  const recent = [...rows].sort((a, b) => (b.shipped_date || '').localeCompare(a.shipped_date || '')).slice(0, 10)

  const stats = [
    { label: 'Total Invoices',    value: rows.length,    icon: 'bi-receipt',           bg: '#eff6ff', color: '#2563eb' },
    { label: 'Total Commission',  value: fmt(totalComm), icon: 'bi-cash-stack',         bg: '#f0fdf4', color: '#16a34a' },
    { label: 'Paid Commission',   value: fmt(paidComm),  icon: 'bi-check-circle',       bg: '#ecfdf5', color: '#059669' },
    { label: 'Outstanding',       value: fmt(unpaidComm),icon: 'bi-exclamation-circle', bg: '#fff7ed', color: '#f59e0b' },
    { label: 'YTD Commission',    value: fmt(ytdComm),   icon: 'bi-graph-up-arrow',     bg: '#faf5ff', color: '#9333ea' },
    { label: 'Customers Served',  value: uniqueCusts,    icon: 'bi-building',           bg: '#fef9c3', color: '#854d0e' },
  ]

  if (loading) return (
    <div className="text-center py-5">
      <div className="spinner-border text-primary"></div>
      <p className="mt-2 text-muted">Loading your dashboard…</p>
    </div>
  )

  return (
    <div style={{ width: '100%', overflowX: 'hidden' }}>

      {/* Header */}
      <div className="d-flex justify-content-between align-items-start mb-3 flex-wrap gap-2">
        <div>
          <h4 className="fw-bold mb-1">My Dashboard</h4>
          <p className="text-muted mb-0" style={{ fontSize: 13 }}>
            <i className="bi bi-person-workspace me-1"></i>
            {repName} &nbsp;·&nbsp; Sales Rep
          </p>
        </div>
        <Link to="/commissions/report" className="btn btn-sm btn-primary" style={{ fontSize: 12 }}>
          <i className="bi bi-file-earmark-bar-graph me-1"></i>Full Commission Report
        </Link>
      </div>

      {/* Stat cards */}
      <div className="row g-2 mb-3">
        {stats.map((s, i) => (
          <div className="col-6 col-md-4 col-lg-2" key={i}>
            <div className="card border-0 shadow-sm h-100 text-center" style={{ borderRadius: 14, padding: '14px 8px' }}>
              <div className="d-flex align-items-center justify-content-center mx-auto mb-1"
                style={{ width: 36, height: 36, borderRadius: 10, background: s.bg, color: s.color, fontSize: '1rem' }}>
                <i className={`bi ${s.icon}`}></i>
              </div>
              <div style={{ fontSize: 'clamp(1rem, 2.5vw, 1.5rem)', fontWeight: 800, color: s.color, lineHeight: 1.1 }}>{s.value}</div>
              <div style={{ fontSize: 'clamp(.6rem, 1.5vw, .75rem)', fontWeight: 600, color: '#64748b', marginTop: 2 }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="row g-2 mb-3">
        <div className="col-12 col-lg-8">
          <div className="card border-0 shadow-sm rounded-4 h-100">
            <div className="card-body p-3">
              <h6 className="fw-bold mb-1">Monthly Commission ({currentYear})</h6>
              <p className="text-muted mb-2" style={{ fontSize: 11 }}>Commission earned per month based on shipped date</p>
              <div style={{ height: 'clamp(180px, 28vw, 260px)' }}>
                <canvas ref={monthlyCanvasRef}></canvas>
              </div>
            </div>
          </div>
        </div>
        <div className="col-12 col-lg-4">
          <div className="card border-0 shadow-sm rounded-4 h-100">
            <div className="card-body p-3">
              <h6 className="fw-bold mb-1">Commission Status</h6>
              <p className="text-muted mb-2" style={{ fontSize: 11 }}>All-time paid vs outstanding</p>
              <div style={{ height: 'clamp(180px, 28vw, 260px)' }}>
                <canvas ref={pieCanvasRef}></canvas>
              </div>
              {rows.length > 0 && (
                <div className="d-flex justify-content-around mt-2" style={{ fontSize: 12 }}>
                  <span><span className="fw-bold" style={{ color: '#10b981' }}>{rows.filter(r => r.is_paid).length}</span> <span className="text-muted">Paid</span></span>
                  <span><span className="fw-bold" style={{ color: '#f59e0b' }}>{rows.filter(r => !r.is_paid).length}</span> <span className="text-muted">Unpaid</span></span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Recent invoices + Quick links */}
      <div className="row g-2">
        <div className="col-12 col-lg-8">
          <div className="card border-0 shadow-sm rounded-4">
            <div className="card-body p-3">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <h6 className="fw-bold mb-0">Recent Invoices</h6>
                <Link to="/commissions/report" className="text-decoration-none small">
                  View All <i className="bi bi-arrow-right"></i>
                </Link>
              </div>
              {rows.length === 0 ? (
                <div className="text-center py-4 text-muted">
                  <i className="bi bi-receipt fs-1 d-block mb-2 opacity-25"></i>
                  No commission data found for your account
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover table-sm align-middle mb-0" style={{ fontSize: 12 }}>
                    <thead className="bg-light">
                      <tr>
                        <th>Invoice #</th>
                        <th>Customer</th>
                        <th>Shipped</th>
                        <th className="text-end">Subtotal</th>
                        <th className="text-end">Commission</th>
                        <th className="text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recent.map((r, i) => (
                        <tr key={i}>
                          <td className="fw-semibold">
                            <span className="badge bg-warning-subtle text-warning">{r.invoice_number || '—'}</span>
                          </td>
                          <td className="text-truncate" style={{ maxWidth: 160 }}>{r.company_name || '—'}</td>
                          <td className="text-muted">{fmtDate(r.shipped_date)}</td>
                          <td className="text-end">{fmt(r.subtotal)}</td>
                          <td className="text-end fw-semibold" style={{ color: '#6366f1' }}>{fmt(r.commission)}</td>
                          <td className="text-center">
                            {r.is_paid
                              ? <span className="badge bg-success-subtle text-success" style={{ fontSize: 10 }}>Paid</span>
                              : <span className="badge bg-warning-subtle text-warning" style={{ fontSize: 10 }}>Unpaid</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="col-12 col-lg-4">
          <div className="card border-0 shadow-sm rounded-4 h-100">
            <div className="card-body p-3">
              <h6 className="fw-bold mb-2">Quick Links</h6>
              {[
                { label: 'Commission Report', icon: 'bi-file-earmark-bar-graph', path: '/commissions/report', bg: '#eff6ff',  color: '#2563eb' },
                { label: 'Active Customers',  icon: 'bi-building',               path: '/customers/active',  bg: '#f0fdf4',  color: '#16a34a' },
                { label: 'Invoices',          icon: 'bi-receipt',                path: '/invoices',          bg: '#fef9c3',  color: '#854d0e' },
                { label: 'Outstanding',       icon: 'bi-exclamation-octagon',    path: '/invoices/outstanding', bg: '#fef2f2', color: '#dc2626' },
              ].map((link, i) => (
                <Link key={i} to={link.path}
                  className="d-flex align-items-center gap-3 p-2 rounded-3 text-decoration-none mb-2"
                  style={{ transition: 'background .2s' }}
                  onMouseOver={e => e.currentTarget.style.background = '#f8fafc'}
                  onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                  <div className="d-flex align-items-center justify-content-center"
                    style={{ width: 36, height: 36, borderRadius: 10, background: link.bg, color: link.color, flexShrink: 0 }}>
                    <i className={`bi ${link.icon}`}></i>
                  </div>
                  <span className="fw-semibold" style={{ color: '#334155', fontSize: 13 }}>{link.label}</span>
                  <i className="bi bi-chevron-right ms-auto" style={{ color: '#94a3b8', fontSize: 12 }}></i>
                </Link>
              ))}

              {/* YTD summary box */}
              {rows.length > 0 && (
                <div className="rounded-3 p-3 mt-2" style={{ background: 'linear-gradient(135deg,#6366f1,#4f46e5)', color:'#fff' }}>
                  <div style={{ fontSize: 11, opacity: .8 }}>YTD Commission ({currentYear})</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{fmt(ytdComm)}</div>
                  <div style={{ fontSize: 11, opacity: .75 }}>{ytdRows.length} invoices shipped this year</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// ADMIN / SUPERUSER DASHBOARD  (unchanged logic, same as before)
// ─────────────────────────────────────────────────────────────────
function AdminDashboard() {
  const [loading, setLoading]           = useState(true)
  const [custStats, setCustStats]       = useState({})
  const [invStats, setInvStats]         = useState({})
  const [repCount, setRepCount]         = useState(0)
  const [commCount, setCommCount]       = useState(0)
  const [userCount, setUserCount]       = useState(0)
  const [recentInvoices, setRecentInvoices] = useState([])
  const [monthlyData, setMonthlyData]   = useState([])
  const [repYearData, setRepYearData]   = useState([])
  const revenueCanvasRef = useRef(null)
  const repCanvasRef     = useRef(null)
  const revenueChartRef  = useRef(null)
  const repChartRef      = useRef(null)

  useEffect(() => {
    Promise.all([
      api.getCustomerStats().catch(() => ({})),
      api.getInvoiceStats().catch(() => ({})),
      api.getSalesReps('active').catch(() => []),
      api.getCommissionMap().catch(() => ({})),
      api.getUsers().catch(() => []),
      api.getInvoices({ year: new Date().getFullYear() }).catch(() => []),
      api.getReportMonth(new Date().getFullYear()).catch(() => []),
      api.getReportSalesRepYear().catch(() => []),
    ]).then(([cs, is, reps, commMap, users, invoices, monthly, repYear]) => {
      setCustStats(cs || {})
      setInvStats(is || {})
      setRepCount((reps || []).length)
      setCommCount(Object.keys(commMap || {}).length)
      setUserCount((users || []).length)
      setRecentInvoices((invoices || []).slice(0, 10))
      setMonthlyData(monthly || [])
      setRepYearData(repYear || [])
      setLoading(false)
    })
  }, [])

  useEffect(() => {
    if (loading || !revenueCanvasRef.current) return
    const ctx = revenueCanvasRef.current.getContext('2d')
    if (revenueChartRef.current) revenueChartRef.current.destroy()
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
    const monthTotals = new Array(12).fill(0)
    monthlyData.forEach(r => { if (r.month >= 1 && r.month <= 12) monthTotals[r.month - 1] += (r.total_sales || 0) })
    const gradient = ctx.createLinearGradient(0, 0, 0, 280)
    gradient.addColorStop(0, 'rgba(37,99,235,0.15)')
    gradient.addColorStop(1, 'rgba(37,99,235,0)')
    revenueChartRef.current = new Chart(ctx, {
      type: 'line',
      data: { labels: months, datasets: [{ label: 'Revenue', data: monthTotals, borderColor: '#2563eb', backgroundColor: gradient, fill: true, tension: 0.4, pointRadius: 4, pointBackgroundColor: '#2563eb' }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { callback: v => '$' + (v / 1000).toFixed(0) + 'k' } } } }
    })
    return () => { if (revenueChartRef.current) revenueChartRef.current.destroy() }
  }, [loading, monthlyData])

  useEffect(() => {
    if (loading || !repCanvasRef.current) return
    const ctx = repCanvasRef.current.getContext('2d')
    if (repChartRef.current) repChartRef.current.destroy()
    const currentYear = new Date().getFullYear()
    const repTotals = {}
    repYearData.filter(r => r.year === currentYear).forEach(r => { repTotals[r.rep_name] = (repTotals[r.rep_name] || 0) + (r.total_sales || 0) })
    const sorted = Object.entries(repTotals).sort((a, b) => b[1] - a[1])
    const top5 = sorted.slice(0, 5)
    const othersTotal = sorted.slice(5).reduce((s, [, v]) => s + v, 0)
    if (othersTotal > 0) top5.push(['Others', othersTotal])
    const colors = ['#3b82f6','#10b981','#f59e0b','#8b5cf6','#ef4444','#e2e8f0']
    repChartRef.current = new Chart(ctx, {
      type: 'doughnut',
      data: { labels: top5.map(r => r[0]), datasets: [{ data: top5.map(r => r[1]), backgroundColor: colors.slice(0, top5.length), borderWidth: 0 }] },
      options: { responsive: true, maintainAspectRatio: false, cutout: '65%', plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, padding: 12, font: { size: 11 } } } } }
    })
    return () => { if (repChartRef.current) repChartRef.current.destroy() }
  }, [loading, repYearData])

  const ytdSales  = invStats.totalAmount || 0
  const totalComm = repYearData.filter(r => r.year === new Date().getFullYear()).reduce((s, r) => s + (r.total_commission || 0), 0)

  const countCards = [
    { label: 'Customers',    value: custStats.active || 0, icon: 'bi-building',     bg: '#eff6ff', color: '#2563eb', link: '/customers/active' },
    { label: 'Invoices',     value: invStats.total || 0,   icon: 'bi-receipt',       bg: '#fef9c3', color: '#854d0e', link: '/invoices' },
    { label: 'Sales Reps',   value: repCount,               icon: 'bi-people',        bg: '#f0fdf4', color: '#16a34a', link: '/sales-reps/active' },
    { label: 'Commissions',  value: commCount,              icon: 'bi-cash-stack',    bg: '#faf5ff', color: '#9333ea', link: '/commissions' },
    { label: 'Users',        value: userCount,              icon: 'bi-person-gear',   bg: '#fef2f2', color: '#dc2626', link: '/admin/users' },
    { label: 'Suppliers',    value: 11,                     icon: 'bi-truck',         bg: '#ecfdf5', color: '#059669', link: '/customers/suppliers' },
  ]

  const kpis = [
    { label: 'YTD Sales',        value: fmt(ytdSales),  icon: 'bi-currency-dollar',  bg: '#eff6ff', color: '#2563eb' },
    { label: 'Total Commissions',value: fmt(totalComm), icon: 'bi-cash-stack',        bg: '#f0fdf4', color: '#16a34a' },
    { label: 'Unpaid Invoices',  value: invStats.unpaid || 0, icon: 'bi-exclamation-octagon', bg: '#fef2f2', color: '#dc2626' },
    { label: 'Active Customers', value: custStats.active || 0, icon: 'bi-people',    bg: '#faf5ff', color: '#9333ea' },
  ]

  if (loading) return <div className="text-center py-5"><div className="spinner-border text-primary"></div><p className="mt-2 text-muted">Loading dashboard...</p></div>

  return (
    <div style={{ width: '100%', overflowX: 'hidden' }}>
      <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
        <div>
          <h4 className="fw-bold mb-1">Dashboard</h4>
          <p className="text-muted mb-0 d-none d-md-block" style={{ fontSize: 13 }}>Welcome back! Here's your business overview.</p>
        </div>
      </div>

      <div className="row g-2 g-md-3 mb-3">
        {countCards.map((card, i) => (
          <div className="col-4 col-sm-4 col-md-4 col-lg-2" key={i}>
            <Link to={card.link} className="text-decoration-none">
              <div className="card border-0 shadow-sm h-100 text-center" style={{ borderRadius: 14, padding: '14px 8px', transition: 'transform .2s, box-shadow .2s' }}
                onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.12)' }}
                onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)' }}>
                <div className="d-flex align-items-center justify-content-center mx-auto mb-1" style={{ width: 36, height: 36, borderRadius: 10, background: card.bg, color: card.color, fontSize: '1rem' }}>
                  <i className={`bi ${card.icon}`}></i>
                </div>
                <div style={{ fontSize: 'clamp(1.2rem,3vw,1.8rem)', fontWeight: 800, lineHeight: 1.1, color: card.color }}>{card.value}</div>
                <div style={{ fontSize: 'clamp(.6rem,1.5vw,.78rem)', fontWeight: 600, color: '#64748b', marginTop: 2 }}>{card.label}</div>
              </div>
            </Link>
          </div>
        ))}
      </div>

      <div className="row g-2 g-md-3 mb-3">
        {kpis.map((kpi, i) => (
          <div className="col-6 col-md-3" key={i}>
            <div className="stat-card" style={{ padding: '16px 14px' }}>
              <div className="d-flex align-items-center gap-2 gap-md-3">
                <div className="stat-icon" style={{ background: kpi.bg, color: kpi.color, width: 42, height: 42, fontSize: '1.1rem', borderRadius: 12 }}><i className={`bi ${kpi.icon}`}></i></div>
                <div style={{ minWidth: 0 }}>
                  <div className="stat-value text-truncate" style={{ color: kpi.color, fontSize: 'clamp(1rem,2.5vw,1.6rem)' }}>{kpi.value}</div>
                  <div className="stat-label" style={{ fontSize: 'clamp(.65rem,1.5vw,.85rem)' }}>{kpi.label}</div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="row g-2 g-md-3 mb-3">
        <div className="col-12 col-lg-8">
          <div className="card border-0 shadow-sm rounded-4 h-100">
            <div className="card-body p-3">
              <h6 className="fw-bold mb-2">Monthly Revenue ({new Date().getFullYear()})</h6>
              <div style={{ height: 'clamp(200px,30vw,280px)' }}><canvas ref={revenueCanvasRef}></canvas></div>
            </div>
          </div>
        </div>
        <div className="col-12 col-lg-4">
          <div className="card border-0 shadow-sm rounded-4 h-100">
            <div className="card-body p-3">
              <h6 className="fw-bold mb-2">Sales by Rep</h6>
              <div style={{ height: 'clamp(200px,30vw,280px)' }}><canvas ref={repCanvasRef}></canvas></div>
            </div>
          </div>
        </div>
      </div>

      <div className="row g-2 g-md-3">
        <div className="col-12 col-lg-8">
          <div className="card border-0 shadow-sm rounded-4">
            <div className="card-body p-3">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <h6 className="fw-bold mb-0">Recent Invoices</h6>
                <Link to="/invoices" className="text-decoration-none small">View All <i className="bi bi-arrow-right"></i></Link>
              </div>
              <div className="table-responsive">
                <table className="table table-hover table-sm align-middle mb-0" style={{ fontSize: 13 }}>
                  <thead className="bg-light"><tr><th>Invoice #</th><th>Customer</th><th>Date</th><th className="text-end">Amount</th><th>Status</th></tr></thead>
                  <tbody>
                    {recentInvoices.length === 0
                      ? <tr><td colSpan="5" className="text-center text-muted py-3">No invoices</td></tr>
                      : recentInvoices.map((inv, i) => (
                        <tr key={i}>
                          <td className="fw-semibold">{inv.invoice_number || '-'}</td>
                          <td>{inv.company_name || '-'}</td>
                          <td>{inv.invoice_date ? new Date(inv.invoice_date).toLocaleDateString('en-US') : '-'}</td>
                          <td className="text-end fw-semibold">{fmt(inv.net_amount)}</td>
                          <td>
                            <span className={`badge ${inv.paid_value === 'PAID' || inv.paid_value === 'Paid' ? 'bg-success-subtle text-success' : 'bg-warning-subtle text-warning'}`} style={{ fontSize: 11 }}>
                              {inv.paid_value === 'PAID' || inv.paid_value === 'Paid' ? 'Paid' : 'Unpaid'}
                            </span>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
        <div className="col-12 col-lg-4">
          <div className="card border-0 shadow-sm rounded-4 h-100">
            <div className="card-body p-3">
              <h6 className="fw-bold mb-2">Quick Links</h6>
              {[
                { label: 'New Invoice',    icon: 'bi-plus-circle',      path: '/invoices',          bg: '#eff6ff', color: '#2563eb' },
                { label: 'Sales Reps',     icon: 'bi-people',           path: '/sales-reps/active', bg: '#f0fdf4', color: '#16a34a' },
                { label: 'Commissions',    icon: 'bi-cash-stack',       path: '/commissions',       bg: '#faf5ff', color: '#9333ea' },
                { label: 'Airfeet PO',     icon: 'bi-receipt',          path: '/airfeet-po',        bg: '#fef9c3', color: '#854d0e' },
                { label: 'Events',         icon: 'bi-calendar-event',   path: '/events',            bg: '#ecfdf5', color: '#059669' },
                { label: 'Reports',        icon: 'bi-graph-up',         path: '/reports',           bg: '#fef2f2', color: '#dc2626' },
              ].map((link, i) => (
                <Link key={i} to={link.path} className="d-flex align-items-center gap-3 p-2 rounded-3 text-decoration-none mb-2"
                  style={{ transition: 'background .2s' }}
                  onMouseOver={e => e.currentTarget.style.background = '#f8fafc'}
                  onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                  <div className="d-flex align-items-center justify-content-center" style={{ width: 36, height: 36, borderRadius: 10, background: link.bg, color: link.color, flexShrink: 0 }}>
                    <i className={`bi ${link.icon}`}></i>
                  </div>
                  <span className="fw-semibold" style={{ color: '#334155', fontSize: 13 }}>{link.label}</span>
                  <i className="bi bi-chevron-right ms-auto" style={{ color: '#94a3b8', fontSize: 12 }}></i>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// ROOT EXPORT — picks the right dashboard by role
// ─────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const user = getUser()
  const isSalesRep = user?.level === 'sales-rep'
  return isSalesRep ? <RepDashboard user={user} /> : <AdminDashboard />
}
