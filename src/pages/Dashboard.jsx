import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Chart, registerables } from 'chart.js'
import { api } from '../lib/api'

Chart.register(...registerables)

const fmt = v => '$' + (parseFloat(v) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export default function Dashboard() {
  const [loading, setLoading] = useState(true)
  const [custStats, setCustStats] = useState({})
  const [invStats, setInvStats] = useState({})
  const [repCount, setRepCount] = useState(0)
  const [commCount, setCommCount] = useState(0)
  const [userCount, setUserCount] = useState(0)
  const [recentInvoices, setRecentInvoices] = useState([])
  const [monthlyData, setMonthlyData] = useState([])
  const [repYearData, setRepYearData] = useState([])
  const revenueCanvasRef = useRef(null)
  const repCanvasRef = useRef(null)
  const revenueChartRef = useRef(null)
  const repChartRef = useRef(null)

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

  // Revenue chart - monthly sales for current year
  useEffect(() => {
    if (loading || !revenueCanvasRef.current) return
    const canvas = revenueCanvasRef.current
    const ctx = canvas.getContext('2d')
    if (revenueChartRef.current) revenueChartRef.current.destroy()

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
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

  // Rep doughnut chart - top reps by sales current year
  useEffect(() => {
    if (loading || !repCanvasRef.current) return
    const canvas = repCanvasRef.current
    const ctx = canvas.getContext('2d')
    if (repChartRef.current) repChartRef.current.destroy()

    const currentYear = new Date().getFullYear()
    const repTotals = {}
    repYearData.filter(r => r.year === currentYear).forEach(r => {
      repTotals[r.rep_name] = (repTotals[r.rep_name] || 0) + (r.total_sales || 0)
    })
    const sorted = Object.entries(repTotals).sort((a, b) => b[1] - a[1])
    const top5 = sorted.slice(0, 5)
    const othersTotal = sorted.slice(5).reduce((s, [, v]) => s + v, 0)
    if (othersTotal > 0) top5.push(['Others', othersTotal])
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#e2e8f0']

    repChartRef.current = new Chart(ctx, {
      type: 'doughnut',
      data: { labels: top5.map(r => r[0]), datasets: [{ data: top5.map(r => r[1]), backgroundColor: colors.slice(0, top5.length), borderWidth: 0 }] },
      options: { responsive: true, maintainAspectRatio: false, cutout: '65%', plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, padding: 12, font: { size: 11 } } } } }
    })
    return () => { if (repChartRef.current) repChartRef.current.destroy() }
  }, [loading, repYearData])

  const ytdSales = invStats.totalAmount || 0
  const totalComm = repYearData.filter(r => r.year === new Date().getFullYear()).reduce((s, r) => s + (r.total_commission || 0), 0)
  const unpaidCount = invStats.unpaid || 0

  const countCards = [
    { label: 'Customers', value: custStats.active || 0, icon: 'bi-building', bg: '#eff6ff', color: '#2563eb', link: '/customers/active' },
    { label: 'Invoices', value: invStats.total || 0, icon: 'bi-receipt', bg: '#fef9c3', color: '#854d0e', link: '/invoices' },
    { label: 'Sales Reps', value: repCount, icon: 'bi-people', bg: '#f0fdf4', color: '#16a34a', link: '/sales-reps/active' },
    { label: 'Commissions', value: commCount, icon: 'bi-cash-stack', bg: '#faf5ff', color: '#9333ea', link: '/commissions' },
    { label: 'Users', value: userCount, icon: 'bi-person-gear', bg: '#fef2f2', color: '#dc2626', link: '/admin/users' },
    { label: 'Suppliers', value: 11, icon: 'bi-truck', bg: '#ecfdf5', color: '#059669', link: '/customers/suppliers' },
  ]

  const kpis = [
    { label: 'YTD Sales', value: fmt(ytdSales), icon: 'bi-currency-dollar', bg: '#eff6ff', color: '#2563eb' },
    { label: 'Total Commissions', value: fmt(totalComm), icon: 'bi-cash-stack', bg: '#f0fdf4', color: '#16a34a' },
    { label: 'Unpaid Invoices', value: unpaidCount, icon: 'bi-exclamation-octagon', bg: '#fef2f2', color: '#dc2626' },
    { label: 'Active Customers', value: custStats.active || 0, icon: 'bi-people', bg: '#faf5ff', color: '#9333ea' },
  ]

  if (loading) return <div className="text-center py-5"><div className="spinner-border text-primary"></div><p className="mt-2 text-muted">Loading dashboard...</p></div>

  return (
    <div style={{ maxWidth: 'calc(100vw - 260px)', overflowX: 'hidden' }}>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 className="fw-bold mb-1">Dashboard</h4>
          <p className="text-muted mb-0" style={{ fontSize: 13 }}>Welcome back! Here's your business overview.</p>
        </div>
      </div>

      {/* Count Cards */}
      <div className="row g-3 mb-4">
        {countCards.map((card, i) => (
          <div className="col-md-4 col-lg-2" key={i}>
            <Link to={card.link} className="text-decoration-none">
              <div className="card border-0 shadow-sm h-100 text-center" style={{ borderRadius: 16, padding: '20px 12px', transition: 'transform 0.2s, box-shadow 0.2s' }}
                onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.12)' }}
                onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)' }}>
                <div className="d-flex align-items-center justify-content-center mx-auto mb-2" style={{ width: 44, height: 44, borderRadius: 12, background: card.bg, color: card.color, fontSize: '1.2rem' }}>
                  <i className={`bi ${card.icon}`}></i>
                </div>
                <div style={{ fontSize: '1.8rem', fontWeight: 800, lineHeight: 1.1, color: card.color }}>{card.value}</div>
                <div style={{ fontSize: '.78rem', fontWeight: 600, color: '#64748b', marginTop: 4 }}>{card.label}</div>
              </div>
            </Link>
          </div>
        ))}
      </div>

      {/* KPI Cards */}
      <div className="row g-3 mb-4">
        {kpis.map((kpi, i) => (
          <div className="col-md-3" key={i}>
            <div className="stat-card">
              <div className="d-flex align-items-center gap-3">
                <div className="stat-icon" style={{ background: kpi.bg, color: kpi.color }}><i className={`bi ${kpi.icon}`}></i></div>
                <div>
                  <div className="stat-value" style={{ color: kpi.color }}>{kpi.value}</div>
                  <div className="stat-label">{kpi.label}</div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="row g-3 mb-4">
        <div className="col-lg-8">
          <div className="card border-0 shadow-sm rounded-4 h-100">
            <div className="card-body">
              <h5 className="fw-bold mb-3">Monthly Revenue ({new Date().getFullYear()})</h5>
              <div style={{ height: 280 }}><canvas ref={revenueCanvasRef}></canvas></div>
            </div>
          </div>
        </div>
        <div className="col-lg-4">
          <div className="card border-0 shadow-sm rounded-4 h-100">
            <div className="card-body">
              <h5 className="fw-bold mb-3">Sales by Rep</h5>
              <div style={{ height: 280 }}><canvas ref={repCanvasRef}></canvas></div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Invoices + Quick Links */}
      <div className="row g-3">
        <div className="col-lg-8">
          <div className="card border-0 shadow-sm rounded-4">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="fw-bold mb-0">Recent Invoices</h5>
                <Link to="/invoices" className="text-decoration-none small">View All <i className="bi bi-arrow-right"></i></Link>
              </div>
              <div className="table-responsive">
                <table className="table table-hover table-sm align-middle mb-0" style={{ fontSize: 13 }}>
                  <thead className="bg-light"><tr><th>Invoice #</th><th>Customer</th><th>Date</th><th className="text-end">Amount</th><th>Status</th></tr></thead>
                  <tbody>
                    {recentInvoices.length === 0 ? <tr><td colSpan="5" className="text-center text-muted py-3">No invoices</td></tr> :
                    recentInvoices.map((inv, i) => (
                      <tr key={i}>
                        <td className="fw-semibold">{inv.invoice_number || '-'}</td>
                        <td>{inv.company_name || '-'}</td>
                        <td>{inv.invoice_date ? new Date(inv.invoice_date).toLocaleDateString('en-US') : '-'}</td>
                        <td className="text-end fw-semibold">{fmt(inv.net_amount)}</td>
                        <td>
                          <span className={`badge ${inv.paid_value === 'PAID' || inv.paid_value === 'Paid' ? 'bg-success-subtle text-success' : 'bg-warning-subtle text-warning'}`} style={{ fontSize: 11 }}>
                            {inv.paid_value === 'PAID' || inv.paid_value === 'Paid' ? 'Paid' : inv.paid_value === 'Unpaid' ? 'Unpaid' : 'Pending'}
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
        <div className="col-lg-4">
          <div className="card border-0 shadow-sm rounded-4 h-100">
            <div className="card-body">
              <h5 className="fw-bold mb-3">Quick Links</h5>
              {[
                { label: 'New Invoice', icon: 'bi-plus-circle', path: '/invoices', bg: '#eff6ff', color: '#2563eb' },
                { label: 'Sales Reps', icon: 'bi-people', path: '/sales-reps/active', bg: '#f0fdf4', color: '#16a34a' },
                { label: 'Commissions', icon: 'bi-cash-stack', path: '/commissions', bg: '#faf5ff', color: '#9333ea' },
                { label: 'Airfeet PO', icon: 'bi-receipt', path: '/airfeet-po', bg: '#fef9c3', color: '#854d0e' },
                { label: 'Events', icon: 'bi-calendar-event', path: '/events', bg: '#ecfdf5', color: '#059669' },
                { label: 'Reports', icon: 'bi-graph-up', path: '/reports', bg: '#fef2f2', color: '#dc2626' },
              ].map((link, i) => (
                <Link key={i} to={link.path} className="d-flex align-items-center gap-3 p-2 rounded-3 text-decoration-none mb-2" style={{ transition: 'background 0.2s' }}
                  onMouseOver={e => e.currentTarget.style.background = '#f8fafc'} onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
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
