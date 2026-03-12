import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { api } from '../../lib/api'
import Pagination from '../../components/Pagination'

export default function ItemSizesView() {
  const { id } = useParams()
  const [product, setProduct] = useState(null)
  const [sizeMaps, setSizeMaps] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(10)
  const [search, setSearch] = useState('')

  useEffect(() => { fetchData() }, [id])

  async function fetchData() {
    setLoading(true)
    try {
      const [prod, maps] = await Promise.all([
        api.getProduct(id),
        api.getItemSizeMaps(id)
      ])
      setProduct(prod)
      setSizeMaps(maps || [])
    } catch (err) {
      toast.error('Failed to load data: ' + err.message)
    }
    setLoading(false)
  }

  const filtered = sizeMaps.filter(m => {
    if (!search) return true
    const s = search.toLowerCase()
    const sizeName = m.size?.name || ''
    const sku = m.sku || ''
    return sizeName.toLowerCase().includes(s) || sku.toLowerCase().includes(s)
  })
  const paginated = filtered.slice((page - 1) * perPage, page * perPage)

  return (
    <div>
      {/* Page Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <nav aria-label="breadcrumb">
            <ol className="breadcrumb mb-1">
              <li className="breadcrumb-item"><Link to="/dashboard"><i className="bi bi-house-door"></i></Link></li>
              <li className="breadcrumb-item"><Link to="/items?tab=products">Items</Link></li>
              <li className="breadcrumb-item active">Item Sizes</li>
            </ol>
          </nav>
          <h3 className="mb-0">{loading ? 'Loading...' : product?.name || 'Item Sizes'}</h3>
        </div>
        <Link to="/items?tab=products" className="btn btn-outline-secondary">
          <i className="bi bi-arrow-left me-1"></i> Back to Items
        </Link>
      </div>

      {/* Stats */}
      <div className="row g-3 mb-4">
        {[
          { value: sizeMaps.length, label: 'Total Sizes', icon: 'bi-rulers', bg: '#eff6ff', color: '#2563eb' },
          { value: sizeMaps.filter(m => m.status === 'active').length, label: 'Active', icon: 'bi-check-circle-fill', bg: '#ecfdf5', color: '#10b981' },
          { value: sizeMaps.filter(m => m.status === 'inactive').length, label: 'Inactive', icon: 'bi-x-circle-fill', bg: '#fef2f2', color: '#ef4444' },
        ].map((stat, i) => (
          <div className="col-md-4 col-6" key={i}>
            <div className="stat-card">
              <div className="d-flex align-items-center gap-3">
                <div className="stat-icon" style={{ background: stat.bg, color: stat.color }}>
                  <i className={`bi ${stat.icon}`}></i>
                </div>
                <div>
                  <div className="stat-value">{loading ? '-' : stat.value}</div>
                  <div className="stat-label">{stat.label}</div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Product Info Card */}
      {product && (
        <div className="card border-0 shadow-sm rounded-4 mb-3">
          <div className="card-body py-3 px-4">
            <div className="d-flex flex-wrap align-items-center gap-4">
              <div>
                <span className="text-muted small">Item Name</span>
                <div className="fw-semibold">{product.name}</div>
              </div>
              <div>
                <span className="text-muted small">Unit Price</span>
                <div className="fw-semibold">${(product.unit_price || 0).toFixed(2)}</div>
              </div>
              <div>
                <span className="text-muted small">Base Price</span>
                <div className="fw-semibold">${(product.base_price || 0).toFixed(2)}</div>
              </div>
              <div>
                <span className="text-muted small">Status</span>
                <div>
                  <span className={`badge ${product.status === 'active' ? 'badge-active' : 'badge-inactive'}`}>
                    {product.status === 'active' ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
        <div className="card-header py-3 border-0" style={{ background: 'linear-gradient(135deg, #2563eb, #1e40af)', color: '#fff' }}>
          <div className="d-flex justify-content-between align-items-center">
            <h5 className="mb-0"><i className="bi bi-rulers me-2"></i>Item Size Mapping</h5>
            <span className="badge bg-white bg-opacity-25 px-3 py-2">{filtered.length} sizes</span>
          </div>
        </div>
        <div className="d-flex justify-content-between align-items-center px-3 py-2 border-bottom">
          <div className="d-flex align-items-center gap-2">
            <span className="text-muted small">Show</span>
            <select className="form-select form-select-sm" style={{ width: 'auto' }} value={perPage} onChange={e => { setPerPage(Number(e.target.value)); setPage(1) }}>
              {[10, 25, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div style={{ width: 200 }}>
            <input type="text" className="form-control form-control-sm" placeholder="Search..." value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
          </div>
        </div>
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="bg-light">
              <tr>
                <th className="ps-4" style={{ width: 70 }}>List #</th>
                <th>Item Name</th>
                <th>Size</th>
                <th>SKU</th>
                <th>Status</th>
                <th className="pe-4 text-center" style={{ width: 140 }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="6" className="text-center py-4"><div className="spinner-border spinner-border-sm text-primary"></div> Loading...</td></tr>
              ) : paginated.length === 0 ? (
                <tr><td colSpan="6" className="text-center py-4 text-muted">No size mappings found for this item</td></tr>
              ) : paginated.map((m, i) => (
                <tr key={m._id}>
                  <td className="ps-4 text-muted">{(page - 1) * perPage + i + 1}</td>
                  <td className="fw-semibold">{m.product_item?.name || product?.name || '-'}</td>
                  <td>{m.size?.name || '-'}</td>
                  <td>
                    {m.sku ? (
                      <code className="px-2 py-1 rounded" style={{ background: '#f1f5f9', color: '#475569', fontSize: '0.82rem' }}>{m.sku}</code>
                    ) : <span className="text-muted">-</span>}
                  </td>
                  <td>
                    <span className={`badge ${m.status === 'active' ? 'badge-active' : 'badge-inactive'}`}>
                      {m.status === 'active' ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="pe-4 text-center">
                    <button className="btn btn-sm btn-action btn-outline-primary me-1" title="Edit">
                      <i className="bi bi-pencil"></i>
                    </button>
                    <button className="btn btn-sm btn-action btn-outline-danger" title="Delete">
                      <i className="bi bi-trash"></i>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
