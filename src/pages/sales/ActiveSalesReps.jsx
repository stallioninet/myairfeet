import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { api } from '../../lib/api'
import Pagination from '../../components/Pagination'
import exportCSV from '../../lib/exportCSV'

const avatarColors = ['#2563eb', '#7c3aed', '#06b6d4', '#16a34a', '#f59e0b', '#ef4444', '#ec4899', '#8b5cf6']

function hashColor(name) {
  let h = 0
  for (let i = 0; i < name.length; i++) { h = ((h << 5) - h) + name.charCodeAt(i); h |= 0 }
  return avatarColors[Math.abs(h) % avatarColors.length]
}

function initials(name) {
  return (name || '').split(' ').map(w => w[0] || '').join('').toUpperCase()
}

export default function ActiveSalesReps() {
  const [reps, setReps] = useState([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ total: 0, active: 0, inactive: 0 })
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(10)
  const [deactivateRep, setDeactivateRep] = useState(null)

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    setLoading(true)
    try {
      const [data, statsData] = await Promise.all([
        api.getSalesReps('active'),
        api.getSalesRepStats()
      ])
      setReps(data || [])
      setStats(statsData || { total: 0, active: 0, inactive: 0 })
    } catch (err) {
      toast.error('Failed to load sales reps: ' + err.message)
    }
    setLoading(false)
  }

  async function handleDeactivate() {
    if (!deactivateRep) return
    try {
      await api.deactivateSalesRep(deactivateRep._id)
      toast.success((deactivateRep.first_name + ' ' + deactivateRep.last_name) + ' deactivated')
      setDeactivateRep(null)
      fetchData()
    } catch (err) {
      toast.error('Failed to deactivate: ' + err.message)
    }
  }

  async function handleSeed() {
    try {
      const res = await api.seedSalesReps()
      toast.success(res.message)
      fetchData()
    } catch (err) {
      toast.error(err.message)
    }
  }

  function handleExport() {
    const headers = ['REP #', 'Name', 'Email', 'Phone', 'Territory', 'Commission %', 'City', 'State', 'Status']
    const rows = reps.map(r => [r.rep_number, r.first_name + ' ' + r.last_name, r.email, r.phone, r.territory, r.commission_rate, r.city, r.state, r.status])
    exportCSV(rows, headers, 'active-sales-reps')
  }

  const totalPages = Math.ceil(reps.length / perPage)
  const paginatedReps = reps.slice((page - 1) * perPage, page * perPage)

  return (
    <div>
      {/* Page Header */}
      <div className="d-flex justify-content-between align-items-start mb-4 flex-wrap gap-2">
        <div>
          <h2 className="mb-1">Sales Representatives</h2>
          <nav aria-label="breadcrumb">
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item"><Link to="/dashboard"><i className="bi bi-house-door"></i></Link></li>
              <li className="breadcrumb-item active">Sales Representatives</li>
            </ol>
          </nav>
        </div>
        <div className="d-flex gap-2">
          {reps.length === 0 && !loading && (
            <button className="btn btn-outline-info" onClick={handleSeed}>
              <i className="bi bi-database me-1"></i> Seed Data
            </button>
          )}
          <button className="btn btn-outline-secondary" onClick={handleExport}>
            <i className="bi bi-download me-1"></i> Export
          </button>
          <Link to="/sales-reps/create" className="btn btn-primary">
            <i className="bi bi-plus-lg me-1"></i> New Sales Rep
          </Link>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="row g-4 mb-4">
        <div className="col-md-4">
          <div className="card border-0 shadow-sm">
            <div className="card-body d-flex align-items-center gap-3">
              <div className="rounded-3 d-flex align-items-center justify-content-center" style={{ width: 44, height: 44, background: 'linear-gradient(135deg, #dbeafe, #bfdbfe)', color: '#2563eb' }}>
                <i className="bi bi-people-fill"></i>
              </div>
              <div>
                <div className="fw-bold fs-4">{stats.active}</div>
                <div className="text-muted small">Active Reps</div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card border-0 shadow-sm">
            <div className="card-body d-flex align-items-center gap-3">
              <div className="rounded-3 d-flex align-items-center justify-content-center" style={{ width: 44, height: 44, background: 'linear-gradient(135deg, #fee2e2, #fecaca)', color: '#dc2626' }}>
                <i className="bi bi-person-dash-fill"></i>
              </div>
              <div>
                <div className="fw-bold fs-4">{stats.inactive}</div>
                <div className="text-muted small">Inactive Reps</div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card border-0 shadow-sm">
            <div className="card-body d-flex align-items-center gap-3">
              <div className="rounded-3 d-flex align-items-center justify-content-center" style={{ width: 44, height: 44, background: 'linear-gradient(135deg, #dcfce7, #bbf7d0)', color: '#16a34a' }}>
                <i className="bi bi-graph-up"></i>
              </div>
              <div>
                <div className="fw-bold fs-4">{stats.total}</div>
                <div className="text-muted small">Total Reps</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card border-0 shadow-sm" style={{ borderRadius: 12, overflow: 'hidden' }}>
        <div className="card-header py-3 px-4 text-white" style={{ background: 'linear-gradient(135deg, #2563eb, #3b82f6)', border: 'none' }}>
          <div className="d-flex align-items-center gap-2">
            <i className="bi bi-table fs-5"></i>
            <span className="fw-semibold">Active Representatives</span>
            <span className="badge bg-white bg-opacity-25 ms-1">{reps.length}</span>
          </div>
        </div>
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="bg-light">
                <tr>
                  <th className="ps-4">REP #</th>
                  <th>Rep Name</th>
                  <th>Address</th>
                  <th>City</th>
                  <th>Zip</th>
                  <th>Phone</th>
                  <th>Email</th>
                  <th>Action</th>
                  <th className="pe-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="9" className="text-center py-4"><div className="spinner-border spinner-border-sm text-primary"></div> Loading...</td></tr>
                ) : paginatedReps.length === 0 ? (
                  <tr><td colSpan="9" className="text-center py-5 text-muted">No active sales reps found</td></tr>
                ) : paginatedReps.map((r, i) => {
                  const name = r.first_name + ' ' + r.last_name
                  return (
                    <tr key={r._id}>
                      <td className="ps-4 fw-semibold">{r.rep_number}</td>
                      <td>
                        <div className="d-flex align-items-center gap-2">
                          <div className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold" style={{ width: 36, height: 36, background: hashColor(name), fontSize: '0.75rem', flexShrink: 0 }}>
                            {initials(name)}
                          </div>
                          <span className="fw-semibold">{name}</span>
                        </div>
                      </td>
                      <td><span className="small">{r.address || '-'}</span></td>
                      <td><span className="small">{r.city || '-'}</span></td>
                      <td><span className="small">{r.zip || '-'}</span></td>
                      <td><span className="small">{(r.phones && r.phones.length > 0 ? r.phones[0].number + (r.phones[0].ext ? ' x' + r.phones[0].ext : '') : r.phone) || '-'}</span></td>
                      <td><a href={'mailto:' + r.email} className="text-decoration-none small">{r.email}</a></td>
                      <td>
                        <div className="d-flex gap-1">
                          <Link to={'/sales-reps/' + r._id} className="btn btn-sm btn-outline-secondary" title="View" style={{ width: 32, height: 32, padding: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8 }}>
                            <i className="bi bi-eye"></i>
                          </Link>
                          <Link to={'/sales-reps/' + r._id + '/edit'} className="btn btn-sm btn-outline-primary" title="Edit" style={{ width: 32, height: 32, padding: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8 }}>
                            <i className="bi bi-pencil"></i>
                          </Link>
                          <button className="btn btn-sm btn-outline-danger" title="Deactivate" onClick={() => setDeactivateRep(r)} style={{ width: 32, height: 32, padding: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8 }}>
                            <i className="bi bi-person-dash"></i>
                          </button>
                        </div>
                      </td>
                      <td className="pe-4"><span className="badge bg-success-subtle text-success rounded-pill px-3">Active</span></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {reps.length > 0 && (
            <Pagination page={page} totalPages={totalPages} perPage={perPage} total={reps.length} onPageChange={setPage} onPerPageChange={v => { setPerPage(v); setPage(1) }} />
          )}
        </div>
      </div>

      {/* Deactivate Modal */}
      {deactivateRep && (
        <div className="modal show d-block" tabIndex="-1" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header text-white" style={{ background: 'linear-gradient(135deg, #dc2626, #ef4444)' }}>
                <h5 className="modal-title"><i className="bi bi-exclamation-triangle me-2"></i>Deactivate Sales Rep</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setDeactivateRep(null)}></button>
              </div>
              <div className="modal-body py-4">
                <p>Are you sure you want to deactivate <strong>{deactivateRep.first_name} {deactivateRep.last_name}</strong>? They will be moved to the inactive list.</p>
              </div>
              <div className="modal-footer border-0">
                <button className="btn btn-outline-secondary" onClick={() => setDeactivateRep(null)}>Cancel</button>
                <button className="btn btn-danger" onClick={handleDeactivate}><i className="bi bi-person-dash me-1"></i>Deactivate</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
