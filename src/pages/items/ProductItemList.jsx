import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { api } from '../../lib/api'
import Pagination from '../../components/Pagination'
import exportCSV from '../../lib/exportCSV'
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { arrayMove, SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import SlidePanel from '../../components/SlidePanel'

const typeStyles = {
  Footwear:    { bg: '#dbeafe', color: '#1d4ed8', icon: 'bi-shoe' },
  Insoles:     { bg: '#dcfce7', color: '#166534', icon: 'bi-layers' },
  Accessories: { bg: '#fef3c7', color: '#92400e', icon: 'bi-bag' },
  Apparel:     { bg: '#f3e8ff', color: '#7c3aed', icon: 'bi-palette' },
  Display:     { bg: '#ffe4e6', color: '#be123c', icon: 'bi-easel' },
}

const emptyForm = {
  name: '',
  item_type: '',
  unit_price: '',
  base_price: '',
  website_price: '',
  website_price_type: 'fixed',
  msrp: '',
  msrp_type: 'fixed',
  distributor_price: '',
  distributor_price_type: 'fixed',
  retail_store_price: '',
  retail_store_price_type: 'fixed',
  manufacturing_cost: '',
  shipping_cost: '',
  duties: '',
  packaging: '',
  labor: '',
  other_expenses: '',
  notes: '',
  status: 'active'
}

function SortableRow({ product, expanded, onToggleExpand, index, children }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: product._id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    background: isDragging ? '#eff6ff' : undefined,
  }

  const formatPrice = (val, type, base) => {
    const v = parseFloat(val) || 0
    if (type === 'percent') {
      const discounted = (parseFloat(base) || 0) * (1 - v / 100)
      return `${v}% Off ($${discounted.toFixed(2)})`
    }
    return `$${v.toFixed(2)}`
  }

  return (
    <>
      <tr ref={setNodeRef} style={style} {...attributes}>
        <td className="ps-3 text-center" style={{ width: 40, cursor: 'grab' }} {...listeners}>
          <i className="bi bi-grip-vertical text-muted"></i>
        </td>
        <td className="text-muted">
          <button
            className="btn btn-sm btn-link p-0 text-muted me-2"
            onClick={(e) => { e.stopPropagation(); onToggleExpand(); }}
          >
            <i className={`bi bi-chevron-${expanded ? 'down' : 'right'}`}></i>
          </button>
          {index}
        </td>
        {children}
      </tr>
      {expanded && (
        <tr className="bg-light border-start border-primary border-4" style={{ position: 'relative', zIndex: 1 }}>
          <td colSpan="8" className="p-3">
             <div className="row g-3">
                {[
                  { id: 'website_price', label: 'AIRfeet Website Price', val: product.website_price, type: product.website_price_type, icon: 'bi-globe' },
                  { id: 'msrp', label: 'MSRP (Retail Price)', val: product.msrp, type: product.msrp_type, icon: 'bi-tag' },
                  { id: 'distributor_price', label: 'Distributor Price', val: product.distributor_price, type: product.distributor_price_type, icon: 'bi-truck' },
                  { id: 'retail_store_price', label: 'Retail Store Price', val: product.retail_store_price, type: product.retail_store_price_type, icon: 'bi-shop' },
                ].map((p, i) => (
                  <div className="col-md-3" key={i}>
                    <div className="d-flex align-items-center gap-2 border rounded p-2 bg-white">
                      <div className="text-primary bg-primary bg-opacity-10 rounded p-2" style={{ width: 40, textAlign: 'center' }}>
                        <i className={`bi ${p.icon}`}></i>
                      </div>
                      <div>
                        <div className="small text-muted fw-semibold" style={{ fontSize: '0.65rem', textTransform: 'uppercase' }}>{p.label}</div>
                        <div className="fw-bold" style={{ fontSize: '0.85rem' }}>
                          {Number(p.val) > 0 ? `$${calculatePrice(p.val, p.type, product.base_price).toFixed(2)}` : '—'}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-3 border-top">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h6 className="fw-bold mb-0 text-primary"><i className="bi bi-graph-up-arrow me-2"></i>Profit & Margin Analysis</h6>
                  <div className="badge bg-light text-dark border p-2 rounded-3">Total Cost: <span className="text-danger fw-bold">${((parseFloat(product.manufacturing_cost) || 0) + (parseFloat(product.shipping_cost) || 0) + (parseFloat(product.duties) || 0) + (parseFloat(product.packaging) || 0) + (parseFloat(product.labor) || 0) + (parseFloat(product.other_expenses) || 0)).toFixed(2)}</span></div>
                </div>
                <div className="table-responsive">
                  <table className="table table-sm table-bordered mb-0 align-middle text-center" style={{ fontSize: '0.75rem' }}>
                    <thead className="bg-light">
                      <tr>
                        <th>Pricing Level</th>
                        <th>Selling Price</th>
                        <th>Gross Profit</th>
                        <th>Profit Margin</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { label: 'AIRfeet Website', val: product.website_price, type: product.website_price_type },
                        { label: 'MSRP Retail', val: product.msrp, type: product.msrp_type },
                        { label: 'Distributor', val: product.distributor_price, type: product.distributor_price_type },
                        { label: 'Retail Store', val: product.retail_store_price, type: product.retail_store_price_type },
                      ].map((p, i) => {
                        const sellPrice = calculatePrice(p.val, p.type, product.base_price)
                        const totalCost = (parseFloat(product.manufacturing_cost) || 0) + (parseFloat(product.shipping_cost) || 0) + (parseFloat(product.duties) || 0) + (parseFloat(product.packaging) || 0) + (parseFloat(product.labor) || 0) + (parseFloat(product.other_expenses) || 0)
                        const profit = sellPrice - totalCost
                        const margin = sellPrice > 0 ? (profit / sellPrice) * 100 : 0
                        return (
                          <tr key={i}>
                            <td className="fw-semibold text-start ps-3">{p.label}</td>
                            <td className="fw-bold text-primary">${sellPrice.toFixed(2)}</td>
                            <td className={`fw-bold ${profit > 0 ? 'text-success' : 'text-danger'}`}>${profit.toFixed(2)}</td>
                            <td>
                              <span className={`badge ${margin > 25 ? 'bg-success' : margin > 10 ? 'bg-warning text-dark' : 'bg-danger'}`}>
                                {margin.toFixed(1)}%
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
          </td>
        </tr>
      )}
    </>
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
  const [expandedRows, setExpandedRows] = useState({}) // { productId: bool }

  const toggleExpand = (id) => {
    setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }))
  }

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

  // Calculate price based on type (fixed or percent of base_price)
  function calculatePrice(val, type, basePrice) {
    const v = parseFloat(val) || 0
    if (type === 'percent') {
      return (parseFloat(basePrice) || 0) * (1 - v / 100)
    }
    return v
  }

  function formatPrice(val, type, basePrice) {
    const price = calculatePrice(val, type, basePrice)
    const formatted = price.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
    if (type === 'percent') {
      return `${formatted} (${val}% off)`
    }
    return formatted
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
      website_price: product.website_price || '',
      website_price_type: product.website_price_type || 'fixed',
      msrp: product.msrp || '',
      msrp_type: product.msrp_type || 'fixed',
      distributor_price: product.distributor_price || '',
      distributor_price_type: product.distributor_price_type || 'fixed',
      retail_store_price: product.retail_store_price || '',
      retail_store_price_type: product.retail_store_price_type || 'fixed',
      manufacturing_cost: product.manufacturing_cost || '',
      shipping_cost: product.shipping_cost || '',
      duties: product.duties || '',
      packaging: product.packaging || '',
      labor: product.labor || '',
      other_expenses: product.other_expenses || '',
      notes: product.notes || '',
      status: product.status,
    })
    setShowModal(true)
  }

  // Save
  async function handleSave() {
    if (!form.name.trim()) { toast.error('Product name is required'); return }
    if (!form.item_type) { toast.error('Item type is required'); return }
    // Uniqueness checks
    try {
      const nameCheck = await api.checkUniqueProduct('name', form.name.trim(), editingId)
      if (!nameCheck.unique) { toast.error(`Product "${form.name}" already exists`); return }
      if (form.sku?.trim()) {
        const skuCheck = await api.checkUniqueProduct('sku', form.sku.trim(), editingId)
        if (!skuCheck.unique) { toast.error(`SKU "${form.sku}" already exists`); return }
      }
    } catch {}
    setSaving(true)
    try {
      const payload = {
        ...form,
        unit_price: parseFloat(form.unit_price) || 0,
        base_price: parseFloat(form.base_price) || 0,
        website_price: parseFloat(form.website_price) || 0,
        msrp: parseFloat(form.msrp) || 0,
        distributor_price: parseFloat(form.distributor_price) || 0,
        retail_store_price: parseFloat(form.retail_store_price) || 0,
        manufacturing_cost: parseFloat(form.manufacturing_cost) || 0,
        shipping_cost: parseFloat(form.shipping_cost) || 0,
        duties: parseFloat(form.duties) || 0,
        packaging: parseFloat(form.packaging) || 0,
        labor: parseFloat(form.labor) || 0,
        other_expenses: parseFloat(form.other_expenses) || 0,
      }
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
                      const isInactive = product.status === 'inactive'
                      return (
                        <SortableRow key={product._id} product={product} expanded={expandedRows[product._id]} onToggleExpand={() => toggleExpand(product._id)} index={(page - 1) * perPage + index + 1}>
                          <td><span className="fw-semibold" style={{ color: isInactive ? '#94a3b8' : 'var(--text-primary)' }}>{product.name}</span></td>
                          <td>
                            {Number(product.unit_price) > 0
                              ? <span style={{ fontWeight: 700, fontSize: '.95rem' }}>${Number(product.unit_price).toFixed(2)}</span>
                              : <span style={{ color: 'var(--text-light)', fontStyle: 'italic', fontWeight: 500 }}>$0.00</span>
                            }
                          </td>
                          <td>
                            {Number(product.base_price) > 0
                              ? <span style={{ fontWeight: 700, fontSize: '.95rem' }}>${Number(product.base_price).toFixed(2)}</span>
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

      {/* Add/Edit SlidePanel */}
      <SlidePanel
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingId ? 'Edit Product' : 'Add New Product'}
        width="600px"
      >
        <div className="row g-3">
          <div className="col-12">
            <label className="form-label fw-medium">Product Name <span className="text-danger">*</span></label>
            <input type="text" className="form-control" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Enter product name" />
          </div>
          <div className="col-12">
            <label className="form-label fw-medium">Item Type <span className="text-danger">*</span></label>
            <select className="form-select" value={form.item_type || ''} onChange={e => setForm(p => ({ ...p, item_type: e.target.value }))}>
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
            <select className="form-select" value={form.status || 'active'} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <div className="col-12 mt-4">
            <h6 className="fw-bold text-primary border-bottom pb-2 mb-3">Additional Pricing Levels</h6>
            <div className="alert alert-info py-2 small mb-3">
              <i className="bi bi-info-circle me-1"></i> These prices can be a fixed dollar amount or a percentage discount from the <strong>Base Price</strong>.
            </div>
          </div>

          {[
            { id: 'website_price', label: 'AIRfeet Website Price', value: form.website_price, type: form.website_price_type, icon: 'bi-globe' },
            { id: 'msrp', label: 'MSRP (Retail Price)', value: form.msrp, type: form.msrp_type, icon: 'bi-tag' },
            { id: 'distributor_price', label: 'Distributor Price', value: form.distributor_price, type: form.distributor_price_type, icon: 'bi-truck' },
            { id: 'retail_store_price', label: 'Retail Store Price', value: form.retail_store_price, type: form.retail_store_price_type, icon: 'bi-shop' },
          ].map(price => (
            <div className="col-md-6" key={price.id}>
              <label className="form-label fw-medium small text-muted mb-1">{price.label}</label>
              <div className="input-group input-group-sm">
                <span className="input-group-text"><i className={`bi ${price.icon}`}></i></span>
                <input
                  type="number"
                  className="form-control"
                  value={price.value}
                  onChange={e => setForm(p => ({ ...p, [price.id]: e.target.value }))}
                  placeholder="0.00"
                  step="0.01"
                />
                <select
                  className="form-select border-start-0"
                  style={{ maxWidth: '85px' }}
                  value={form[`${price.id}_type`] || 'fixed'}
                  onChange={e => setForm(p => ({ ...p, [`${price.id}_type`]: e.target.value }))}
                >
                  <option value="fixed">$ Flat</option>
                  <option value="percent">% Off</option>
                </select>
              </div>
              {form[`${price.id}_type`] === 'percent' && form.base_price > 0 && (
                <div className="form-text small text-info mt-1">
                  Calculated: ${calculatePrice(price.value, 'percent', form.base_price).toFixed(2)}
                </div>
              )}
            </div>
          ))}
          <div className="col-12 mt-3">
            <label className="form-label fw-medium">Product Notes</label>
            <textarea className="form-control" rows="3" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Enter product notes..."></textarea>
          </div>

          <div className="col-12 mt-4">
            <h6 className="fw-bold text-danger border-bottom pb-2 mb-3"><i className="bi bi-calculator me-2"></i>Cost Tracking (Per Unit)</h6>
            <div className="alert alert-warning py-2 small mb-3">
              <i className="bi bi-info-circle me-1"></i> These costs help calculate true profit margins across all pricing levels.
            </div>
          </div>

          {[
            { id: 'manufacturing_cost', label: 'Manufacturing Cost', icon: 'bi-hammer' },
            { id: 'shipping_cost', label: 'Inbound Shipping', icon: 'bi-truck' },
            { id: 'duties', label: 'Duties & Tariffs', icon: 'bi-globe' },
            { id: 'packaging', label: 'Packaging Materials', icon: 'bi-box' },
            { id: 'labor', label: 'Handling Labor', icon: 'bi-people' },
            { id: 'other_expenses', label: 'Other Variable Expenses', icon: 'bi-receipt' },
          ].map(cost => (
            <div className="col-md-4" key={cost.id}>
              <label className="form-label fw-medium small text-muted mb-1">{cost.label}</label>
              <div className="input-group input-group-sm">
                <span className="input-group-text"><i className={`bi ${cost.icon}`}></i></span>
                <input
                  type="number"
                  className="form-control"
                  value={form[cost.id]}
                  onChange={e => setForm(p => ({ ...p, [cost.id]: e.target.value }))}
                  placeholder="0.00"
                  step="0.01"
                />
              </div>
            </div>
          ))}

          <div className="col-12 mt-4 d-flex gap-2">
            <button type="button" className="btn btn-primary flex-grow-1" onClick={handleSave} disabled={saving}>
              {saving ? <><span className="spinner-border spinner-border-sm me-2"></span>Saving...</> : <><i className="bi bi-check-lg me-1"></i> {editingId ? 'Update Product' : 'Save Product'}</>}
            </button>
            <button type="button" className="btn btn-outline-secondary" onClick={() => setShowModal(false)}>Cancel</button>
          </div>
        </div>
      </SlidePanel>

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
