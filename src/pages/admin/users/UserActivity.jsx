import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../../lib/api'
import toast from 'react-hot-toast'
import Pagination from '../../../components/Pagination'
import exportCSV from '../../../lib/exportCSV'

export default function UserActivity() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(10)

  useEffect(() => {
    api.getUsers().then(data => {
      setUsers(data || [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  let filtered = users
  if (search.trim()) {
    const s = search.toLowerCase()
    filtered = filtered.filter(u =>
      u.first_name?.toLowerCase().includes(s) ||
      u.last_name?.toLowerCase().includes(s) ||
      u.username?.toLowerCase().includes(s) ||
      u.email?.toLowerCase().includes(s)
    )
  }

  if (loading) return <div className="p-4">Loading...</div>

  return (
    <>
      {/* Page Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <nav aria-label="breadcrumb">
            <ol className="breadcrumb mb-1">
              <li className="breadcrumb-item"><Link to="/"><i className="bi bi-house-door"></i></Link></li>
              <li className="breadcrumb-item">Admin</li>
              <li className="breadcrumb-item active">Users Activity List</li>
            </ol>
          </nav>
          <h3 className="mb-0">Users Activity List</h3>
        </div>
      </div>

      {/* Users Table */}
      <div className="card border-0 shadow-sm">
        <div className="card-header py-3 border-0" style={{ background: 'linear-gradient(135deg, #2563eb, #1e40af)', color: '#fff' }}>
          <div className="d-flex justify-content-between align-items-center">
            <h5 className="mb-0"><i className="bi bi-people me-2"></i>Users List</h5>
            <button className="btn btn-sm btn-light" onClick={() => exportCSV(
              filtered.map((u, i) => [i + 1, u.first_name, u.last_name, u.email]),
              ['Sno', 'First Name', 'Last Name', 'Email'], 'users-activity'
            )}><i className="bi bi-download me-1"></i>Export</button>
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
                  <th>First Name</th>
                  <th>Last Name</th>
                  <th>Email</th>
                  <th className="pe-4 text-center" style={{ width: 60 }}></th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan="5" className="text-center py-4 text-muted">No users found.</td></tr>
                ) : filtered.slice((page - 1) * perPage, page * perPage).map((user, index) => (
                  <tr key={user._id}>
                    <td className="ps-4 text-muted">{(page - 1) * perPage + index + 1}</td>
                    <td>{user.first_name}</td>
                    <td>{user.last_name}</td>
                    <td>{user.email}</td>
                    <td className="pe-4 text-center">
                      <Link
                        to={`/admin/activity/${user._id}`}
                        className="btn btn-sm btn-action btn-outline-secondary"
                        title="View Activity"
                      >
                        <i className="bi bi-eye"></i>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination total={filtered.length} page={page} perPage={perPage} onPageChange={setPage} onPerPageChange={setPerPage} />
        </div>
      </div>
    </>
  )
}
