import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { api } from '../../lib/api'
import Pagination from '../../components/Pagination'
import exportCSV from '../../lib/exportCSV'

const groupIcons = [
  { icon: 'bi-rocket-takeoff', bg: '#dcfce7', color: '#166534' },
  { icon: 'bi-award', bg: '#f3e8ff', color: '#7c3aed' },
  { icon: 'bi-calendar-event', bg: '#fef3c7', color: '#92400e' },
  { icon: 'bi-gift', bg: '#dbeafe', color: '#1d4ed8' },
  { icon: 'bi-star', bg: '#ffe4e6', color: '#be123c' },
  { icon: 'bi-lightning', bg: '#ecfeff', color: '#0e7490' },
]

const typeStyles = {
  Footwear: { bg: '#dbeafe', color: '#1d4ed8' },
  Insoles: { bg: '#dcfce7', color: '#166534' },
  Accessories: { bg: '#fef3c7', color: '#92400e' },
  Apparel: { bg: '#f3e8ff', color: '#7c3aed' },
  Display: { bg: '#ffe4e6', color: '#be123c' },
}

const emptyForm = { name: '', description: '', products: [], status: 'active' }

export default function ProductGroupList() {
  const [groups, setGroups] = useState([])
  const [allProducts, setAllProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [productSearch, setProductSearch] = useState('')
  const [saving, setSaving] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(10)

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    setLoading(true)
    try {
      const [grps, prods] = await Promise.all([api.getProductGroups(), api.getProducts()])
      setGroups(grps)
      setAllProducts(prods.filter(p => p.status === 'active'))
    } catch (err) {
      toast.error('Failed to load: ' + err.message)
    }
    setLoading(false)
  }

  const activeCount = groups.filter(g => g.status === 'active').length
  const totalProductsInGroups = groups.reduce((sum, g) => sum + (g.products?.length || 0), 0)
  const avgPerGroup = groups.length > 0 ? (totalProductsInGroups / groups.length).toFixed(1) : 0

  // Search
  let filtered = groups
  if (search.trim()) {
    const s = search.toLowerCase()
    filtered = filtered.filter(g => g.name.toLowerCase().includes(s) || g.description.toLowerCase().includes(s))
  }

  function getGroupIcon(index) {
    return groupIcons[index % groupIcons.length]
  }

  function getTypeName(product) {
    if (product.item_type && typeof product.item_type === 'object') return product.item_type.name
    return ''
  }

  function getTypeStyle(name) {
    return typeStyles[name] || { bg: '#f1f5f9', color: '#475569' }
  }

  // Add
  function openAdd() {
    setEditingId(null)
    setForm(emptyForm)
    setProductSearch('')
    setShowModal(true)
  }

  // Edit
  function openEdit(group) {
    setEditingId(group._id)
    setForm({
      name: group.name,
      description: group.description || '',
      products: group.products?.map(p => typeof p === 'object' ? p._id : p) || [],
      status: group.status,
    })
    setProductSearch('')
    setShowModal(true)
  }

  // Toggle product selection
  function toggleProduct(productId) {
    setForm(prev => ({
      ...prev,
      products: prev.products.includes(productId)
        ? prev.products.filter(id => id !== productId)
        : [...prev.products, productId]
    }))
  }

  // Filtered products for modal search
  const filteredProducts = allProducts.filter(p => {
    if (!productSearch.trim()) return true
    const s = productSearch.toLowerCase()
    const typeName = getTypeName(p).toLowerCase()
    return p.name.toLowerCase().includes(s) || typeName.includes(s)
  })

  // Save
  async function handleSave() {
    if (!form.name.trim()) { toast.error('Group name is required'); return }
    if (form.products.length === 0) { toast.error('Select at least one product'); return }
    setSaving(true)
    try {
      if (editingId) {
        const updated = await api.updateProductGroup(editingId, form)
        setGroups(prev => prev.map(g => g._id === editingId ? updated : g))
        toast.success(`"${form.name}" updated`)
      } else {
        const created = await api.createProductGroup(form)
        setGroups(prev => [...prev, created])
        toast.success(`"${form.name}" created`)
      }
      setShowModal(false)
    } catch (err) {
      toast.error(err.message)
    }
    setSaving(false)
  }

  // Duplicate
  async function handleDuplicate(group) {
    try {
      const dup = await api.duplicateProductGroup(group._id)
      setGroups(prev => [...prev, dup])
      toast.success(`"${group.name}" duplicated`)
    } catch (err) {
      toast.error(err.message)
    }
  }

  // Delete
  function openDeleteModal(group) {
    setDeleteTarget(group)
    setShowDeleteModal(true)
  }

  async function handleToggleStatus(group) {
    try {
      const updated = group.status === 'active'
        ? await api.deactivateProductGroup(group._id)
        : await api.activateProductGroup(group._id)
      setGroups(prev => prev.map(g => g._id === group._id ? updated : g))
      toast.success(`"${group.name}" ${updated.status === 'active' ? 'activated' : 'deactivated'}`)
    } catch (err) {
      toast.error(err.message)
    }
  }

  async function handleDeactivateFromModal() {
    if (!deleteTarget) return
    await handleToggleStatus(deleteTarget)
    setShowDeleteModal(false)
    setDeleteTarget(null)
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return
    try {
      await api.deleteProductGroup(deleteTarget._id)
      setGroups(prev => prev.filter(g => g._id !== deleteTarget._id))
      toast.success(`"${deleteTarget.name}" permanently deleted`)
    } catch (err) {
      toast.error(err.message)
    }
    setShowDeleteModal(false)
    setDeleteTarget(null)
  }

  return (
    <>
      {/* Action Bar */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h5 className="mb-0 fw-bold"><i className="bi bi-collection me-2 text-primary"></i>Group Product Items</h5>
        <button className="btn btn-primary" onClick={openAdd}>
          <i className="bi bi-plus-lg me-1"></i> Create Group
        </button>
      </div>

      {/* Stats */}
      <div className="row g-3 mb-4">
        {[
          { value: groups.length, label: 'Total Groups', icon: 'bi-collection', bg: '#eff6ff', color: '#2563eb' },
          { value: activeCount, label: 'Active Groups', icon: 'bi-check-circle-fill', bg: '#ecfdf5', color: '#10b981' },
          { value: totalProductsInGroups, label: 'Products in Groups', icon: 'bi-box-seam', bg: '#dbeafe', color: '#1d4ed8' },
          { value: avgPerGroup, label: 'Avg per Group', icon: 'bi-stack', bg: '#f5f3ff', color: '#8b5cf6' },
        ].map((stat, i) => (
          <div className="col-md-3 col-6" key={i}>
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

      {/* Search */}
      <div className="d-flex justify-content-end mb-3">
        <div className="input-group" style={{ maxWidth: 260 }}>
          <span className="input-group-text bg-white"><i className="bi bi-search"></i></span>
          <input type="text" className="form-control" placeholder="Search groups..." value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
        </div>
      </div>

      {/* Table */}
      <div className="card border-0 shadow-sm">
        <div className="card-header py-3 border-0" style={{ background: 'linear-gradient(135deg, #2563eb, #1e40af)', color: '#fff' }}>
          <div className="d-flex justify-content-between align-items-center">
            <h5 className="mb-0"><i className="bi bi-collection me-2"></i>Product Groups</h5>
            <div className="d-flex align-items-center gap-2">
              <button className="btn btn-sm btn-light" onClick={() => exportCSV(
                filtered.map((g, i) => [i + 1, g.name, (g.products || []).length, g.description || '', g.status]),
                ['#', 'Group Name', 'Products', 'Description', 'Status'], 'product-groups'
              )}><i className="bi bi-download me-1"></i>Export</button>
              <span className="badge bg-white bg-opacity-25 px-3 py-2">{filtered.length} groups</span>
            </div>
          </div>
        </div>
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover mb-0 align-middle">
              <thead className="bg-light">
                <tr>
                  <th className="ps-4" style={{ width: 50 }}>#</th>
                  <th>Group Name</th>
                  <th style={{ width: 90 }}>Products</th>
                  <th>Included Items</th>
                  <th>Status</th>
                  <th className="pe-4 text-center" style={{ width: 150 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="6" className="text-center py-5 text-muted">
                    <div className="spinner-border spinner-border-sm me-2"></div>Loading...
                  </td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan="6" className="text-center py-5 text-muted">No groups found</td></tr>
                ) : filtered.slice((page - 1) * perPage, page * perPage).map((group, index) => {
                  const gi = getGroupIcon((page - 1) * perPage + index)
                  const isInactive = group.status === 'inactive'
                  const prods = group.products || []
                  const showMax = 3
                  return (
                    <tr key={group._id} style={{ opacity: isInactive ? 0.6 : 1 }}>
                      <td className="ps-4 text-muted">{(page - 1) * perPage + index + 1}</td>
                      <td>
                        <div className="d-flex align-items-center gap-2">
                          <div style={{
                            width: 38, height: 38, borderRadius: 10,
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '1rem', flexShrink: 0,
                            background: isInactive ? '#f1f5f9' : gi.bg,
                            color: isInactive ? '#94a3b8' : gi.color
                          }}>
                            <i className={`bi ${gi.icon}`}></i>
                          </div>
                          <div>
                            <div className={`fw-bold${isInactive ? ' text-muted' : ''}`}>{group.name}</div>
                            {group.description && <div style={{ fontSize: '.72rem', color: 'var(--text-light)', fontWeight: 500 }}>{group.description}</div>}
                          </div>
                        </div>
                      </td>
                      <td>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 5,
                          background: '#eff6ff', padding: '4px 14px', borderRadius: 20,
                          fontSize: '.82rem', fontWeight: 700, color: 'var(--primary)'
                        }}>
                          <i className="bi bi-box-seam"></i> {prods.length}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                          {prods.slice(0, showMax).map(p => (
                            <span key={p._id} style={{
                              display: 'inline-flex', alignItems: 'center', gap: 4,
                              background: '#f1f5f9', padding: '3px 10px', borderRadius: 6,
                              fontSize: '.75rem', fontWeight: 600, color: 'var(--text-secondary)'
                            }}>{p.name}</span>
                          ))}
                          {prods.length > showMax && (
                            <span style={{
                              display: 'inline-flex', alignItems: 'center',
                              background: 'var(--primary)', padding: '3px 10px', borderRadius: 6,
                              fontSize: '.75rem', fontWeight: 600, color: '#fff'
                            }}>+{prods.length - showMax} more</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <span className={`badge badge-${group.status}`}>
                          {group.status === 'active' ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="pe-4 text-center">
                        <button className="btn btn-sm btn-action btn-outline-primary me-1" title="Edit" onClick={() => openEdit(group)}>
                          <i className="bi bi-pencil"></i>
                        </button>
                        <button className="btn btn-sm btn-action btn-outline-info me-1" title="Duplicate" onClick={() => handleDuplicate(group)}>
                          <i className="bi bi-copy"></i>
                        </button>
                        <button className="btn btn-sm btn-action btn-outline-danger" title="Delete" onClick={() => openDeleteModal(group)}>
                          <i className="bi bi-trash"></i>
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <Pagination total={filtered.length} page={page} perPage={perPage} onPageChange={setPage} onPerPageChange={setPerPage} />
        </div>
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <>
          <div className="modal-backdrop fade show" style={{ zIndex: 1050 }}></div>
          <div className="modal fade show d-block" tabIndex="-1" style={{ zIndex: 1055 }}>
            <div className="modal-dialog modal-lg modal-dialog-centered">
              <div className="modal-content border-0 shadow" style={{ borderRadius: 16, overflow: 'hidden' }}>
                <div className="modal-header text-white border-0" style={{ background: 'linear-gradient(135deg, #2563eb, #1e40af)' }}>
                  <h5 className="modal-title fw-bold">
                    <i className={`bi ${editingId ? 'bi-pencil' : 'bi-collection'} me-2`}></i>
                    {editingId ? 'Edit Group' : 'Create Product Group'}
                  </h5>
                  <button type="button" className="btn-close btn-close-white" onClick={() => setShowModal(false)}></button>
                </div>
                <div className="modal-body" style={{ padding: 24 }}>
                  <div className="row g-3">
                    <div className="col-md-8">
                      <label className="form-label fw-medium">Group Name <span className="text-danger">*</span></label>
                      <input type="text" className="form-control" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Enter group name" />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label fw-medium">Status</label>
                      <select className="form-select" value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>
                    <div className="col-12">
                      <label className="form-label fw-medium">Description</label>
                      <textarea className="form-control" rows="2" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Brief description of this product group"></textarea>
                    </div>
                    <div className="col-12">
                      <label className="form-label fw-medium">Select Products</label>
                      <div className="input-group mb-2">
                        <span className="input-group-text"><i className="bi bi-search"></i></span>
                        <input type="text" className="form-control" placeholder="Search products..." value={productSearch} onChange={e => setProductSearch(e.target.value)} />
                      </div>
                      <div style={{ maxHeight: 220, overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: 10, padding: '8px 0' }}>
                        {filteredProducts.map(p => {
                          const typeName = getTypeName(p)
                          const ts = getTypeStyle(typeName)
                          return (
                            <div
                              key={p._id}
                              onClick={() => toggleProduct(p._id)}
                              style={{ display: 'flex', alignItems: 'center', padding: '8px 16px', cursor: 'pointer', transition: 'background .15s' }}
                              onMouseEnter={e => e.currentTarget.style.background = '#f8faff'}
                              onMouseLeave={e => e.currentTarget.style.background = ''}
                            >
                              <input
                                type="checkbox"
                                checked={form.products.includes(p._id)}
                                onChange={() => {}}
                                style={{ accentColor: 'var(--primary)', width: 16, height: 16, marginRight: 10, cursor: 'pointer' }}
                              />
                              <span style={{ flex: 1, fontSize: '.875rem', fontWeight: 500 }}>{p.name}</span>
                              {typeName && (
                                <span style={{ fontSize: '.7rem', padding: '2px 8px', borderRadius: 4, fontWeight: 600, background: ts.bg, color: ts.color }}>
                                  {typeName}
                                </span>
                              )}
                            </div>
                          )
                        })}
                        {filteredProducts.length === 0 && (
                          <div className="text-center text-muted py-3" style={{ fontSize: '.85rem' }}>No products found</div>
                        )}
                      </div>
                      <div className="mt-2 small text-muted">
                        <i className="bi bi-info-circle me-1"></i>{form.products.length} products selected
                      </div>
                    </div>
                  </div>
                </div>
                <div className="modal-footer border-0" style={{ padding: '16px 24px' }}>
                  <button type="button" className="btn btn-outline-secondary rounded-pill" onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="button" className="btn btn-primary rounded-pill" onClick={handleSave} disabled={saving}>
                    {saving ? <><span className="spinner-border spinner-border-sm me-2"></span>Saving...</> : <><i className="bi bi-check-lg me-1"></i> {editingId ? 'Update' : 'Save Group'}</>}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && deleteTarget && (
        <>
          <div className="modal-backdrop fade show" style={{ zIndex: 1050 }}></div>
          <div className="modal fade show d-block" tabIndex="-1" style={{ zIndex: 1055 }}>
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content border-0 shadow">
                <div className="modal-header text-white border-0" style={{ background: 'linear-gradient(135deg, #dc2626, #b91c1c)' }}>
                  <h5 className="modal-title fw-bold"><i className="bi bi-exclamation-triangle me-2"></i>Remove Group</h5>
                  <button type="button" className="btn-close btn-close-white" onClick={() => setShowDeleteModal(false)}></button>
                </div>
                <div className="modal-body text-center py-4">
                  <div className="mb-3" style={{ fontSize: '3rem', color: '#dc2626' }}>
                    <i className="bi bi-shield-exclamation"></i>
                  </div>
                  <h5 className="fw-bold mb-2">"{deleteTarget.name}"</h5>
                  <p className="text-muted mb-0">What would you like to do with this group?</p>
                </div>
                <div className="modal-footer border-0 justify-content-center gap-2">
                  <button type="button" className="btn btn-outline-secondary" onClick={() => setShowDeleteModal(false)}>Cancel</button>
                  {deleteTarget.status === 'active' && (
                    <button type="button" className="btn btn-warning" onClick={handleDeactivateFromModal}>
                      <i className="bi bi-pause-circle me-1"></i> Deactivate
                    </button>
                  )}
                  <button type="button" className="btn btn-danger" onClick={handleDeleteConfirm}>
                    <i className="bi bi-trash me-1"></i> Delete Permanently
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}
