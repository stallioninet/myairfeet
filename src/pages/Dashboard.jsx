import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Chart, registerables } from 'chart.js'
import { api } from '../lib/api'

Chart.register(...registerables)

const countCards = [
  { label: 'Customers', value: 189, icon: 'bi-building', bg: '#eff6ff', color: '#2563eb', link: '/customers/active' },
  { label: 'Invoices', value: 218, icon: 'bi-receipt', bg: '#fef9c3', color: '#854d0e', link: '/invoices' },
  { label: 'Sales Reps', value: 14, icon: 'bi-people', bg: '#f0fdf4', color: '#16a34a', link: '/sales-reps/active' },
  { label: 'Commissions', value: 47, icon: 'bi-cash-stack', bg: '#faf5ff', color: '#9333ea', link: '/commissions' },
  { label: 'Users', value: 0, icon: 'bi-person-gear', bg: '#fef2f2', color: '#dc2626', link: '/admin/users', dynamic: true },
  { label: 'Payments', value: 156, icon: 'bi-credit-card', bg: '#ecfdf5', color: '#059669', link: '/commissions/payments' },
]

const kpis = [
  { label: 'YTD Sales', value: '$142,580', icon: 'bi-currency-dollar', bg: '#eff6ff', color: '#2563eb' },
  { label: 'Total Commissions', value: '$21,387', icon: 'bi-cash-stack', bg: '#f0fdf4', color: '#16a34a' },
  { label: 'Overdue Invoices', value: '12', icon: 'bi-exclamation-octagon', bg: '#fef2f2', color: '#dc2626' },
  { label: 'Active Customers', value: '189', icon: 'bi-people', bg: '#faf5ff', color: '#9333ea' },
]

const outstandingInvoices = [
  { id: 'INV-2026-0130', customer: 'Tech Solutions', due: 'Jan 15, 2026', amount: '$5,400.00', days: 32, age: '31-60' },
  { id: 'INV-2026-0125', customer: 'Global Industries', due: 'Jan 20, 2026', amount: '$3,200.00', days: 45, age: '31-60' },
  { id: 'INV-2025-0980', customer: 'Summit Health', due: 'Dec 02, 2025', amount: '$2,100.00', days: 76, age: '61-90' },
  { id: 'INV-2025-0975', customer: 'Acme Corp', due: 'Nov 28, 2025', amount: '$1,500.00', days: 85, age: '61-90' },
  { id: 'INV-2025-0901', customer: 'Pacific Retail', due: 'Oct 18, 2025', amount: '$4,680.00', days: 121, age: '90+' },
]

const payments = [
  { initials: 'AC', name: 'Acme Corporation', amount: '$3,250.00', method: 'Wire Transfer', invoice: 'INV-2026-0138', rep: 'Sarah Johnson', repInitials: 'SJ', date: 'Feb 14', bg: '#eff6ff', color: '#2563eb' },
  { initials: 'SH', name: 'Summit Health', amount: '$2,100.00', method: 'Check #4521', invoice: 'INV-2026-0135', rep: 'Mike Peters', repInitials: 'MP', date: 'Feb 10', bg: '#f0fdf4', color: '#16a34a' },
  { initials: 'RM', name: 'Riverside Medical', amount: '$6,120.00', method: 'ACH Transfer', invoice: 'INV-2026-0132', rep: 'Lisa Chen', repInitials: 'LC', date: 'Feb 05', bg: '#fff7ed', color: '#ea580c' },
  { initials: 'BA', name: 'Blue Sky Athletics', amount: '$1,540.00', method: 'Check #4498', invoice: 'INV-2026-0128', rep: 'Tom Williams', repInitials: 'TW', date: 'Jan 28', bg: '#faf5ff', color: '#9333ea' },
]

const revenueData = {
  labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  values: [18200, 22400, 19800, 24500, 21300, 26800, 23400, 28100, 25600, 0, 0, 0],
}

const repData = [
  { name: 'Sarah J.', value: 32400, color: '#3b82f6' },
  { name: 'Mike P.', value: 28100, color: '#10b981' },
  { name: 'Lisa C.', value: 24300, color: '#f59e0b' },
  { name: 'Tom W.', value: 18900, color: '#8b5cf6' },
  { name: 'Others', value: 38880, color: '#e2e8f0' },
]

export default function Dashboard() {
  const [userCount, setUserCount] = useState(0)
  const [agingFilter, setAgingFilter] = useState('all')
  const revenueCanvasRef = useRef(null)
  const repCanvasRef = useRef(null)
  const revenueChartRef = useRef(null)
  const repChartRef = useRef(null)

  useEffect(() => {
    api.getUsers().then(data => {
      setUserCount(data.length)
    }).catch(() => {})
  }, [])

  // Revenue chart
  useEffect(() => {
    const canvas = revenueCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    // Cleanup previous
    if (revenueChartRef.current) revenueChartRef.current.destroy()

    const gradient = ctx.createLinearGradient(0, 0, 0, 280)
    gradient.addColorStop(0, 'rgba(37,99,235,0.15)')
    gradient.addColorStop(1, 'rgba(37,99,235,0)')

    revenueChartRef.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels: revenueData.labels,
        datasets: [{
          label: 'Revenue',
          data: revenueData.values,
          borderColor: '#2563eb',
          backgroundColor: gradient,
          fill: true,
          tension: 0.4,
          pointRadius: 4,
          pointBackgroundColor: '#2563eb',
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { callback: v => '$' + (v / 1000) + 'k' }
          }
        }
      }
    })

    return () => { if (revenueChartRef.current) revenueChartRef.current.destroy() }
  }, [])

  // Rep chart
  useEffect(() => {
    const canvas = repCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    if (repChartRef.current) repChartRef.current.destroy()

    repChartRef.current = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: repData.map(r => r.name),
        datasets: [{
          data: repData.map(r => r.value),
          backgroundColor: repData.map(r => r.color),
          borderWidth: 0,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '65%',
        plugins: {
          legend: { position: 'bottom', labels: { boxWidth: 12, padding: 12, font: { size: 11 } } }
        }
      }
    })

    return () => { if (repChartRef.current) repChartRef.current.destroy() }
  }, [])

  const filteredInvoices = agingFilter === 'all'
    ? outstandingInvoices
    : outstandingInvoices.filter(inv => inv.age === agingFilter)

  const agingCounts = {
    all: outstandingInvoices.length,
    '0-30': outstandingInvoices.filter(i => i.age === '0-30').length,
    '31-60': outstandingInvoices.filter(i => i.age === '31-60').length,
    '61-90': outstandingInvoices.filter(i => i.age === '61-90').length,
    '90+': outstandingInvoices.filter(i => i.age === '90+').length,
  }

  const wsLinks = [
    { label: 'Dashboard', icon: 'bi-grid-1x2-fill', path: '/dashboard', active: true },
    { label: 'Customers', icon: 'bi-building', path: '/customers/active' },
    { label: 'Users', icon: 'bi-person-lines-fill', path: '/admin/users' },
    { label: 'Sales Reps', icon: 'bi-people', path: '/sales-reps/active' },
    { label: 'Invoices', icon: 'bi-receipt', path: '/invoices' },
    { label: 'Commissions', icon: 'bi-cash-stack', path: '/commissions' },
    { label: 'Reports', icon: 'bi-graph-up', path: '/reports' },
    { label: 'Airfeet PO', icon: 'bi-box-seam', path: '/airfeet-po' },
    { label: 'Events', icon: 'bi-calendar-event', path: '/events' },
  ]

  return (
    <>
      {/* Workspace Navigation */}
      <div className="d-flex flex-wrap gap-2 mb-4" style={{ background: '#fff', borderRadius: 12, padding: '12px 16px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
        {wsLinks.map((link, i) => (
          <Link key={i} to={link.path} className="d-flex align-items-center gap-2 text-decoration-none px-3 py-2"
            style={{
              borderRadius: 8, fontSize: 13, fontWeight: 600, transition: 'all 0.15s',
              background: link.active ? '#2563eb' : '#f1f5f9',
              color: link.active ? '#fff' : '#475569',
            }}
            onMouseEnter={e => { if (!link.active) { e.currentTarget.style.background = '#e2e8f0' } }}
            onMouseLeave={e => { if (!link.active) { e.currentTarget.style.background = '#f1f5f9' } }}
          >
            <i className={`bi ${link.icon}`} style={{ fontSize: 14 }}></i>
            {link.label}
          </Link>
        ))}
      </div>

      {/* Welcome Banner */}
      <div className="mb-4" style={{
        background: 'linear-gradient(135deg, #2563eb 0%, #1e40af 100%)',
        borderRadius: 20, padding: '28px 32px', color: '#fff', position: 'relative', overflow: 'hidden'
      }}>
        <div style={{
          position: 'absolute', top: -80, right: -80, width: 250, height: 250,
          background: 'rgba(255,255,255,.08)', borderRadius: '50%'
        }}></div>
        <p className="mb-0" style={{ opacity: 0.9 }}>
          You have <strong>12 overdue invoices</strong> and <strong>$8,420</strong> in pending commissions. Your sales are up 12% this month.
        </p>
      </div>

      {/* Quick Actions */}
      <div className="row g-3 mb-4">
        <div className="col-12">
          <div className="card border-0 shadow-sm rounded-4 p-3" style={{ background: '#f8fafc' }}>
            <div className="d-flex align-items-center gap-3 overflow-auto pb-1" style={{ scrollbarWidth: 'thin' }}>
              <span className="fw-bold text-muted small text-nowrap">
                <i className="bi bi-lightning-fill text-warning me-1"></i>QUICK ACTIONS:
              </span>
              {[
                { label: 'New Invoice', icon: 'bi-plus-lg', color: 'text-primary' },
                { label: 'New Customer', icon: 'bi-building-add', color: 'text-success' },
                { label: 'Record Payment', icon: 'bi-cash-coin', color: 'text-info' },
                { label: 'Email Center', icon: 'bi-envelope-at', color: 'text-warning' },
                { label: 'Manage Reps', icon: 'bi-people', color: 'text-purple' },
                { label: 'Manage Users', icon: 'bi-person-gear', color: 'text-danger', link: '/admin/users' },
              ].map((action, i) => (
                <Link
                  key={i}
                  to={action.link || '#'}
                  className="btn btn-white shadow-sm rounded-pill btn-sm px-3 text-nowrap"
                  style={{ background: '#fff', border: '1px solid #e2e8f0' }}
                >
                  <i className={`bi ${action.icon} me-1 ${action.color}`}></i>{action.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Count Cards */}
      <div className="row g-3 mb-4">
        {countCards.map((card, i) => (
          <div className="col-6 col-md-4 col-lg-2" key={i}>
            <Link to={card.link || '#'} className="text-decoration-none">
              <div className="stat-card text-center h-100" style={{ transition: 'transform 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-3px)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'none'}
              >
                <div className="stat-icon mx-auto mb-2" style={{ background: card.bg, color: card.color }}>
                  <i className={`bi ${card.icon}`}></i>
                </div>
                <div className="stat-value">{card.dynamic ? userCount : card.value}</div>
                <div className="stat-label">{card.label}</div>
              </div>
            </Link>
          </div>
        ))}
      </div>

      {/* KPI Row */}
      <div className="row g-3 mb-4">
        {kpis.map((kpi, i) => (
          <div className="col-6 col-lg-3" key={i}>
            <div className="stat-card">
              <div className="d-flex align-items-center gap-3">
                <div className="stat-icon" style={{ background: kpi.bg, color: kpi.color }}>
                  <i className={`bi ${kpi.icon}`}></i>
                </div>
                <div>
                  <div className="stat-value">{kpi.value}</div>
                  <div className="stat-label">{kpi.label}</div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="row g-4 mb-4">
        <div className="col-lg-8">
          <div className="card border-0 shadow-sm rounded-4 p-3">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="fw-bold mb-0">Monthly Revenue</h5>
              <select className="form-select form-select-sm" style={{ width: 'auto' }}>
                <option>2026</option>
                <option>2025</option>
              </select>
            </div>
            <div style={{ height: 280 }}><canvas ref={revenueCanvasRef}></canvas></div>
          </div>
        </div>
        <div className="col-lg-4">
          <div className="card border-0 shadow-sm rounded-4 p-3">
            <h5 className="fw-bold mb-3">Sales by Rep</h5>
            <div style={{ height: 280 }}><canvas ref={repCanvasRef}></canvas></div>
          </div>
        </div>
      </div>

      {/* Outstanding Invoices */}
      <div className="card border-0 shadow-sm rounded-4 mb-4">
        <div className="card-header bg-white border-0 pt-4 px-4 pb-0">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h5 className="fw-bold mb-0">
              <i className="bi bi-clock-history text-danger me-2"></i>Outstanding Invoices
            </h5>
            <Link to="/invoices" className="btn btn-sm btn-outline-primary rounded-pill">View All</Link>
          </div>
          <div className="p-3 rounded-4 mb-3" style={{ background: '#f8fafc' }}>
            <div className="mb-2">
              <span className="fw-bold small text-muted text-uppercase" style={{ letterSpacing: 1 }}>Days Overdue</span>
            </div>
            <div className="d-flex flex-wrap gap-2">
              {['all', '0-30', '31-60', '61-90', '90+'].map(age => (
                <button
                  key={age}
                  className={`btn btn-sm rounded-pill px-3 ${agingFilter === age
                    ? 'btn-primary'
                    : 'btn-outline-secondary'}`}
                  onClick={() => setAgingFilter(age)}
                >
                  {age === 'all' ? 'All' : age === '90+' ? '90+ Days' : `${age} Days`}
                  <span className="badge bg-white bg-opacity-25 text-dark ms-1">{agingCounts[age]}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="card-body p-0 pt-3">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead style={{ background: '#f8fafc' }}>
                <tr>
                  <th className="ps-4">Invoice #</th>
                  <th>Customer</th>
                  <th>Due Date</th>
                  <th>Amount</th>
                  <th>Days Overdue</th>
                  <th>Status</th>
                  <th className="text-end pe-4">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.length === 0 ? (
                  <tr><td colSpan="7" className="text-center py-4 text-muted">No invoices in this range</td></tr>
                ) : filteredInvoices.map(inv => (
                  <tr key={inv.id}>
                    <td className="ps-4 fw-semibold">{inv.id}</td>
                    <td>{inv.customer}</td>
                    <td>{inv.due}</td>
                    <td className="fw-bold">{inv.amount}</td>
                    <td>
                      <span className={`badge rounded-pill ${inv.days > 90 ? 'bg-danger-subtle text-danger' : inv.days > 60 ? 'bg-danger-subtle text-danger' : 'bg-warning-subtle text-warning'}`}>
                        {inv.days} days
                      </span>
                    </td>
                    <td>
                      <span style={{
                        display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
                        background: '#dc2626', marginRight: 6
                      }}></span>
                      Overdue
                    </td>
                    <td className="text-end pe-4">
                      <button className="btn btn-sm btn-outline-danger rounded-pill">
                        <i className="bi bi-envelope me-1"></i>Urgent
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Payments Received */}
      <div className="card border-0 shadow-sm rounded-4">
        <div className="card-header bg-white border-0 pt-4 px-4 pb-0">
          <div className="d-flex justify-content-between align-items-start mb-3">
            <div>
              <h5 className="fw-bold mb-0">
                <i className="bi bi-check-circle text-success me-2"></i>Payments Received
              </h5>
              <p className="text-muted small mb-0 mt-1">
                Total Received (Last 30 Days): <strong className="text-dark">$13,010</strong>
                <span className="badge bg-success-subtle text-success ms-2">
                  <i className="bi bi-graph-up me-1"></i>+8%
                </span>
              </p>
            </div>
            <Link to="/commissions/payments" className="btn btn-sm btn-outline-primary rounded-pill">View All</Link>
          </div>
        </div>
        <div className="card-body p-0">
          <div className="list-group list-group-flush">
            {payments.map((pay, i) => (
              <div key={i} className="list-group-item bg-transparent border-0 px-4 py-3">
                <div className="d-flex align-items-center">
                  <div className="me-3" style={{
                    background: pay.bg, color: pay.color, width: 42, height: 42,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    borderRadius: 12, fontWeight: 700
                  }}>
                    {pay.initials}
                  </div>
                  <div className="flex-grow-1">
                    <div className="d-flex justify-content-between">
                      <h6 className="mb-0 fw-bold">{pay.name}</h6>
                      <span className="fw-bold text-success">{pay.amount}</span>
                    </div>
                    <div className="d-flex justify-content-between align-items-center mt-1">
                      <div className="small text-muted">
                        <i className="bi bi-bank me-1"></i>{pay.method} &bull; {pay.invoice}
                      </div>
                      <div className="small text-muted d-flex align-items-center">
                        <div className="rounded-circle bg-light d-flex align-items-center justify-content-center me-2"
                          style={{ width: 20, height: 20, fontSize: 10 }}>
                          {pay.repInitials}
                        </div>
                        {pay.rep} &bull; {pay.date}
                      </div>
                    </div>
                  </div>
                  <div className="ms-3">
                    <i className="bi bi-check-circle-fill text-success" style={{ fontSize: '1.1rem' }}></i>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
