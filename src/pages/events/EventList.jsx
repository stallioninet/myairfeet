import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { api } from '../../lib/api'
import Pagination from '../../components/Pagination'
import exportCSV from '../../lib/exportCSV'

function num(n) {
  return Number(n || 0).toFixed(2)
}

function fmtDate(d) {
  if (!d) return ''
  const dt = new Date(d)
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function fmtDateShort(d) {
  if (!d) return ''
  const dt = new Date(d)
  const y = dt.getFullYear()
  const m = String(dt.getMonth() + 1).padStart(2, '0')
  const day = String(dt.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function fmtPaidDate(d) {
  if (!d || d === 'null' || d === '0000-00-00' || d === null) return '--/--/----'
  const dt = new Date(d)
  if (isNaN(dt.getTime())) return '--/--/----'
  return `${String(dt.getMonth() + 1).padStart(2, '0')}/${String(dt.getDate()).padStart(2, '0')}/${dt.getFullYear()}`
}

export default function EventList() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(10)
  const [activeTab, setActiveTab] = useState('event')
  const [deleteEvt, setDeleteEvt] = useState(null)
  const [showCreate, setShowCreate] = useState(false)
  const [showEdit, setShowEdit] = useState(null)
  const [showDetail, setShowDetail] = useState(null)
  const [detailData, setDetailData] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [eventTypes, setEventTypes] = useState([])
  const [showCreateType, setShowCreateType] = useState(false)
  const [editTypeId, setEditTypeId] = useState(null)
  const [form, setForm] = useState({ name: '', description: '', location: '', start_date: '', end_date: '', status: 'active' })
  const [typeForm, setTypeForm] = useState({ name: '', status: 'active' })

  // Sales Tax state
  const [taxRates, setTaxRates] = useState([])
  const [taxLoading, setTaxLoading] = useState(false)
  const [showCreateTax, setShowCreateTax] = useState(false)
  const [editTaxId, setEditTaxId] = useState(null)
  const [taxForm, setTaxForm] = useState({ name: '', rate: '', factor: '', state: '', status: 'active' })
  const [taxPage, setTaxPage] = useState(1)
  const [taxPerPage, setTaxPerPage] = useState(10)
  const [taxSearch, setTaxSearch] = useState('')

  // Costs state
  const [costItems, setCostItems] = useState([])
  const [costLoading, setCostLoading] = useState(false)
  const [showCreateCost, setShowCreateCost] = useState(false)
  const [editCostId, setEditCostId] = useState(null)
  const [costForm, setCostForm] = useState({ name: '', description: '', status: 'active' })
  const [costPage, setCostPage] = useState(1)
  const [costPerPage, setCostPerPage] = useState(10)
  const [costSearch, setCostSearch] = useState('')

  // Product sub-tabs state
  const [productSubTab, setProductSubTab] = useState('size')
  const [prodSizes, setProdSizes] = useState([])
  const [prodStyles, setProdStyles] = useState([])
  const [prodSizeLoading, setProdSizeLoading] = useState(false)
  const [prodStyleLoading, setProdStyleLoading] = useState(false)
  const [showCreateProdSize, setShowCreateProdSize] = useState(false)
  const [editProdSizeId, setEditProdSizeId] = useState(null)
  const [prodSizeForm, setProdSizeForm] = useState({ name: '', description: '', status: 'active' })
  const [showCreateProdStyle, setShowCreateProdStyle] = useState(false)
  const [editProdStyleId, setEditProdStyleId] = useState(null)
  const [prodStyleForm, setProdStyleForm] = useState({ name: '', description: '', status: 'active' })
  const [typeSearch, setTypeSearch] = useState('')
  const [typePage, setTypePage] = useState(1)
  const [typePerPage, setTypePerPage] = useState(10)
  const [sizeSearch, setSizeSearch] = useState('')
  const [sizePage, setSizePage] = useState(1)
  const [sizePerPage, setSizePerPage] = useState(10)
  const [styleSearch, setStyleSearch] = useState('')
  const [stylePage, setStylePage] = useState(1)
  const [stylePerPage, setStylePerPage] = useState(10)

  useEffect(() => { fetchData() }, [])
  useEffect(() => {
    if (activeTab === 'salesTax' && taxRates.length === 0) fetchTaxRates()
    if (activeTab === 'costs' && costItems.length === 0) fetchCostInfo()
    if (activeTab === 'product' && prodSizes.length === 0) fetchProdSizes()
    if (activeTab === 'product' && prodStyles.length === 0) fetchProdStyles()
  }, [activeTab])

  async function fetchData() {
    setLoading(true)
    try {
      const [data, types] = await Promise.all([api.getEvents(), api.getEventTypes()])
      setEvents(data || [])
      setEventTypes(types || [])
    } catch (err) {
      toast.error('Failed to load events: ' + err.message)
    }
    setLoading(false)
  }

  async function handleDelete() {
    if (!deleteEvt) return
    try {
      await api.deleteEvent(deleteEvt._id)
      toast.success('Event deleted')
      setDeleteEvt(null)
      fetchData()
    } catch (err) {
      toast.error('Failed to delete: ' + err.message)
    }
  }

  async function handleCreate(e) {
    e.preventDefault()
    try {
      await api.createEvent(form)
      toast.success('Event created')
      setShowCreate(false)
      setForm({ name: '', description: '', location: '', start_date: '', end_date: '', status: 'active' })
      fetchData()
    } catch (err) {
      toast.error('Failed to create: ' + err.message)
    }
  }

  async function handleUpdate(e) {
    e.preventDefault()
    try {
      await api.updateEvent(showEdit._id, form)
      toast.success('Event updated')
      setShowEdit(null)
      fetchData()
    } catch (err) {
      toast.error('Failed to update: ' + err.message)
    }
  }

  async function handleCreateType(e) {
    e.preventDefault()
    try {
      if (editTypeId) {
        await api.updateEventType(editTypeId, typeForm)
        toast.success('Event type updated')
      } else {
        await api.createEventType(typeForm)
        toast.success('Event type created')
      }
      setShowCreateType(false)
      setEditTypeId(null)
      setTypeForm({ name: '', status: 'active' })
      const types = await api.getEventTypes()
      setEventTypes(types || [])
    } catch (err) {
      toast.error(err.message)
    }
  }

  async function handleDeleteType(id) {
    if (!confirm('Delete this event type?')) return
    try {
      await api.deleteEventType(id)
      toast.success('Event type deleted')
      const types = await api.getEventTypes()
      setEventTypes(types || [])
    } catch (err) {
      toast.error(err.message)
    }
  }

  // === Tax Rates ===
  async function fetchTaxRates() {
    setTaxLoading(true)
    try {
      const data = await api.getTaxRates()
      setTaxRates(data || [])
    } catch (err) {
      toast.error('Failed to load tax rates: ' + err.message)
    }
    setTaxLoading(false)
  }

  async function handleSaveTax(e) {
    e.preventDefault()
    try {
      if (editTaxId) {
        await api.updateTaxRate(editTaxId, taxForm)
        toast.success('Tax rate updated')
      } else {
        await api.createTaxRate(taxForm)
        toast.success('Tax rate created')
      }
      setShowCreateTax(false)
      setEditTaxId(null)
      setTaxForm({ name: '', rate: '', factor: '', state: '', status: 'active' })
      fetchTaxRates()
    } catch (err) {
      toast.error(err.message)
    }
  }

  async function handleDeleteTax(id) {
    if (!confirm('Delete this tax rate?')) return
    try {
      await api.deleteTaxRate(id)
      toast.success('Tax rate deleted')
      fetchTaxRates()
    } catch (err) {
      toast.error(err.message)
    }
  }

  // === Cost Info ===
  async function fetchCostInfo() {
    setCostLoading(true)
    try {
      const data = await api.getCostInfo()
      setCostItems(data || [])
    } catch (err) {
      toast.error('Failed to load costs: ' + err.message)
    }
    setCostLoading(false)
  }

  async function handleSaveCost(e) {
    e.preventDefault()
    try {
      if (editCostId) {
        await api.updateCostInfo(editCostId, costForm)
        toast.success('Cost item updated')
      } else {
        await api.createCostInfo(costForm)
        toast.success('Cost item created')
      }
      setShowCreateCost(false)
      setEditCostId(null)
      setCostForm({ name: '', description: '', status: 'active' })
      fetchCostInfo()
    } catch (err) {
      toast.error(err.message)
    }
  }

  async function handleDeleteCost(id) {
    if (!confirm('Delete this cost item?')) return
    try {
      await api.deleteCostInfo(id)
      toast.success('Cost item deleted')
      fetchCostInfo()
    } catch (err) {
      toast.error(err.message)
    }
  }

  // === Product Sizes ===
  async function fetchProdSizes() {
    setProdSizeLoading(true)
    try {
      const data = await api.getEventProductSizes()
      setProdSizes(data || [])
    } catch (err) { toast.error('Failed to load sizes: ' + err.message) }
    setProdSizeLoading(false)
  }

  async function handleSaveProdSize(e) {
    e.preventDefault()
    try {
      if (editProdSizeId) {
        await api.updateEventProductSize(editProdSizeId, prodSizeForm)
        toast.success('Size updated')
      } else {
        await api.createEventProductSize(prodSizeForm)
        toast.success('Size created')
      }
      setShowCreateProdSize(false); setEditProdSizeId(null)
      setProdSizeForm({ name: '', description: '', status: 'active' })
      fetchProdSizes()
    } catch (err) { toast.error(err.message) }
  }

  async function handleDeleteProdSize(id) {
    if (!confirm('Delete this size?')) return
    try {
      await api.deleteEventProductSize(id)
      toast.success('Size deleted')
      fetchProdSizes()
    } catch (err) { toast.error(err.message) }
  }

  // === Product Styles ===
  async function fetchProdStyles() {
    setProdStyleLoading(true)
    try {
      const data = await api.getProductStyles()
      setProdStyles(data || [])
    } catch (err) { toast.error('Failed to load styles: ' + err.message) }
    setProdStyleLoading(false)
  }

  async function handleSaveProdStyle(e) {
    e.preventDefault()
    try {
      if (editProdStyleId) {
        await api.updateProductStyle(editProdStyleId, prodStyleForm)
        toast.success('Style updated')
      } else {
        await api.createProductStyle(prodStyleForm)
        toast.success('Style created')
      }
      setShowCreateProdStyle(false); setEditProdStyleId(null)
      setProdStyleForm({ name: '', description: '', status: 'active' })
      fetchProdStyles()
    } catch (err) { toast.error(err.message) }
  }

  async function handleDeleteProdStyle(id) {
    if (!confirm('Delete this style?')) return
    try {
      await api.deleteProductStyle(id)
      toast.success('Style deleted')
      fetchProdStyles()
    } catch (err) { toast.error(err.message) }
  }

  function openEdit(evt) {
    setForm({
      name: evt.name || '',
      description: evt.description || '',
      location: evt.location || '',
      start_date: evt.start_date ? fmtDateShort(evt.start_date) : '',
      end_date: evt.end_date ? fmtDateShort(evt.end_date) : '',
      status: evt.status || 'active'
    })
    setShowEdit(evt)
  }

  async function viewDetail(evt) {
    setShowDetail(evt)
    setDetailLoading(true)
    try {
      const data = await api.getEvent(evt._id)
      setDetailData(data)
    } catch (err) {
      toast.error('Failed to load event details')
    }
    setDetailLoading(false)
  }

  // Filter & search
  const filtered = events.filter(e => {
    if (filter !== 'all' && e.status !== filter) return false
    if (search) {
      const s = search.toLowerCase()
      if (!(e.name || '').toLowerCase().includes(s) &&
        !(e.location || '').toLowerCase().includes(s) &&
        !(e.old_event_id || '').toLowerCase().includes(s)) return false
    }
    return true
  })

  const activeCount = events.filter(e => e.status === 'active').length
  const inactiveCount = events.filter(e => e.status !== 'active').length
  const totalRevenue = events.reduce((s, e) => s + (e.totalRevenue || 0), 0)
  const totalCost = events.reduce((s, e) => s + (e.totalCost || 0), 0)

  const paginated = filtered.slice((page - 1) * perPage, page * perPage)

  const tabs = [
    { key: 'event', label: 'Event' },
    { key: 'eventType', label: 'Event Type' },
    { key: 'salesTax', label: 'SalesTax' },
    { key: 'costs', label: 'Costs' },
    { key: 'product', label: 'Product' },
  ]

  return (
    <>
      {/* Page Header */}
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
        <div>
          <nav aria-label="breadcrumb">
            <ol className="breadcrumb mb-1">
              <li className="breadcrumb-item"><Link to="/dashboard"><i className="bi bi-house-door"></i></Link></li>
              <li className="breadcrumb-item active">Events</li>
            </ol>
          </nav>
          <h3 className="mb-0">Events</h3>
        </div>
        <div className="d-flex gap-2">
          <button className="btn btn-outline-primary" onClick={() => {
            const headers = ['Event #', 'Event Name', 'State', 'Start Date', 'Qty', 'Receipts', 'Costs', 'Commi', 'Paid', 'Profit', 'Status']
            const rows = filtered.map(e => [e.old_event_id || '', e.name, e.location || '', fmtDateShort(e.start_date), e.totalQty || 0, num(e.totalRevenue), num(e.totalCost), num(e.totalCommission), fmtPaidDate(e.paidDate), num(e.profit), e.status])
            exportCSV(rows, headers, 'events')
          }}>
            <i className="bi bi-download me-1"></i> Export
          </button>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            <i className="bi bi-plus-lg me-1"></i> New Event
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="row g-3 mb-4">
        {[
          { value: events.length, label: 'Total Events', icon: 'bi-calendar-event-fill', bg: '#eff6ff', color: '#2563eb' },
          { value: activeCount, label: 'Active', icon: 'bi-check-circle-fill', bg: '#ecfdf5', color: '#10b981' },
          { value: '$' + totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 }), label: 'Total Revenue', icon: 'bi-currency-dollar', bg: '#fef9c3', color: '#854d0e' },
          { value: '$' + totalCost.toLocaleString('en-US', { minimumFractionDigits: 2 }), label: 'Total Cost', icon: 'bi-receipt', bg: '#f5f3ff', color: '#8b5cf6' },
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

      {/* Tabs */}
      <ul className="nav nav-tabs mb-0" style={{ borderBottom: '2px solid #dee2e6' }}>
        {tabs.map(t => (
          <li className="nav-item" key={t.key}>
            <button
              className={`nav-link px-4 ${activeTab === t.key ? 'active fw-semibold' : 'text-muted'}`}
              style={activeTab === t.key ? { borderBottom: '2px solid var(--primary)', color: 'var(--primary)' } : {}}
              onClick={() => setActiveTab(t.key)}
            >
              {t.label}
            </button>
          </li>
        ))}
      </ul>

      {/* Event Tab */}
      {activeTab === 'event' && (
        <>
          {/* Filter Pills */}
          <div className="filter-pills d-flex gap-2 my-3 flex-wrap">
            {[
              { key: 'all', label: 'All Events', count: events.length, badge: 'bg-white text-dark' },
              { key: 'active', label: 'Active', count: activeCount, badge: 'bg-success text-white' },
              { key: 'inactive', label: 'Inactive', count: inactiveCount, badge: 'bg-danger text-white' },
            ].map(f => (
              <button
                key={f.key}
                className={`btn btn-outline-secondary${filter === f.key ? ' active' : ''}`}
                onClick={() => { setFilter(f.key); setPage(1) }}
              >
                {f.label} <span className={`badge ${f.badge} ms-1`}>{f.count}</span>
              </button>
            ))}
            <div className="ms-auto">
              <div className="input-group" style={{ maxWidth: 240 }}>
                <span className="input-group-text bg-white"><i className="bi bi-search"></i></span>
                <input type="text" className="form-control" placeholder="Search events..." value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
              </div>
            </div>
          </div>

          {/* Events Table */}
          <div className="card border-0 shadow-sm">
            <div className="card-header py-3 border-0" style={{ background: 'linear-gradient(135deg, #2563eb, #1e40af)', color: '#fff' }}>
              <div className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0"><i className="bi bi-calendar-event me-2"></i>Event List</h5>
                <span className="badge bg-white bg-opacity-25 px-3 py-2">{filtered.length} events</span>
              </div>
            </div>
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-hover mb-0 align-middle">
                  <thead className="bg-light">
                    <tr>
                      <th className="ps-4" style={{ width: 80 }}>Event #</th>
                      <th>Event Name</th>
                      <th>State</th>
                      <th>Start Date</th>
                      <th className="text-end">Qty</th>
                      <th className="text-end">Receipts</th>
                      <th className="text-end">Costs</th>
                      <th className="text-end">Commi</th>
                      <th>Paid</th>
                      <th className="text-end">Profit</th>
                      <th>Status</th>
                      <th className="pe-4 text-center" style={{ width: 140 }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td colSpan="12" className="text-center py-5 text-muted">
                        <div className="spinner-border spinner-border-sm me-2"></div>Loading events...
                      </td></tr>
                    ) : paginated.length === 0 ? (
                      <tr><td colSpan="12" className="text-center py-5 text-muted">No events found</td></tr>
                    ) : paginated.map((e, index) => {
                      const isInactive = e.status !== 'active'
                      return (
                        <tr key={e._id} style={{ opacity: isInactive ? 0.7 : 1 }}>
                          <td className="ps-4">
                            <span className="text-muted fw-medium" style={{ fontSize: '0.85rem' }}>{e.old_event_id || '-'}</span>
                          </td>
                          <td>
                            <div>
                              <div className={`fw-medium${isInactive ? ' text-muted' : ''}`}>
                                <a href="#" className="text-decoration-none" onClick={ev => { ev.preventDefault(); viewDetail(e) }}>{e.name || 'Untitled'}</a>
                              </div>
                              {e.description && <div className="text-muted" style={{ fontSize: '0.72rem' }}>{e.description.slice(0, 40)}</div>}
                            </div>
                          </td>
                          <td><span style={{ fontSize: '0.85rem' }}>{e.location || '-'}</span></td>
                          <td><span style={{ fontSize: '0.85rem' }}>{fmtDate(e.start_date) || '-'}</span></td>
                          <td className="text-end"><span style={{ fontSize: '0.85rem' }}>{e.totalQty || 0}</span></td>
                          <td className="text-end"><span className="text-success fw-medium" style={{ fontSize: '0.85rem' }}>{num(e.totalRevenue)}</span></td>
                          <td className="text-end"><span className="text-danger fw-medium" style={{ fontSize: '0.85rem' }}>{num(e.totalCost)}</span></td>
                          <td className="text-end"><span style={{ fontSize: '0.85rem' }}>{num(e.totalCommission)}</span></td>
                          <td><span className="text-muted" style={{ fontSize: '0.82rem' }}>{fmtPaidDate(e.paidDate)}</span></td>
                          <td className="text-end">
                            <span className={`fw-medium ${(e.profit || 0) >= 0 ? 'text-success' : 'text-danger'}`} style={{ fontSize: '0.85rem' }}>
                              {num(e.profit)}
                            </span>
                          </td>
                          <td>
                            <span className={`badge badge-${e.status === 'active' ? 'active' : 'inactive'}`}>
                              {e.status === 'active' ? 'Active' : e.status === 'deleted' ? 'Deleted' : 'Inactive'}
                            </span>
                          </td>
                          <td className="pe-4 text-center">
                            <button className="btn btn-sm btn-action btn-outline-info me-1" title="View" onClick={() => viewDetail(e)}>
                              <i className="bi bi-eye"></i>
                            </button>
                            <button className="btn btn-sm btn-action btn-outline-primary me-1" title="Edit" onClick={() => openEdit(e)}>
                              <i className="bi bi-pencil"></i>
                            </button>
                            <button className="btn btn-sm btn-action btn-outline-danger" title="Delete" onClick={() => setDeleteEvt(e)}>
                              <i className="bi bi-trash"></i>
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <Pagination total={filtered.length} page={page} perPage={perPage} onPageChange={setPage} onPerPageChange={v => { setPerPage(v); setPage(1) }} />
            </div>
          </div>
        </>
      )}

      {/* Event Type Tab */}
      {activeTab === 'eventType' && (() => {
        const typeFiltered = eventTypes.filter(t => {
          if (!typeSearch.trim()) return true
          return (t.name || '').toLowerCase().includes(typeSearch.toLowerCase())
        })
        const typePaginated = typeFiltered.slice((typePage - 1) * typePerPage, typePage * typePerPage)
        return (
          <div className="card border-0 shadow-sm mt-3">
            <div className="card-header py-3 border-0" style={{ background: 'linear-gradient(135deg, #2563eb, #1e40af)', color: '#fff' }}>
              <div className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0"><i className="bi bi-tags me-2"></i>Event Types</h5>
                <div className="d-flex gap-2">
                  <span className="badge bg-white bg-opacity-25 px-3 py-2">{eventTypes.length} types</span>
                  <button className="btn btn-sm btn-light" onClick={() => { setEditTypeId(null); setTypeForm({ name: '', status: 'active' }); setShowCreateType(true) }}>
                    <i className="bi bi-plus-lg me-1"></i>New Type
                  </button>
                </div>
              </div>
            </div>
            <div className="card-body p-0">
              <div className="px-3 py-3">
                <div className="input-group" style={{ maxWidth: 280 }}>
                  <span className="input-group-text bg-white"><i className="bi bi-search"></i></span>
                  <input type="text" className="form-control" placeholder="Search event types..." value={typeSearch} onChange={e => { setTypeSearch(e.target.value); setTypePage(1) }} />
                </div>
              </div>
              <div className="table-responsive">
                <table className="table table-hover mb-0 align-middle">
                  <thead className="bg-light">
                    <tr>
                      <th className="ps-4" style={{ width: 50 }}>#</th>
                      <th>Type Name</th>
                      <th>Status</th>
                      <th className="pe-4 text-center" style={{ width: 140 }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {typePaginated.length === 0 ? (
                      <tr><td colSpan="4" className="text-center py-5 text-muted">No event types found</td></tr>
                    ) : typePaginated.map((t, i) => (
                      <tr key={t._id}>
                        <td className="ps-4 text-muted">{(typePage - 1) * typePerPage + i + 1}</td>
                        <td className="fw-medium">{t.name}</td>
                        <td>
                          <span className={`badge badge-${t.status === 'active' ? 'active' : 'inactive'}`}>
                            {t.status === 'active' ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="pe-4 text-center">
                          <button className="btn btn-sm btn-action btn-outline-primary me-1" title="Edit" onClick={() => { setEditTypeId(t._id); setTypeForm({ name: t.name, status: t.status || 'active' }); setShowCreateType(true) }}>
                            <i className="bi bi-pencil"></i>
                          </button>
                          <button className="btn btn-sm btn-action btn-outline-danger" title="Delete" onClick={() => handleDeleteType(t._id)}>
                            <i className="bi bi-trash"></i>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {typeFiltered.length > 0 && (
                <Pagination total={typeFiltered.length} page={typePage} perPage={typePerPage} onPageChange={setTypePage} onPerPageChange={v => { setTypePerPage(v); setTypePage(1) }} />
              )}
            </div>
          </div>
        )
      })()}

      {/* SalesTax Tab */}
      {activeTab === 'salesTax' && (() => {
        const taxFiltered = taxRates.filter(t => {
          if (!taxSearch.trim()) return true
          const s = taxSearch.toLowerCase()
          return (t.name || '').toLowerCase().includes(s) || (t.state || '').toLowerCase().includes(s)
        })
        const taxTotalPages = Math.ceil(taxFiltered.length / taxPerPage)
        const taxPaginated = taxFiltered.slice((taxPage - 1) * taxPerPage, taxPage * taxPerPage)
        return (
          <div className="card border-0 shadow-sm mt-3">
            <div className="card-header py-3 border-0" style={{ background: 'linear-gradient(135deg, #2563eb, #1e40af)', color: '#fff' }}>
              <div className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0"><i className="bi bi-percent me-2"></i>Sales Tax Rates</h5>
                <div className="d-flex gap-2">
                  <span className="badge bg-white bg-opacity-25 px-3 py-2">{taxRates.length} rates</span>
                  <button className="btn btn-sm btn-light" onClick={() => { setEditTaxId(null); setTaxForm({ name: '', rate: '', factor: '', state: '', status: 'active' }); setShowCreateTax(true) }}>
                    <i className="bi bi-plus-lg me-1"></i>New Tax Rate
                  </button>
                </div>
              </div>
            </div>
            <div className="card-body p-0">
              <div className="px-3 py-3">
                <div className="input-group" style={{ maxWidth: 280 }}>
                  <span className="input-group-text bg-white"><i className="bi bi-search"></i></span>
                  <input type="text" className="form-control" placeholder="Search tax rates..." value={taxSearch} onChange={e => { setTaxSearch(e.target.value); setTaxPage(1) }} />
                </div>
              </div>
              <div className="table-responsive">
                <table className="table table-hover mb-0 align-middle">
                  <thead className="bg-light">
                    <tr>
                      <th className="ps-4" style={{ width: 70 }}>List #</th>
                      <th>State Name</th>
                      <th>Sales Tax %</th>
                      <th>Sales Tax Factor</th>
                      <th>Action</th>
                      <th className="pe-4">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {taxLoading ? (
                      <tr><td colSpan="6" className="text-center py-5 text-muted">
                        <div className="spinner-border spinner-border-sm me-2"></div>Loading...
                      </td></tr>
                    ) : taxPaginated.length === 0 ? (
                      <tr><td colSpan="6" className="text-center py-5 text-muted">No tax rates found</td></tr>
                    ) : taxPaginated.map((t, i) => (
                      <tr key={t._id}>
                        <td className="ps-4 text-muted">{(taxPage - 1) * taxPerPage + i + 1}</td>
                        <td className="fw-medium">{t.name}</td>
                        <td>{(Number(t.rate) || 0).toFixed(2)}%</td>
                        <td>{(Number(t.factor) || 0).toFixed(4)}</td>
                        <td>
                          <button className="btn btn-sm btn-action btn-outline-primary me-1" title="Edit" onClick={() => { setEditTaxId(t._id); setTaxForm({ name: t.name, rate: t.rate, factor: t.factor || 0, state: t.state || '', status: t.status || 'active' }); setShowCreateTax(true) }}>
                            <i className="bi bi-pencil"></i>
                          </button>
                          <button className="btn btn-sm btn-action btn-outline-danger" title="Delete" onClick={() => handleDeleteTax(t._id)}>
                            <i className="bi bi-trash"></i>
                          </button>
                        </td>
                        <td className="pe-4">
                          <span className={`badge badge-${t.status === 'active' ? 'active' : 'inactive'}`}>
                            {t.status === 'active' ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {taxFiltered.length > 0 && (
                <Pagination total={taxFiltered.length} page={taxPage} perPage={taxPerPage} totalPages={taxTotalPages} onPageChange={setTaxPage} onPerPageChange={v => { setTaxPerPage(v); setTaxPage(1) }} />
              )}
            </div>
          </div>
        )
      })()}

      {/* Costs Tab */}
      {activeTab === 'costs' && (() => {
        const costFiltered = costItems.filter(c => {
          if (!costSearch.trim()) return true
          const s = costSearch.toLowerCase()
          return (c.name || '').toLowerCase().includes(s) || (c.description || '').toLowerCase().includes(s)
        })
        const costPaginated = costFiltered.slice((costPage - 1) * costPerPage, costPage * costPerPage)
        return (
          <div className="card border-0 shadow-sm mt-3">
            <div className="card-header py-3 border-0" style={{ background: 'linear-gradient(135deg, #2563eb, #1e40af)', color: '#fff' }}>
              <div className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0"><i className="bi bi-cash-stack me-2"></i>Cost List</h5>
                <div className="d-flex gap-2">
                  <span className="badge bg-white bg-opacity-25 px-3 py-2">{costItems.length} items</span>
                  <button className="btn btn-sm btn-light" onClick={() => { setEditCostId(null); setCostForm({ name: '', description: '', status: 'active' }); setShowCreateCost(true) }}>
                    <i className="bi bi-plus-lg me-1"></i>New Cost
                  </button>
                </div>
              </div>
            </div>
            <div className="card-body p-0">
              <div className="px-3 py-3">
                <div className="input-group" style={{ maxWidth: 280 }}>
                  <span className="input-group-text bg-white"><i className="bi bi-search"></i></span>
                  <input type="text" className="form-control" placeholder="Search costs..." value={costSearch} onChange={e => { setCostSearch(e.target.value); setCostPage(1) }} />
                </div>
              </div>
              <div className="table-responsive">
                <table className="table table-hover mb-0 align-middle">
                  <thead className="bg-light">
                    <tr>
                      <th className="ps-4" style={{ width: 70 }}>List #</th>
                      <th>Items</th>
                      <th>Description</th>
                      <th>Action</th>
                      <th className="pe-4">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {costLoading ? (
                      <tr><td colSpan="5" className="text-center py-5 text-muted">
                        <div className="spinner-border spinner-border-sm me-2"></div>Loading...
                      </td></tr>
                    ) : costPaginated.length === 0 ? (
                      <tr><td colSpan="5" className="text-center py-5 text-muted">No cost items found</td></tr>
                    ) : costPaginated.map((c, i) => (
                      <tr key={c._id}>
                        <td className="ps-4 text-muted">{(costPage - 1) * costPerPage + i + 1}</td>
                        <td className="fw-medium">{c.name}</td>
                        <td><span className="text-muted">{c.description || '-'}</span></td>
                        <td>
                          <button className="btn btn-sm btn-action btn-outline-primary me-1" title="Edit" onClick={() => { setEditCostId(c._id); setCostForm({ name: c.name, description: c.description || '', status: c.status || 'active' }); setShowCreateCost(true) }}>
                            <i className="bi bi-pencil"></i>
                          </button>
                          <button className="btn btn-sm btn-action btn-outline-danger" title="Delete" onClick={() => handleDeleteCost(c._id)}>
                            <i className="bi bi-trash"></i>
                          </button>
                        </td>
                        <td className="pe-4">
                          <span className={`badge badge-${c.status === 'active' ? 'active' : 'inactive'}`}>
                            {c.status === 'active' ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {costFiltered.length > 0 && (
                <Pagination total={costFiltered.length} page={costPage} perPage={costPerPage} onPageChange={setCostPage} onPerPageChange={v => { setCostPerPage(v); setCostPage(1) }} />
              )}
            </div>
          </div>
        )
      })()}

      {/* Product Tab */}
      {activeTab === 'product' && (
        <div className="card border-0 shadow-sm mt-3">
          <div className="card-header py-3 border-0" style={{ background: 'linear-gradient(135deg, #2563eb, #1e40af)', color: '#fff' }}>
            <h5 className="mb-0"><i className="bi bi-box-seam me-2"></i>Product</h5>
          </div>
          <div className="card-body p-0">
            {/* Sub-tabs */}
            <ul className="nav nav-tabs px-3 pt-3" style={{ borderBottom: '2px solid #dee2e6' }}>
              {[
                { key: 'size', label: 'Size' },
                { key: 'styles', label: 'Styles' },
              ].map(t => (
                <li className="nav-item" key={t.key}>
                  <button
                    className={`nav-link px-4 ${productSubTab === t.key ? 'active fw-semibold' : 'text-muted'}`}
                    style={productSubTab === t.key ? { borderBottom: '2px solid var(--primary)', color: 'var(--primary)' } : {}}
                    onClick={() => setProductSubTab(t.key)}
                  >{t.label}</button>
                </li>
              ))}
            </ul>

            {/* Size Sub-tab */}
            {productSubTab === 'size' && (() => {
              const sizeFiltered = prodSizes.filter(s => {
                if (!sizeSearch.trim()) return true
                const q = sizeSearch.toLowerCase()
                return (s.name || '').toLowerCase().includes(q) || (s.description || '').toLowerCase().includes(q)
              })
              const sizePaginated = sizeFiltered.slice((sizePage - 1) * sizePerPage, sizePage * sizePerPage)
              return (
                <div className="p-0">
                  <div className="d-flex justify-content-between align-items-center px-3 py-3">
                    <div className="input-group" style={{ maxWidth: 280 }}>
                      <span className="input-group-text bg-white"><i className="bi bi-search"></i></span>
                      <input type="text" className="form-control" placeholder="Search sizes..." value={sizeSearch} onChange={e => { setSizeSearch(e.target.value); setSizePage(1) }} />
                    </div>
                    <button className="btn btn-sm btn-primary" onClick={() => { setEditProdSizeId(null); setProdSizeForm({ name: '', description: '', status: 'active' }); setShowCreateProdSize(true) }}>
                      <i className="bi bi-plus-lg me-1"></i>New Size
                    </button>
                  </div>
                  <div className="table-responsive">
                    <table className="table table-hover mb-0 align-middle">
                      <thead className="bg-light">
                        <tr>
                          <th className="ps-4" style={{ width: 70 }}>List #</th>
                          <th>Size Name</th>
                          <th>Description</th>
                          <th>Action</th>
                          <th className="pe-4">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {prodSizeLoading ? (
                          <tr><td colSpan="5" className="text-center py-5 text-muted"><div className="spinner-border spinner-border-sm me-2"></div>Loading...</td></tr>
                        ) : sizePaginated.length === 0 ? (
                          <tr><td colSpan="5" className="text-center py-5 text-muted">No sizes found</td></tr>
                        ) : sizePaginated.map((s, i) => (
                          <tr key={s._id}>
                            <td className="ps-4 text-muted">{(sizePage - 1) * sizePerPage + i + 1}</td>
                            <td className="fw-medium">{s.name || s.code || '-'}</td>
                            <td><span className="text-muted">{s.description || '-'}</span></td>
                            <td>
                              <button className="btn btn-sm btn-action btn-outline-primary me-1" title="Edit" onClick={() => { setEditProdSizeId(s._id); setProdSizeForm({ name: s.name || s.code || '', description: s.description || '', status: s.status || 'active' }); setShowCreateProdSize(true) }}>
                                <i className="bi bi-pencil"></i>
                              </button>
                              <button className="btn btn-sm btn-action btn-outline-danger" title="Delete" onClick={() => handleDeleteProdSize(s._id)}>
                                <i className="bi bi-trash"></i>
                              </button>
                            </td>
                            <td className="pe-4">
                              <span className={`badge badge-${s.status === 'active' ? 'active' : 'inactive'}`}>
                                {s.status === 'active' ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {sizeFiltered.length > 0 && (
                    <Pagination total={sizeFiltered.length} page={sizePage} perPage={sizePerPage} onPageChange={setSizePage} onPerPageChange={v => { setSizePerPage(v); setSizePage(1) }} />
                  )}
                </div>
              )
            })()}

            {/* Styles Sub-tab */}
            {productSubTab === 'styles' && (() => {
              const styleFiltered = prodStyles.filter(s => {
                if (!styleSearch.trim()) return true
                const q = styleSearch.toLowerCase()
                return (s.name || '').toLowerCase().includes(q) || (s.description || '').toLowerCase().includes(q)
              })
              const stylePaginated = styleFiltered.slice((stylePage - 1) * stylePerPage, stylePage * stylePerPage)
              return (
                <div className="p-0">
                  <div className="d-flex justify-content-between align-items-center px-3 py-3">
                    <div className="input-group" style={{ maxWidth: 280 }}>
                      <span className="input-group-text bg-white"><i className="bi bi-search"></i></span>
                      <input type="text" className="form-control" placeholder="Search styles..." value={styleSearch} onChange={e => { setStyleSearch(e.target.value); setStylePage(1) }} />
                    </div>
                    <button className="btn btn-sm btn-primary" onClick={() => { setEditProdStyleId(null); setProdStyleForm({ name: '', description: '', status: 'active' }); setShowCreateProdStyle(true) }}>
                      <i className="bi bi-plus-lg me-1"></i>New Style
                    </button>
                  </div>
                  <div className="table-responsive">
                    <table className="table table-hover mb-0 align-middle">
                      <thead className="bg-light">
                        <tr>
                          <th className="ps-4" style={{ width: 70 }}>List #</th>
                          <th>Style Name</th>
                          <th>Description</th>
                          <th>Action</th>
                          <th className="pe-4">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {prodStyleLoading ? (
                          <tr><td colSpan="5" className="text-center py-5 text-muted"><div className="spinner-border spinner-border-sm me-2"></div>Loading...</td></tr>
                        ) : stylePaginated.length === 0 ? (
                          <tr><td colSpan="5" className="text-center py-5 text-muted">No styles found</td></tr>
                        ) : stylePaginated.map((s, i) => (
                          <tr key={s._id}>
                            <td className="ps-4 text-muted">{(stylePage - 1) * stylePerPage + i + 1}</td>
                            <td className="fw-medium">{s.name}</td>
                            <td><span className="text-muted">{s.description || '-'}</span></td>
                            <td>
                              <button className="btn btn-sm btn-action btn-outline-primary me-1" title="Edit" onClick={() => { setEditProdStyleId(s._id); setProdStyleForm({ name: s.name, description: s.description || '', status: s.status || 'active' }); setShowCreateProdStyle(true) }}>
                                <i className="bi bi-pencil"></i>
                              </button>
                              <button className="btn btn-sm btn-action btn-outline-danger" title="Delete" onClick={() => handleDeleteProdStyle(s._id)}>
                                <i className="bi bi-trash"></i>
                              </button>
                            </td>
                            <td className="pe-4">
                              <span className={`badge badge-${s.status === 'active' ? 'active' : 'inactive'}`}>
                                {s.status === 'active' ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                  {styleFiltered.length > 0 && (
                    <Pagination total={styleFiltered.length} page={stylePage} perPage={stylePerPage} onPageChange={setStylePage} onPerPageChange={v => { setStylePerPage(v); setStylePage(1) }} />
                  )}
                </div>
              )
            })()}
          </div>
        </div>
      )}

      {/* Create/Edit Product Size Modal */}
      {showCreateProdSize && (
        <>
          <div className="modal-backdrop fade show" style={{ zIndex: 1050 }}></div>
          <div className="modal fade show d-block" tabIndex="-1" style={{ zIndex: 1055 }}>
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content border-0 shadow" style={{ borderRadius: 16, overflow: 'hidden' }}>
                <div className="modal-header text-white border-0" style={{ background: 'linear-gradient(135deg, #2563eb, #1e40af)' }}>
                  <h5 className="modal-title fw-bold"><i className="bi bi-rulers me-2"></i>{editProdSizeId ? 'Edit' : 'New'} Size</h5>
                  <button type="button" className="btn-close btn-close-white" onClick={() => { setShowCreateProdSize(false); setEditProdSizeId(null) }}></button>
                </div>
                <form onSubmit={handleSaveProdSize}>
                  <div className="modal-body">
                    <div className="mb-3">
                      <label className="form-label">Size Name <span className="text-danger">*</span></label>
                      <input type="text" className="form-control" required value={prodSizeForm.name} onChange={e => setProdSizeForm({ ...prodSizeForm, name: e.target.value })} placeholder="e.g. 1S" />
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Description</label>
                      <input type="text" className="form-control" value={prodSizeForm.description} onChange={e => setProdSizeForm({ ...prodSizeForm, description: e.target.value })} placeholder="e.g. Size 1S" />
                    </div>
                    <div>
                      <label className="form-label">Status</label>
                      <select className="form-select" value={prodSizeForm.status} onChange={e => setProdSizeForm({ ...prodSizeForm, status: e.target.value })}>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>
                  </div>
                  <div className="modal-footer border-0">
                    <button type="button" className="btn btn-outline-secondary" onClick={() => { setShowCreateProdSize(false); setEditProdSizeId(null) }}>Cancel</button>
                    <button type="submit" className="btn btn-primary"><i className="bi bi-check-lg me-1"></i>{editProdSizeId ? 'Update' : 'Create'}</button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Create/Edit Product Style Modal */}
      {showCreateProdStyle && (
        <>
          <div className="modal-backdrop fade show" style={{ zIndex: 1050 }}></div>
          <div className="modal fade show d-block" tabIndex="-1" style={{ zIndex: 1055 }}>
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content border-0 shadow" style={{ borderRadius: 16, overflow: 'hidden' }}>
                <div className="modal-header text-white border-0" style={{ background: 'linear-gradient(135deg, #2563eb, #1e40af)' }}>
                  <h5 className="modal-title fw-bold"><i className="bi bi-palette me-2"></i>{editProdStyleId ? 'Edit' : 'New'} Style</h5>
                  <button type="button" className="btn-close btn-close-white" onClick={() => { setShowCreateProdStyle(false); setEditProdStyleId(null) }}></button>
                </div>
                <form onSubmit={handleSaveProdStyle}>
                  <div className="modal-body">
                    <div className="mb-3">
                      <label className="form-label">Style Name <span className="text-danger">*</span></label>
                      <input type="text" className="form-control" required value={prodStyleForm.name} onChange={e => setProdStyleForm({ ...prodStyleForm, name: e.target.value })} placeholder="e.g. Blk" />
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Description</label>
                      <input type="text" className="form-control" value={prodStyleForm.description} onChange={e => setProdStyleForm({ ...prodStyleForm, description: e.target.value })} placeholder="e.g. Black" />
                    </div>
                    <div>
                      <label className="form-label">Status</label>
                      <select className="form-select" value={prodStyleForm.status} onChange={e => setProdStyleForm({ ...prodStyleForm, status: e.target.value })}>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>
                  </div>
                  <div className="modal-footer border-0">
                    <button type="button" className="btn btn-outline-secondary" onClick={() => { setShowCreateProdStyle(false); setEditProdStyleId(null) }}>Cancel</button>
                    <button type="submit" className="btn btn-primary"><i className="bi bi-check-lg me-1"></i>{editProdStyleId ? 'Update' : 'Create'}</button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Create/Edit Cost Modal */}
      {showCreateCost && (
        <>
          <div className="modal-backdrop fade show" style={{ zIndex: 1050 }}></div>
          <div className="modal fade show d-block" tabIndex="-1" style={{ zIndex: 1055 }}>
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content border-0 shadow" style={{ borderRadius: 16, overflow: 'hidden' }}>
                <div className="modal-header text-white border-0" style={{ background: 'linear-gradient(135deg, #2563eb, #1e40af)' }}>
                  <h5 className="modal-title fw-bold"><i className="bi bi-cash-stack me-2"></i>{editCostId ? 'Edit' : 'New'} Cost Item</h5>
                  <button type="button" className="btn-close btn-close-white" onClick={() => { setShowCreateCost(false); setEditCostId(null) }}></button>
                </div>
                <form onSubmit={handleSaveCost}>
                  <div className="modal-body">
                    <div className="mb-3">
                      <label className="form-label">Items <span className="text-danger">*</span></label>
                      <input type="text" className="form-control" required value={costForm.name} onChange={e => setCostForm({ ...costForm, name: e.target.value })} placeholder="e.g. Hotel" />
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Description</label>
                      <textarea className="form-control" rows="2" value={costForm.description} onChange={e => setCostForm({ ...costForm, description: e.target.value })} placeholder="Description of cost item"></textarea>
                    </div>
                    <div>
                      <label className="form-label">Status</label>
                      <select className="form-select" value={costForm.status} onChange={e => setCostForm({ ...costForm, status: e.target.value })}>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>
                  </div>
                  <div className="modal-footer border-0">
                    <button type="button" className="btn btn-outline-secondary" onClick={() => { setShowCreateCost(false); setEditCostId(null) }}>Cancel</button>
                    <button type="submit" className="btn btn-primary"><i className="bi bi-check-lg me-1"></i>{editCostId ? 'Update' : 'Create'}</button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Create/Edit Tax Rate Modal */}
      {showCreateTax && (
        <>
          <div className="modal-backdrop fade show" style={{ zIndex: 1050 }}></div>
          <div className="modal fade show d-block" tabIndex="-1" style={{ zIndex: 1055 }}>
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content border-0 shadow" style={{ borderRadius: 16, overflow: 'hidden' }}>
                <div className="modal-header text-white border-0" style={{ background: 'linear-gradient(135deg, #2563eb, #1e40af)' }}>
                  <h5 className="modal-title fw-bold"><i className="bi bi-percent me-2"></i>{editTaxId ? 'Edit' : 'New'} Tax Rate</h5>
                  <button type="button" className="btn-close btn-close-white" onClick={() => { setShowCreateTax(false); setEditTaxId(null) }}></button>
                </div>
                <form onSubmit={handleSaveTax}>
                  <div className="modal-body">
                    <div className="mb-3">
                      <label className="form-label">State Name <span className="text-danger">*</span></label>
                      <input type="text" className="form-control" required value={taxForm.name} onChange={e => setTaxForm({ ...taxForm, name: e.target.value })} placeholder="e.g. Chicago IL" />
                    </div>
                    <div className="row g-3">
                      <div className="col-md-6">
                        <label className="form-label">Sales Tax % <span className="text-danger">*</span></label>
                        <input type="number" step="0.01" min="0" className="form-control" required value={taxForm.rate} onChange={e => setTaxForm({ ...taxForm, rate: e.target.value })} placeholder="e.g. 8.25" />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">Sales Tax Factor</label>
                        <input type="number" step="0.0001" min="0" className="form-control" value={taxForm.factor} onChange={e => setTaxForm({ ...taxForm, factor: e.target.value })} placeholder="e.g. 0.924" />
                      </div>
                    </div>
                    <div className="mt-3">
                      <label className="form-label">Status</label>
                      <select className="form-select" value={taxForm.status} onChange={e => setTaxForm({ ...taxForm, status: e.target.value })}>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>
                  </div>
                  <div className="modal-footer border-0">
                    <button type="button" className="btn btn-outline-secondary" onClick={() => { setShowCreateTax(false); setEditTaxId(null) }}>Cancel</button>
                    <button type="submit" className="btn btn-primary"><i className="bi bi-check-lg me-1"></i>{editTaxId ? 'Update' : 'Create'}</button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Create Event Modal */}
      {showCreate && (
        <>
          <div className="modal-backdrop fade show" style={{ zIndex: 1050 }}></div>
          <div className="modal fade show d-block" tabIndex="-1" style={{ zIndex: 1055 }}>
            <div className="modal-dialog modal-lg modal-dialog-centered">
              <div className="modal-content border-0 shadow">
                <div className="modal-header text-white border-0" style={{ background: 'linear-gradient(135deg, #2563eb, #1e40af)' }}>
                  <h5 className="modal-title fw-bold"><i className="bi bi-plus-circle me-2"></i>New Event</h5>
                  <button type="button" className="btn-close btn-close-white" onClick={() => setShowCreate(false)}></button>
                </div>
                <form onSubmit={handleCreate}>
                  <div className="modal-body">
                    <div className="row g-3">
                      <div className="col-md-6">
                        <label className="form-label">Event Name <span className="text-danger">*</span></label>
                        <input type="text" className="form-control" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">Location / State</label>
                        <input type="text" className="form-control" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">Start Date</label>
                        <input type="date" className="form-control" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">End Date</label>
                        <input type="date" className="form-control" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} />
                      </div>
                      <div className="col-12">
                        <label className="form-label">Description</label>
                        <textarea className="form-control" rows="2" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}></textarea>
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">Status</label>
                        <select className="form-select" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                          <option value="active">Active</option>
                          <option value="inactive">Inactive</option>
                        </select>
                      </div>
                    </div>
                  </div>
                  <div className="modal-footer border-0">
                    <button type="button" className="btn btn-outline-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
                    <button type="submit" className="btn btn-primary"><i className="bi bi-check-lg me-1"></i>Create Event</button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Edit Event Modal */}
      {showEdit && (
        <>
          <div className="modal-backdrop fade show" style={{ zIndex: 1050 }}></div>
          <div className="modal fade show d-block" tabIndex="-1" style={{ zIndex: 1055 }}>
            <div className="modal-dialog modal-lg modal-dialog-centered">
              <div className="modal-content border-0 shadow">
                <div className="modal-header text-white border-0" style={{ background: 'linear-gradient(135deg, #2563eb, #1e40af)' }}>
                  <h5 className="modal-title fw-bold"><i className="bi bi-pencil me-2"></i>Edit Event</h5>
                  <button type="button" className="btn-close btn-close-white" onClick={() => setShowEdit(null)}></button>
                </div>
                <form onSubmit={handleUpdate}>
                  <div className="modal-body">
                    <div className="row g-3">
                      <div className="col-md-6">
                        <label className="form-label">Event Name <span className="text-danger">*</span></label>
                        <input type="text" className="form-control" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">Location / State</label>
                        <input type="text" className="form-control" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">Start Date</label>
                        <input type="date" className="form-control" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">End Date</label>
                        <input type="date" className="form-control" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} />
                      </div>
                      <div className="col-12">
                        <label className="form-label">Description</label>
                        <textarea className="form-control" rows="2" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}></textarea>
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">Status</label>
                        <select className="form-select" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                          <option value="active">Active</option>
                          <option value="inactive">Inactive</option>
                          <option value="deleted">Deleted</option>
                        </select>
                      </div>
                    </div>
                  </div>
                  <div className="modal-footer border-0">
                    <button type="button" className="btn btn-outline-secondary" onClick={() => setShowEdit(null)}>Cancel</button>
                    <button type="submit" className="btn btn-primary"><i className="bi bi-check-lg me-1"></i>Update Event</button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Create/Edit Event Type Modal */}
      {showCreateType && (
        <>
          <div className="modal-backdrop fade show" style={{ zIndex: 1050 }}></div>
          <div className="modal fade show d-block" tabIndex="-1" style={{ zIndex: 1055 }}>
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content border-0 shadow">
                <div className="modal-header text-white border-0" style={{ background: 'linear-gradient(135deg, #2563eb, #1e40af)' }}>
                  <h5 className="modal-title fw-bold">{editTypeId ? 'Edit' : 'New'} Event Type</h5>
                  <button type="button" className="btn-close btn-close-white" onClick={() => { setShowCreateType(false); setEditTypeId(null) }}></button>
                </div>
                <form onSubmit={handleCreateType}>
                  <div className="modal-body">
                    <div className="mb-3">
                      <label className="form-label">Type Name <span className="text-danger">*</span></label>
                      <input type="text" className="form-control" required value={typeForm.name} onChange={e => setTypeForm({ ...typeForm, name: e.target.value })} />
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Status</label>
                      <select className="form-select" value={typeForm.status} onChange={e => setTypeForm({ ...typeForm, status: e.target.value })}>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>
                  </div>
                  <div className="modal-footer border-0">
                    <button type="button" className="btn btn-outline-secondary" onClick={() => { setShowCreateType(false); setEditTypeId(null) }}>Cancel</button>
                    <button type="submit" className="btn btn-primary"><i className="bi bi-check-lg me-1"></i>{editTypeId ? 'Update' : 'Create'}</button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Detail Modal */}
      {showDetail && (
        <>
          <div className="modal-backdrop fade show" style={{ zIndex: 1050 }}></div>
          <div className="modal fade show d-block" tabIndex="-1" style={{ zIndex: 1055 }}>
            <div className="modal-dialog modal-xl modal-dialog-centered">
              <div className="modal-content border-0 shadow">
                <div className="modal-header text-white border-0" style={{ background: 'linear-gradient(135deg, #2563eb, #1e40af)' }}>
                  <h5 className="modal-title fw-bold"><i className="bi bi-calendar-event me-2"></i>{showDetail.name || 'Event Detail'}</h5>
                  <button type="button" className="btn-close btn-close-white" onClick={() => { setShowDetail(null); setDetailData(null) }}></button>
                </div>
                <div className="modal-body">
                  {detailLoading ? (
                    <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>
                  ) : detailData ? (
                    <>
                      <div className="row g-3 mb-4">
                        <div className="col-md-6"><div className="form-label">Name</div><div className="fw-medium">{detailData.name}</div></div>
                        <div className="col-md-6"><div className="form-label">Location</div><div>{detailData.location || '-'}</div></div>
                        <div className="col-md-3"><div className="form-label">Start Date</div><div>{fmtDate(detailData.start_date) || '-'}</div></div>
                        <div className="col-md-3"><div className="form-label">End Date</div><div>{fmtDate(detailData.end_date) || '-'}</div></div>
                        <div className="col-md-3"><div className="form-label">Status</div><span className={`badge badge-${detailData.status === 'active' ? 'active' : 'inactive'}`}>{detailData.status}</span></div>
                        {detailData.description && <div className="col-12"><div className="form-label">Description</div><div>{detailData.description}</div></div>}
                      </div>

                      <h6 className="fw-bold mb-2"><i className="bi bi-box-seam me-1 text-primary"></i>Items ({(detailData.items || []).length})</h6>
                      {(detailData.items || []).length > 0 ? (
                        <div className="table-responsive mb-4">
                          <table className="table table-hover table-sm mb-0 align-middle">
                            <thead className="bg-light"><tr><th>Product ID</th><th>Qty</th><th>Price</th><th>Status</th></tr></thead>
                            <tbody>
                              {(detailData.items || []).slice(0, 20).map((item, i) => (
                                <tr key={i}>
                                  <td>{item.product_id || '-'}</td>
                                  <td>{item.total_qty || '-'}</td>
                                  <td>{item.price ? num(item.price) : '-'}</td>
                                  <td>{item.status || item.status_type || '-'}</td>
                                </tr>
                              ))}
                              {(detailData.items || []).length > 20 && <tr><td colSpan="4" className="text-muted text-center">... and {detailData.items.length - 20} more</td></tr>}
                            </tbody>
                          </table>
                        </div>
                      ) : <p className="text-muted small mb-4">No items</p>}

                      <h6 className="fw-bold mb-2"><i className="bi bi-receipt me-1 text-primary"></i>Receipts ({(detailData.receipts || []).length})</h6>
                      {(detailData.receipts || []).length > 0 ? (
                        <div className="table-responsive mb-4">
                          <table className="table table-hover table-sm mb-0 align-middle">
                            <thead className="bg-light"><tr><th>Day</th><th className="text-end">Cash</th><th className="text-end">Credit</th><th className="text-end">Checks</th><th className="text-end">Total</th></tr></thead>
                            <tbody>
                              {(detailData.receipts || []).map((r, i) => (
                                <tr key={i}>
                                  <td>{r.event_day || i + 1}</td>
                                  <td className="text-end">{num(r.cash)}</td>
                                  <td className="text-end">{num(r.credit)}</td>
                                  <td className="text-end">{num(r.checks)}</td>
                                  <td className="text-end fw-medium">{num((Number(r.cash) || 0) + (Number(r.credit) || 0) + (Number(r.checks) || 0))}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : <p className="text-muted small mb-4">No receipts</p>}

                      <h6 className="fw-bold mb-2"><i className="bi bi-cash-stack me-1 text-primary"></i>Costs ({(detailData.costs || []).length})</h6>
                      {(detailData.costs || []).length > 0 ? (
                        <div className="table-responsive">
                          <table className="table table-hover table-sm mb-0 align-middle">
                            <thead className="bg-light"><tr><th>Item</th><th className="text-end">Price</th><th>Status</th></tr></thead>
                            <tbody>
                              {(detailData.costs || []).map((c, i) => (
                                <tr key={i}><td>{c.item_name || c.description || '-'}</td><td className="text-end">{num(c.price)}</td><td>{c.status || '-'}</td></tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : <p className="text-muted small">No costs</p>}
                    </>
                  ) : <p className="text-muted">No data</p>}
                </div>
                <div className="modal-footer border-0">
                  <button className="btn btn-outline-secondary" onClick={() => { setShowDetail(null); setDetailData(null) }}>Close</button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Delete Modal */}
      {deleteEvt && (
        <>
          <div className="modal-backdrop fade show" style={{ zIndex: 1050 }}></div>
          <div className="modal fade show d-block" tabIndex="-1" style={{ zIndex: 1055 }}>
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content border-0 shadow">
                <div className="modal-header text-white border-0" style={{ background: 'linear-gradient(135deg, #dc2626, #b91c1c)' }}>
                  <h5 className="modal-title fw-bold"><i className="bi bi-exclamation-triangle me-2"></i>Delete Event</h5>
                  <button type="button" className="btn-close btn-close-white" onClick={() => setDeleteEvt(null)}></button>
                </div>
                <div className="modal-body text-center py-4">
                  <div className="mb-3" style={{ fontSize: '3rem', color: '#dc2626' }}>
                    <i className="bi bi-shield-exclamation"></i>
                  </div>
                  <h5 className="fw-bold mb-2">"{deleteEvt.name}"</h5>
                  <p className="text-muted mb-0">Are you sure you want to delete this event?</p>
                </div>
                <div className="modal-footer border-0 justify-content-center gap-2">
                  <button className="btn btn-outline-secondary" onClick={() => setDeleteEvt(null)}>Cancel</button>
                  <button className="btn btn-danger" onClick={handleDelete}><i className="bi bi-trash me-1"></i>Delete</button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}
