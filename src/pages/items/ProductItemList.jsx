import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { api } from '../../lib/api'
import Pagination from '../../components/Pagination'
import exportCSV from '../../lib/exportCSV'
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

const typeStyles = {
  Footwear:    { bg: '#dbeafe', color: '#1d4ed8', icon: 'bi-shoe' },
  Insoles:     { bg: '#dcfce7', color: '#166534', icon: 'bi-layers' },
  Accessories: { bg: '#fef3c7', color: '#92400e', icon: 'bi-bag' },
  Apparel:     { bg: '#f3e8ff', color: '#7c3aed', icon: 'bi-palette' },
  Display:     { bg: '#ffe4e6', color: '#be123c', icon: 'bi-easel' },
}

const emptyForm = { name: '', item_type: '', unit_price: '', base_price: '', notes: '', status: 'active' }

function SortableRow({ id, children }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    background: isDragging ? '#eff6ff' : undefined,
  }
  return (
    <tr ref={setNodeRef} style={style} {...attributes}>
      <td className="ps-3 text-center" style={{ width: 40, cursor: 'grab' }} {...listeners}>
        <i className="bi bi-grip-vertical text-muted"></i>
      </td>
      {children}
    </tr>
  )
}

export default function ProductItemList() {
  const navigate = useNavigate()
  const [products, setProducts] = useState([])
  const [itemTypes, setItemTypes] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(10)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    setLoading(true)
    try {
      const [prods, types] = await Promise.all([api.getProducts(), api.getItemTypes()])
      setProducts(prods)
      setItemTypes(types.filter(t => t.status === 'active'))
    } catch (err) {
      toast.error('Failed to load: ' + err.message)
    }
    setLoading(false)
  }

  async function handleDragEnd(event) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = products.findIndex(p => p._id === active.id)
    const newIndex = products.findIndex(p => p._id === over.id)
    if (oldIndex === -1 || newIndex === -1) return
    const reordered = arrayMove(products, oldIndex, newIndex)
    setProducts(reordered)
    try {
      const order = reordered.map((p, i) => ({ id: p._id, sort_order: i }))
      await api.reorderProducts(order)
    } catch (err) {
      toast.error('Failed to save order')
      fetchData()
    }
  }

  // Get type name from product
  function getTypeName(product) {
    if (product.item_type && typeof product.item_type === 'object') return product.item_type.name
    const t = itemTypes.find(it => it._id === product.item_type)
    return t ? t.name : 'Unknown'
  }

  function getTypeStyle(typeName) {
    return typeStyles[typeName] || { bg: '#f1f5f9', color: '#475569', icon: 'bi-box-seam' }
  }

  // Filter & search
  let filtered = products
  if (filter !== 'all') {
    filtered = filtered.filter(p => getTypeName(p) === filter)
  }
  if (search.trim()) {
    const s = search.toLowerCase()
    filtered = filtered.filter(p =>
      p.name.toLowerCase().includes(s) ||
      getTypeName(p).toLowerCase().includes(s)
    )
  }

  const activeCount = products.filter(p => p.status === 'active').length
  const typeNames = [...new Set(products.map(p => getTypeName(p)))]
  const unitPrices = products.filter(p => p.unit_price > 0).map(p => p.unit_price)
  const avgUnitPrice = unitPrices.length > 0 ? (unitPrices.reduce((a, b) => a + b, 0) / unitPrices.length) : 0

  // Type counts for filter pills
  function typeCount(name) {
    return products.filter(p => getTypeName(p) === name).length
  }

  // Add
  function openAdd() {
    setEditingId(null)
    setForm(emptyForm)
    setShowModal(true)
  }

  // Edit
  function openEdit(product) {
    setEditingId(product._id)
    setForm({
      name: product.name,
      item_type: product.item_type?._id || product.item_type,
      unit_price: product.unit_price || '',
      base_price: product.base_price || '',
      notes: product.notes || '',
      status: product.status,
    })
    setShowModal(true)
  }

  // Save
  async function handleSave() {
    if (!form.name.trim()) { toast.error('Product name is required'); return }
    if (!form.item_type) { toast.error('Item type is required'); return }
    setSaving(true)
    try {
      const payload = { ...form, unit_price: parseFloat(form.unit_price) || 0, base_price: parseFloat(form.base_price) || 0 }
      if (editingId) {
        const updated = await api.updateProduct(editingId, payload)
        setProducts(prev => prev.map(p => p._id === editingId ? updated : p))
        toast.success(`"${form.name}" updated`)
      } else {
        const created = await api.createProduct(payload)
        setProducts(prev => [...prev, created])
        toast.success(`"${form.name}" created`)
      }
      setShowModal(false)
    } catch (err) {
      toast.error(err.message)
    }
    setSaving(false)
  }

  // Duplicate
  async function handleDuplicate(product) {
    try {
      const dup = await api.duplicateProduct(product._id)
      setProducts(prev => [...prev, dup])
      toast.success(`"${product.name}" duplicated`)
    } catch (err) {
      toast.error(err.message)
    }
  }

  // Toggle status
  async function handleToggleStatus(product) {
    try {
      const updated = product.status === 'active'
        ? await api.deactivateProduct(product._id)
        : await api.activateProduct(product._id)
      setProducts(prev => prev.map(p => p._id === product._id ? updated : p))
      toast.success(`"${product.name}" ${updated.status === 'active' ? 'activated' : 'deactivated'}`)
    } catch (err) {
      toast.error(err.message)
    }
  }

  // Delete
  function openDeleteModal(product) {
    setDeleteTarget(product)
    setShowDeleteModal(true)
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
      await api.deleteProduct(deleteTarget._id)
      setProducts(prev => prev.filter(p => p._id !== deleteTarget._id))
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
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
        <h5 className="mb-0 fw-bold"><i className="bi bi-box-seam me-2 text-primary"></i>Product Items</h5>
        <div className="d-flex gap-2">
          <button className="btn btn-primary" onClick={openAdd}>
            <i className="bi bi-plus-lg me-1"></i> New Item +
          </button>
          <button className="btn btn-dark" onClick={() => toast('Change order coming soon')}>
            <i className="bi bi-arrow-down-up me-1"></i> Change Order
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="row g-3 mb-4">
        {[
          { value: products.length, label: 'Total Products', icon: 'bi-box-seam', bg: '#eff6ff', color: '#2563eb' },
          { value: activeCount, label: 'Active Items', icon: 'bi-check-circle-fill', bg: '#ecfdf5', color: '#10b981' },
          { value: typeNames.length, label: 'Categories', icon: 'bi-tags', bg: '#dbeafe', color: '#1d4ed8' },
          { value: `$${avgUnitPrice.toFixed(2)}`, label: 'Avg Unit Price', icon: 'bi-currency-dollar', bg: '#fef3c7', color: '#d97706' },
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

      {/* Filter Pills + Search */}
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-3">
        <div className="filter-pills d-flex flex-wrap gap-2">
          <button className={`btn btn-outline-secondary${filter === 'all' ? ' active' : ''}`} onClick={() => { setFilter('all'); setPage(1) }}>
            <i className="bi bi-grid-3x3-gap me-1"></i> All
            <span className="badge bg-white text-dark ms-1">{products.length}</span>
          </button>
          {typeNames.map(tn => {
            const style = getTypeStyle(tn)
            return (
              <button key={tn} className={`btn btn-outline-secondary${filter === tn ? ' active' : ''}`} onClick={() => { setFilter(tn); setPage(1) }}>
                <i className={`bi ${style.icon} me-1`}></i> {tn}
                <span className="badge bg-white text-dark ms-1">{typeCount(tn)}</span>
              </button>
            )
          })}
        </div>
        <div className="input-group" style={{ maxWidth: 260 }}>
          <span className="input-group-text bg-white"><i className="bi bi-search"></i></span>
          <input type="text" className="form-control" placeholder="Search products..." value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
        </div>
      </div>

      {/* Table */}
      <div className="card border-0 shadow-sm">
        <div className="card-header py-3 border-0" style={{ background: 'linear-gradient(135deg, #2563eb, #1e40af)', color: '#fff' }}>
          <div className="d-flex justify-content-between align-items-center">
            <h5 className="mb-0"><i className="bi bi-box-seam me-2"></i>Product Items</h5>
            <div className="d-flex align-items-center gap-2">
              <button className="btn btn-sm btn-light" onClick={() => exportCSV(
                filtered.map((p, i) => [i + 1, p.name, getTypeName(p), p.unit_price?.toFixed(2) || '0.00', p.base_price?.toFixed(2) || '0.00', p.status]),
                ['#', 'Product Name', 'Item Type', 'Unit Price', 'Base Price', 'Status'], 'product-items'
              )}><i className="bi bi-download me-1"></i>Export</button>
              <span className="badge bg-white bg-opacity-25 px-3 py-2">{filtered.length} products</span>
            </div>
          </div>
        </div>
        <div className="card-body p-0">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <div className="table-responsive">
            <table className="table table-hover mb-0 align-middle">
              <thead className="bg-light">
                <tr>
                  <th style={{ width: 40 }}></th>
                  <th style={{ width: 70 }}>List #</th>
                  <th>Item Name</th>
                  <th>Unit Price</th>
                  <th>Base Price</th>
                  <th>Item Detail</th>
                  <th className="pe-4 text-center" style={{ width: 170 }}>Action</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="8" className="text-center py-5 text-muted">
                    <div className="spinner-border spinner-border-sm me-2"></div>Loading...
                  </td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan="8" className="text-center py-5 text-muted">No products found</td></tr>
                ) : (
                  <SortableContext items={filtered.slice((page - 1) * perPage, page * perPage).map(p => p._id)} strategy={verticalListSortingStrategy}>
                    {filtered.slice((page - 1) * perPage, page * perPage).map((product, index) => {
                      const typeName = getTypeName(product)
                      const style = getTypeStyle(typeName)
                      const isInactive = product.status === 'inactive'
                      return (
                        <SortableRow key={product._id} id={product._id}>
                          <td className="text-muted">{(page - 1) * perPage + index + 1}</td>
                          <td><span className="fw-semibold" style={{ color: isInactive ? '#94a3b8' : 'var(--text-primary)' }}>{product.name}</span></td>
                          <td>
                            {product.unit_price > 0
                              ? <span style={{ fontWeight: 700, fontSize: '.95rem' }}>${product.unit_price.toFixed(2)}</span>
                              : <span style={{ color: 'var(--text-light)', fontStyle: 'italic', fontWeight: 500 }}>$0.00</span>
                            }
                          </td>
                          <td>
                            {product.base_price > 0
                              ? <span style={{ fontWeight: 700, fontSize: '.95rem' }}>${product.base_price.toFixed(2)}</span>
                              : <span style={{ color: 'var(--text-light)', fontStyle: 'italic', fontWeight: 500 }}>$0.00</span>
                            }
                          </td>
                          <td>
                            <button className="btn btn-sm btn-action btn-outline-info" title="View Sizes" onClick={() => navigate(`/items/sizes/${product._id}`)}>
                              <i className="bi bi-eye"></i>
                            </button>
                          </td>
                          <td className="pe-4 text-center">
                            <button className="btn btn-sm btn-action btn-outline-primary me-1" title="Edit" onClick={() => openEdit(product)}>
                              <i className="bi bi-pencil"></i>
                            </button>
                            <button
                              className={`btn btn-sm btn-action ${isInactive ? 'btn-outline-success' : 'btn-outline-warning'} me-1`}
                              title={isInactive ? 'Activate' : 'Deactivate'}
                              onClick={() => handleToggleStatus(product)}
                            >
                              <i className={`bi ${isInactive ? 'bi-check-circle' : 'bi-pause-circle'}`}></i>
                            </button>
                            <button className="btn btn-sm btn-action btn-outline-danger" title="Delete" onClick={() => openDeleteModal(product)}>
                              <i className="bi bi-trash"></i>
                            </button>
                          </td>
                          <td>
                            <span className={`badge badge-${product.status}`}>
                              {product.status === 'active' ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                        </SortableRow>
                      )
                    })}
                  </SortableContext>
                )}
              </tbody>
            </table>
          </div>
          </DndContext>
          <Pagination total={filtered.length} page={page} perPage={perPage} onPageChange={setPage} onPerPageChange={setPerPage} />
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <>
          <div className="modal-backdrop fade show" style={{ zIndex: 1050 }}></div>
          <div className="modal fade show d-block" tabIndex="-1" style={{ zIndex: 1055 }}>
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content border-0 shadow" style={{ borderRadius: 16, overflow: 'hidden' }}>
                <div className="modal-header text-white border-0" style={{ background: 'linear-gradient(135deg, #2563eb, #1e40af)' }}>
                  <h5 className="modal-title fw-bold">
                    <i className={`bi ${editingId ? 'bi-pencil' : 'bi-box-seam'} me-2`}></i>
                    {editingId ? 'Edit Product' : 'Add New Product'}
                  </h5>
                  <button type="button" className="btn-close btn-close-white" onClick={() => setShowModal(false)}></button>
                </div>
                <div className="modal-body" style={{ padding: 24 }}>
                  <div className="row g-3">
                    <div className="col-12">
                      <label className="form-label fw-medium">Product Name <span className="text-danger">*</span></label>
                      <input type="text" className="form-control" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Enter product name" />
                    </div>
                    <div className="col-12">
                      <label className="form-label fw-medium">Item Type <span className="text-danger">*</span></label>
                      <select className="form-select" value={form.item_type} onChange={e => setForm(p => ({ ...p, item_type: e.target.value }))}>
                        <option value="">Select type</option>
                        {itemTypes.map(t => (
                          <option key={t._id} value={t._id}>{t.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-medium">Unit Price ($)</label>
                      <div className="input-group">
                        <span className="input-group-text"><i className="bi bi-currency-dollar"></i></span>
                        <input type="number" className="form-control" value={form.unit_price} onChange={e => setForm(p => ({ ...p, unit_price: e.target.value }))} placeholder="0.00" step="0.01" />
                      </div>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-medium">Base Price ($)</label>
                      <div className="input-group">
                        <span className="input-group-text"><i className="bi bi-currency-dollar"></i></span>
                        <input type="number" className="form-control" value={form.base_price} onChange={e => setForm(p => ({ ...p, base_price: e.target.value }))} placeholder="0.00" step="0.01" />
                      </div>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-medium">Status</label>
                      <select className="form-select" value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>
                    <div className="col-12">
                      <label className="form-label fw-medium">Product Notes</label>
                      <textarea className="form-control" rows="3" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Enter product notes..."></textarea>
                    </div>
                  </div>
                </div>
                <div className="modal-footer border-0" style={{ padding: '16px 24px' }}>
                  <button type="button" className="btn btn-outline-secondary rounded-pill" onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="button" className="btn btn-primary rounded-pill" onClick={handleSave} disabled={saving}>
                    {saving ? <><span className="spinner-border spinner-border-sm me-2"></span>Saving...</> : <><i className="bi bi-check-lg me-1"></i> {editingId ? 'Update' : 'Save Product'}</>}
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
                  <h5 className="modal-title fw-bold"><i className="bi bi-exclamation-triangle me-2"></i>Remove Product</h5>
                  <button type="button" className="btn-close btn-close-white" onClick={() => setShowDeleteModal(false)}></button>
                </div>
                <div className="modal-body text-center py-4">
                  <div className="mb-3" style={{ fontSize: '3rem', color: '#dc2626' }}>
                    <i className="bi bi-shield-exclamation"></i>
                  </div>
                  <h5 className="fw-bold mb-2">"{deleteTarget.name}"</h5>
                  <p className="text-muted mb-0">What would you like to do with this product?</p>
                </div>
                <div className="modal-footer border-0 justify-content-center gap-2">
                  <button type="button" className="btn btn-outline-secondary" onClick={() => setShowDeleteModal(false)}>
                    Cancel
                  </button>
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
