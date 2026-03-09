import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { api } from '../../lib/api'
import Pagination from '../../components/Pagination'
import exportCSV from '../../lib/exportCSV'

export default function ProductSizeList() {
  const [sizeMaps, setSizeMaps] = useState([])
  const [products, setProducts] = useState([])
  const [sizes, setSizes] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(10)

  // Assign Item Size modal
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [assignRows, setAssignRows] = useState([{ product_item: '', size: '', sku: '' }])
  const [savingAssign, setSavingAssign] = useState(false)

  // Add New Size modal
  const [showSizeModal, setShowSizeModal] = useState(false)
  const [sizeRows, setSizeRows] = useState([{ name: '', code: '' }])
  const [savingSize, setSavingSize] = useState(false)

  // Edit modal
  const [showEditModal, setShowEditModal] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [editForm, setEditForm] = useState({ product_item: '', size: '', sku: '', status: 'active' })
  const [savingEdit, setSavingEdit] = useState(false)

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    setLoading(true)
    try {
      const [maps, prods, szs] = await Promise.all([
        api.getItemSizeMaps(),
        api.getProducts(),
        api.getProductSizes(),
      ])
      setSizeMaps(maps)
      setProducts(prods.filter(p => p.status === 'active'))
      setSizes(szs.filter(s => s.status === 'active'))
    } catch (err) {
      toast.error('Failed to load: ' + err.message)
    }
    setLoading(false)
  }

  function getItemName(map) {
    if (map.product_item && typeof map.product_item === 'object') return map.product_item.name
    return 'Unknown'
  }

  function getSizeName(map) {
    if (map.size && typeof map.size === 'object') return map.size.code || map.size.name
    return 'Unknown'
  }

  // Search filter
  let filtered = sizeMaps
  if (search.trim()) {
    const s = search.toLowerCase()
    filtered = filtered.filter(m =>
      getItemName(m).toLowerCase().includes(s) ||
      getSizeName(m).toLowerCase().includes(s) ||
      (m.sku || '').toLowerCase().includes(s)
    )
  }

  // === Assign Item Size Modal ===
  function openAssignModal() {
    const firstProduct = products.length > 0 ? products[0]._id : ''
    const firstSize = sizes.length > 0 ? sizes[0]._id : ''
    setAssignRows([{ product_item: firstProduct, size: firstSize, sku: '' }])
    setShowAssignModal(true)
  }

  function addAssignRow() {
    setAssignRows(prev => {
      const last = prev[prev.length - 1]
      const usedSizes = prev.filter(r => r.product_item === last?.product_item).map(r => r.size)
      const nextSize = sizes.find(s => !usedSizes.includes(s._id))
      return [...prev, {
        product_item: last?.product_item || '',
        size: nextSize ? nextSize._id : '',
        sku: ''
      }]
    })
  }

  function removeAssignRow(index) {
    setAssignRows(prev => prev.filter((_, i) => i !== index))
  }

  function updateAssignRow(index, field, value) {
    setAssignRows(prev => prev.map((r, i) => i === index ? { ...r, [field]: value } : r))
  }

  async function handleSaveAssign() {
    const valid = assignRows.filter(r => r.product_item && r.size)
    if (valid.length === 0) { toast.error('Select at least one Item Name and Size'); return }
    setSavingAssign(true)
    try {
      const created = await api.createItemSizeMaps(valid)
      setSizeMaps(prev => [...prev, ...created])
      toast.success(`${created.length} item size mapping(s) created`)
      setShowAssignModal(false)
    } catch (err) {
      toast.error(err.message)
    }
    setSavingAssign(false)
  }

  // === Add New Size Modal ===
  function openSizeModal() {
    setSizeRows([{ name: '', code: '' }])
    setShowSizeModal(true)
  }

  function addSizeRow() {
    setSizeRows(prev => [...prev, { name: '', code: '' }])
  }

  function removeSizeRow(index) {
    setSizeRows(prev => prev.filter((_, i) => i !== index))
  }

  function updateSizeRow(index, field, value) {
    setSizeRows(prev => prev.map((r, i) => i === index ? { ...r, [field]: value } : r))
  }

  async function handleSaveSize() {
    const valid = sizeRows.filter(r => r.name.trim() && r.code.trim())
    if (valid.length === 0) { toast.error('Size Name and Size Slug are required'); return }
    setSavingSize(true)
    try {
      for (const row of valid) {
        const created = await api.createProductSize({ name: row.name, code: row.code, sort_order: sizes.length + 1 })
        setSizes(prev => [...prev, created])
      }
      toast.success(`${valid.length} size(s) created`)
      setShowSizeModal(false)
    } catch (err) {
      toast.error(err.message)
    }
    setSavingSize(false)
  }

  // === Edit Modal ===
  function openEdit(map) {
    setEditTarget(map)
    setEditForm({
      product_item: map.product_item?._id || map.product_item,
      size: map.size?._id || map.size,
      sku: map.sku || '',
      status: map.status,
    })
    setShowEditModal(true)
  }

  async function handleSaveEdit() {
    if (!editForm.product_item || !editForm.size) { toast.error('Item Name and Size are required'); return }
    setSavingEdit(true)
    try {
      const updated = await api.updateItemSizeMap(editTarget._id, editForm)
      setSizeMaps(prev => prev.map(m => m._id === editTarget._id ? updated : m))
      toast.success('Item size map updated')
      setShowEditModal(false)
    } catch (err) {
      toast.error(err.message)
    }
    setSavingEdit(false)
  }

  // === Delete ===
  async function handleDelete(map) {
    if (!confirm(`Delete "${getItemName(map)} - ${getSizeName(map)}"?`)) return
    try {
      await api.deleteItemSizeMap(map._id)
      setSizeMaps(prev => prev.filter(m => m._id !== map._id))
      toast.success('Item size map deleted')
    } catch (err) {
      toast.error(err.message)
    }
  }

  return (
    <>
      {/* Action Bar */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h5 className="mb-0 fw-bold"><i className="bi bi-rulers me-2 text-primary"></i>Item Size List</h5>
      </div>

      {/* Action Buttons + Search */}
      <div className="card border-0 shadow-sm">
        <div className="card-header py-3 border-0" style={{ background: 'linear-gradient(135deg, #2563eb, #1e40af)', color: '#fff' }}>
          <div className="d-flex justify-content-between align-items-center">
            <h5 className="mb-0"><i className="bi bi-gear me-2"></i>ITEM SIZE LIST</h5>
            <div className="d-flex align-items-center gap-2">
              <button className="btn btn-sm btn-light" onClick={() => exportCSV(
                filtered.map((m, i) => [i + 1, getItemName(m), getSizeName(m), m.sku || '', m.status]),
                ['#', 'Item Name', 'Size', 'SKU', 'Status'], 'item-sizes'
              )}><i className="bi bi-download me-1"></i>Export</button>
              <span className="badge bg-white bg-opacity-25 px-3 py-2">{filtered.length} entries</span>
            </div>
          </div>
        </div>
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <div className="d-flex gap-2">
              <button className="btn btn-success" onClick={openAssignModal}>
                <i className="bi bi-plus-lg me-1"></i> Assign Item Size +
              </button>
              <button className="btn btn-primary" onClick={openSizeModal}>
                <i className="bi bi-plus-lg me-1"></i> Add New Size +
              </button>
            </div>
            <div className="input-group" style={{ maxWidth: 260 }}>
              <span className="input-group-text bg-white"><i className="bi bi-search"></i></span>
              <input type="text" className="form-control" placeholder="Search..." value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
            </div>
          </div>

          {/* Table */}
          <div className="table-responsive">
            <table className="table table-hover mb-0 align-middle">
              <thead className="bg-light">
                <tr>
                  <th className="ps-3" style={{ width: 60 }}>List #</th>
                  <th>Item Name</th>
                  <th>Size</th>
                  <th>SKU</th>
                  <th>Status</th>
                  <th className="text-center" style={{ width: 120 }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="6" className="text-center py-5 text-muted">
                    <div className="spinner-border spinner-border-sm me-2"></div>Loading...
                  </td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan="6" className="text-center py-5 text-muted">No item size mappings found</td></tr>
                ) : filtered.slice((page - 1) * perPage, page * perPage).map((map, index) => (
                  <tr key={map._id}>
                    <td className="ps-3 text-muted">{(page - 1) * perPage + index + 1}</td>
                    <td className="fw-medium">{getItemName(map)}</td>
                    <td>{getSizeName(map)}</td>
                    <td>
                      <span style={{
                        fontFamily: "'SFMono-Regular', 'Consolas', monospace",
                        fontSize: '.82rem', color: 'var(--text-secondary)',
                        background: '#f8fafc', padding: '3px 10px', borderRadius: 6,
                        display: 'inline-block'
                      }}>{map.sku || '-'}</span>
                    </td>
                    <td>
                      <span className={`badge badge-${map.status}`}>
                        {map.status === 'active' ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="text-center">
                      <button className="btn btn-sm btn-action btn-outline-primary me-1" title="Edit" onClick={() => openEdit(map)}>
                        <i className="bi bi-pencil"></i>
                      </button>
                      <button className="btn btn-sm btn-action btn-outline-danger" title="Delete" onClick={() => handleDelete(map)}>
                        <i className="bi bi-trash"></i>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination total={filtered.length} page={page} perPage={perPage} onPageChange={setPage} onPerPageChange={setPerPage} />
        </div>
      </div>

      {/* ===== Assign Item Size Modal (Item Size Map) ===== */}
      {showAssignModal && (
        <>
          <div className="modal-backdrop fade show" style={{ zIndex: 1050 }}></div>
          <div className="modal fade show d-block" tabIndex="-1" style={{ zIndex: 1055 }}>
            <div className="modal-dialog modal-lg modal-dialog-centered">
              <div className="modal-content border-0 shadow" style={{ borderRadius: 16, overflow: 'hidden' }}>
                <div className="modal-header border-bottom">
                  <h5 className="modal-title">Item Size Map</h5>
                  <button type="button" className="btn-close" onClick={() => setShowAssignModal(false)}></button>
                </div>
                <div className="modal-body" style={{ padding: 24 }}>
                  {assignRows.map((row, i) => (
                    <div className="d-flex gap-2 mb-3 align-items-end" key={i}>
                      <div style={{ flex: 2 }}>
                        <label className="form-label fw-medium small mb-1">Item Name <span className="text-danger">*</span></label>
                        <select className="form-select" value={row.product_item} onChange={e => updateAssignRow(i, 'product_item', e.target.value)}>
                          <option value="">Select item...</option>
                          {products.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
                        </select>
                      </div>
                      <div style={{ flex: 1.2 }}>
                        <label className="form-label fw-medium small mb-1">Size <span className="text-danger">*</span></label>
                        <select className="form-select" value={row.size} onChange={e => updateAssignRow(i, 'size', e.target.value)}>
                          <option value="">Select...</option>
                          {sizes.map(s => <option key={s._id} value={s._id}>{s.code}</option>)}
                        </select>
                      </div>
                      <div style={{ flex: 1.2 }}>
                        <label className="form-label fw-medium small mb-1">SKU</label>
                        <input type="text" className="form-control" value={row.sku} onChange={e => updateAssignRow(i, 'sku', e.target.value)} />
                      </div>
                      <div style={{ flexShrink: 0, paddingBottom: 1 }}>
                        <button className="btn btn-primary btn-sm" onClick={() => removeAssignRow(i)} style={{ width: 36, height: 36, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <i className="bi bi-x-lg"></i>
                        </button>
                      </div>
                    </div>
                  ))}
                  <button className="btn btn-success btn-sm mt-2" onClick={addAssignRow}>
                    <i className="bi bi-plus-lg me-1"></i> Add Item Map
                  </button>
                </div>
                <div className="modal-footer border-top">
                  <button type="button" className="btn btn-outline-secondary" onClick={() => setShowAssignModal(false)}>Close</button>
                  <button type="button" className="btn btn-dark" onClick={handleSaveAssign} disabled={savingAssign}>
                    {savingAssign ? <><span className="spinner-border spinner-border-sm me-2"></span>Saving...</> : 'Save'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ===== Add New Size Modal ===== */}
      {showSizeModal && (
        <>
          <div className="modal-backdrop fade show" style={{ zIndex: 1050 }}></div>
          <div className="modal fade show d-block" tabIndex="-1" style={{ zIndex: 1055 }}>
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content border-0 shadow" style={{ borderRadius: 16, overflow: 'hidden' }}>
                <div className="modal-header border-bottom">
                  <h5 className="modal-title">Item Size</h5>
                  <button type="button" className="btn-close" onClick={() => setShowSizeModal(false)}></button>
                </div>
                <div className="modal-body" style={{ padding: 24 }}>
                  {sizeRows.map((row, i) => (
                    <div className="row g-2 mb-2 align-items-end" key={i}>
                      <div className="col-md-5">
                        {i === 0 && <label className="form-label fw-medium">Size Name <span className="text-danger">*</span></label>}
                        <input type="text" className="form-control" value={row.name} onChange={e => updateSizeRow(i, 'name', e.target.value)} placeholder="Size name" />
                      </div>
                      <div className="col-md-5">
                        {i === 0 && <label className="form-label fw-medium">Size slug <span className="text-danger">*</span></label>}
                        <input type="text" className="form-control" value={row.code} onChange={e => updateSizeRow(i, 'code', e.target.value)} placeholder="Size slug" />
                      </div>
                      <div className="col-md-2">
                        {sizeRows.length > 1 && (
                          <button className="btn btn-danger btn-sm" onClick={() => removeSizeRow(i)} style={{ width: 36, height: 36, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <i className="bi bi-x-lg"></i>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  <button className="btn btn-success btn-sm mt-2" onClick={addSizeRow}>
                    <i className="bi bi-plus-lg me-1"></i> Add Item Size
                  </button>
                </div>
                <div className="modal-footer border-top">
                  <button type="button" className="btn btn-outline-secondary" onClick={() => setShowSizeModal(false)}>Close</button>
                  <button type="button" className="btn btn-dark" onClick={handleSaveSize} disabled={savingSize}>
                    {savingSize ? <><span className="spinner-border spinner-border-sm me-2"></span>Saving...</> : 'Save'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ===== Edit Modal ===== */}
      {showEditModal && editTarget && (
        <>
          <div className="modal-backdrop fade show" style={{ zIndex: 1050 }}></div>
          <div className="modal fade show d-block" tabIndex="-1" style={{ zIndex: 1055 }}>
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content border-0 shadow" style={{ borderRadius: 16, overflow: 'hidden' }}>
                <div className="modal-header text-white border-0" style={{ background: 'linear-gradient(135deg, #2563eb, #1e40af)' }}>
                  <h5 className="modal-title fw-bold"><i className="bi bi-pencil me-2"></i>Edit Item Size Map</h5>
                  <button type="button" className="btn-close btn-close-white" onClick={() => setShowEditModal(false)}></button>
                </div>
                <div className="modal-body" style={{ padding: 24 }}>
                  <div className="mb-3">
                    <label className="form-label fw-medium">Item Name <span className="text-danger">*</span></label>
                    <select className="form-select" value={editForm.product_item} onChange={e => setEditForm(p => ({ ...p, product_item: e.target.value }))}>
                      <option value="">Select item...</option>
                      {products.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
                    </select>
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-medium">Size <span className="text-danger">*</span></label>
                    <select className="form-select" value={editForm.size} onChange={e => setEditForm(p => ({ ...p, size: e.target.value }))}>
                      <option value="">Select size...</option>
                      {sizes.map(s => <option key={s._id} value={s._id}>{s.code} - {s.name}</option>)}
                    </select>
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-medium">SKU</label>
                    <input type="text" className="form-control" value={editForm.sku} onChange={e => setEditForm(p => ({ ...p, sku: e.target.value }))} placeholder="SKU" />
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-medium">Status</label>
                    <select className="form-select" value={editForm.status} onChange={e => setEditForm(p => ({ ...p, status: e.target.value }))}>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>
                <div className="modal-footer border-0">
                  <button type="button" className="btn btn-outline-secondary" onClick={() => setShowEditModal(false)}>Cancel</button>
                  <button type="button" className="btn btn-primary" onClick={handleSaveEdit} disabled={savingEdit}>
                    {savingEdit ? <><span className="spinner-border spinner-border-sm me-2"></span>Saving...</> : <><i className="bi bi-check-lg me-1"></i> Update</>}
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
