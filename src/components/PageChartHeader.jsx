import React, { useState } from 'react'
import { Line, Bar, Doughnut, Pie } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler
} from 'chart.js'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler
)

export default function PageChartHeader({
  title,
  subtitle,
  breadcrumbs = [],
  stats = [],
  chartData,
  chartType = 'line',
  chartHeight = 220,
  actions,
  extraContent
}) {
  const [activeType, setActiveType] = useState(chartType)
  
  const ChartComponent = activeType === 'bar' ? Bar : 
                        activeType === 'pie' ? Pie :
                        activeType === 'doughnut' ? Doughnut : Line

  const isPieOrDoughnut = activeType === 'pie' || activeType === 'doughnut'

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: isPieOrDoughnut, position: 'bottom', labels: { usePointStyle: true, font: { size: 10 } } },
      tooltip: {
        backgroundColor: '#1e293b',
        padding: 12,
        titleFont: { size: 14, weight: 'bold' },
        bodyFont: { size: 13 },
      }
    },
    onClick: (event, elements) => {
      if (elements.length > 0 && chartData.onSliceClick) {
        const index = elements[0].index
        chartData.onSliceClick(index, chartData.labels[index])
      }
    },
    scales: isPieOrDoughnut ? {} : {
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(0,0,0,0.05)', drawBorder: false },
        ticks: { font: { size: 11 }, color: '#64748b' }
      },
      x: {
        grid: { display: false },
        ticks: { font: { size: 11 }, color: '#64748b' }
      }
    }
  }

  return (
    <div className="mb-4">
      {/* Page Title & Actions */}
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
        <div>
          {breadcrumbs.length > 0 && (
            <nav aria-label="breadcrumb">
              <ol className="breadcrumb mb-1" style={{ fontSize: 13 }}>
                {breadcrumbs.map((b, i) => (
                  <li key={i} className={`breadcrumb-item ${i === breadcrumbs.length - 1 ? 'active' : ''}`}>
                    {b.link ? <a href={b.link} className="text-decoration-none">{b.label}</a> : b.label}
                  </li>
                ))}
              </ol>
            </nav>
          )}
          <h3 className="fw-bold mb-0 text-dark">{title}</h3>
          {subtitle && <p className="text-muted mb-0 small">{subtitle}</p>}
        </div>
        <div className="d-flex gap-2">{actions}</div>
      </div>

      <div className="row g-3">
        {/* Stats Section */}
        <div className="col-12 col-xl-4">
          <div className="row g-2 h-100">
            {stats.map((stat, i) => (
              <div key={i} className="col-6" onClick={stat.onClick} style={{ cursor: stat.onClick ? 'pointer' : 'default' }}>
                <div className={`card border-0 shadow-sm h-100 p-3 ${stat.onClick ? 'hover-scale' : ''}`} 
                     style={{ borderRadius: 16, background: '#fff', transition: 'all 0.2s' }}>
                  <div className="d-flex align-items-center gap-2 mb-2">
                    <div className="d-flex align-items-center justify-content-center rounded-3" 
                         style={{ width: 32, height: 32, background: stat.bg || '#eff6ff', color: stat.color || '#2563eb' }}>
                      <i className={`bi ${stat.icon}`}></i>
                    </div>
                    <span className="text-muted small fw-medium">{stat.label}</span>
                  </div>
                  <div className="fs-4 fw-bold" style={{ color: stat.color || '#1e293b' }}>{stat.value}</div>
                  {stat.trend && (
                    <div className={`small mt-1 ${stat.trend > 0 ? 'text-success' : 'text-danger'}`}>
                      <i className={`bi bi-graph-${stat.trend > 0 ? 'up' : 'down'} me-1`}></i>
                      {Math.abs(stat.trend)}% from last month
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Chart Section */}
        <div className={`col-12 ${extraContent ? 'col-xl-5' : 'col-xl-8'}`}>
          <div className="card border-0 shadow-sm p-3 h-100" style={{ borderRadius: 20, background: 'linear-gradient(to right, #ffffff, #f8fafc)' }}>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h6 className="fw-bold mb-0">Analytics Overview</h6>
              <div className="d-flex bg-light p-1 rounded-pill" style={{ border: '1px solid #e2e8f0' }}>
                {[
                  { id: 'line', icon: 'bi-graph-up' },
                  { id: 'bar', icon: 'bi-bar-chart' },
                  { id: 'pie', icon: 'bi-pie-chart' },
                  { id: 'doughnut', icon: 'bi-circle' }
                ].map(type => (
                  <button
                    key={type.id}
                    className={`btn btn-sm rounded-pill p-0 d-flex align-items-center justify-content-center ${activeType === type.id ? 'bg-white shadow-sm text-primary' : 'text-muted'}`}
                    style={{ width: 28, height: 28, fontSize: '0.8rem', border: 'none', transition: 'all 0.2s' }}
                    onClick={() => setActiveType(type.id)}
                    title={type.id.charAt(0).toUpperCase() + type.id.slice(1)}
                  >
                    <i className={`bi ${type.icon}`}></i>
                  </button>
                ))}
              </div>
            </div>
            <div style={{ height: chartHeight }}>
              {chartData ? (
                <ChartComponent data={chartData} options={chartOptions} />
              ) : (
                <div className="d-flex align-items-center justify-content-center h-100 text-muted italic small">
                  Loading chart data...
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Extra Content Section (e.g., Top Buyers) */}
        {extraContent && (
          <div className="col-12 col-xl-3">
            {extraContent}
          </div>
        )}
      </div>
    </div>
  )
}
