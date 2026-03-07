import { useState, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../../../lib/api'
import toast from 'react-hot-toast'
import Pagination from '../../../components/Pagination'

function formatDate(dateStr) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ' ' +
    d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

function exportCSV(data, userName) {
  var headers = ['Sno', 'Date', 'IP Address', 'Client Browser', 'URL', 'Referer Page', 'Message']
  var rows = data.map(function(a, i) {
    return [i + 1, formatDate(a.created_at), a.ip_address || '', a.client_browser || '',
      a.url || '', a.referer_page || '', a.message || a.description || '']
  })
  var csv = [headers].concat(rows).map(function(r) { return r.map(function(c) { return '"' + c + '"' }).join(',') }).join('\n')
  var blob = new Blob([csv], { type: 'text/csv' })
  var u = URL.createObjectURL(blob)
  var link = document.createElement('a')
  link.href = u
  link.download = 'activity-' + (userName || 'user') + '.csv'
  link.click()
  URL.revokeObjectURL(u)
}

function buildPrintHTML(data, userName) {
  var head = ['Sno', 'Date', 'IP Address', 'Client Browser', 'URL', 'Referer Page', 'Message']
  var thRow = head.map(function(h) { return '<th>' + h + '<\/th>' }).join('')
  var bodyRows = data.map(function(a, i) {
    var cells = [i + 1, formatDate(a.created_at), a.ip_address || '-', a.client_browser || '-',
      a.url || '-', a.referer_page || '-', a.message || a.description || '-']
    return '<tr>' + cells.map(function(c) { return '<td>' + c + '<\/td>' }).join('') + '<\/tr>'
  }).join('')
  if (!bodyRows) bodyRows = '<tr><td colspan="7" style="text-align:center">No data available<\/td><\/tr>'
  return '<html><head><title>Activity - ' + userName + '<\/title>' +
    '<style>body{font-family:Arial,sans-serif;padding:20px}h2{color:#1e40af}' +
    'table{width:100%;border-collapse:collapse;margin-top:15px}' +
    'th,td{border:1px solid #ddd;padding:8px;text-align:left;font-size:12px}' +
    'th{background:#2563eb;color:#fff}<\/style><\/head><body>' +
    '<h2>Users Activity View - ' + userName + '<\/h2>' +
    '<table><thead><tr>' + thRow + '<\/tr><\/thead><tbody>' + bodyRows + '<\/tbody><\/table>' +
    '<script>window.print()<\/script><\/body><\/html>'
}

function exportPDF(data, userName) {
  var win = window.open('', '_blank')
  win.document.write(buildPrintHTML(data, userName))
  win.document.close()
}

function handlePrint(data, userName) {
  exportPDF(data, userName)
}

export default function UserActivityView() {
  const { id } = useParams()
  const [user, setUser] = useState(null)
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(10)

  useEffect(() => {
    Promise.all([
      api.getUser(id),
      api.getUserActivityByUser(id),
    ]).then(([u, acts]) => {
      setUser(u)
      setActivities(acts)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [id])

  let filtered = activities
  if (search.trim()) {
    const s = search.toLowerCase()
    filtered = filtered.filter(a =>
      a.ip_address?.toLowerCase().includes(s) ||
      a.client_browser?.toLowerCase().includes(s) ||
      a.url?.toLowerCase().includes(s) ||
      a.message?.toLowerCase().includes(s)
    )
  }

  const userName = user ? `${user.first_name} ${user.last_name}` : 'User'

  if (loading) return <div className="p-4">Loading...</div>

  return (
    <>
      {/* Page Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <nav aria-label="breadcrumb">
            <ol className="breadcrumb mb-1">
              <li className="breadcrumb-item"><Link to="/"><i className="bi bi-house-door"></i></Link></li>
              <li className="breadcrumb-item"><Link to="/admin/activity">Users Activity</Link></li>
              <li className="breadcrumb-item active">Users Activity View</li>
            </ol>
          </nav>
          <h3 className="mb-0">Users Activity View</h3>
        </div>
      </div>

      {/* Activity Table */}
      <div className="card border-0 shadow-sm">
        <div className="card-header py-3 border-0" style={{ background: 'linear-gradient(135deg, #2563eb, #1e40af)', color: '#fff' }}>
          <div className="d-flex justify-content-between align-items-center">
            <h5 className="mb-0">
              <i className="bi bi-people me-2"></i>
              Users List {user ? `- ${user.first_name} ${user.last_name}` : ''}
            </h5>
            <div className="d-flex gap-2">
              <button className="btn btn-sm btn-light" onClick={() => handlePrint(filtered, userName)}>Print</button>
              <button className="btn btn-sm btn-light" onClick={() => exportPDF(filtered, userName)}>PDF</button>
              <button className="btn btn-sm btn-light" onClick={() => exportCSV(filtered, userName)}>CSV</button>
            </div>
          </div>
        </div>
        <div className="card-body p-0">
          {/* Search */}
          <div className="d-flex justify-content-end p-3 pb-0">
            <div className="input-group" style={{ maxWidth: 260 }}>
              <span className="input-group-text bg-white"><i className="bi bi-search"></i></span>
              <input type="text" className="form-control" placeholder="Search..." value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
            </div>
          </div>

          <div className="table-responsive">
            <table className="table table-hover mb-0 align-middle">
              <thead className="bg-light">
                <tr>
                  <th className="ps-4" style={{ width: 60 }}>Sno</th>
                  <th>Date</th>
                  <th>IP Address</th>
                  <th>Client Browser</th>
                  <th>URL</th>
                  <th>Referer Page</th>
                  <th>Message</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan="7" className="text-center py-4 text-muted">No data available in table</td></tr>
                ) : filtered.slice((page - 1) * perPage, page * perPage).map((a, index) => (
                  <tr key={a._id}>
                    <td className="ps-4 text-muted">{(page - 1) * perPage + index + 1}</td>
                    <td style={{ fontSize: '0.85rem' }}>{formatDate(a.created_at)}</td>
                    <td>{a.ip_address || '-'}</td>
                    <td>{a.client_browser || '-'}</td>
                    <td>{a.url || '-'}</td>
                    <td>{a.referer_page || '-'}</td>
                    <td>{a.message || a.description || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filtered.length === 0 && (
            <div className="px-3 pb-3 text-success" style={{ fontSize: '0.85rem' }}>No entries found</div>
          )}
          <Pagination total={filtered.length} page={page} perPage={perPage} onPageChange={setPage} onPerPageChange={setPerPage} />
        </div>
      </div>
    </>
  )
}
