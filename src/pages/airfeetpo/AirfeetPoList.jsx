import { useState, useEffect, useRef } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import html2pdf from 'html2pdf.js'
import { api } from '../../lib/api'
import Pagination from '../../components/Pagination'

export default function AirfeetPoList() {
  const [pos, setPos] = useState([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ total: 0, active: 0, shipped: 0, totalAmount: 0 })
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(10)
  const [deletePo, setDeletePo] = useState(null)
  const [showCreate, setShowCreate] = useState(false)
  const [custPoPo, setCustPoPo] = useState(null)
  const [custPoFiles, setCustPoFiles] = useState([])
  const [custPoUploading, setCustPoUploading] = useState(false)
  const [poFileMap, setPoFileMap] = useState({})
  const [dragOver, setDragOver] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState([])
  const [invoicePo, setInvoicePo] = useState(null)
  const [invoiceLoading, setInvoiceLoading] = useState(false)
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [emailForm, setEmailForm] = useState({ to: '', cc: '', bcc: '', subject: '', message: '' })
  const [emailSending, setEmailSending] = useState(false)
  const custPoFileRef = useRef(null)
  const [suppliers, setSuppliers] = useState([])
  const [editPo, setEditPo] = useState(null)
  const [form, setForm] = useState({ supplier_id: '', supplier_name: '', po_number: '', po_date: '', invoice_number: '', invoice_date: '', project: '', po_notes: '', shipinfo_notes: '', shipping_costs: '', po_total_qty: '', po_net_amount: '', sales_tax_type: '', sales_tax_percentage: '', sales_tax_amount: '', credit_card_notes: '', inv_quote_status: 0, contact_info: '', billing_address: '', shipping_address: '', paid_value: '', paid_date: '', inv_status: '', cc_charge: 0, cc_per: '', cc_amt: '' })
  const [lineItems, setLineItems] = useState([])
  const [suppContacts, setSuppContacts] = useState([])
  const [suppAddresses, setSuppAddresses] = useState([])
  const [searchParams, setSearchParams] = useSearchParams()

  async function loadSuppData(suppLegacyId) {
    if (!suppLegacyId) { setSuppContacts([]); setSuppAddresses([]); return }
    try {
      const supp = suppliers.find(s => String(s.legacy_id) === String(suppLegacyId))
      if (supp?._id) {
        const full = await api.getSupplierFull(supp._id)
        setSuppContacts(full.contacts || [])
        setSuppAddresses(full.addresses || [])
      }
    } catch { setSuppContacts([]); setSuppAddresses([]) }
  }

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    setLoading(true)
    try {
      const [data, statsData, supps] = await Promise.all([
        api.getAirfeetPos(),
        api.getAirfeetPoStats(),
        api.getAirfeetPoSuppliers()
      ])
      setPos(data || [])
      setStats(statsData || { total: 0, active: 0, shipped: 0, totalAmount: 0 })
      setSuppliers(supps || [])
      // Load file existence map
      try {
        const fileMap = await api.getAirfeetPoFileMap()
        setPoFileMap(fileMap || {})
      } catch { setPoFileMap({}) }
    } catch (err) {
      toast.error('Failed to load: ' + err.message)
    }
    setLoading(false)
  }

  // Auto-open create modal if ?supplier= query param present
  useEffect(() => {
    const suppParam = searchParams.get('supplier')
    if (suppParam && suppliers.length > 0 && !showCreate) {
      const supp = suppliers.find(s => String(s.legacy_id) === suppParam)
      setEditPo(null)
      setForm({ supplier_id: suppParam, supplier_name: supp?.supplier_name || '', po_number: '', po_date: new Date().toISOString().slice(0, 10), invoice_number: '', invoice_date: '', project: supp?.project || supp?.supp_project || '', po_notes: '', shipinfo_notes: '', shipping_costs: '', po_total_qty: '', po_net_amount: '', sales_tax_type: '', sales_tax_percentage: '', sales_tax_amount: '', credit_card_notes: '', inv_quote_status: 0, contact_info: '', billing_address: '', shipping_address: '', paid_value: '', paid_date: '', inv_status: '', cc_charge: 0, cc_per: '', cc_amt: '' })
      setLineItems([{ description: '', qty: '', uom: '', unit_cost: '' }])
      loadSuppData(suppParam)
      setShowCreate(true)
      setSearchParams({}) // clear the query param
    }
  }, [suppliers])

  function openCreate() {
    setEditPo(null)
    setForm({ supplier_id: '', supplier_name: '', po_number: '', po_date: new Date().toISOString().slice(0, 10), invoice_number: '', invoice_date: '', project: '', po_notes: '', shipinfo_notes: '', shipping_costs: '', po_total_qty: '', po_net_amount: '', sales_tax_type: '', sales_tax_percentage: '', sales_tax_amount: '', credit_card_notes: '', inv_quote_status: 0, contact_info: '', billing_address: '', shipping_address: '', paid_value: '', paid_date: '', inv_status: '', cc_charge: 0, cc_per: '', cc_amt: '' })
    setLineItems([{ description: '', qty: '', uom: '', unit_cost: '' }])
    setSuppContacts([]); setSuppAddresses([])
    setShowCreate(true)
  }

  async function openEdit(po) {
    setEditPo(po)
    setForm({
      supplier_id: po.supplier_id || '',
      supplier_name: po.supplier_name || '',
      po_number: po.po_number || '',
      po_date: po.po_date ? new Date(po.po_date).toISOString().slice(0, 10) : '',
      invoice_number: po.invoice_number || '',
      invoice_date: po.invoice_date ? new Date(po.invoice_date).toISOString().slice(0, 10) : '',
      project: po.project || '',
      po_notes: po.po_notes || '',
      shipinfo_notes: po.shipinfo_notes || '',
      shipping_costs: po.shipping_costs || '',
      po_total_qty: po.po_total_qty || '',
      po_net_amount: po.po_net_amount || '',
      sales_tax_type: po.sales_tax_type || '',
      sales_tax_percentage: po.sales_tax_percentage || '',
      sales_tax_amount: po.sales_tax_amount || '',
      credit_card_notes: po.credit_card_notes || '',
      inv_quote_status: po.inv_quote_status || 0,
      contact_info: po.address1 || po.contact_info || '',
      billing_address: po.billing_address || '',
      shipping_address: po.shipping_address || '',
      paid_value: po.paid_value || '',
      paid_date: po.paid_date && po.paid_date !== '' ? new Date(po.paid_date).toISOString().slice(0, 10) : '',
      inv_status: po.inv_status || '',
      cc_charge: po.charge_ccard || po.cc_charge || 0,
      cc_per: po.cc_per || '',
      cc_amt: po.cc_amt || '',
    })
    // Load supplier contacts/addresses
    loadSuppData(po.supplier_id)
    // Load existing line items
    try {
      const full = await api.getAirfeetPo(po._id)
      const existingItems = (full.items || []).map(it => ({
        description: it.po_item_name || it.item_with_desc || it.item_name || '',
        qty: it.item_qty || it.qty || '',
        uom: it.uom || '',
        unit_cost: it.item_unit_cost || it.unit_cost || '',
      }))
      setLineItems(existingItems.length > 0 ? existingItems : [{ description: '', qty: '', uom: '', unit_cost: '' }])
    } catch {
      setLineItems([{ description: '', qty: '', uom: '', unit_cost: '' }])
    }
    setShowCreate(true)
  }

  // Line item helpers
  function updateLineItem(idx, field, value) {
    setLineItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item))
  }
  function addLineItem() {
    setLineItems(prev => [...prev, { description: '', qty: '', uom: '', unit_cost: '' }])
  }
  function removeLineItem(idx) {
    setLineItems(prev => prev.filter((_, i) => i !== idx))
  }

  // Calculate totals from line items
  function calcItemTotals() {
    let totalQty = 0, netAmount = 0
    lineItems.forEach(item => {
      const q = parseInt(item.qty) || 0
      const c = parseFloat(item.unit_cost) || 0
      totalQty += q
      netAmount += q * c
    })
    return { totalQty, netAmount }
  }

  async function handleSave(e) {
    e.preventDefault()
    if (!form.supplier_id) { toast.error('Select a supplier'); return }
    try {
      const suppName = suppliers.find(s => String(s.legacy_id) === String(form.supplier_id))?.supplier_name || form.supplier_name
      const validItems = lineItems.filter(it => it.description?.trim() || it.qty || it.unit_cost)
      const { totalQty, netAmount } = calcItemTotals()
      const taxAmt = form.sales_tax_type === 'Y' ? netAmount * ((parseFloat(form.sales_tax_percentage) || 0) / 100) : (parseFloat(form.sales_tax_amount) || 0)
      const ccAmt = form.cc_charge ? (netAmount + taxAmt + (parseFloat(form.shipping_costs) || 0)) * ((parseFloat(form.cc_per) || 0) / 100) : 0
      const payload = {
        ...form,
        supplier_name: suppName,
        po_total_qty: validItems.length > 0 ? totalQty : (parseInt(form.po_total_qty) || 0),
        po_net_amount: validItems.length > 0 ? netAmount : (parseFloat(form.po_net_amount) || 0),
        sales_tax_amount: taxAmt,
        cc_amt: ccAmt,
        address1: form.contact_info,
        items: validItems,
      }
      if (editPo) {
        await api.updateAirfeetPo(editPo._id, payload)
        toast.success('PO updated')
      } else {
        await api.createAirfeetPo(payload)
        toast.success('PO created')
      }
      setShowCreate(false)
      fetchData()
    } catch (err) {
      toast.error(err.message)
    }
  }

  async function handleStatusToggle(po) {
    const newStatus = po.inv_status === 'Shipped' ? '' : 'Shipped'
    try {
      await api.updateAirfeetPoStatus(po._id, newStatus)
      toast.success(newStatus ? 'Marked as Shipped' : 'Marked as Active')
      fetchData()
    } catch (err) {
      toast.error(err.message)
    }
  }

  async function handleCopy(po) {
    try {
      await api.copyAirfeetPo(po._id)
      toast.success('PO copied')
      fetchData()
    } catch (err) {
      toast.error(err.message)
    }
  }

  async function handleDelete() {
    if (!deletePo) return
    try {
      await api.deleteAirfeetPo(deletePo._id)
      toast.success('PO deleted')
      setDeletePo(null)
      fetchData()
    } catch (err) {
      toast.error(err.message)
    }
  }

  async function openCustPo(po) {
    setCustPoPo(po)
    setSelectedFiles([])
    setDragOver(false)
    try {
      const files = await api.getAirfeetPoFiles(po._id)
      const allLinks = []
      files.forEach(f => {
        if (f.cutomer_polink) {
          f.cutomer_polink.split(',').filter(Boolean).forEach(link => allLinks.push(link.trim()))
        }
      })
      setCustPoFiles(allLinks)
    } catch {
      setCustPoFiles([])
    }
  }

  function addDropFiles(fileList) {
    const newFiles = Array.from(fileList)
    setSelectedFiles(prev => [...prev, ...newFiles])
  }

  function removeSelectedFile(idx) {
    setSelectedFiles(prev => prev.filter((_, i) => i !== idx))
  }

  async function handleCustPoUpload() {
    if (selectedFiles.length === 0) { toast.error('Select files to upload'); return }
    setCustPoUploading(true)
    try {
      await api.uploadAirfeetPoFiles(custPoPo._id, selectedFiles)
      toast.success('Files uploaded')
      setSelectedFiles([])
      if (custPoFileRef.current) custPoFileRef.current.value = ''
      openCustPo(custPoPo)
      setPoFileMap(prev => ({ ...prev, [custPoPo.legacy_id]: true }))
    } catch (err) {
      toast.error(err.message)
    }
    setCustPoUploading(false)
  }

  async function handleCustPoDelete(filename) {
    try {
      await api.deleteAirfeetPoFile(custPoPo._id, filename.replace('uploads/customer_po/', ''))
      toast.success('File deleted')
      openCustPo(custPoPo)
    } catch (err) {
      toast.error(err.message)
    }
  }

  function fmtDate(d) {
    if (!d) return '-'
    const dt = new Date(d)
    return `${String(dt.getMonth() + 1).padStart(2, '0')}/${String(dt.getDate()).padStart(2, '0')}/${dt.getFullYear()}`
  }

  function fmtMoney(v) {
    return '$' + (parseFloat(v) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  async function openInvoice(po) {
    setInvoiceLoading(true)
    try {
      const data = await api.getAirfeetPoInvoice(po._id)
      setInvoicePo(data)
    } catch (err) {
      toast.error('Failed to load invoice: ' + err.message)
    }
    setInvoiceLoading(false)
  }

  const invoiceStyles = `
    body { font-family: Arial, sans-serif; font-size: 13px; color: #333; margin: 20px; }
    table { width: 100%; border-collapse: collapse; }
    table.table-bordered td, table.table-bordered th { border: 1px solid #dee2e6; padding: 6px 10px; }
    .bg-light { background: #f8f9fa; }
    b { font-weight: bold; }
    p { margin: 0 0 8px 0; }
    .row { display: flex; gap: 0; } .col-6 { width: 50%; padding: 0 8px; box-sizing: border-box; }
    .mb-0 { margin-bottom: 0; } .mb-3 { margin-bottom: 16px; }
    .text-center { text-align: center; } .text-muted { color: #6c757d; }
    @media print { .no-print { display: none !important; } }
  `

  function getInvoiceHtml() {
    const content = document.getElementById('invoice-print-area')
    if (!content) return ''
    return `<!DOCTYPE html><html><head><title>Purchase Order - ${invoicePo?.po_number || ''}</title><style>${invoiceStyles}</style></head><body>${content.innerHTML}</body></html>`
  }

  function printInvoice() {
    const html = getInvoiceHtml()
    if (!html) return
    const win = window.open('', '_blank', 'width=800,height=900')
    win.document.write(html)
    win.document.close()
    win.focus()
    setTimeout(() => win.print(), 300)
  }

  function downloadInvoice() {
    const content = document.getElementById('invoice-print-area')
    if (!content) return
    const opt = {
      margin: [10, 10, 10, 10],
      filename: `PO_${invoicePo?.po_number || 'invoice'}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    }
    html2pdf().set(opt).from(content).save().then(() => {
      toast.success('PDF downloaded')
    })
  }

  function openEmailModal() {
    const poNum = invoicePo?.po_number || ''
    const suppEmail = invoicePo?.supplier?.email || ''
    const contactEmail = invoicePo?.supplierContact?.email || ''
    const toEmails = [suppEmail, contactEmail].filter(Boolean).join(', ')
    setEmailForm({
      to: toEmails,
      cc: '',
      bcc: '',
      subject: `Purchase Order - ${poNum}`,
      message: `Please find attached Purchase Order ${poNum}.\n\nThank you,\nAirfeet LLC`,
    })
    setShowEmailModal(true)
  }

  async function handleSendEmail(e) {
    e.preventDefault()
    if (!emailForm.to.trim()) { toast.error('Please enter recipient email'); return }
    setEmailSending(true)
    try {
      const API_URL = import.meta.env.VITE_API_URL || '/api'
      const res = await fetch(`${API_URL}/airfeet-po/${invoicePo._id}/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(emailForm),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to send email')
      toast.success('Email sent successfully')
      setShowEmailModal(false)
    } catch (err) {
      toast.error(err.message)
    }
    setEmailSending(false)
  }

  const filtered = pos.filter(p => {
    if (!search) return true
    const s = search.toLowerCase()
    return p.supplier_name?.toLowerCase().includes(s) ||
      p.po_number?.toLowerCase().includes(s) ||
      p.invoice_number?.toLowerCase().includes(s) ||
      p.project?.toLowerCase().includes(s)
  })
  const paginated = filtered.slice((page - 1) * perPage, page * perPage)

  return (
    <div>
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <nav aria-label="breadcrumb">
            <ol className="breadcrumb mb-1">
              <li className="breadcrumb-item"><Link to="/dashboard"><i className="bi bi-house-door"></i></Link></li>
              <li className="breadcrumb-item active">Airfeet PO</li>
            </ol>
          </nav>
          <h3 className="mb-0">Airfeet PO</h3>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          <i className="bi bi-plus-lg me-1"></i> New PO
        </button>
      </div>

      {/* Stats */}
      <div className="row g-3 mb-4">
        {[
          { value: stats.total, label: 'Total POs', icon: 'bi-file-earmark-text-fill', bg: '#eff6ff', color: '#2563eb' },
          { value: stats.active, label: 'Active', icon: 'bi-check-circle-fill', bg: '#ecfdf5', color: '#10b981' },
          { value: stats.shipped, label: 'Shipped', icon: 'bi-truck', bg: '#f5f3ff', color: '#8b5cf6' },
          { value: fmtMoney(stats.totalAmount), label: 'Total Amount', icon: 'bi-currency-dollar', bg: '#fff7ed', color: '#f59e0b', raw: true },
        ].map((stat, i) => (
          <div className="col-md-3 col-6" key={i}>
            <div className="stat-card">
              <div className="d-flex align-items-center gap-3">
                <div className="stat-icon" style={{ background: stat.bg, color: stat.color }}>
                  <i className={`bi ${stat.icon}`}></i>
                </div>
                <div>
                  <div className="stat-value">{loading ? '-' : (stat.raw ? stat.value : stat.value)}</div>
                  <div className="stat-label">{stat.label}</div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="card border-0 shadow-sm rounded-4 mb-3">
        <div className="card-body py-3 px-4">
          <div className="d-flex flex-wrap align-items-center gap-3">
            <div className="position-relative flex-grow-1" style={{ maxWidth: 320 }}>
              <i className="bi bi-search position-absolute" style={{ left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}></i>
              <input type="text" className="form-control form-control-sm ps-5" placeholder="Search POs..." value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
            </div>
            {search && (
              <button className="btn btn-sm btn-outline-secondary" onClick={() => { setSearch(''); setPage(1) }}>
                <i className="bi bi-x-lg me-1"></i>Clear
              </button>
            )}
            <span className="text-muted small ms-auto">{filtered.length} PO{filtered.length !== 1 ? 's' : ''}</span>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
        <div className="card-header py-3 border-0" style={{ background: 'linear-gradient(135deg, #2563eb, #1e40af)', color: '#fff' }}>
          <div className="d-flex justify-content-between align-items-center">
            <h5 className="mb-0"><i className="bi bi-file-earmark-text me-2"></i>Airfeet PO</h5>
            <span className="badge bg-white bg-opacity-25 px-3 py-2">{filtered.length} POs</span>
          </div>
        </div>
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="bg-light">
              <tr>
                <th className="ps-4">Supplier</th>
                <th>PO Date</th>
                <th>AF PO #</th>
                <th>QTY</th>
                <th>PO Total ($)</th>
                <th className="text-center" style={{ width: 210 }}>Action</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="7" className="text-center py-4"><div className="spinner-border spinner-border-sm text-primary"></div> Loading...</td></tr>
              ) : paginated.length === 0 ? (
                <tr><td colSpan="7" className="text-center py-4 text-muted"><i className="bi bi-file-earmark-text fs-1 d-block mb-2 opacity-25"></i>No POs found</td></tr>
              ) : paginated.map(po => (
                <tr key={po._id}>
                  <td className="ps-4 fw-semibold">{po.supplier_name || '-'}</td>
                  <td>{fmtDate(po.po_date)}</td>
                  <td><span className="badge bg-success-subtle text-success rounded-pill px-2">{po.po_number || '-'}</span></td>
                  <td>{po.po_total_qty || 0}</td>
                  <td className="fw-semibold">{fmtMoney(po.po_net_amount)}</td>
                  <td className="text-center">
                    <button className="btn btn-sm btn-action btn-outline-primary me-1" title="Edit" onClick={() => openEdit(po)}>
                      <i className="bi bi-pencil"></i>
                    </button>
                    <button className="btn btn-sm btn-action btn-outline-secondary me-1" title="Copy" onClick={() => handleCopy(po)}>
                      <i className="bi bi-copy"></i>
                    </button>
                    <button className="btn btn-sm btn-action btn-outline-info me-1" title="View Invoice" onClick={() => openInvoice(po)}>
                      <i className="bi bi-file-text"></i>
                    </button>
                    <button
                      className={`btn btn-sm btn-action me-1 ${poFileMap[po.legacy_id] ? '' : 'btn-outline-secondary'}`}
                      title="Customer PO"
                      style={poFileMap[po.legacy_id] ? { background: '#8f3aa5', color: '#fff', border: '1px solid #8f3aa5' } : {}}
                      onClick={() => openCustPo(po)}>
                      <i className="bi bi-upload"></i>
                    </button>
                    <button className="btn btn-sm btn-action btn-outline-danger" title="Delete" onClick={() => setDeletePo(po)}>
                      <i className="bi bi-trash"></i>
                    </button>
                  </td>
                  <td>
                    <div className="d-flex flex-column gap-1" style={{ width: 80 }}>
                      <button
                        className={`btn btn-sm px-2 py-0 ${po.inv_status === 'Shipped' ? 'btn-outline-secondary' : 'btn-warning'}`}
                        style={{ fontSize: 11 }}
                        onClick={() => { if (po.inv_status === 'Shipped') handleStatusToggle(po) }}
                      >Active</button>
                      <button
                        className={`btn btn-sm px-2 py-0 ${po.inv_status === 'Shipped' ? 'btn-success' : 'btn-outline-secondary'}`}
                        style={{ fontSize: 11 }}
                        onClick={() => { if (po.inv_status !== 'Shipped') handleStatusToggle(po) }}
                      >Shipped</button>
                    </div>
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

      {/* Create/Edit Modal */}
      {showCreate && (<>
        <div className="modal-backdrop fade show"></div>
        <div className="modal fade show d-block" tabIndex="-1" style={{ overflowY: 'auto', height: '100vh' }}>
          <div className="modal-dialog modal-xl" style={{ margin: '1rem auto' }}>
            <div className="modal-content border-0 shadow">
              <div className="modal-header text-white" style={{ background: 'linear-gradient(135deg, #2563eb, #1e40af)' }}>
                <h5 className="modal-title">
                  <i className={`bi ${editPo ? 'bi-pencil' : 'bi-plus-circle'} me-2`}></i>
                  {editPo ? 'Edit Airfeet PO' : 'New Airfeet PO'}
                </h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowCreate(false)}></button>
              </div>
              <form onSubmit={handleSave}>
                <div className="modal-body">
                  <h6 className="fw-semibold text-muted mb-3"><i className="bi bi-truck me-2"></i>Supplier & PO Info</h6>
                  <div className="row g-3 mb-4">
                    <div className="col-md-4">
                      <label className="form-label fw-semibold small">Supplier <span className="text-danger">*</span></label>
                      <select className="form-select" value={form.supplier_id} onChange={e => { setForm({ ...form, supplier_id: e.target.value }); loadSuppData(e.target.value) }} required>
                        <option value="">-- Select Supplier --</option>
                        {suppliers.map(s => <option key={s._id} value={s.legacy_id}>{s.supplier_name}</option>)}
                      </select>
                    </div>
                    <div className="col-md-3">
                      <label className="form-label fw-semibold small">Project</label>
                      <input type="text" className="form-control" value={form.project} onChange={e => setForm({ ...form, project: e.target.value })} />
                    </div>
                    <div className="col-md-2">
                      <label className="form-label fw-semibold small">Type</label>
                      <select className="form-select" value={form.inv_quote_status} onChange={e => setForm({ ...form, inv_quote_status: parseInt(e.target.value) })}>
                        <option value={0}>PO</option>
                        <option value={1}>Quote</option>
                      </select>
                    </div>
                    <div className="col-md-3 d-flex align-items-end gap-3">
                      <div className="form-check">
                        <input className="form-check-input" type="checkbox" id="poShippedChk" checked={form.inv_status === 'Shipped'} onChange={e => setForm({ ...form, inv_status: e.target.checked ? 'Shipped' : '' })} />
                        <label className="form-check-label small fw-semibold" htmlFor="poShippedChk">Shipped</label>
                      </div>
                      <div className="form-check">
                        <input className="form-check-input" type="checkbox" id="poPaidChk" checked={form.paid_value === 'PAID'} onChange={e => setForm({ ...form, paid_value: e.target.checked ? 'PAID' : '' })} />
                        <label className="form-check-label small fw-semibold" htmlFor="poPaidChk">Paid</label>
                      </div>
                    </div>
                    {form.paid_value === 'PAID' && (
                      <div className="col-md-3">
                        <label className="form-label fw-semibold small">Paid Date</label>
                        <input type="date" className="form-control" value={form.paid_date} onChange={e => setForm({ ...form, paid_date: e.target.value })} />
                      </div>
                    )}
                  </div>

                  {/* Contact & Address */}
                  <h6 className="fw-semibold text-muted mb-3"><i className="bi bi-geo-alt me-2"></i>Contact & Address</h6>
                  <div className="row g-3 mb-4">
                    <div className="col-md-4">
                      <label className="form-label fw-semibold small">Contact Info</label>
                      <select className="form-select" value={form.contact_info} onChange={e => setForm({ ...form, contact_info: e.target.value })}>
                        <option value="">Select contact</option>
                        {suppContacts.map((c, i) => <option key={i} value={c.legacy_id || c._id}>{[c.name || c.contact_person, c.email || c.contact_email, c.main_phone].filter(Boolean).join(' | ')}</option>)}
                      </select>
                    </div>
                    <div className="col-md-4">
                      <label className="form-label fw-semibold small">Billing Address</label>
                      <select className="form-select" value={form.billing_address} onChange={e => setForm({ ...form, billing_address: e.target.value })}>
                        <option value="">Select billing address</option>
                        {suppAddresses.map((a, i) => <option key={i} value={a.legacy_id || a._id}>{[a.address_label || a.name, a.street_address, a.city, a.state, a.zip_code].filter(Boolean).join(', ')}</option>)}
                      </select>
                    </div>
                    <div className="col-md-4">
                      <label className="form-label fw-semibold small">Shipping Address</label>
                      <select className="form-select" value={form.shipping_address} onChange={e => setForm({ ...form, shipping_address: e.target.value })}>
                        <option value="">Select shipping address</option>
                        {suppAddresses.map((a, i) => <option key={i} value={a.legacy_id || a._id}>{[a.address_label || a.name, a.street_address, a.city, a.state, a.zip_code].filter(Boolean).join(', ')}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* PO Numbers & Dates */}
                  <h6 className="fw-semibold text-muted mb-3"><i className="bi bi-calendar me-2"></i>PO & Invoice Details</h6>
                  <div className="row g-3 mb-4">
                    <div className="col-md-3">
                      <label className="form-label fw-semibold small">PO Number</label>
                      <input type="text" className="form-control" value={form.po_number} onChange={e => setForm({ ...form, po_number: e.target.value })} />
                    </div>
                    <div className="col-md-3">
                      <label className="form-label fw-semibold small">PO Date</label>
                      <input type="date" className="form-control" value={form.po_date} onChange={e => setForm({ ...form, po_date: e.target.value })} />
                    </div>
                    <div className="col-md-3">
                      <label className="form-label fw-semibold small">Invoice #</label>
                      <input type="text" className="form-control" value={form.invoice_number} onChange={e => setForm({ ...form, invoice_number: e.target.value })} />
                    </div>
                    <div className="col-md-3">
                      <label className="form-label fw-semibold small">Invoice Date</label>
                      <input type="date" className="form-control" value={form.invoice_date} onChange={e => setForm({ ...form, invoice_date: e.target.value })} />
                    </div>
                    <div className="col-md-3">
                      <label className="form-label fw-semibold small">Shipping Costs ($)</label>
                      <input type="number" step="0.01" className="form-control" value={form.shipping_costs} onChange={e => setForm({ ...form, shipping_costs: e.target.value })} />
                    </div>
                  </div>

                  {/* ── Line Items ── */}
                  <h6 className="fw-semibold text-muted mb-3"><i className="bi bi-list-ul me-2"></i>Line Items</h6>
                  <div className="table-responsive mb-3">
                    <table className="table table-sm table-bordered" style={{ fontSize: '.85rem' }}>
                      <thead className="bg-light">
                        <tr>
                          <th style={{ width: '40%' }}>Part # / Description</th>
                          <th style={{ width: '10%' }}>Qty</th>
                          <th style={{ width: '12%' }}>UOM</th>
                          <th style={{ width: '15%' }}>Unit Price</th>
                          <th style={{ width: '15%' }}>Total</th>
                          <th style={{ width: '8%' }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {lineItems.map((item, idx) => {
                          const lineTotal = (parseInt(item.qty) || 0) * (parseFloat(item.unit_cost) || 0)
                          return (
                            <tr key={idx}>
                              <td><textarea className="form-control form-control-sm" rows="1" value={item.description} onChange={e => updateLineItem(idx, 'description', e.target.value)} placeholder="Part # / Description" /></td>
                              <td><input type="number" className="form-control form-control-sm" value={item.qty} onChange={e => updateLineItem(idx, 'qty', e.target.value)} /></td>
                              <td><input type="text" className="form-control form-control-sm" value={item.uom} onChange={e => updateLineItem(idx, 'uom', e.target.value)} placeholder="ea" /></td>
                              <td><input type="number" step="0.01" className="form-control form-control-sm" value={item.unit_cost} onChange={e => updateLineItem(idx, 'unit_cost', e.target.value)} /></td>
                              <td className="fw-bold text-end align-middle">${lineTotal.toFixed(2)}</td>
                              <td className="text-center align-middle">
                                {lineItems.length > 1 && <button type="button" className="btn btn-sm btn-outline-danger p-0 px-1" onClick={() => removeLineItem(idx)}><i className="bi bi-x"></i></button>}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="bg-light fw-bold">
                          <td className="text-end">Totals:</td>
                          <td>{calcItemTotals().totalQty}</td>
                          <td></td>
                          <td></td>
                          <td className="text-end">${calcItemTotals().netAmount.toFixed(2)}</td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                    <button type="button" className="btn btn-sm btn-outline-primary" onClick={addLineItem}><i className="bi bi-plus me-1"></i>Add Line</button>
                  </div>

                  <h6 className="fw-semibold text-muted mb-3"><i className="bi bi-calculator me-2"></i>Tax & Totals</h6>
                  <div className="row g-3 mb-4">
                    <div className="col-md-2">
                      <label className="form-label fw-semibold small">Tax Type</label>
                      <select className="form-select" value={form.sales_tax_type} onChange={e => setForm({ ...form, sales_tax_type: e.target.value })}>
                        <option value="">None</option>
                        <option value="Y">Yes</option>
                        <option value="N">No</option>
                      </select>
                    </div>
                    <div className="col-md-2">
                      <label className="form-label fw-semibold small">Tax %</label>
                      <input type="number" className="form-control" value={form.sales_tax_percentage} onChange={e => setForm({ ...form, sales_tax_percentage: e.target.value })} />
                    </div>
                    <div className="col-md-2">
                      <label className="form-label fw-semibold small">Tax $</label>
                      <input type="text" className="form-control bg-light" readOnly value={(() => {
                        const net = calcItemTotals().netAmount || (parseFloat(form.po_net_amount) || 0)
                        return form.sales_tax_type === 'Y' ? (net * ((parseFloat(form.sales_tax_percentage) || 0) / 100)).toFixed(2) : (form.sales_tax_amount || '0.00')
                      })()} />
                    </div>
                    <div className="col-md-2">
                      <label className="form-label fw-semibold small">CC Charge</label>
                      <div className="d-flex align-items-center gap-1">
                        <input type="checkbox" checked={!!form.cc_charge} onChange={e => setForm({ ...form, cc_charge: e.target.checked ? 1 : 0 })} />
                        <input type="number" step="0.01" className="form-control form-control-sm" placeholder="%" value={form.cc_per} onChange={e => setForm({ ...form, cc_per: e.target.value })} style={{ width: 60 }} />
                      </div>
                    </div>
                    <div className="col-md-4">
                      <label className="form-label fw-bold small">Total PO ($)</label>
                      <input type="text" className="form-control fw-bold bg-light" readOnly value={(() => {
                        const net = calcItemTotals().netAmount || (parseFloat(form.po_net_amount) || 0)
                        const ship = parseFloat(form.shipping_costs) || 0
                        const tax = form.sales_tax_type === 'Y' ? net * ((parseFloat(form.sales_tax_percentage) || 0) / 100) : (parseFloat(form.sales_tax_amount) || 0)
                        const cc = form.cc_charge ? (net + tax + ship) * ((parseFloat(form.cc_per) || 0) / 100) : 0
                        return '$' + (net + ship + tax + cc).toFixed(2)
                      })()} />
                    </div>
                  </div>

                  <h6 className="fw-semibold text-muted mb-3"><i className="bi bi-chat-left-text me-2"></i>Notes</h6>
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label fw-semibold small">PO Notes</label>
                      <textarea className="form-control" rows="3" value={form.po_notes} onChange={e => setForm({ ...form, po_notes: e.target.value })}></textarea>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold small">Shipping Info Notes</label>
                      <textarea className="form-control" rows="3" value={form.shipinfo_notes} onChange={e => setForm({ ...form, shipinfo_notes: e.target.value })}></textarea>
                    </div>
                    <div className="col-md-12">
                      <label className="form-label fw-semibold small">Credit Card Notes</label>
                      <textarea className="form-control" rows="2" value={form.credit_card_notes} onChange={e => setForm({ ...form, credit_card_notes: e.target.value })}></textarea>
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-outline-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary">
                    <i className={`bi ${editPo ? 'bi-check-lg' : 'bi-plus-lg'} me-1`}></i>
                    {editPo ? 'Update PO' : 'Save PO'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </>)}

      {/* Delete Modal */}
      {deletePo && (<>
        <div className="modal-backdrop fade show"></div>
        <div className="modal fade show d-block" tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow">
              <div className="modal-header text-white bg-danger">
                <h5 className="modal-title"><i className="bi bi-trash me-2"></i>Delete Airfeet PO</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setDeletePo(null)}></button>
              </div>
              <div className="modal-body">
                <p>Are you sure you want to delete PO <strong>{deletePo.po_number}</strong>?</p>
                <p className="text-muted small">Supplier: {deletePo.supplier_name} | Amount: {fmtMoney(deletePo.po_net_amount)}</p>
              </div>
              <div className="modal-footer">
                <button className="btn btn-outline-secondary" onClick={() => setDeletePo(null)}>Cancel</button>
                <button className="btn btn-danger" onClick={handleDelete}>Delete</button>
              </div>
            </div>
          </div>
        </div>
      </>)}

      {/* View Invoice Modal - matches old PHP design */}
      {(invoicePo || invoiceLoading) && (<>
        <div className="modal-backdrop fade show"></div>
        <div className="modal fade show d-block" tabIndex="-1" style={{ overflowY: 'auto', height: '100vh' }}>
          <div className="modal-dialog modal-xl" style={{ margin: '1rem auto' }}>
            <div className="modal-content border-0 shadow">
              <div className="modal-header border-0 pb-0 pt-2 pe-2">
                <div></div>
                <button type="button" className="btn-close" onClick={() => setInvoicePo(null)}></button>
              </div>
              <div className="modal-body pt-0" style={{ position: 'relative', fontSize: 13 }}>
                {invoiceLoading ? (
                  <div className="text-center py-5"><div className="spinner-border text-primary"></div><p className="mt-2 text-muted">Loading invoice...</p></div>
                ) : invoicePo && (
                  <div id="invoice-print-area" style={{ position: 'relative' }}>
                    {/* PAID watermark */}
                    {invoicePo.paid_value === 'PAID' && (
                      <div style={{ position: 'absolute', top: '35%', left: '20%', fontSize: 150, color: 'rgba(255,0,0,0.15)', transform: 'rotate(-30deg)', fontWeight: 'bold', pointerEvents: 'none', zIndex: 0 }}>
                        <div>{invoicePo.paid_value}</div>
                        {invoicePo.paid_date && <div style={{ fontSize: 25, textAlign: 'center' }}>{invoicePo.paid_date}</div>}
                      </div>
                    )}

                    {/* ===== HEADER: Logo + Company Address + PO Banner + PO#/Date ===== */}
                    <div style={{ display: 'flex', marginBottom: 16 }}>
                      {/* Left: Logo + Company Info */}
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                          <div style={{ textAlign: 'center', minWidth: 120 }}>
                            <img src="https://staging.stallioni.com/assets/images/logo_fleet.png" alt="Airfeet" style={{ width: 110, marginBottom: 4 }} crossOrigin="anonymous" />
                            <div style={{ fontSize: 10, fontStyle: 'italic', color: '#555' }}>"It's like walking on air"</div>
                          </div>
                          <div style={{ fontSize: 13, lineHeight: 1.5 }}>
                            <div style={{ fontWeight: 'bold' }}>Airfeet LLC</div>
                            <div>2346 S. Lynhurst Dr</div>
                            <div>Suite 701</div>
                            <div>Indianapolis Indiana 46241</div>
                          </div>
                        </div>
                      </div>
                      {/* Right: Purchase Order banner + PO No/Date */}
                      <div style={{ width: 260 }}>
                        <div style={{ background: 'blue', color: '#fff', textAlign: 'center', padding: '12px 20px', fontWeight: 'bold', fontSize: 16, marginBottom: 4 }}>
                          Purchase Order
                        </div>
                        <table className="table table-bordered table-sm mb-0" style={{ fontSize: 12 }}>
                          <thead><tr><th>P.O. No.</th><th>Date</th></tr></thead>
                          <tbody><tr><td>{invoicePo.po_number || '-'}</td><td>{fmtDate(invoicePo.po_date)}</td></tr></tbody>
                        </table>
                      </div>
                    </div>

                    {/* ===== VENDOR & SHIP TO - bordered tables side by side ===== */}
                    <div style={{ display: 'flex', gap: 0, marginBottom: 16 }}>
                      <div style={{ flex: 1 }}>
                        <table className="table table-bordered table-sm mb-0">
                          <thead><tr><th className="bg-light">Vendor</th></tr></thead>
                          <tbody><tr><td style={{ padding: '10px 12px', minHeight: 100 }}>
                            {(() => {
                              const addr = invoicePo.supplierAddress || {}
                              const contact = invoicePo.supplierContact || {}
                              const suppName = addr.name || invoicePo.supplier?.supplier_name || invoicePo.supplier_name || ''
                              const mainPhone = addr.phone || contact.main_phone || invoicePo.supplier?.phone || ''
                              const email = addr.email || contact.email || invoicePo.supplier?.email || ''
                              const contactTitle = contact.title || ''
                              const contactPerson = contact.name || ''
                              const streetAddr = addr.street_address || ''
                              const fullAddr = [streetAddr, addr.street_address2].filter(Boolean).join(', ')
                              const cityStateZip = [addr.city, addr.state, addr.zip_code, addr.country].filter(Boolean).join(', ')
                              const address = [fullAddr, cityStateZip].filter(Boolean).join(', ')
                              return <>
                                <div style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 12 }}>{suppName}</div>
                                <div><b>Main phone:</b> {mainPhone}</div>
                                <div><b>Email :</b> <span style={{ textDecoration: 'underline' }}>{email}</span></div>
                                <div><b>Contact Info :</b> {contactTitle}{contactTitle && contactPerson ? '.' : ''}{contactPerson}</div>
                                <div><b>Address :</b> {address || '-'}</div>
                              </>
                            })()}
                          </td></tr></tbody>
                        </table>
                      </div>
                      <div style={{ flex: 1 }}>
                        <table className="table table-bordered table-sm mb-0">
                          <thead><tr><th className="bg-light">Ship To</th></tr></thead>
                          <tbody><tr><td style={{ padding: '10px 12px', minHeight: 100 }}>
                            {(() => {
                              const addr = invoicePo.supplierAddress || {}
                              const suppName = addr.name || invoicePo.supplier?.supplier_name || invoicePo.supplier_name || ''
                              const streetAddr = addr.street_address || ''
                              const cityStateZip = [addr.city, addr.state, addr.zip_code, addr.country].filter(Boolean).join(', ')
                              const fullAddress = [streetAddr, cityStateZip].filter(Boolean).join(', ')
                              return <>
                                <div style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 12 }}>{suppName}</div>
                                <div><b>Main phone</b></div>
                                <div><b>Email :</b></div>
                                <div><b>Address:</b> {fullAddress || '-'}</div>
                                <div><b>Contact Info :</b> Airfeet</div>
                              </>
                            })()}
                          </td></tr></tbody>
                        </table>
                      </div>
                    </div>

                    {/* ===== TERMS / SHIP / SHIPACCT# / VIA ===== */}
                    <table className="table table-bordered table-sm mb-3">
                      <thead>
                        <tr>
                          <th className="bg-light text-center">Terms</th>
                          <th className="bg-light text-center">Ship</th>
                          <th className="bg-light text-center">ShipAcct #</th>
                          <th className="bg-light text-center">Via</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="text-center">{invoicePo.supplier?.terms || ''}</td>
                          <td className="text-center">{invoicePo.supplier?.ship || ''}</td>
                          <td className="text-center">{invoicePo.shipinfo_notes || ''}</td>
                          <td className="text-center">{invoicePo.supplier?.ship_via || ''}</td>
                        </tr>
                      </tbody>
                    </table>

                    {/* ===== LINE ITEMS with UOM column ===== */}
                    <table className="table table-bordered table-sm mb-3">
                      <thead>
                        <tr className="bg-light">
                          <th style={{ width: '5%' }} className="text-center">Line</th>
                          <th style={{ width: '45%' }}>Description</th>
                          <th style={{ width: '10%' }} className="text-center">Quantity</th>
                          <th style={{ width: '10%' }} className="text-center">UOM</th>
                          <th style={{ width: '10%' }} className="text-center">Unit Price</th>
                          <th style={{ width: '10%' }} className="text-center">Amount</th>
                        </tr>
                      </thead>
                      <tbody style={{ textAlign: 'center' }}>
                        {invoicePo.items && invoicePo.items.length > 0 ? invoicePo.items.map((item, i) => {
                          const qty = item.qty || 0
                          const cost = item.unit_cost || 0
                          const amt = qty * cost
                          const desc = item.item_with_desc || item.item_name || '-'
                          return (
                            <tr key={i}>
                              <td>{i + 1}</td>
                              <td style={{ textAlign: 'left', whiteSpace: 'pre-line' }}>{desc}</td>
                              <td>{qty}</td>
                              <td>{item.uom || '-'}</td>
                              <td>{cost.toFixed(2)}</td>
                              <td>{amt.toFixed(2)}</td>
                            </tr>
                          )
                        }) : (
                          <tr><td colSpan="6" className="text-muted py-2">No line items</td></tr>
                        )}
                        {/* Empty rows to match old design spacing */}
                        {invoicePo.items && invoicePo.items.length > 0 && invoicePo.items.length < 3 && (
                          <tr><td colSpan="6" style={{ height: 30 }}>&nbsp;</td></tr>
                        )}
                        <tr>
                          <td colSpan="5" style={{ textAlign: 'right' }}>TOTAL</td>
                          <td>{(() => {
                            const total = invoicePo.items?.reduce((s, it) => s + ((it.qty || 0) * (it.unit_cost || 0)), 0) || parseFloat(invoicePo.po_net_amount) || 0
                            return total.toFixed(2) + ' (USD)'
                          })()}</td>
                        </tr>
                      </tbody>
                    </table>

                    {/* ===== PHONE / EMAIL TABLE ===== */}
                    <table className="table table-bordered table-sm mb-3" style={{ width: '50%' }}>
                      <tbody>
                        <tr><td><b>Phone #</b></td><td><b>Email</b></td></tr>
                        <tr><td>317-965-5212</td><td>info@myairfeet.com</td></tr>
                      </tbody>
                    </table>

                    {/* ===== NOTES TABLE ===== */}
                    {invoicePo.po_notes && (
                      <table className="table table-bordered table-sm mb-3" style={{ width: '50%' }}>
                        <tbody>
                          <tr><td><b>Notes</b></td></tr>
                          <tr><td>{invoicePo.po_notes}</td></tr>
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
              {invoicePo && (
                <div className="modal-footer border-0 justify-content-center pb-4">
                  <button className="btn btn-lg px-4" style={{ background: '#f0ad4e', color: '#fff', borderRadius: 4 }} onClick={downloadInvoice}>
                    Download <i className="bi bi-download ms-1"></i>
                  </button>
                  <button className="btn btn-lg btn-primary px-4" style={{ borderRadius: 4 }} onClick={printInvoice}>
                    Print <i className="bi bi-printer ms-1"></i>
                  </button>
                  <button className="btn btn-lg px-4" style={{ background: '#337ab7', color: '#fff', borderRadius: 4 }} onClick={openEmailModal}>
                    Email <i className="bi bi-envelope ms-1"></i>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </>)}

      {/* Email Modal */}
      {showEmailModal && (<>
        <div className="modal-backdrop fade show" style={{ zIndex: 1060 }}></div>
        <div className="modal fade show d-block" tabIndex="-1" style={{ zIndex: 1061 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow">
              <div className="modal-header text-white" style={{ background: '#8f3aa5' }}>
                <h5 className="modal-title"><i className="bi bi-envelope me-2"></i>Email Invoice</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowEmailModal(false)}></button>
              </div>
              <form onSubmit={handleSendEmail}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label fw-semibold">To <span className="text-danger">*</span></label>
                    <input type="text" className="form-control" placeholder="Enter recipient emails (comma separated)" value={emailForm.to} onChange={e => setEmailForm({ ...emailForm, to: e.target.value })} required />
                  </div>
                  <div className="row g-3 mb-3">
                    <div className="col-6">
                      <label className="form-label fw-semibold">Cc</label>
                      <input type="text" className="form-control" placeholder="Cc emails" value={emailForm.cc} onChange={e => setEmailForm({ ...emailForm, cc: e.target.value })} />
                    </div>
                    <div className="col-6">
                      <label className="form-label fw-semibold">Bcc</label>
                      <input type="text" className="form-control" placeholder="Bcc emails" value={emailForm.bcc} onChange={e => setEmailForm({ ...emailForm, bcc: e.target.value })} />
                    </div>
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Subject <span className="text-danger">*</span></label>
                    <input type="text" className="form-control" value={emailForm.subject} onChange={e => setEmailForm({ ...emailForm, subject: e.target.value })} required />
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Message <span className="text-danger">*</span></label>
                    <textarea className="form-control" rows="5" value={emailForm.message} onChange={e => setEmailForm({ ...emailForm, message: e.target.value })} required></textarea>
                  </div>
                  <div className="p-2 rounded" style={{ background: '#f1f5f9', fontSize: 13 }}>
                    <i className="bi bi-paperclip me-1 text-primary"></i>
                    <strong>Attachment:</strong> PO_{invoicePo?.po_number || 'invoice'}.pdf
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-outline-secondary" onClick={() => setShowEmailModal(false)}>Close</button>
                  <button type="submit" className="btn btn-primary" disabled={emailSending}>
                    {emailSending ? <><span className="spinner-border spinner-border-sm me-2"></span>Sending...</> : <><i className="bi bi-send me-1"></i>Send Email</>}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </>)}

      {custPoPo && (<>
        <div className="modal-backdrop fade show"></div>
        <div className="modal fade show d-block" tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow">
              <div className="modal-header text-white" style={{ background: 'linear-gradient(135deg, #2563eb, #1e40af)' }}>
                <h5 className="modal-title"><i className="bi bi-upload me-2"></i>Upload Customer PO</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setCustPoPo(null)}></button>
              </div>
              <div className="modal-body">
                {/* Drag & Drop Zone */}
                <input type="file" ref={custPoFileRef} multiple style={{ display: 'none' }}
                  onChange={e => { if (e.target.files.length) addDropFiles(e.target.files); e.target.value = '' }} />
                <div
                  className="text-center p-4 mb-3"
                  style={{
                    border: `2px dashed ${dragOver ? '#2563eb' : '#cbd5e1'}`,
                    borderRadius: 12,
                    background: dragOver ? '#eff6ff' : '#fafbfc',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                  onDrop={e => { e.preventDefault(); e.stopPropagation(); setDragOver(false); if (e.dataTransfer.files.length) addDropFiles(e.dataTransfer.files) }}
                  onDragOver={e => { e.preventDefault(); e.stopPropagation(); setDragOver(true) }}
                  onDragLeave={e => { e.preventDefault(); e.stopPropagation(); setDragOver(false) }}
                  onClick={() => custPoFileRef.current?.click()}
                >
                  <i className="bi bi-cloud-arrow-up d-block mb-2" style={{ fontSize: 40, color: dragOver ? '#2563eb' : '#94a3b8' }}></i>
                  <div style={{ fontSize: 15, color: '#475569' }}>Drag & drop files here</div>
                  <div style={{ fontSize: 13, color: '#94a3b8' }}>
                    or <span style={{ color: '#2563eb', fontWeight: 600, textDecoration: 'underline' }}>browse files</span>
                  </div>
                </div>

                {/* Selected Files List */}
                {selectedFiles.length > 0 && (
                  <div className="mb-3">
                    {selectedFiles.map((f, i) => (
                      <div key={i} className="d-flex align-items-center justify-content-between p-2 mb-1 rounded" style={{ background: '#f1f5f9', fontSize: 13 }}>
                        <span><i className="bi bi-file-earmark me-1"></i> {f.name} <small className="text-muted">({(f.size / 1024).toFixed(1)} KB)</small></span>
                        <button className="btn btn-sm p-0 text-danger" onClick={() => removeSelectedFile(i)} style={{ fontSize: 16, lineHeight: 1 }}>
                          <i className="bi bi-x-lg"></i>
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Upload Button */}
                <button className="btn btn-success w-100 mb-4" onClick={handleCustPoUpload} disabled={selectedFiles.length === 0 || custPoUploading}>
                  {custPoUploading ? <><span className="spinner-border spinner-border-sm me-2"></span>Uploading...</> : <><i className="bi bi-upload me-1"></i> Submit</>}
                </button>

                {/* Uploaded Files */}
                <h6 className="fw-semibold mb-2"><i className="bi bi-paperclip me-1"></i>Uploaded Files</h6>
                {custPoFiles.length === 0 ? (
                  <p className="text-muted small">No files uploaded</p>
                ) : (
                  <div className="d-flex flex-column gap-2">
                    {custPoFiles.map((file, i) => {
                      const name = file.replace('uploads/customer_po/', '')
                      return (
                        <div key={i} className="d-flex align-items-center justify-content-between p-2 rounded" style={{ background: '#f1f5f9', fontSize: 13 }}>
                          <a href={`${import.meta.env.VITE_API_URL || '/api'}/airfeet-po/file/${name}`} target="_blank" rel="noreferrer" className="text-decoration-none text-dark">
                            <i className="bi bi-file-earmark me-1 text-primary"></i>{name}
                          </a>
                          <button className="btn btn-sm p-0 text-danger" onClick={() => handleCustPoDelete(file)} style={{ fontSize: 16, lineHeight: 1 }}>
                            <i className="bi bi-x-lg"></i>
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button className="btn btn-outline-secondary" onClick={() => setCustPoPo(null)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      </>)}
    </div>
  )
}
