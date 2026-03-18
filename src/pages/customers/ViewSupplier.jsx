import { useState, useEffect, useRef } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import html2pdf from 'html2pdf.js'
import { api } from '../../lib/api'
import { CKEditor } from '@ckeditor/ckeditor5-react'
import ClassicEditor from '@ckeditor/ckeditor5-build-classic'

const avatarColors = ['#2563eb', '#7c3aed', '#06b6d4', '#16a34a', '#f59e0b', '#ef4444', '#ec4899', '#8b5cf6']
function hashColor(name) {
  let h = 0
  for (let i = 0; i < name.length; i++) { h = ((h << 5) - h) + name.charCodeAt(i); h |= 0 }
  return avatarColors[Math.abs(h) % avatarColors.length]
}
function getInitials(name) {
  return (name || '').split(/\s+/).map(w => w[0] || '').join('').toUpperCase().slice(0, 2)
}
function nn(v) { return v && v !== 'Null' ? v : '' }
function fmt$(v) { return '$' + (parseFloat(v) || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',') }

export default function ViewSupplier() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [supplier, setSupplier] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('details')
  const [addresses, setAddresses] = useState([])
  const [contacts, setContacts] = useState([])

  // Edit info modal
  const [showEditInfo, setShowEditInfo] = useState(false)
  const [editForm, setEditForm] = useState({})
  const [editSaving, setEditSaving] = useState(false)

  // Inline editable fields
  const [inlineEdit, setInlineEdit] = useState(null)
  const [inlineSaving, setInlineSaving] = useState(false)

  // Notes
  const [editingNotes, setEditingNotes] = useState(false)
  const [notesHtml, setNotesHtml] = useState('')
  const [notesSaving, setNotesSaving] = useState(false)

  // Contact modals
  const [showAddContact, setShowAddContact] = useState(false)
  const [addContactForm, setAddContactForm] = useState({})
  const [addContactSaving, setAddContactSaving] = useState(false)
  const [showEditContact, setShowEditContact] = useState(false)
  const [contactForm, setContactForm] = useState({})
  const [contactSaving, setContactSaving] = useState(false)

  // Address modals
  const [showAddAddress, setShowAddAddress] = useState(false)
  const [addAddressForm, setAddAddressForm] = useState({})
  const [addAddressSaving, setAddAddressSaving] = useState(false)
  const [showEditAddress, setShowEditAddress] = useState(false)
  const [addressForm, setAddressForm] = useState({})
  const [addressSaving, setAddressSaving] = useState(false)

  // Delete confirm
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  // Airfeet PO tab
  const [airfeetPos, setAirfeetPos] = useState([])
  const [poLoading, setPoLoading] = useState(false)
  const [poSearch, setPoSearch] = useState({ airfeetPo: '', poNum: '', dateFrom: '', dateTo: '', qty: '', amtFrom: '', amtTo: '' })

  // History tab
  const [history, setHistory] = useState({ poList: [], itemTypeColumns: [] })
  const [histLoading, setHistLoading] = useState(false)

  // PO Create/Edit modal
  const [showPoModal, setShowPoModal] = useState(false)
  const [editingPo, setEditingPo] = useState(null)
  const [poForm, setPoForm] = useState({})
  const [poLineItems, setPoLineItems] = useState([])
  const [poSaving, setPoSaving] = useState(false)

  // Invoice view popup
  const [invoicePo, setInvoicePo] = useState(null)
  const [invoiceLoading, setInvoiceLoading] = useState(false)

  useEffect(() => { fetchData() }, [id])

  async function fetchData() {
    setLoading(true)
    try {
      const data = await api.getSupplierFull(id)
      setSupplier(data)
      setAddresses(data.addresses || [])
      setContacts(data.contacts || [])
    } catch (err) { toast.error(err.message); navigate('/customers/suppliers') }
    setLoading(false)
  }

  async function loadAirfeetPos() {
    setPoLoading(true)
    try { setAirfeetPos(await api.getSupplierAirfeetPos(id) || []) } catch (err) { toast.error(err.message) }
    setPoLoading(false)
  }

  async function loadHistory() {
    setHistLoading(true)
    try { setHistory(await api.getSupplierHistory(id) || { poList: [], itemTypeColumns: [] }) } catch (err) { toast.error(err.message) }
    setHistLoading(false)
  }

  function switchTab(tab) {
    setActiveTab(tab)
    if (tab === 'airfeetpo' && airfeetPos.length === 0) loadAirfeetPos()
    if (tab === 'history' && history.poList.length === 0) loadHistory()
  }

  // ── Inline field save ──
  async function saveInlineField(field, value) {
    setInlineSaving(true)
    try {
      await api.saveSupplierTerms(id, { [field]: value })
      const fresh = await api.getSupplierFull(id)
      setSupplier(fresh)
      setInlineEdit(null)
      toast.success('Updated successfully')
    } catch (err) { toast.error(err.message) }
    setInlineSaving(false)
  }

  // ── Notes ──
  function openNotesEditor() { setNotesHtml(supplier.notes || ''); setEditingNotes(true) }
  async function saveNotes() {
    setNotesSaving(true)
    try {
      await api.saveSupplierNotes(id, notesHtml)
      const fresh = await api.getSupplierFull(id)
      setSupplier(fresh)
      setEditingNotes(false)
      toast.success('Notes updated')
    } catch (err) { toast.error(err.message) }
    setNotesSaving(false)
  }

  // ── Edit Info Modal ──
  function openEditInfo() {
    setEditForm({
      supplier_name: supplier.supplier_name || '',
      customer_code: supplier.customer_code || '',
      supplier_type: supplier.supplier_type || '',
      phone: supplier.phone || '',
      extension: supplier.extension || '',
      email: supplier.email || '',
      contact_name: supplier.contact_name || '',
      city: supplier.city || '',
      state: supplier.state || '',
      status: supplier.status || 'active',
    })
    setShowEditInfo(true)
  }
  async function handleSaveInfo(e) {
    e.preventDefault()
    if (!editForm.supplier_name.trim()) { toast.error('Supplier name is required'); return }
    setEditSaving(true)
    try {
      await api.updateSupplier(id, editForm)
      const fresh = await api.getSupplierFull(id)
      setSupplier(fresh)
      setShowEditInfo(false)
      toast.success('Supplier updated')
    } catch (err) { toast.error(err.message) }
    setEditSaving(false)
  }

  // ── Contact Add ──
  function openAddContact() {
    setAddContactForm({ name: '', title: '', position: '', main_phone: '', main_ext: '', desk_phone: '', desk_ext: '', mobile_phone: '', email: '' })
    setShowAddContact(true)
  }
  async function handleAddContact(e) {
    e.preventDefault()
    if (!addContactForm.name?.trim()) { toast.error('Name is required'); return }
    setAddContactSaving(true)
    try {
      await api.addSupplierContact(id, { ...addContactForm, contact_type: 'contact_0' })
      const fresh = await api.getSupplierFull(id)
      setSupplier(fresh); setContacts(fresh.contacts || [])
      setShowAddContact(false)
      toast.success('Contact added')
    } catch (err) { toast.error(err.message) }
    setAddContactSaving(false)
  }

  // ── Contact Edit ──
  function openEditContact(ct) {
    setContactForm({
      _id: ct._id,
      name: ct.name || ct.contact_person || '',
      title: ct.title || ct.contact_title || '',
      position: ct.position || ct.contact_position || '',
      main_phone: ct.main_phone || '',
      main_ext: ct.main_ext || ct.desk_ext || '',
      desk_phone: ct.desk_phone || '',
      desk_ext: ct.desk_ext || '',
      mobile_phone: ct.mobile_phone || '',
      email: ct.email || ct.contact_email || '',
    })
    setShowEditContact(true)
  }
  async function handleSaveContact(e) {
    e.preventDefault()
    setContactSaving(true)
    try {
      await api.updateSupplierContact(id, contactForm._id, contactForm)
      const fresh = await api.getSupplierFull(id)
      setSupplier(fresh); setContacts(fresh.contacts || [])
      setShowEditContact(false)
      toast.success('Contact updated')
    } catch (err) { toast.error(err.message) }
    setContactSaving(false)
  }

  // ── Address Add ──
  function openAddAddress() {
    setAddAddressForm({ name: '', street_address: '', city: '', state: '', zip_code: '', country: '', email: '', phoneno: '', shipping_anct: '', address_label: '' })
    setShowAddAddress(true)
  }
  async function handleAddAddress(e) {
    e.preventDefault()
    setAddAddressSaving(true)
    try {
      await api.addSupplierAddress(id, addAddressForm)
      const fresh = await api.getSupplierFull(id)
      setSupplier(fresh); setAddresses(fresh.addresses || [])
      setShowAddAddress(false)
      toast.success('Address added')
    } catch (err) { toast.error(err.message) }
    setAddAddressSaving(false)
  }

  // ── Address Edit ──
  function openEditAddress(addr) {
    setAddressForm({
      _id: addr._id,
      name: addr.name || '',
      address_label: addr.address_label || '',
      street_address: addr.street_address || '',
      city: addr.city || '',
      state: addr.state || '',
      zip_code: addr.zip_code || '',
      country: addr.country || '',
      email: addr.email || '',
      phoneno: addr.phoneno || addr.phone || '',
      shipping_anct: addr.shipping_anct || addr.shipping_acnt || '',
    })
    setShowEditAddress(true)
  }
  async function handleSaveAddress(e) {
    e.preventDefault()
    setAddressSaving(true)
    try {
      await api.updateSupplierAddress(id, addressForm._id, addressForm)
      const fresh = await api.getSupplierFull(id)
      setSupplier(fresh); setAddresses(fresh.addresses || [])
      setShowEditAddress(false)
      toast.success('Address updated')
    } catch (err) { toast.error(err.message) }
    setAddressSaving(false)
  }

  // ── Delete ──
  async function handleDelete() {
    if (!deleteConfirm) return
    try {
      if (deleteConfirm.type === 'contact') await api.deleteSupplierContact(id, deleteConfirm.id)
      else if (deleteConfirm.type === 'address') await api.deleteSupplierAddress(id, deleteConfirm.id)
      const fresh = await api.getSupplierFull(id)
      setSupplier(fresh); setContacts(fresh.contacts || []); setAddresses(fresh.addresses || [])
      setDeleteConfirm(null)
      toast.success(`${deleteConfirm.type} deleted`)
    } catch (err) { toast.error(err.message); setDeleteConfirm(null) }
  }

  // ── Status ──
  async function saveStatus(newStatus) {
    try { await api.updateSupplier(id, { status: newStatus }); fetchData(); toast.success('Status updated') } catch (err) { toast.error(err.message) }
  }

  // ── Delete PO ──
  async function deletePO(poMongoId) {
    if (!confirm('Delete this PO?')) return
    try { await api.deleteAirfeetPo(poMongoId); toast.success('PO deleted'); loadAirfeetPos() } catch (err) { toast.error(err.message) }
  }

  // ── PO Create/Edit ──
  function openCreatePo() {
    setEditingPo(null)
    setPoForm({ supplier_id: supplier.legacy_id || '', supplier_name: supplier.supplier_name || '', po_number: '', po_date: new Date().toISOString().slice(0, 10), invoice_number: '', invoice_date: '', project: supplier.project || '', po_notes: '', shipinfo_notes: '', shipping_costs: '', sales_tax_type: '', sales_tax_percentage: '', sales_tax_amount: '', credit_card_notes: '', inv_quote_status: 0 })
    setPoLineItems([{ description: '', qty: '', uom: '', unit_cost: '' }])
    setShowPoModal(true)
  }

  async function openEditPo(po) {
    setEditingPo(po)
    setPoForm({
      supplier_id: po.supplier_id || supplier.legacy_id || '',
      supplier_name: po.supplier_name || supplier.supplier_name || '',
      po_number: po.po_number || '', po_date: po.po_date ? new Date(po.po_date).toISOString().slice(0, 10) : '',
      invoice_number: po.invoice_number || '', invoice_date: po.invoice_date ? new Date(po.invoice_date).toISOString().slice(0, 10) : '',
      project: po.project || '', po_notes: po.po_notes || '', shipinfo_notes: po.shipinfo_notes || '',
      shipping_costs: po.shipping_costs || '', sales_tax_type: po.sales_tax_type || '',
      sales_tax_percentage: po.sales_tax_percentage || '', sales_tax_amount: po.sales_tax_amount || '',
      credit_card_notes: po.credit_card_notes || '', inv_quote_status: po.inv_quote_status || 0,
    })
    try {
      const full = await api.getAirfeetPo(po._id)
      const items = (full.items || []).map(it => ({ description: it.po_item_name || it.item_with_desc || it.item_name || '', qty: it.item_qty || it.qty || '', uom: it.uom || '', unit_cost: it.item_unit_cost || it.unit_cost || '' }))
      setPoLineItems(items.length > 0 ? items : [{ description: '', qty: '', uom: '', unit_cost: '' }])
    } catch { setPoLineItems([{ description: '', qty: '', uom: '', unit_cost: '' }]) }
    setShowPoModal(true)
  }

  function updatePoLine(idx, field, value) { setPoLineItems(prev => prev.map((it, i) => i === idx ? { ...it, [field]: value } : it)) }
  function addPoLine() { setPoLineItems(prev => [...prev, { description: '', qty: '', uom: '', unit_cost: '' }]) }
  function removePoLine(idx) { setPoLineItems(prev => prev.filter((_, i) => i !== idx)) }

  function calcPoTotals() {
    let totalQty = 0, netAmount = 0
    poLineItems.forEach(it => { const q = parseInt(it.qty) || 0; const c = parseFloat(it.unit_cost) || 0; totalQty += q; netAmount += q * c })
    return { totalQty, netAmount }
  }

  async function handleSavePo(e) {
    e.preventDefault()
    setPoSaving(true)
    try {
      const validItems = poLineItems.filter(it => it.description?.trim() || it.qty || it.unit_cost)
      const { totalQty, netAmount } = calcPoTotals()
      const taxAmt = poForm.sales_tax_type === 'Y' ? netAmount * ((parseFloat(poForm.sales_tax_percentage) || 0) / 100) : (parseFloat(poForm.sales_tax_amount) || 0)
      const payload = {
        ...poForm, supplier_name: supplier.supplier_name,
        po_total_qty: validItems.length > 0 ? totalQty : (parseInt(poForm.po_total_qty) || 0),
        po_net_amount: validItems.length > 0 ? netAmount : (parseFloat(poForm.po_net_amount) || 0),
        sales_tax_amount: taxAmt, items: validItems,
      }
      if (editingPo) { await api.updateAirfeetPo(editingPo._id, payload); toast.success('PO updated') }
      else { await api.createAirfeetPo(payload); toast.success('PO created') }
      setShowPoModal(false)
      loadAirfeetPos()
    } catch (err) { toast.error(err.message) }
    setPoSaving(false)
  }

  // ── View Invoice ──
  async function openInvoice(po) {
    setInvoiceLoading(true)
    try { setInvoicePo(await api.getAirfeetPoInvoice(po._id)) } catch (err) { toast.error(err.message) }
    setInvoiceLoading(false)
  }

  function fmtDate(d) { if (!d) return '-'; const dt = new Date(d); return isNaN(dt) ? '-' : `${String(dt.getMonth() + 1).padStart(2, '0')}/${String(dt.getDate()).padStart(2, '0')}/${dt.getFullYear()}` }

  function printInvoice() {
    const el = document.getElementById('sup-invoice-print')
    if (!el) return
    const css = 'body{font-family:Arial;font-size:13px;color:#333;margin:20px}table{width:100%;border-collapse:collapse}table.table-bordered td,table.table-bordered th{border:1px solid #dee2e6;padding:6px 10px}.bg-light{background:#f8f9fa}b{font-weight:bold}.row{display:flex}.col-6{width:50%;padding:0 8px;box-sizing:border-box}@media print{.no-print{display:none!important}}'
    const w = window.open('', '_blank', 'width=800,height=900')
    w.document.write(`<!DOCTYPE html><html><head><title>PO</title><style>${css}</style></head><body>${el.innerHTML}</body></html>`)
    w.document.close(); w.focus(); setTimeout(() => w.print(), 300)
  }

  function downloadInvoice() {
    const el = document.getElementById('sup-invoice-print')
    if (!el) return
    html2pdf().set({ margin: [10, 10, 10, 10], filename: `PO_${invoicePo?.po_number || 'invoice'}.pdf`, image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2, useCORS: true }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } }).from(el).save().then(() => toast.success('PDF downloaded'))
  }

  // ── PO Filter ──
  function getFilteredPos() {
    return airfeetPos.filter(po => {
      if (poSearch.airfeetPo && !String(po.legacy_id).includes(poSearch.airfeetPo)) return false
      if (poSearch.poNum && !(po.po_number || '').toLowerCase().includes(poSearch.poNum.toLowerCase())) return false
      if (poSearch.dateFrom && po.po_date && new Date(po.po_date) < new Date(poSearch.dateFrom)) return false
      if (poSearch.dateTo && po.po_date && new Date(po.po_date) > new Date(poSearch.dateTo)) return false
      if (poSearch.qty && (po.po_total_qty || 0) !== parseInt(poSearch.qty)) return false
      if (poSearch.amtFrom && (parseFloat(po.po_net_amount) || 0) < parseFloat(poSearch.amtFrom)) return false
      if (poSearch.amtTo && (parseFloat(po.po_net_amount) || 0) > parseFloat(poSearch.amtTo)) return false
      return true
    })
  }

  if (loading) return <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>
  if (!supplier) return null

  const color = hashColor(supplier.supplier_name || '')
  const assignedReps = supplier.assignedReps || []
  const createdDate = supplier.created_at ? new Date(supplier.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : ''

  const tabs = [
    { key: 'details', label: 'Details', icon: 'bi-info-circle' },
    { key: 'airfeetpo', label: 'Airfeet PO', icon: 'bi-receipt' },
    { key: 'history', label: 'History', icon: 'bi-clock-history' },
  ]

  // ── Design Helpers (matching ViewCustomer) ──
  const boxStyle = { borderRadius: 14, background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid #e8ecf1', overflow: 'hidden', height: '100%' }
  const headStyle = (accent) => ({ background: accent, padding: '11px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 })
  const headTitle = (icon, text) => (
    <span className="d-flex align-items-center gap-2 text-white fw-bold" style={{ fontSize: '.88rem', letterSpacing: '.01em' }}>
      <span className="d-flex align-items-center justify-content-center" style={{ width: 26, height: 26, borderRadius: 7, background: 'rgba(255,255,255,0.2)' }}><i className={`bi ${icon}`} style={{ fontSize: '.82rem' }}></i></span>
      {text}
    </span>
  )
  const fieldRow = (icon, label, value, isLast) => (
    <div className="d-flex align-items-start gap-2" style={{ padding: '9px 16px', borderBottom: isLast ? 'none' : '1px solid #f3f4f6' }}>
      <i className={`bi ${icon} mt-1`} style={{ fontSize: '.78rem', color: '#94a3b8', width: 16, flexShrink: 0 }}></i>
      <div className="text-muted" style={{ fontSize: '.8rem', fontWeight: 600, width: 115, flexShrink: 0 }}>{label}</div>
      <div className="flex-grow-1" style={{ fontSize: '.84rem', color: '#1e293b' }}>{value}</div>
    </div>
  )
  const accentBlue = 'linear-gradient(135deg, #3b82f6, #2563eb)'
  const accentGreen = 'linear-gradient(135deg, #22c55e, #16a34a)'
  const accentTeal = 'linear-gradient(135deg, #14b8a6, #0d9488)'

  const filteredPos = getFilteredPos()

  // ── Modal rendering helper ──
  function renderModal(show, onClose, title, body, footer) {
    if (!show) return null
    return (<>
      <div className="modal-backdrop fade show"></div>
      <div className="modal fade show d-block" tabIndex="-1" style={{ overflowY: 'auto' }}>
        <div className="modal-dialog modal-lg">
          <div className="modal-content border-0 shadow-lg" style={{ borderRadius: 16 }}>
            <div className="modal-header text-white" style={{ background: 'linear-gradient(135deg, #2563eb, #1e40af)', borderRadius: '16px 16px 0 0' }}>
              <h6 className="modal-title fw-bold">{title}</h6>
              <button type="button" className="btn-close btn-close-white" onClick={onClose}></button>
            </div>
            <div className="modal-body p-4">{body}</div>
            {footer && <div className="modal-footer">{footer}</div>}
          </div>
        </div>
      </div>
    </>)
  }

  return (
    <div style={{ overflow: 'hidden' }}>
      {/* Breadcrumb */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <nav aria-label="breadcrumb">
          <ol className="breadcrumb mb-0">
            <li className="breadcrumb-item"><Link to="/dashboard"><i className="bi bi-house-door me-1"></i>Dashboard</Link></li>
            <li className="breadcrumb-item"><Link to="/customers/suppliers">Suppliers</Link></li>
            <li className="breadcrumb-item active">{supplier.supplier_name}</li>
          </ol>
        </nav>
        <div className="d-flex gap-2">
          <Link to="/customers/suppliers" className="btn btn-sm btn-outline-secondary rounded-pill"><i className="bi bi-arrow-left me-1"></i>Back to List</Link>
        </div>
      </div>

      {/* ── SUPPLIER HEADER BAR ── */}
      <div className="card border-0 shadow-sm mb-3" style={{ borderRadius: 16, overflow: 'hidden', position: 'relative' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg, #2563eb, #7c3aed, #2563eb)' }}></div>
        <div className="card-body d-flex align-items-center gap-3 flex-wrap py-3 px-4">
          <div className="d-flex align-items-center justify-content-center fw-bold text-white" style={{ width: 64, height: 64, borderRadius: 16, background: `linear-gradient(135deg, ${color}, #7c3aed)`, fontSize: '1.4rem', boxShadow: '0 4px 12px rgba(37,99,235,.25)', flexShrink: 0 }}>
            {getInitials(supplier.supplier_name)}
          </div>
          <div className="flex-grow-1">
            <div style={{ fontSize: '1.25rem', fontWeight: 800 }}>{supplier.supplier_name}</div>
            <div className="text-muted" style={{ fontSize: '.82rem', fontWeight: 600 }}>Cust #: {supplier.customer_code || '—'} &nbsp;|&nbsp; Type: {supplier.supplier_type || '—'}</div>
            <div className="d-flex gap-3 mt-1 flex-wrap">
              {supplier.phone && <span className="d-flex align-items-center gap-1 text-muted" style={{ fontSize: '.78rem', fontWeight: 500 }}><i className="bi bi-telephone text-primary" style={{ fontSize: '.85rem' }}></i>{supplier.phone}{supplier.extension ? ` x${supplier.extension}` : ''}</span>}
              {supplier.email && <span className="d-flex align-items-center gap-1 text-muted" style={{ fontSize: '.78rem', fontWeight: 500 }}><i className="bi bi-envelope text-primary" style={{ fontSize: '.85rem' }}></i>{supplier.email}</span>}
              {createdDate && <span className="d-flex align-items-center gap-1 text-muted" style={{ fontSize: '.78rem', fontWeight: 500 }}><i className="bi bi-calendar-check text-primary" style={{ fontSize: '.85rem' }}></i>Since {createdDate}</span>}
            </div>
          </div>
          <div className="d-flex align-items-center gap-2">
            {['pilot', 'active', 'inactive'].map(s => (
              <label key={s} className="d-flex align-items-center gap-1 px-3 py-1 border rounded-pill" style={{ fontSize: '.8rem', fontWeight: 600, cursor: 'pointer', background: supplier.status === s ? '#eff6ff' : '#fff', borderColor: supplier.status === s ? '#2563eb' : '#e2e8f0' }}>
                <input type="radio" name="supStatus" value={s} checked={supplier.status === s} onChange={() => saveStatus(s)} style={{ accentColor: '#2563eb', width: 14, height: 14 }} />
                <span style={{ color: supplier.status === s ? '#2563eb' : undefined }}>{s.charAt(0).toUpperCase() + s.slice(1)}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* ── Tab Navigation (pill buttons like ViewCustomer) ── */}
      <div className="d-flex gap-2 mb-3 flex-wrap">
        {tabs.map(tab => {
          const isActive = activeTab === tab.key
          return (
            <button key={tab.key} className="btn btn-sm px-3 py-2 d-flex align-items-center gap-2"
              style={{ borderRadius: 10, border: isActive ? 'none' : '1px solid #e2e8f0', background: isActive ? 'linear-gradient(135deg, #2563eb, #1e40af)' : '#fff', color: isActive ? '#fff' : '#64748b', fontWeight: 600, fontSize: '0.85rem', boxShadow: isActive ? '0 2px 8px rgba(37,99,235,0.3)' : '0 1px 3px rgba(0,0,0,0.04)', transition: 'all 0.2s' }}
              onClick={() => switchTab(tab.key)}>
              <i className={`bi ${tab.icon}`}></i>{tab.label}
            </button>
          )
        })}
      </div>

      {/* ── Tab Content ── */}
      <div className="card border-0 shadow-sm" style={{ borderRadius: 14, overflow: 'hidden' }}>
        <div className="card-body p-4">

          {/* ==================== DETAILS TAB ==================== */}
          {activeTab === 'details' && (<>
            {/* Action Bar */}
            <div className="d-flex gap-2 flex-wrap mb-4">
              {[
                { icon: 'bi-person-plus-fill', label: 'Add New Contact', bg: '#22c55e', onClick: openAddContact },
                { icon: 'bi-receipt', label: 'Add New PO', bg: '#3b82f6', onClick: () => { switchTab('airfeetpo'); setTimeout(() => openCreatePo(), 100) } },
                { icon: 'bi-geo-alt-fill', label: 'Add New Address', bg: '#22c55e', onClick: openAddAddress },
              ].map((b, i) => (
                <button key={i} className="btn text-white d-flex align-items-center gap-2" style={{ background: b.bg, borderRadius: 10, fontWeight: 600, fontSize: '.82rem', padding: '8px 18px', border: 'none', boxShadow: `0 2px 8px ${b.bg}33` }} onClick={b.onClick}>
                  <i className={`bi ${b.icon}`}></i>{b.label}
                </button>
              ))}
            </div>

            <div className="row g-3">
              {/* ── Supplier Info ── */}
              <div className="col-md-6">
                <div style={boxStyle}>
                  <div style={headStyle(accentBlue)}>
                    {headTitle('bi-info-circle-fill', 'Supplier Info')}
                    <button className="btn btn-sm px-2 py-0" style={{ fontSize: '.72rem', fontWeight: 600, color: '#fff', background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.35)', borderRadius: 6 }} onClick={openEditInfo}><i className="bi bi-pencil-square me-1" style={{ fontSize: '.68rem' }}></i>Edit</button>
                  </div>
                  <div>
                    {[
                      { i: 'bi-hash', l: 'Cust #:', v: <span className="badge px-2 py-1" style={{ background: '#eff6ff', color: '#2563eb', fontWeight: 700, fontSize: '.82rem' }}>{supplier.customer_code || '—'}</span> },
                      { i: 'bi-building', l: 'Name:', v: <span className="fw-semibold" style={{ color: '#2563eb' }}>{supplier.supplier_name}</span> },
                      { i: 'bi-tag', l: 'Type:', v: supplier.supplier_type || '—' },
                      { i: 'bi-person', l: 'Contact:', v: supplier.contact_name || '—' },
                      { i: 'bi-telephone', l: 'Phone:', v: supplier.phone ? supplier.phone + (supplier.extension ? ` ext ${supplier.extension}` : '') : '—' },
                      { i: 'bi-envelope', l: 'Email:', v: supplier.email ? <a href={`mailto:${supplier.email}`} className="text-decoration-none" style={{ color: '#2563eb' }}>{supplier.email}</a> : '—' },
                    ].map((r, idx, arr) => fieldRow(r.i, r.l, r.v, idx === arr.length - 1))}

                    {/* Inline-editable Terms/FOB/Ship fields */}
                    {[
                      { i: 'bi-credit-card', l: 'Terms:', field: 'terms', val: supplier.terms },
                      { i: 'bi-box-seam', l: 'FOB:', field: 'fob', val: supplier.fob },
                      { i: 'bi-truck', l: 'Ship Info:', field: 'ship', val: supplier.ship },
                      { i: 'bi-signpost-2', l: 'Ship Via:', field: 'ship_via', val: supplier.ship_via },
                      { i: 'bi-folder2-open', l: 'Project:', field: 'project', val: supplier.project },
                    ].map((r, idx, arr) => (
                      <div key={r.field} className="d-flex align-items-start gap-2" style={{ padding: '9px 16px', borderBottom: idx === arr.length - 1 ? 'none' : '1px solid #f3f4f6' }}>
                        <i className={`bi ${r.i} mt-1`} style={{ fontSize: '.78rem', color: '#94a3b8', width: 16, flexShrink: 0 }}></i>
                        <div className="text-muted" style={{ fontSize: '.8rem', fontWeight: 600, width: 115, flexShrink: 0 }}>{r.l}</div>
                        <div className="flex-grow-1">
                          {inlineEdit && inlineEdit.field === r.field ? (
                            <div className="d-flex align-items-center gap-1">
                              <input type="text" className="form-control form-control-sm" style={{ fontSize: '.84rem', padding: '2px 8px', maxWidth: 220 }} value={inlineEdit.value} onChange={e => setInlineEdit({ ...inlineEdit, value: e.target.value })} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); saveInlineField(r.field, inlineEdit.value) } if (e.key === 'Escape') setInlineEdit(null) }} autoFocus disabled={inlineSaving} />
                              <button className="btn btn-sm btn-success p-0 d-flex align-items-center justify-content-center" style={{ width: 26, height: 26, borderRadius: 6, flexShrink: 0 }} onClick={() => saveInlineField(r.field, inlineEdit.value)} disabled={inlineSaving}><i className="bi bi-check-lg" style={{ fontSize: '.78rem' }}></i></button>
                              <button className="btn btn-sm btn-outline-secondary p-0 d-flex align-items-center justify-content-center" style={{ width: 26, height: 26, borderRadius: 6, flexShrink: 0 }} onClick={() => setInlineEdit(null)} disabled={inlineSaving}><i className="bi bi-x-lg" style={{ fontSize: '.72rem' }}></i></button>
                            </div>
                          ) : (
                            <span style={{ fontSize: '.84rem', color: r.val ? '#1e293b' : '#94a3b8', cursor: 'pointer', borderBottom: '1px dashed #cbd5e1', fontStyle: r.val ? 'normal' : 'italic' }} title="Click to edit" onClick={() => setInlineEdit({ field: r.field, value: r.val || '' })}>
                              {r.val || '— click to edit'}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* ── Supplier Notes ── */}
              <div className="col-md-6">
                <div style={{ ...boxStyle, display: 'flex', flexDirection: 'column' }}>
                  <div style={headStyle(accentBlue)}>
                    {headTitle('bi-journal-richtext', 'Supplier Notes')}
                    {!editingNotes ? (
                      <button className="btn btn-sm px-2 py-0" style={{ fontSize: '.72rem', fontWeight: 600, color: '#fff', background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.35)', borderRadius: 6 }} onClick={openNotesEditor}>
                        <i className="bi bi-pencil-square me-1" style={{ fontSize: '.68rem' }}></i>{supplier.notes ? 'Edit' : 'Add'}
                      </button>
                    ) : (
                      <div className="d-flex gap-1">
                        <button className="btn btn-sm px-2 py-0" style={{ fontSize: '.72rem', fontWeight: 600, color: '#fff', background: 'rgba(255,255,255,0.3)', border: '1px solid rgba(255,255,255,0.5)', borderRadius: 6 }} onClick={saveNotes} disabled={notesSaving}>
                          {notesSaving ? <span className="spinner-border spinner-border-sm" style={{ width: 12, height: 12 }}></span> : <><i className="bi bi-check-lg me-1" style={{ fontSize: '.68rem' }}></i>Save</>}
                        </button>
                        <button className="btn btn-sm px-2 py-0" style={{ fontSize: '.72rem', fontWeight: 600, color: '#fff', background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 6 }} onClick={() => setEditingNotes(false)} disabled={notesSaving}>
                          <i className="bi bi-x-lg" style={{ fontSize: '.68rem' }}></i>
                        </button>
                      </div>
                    )}
                  </div>
                  {editingNotes ? (
                    <div className="flex-grow-1 p-3">
                      <CKEditor editor={ClassicEditor} data={notesHtml} config={{ toolbar: ['heading', '|', 'bold', 'italic', 'underline', '|', 'bulletedList', 'numberedList', '|', 'blockQuote', 'link', '|', 'undo', 'redo'] }} onChange={(event, editor) => setNotesHtml(editor.getData())} />
                    </div>
                  ) : (
                    <div className="flex-grow-1 p-3" style={{ overflowY: 'auto', maxHeight: 400 }}>
                      {supplier.notes ? (
                        <div style={{ fontSize: '.84rem', lineHeight: 1.7, color: '#334155' }} dangerouslySetInnerHTML={{ __html: supplier.notes.replace(/\\n/g, '') }} />
                      ) : (
                        <div className="text-center py-5">
                          <div style={{ width: 56, height: 56, borderRadius: 14, background: '#f1f5f9', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
                            <i className="bi bi-journal-text" style={{ fontSize: '1.4rem', color: '#94a3b8' }}></i>
                          </div>
                          <div className="text-muted" style={{ fontSize: '.84rem' }}>No notes yet</div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* ── Contact Cards ── */}
              {contacts.length > 0 ? contacts.map((ct, ci) => {
                const contactName = [nn(ct.title) || nn(ct.contact_title), nn(ct.name) || nn(ct.contact_person)].filter(Boolean).join('. ') || '—'
                return (
                  <div className="col-md-6" key={'ct' + ci}>
                    <div style={boxStyle}>
                      <div style={headStyle(accentGreen)}>
                        {headTitle('bi-person-badge-fill', ct.contact_label || 'Contact')}
                        <div className="d-flex gap-1">
                          <button className="btn btn-sm px-2 py-0" style={{ fontSize: '.72rem', fontWeight: 600, color: '#fff', background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.35)', borderRadius: 6 }} onClick={() => openEditContact(ct)}><i className="bi bi-pencil-square me-1" style={{ fontSize: '.68rem' }}></i>Edit</button>
                          <button className="btn btn-sm px-2 py-0" style={{ fontSize: '.72rem', fontWeight: 600, color: '#fff', background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 6 }} onClick={() => setDeleteConfirm({ type: 'contact', id: ct._id, name: nn(ct.name) || nn(ct.contact_person) || 'this contact' })}><i className="bi bi-trash3 me-1" style={{ fontSize: '.68rem' }}></i>Delete</button>
                        </div>
                      </div>
                      <div className="d-flex align-items-center gap-3 px-3 pt-3 pb-2" style={{ borderBottom: '1px solid #f3f4f6' }}>
                        <div style={{ width: 44, height: 44, borderRadius: '50%', background: accentGreen, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <i className="bi bi-person-fill text-white" style={{ fontSize: '1.1rem' }}></i>
                        </div>
                        <div>
                          <div className="fw-bold" style={{ fontSize: '.92rem', color: '#1e293b' }}>{contactName}</div>
                          {nn(ct.position || ct.contact_position) && <div className="text-muted" style={{ fontSize: '.78rem' }}>{ct.position || ct.contact_position}</div>}
                        </div>
                      </div>
                      <div className="p-2">
                        {[
                          { i: 'bi-telephone-fill', l: 'Main Phone:', v: nn(ct.main_phone) ? ct.main_phone + (nn(ct.desk_ext) && ct.desk_ext !== '-' ? ', ext ' + ct.desk_ext : '') : '—', color: '#16a34a' },
                          { i: 'bi-telephone', l: 'Desk Phone:', v: nn(ct.desk_phone) || '—', color: '#64748b' },
                          { i: 'bi-phone-fill', l: 'Mobile:', v: nn(ct.mobile_phone) || '—', color: '#8b5cf6' },
                          { i: 'bi-envelope-fill', l: 'Email:', v: nn(ct.email || ct.contact_email) ? <a href={`mailto:${ct.email || ct.contact_email}`} className="text-decoration-none" style={{ color: '#2563eb' }}>{ct.email || ct.contact_email}</a> : '—', color: '#2563eb' },
                        ].map((r, ri, arr) => (
                          <div key={ri} className="d-flex align-items-center gap-2" style={{ padding: '7px 14px', borderBottom: ri === arr.length - 1 ? 'none' : '1px solid #f3f4f6' }}>
                            <i className={`bi ${r.i}`} style={{ fontSize: '.76rem', color: r.color, width: 16, flexShrink: 0 }}></i>
                            <div className="text-muted" style={{ fontSize: '.78rem', fontWeight: 600, width: 100, flexShrink: 0 }}>{r.l}</div>
                            <div style={{ fontSize: '.84rem', color: '#1e293b' }}>{r.v}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )
              }) : (
                <div className="col-md-6">
                  <div style={boxStyle}>
                    <div style={headStyle(accentGreen)}>{headTitle('bi-person-badge-fill', 'Contact')}</div>
                    <div className="text-center py-4">
                      <div style={{ width: 48, height: 48, borderRadius: 12, background: '#f0fdf4', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}><i className="bi bi-person-x" style={{ fontSize: '1.3rem', color: '#94a3b8' }}></i></div>
                      <div className="text-muted" style={{ fontSize: '.84rem' }}>No contacts on file</div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Address Cards ── */}
              {addresses.length > 0 ? addresses.map((addr, ai) => (
                <div className="col-md-6" key={'addr' + ai}>
                  <div style={boxStyle}>
                    <div style={headStyle(accentTeal)}>
                      {headTitle('bi-geo-alt-fill', addr.address_label || addr.name || 'Address')}
                      <div className="d-flex gap-1">
                        <button className="btn btn-sm px-2 py-0" style={{ fontSize: '.72rem', fontWeight: 600, color: '#fff', background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.35)', borderRadius: 6 }} onClick={() => openEditAddress(addr)}><i className="bi bi-pencil-square me-1" style={{ fontSize: '.68rem' }}></i>Edit</button>
                        <button className="btn btn-sm px-2 py-0" style={{ fontSize: '.72rem', fontWeight: 600, color: '#fff', background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 6 }} onClick={() => setDeleteConfirm({ type: 'address', id: addr._id, name: addr.address_label || addr.name || 'this address' })}><i className="bi bi-trash3 me-1" style={{ fontSize: '.68rem' }}></i>Delete</button>
                      </div>
                    </div>
                    <div className="d-flex gap-3 p-3" style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <div style={{ width: 44, height: 44, borderRadius: 10, background: '#ccfbf1', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <i className="bi bi-pin-map-fill" style={{ color: '#0d9488', fontSize: '1.1rem' }}></i>
                      </div>
                      <div style={{ fontSize: '.84rem', lineHeight: 1.6, color: '#334155' }}>
                        {nn(addr.name) && <div className="fw-semibold">{addr.name}</div>}
                        <div>{nn(addr.street_address) || '—'}</div>
                        <div>{[nn(addr.city), nn(addr.state), nn(addr.zip_code)].filter(Boolean).join(', ')}</div>
                        {nn(addr.country) && <div className="text-muted">{addr.country}</div>}
                      </div>
                    </div>
                    <div className="p-2">
                      {[
                        ...(nn(addr.email) ? [{ i: 'bi-envelope', l: 'Email:', v: <a href={`mailto:${addr.email}`} className="text-decoration-none" style={{ color: '#2563eb' }}>{addr.email}</a>, c: '#2563eb' }] : []),
                        ...(nn(addr.phoneno || addr.phone) ? [{ i: 'bi-telephone', l: 'Phone:', v: addr.phoneno || addr.phone, c: '#16a34a' }] : []),
                        ...(nn(addr.shipping_anct || addr.shipping_acnt) ? [{ i: 'bi-truck', l: 'Shipping Acnt:', v: addr.shipping_anct || addr.shipping_acnt, c: '#e67e22' }] : []),
                      ].map((r, ri, arr) => (
                        <div key={ri} className="d-flex align-items-center gap-2" style={{ padding: '6px 14px', borderBottom: ri === arr.length - 1 ? 'none' : '1px solid #f3f4f6' }}>
                          <i className={`bi ${r.i}`} style={{ fontSize: '.76rem', color: r.c, width: 16, flexShrink: 0 }}></i>
                          <div className="text-muted" style={{ fontSize: '.78rem', fontWeight: 600, width: 105, flexShrink: 0 }}>{r.l}</div>
                          <div style={{ fontSize: '.84rem', color: '#1e293b' }}>{r.v}</div>
                        </div>
                      ))}
                      {!nn(addr.email) && !nn(addr.phoneno || addr.phone) && !nn(addr.shipping_anct || addr.shipping_acnt) && (
                        <div className="text-center text-muted py-2" style={{ fontSize: '.8rem' }}>No additional details</div>
                      )}
                    </div>
                  </div>
                </div>
              )) : (
                <div className="col-md-6">
                  <div style={boxStyle}>
                    <div style={headStyle(accentTeal)}>{headTitle('bi-geo-alt-fill', 'Address')}</div>
                    <div className="text-center py-4">
                      <div style={{ width: 48, height: 48, borderRadius: 12, background: '#f0fdfa', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}><i className="bi bi-geo-alt" style={{ fontSize: '1.3rem', color: '#94a3b8' }}></i></div>
                      <div className="text-muted" style={{ fontSize: '.84rem' }}>No addresses on file</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>)}

          {/* ==================== AIRFEET PO TAB ==================== */}
          {activeTab === 'airfeetpo' && (
            <div>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <span className="fw-bold" style={{ fontSize: '.95rem', color: '#16a34a' }}>Airfeet PO List</span>
                <button className="btn btn-sm btn-success rounded-pill" onClick={openCreatePo}><i className="bi bi-plus me-1"></i>New Airfeet PO</button>
              </div>
              {poLoading ? <div className="text-center py-4"><div className="spinner-border text-primary"></div></div> : (
                <div className="table-responsive">
                  <table className="table table-striped table-bordered table-hover" style={{ fontSize: '.85rem' }}>
                    <thead style={{ background: '#C7DEFE' }}>
                      <tr>
                        <th>Airfeet PO #</th><th>PO#</th><th>PO Date</th><th>Qty</th><th>Totals</th><th>InvAction</th>
                      </tr>
                      <tr>
                        <td><input type="text" className="form-control form-control-sm" value={poSearch.airfeetPo} onChange={e => setPoSearch({ ...poSearch, airfeetPo: e.target.value })} /></td>
                        <td><input type="text" className="form-control form-control-sm" value={poSearch.poNum} onChange={e => setPoSearch({ ...poSearch, poNum: e.target.value })} /></td>
                        <td>
                          <input type="date" className="form-control form-control-sm mb-1" value={poSearch.dateFrom} onChange={e => setPoSearch({ ...poSearch, dateFrom: e.target.value })} />
                          <input type="date" className="form-control form-control-sm" value={poSearch.dateTo} onChange={e => setPoSearch({ ...poSearch, dateTo: e.target.value })} />
                        </td>
                        <td><input type="text" className="form-control form-control-sm" value={poSearch.qty} onChange={e => setPoSearch({ ...poSearch, qty: e.target.value })} /></td>
                        <td>
                          <input type="text" className="form-control form-control-sm mb-1" placeholder="From" value={poSearch.amtFrom} onChange={e => setPoSearch({ ...poSearch, amtFrom: e.target.value })} />
                          <input type="text" className="form-control form-control-sm" placeholder="To" value={poSearch.amtTo} onChange={e => setPoSearch({ ...poSearch, amtTo: e.target.value })} />
                        </td>
                        <td>
                          <button className="btn btn-sm btn-warning mb-1 w-100"><i className="bi bi-search me-1"></i>Search</button>
                          <button className="btn btn-sm btn-danger w-100" onClick={() => setPoSearch({ airfeetPo: '', poNum: '', dateFrom: '', dateTo: '', qty: '', amtFrom: '', amtTo: '' })}><i className="bi bi-x me-1"></i>Reset</button>
                        </td>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPos.length === 0 ? <tr><td colSpan="6" className="text-center text-muted py-3">No POs found</td></tr> : filteredPos.map(po => (
                        <tr key={po._id}>
                          <td>{po.legacy_id}</td>
                          <td>{po.po_number || '-'}</td>
                          <td>{po.po_date ? new Date(po.po_date).toLocaleDateString('en-US') : '-'}</td>
                          <td>{po.po_total_qty || 0}</td>
                          <td>{fmt$(po.po_net_amount)}</td>
                          <td>
                            <button className="btn btn-sm btn-outline-secondary rounded-circle me-1" title="Edit Invoice" onClick={() => openEditPo(po)}><i className="bi bi-pencil"></i></button>
                            <button className="btn btn-sm btn-outline-secondary rounded-circle me-1" title="View Invoice" onClick={() => openInvoice(po)}><i className="bi bi-file-earmark-pdf"></i></button>
                            <button className="btn btn-sm btn-outline-danger rounded-circle" title="Delete" onClick={() => deletePO(po._id)}><i className="bi bi-trash"></i></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ==================== HISTORY TAB ==================== */}
          {activeTab === 'history' && (
            <div>
              <div className="mb-3"><span className="fw-bold" style={{ fontSize: '.95rem', color: '#16a34a' }}>History List</span></div>
              {histLoading ? <div className="text-center py-4"><div className="spinner-border text-primary"></div></div> : (
                <div className="table-responsive">
                  <table className="table table-striped table-bordered table-hover" style={{ fontSize: '.85rem' }}>
                    <thead style={{ background: '#E0F1E2' }}>
                      <tr>
                        <th>Line</th><th>Invoice #</th><th>Invoice Date</th><th>Qty</th><th>PO Total</th>
                        {history.itemTypeColumns.map(col => <th key={col.id}>{col.name} - Total</th>)}
                        <th>CommTotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.poList.length === 0 ? <tr><td colSpan={6 + history.itemTypeColumns.length} className="text-center text-muted py-3">No history found</td></tr> : history.poList.map(po => (
                        <tr key={po.po_id}>
                          <td>{po.line}</td>
                          <td>{po.po_number || '-'}</td>
                          <td>{po.po_date ? new Date(po.po_date).toLocaleDateString('en-US') : '-'}</td>
                          <td>{po.po_tqty}</td>
                          <td>{fmt$(po.po_total)}</td>
                          {history.itemTypeColumns.map(col => <td key={col.id}>{fmt$(po.totals[col.id] || 0)}</td>)}
                          <td>{fmt$(po.commTotal)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ════════════ MODALS ════════════ */}

      {/* Edit Supplier Info Modal */}
      {renderModal(showEditInfo, () => setShowEditInfo(false), 'Edit Supplier Info',
        <form onSubmit={handleSaveInfo} id="editInfoForm">
          <div className="row g-3">
            <div className="col-md-6"><label className="form-label small fw-semibold">Supplier Name *</label><input type="text" className="form-control" required value={editForm.supplier_name || ''} onChange={e => setEditForm({ ...editForm, supplier_name: e.target.value })} /></div>
            <div className="col-md-3"><label className="form-label small fw-semibold">Code</label><input type="text" className="form-control" value={editForm.customer_code || ''} onChange={e => setEditForm({ ...editForm, customer_code: e.target.value })} /></div>
            <div className="col-md-3"><label className="form-label small fw-semibold">Type</label><input type="text" className="form-control" value={editForm.supplier_type || ''} onChange={e => setEditForm({ ...editForm, supplier_type: e.target.value })} /></div>
            <div className="col-md-4"><label className="form-label small fw-semibold">Contact Name</label><input type="text" className="form-control" value={editForm.contact_name || ''} onChange={e => setEditForm({ ...editForm, contact_name: e.target.value })} /></div>
            <div className="col-md-3"><label className="form-label small fw-semibold">Phone</label><input type="text" className="form-control" value={editForm.phone || ''} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} /></div>
            <div className="col-md-2"><label className="form-label small fw-semibold">Ext</label><input type="text" className="form-control" value={editForm.extension || ''} onChange={e => setEditForm({ ...editForm, extension: e.target.value })} /></div>
            <div className="col-md-3"><label className="form-label small fw-semibold">Email</label><input type="email" className="form-control" value={editForm.email || ''} onChange={e => setEditForm({ ...editForm, email: e.target.value })} /></div>
            <div className="col-md-4"><label className="form-label small fw-semibold">City</label><input type="text" className="form-control" value={editForm.city || ''} onChange={e => setEditForm({ ...editForm, city: e.target.value })} /></div>
            <div className="col-md-4"><label className="form-label small fw-semibold">State</label><input type="text" className="form-control" value={editForm.state || ''} onChange={e => setEditForm({ ...editForm, state: e.target.value })} /></div>
            <div className="col-md-4"><label className="form-label small fw-semibold">Status</label>
              <select className="form-select" value={editForm.status || 'active'} onChange={e => setEditForm({ ...editForm, status: e.target.value })}>
                <option value="active">Active</option><option value="inactive">Inactive</option><option value="pilot">Pilot</option>
              </select>
            </div>
          </div>
          <div className="d-flex gap-2 mt-4">
            <button type="submit" className="btn btn-primary" disabled={editSaving}>{editSaving ? <span className="spinner-border spinner-border-sm"></span> : <><i className="bi bi-check-lg me-1"></i>Save Changes</>}</button>
            <button type="button" className="btn btn-outline-secondary" onClick={() => setShowEditInfo(false)}>Cancel</button>
          </div>
        </form>
      )}

      {/* Add Contact Modal */}
      {renderModal(showAddContact, () => setShowAddContact(false), 'Add New Contact',
        <form onSubmit={handleAddContact}>
          <div className="row g-3">
            <div className="col-md-4"><label className="form-label small fw-semibold">Name *</label><input type="text" className="form-control" required value={addContactForm.name || ''} onChange={e => setAddContactForm({ ...addContactForm, name: e.target.value })} /></div>
            <div className="col-md-4"><label className="form-label small fw-semibold">Title</label><input type="text" className="form-control" value={addContactForm.title || ''} onChange={e => setAddContactForm({ ...addContactForm, title: e.target.value })} /></div>
            <div className="col-md-4"><label className="form-label small fw-semibold">Position</label><input type="text" className="form-control" value={addContactForm.position || ''} onChange={e => setAddContactForm({ ...addContactForm, position: e.target.value })} /></div>
            <div className="col-md-4"><label className="form-label small fw-semibold">Main Phone</label><input type="text" className="form-control" value={addContactForm.main_phone || ''} onChange={e => setAddContactForm({ ...addContactForm, main_phone: e.target.value })} /></div>
            <div className="col-md-4"><label className="form-label small fw-semibold">Desk Phone</label><input type="text" className="form-control" value={addContactForm.desk_phone || ''} onChange={e => setAddContactForm({ ...addContactForm, desk_phone: e.target.value })} /></div>
            <div className="col-md-4"><label className="form-label small fw-semibold">Mobile</label><input type="text" className="form-control" value={addContactForm.mobile_phone || ''} onChange={e => setAddContactForm({ ...addContactForm, mobile_phone: e.target.value })} /></div>
            <div className="col-md-6"><label className="form-label small fw-semibold">Email</label><input type="email" className="form-control" value={addContactForm.email || ''} onChange={e => setAddContactForm({ ...addContactForm, email: e.target.value })} /></div>
          </div>
          <div className="d-flex gap-2 mt-4">
            <button type="submit" className="btn btn-success" disabled={addContactSaving}>{addContactSaving ? <span className="spinner-border spinner-border-sm"></span> : <><i className="bi bi-check-lg me-1"></i>Save Contact</>}</button>
            <button type="button" className="btn btn-outline-secondary" onClick={() => setShowAddContact(false)}>Cancel</button>
          </div>
        </form>
      )}

      {/* Edit Contact Modal */}
      {renderModal(showEditContact, () => setShowEditContact(false), 'Edit Contact',
        <form onSubmit={handleSaveContact}>
          <div className="row g-3">
            <div className="col-md-4"><label className="form-label small fw-semibold">Name *</label><input type="text" className="form-control" required value={contactForm.name || ''} onChange={e => setContactForm({ ...contactForm, name: e.target.value })} /></div>
            <div className="col-md-4"><label className="form-label small fw-semibold">Title</label><input type="text" className="form-control" value={contactForm.title || ''} onChange={e => setContactForm({ ...contactForm, title: e.target.value })} /></div>
            <div className="col-md-4"><label className="form-label small fw-semibold">Position</label><input type="text" className="form-control" value={contactForm.position || ''} onChange={e => setContactForm({ ...contactForm, position: e.target.value })} /></div>
            <div className="col-md-4"><label className="form-label small fw-semibold">Main Phone</label><input type="text" className="form-control" value={contactForm.main_phone || ''} onChange={e => setContactForm({ ...contactForm, main_phone: e.target.value })} /></div>
            <div className="col-md-4"><label className="form-label small fw-semibold">Desk Phone</label><input type="text" className="form-control" value={contactForm.desk_phone || ''} onChange={e => setContactForm({ ...contactForm, desk_phone: e.target.value })} /></div>
            <div className="col-md-4"><label className="form-label small fw-semibold">Mobile</label><input type="text" className="form-control" value={contactForm.mobile_phone || ''} onChange={e => setContactForm({ ...contactForm, mobile_phone: e.target.value })} /></div>
            <div className="col-md-6"><label className="form-label small fw-semibold">Email</label><input type="email" className="form-control" value={contactForm.email || ''} onChange={e => setContactForm({ ...contactForm, email: e.target.value })} /></div>
          </div>
          <div className="d-flex gap-2 mt-4">
            <button type="submit" className="btn btn-primary" disabled={contactSaving}>{contactSaving ? <span className="spinner-border spinner-border-sm"></span> : <><i className="bi bi-check-lg me-1"></i>Update Contact</>}</button>
            <button type="button" className="btn btn-outline-secondary" onClick={() => setShowEditContact(false)}>Cancel</button>
          </div>
        </form>
      )}

      {/* Add Address Modal */}
      {renderModal(showAddAddress, () => setShowAddAddress(false), 'Add New Address',
        <form onSubmit={handleAddAddress}>
          <div className="row g-3">
            <div className="col-md-6"><label className="form-label small fw-semibold">Address Label</label><input type="text" className="form-control" value={addAddressForm.address_label || ''} onChange={e => setAddAddressForm({ ...addAddressForm, address_label: e.target.value })} /></div>
            <div className="col-md-6"><label className="form-label small fw-semibold">Name/Company</label><input type="text" className="form-control" value={addAddressForm.name || ''} onChange={e => setAddAddressForm({ ...addAddressForm, name: e.target.value })} /></div>
            <div className="col-md-12"><label className="form-label small fw-semibold">Street Address</label><input type="text" className="form-control" value={addAddressForm.street_address || ''} onChange={e => setAddAddressForm({ ...addAddressForm, street_address: e.target.value })} /></div>
            <div className="col-md-3"><label className="form-label small fw-semibold">City</label><input type="text" className="form-control" value={addAddressForm.city || ''} onChange={e => setAddAddressForm({ ...addAddressForm, city: e.target.value })} /></div>
            <div className="col-md-3"><label className="form-label small fw-semibold">State</label><input type="text" className="form-control" value={addAddressForm.state || ''} onChange={e => setAddAddressForm({ ...addAddressForm, state: e.target.value })} /></div>
            <div className="col-md-3"><label className="form-label small fw-semibold">Zip</label><input type="text" className="form-control" value={addAddressForm.zip_code || ''} onChange={e => setAddAddressForm({ ...addAddressForm, zip_code: e.target.value })} /></div>
            <div className="col-md-3"><label className="form-label small fw-semibold">Country</label><input type="text" className="form-control" value={addAddressForm.country || ''} onChange={e => setAddAddressForm({ ...addAddressForm, country: e.target.value })} /></div>
            <div className="col-md-4"><label className="form-label small fw-semibold">Phone</label><input type="text" className="form-control" value={addAddressForm.phoneno || ''} onChange={e => setAddAddressForm({ ...addAddressForm, phoneno: e.target.value })} /></div>
            <div className="col-md-4"><label className="form-label small fw-semibold">Email</label><input type="text" className="form-control" value={addAddressForm.email || ''} onChange={e => setAddAddressForm({ ...addAddressForm, email: e.target.value })} /></div>
            <div className="col-md-4"><label className="form-label small fw-semibold">Shipping Acnt</label><input type="text" className="form-control" value={addAddressForm.shipping_anct || ''} onChange={e => setAddAddressForm({ ...addAddressForm, shipping_anct: e.target.value })} /></div>
          </div>
          <div className="d-flex gap-2 mt-4">
            <button type="submit" className="btn btn-success" disabled={addAddressSaving}>{addAddressSaving ? <span className="spinner-border spinner-border-sm"></span> : <><i className="bi bi-check-lg me-1"></i>Save Address</>}</button>
            <button type="button" className="btn btn-outline-secondary" onClick={() => setShowAddAddress(false)}>Cancel</button>
          </div>
        </form>
      )}

      {/* Edit Address Modal */}
      {renderModal(showEditAddress, () => setShowEditAddress(false), 'Edit Address',
        <form onSubmit={handleSaveAddress}>
          <div className="row g-3">
            <div className="col-md-6"><label className="form-label small fw-semibold">Address Label</label><input type="text" className="form-control" value={addressForm.address_label || ''} onChange={e => setAddressForm({ ...addressForm, address_label: e.target.value })} /></div>
            <div className="col-md-6"><label className="form-label small fw-semibold">Name/Company</label><input type="text" className="form-control" value={addressForm.name || ''} onChange={e => setAddressForm({ ...addressForm, name: e.target.value })} /></div>
            <div className="col-md-12"><label className="form-label small fw-semibold">Street Address</label><input type="text" className="form-control" value={addressForm.street_address || ''} onChange={e => setAddressForm({ ...addressForm, street_address: e.target.value })} /></div>
            <div className="col-md-3"><label className="form-label small fw-semibold">City</label><input type="text" className="form-control" value={addressForm.city || ''} onChange={e => setAddressForm({ ...addressForm, city: e.target.value })} /></div>
            <div className="col-md-3"><label className="form-label small fw-semibold">State</label><input type="text" className="form-control" value={addressForm.state || ''} onChange={e => setAddressForm({ ...addressForm, state: e.target.value })} /></div>
            <div className="col-md-3"><label className="form-label small fw-semibold">Zip</label><input type="text" className="form-control" value={addressForm.zip_code || ''} onChange={e => setAddressForm({ ...addressForm, zip_code: e.target.value })} /></div>
            <div className="col-md-3"><label className="form-label small fw-semibold">Country</label><input type="text" className="form-control" value={addressForm.country || ''} onChange={e => setAddressForm({ ...addressForm, country: e.target.value })} /></div>
            <div className="col-md-4"><label className="form-label small fw-semibold">Phone</label><input type="text" className="form-control" value={addressForm.phoneno || ''} onChange={e => setAddressForm({ ...addressForm, phoneno: e.target.value })} /></div>
            <div className="col-md-4"><label className="form-label small fw-semibold">Email</label><input type="text" className="form-control" value={addressForm.email || ''} onChange={e => setAddressForm({ ...addressForm, email: e.target.value })} /></div>
            <div className="col-md-4"><label className="form-label small fw-semibold">Shipping Acnt</label><input type="text" className="form-control" value={addressForm.shipping_anct || ''} onChange={e => setAddressForm({ ...addressForm, shipping_anct: e.target.value })} /></div>
          </div>
          <div className="d-flex gap-2 mt-4">
            <button type="submit" className="btn btn-primary" disabled={addressSaving}>{addressSaving ? <span className="spinner-border spinner-border-sm"></span> : <><i className="bi bi-check-lg me-1"></i>Update Address</>}</button>
            <button type="button" className="btn btn-outline-secondary" onClick={() => setShowEditAddress(false)}>Cancel</button>
          </div>
        </form>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (<>
        <div className="modal-backdrop fade show"></div>
        <div className="modal fade show d-block" tabIndex="-1">
          <div className="modal-dialog">
            <div className="modal-content border-0 shadow-lg" style={{ borderRadius: 16 }}>
              <div className="modal-header text-white bg-danger" style={{ borderRadius: '16px 16px 0 0' }}>
                <h6 className="modal-title fw-bold"><i className="bi bi-trash me-2"></i>Delete {deleteConfirm.type}</h6>
                <button type="button" className="btn-close btn-close-white" onClick={() => setDeleteConfirm(null)}></button>
              </div>
              <div className="modal-body p-4">
                <p>Are you sure you want to delete <strong>{deleteConfirm.name}</strong>?</p>
              </div>
              <div className="modal-footer">
                <button className="btn btn-outline-secondary" onClick={() => setDeleteConfirm(null)}>Cancel</button>
                <button className="btn btn-danger" onClick={handleDelete}><i className="bi bi-trash me-1"></i>Delete</button>
              </div>
            </div>
          </div>
        </div>
      </>)}

      {/* ═══════ PO Create/Edit Modal ═══════ */}
      {showPoModal && (<>
        <div className="modal-backdrop fade show"></div>
        <div className="modal fade show d-block" tabIndex="-1" style={{ overflowY: 'auto' }}>
          <div className="modal-dialog modal-xl">
            <div className="modal-content border-0 shadow-lg" style={{ borderRadius: 16 }}>
              <div className="modal-header text-white" style={{ background: 'linear-gradient(135deg, #2563eb, #1e40af)', borderRadius: '16px 16px 0 0' }}>
                <h6 className="modal-title fw-bold"><i className={`bi ${editingPo ? 'bi-pencil' : 'bi-plus-circle'} me-2`}></i>{editingPo ? 'Edit Airfeet PO' : 'New Airfeet PO'}</h6>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowPoModal(false)}></button>
              </div>
              <form onSubmit={handleSavePo}>
                <div className="modal-body p-4">
                  <h6 className="fw-semibold text-muted mb-3"><i className="bi bi-truck me-2"></i>Supplier & PO Info</h6>
                  <div className="row g-3 mb-4">
                    <div className="col-md-4">
                      <label className="form-label fw-semibold small">Supplier</label>
                      <input type="text" className="form-control bg-light" readOnly value={supplier.supplier_name} />
                    </div>
                    <div className="col-md-3">
                      <label className="form-label fw-semibold small">PO Date</label>
                      <input type="date" className="form-control" value={poForm.po_date || ''} onChange={e => setPoForm({ ...poForm, po_date: e.target.value })} />
                    </div>
                    <div className="col-md-2">
                      <label className="form-label fw-semibold small">Type</label>
                      <select className="form-select" value={poForm.inv_quote_status} onChange={e => setPoForm({ ...poForm, inv_quote_status: parseInt(e.target.value) })}>
                        <option value={0}>Invoice</option><option value={1}>Quote</option>
                      </select>
                    </div>
                    <div className="col-md-3">
                      <label className="form-label fw-semibold small">PO Number</label>
                      <input type="text" className="form-control" value={poForm.po_number || ''} onChange={e => setPoForm({ ...poForm, po_number: e.target.value })} />
                    </div>
                    <div className="col-md-3">
                      <label className="form-label fw-semibold small">Invoice #</label>
                      <input type="text" className="form-control" value={poForm.invoice_number || ''} onChange={e => setPoForm({ ...poForm, invoice_number: e.target.value })} />
                    </div>
                    <div className="col-md-3">
                      <label className="form-label fw-semibold small">Invoice Date</label>
                      <input type="date" className="form-control" value={poForm.invoice_date || ''} onChange={e => setPoForm({ ...poForm, invoice_date: e.target.value })} />
                    </div>
                    <div className="col-md-3">
                      <label className="form-label fw-semibold small">Project</label>
                      <input type="text" className="form-control" value={poForm.project || ''} onChange={e => setPoForm({ ...poForm, project: e.target.value })} />
                    </div>
                  </div>

                  {/* Line Items */}
                  <h6 className="fw-semibold text-muted mb-3"><i className="bi bi-list-ul me-2"></i>Line Items</h6>
                  <div className="table-responsive mb-3">
                    <table className="table table-sm table-bordered" style={{ fontSize: '.85rem' }}>
                      <thead className="bg-light">
                        <tr><th style={{ width: '40%' }}>Part # / Description</th><th style={{ width: '10%' }}>Qty</th><th style={{ width: '12%' }}>UOM</th><th style={{ width: '15%' }}>Unit Price</th><th style={{ width: '15%' }}>Total</th><th style={{ width: '8%' }}></th></tr>
                      </thead>
                      <tbody>
                        {poLineItems.map((item, idx) => {
                          const lineTotal = (parseInt(item.qty) || 0) * (parseFloat(item.unit_cost) || 0)
                          return (
                            <tr key={idx}>
                              <td><textarea className="form-control form-control-sm" rows="1" value={item.description} onChange={e => updatePoLine(idx, 'description', e.target.value)} placeholder="Part # / Description" /></td>
                              <td><input type="number" className="form-control form-control-sm" value={item.qty} onChange={e => updatePoLine(idx, 'qty', e.target.value)} /></td>
                              <td><input type="text" className="form-control form-control-sm" value={item.uom} onChange={e => updatePoLine(idx, 'uom', e.target.value)} placeholder="ea" /></td>
                              <td><input type="number" step="0.01" className="form-control form-control-sm" value={item.unit_cost} onChange={e => updatePoLine(idx, 'unit_cost', e.target.value)} /></td>
                              <td className="fw-bold text-end align-middle">${lineTotal.toFixed(2)}</td>
                              <td className="text-center align-middle">{poLineItems.length > 1 && <button type="button" className="btn btn-sm btn-outline-danger p-0 px-1" onClick={() => removePoLine(idx)}><i className="bi bi-x"></i></button>}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                      <tfoot><tr className="bg-light fw-bold"><td className="text-end">Totals:</td><td>{calcPoTotals().totalQty}</td><td></td><td></td><td className="text-end">${calcPoTotals().netAmount.toFixed(2)}</td><td></td></tr></tfoot>
                    </table>
                    <button type="button" className="btn btn-sm btn-outline-primary" onClick={addPoLine}><i className="bi bi-plus me-1"></i>Add Line</button>
                  </div>

                  {/* Amounts */}
                  <h6 className="fw-semibold text-muted mb-3"><i className="bi bi-calculator me-2"></i>Amounts</h6>
                  <div className="row g-3 mb-4">
                    <div className="col-md-3"><label className="form-label fw-semibold small">Shipping Costs</label><input type="number" step="0.01" className="form-control" value={poForm.shipping_costs || ''} onChange={e => setPoForm({ ...poForm, shipping_costs: e.target.value })} /></div>
                    <div className="col-md-2"><label className="form-label fw-semibold small">Tax Type</label><select className="form-select" value={poForm.sales_tax_type || ''} onChange={e => setPoForm({ ...poForm, sales_tax_type: e.target.value })}><option value="">None</option><option value="Y">Yes</option><option value="N">No</option></select></div>
                    <div className="col-md-2"><label className="form-label fw-semibold small">Tax %</label><input type="number" className="form-control" value={poForm.sales_tax_percentage || ''} onChange={e => setPoForm({ ...poForm, sales_tax_percentage: e.target.value })} /></div>
                    <div className="col-md-2"><label className="form-label fw-semibold small">Tax $</label><input type="text" className="form-control bg-light" readOnly value={(() => { const n = calcPoTotals().netAmount; return poForm.sales_tax_type === 'Y' ? (n * ((parseFloat(poForm.sales_tax_percentage) || 0) / 100)).toFixed(2) : (poForm.sales_tax_amount || '0.00') })()} /></div>
                    <div className="col-md-3"><label className="form-label fw-bold small">Total PO ($)</label><input type="text" className="form-control fw-bold bg-light" readOnly value={(() => { const n = calcPoTotals().netAmount; const s = parseFloat(poForm.shipping_costs) || 0; const t = poForm.sales_tax_type === 'Y' ? n * ((parseFloat(poForm.sales_tax_percentage) || 0) / 100) : (parseFloat(poForm.sales_tax_amount) || 0); return '$' + (n + s + t).toFixed(2) })()} /></div>
                  </div>

                  {/* Notes */}
                  <h6 className="fw-semibold text-muted mb-3"><i className="bi bi-chat-left-text me-2"></i>Notes</h6>
                  <div className="row g-3">
                    <div className="col-md-6"><label className="form-label fw-semibold small">PO Notes</label><textarea className="form-control" rows="3" value={poForm.po_notes || ''} onChange={e => setPoForm({ ...poForm, po_notes: e.target.value })}></textarea></div>
                    <div className="col-md-6"><label className="form-label fw-semibold small">Shipping Info Notes</label><textarea className="form-control" rows="3" value={poForm.shipinfo_notes || ''} onChange={e => setPoForm({ ...poForm, shipinfo_notes: e.target.value })}></textarea></div>
                    <div className="col-md-12"><label className="form-label fw-semibold small">Credit Card Notes</label><textarea className="form-control" rows="2" value={poForm.credit_card_notes || ''} onChange={e => setPoForm({ ...poForm, credit_card_notes: e.target.value })}></textarea></div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-outline-secondary" onClick={() => setShowPoModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={poSaving}>{poSaving ? <span className="spinner-border spinner-border-sm"></span> : <><i className={`bi ${editingPo ? 'bi-check-lg' : 'bi-plus-lg'} me-1`}></i>{editingPo ? 'Update PO' : 'Save PO'}</>}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </>)}

      {/* ═══════ Invoice View Popup ═══════ */}
      {(invoicePo || invoiceLoading) && (<>
        <div className="modal-backdrop fade show"></div>
        <div className="modal fade show d-block" tabIndex="-1" style={{ overflowY: 'auto' }}>
          <div className="modal-dialog modal-xl">
            <div className="modal-content border-0 shadow-lg" style={{ borderRadius: 16 }}>
              <div className="modal-header" style={{ borderRadius: '16px 16px 0 0' }}>
                <div className="d-flex gap-2">
                  <button className="btn btn-sm btn-outline-primary" onClick={downloadInvoice}><i className="bi bi-download me-1"></i>Download PDF</button>
                  <button className="btn btn-sm btn-outline-secondary" onClick={printInvoice}><i className="bi bi-printer me-1"></i>Print</button>
                </div>
                <button type="button" className="btn-close" onClick={() => setInvoicePo(null)}></button>
              </div>
              <div className="modal-body" style={{ fontSize: 13 }}>
                {invoiceLoading ? <div className="text-center py-5"><div className="spinner-border text-primary"></div></div> : invoicePo && (
                  <div id="sup-invoice-print">
                    {/* PAID watermark */}
                    {invoicePo.paid_value === 'PAID' && (
                      <div style={{ position: 'absolute', top: '35%', left: '20%', fontSize: 150, color: 'rgba(255,0,0,0.15)', transform: 'rotate(-30deg)', fontWeight: 'bold', pointerEvents: 'none', zIndex: 0 }}>PAID</div>
                    )}

                    {/* Header */}
                    <div style={{ display: 'flex', marginBottom: 16 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                          <div style={{ textAlign: 'center', minWidth: 120 }}>
                            <img src="https://staging.stallioni.com/assets/images/logo_fleet.png" alt="Airfeet" style={{ width: 110, marginBottom: 4 }} crossOrigin="anonymous" />
                            <div style={{ fontSize: 10, fontStyle: 'italic', color: '#555' }}>"It's like walking on air"</div>
                          </div>
                          <div style={{ fontSize: 13, lineHeight: 1.5 }}>
                            <div style={{ fontWeight: 'bold' }}>Airfeet LLC</div>
                            <div>2346 S. Lynhurst Dr, Suite 701</div>
                            <div>Indianapolis Indiana 46241</div>
                          </div>
                        </div>
                      </div>
                      <div style={{ width: 260 }}>
                        <div style={{ background: 'blue', color: '#fff', textAlign: 'center', padding: '12px 20px', fontWeight: 'bold', fontSize: 16, marginBottom: 4 }}>Purchase Order</div>
                        <table className="table table-bordered table-sm mb-0" style={{ fontSize: 12 }}>
                          <thead><tr><th>P.O. No.</th><th>Date</th></tr></thead>
                          <tbody><tr><td>{invoicePo.po_number || '-'}</td><td>{fmtDate(invoicePo.po_date)}</td></tr></tbody>
                        </table>
                      </div>
                    </div>

                    {/* Vendor & Ship To */}
                    <div style={{ display: 'flex', gap: 0, marginBottom: 16 }}>
                      <div style={{ flex: 1 }}>
                        <table className="table table-bordered table-sm mb-0">
                          <thead><tr><th className="bg-light">Vendor</th></tr></thead>
                          <tbody><tr><td style={{ padding: '10px 12px' }}>
                            {(() => {
                              const addr = invoicePo.supplierAddress || {}; const contact = invoicePo.supplierContact || {}
                              return <>
                                <div style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 8 }}>{addr.name || invoicePo.supplier?.supplier_name || invoicePo.supplier_name || ''}</div>
                                <div><b>Phone:</b> {addr.phone || contact.main_phone || invoicePo.supplier?.phone || '-'}</div>
                                <div><b>Email:</b> {addr.email || contact.email || invoicePo.supplier?.email || '-'}</div>
                                <div><b>Contact:</b> {contact.name || '-'}</div>
                                <div><b>Address:</b> {[addr.street_address, [addr.city, addr.state, addr.zip_code].filter(Boolean).join(', ')].filter(Boolean).join(', ') || '-'}</div>
                              </>
                            })()}
                          </td></tr></tbody>
                        </table>
                      </div>
                      <div style={{ flex: 1 }}>
                        <table className="table table-bordered table-sm mb-0">
                          <thead><tr><th className="bg-light">Ship To</th></tr></thead>
                          <tbody><tr><td style={{ padding: '10px 12px' }}>
                            <div style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 8 }}>Airfeet LLC</div>
                            <div>2346 S. Lynhurst Dr, Suite 701</div>
                            <div>Indianapolis, IN 46241</div>
                          </td></tr></tbody>
                        </table>
                      </div>
                    </div>

                    {/* Terms row */}
                    <table className="table table-bordered table-sm mb-3">
                      <thead><tr><th className="bg-light">Terms</th><th className="bg-light">Ship</th><th className="bg-light">Ship Via</th><th className="bg-light">Project</th></tr></thead>
                      <tbody><tr>
                        <td>{invoicePo.supplier?.terms || '-'}</td>
                        <td>{invoicePo.supplier?.ship || invoicePo.shipinfo_notes || '-'}</td>
                        <td>{invoicePo.supplier?.ship_via || '-'}</td>
                        <td>{invoicePo.project || '-'}</td>
                      </tr></tbody>
                    </table>

                    {/* Items */}
                    <table className="table table-bordered table-sm mb-3">
                      <thead><tr><th className="bg-light">#</th><th className="bg-light">Description</th><th className="bg-light">Qty</th><th className="bg-light">UOM</th><th className="bg-light">Unit Cost</th><th className="bg-light">Amount</th></tr></thead>
                      <tbody>
                        {invoicePo.items && invoicePo.items.length > 0 ? invoicePo.items.map((item, i) => {
                          const qty = item.item_qty || item.qty || 0; const cost = item.item_unit_cost || item.unit_cost || 0
                          return <tr key={i}><td>{i + 1}</td><td>{item.po_item_name || item.item_with_desc || item.item_name || '-'}</td><td>{qty}</td><td>{item.uom || '-'}</td><td>{parseFloat(cost).toFixed(2)}</td><td>{(qty * cost).toFixed(2)}</td></tr>
                        }) : <tr><td colSpan="6" className="text-center text-muted">No line items</td></tr>}
                      </tbody>
                    </table>

                    {/* Totals */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <table className="table table-bordered table-sm" style={{ width: 300 }}>
                        <tbody>
                          <tr><td className="bg-light fw-bold">Subtotal</td><td className="text-end">${(parseFloat(invoicePo.po_net_amount) || 0).toFixed(2)}</td></tr>
                          {(parseFloat(invoicePo.shipping_costs) || 0) > 0 && <tr><td className="bg-light fw-bold">Shipping</td><td className="text-end">${(parseFloat(invoicePo.shipping_costs) || 0).toFixed(2)}</td></tr>}
                          {(parseFloat(invoicePo.sales_tax_amount) || 0) > 0 && <tr><td className="bg-light fw-bold">Tax ({invoicePo.sales_tax_percentage || 0}%)</td><td className="text-end">${(parseFloat(invoicePo.sales_tax_amount) || 0).toFixed(2)}</td></tr>}
                          <tr style={{ fontSize: 15 }}><td className="bg-light fw-bold">Total</td><td className="text-end fw-bold">${((parseFloat(invoicePo.po_net_amount) || 0) + (parseFloat(invoicePo.shipping_costs) || 0) + (parseFloat(invoicePo.sales_tax_amount) || 0)).toFixed(2)}</td></tr>
                        </tbody>
                      </table>
                    </div>

                    {/* Notes */}
                    {invoicePo.po_notes && <div className="mt-3"><b>Notes:</b> {invoicePo.po_notes}</div>}
                    {invoicePo.shipinfo_notes && <div><b>Shipping Notes:</b> {invoicePo.shipinfo_notes}</div>}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </>)}
    </div>
  )
}
