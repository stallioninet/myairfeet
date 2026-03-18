import { useState, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
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

export default function ViewCustomer() {
  const { id } = useParams()
  const [cust, setCust] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('details')
  const [showEditInfo, setShowEditInfo] = useState(false)
  const [editForm, setEditForm] = useState({})
  const [editSaving, setEditSaving] = useState(false)
  const [custTypes, setCustTypes] = useState([])
  const [allReps, setAllReps] = useState([])
  const [selectedReps, setSelectedReps] = useState([])
  const [repDropdownOpen, setRepDropdownOpen] = useState(false)
  const [repSearch, setRepSearch] = useState('')
  const [inlineEdit, setInlineEdit] = useState(null) // { field, value }
  const [inlineSaving, setInlineSaving] = useState(false)
  const [editingNotes, setEditingNotes] = useState(false)
  const [notesHtml, setNotesHtml] = useState('')
  const [notesSaving, setNotesSaving] = useState(false)
  const [showEditContact, setShowEditContact] = useState(false)
  const [contactForm, setContactForm] = useState({})
  const [contactSaving, setContactSaving] = useState(false)
  const [showEditAddress, setShowEditAddress] = useState(false)
  const [addressForm, setAddressForm] = useState({})
  const [addressSaving, setAddressSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(null) // { type, id, name }
  const [showAddContact, setShowAddContact] = useState(false)
  const [addContactForm, setAddContactForm] = useState({})
  const [addContactSaving, setAddContactSaving] = useState(false)
  const [showAddAddress, setShowAddAddress] = useState(false)
  const [addAddressForm, setAddAddressForm] = useState({})
  const [addAddressSaving, setAddAddressSaving] = useState(false)
  const [showAddEmails, setShowAddEmails] = useState(false)
  const [addEmailRows, setAddEmailRows] = useState([{ name: '', email: '' }])
  const [addEmailSaving, setAddEmailSaving] = useState(false)
  const [historyData, setHistoryData] = useState(null)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [histPage, setHistPage] = useState(0)
  const histPerPage = 10
  const [commData, setCommData] = useState(null)
  const [commLoading, setCommLoading] = useState(false)
  const [commExpanded, setCommExpanded] = useState(null)
  const [commFilter, setCommFilter] = useState({ invoiceNo: '', dateFrom: '', dateTo: '', qty: '', amtFrom: '', amtTo: '', commFrom: '', commTo: '', paidStatus: '' })
  const [commSort, setCommSort] = useState({ key: 'line', dir: 'asc' })
  const [commShowFilter, setCommShowFilter] = useState(true)
  const [commPage, setCommPage] = useState(0)
  const commPerPage = 10
  const [invData, setInvData] = useState(null)
  const [invYears, setInvYears] = useState([])
  const [invYear, setInvYear] = useState(String(new Date().getFullYear()))
  const [invLoading, setInvLoading] = useState(false)
  const [invFilter, setInvFilter] = useState({ invoiceNo: '', poNo: '', dateFrom: '', dateTo: '', qty: '', amtFrom: '', amtTo: '' })
  const [invSort, setInvSort] = useState({ key: 'line', dir: 'asc' })
  const [invPage, setInvPage] = useState(0)
  const invPerPage = 10

  function openNotesEditor() {
    setNotesHtml(cust.notes || '')
    setEditingNotes(true)
  }

  async function saveNotes() {
    setNotesSaving(true)
    try {
      await api.updateCustomer(id, { notes: notesHtml })
      const fresh = await api.getCustomer(id)
      setCust(fresh)
      setEditingNotes(false)
      toast.success('Notes updated successfully')
    } catch (err) {
      toast.error('Failed to update notes: ' + err.message)
    }
    setNotesSaving(false)
  }

  function openEditContact(ct) {
    setContactForm({
      _id: ct._id,
      label: ct.label || '',
      title: ct.title || '',
      person: ct.person || '',
      position: ct.position || '',
      main_phone: ct.main_phone || '',
      main_ext: ct.main_ext || '',
      desk_phone: ct.desk_phone || '',
      desk_ext: ct.desk_ext || '',
      mobile_phone: ct.mobile_phone || '',
      email: ct.email || '',
    })
    setShowEditContact(true)
  }

  async function handleSaveContact(e) {
    e.preventDefault()
    setContactSaving(true)
    try {
      await api.updateContact(id, contactForm._id, {
        label: contactForm.label.trim(),
        title: contactForm.title.trim(),
        person: contactForm.person.trim(),
        position: contactForm.position.trim(),
        main_phone: contactForm.main_phone.trim(),
        main_ext: contactForm.main_ext.trim(),
        desk_phone: contactForm.desk_phone.trim(),
        desk_ext: contactForm.desk_ext.trim(),
        mobile_phone: contactForm.mobile_phone.trim(),
        email: contactForm.email.trim(),
      })
      const fresh = await api.getCustomer(id)
      setCust(fresh)
      setShowEditContact(false)
      toast.success('Contact updated successfully')
    } catch (err) {
      toast.error('Failed to update contact: ' + err.message)
    }
    setContactSaving(false)
  }

  function openEditAddress(addr) {
    const names = (addr.name || '').split('|').map(n => n.trim()).filter(Boolean)
    const streets = (addr.street || '').split('|').map(s => s.trim()).filter(Boolean)
    setAddressForm({
      _id: addr._id,
      address_label: addr.label || '',
      address_tag: addr.address_type || '',
      names: names.length > 0 ? names : [''],
      streets: streets.length > 0 ? streets : [''],
      street_address2: addr.street2 || '',
      city: addr.city || '',
      state: addr.state || '',
      zip_code: addr.zip || '',
      country: addr.country || '',
      email: addr.email || '',
      phoneno: addr.phone || '',
      shipping_acnt: addr.shipping_acnt || '',
    })
    setShowEditAddress(true)
  }

  async function handleSaveAddress(e) {
    e.preventDefault()
    setAddressSaving(true)
    try {
      const joinedNames = (addressForm.names || []).map(n => n.trim()).filter(Boolean).join('|')
      const joinedStreets = (addressForm.streets || []).map(s => s.trim()).filter(Boolean).join('|')
      await api.updateAddress(id, addressForm._id, {
        address_label: addressForm.address_label.trim(),
        address_tag: addressForm.address_tag,
        name: joinedNames,
        street_address: joinedStreets,
        street_address2: addressForm.street_address2.trim(),
        city: addressForm.city.trim(),
        state: addressForm.state.trim(),
        zip_code: addressForm.zip_code.trim(),
        country: addressForm.country.trim(),
        email: addressForm.email.trim(),
        phoneno: addressForm.phoneno.trim(),
        shipping_acnt: addressForm.shipping_acnt.trim(),
      })
      const fresh = await api.getCustomer(id)
      setCust(fresh)
      setShowEditAddress(false)
      toast.success('Address updated successfully')
    } catch (err) {
      toast.error('Failed to update address: ' + err.message)
    }
    setAddressSaving(false)
  }

  async function handleDelete() {
    if (!deleteConfirm) return
    const { type, id: itemId } = deleteConfirm
    try {
      if (type === 'contact') await api.deleteContact(id, itemId)
      else if (type === 'address') await api.deleteAddress(id, itemId)
      else if (type === 'email') await api.deleteEmail(id, itemId)
      const fresh = await api.getCustomer(id)
      setCust(fresh)
      setDeleteConfirm(null)
      toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} deleted successfully`)
    } catch (err) {
      toast.error('Failed to delete: ' + err.message)
      setDeleteConfirm(null)
    }
  }

  function openAddContact() {
    setAddContactForm({ label: '', title: '', person: '', position: '', main_phone: '', main_ext: '', desk_phone: '', desk_ext: '', mobile_phone: '', email: '' })
    setShowAddContact(true)
  }

  async function handleAddContact(e) {
    e.preventDefault()
    setAddContactSaving(true)
    try {
      await api.createContact(id, addContactForm)
      const fresh = await api.getCustomer(id)
      setCust(fresh)
      setShowAddContact(false)
      toast.success('Contact added successfully')
    } catch (err) {
      toast.error('Failed to add contact: ' + err.message)
    }
    setAddContactSaving(false)
  }

  function openAddAddress() {
    setAddAddressForm({ address_label: '', address_tag: '', names: [''], streets: [''], city: '', state: '', zip_code: '', country: '', email: '', phoneno: '', shipping_acnt: '' })
    setShowAddAddress(true)
  }

  async function handleAddAddress(e) {
    e.preventDefault()
    setAddAddressSaving(true)
    try {
      const joinedNames = (addAddressForm.names || []).map(n => n.trim()).filter(Boolean).join('|')
      const joinedStreets = (addAddressForm.streets || []).map(s => s.trim()).filter(Boolean).join('|')
      await api.createAddress(id, {
        address_label: addAddressForm.address_label.trim(),
        address_tag: addAddressForm.address_tag,
        name: joinedNames,
        street_address: joinedStreets,
        city: addAddressForm.city.trim(),
        state: addAddressForm.state.trim(),
        zip_code: addAddressForm.zip_code.trim(),
        country: addAddressForm.country.trim(),
        email: addAddressForm.email.trim(),
        phoneno: addAddressForm.phoneno.trim(),
        shipping_acnt: addAddressForm.shipping_acnt.trim(),
      })
      const fresh = await api.getCustomer(id)
      setCust(fresh)
      setShowAddAddress(false)
      toast.success('Address added successfully')
    } catch (err) {
      toast.error('Failed to add address: ' + err.message)
    }
    setAddAddressSaving(false)
  }

  function openAddEmails() {
    setAddEmailRows([{ name: '', email: '' }])
    setShowAddEmails(true)
  }

  async function handleAddEmails(e) {
    e.preventDefault()
    const valid = addEmailRows.filter(r => r.email.trim())
    if (valid.length === 0) { toast.error('At least one email is required'); return }
    setAddEmailSaving(true)
    try {
      await api.createEmails(id, valid)
      const fresh = await api.getCustomer(id)
      setCust(fresh)
      setShowAddEmails(false)
      toast.success(`${valid.length} email(s) added successfully`)
    } catch (err) {
      toast.error('Failed to add emails: ' + err.message)
    }
    setAddEmailSaving(false)
  }

  async function saveInlineField(field, value) {
    setInlineSaving(true)
    try {
      await api.updateCustomer(id, { [field]: value })
      const fresh = await api.getCustomer(id)
      setCust(fresh)
      setInlineEdit(null)
      toast.success('Updated successfully')
    } catch (err) {
      toast.error('Failed to update: ' + err.message)
    }
    setInlineSaving(false)
  }

  useEffect(() => {
    api.getCustomer(id).then(data => {
      setCust(data)
      setLoading(false)
    }).catch(err => {
      toast.error('Failed to load: ' + err.message)
      setLoading(false)
    })
  }, [id])

  useEffect(() => {
    if (activeTab === 'history' && !historyData && !historyLoading) {
      setHistoryLoading(true)
      api.getCustomerHistory(id).then(data => {
        setHistoryData(data)
        setHistoryLoading(false)
      }).catch(err => {
        toast.error('Failed to load history: ' + err.message)
        setHistoryLoading(false)
      })
    }
  }, [activeTab, id])

  useEffect(() => {
    if (activeTab === 'commissions' && !commData && !commLoading) {
      setCommLoading(true)
      api.getCustomerCommissions(id).then(data => {
        setCommData(data)
        setCommLoading(false)
      }).catch(err => {
        toast.error('Failed to load commissions: ' + err.message)
        setCommLoading(false)
      })
    }
  }, [activeTab, id])

  // Fetch invoices on tab switch or year change
  useEffect(() => {
    if (activeTab === 'invoices') {
      setInvLoading(true)
      api.getCustomerInvoices(id, invYear).then(data => {
        setInvData(data.rows || [])
        if (data.years && data.years.length > 0 && invYears.length === 0) setInvYears(data.years)
        setInvLoading(false)
      }).catch(err => {
        toast.error('Failed to load invoices: ' + err.message)
        setInvLoading(false)
      })
    }
  }, [activeTab, id, invYear])

  function openEditInfo() {
    const code = cust.customer_code || ''
    const dashIdx = code.indexOf('-')
    const names = (cust.company_name || '').split('|').map(n => n.trim()).filter(Boolean)
    setEditForm({
      cust_alph: dashIdx > -1 ? code.substring(0, dashIdx) : '',
      cust_number: dashIdx > -1 ? code.substring(dashIdx + 1) : code,
      company_names: names.length > 0 ? names : [''],
      customer_type: cust.customer_type || '',
      terms: cust.terms || '',
      status: cust.status || 'active',
    })
    setSelectedReps((cust.assignedReps || []).map(r => ({ _id: r._id, name: r.name, rep_number: r.rep_number })))
    // Fetch customer types + sales reps for dropdowns
    api.getCustomerTypes().then(d => setCustTypes(d || [])).catch(() => {})
    api.getSalesReps('active').then(d => setAllReps(d || [])).catch(() => {})
    setRepSearch('')
    setRepDropdownOpen(false)
    setShowEditInfo(true)
  }

  async function handleSaveInfo(e) {
    e.preventDefault()
    const joinedNames = (editForm.company_names || []).map(n => n.trim()).filter(Boolean).join('| ')
    if (!joinedNames) { toast.error('Customer Name is required'); return }
    if (!editForm.cust_number.trim()) { toast.error('Customer Number is required'); return }
    setEditSaving(true)
    try {
      const customerCode = editForm.cust_alph.trim()
        ? editForm.cust_alph.trim() + '-' + editForm.cust_number.trim()
        : editForm.cust_number.trim()
      await api.updateCustomer(id, {
        company_name: joinedNames,
        customer_code: customerCode,
        customer_type: editForm.customer_type,
        terms: editForm.terms.trim(),
        status: editForm.status,
      })
      // Update assigned sales reps
      await api.updateCustomerReps(id, selectedReps.map(r => r._id))
      const fresh = await api.getCustomer(id)
      setCust(fresh)
      setShowEditInfo(false)
      toast.success('Customer updated successfully')
    } catch (err) {
      toast.error('Failed to update: ' + err.message)
    }
    setEditSaving(false)
  }

  if (loading) return <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>
  if (!cust) return <div className="text-center py-5 text-muted">Customer not found</div>

  const contacts = cust.contacts || []
  const addresses = cust.addresses || []
  const emails = cust.emails || []
  const assignedReps = cust.assignedReps || []
  const color = hashColor(cust.company_name || '')

  const tabs = [
    { key: 'invoices', label: 'Invoices', icon: 'bi-receipt', badge: '0' },
    { key: 'commissions', label: 'Commissions', icon: 'bi-percent' },
    { key: 'details', label: 'Details', icon: 'bi-info-circle' },
    { key: 'history', label: 'History', icon: 'bi-clock-history' },
  ]

  function formatDate(d) {
    if (!d) return '—'
    return new Date(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  }

  return (
    <div style={{ overflow: 'hidden' }}>
      {/* Breadcrumb */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <nav aria-label="breadcrumb">
          <ol className="breadcrumb mb-0">
            <li className="breadcrumb-item"><Link to="/dashboard"><i className="bi bi-house-door me-1"></i>Dashboard</Link></li>
            <li className="breadcrumb-item"><Link to="/customers/active">Customers</Link></li>
            <li className="breadcrumb-item active">{cust.company_name}</li>
          </ol>
        </nav>
        <div className="d-flex gap-2">
          <button className="btn btn-sm btn-outline-danger rounded-pill" onClick={async () => {
            try {
              const result = await api.sendOverdueEmail(id)
              toast.success(result.message || 'Overdue email sent')
            } catch (err) { toast.error(err.message) }
          }}><i className="bi bi-envelope-exclamation me-1"></i>Send Overdue Email</button>
          <button className="btn btn-sm btn-outline-primary rounded-pill" onClick={() => window.print()}><i className="bi bi-printer me-1"></i>Print</button>
          <Link to="/customers/active" className="btn btn-sm btn-outline-secondary rounded-pill"><i className="bi bi-arrow-left me-1"></i>Back to List</Link>
        </div>
      </div>

      {/* Customer Header Bar */}
      <div className="card border-0 shadow-sm mb-3" style={{ borderRadius: 16, overflow: 'hidden', position: 'relative' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg, #2563eb, #7c3aed, #2563eb)' }}></div>
        <div className="card-body d-flex align-items-center gap-3 flex-wrap py-3 px-4">
          <div className="d-flex align-items-center justify-content-center fw-bold text-white" style={{ width: 64, height: 64, borderRadius: 16, background: `linear-gradient(135deg, ${color}, #7c3aed)`, fontSize: '1.4rem', boxShadow: '0 4px 12px rgba(37,99,235,.25)', flexShrink: 0 }}>
            {getInitials(cust.company_name)}
          </div>
          <div className="flex-grow-1">
            <div style={{ fontSize: '1.25rem', fontWeight: 800 }}>{cust.company_name}</div>
            <div className="text-muted" style={{ fontSize: '.82rem', fontWeight: 600 }}>Cust #: {cust.customer_code || '—'} &nbsp;|&nbsp; Type: {cust.customer_type || '—'}</div>
            <div className="d-flex gap-3 mt-1 flex-wrap">
              {cust.phone && <span className="d-flex align-items-center gap-1 text-muted" style={{ fontSize: '.78rem', fontWeight: 500 }}><i className="bi bi-telephone text-primary" style={{ fontSize: '.85rem' }}></i>{cust.phone}</span>}
              {cust.website && <span className="d-flex align-items-center gap-1 text-muted" style={{ fontSize: '.78rem', fontWeight: 500 }}><i className="bi bi-globe text-primary" style={{ fontSize: '.85rem' }}></i>{cust.website}</span>}
              {cust.created_at && <span className="d-flex align-items-center gap-1 text-muted" style={{ fontSize: '.78rem', fontWeight: 500 }}><i className="bi bi-calendar-check text-primary" style={{ fontSize: '.85rem' }}></i>Since {new Date(cust.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>}
              {assignedReps.length > 0 && <span className="d-flex align-items-center gap-1 text-muted" style={{ fontSize: '.78rem', fontWeight: 500 }}><i className="bi bi-people text-primary" style={{ fontSize: '.85rem' }}></i>{assignedReps.length} Reps Assigned</span>}
            </div>
          </div>
          <div className="d-flex align-items-center gap-2">
            {['pilot', 'active', 'inactive'].map(s => (
              <label key={s} className="d-flex align-items-center gap-1 px-3 py-1 border rounded-pill" style={{ fontSize: '.8rem', fontWeight: 600, cursor: 'pointer', background: cust.status === s ? '#eff6ff' : '#fff', borderColor: cust.status === s ? '#2563eb' : '#e2e8f0' }}>
                <input type="radio" name="custStatus" value={s} checked={cust.status === s} readOnly style={{ accentColor: '#2563eb', width: 14, height: 14 }} />
                <span style={{ color: cust.status === s ? '#2563eb' : undefined }}>{s.charAt(0).toUpperCase() + s.slice(1)}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="row g-3 mb-3">
        {[
          { value: '0', label: 'Total Invoices', icon: 'bi-receipt', bg: '#eff6ff', color: '#2563eb' },
          { value: '$0.00', label: 'Total Revenue', icon: 'bi-cash-stack', bg: '#ecfdf5', color: '#10b981' },
          { value: '$0.00', label: 'Outstanding', icon: 'bi-exclamation-triangle', bg: '#fef2f2', color: '#ef4444' },
          { value: '$0.00', label: 'Commissions Due', icon: 'bi-percent', bg: '#fffbeb', color: '#d97706' },
          { value: '$0.00', label: 'Total Payments', icon: 'bi-credit-card', bg: '#f5f3ff', color: '#7c3aed' },
        ].map((stat, i) => (
          <div className="col" key={i}>
            <div className="stat-card">
              <div className="d-flex align-items-center gap-3">
                <div className="stat-icon" style={{ background: stat.bg, color: stat.color }}><i className={`bi ${stat.icon}`}></i></div>
                <div>
                  <div className="stat-value" style={{ color: stat.color }}>{stat.value}</div>
                  <div className="stat-label">{stat.label}</div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Tab Navigation */}
      <div className="d-flex gap-2 mb-3 flex-wrap">
        {tabs.map(tab => {
          const isActive = activeTab === tab.key
          return (
            <button
              key={tab.key}
              className="btn btn-sm px-3 py-2 d-flex align-items-center gap-2"
              style={{
                borderRadius: 10,
                border: isActive ? 'none' : '1px solid #e2e8f0',
                background: isActive ? 'linear-gradient(135deg, #2563eb, #1e40af)' : '#fff',
                color: isActive ? '#fff' : '#64748b',
                fontWeight: 600,
                fontSize: '0.85rem',
                boxShadow: isActive ? '0 2px 8px rgba(37,99,235,0.3)' : '0 1px 3px rgba(0,0,0,0.04)',
                transition: 'all 0.2s',
              }}
              onClick={() => setActiveTab(tab.key)}
            >
              <i className={`bi ${tab.icon}`}></i>
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Tab Content */}
      <div className="card border-0 shadow-sm" style={{ borderRadius: 14, overflow: 'hidden' }}>
        <div className="card-body p-4">

          {/* ===== DETAILS TAB ===== */}
          {activeTab === 'details' && (() => {
            const nn = v => v && v !== 'Null' ? v : ''
            const activeEmails = emails.filter(e => e.status === 'active')
            const orderLabel = d => d === 0 ? 'Primary' : d === 1 ? 'Backup' : 'Other'
            const boxStyle = { borderRadius: 14, background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid #e8ecf1', overflow: 'hidden', height: '100%' }
            const headStyle = (accent) => ({ background: accent, padding: '11px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 })
            const headTitle = (icon, text) => (
              <span className="d-flex align-items-center gap-2 text-white fw-bold" style={{ fontSize: '.88rem', letterSpacing: '.01em' }}>
                <span className="d-flex align-items-center justify-content-center" style={{ width: 26, height: 26, borderRadius: 7, background: 'rgba(255,255,255,0.2)' }}><i className={`bi ${icon}`} style={{ fontSize: '.82rem' }}></i></span>
                {text}
              </span>
            )
            const editBtn = (label) => (
              <button className="btn btn-sm px-2 py-0" style={{ fontSize: '.72rem', fontWeight: 600, color: '#fff', background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.35)', borderRadius: 6 }}><i className="bi bi-pencil-square me-1" style={{ fontSize: '.68rem' }}></i>{label || 'Edit'}</button>
            )
            const delBtn = () => (
              <button className="btn btn-sm px-2 py-0" style={{ fontSize: '.72rem', fontWeight: 600, color: '#fff', background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 6 }}><i className="bi bi-trash3 me-1" style={{ fontSize: '.68rem' }}></i>Delete</button>
            )
            const fieldRow = (icon, label, value, isLast) => (
              <div className="d-flex align-items-start gap-2" style={{ padding: '9px 16px', borderBottom: isLast ? 'none' : '1px solid #f3f4f6' }}>
                <i className={`bi ${icon} mt-1`} style={{ fontSize: '.78rem', color: '#94a3b8', width: 16, flexShrink: 0 }}></i>
                <div className="text-muted" style={{ fontSize: '.8rem', fontWeight: 600, width: 115, flexShrink: 0 }}>{label}</div>
                <div className="flex-grow-1" style={{ fontSize: '.84rem', color: '#1e293b' }}>{value}</div>
              </div>
            )
            const tagBadge = (text, bg) => (
              <span className="d-inline-block text-white fw-bold px-2" style={{ background: bg, borderRadius: 20, fontSize: '.72rem', lineHeight: '22px' }}>{text}</span>
            )
            const accentBlue = 'linear-gradient(135deg, #3b82f6, #2563eb)'
            const accentGreen = 'linear-gradient(135deg, #22c55e, #16a34a)'
            const accentTeal = 'linear-gradient(135deg, #14b8a6, #0d9488)'
            const accentIndigo = 'linear-gradient(135deg, #6366f1, #4f46e5)'
            return (<>
            <div>
              {/* Action Bar */}
              <div className="d-flex gap-2 flex-wrap mb-4">
                {[
                  { icon: 'bi-person-plus-fill', label: 'Add New Contact', bg: '#22c55e', onClick: openAddContact },
                  { icon: 'bi-envelope-plus-fill', label: 'Add Emails', bg: '#22c55e', onClick: openAddEmails },
                  { icon: 'bi-receipt', label: 'Add New Invoice', bg: '#3b82f6', onClick: () => {} },
                  { icon: 'bi-geo-alt-fill', label: 'Add New Address', bg: '#22c55e', onClick: openAddAddress },
                ].map((b, i) => (
                  <button key={i} className="btn text-white d-flex align-items-center gap-2" style={{ background: b.bg, borderRadius: 10, fontWeight: 600, fontSize: '.82rem', padding: '8px 18px', border: 'none', boxShadow: `0 2px 8px ${b.bg}33` }} onClick={b.onClick}>
                    <i className={`bi ${b.icon}`}></i>{b.label}
                  </button>
                ))}
              </div>

              <div className="row g-3">
                {/* ── Customer Info ── */}
                <div className="col-md-6">
                  <div style={boxStyle}>
                    <div style={headStyle(accentBlue)}>
                      {headTitle('bi-info-circle-fill', 'Customer Info')}
                      <button className="btn btn-sm px-2 py-0" style={{ fontSize: '.72rem', fontWeight: 600, color: '#fff', background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.35)', borderRadius: 6 }} onClick={openEditInfo}><i className="bi bi-pencil-square me-1" style={{ fontSize: '.68rem' }}></i>Edit</button>
                    </div>
                    <div>
                      {[
                        { i: 'bi-hash', l: 'Cust #:', v: <span className="badge px-2 py-1" style={{ background: '#eff6ff', color: '#2563eb', fontWeight: 700, fontSize: '.82rem' }}>{cust.customer_code || '—'}</span> },
                        { i: 'bi-building', l: 'Name:', v: <span className="fw-semibold" style={{ color: '#2563eb' }}>{cust.company_name}</span> },
                        { i: 'bi-tag', l: 'Type:', v: cust.customer_type ? <span style={{ textTransform: 'capitalize' }}>{cust.customer_type}</span> : '—' },
                        { i: 'bi-people-fill', l: 'Assigned REPS:', v: assignedReps.length > 0 ? (
                          <div className="d-flex flex-wrap gap-1">{assignedReps.map((r, ri) => tagBadge(r.name, ['#22c55e','#7c3aed','#3b82f6','#ef4444','#d97706'][ri % 5]))}</div>
                        ) : <span className="text-muted fst-italic">—</span> },
                        { i: 'bi-at', l: 'Assigned Emails:', v: activeEmails.length > 0 ? (
                          <div className="d-flex flex-wrap gap-1">{activeEmails.map((e, ei) => tagBadge(e.email, '#22c55e'))}</div>
                        ) : <span className="text-muted fst-italic">—</span> },
                      ].map((r, idx, arr) => fieldRow(r.i, r.l, r.v, idx === arr.length - 1))}
                      {/* Inline-editable fields: Terms, FOB, Ship Info, Ship Via, Project */}
                      {[
                        { i: 'bi-credit-card', l: 'Terms:', field: 'terms', val: cust.terms },
                        { i: 'bi-box-seam', l: 'FOB:', field: 'fob', val: cust.fob },
                        { i: 'bi-truck', l: 'Ship Info:', field: 'ship', val: cust.ship },
                        { i: 'bi-signpost-2', l: 'Ship Via:', field: 'ship_via', val: cust.ship_via },
                        { i: 'bi-folder2-open', l: 'Project:', field: 'project', val: cust.project },
                      ].map((r, idx, arr) => (
                        <div key={r.field} className="d-flex align-items-start gap-2" style={{ padding: '9px 16px', borderBottom: idx === arr.length - 1 ? 'none' : '1px solid #f3f4f6' }}>
                          <i className={`bi ${r.i} mt-1`} style={{ fontSize: '.78rem', color: '#94a3b8', width: 16, flexShrink: 0 }}></i>
                          <div className="text-muted" style={{ fontSize: '.8rem', fontWeight: 600, width: 115, flexShrink: 0 }}>{r.l}</div>
                          <div className="flex-grow-1">
                            {inlineEdit && inlineEdit.field === r.field ? (
                              <div className="d-flex align-items-center gap-1">
                                <input
                                  type="text"
                                  className="form-control form-control-sm"
                                  style={{ fontSize: '.84rem', padding: '2px 8px', maxWidth: 220 }}
                                  value={inlineEdit.value}
                                  onChange={e => setInlineEdit({ ...inlineEdit, value: e.target.value })}
                                  onKeyDown={e => {
                                    if (e.key === 'Enter') { e.preventDefault(); saveInlineField(r.field, inlineEdit.value) }
                                    if (e.key === 'Escape') setInlineEdit(null)
                                  }}
                                  autoFocus
                                  disabled={inlineSaving}
                                />
                                <button className="btn btn-sm btn-success p-0 d-flex align-items-center justify-content-center" style={{ width: 26, height: 26, borderRadius: 6, flexShrink: 0 }} onClick={() => saveInlineField(r.field, inlineEdit.value)} disabled={inlineSaving}>
                                  <i className="bi bi-check-lg" style={{ fontSize: '.78rem' }}></i>
                                </button>
                                <button className="btn btn-sm btn-outline-secondary p-0 d-flex align-items-center justify-content-center" style={{ width: 26, height: 26, borderRadius: 6, flexShrink: 0 }} onClick={() => setInlineEdit(null)} disabled={inlineSaving}>
                                  <i className="bi bi-x-lg" style={{ fontSize: '.72rem' }}></i>
                                </button>
                              </div>
                            ) : (
                              <span
                                style={{ fontSize: '.84rem', color: r.val ? (r.field === 'project' ? '#7c3aed' : '#1e293b') : '#94a3b8', cursor: 'pointer', borderBottom: '1px dashed #cbd5e1', fontWeight: r.field === 'project' && r.val ? 600 : 400, fontStyle: r.val ? 'normal' : 'italic' }}
                                title="Click to edit"
                                onClick={() => setInlineEdit({ field: r.field, value: r.val || '' })}
                              >
                                {r.val || '— click to edit'}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* ── Customer Notes ── */}
                <div className="col-md-6">
                  <div style={{ ...boxStyle, display: 'flex', flexDirection: 'column' }}>
                    <div style={headStyle(accentBlue)}>
                      {headTitle('bi-journal-richtext', 'Customer Notes')}
                      {!editingNotes ? (
                        <button className="btn btn-sm px-2 py-0" style={{ fontSize: '.72rem', fontWeight: 600, color: '#fff', background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.35)', borderRadius: 6 }} onClick={openNotesEditor}>
                          <i className="bi bi-pencil-square me-1" style={{ fontSize: '.68rem' }}></i>{cust.notes ? 'Edit' : 'Add'}
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
                        <CKEditor
                          editor={ClassicEditor}
                          data={notesHtml}
                          config={{
                            toolbar: ['heading', '|', 'bold', 'italic', 'underline', 'strikethrough', '|', 'bulletedList', 'numberedList', '|', 'outdent', 'indent', '|', 'blockQuote', 'insertTable', 'link', '|', 'undo', 'redo'],
                          }}
                          onChange={(event, editor) => {
                            setNotesHtml(editor.getData())
                          }}
                        />
                      </div>
                    ) : (
                      <div className="flex-grow-1 p-3" style={{ overflowY: 'auto', maxHeight: 400 }}>
                        {cust.notes ? (
                          <div style={{ fontSize: '.84rem', lineHeight: 1.7, color: '#334155' }} dangerouslySetInnerHTML={{ __html: cust.notes.replace(/\\n/g, '') }} />
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
                  const contactName = [nn(ct.title), nn(ct.person)].filter(Boolean).join('. ') || nn(ct.name) || '—'
                  return (
                    <div className="col-md-6" key={'ct' + ci}>
                      <div style={boxStyle}>
                        <div style={headStyle(accentGreen)}>
                          {headTitle('bi-person-badge-fill', (nn(ct.label) || 'Contact') + ' (' + orderLabel(ct.display_order) + ')')}
                          <div className="d-flex gap-1">
                            <button className="btn btn-sm px-2 py-0" style={{ fontSize: '.72rem', fontWeight: 600, color: '#fff', background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.35)', borderRadius: 6 }} onClick={() => openEditContact(ct)}><i className="bi bi-pencil-square me-1" style={{ fontSize: '.68rem' }}></i>Edit</button>
                            {contacts.length > 1 && <button className="btn btn-sm px-2 py-0" style={{ fontSize: '.72rem', fontWeight: 600, color: '#fff', background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 6 }} onClick={() => setDeleteConfirm({ type: 'contact', id: ct._id, name: nn(ct.person) || 'this contact' })}><i className="bi bi-trash3 me-1" style={{ fontSize: '.68rem' }}></i>Delete</button>}
                          </div>
                        </div>
                        {/* Contact avatar + name header */}
                        <div className="d-flex align-items-center gap-3 px-3 pt-3 pb-2" style={{ borderBottom: '1px solid #f3f4f6' }}>
                          <div style={{ width: 44, height: 44, borderRadius: '50%', background: accentGreen, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <i className="bi bi-person-fill text-white" style={{ fontSize: '1.1rem' }}></i>
                          </div>
                          <div>
                            <div className="fw-bold" style={{ fontSize: '.92rem', color: '#1e293b' }}>{contactName}</div>
                            {nn(ct.position) && <div className="text-muted" style={{ fontSize: '.78rem' }}>{ct.position}</div>}
                          </div>
                        </div>
                        <div className="p-2">
                          {[
                            { i: 'bi-telephone-fill', l: 'Main Phone:', v: nn(ct.main_phone) ? ct.main_phone + (nn(ct.main_ext) && ct.main_ext !== '-' ? ', ext ' + ct.main_ext : '') : '—', color: '#16a34a' },
                            { i: 'bi-telephone', l: 'Desk Phone:', v: nn(ct.desk_phone) ? ct.desk_phone + (nn(ct.desk_ext) && ct.desk_ext !== '-' ? ', ext ' + ct.desk_ext : '') : '—', color: '#64748b' },
                            { i: 'bi-phone-fill', l: 'Mobile Phone:', v: nn(ct.mobile_phone) || '—', color: '#8b5cf6' },
                            { i: 'bi-envelope-fill', l: 'Email:', v: nn(ct.email) ? <a href={'mailto:' + ct.email} className="text-decoration-none" style={{ color: '#2563eb' }}>{ct.email}</a> : '—', color: '#2563eb' },
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
                        <div style={{ width: 48, height: 48, borderRadius: 12, background: '#f0fdf4', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                          <i className="bi bi-person-x" style={{ fontSize: '1.3rem', color: '#94a3b8' }}></i>
                        </div>
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
                        {headTitle('bi-geo-alt-fill', addr.label || addr.address_type || 'Address')}
                        <div className="d-flex gap-1">
                          <button className="btn btn-sm px-2 py-0" style={{ fontSize: '.72rem', fontWeight: 600, color: '#fff', background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.35)', borderRadius: 6 }} onClick={() => openEditAddress(addr)}><i className="bi bi-pencil-square me-1" style={{ fontSize: '.68rem' }}></i>Edit</button>
                          {addresses.length > 1 && <button className="btn btn-sm px-2 py-0" style={{ fontSize: '.72rem', fontWeight: 600, color: '#fff', background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 6 }} onClick={() => setDeleteConfirm({ type: 'address', id: addr._id, name: addr.label || 'this address' })}><i className="bi bi-trash3 me-1" style={{ fontSize: '.68rem' }}></i>Delete</button>}
                        </div>
                      </div>
                      {/* Address mini-map icon + formatted block */}
                      <div className="d-flex gap-3 p-3" style={{ borderBottom: '1px solid #f3f4f6' }}>
                        <div style={{ width: 44, height: 44, borderRadius: 10, background: '#ccfbf1', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <i className="bi bi-pin-map-fill" style={{ color: '#0d9488', fontSize: '1.1rem' }}></i>
                        </div>
                        <div style={{ fontSize: '.84rem', lineHeight: 1.6, color: '#334155' }}>
                          {nn(addr.name) && <div className="fw-semibold">{addr.name}</div>}
                          <div>{nn(addr.street) || '—'}</div>
                          {nn(addr.street2) && <div>{addr.street2}</div>}
                          <div>{[nn(addr.city), nn(addr.state), nn(addr.zip)].filter(Boolean).join(', ')}</div>
                          {nn(addr.country) && <div className="text-muted">{addr.country}</div>}
                        </div>
                      </div>
                      <div className="p-2">
                        {[
                          ...(nn(addr.email) ? [{ i: 'bi-envelope', l: 'Email:', v: <a href={'mailto:' + addr.email} className="text-decoration-none" style={{ color: '#2563eb' }}>{addr.email}</a>, c: '#2563eb' }] : []),
                          ...(nn(addr.phone) ? [{ i: 'bi-telephone', l: 'Phone:', v: addr.phone, c: '#16a34a' }] : []),
                          ...(nn(addr.shipping_acnt) ? [{ i: 'bi-truck', l: 'Shipping Acnt:', v: addr.shipping_acnt, c: '#e67e22' }] : []),
                        ].map((r, ri, arr) => (
                          <div key={ri} className="d-flex align-items-center gap-2" style={{ padding: '6px 14px', borderBottom: ri === arr.length - 1 ? 'none' : '1px solid #f3f4f6' }}>
                            <i className={`bi ${r.i}`} style={{ fontSize: '.76rem', color: r.c, width: 16, flexShrink: 0 }}></i>
                            <div className="text-muted" style={{ fontSize: '.78rem', fontWeight: 600, width: 105, flexShrink: 0 }}>{r.l}</div>
                            <div style={{ fontSize: '.84rem', color: '#1e293b' }}>{r.v}</div>
                          </div>
                        ))}
                        {!nn(addr.email) && !nn(addr.phone) && !nn(addr.shipping_acnt) && (
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
                        <div style={{ width: 48, height: 48, borderRadius: 12, background: '#f0fdfa', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                          <i className="bi bi-geo-alt" style={{ fontSize: '1.3rem', color: '#94a3b8' }}></i>
                        </div>
                        <div className="text-muted" style={{ fontSize: '.84rem' }}>No addresses on file</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Emails ── */}
                <div className="col-md-6">
                  <div style={boxStyle}>
                    <div style={headStyle(accentIndigo)}>
                      {headTitle('bi-envelope-at-fill', 'Email Addresses')}
                    </div>
                    {emails.length === 0 ? (
                      <div className="text-center py-4">
                        <div style={{ width: 48, height: 48, borderRadius: 12, background: '#eef2ff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                          <i className="bi bi-envelope-x" style={{ fontSize: '1.3rem', color: '#94a3b8' }}></i>
                        </div>
                        <div className="text-muted" style={{ fontSize: '.84rem' }}>No email addresses on file</div>
                      </div>
                    ) : (
                      <div>
                        {emails.map((e, i) => (
                          <div key={i} className="d-flex align-items-center gap-2 px-3" style={{ padding: '10px 0', borderBottom: i < emails.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                            <div style={{ width: 32, height: 32, borderRadius: 8, background: e.status === 'active' ? '#f0fdf4' : '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <i className="bi bi-envelope-fill" style={{ fontSize: '.78rem', color: e.status === 'active' ? '#16a34a' : '#ef4444' }}></i>
                            </div>
                            <div className="flex-grow-1" style={{ minWidth: 0 }}>
                              <div className="text-truncate fw-medium" style={{ fontSize: '.84rem' }}>{e.email || '—'}</div>
                              {e.name && <div className="text-muted text-truncate" style={{ fontSize: '.74rem' }}>{e.name}</div>}
                            </div>
                            <span className={`badge rounded-pill ${e.status === 'active' ? 'text-success' : 'text-danger'}`} style={{ background: e.status === 'active' ? '#dcfce7' : '#fee2e2', fontSize: '.7rem', fontWeight: 600 }}>{e.status}</span>
                            <button className="btn btn-sm p-0" title="Delete" style={{ color: '#ef4444', fontSize: '.82rem', border: 'none', background: 'none' }} onClick={() => setDeleteConfirm({ type: 'email', id: e._id, name: e.email || 'this email' })}><i className="bi bi-trash3"></i></button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Customer Terms */}
            <div className="card border-0 shadow-sm rounded-4 mt-3">
              <div className="card-body p-4">
                <h6 className="fw-bold mb-3"><i className="bi bi-file-text me-2 text-primary"></i>Customer Terms</h6>
                <div className="row g-3">
                  <div className="col-md-4">
                    <label className="form-label small fw-semibold">Terms</label>
                    <input type="text" className="form-control form-control-sm" defaultValue={cust.cust_terms || ''} id="cust_terms" />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label small fw-semibold">F.O.B.</label>
                    <input type="text" className="form-control form-control-sm" defaultValue={cust.customer_FOB || ''} id="customer_FOB" />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label small fw-semibold">Ship</label>
                    <input type="text" className="form-control form-control-sm" defaultValue={cust.cust_ship || ''} id="cust_ship" />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label small fw-semibold">Ship Via</label>
                    <input type="text" className="form-control form-control-sm" defaultValue={cust.cust_ship_via || ''} id="cust_ship_via" />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label small fw-semibold">Project</label>
                    <input type="text" className="form-control form-control-sm" defaultValue={cust.cust_project || ''} id="cust_project" />
                  </div>
                  <div className="col-md-4 d-flex align-items-end">
                    <button className="btn btn-sm btn-success" onClick={async () => {
                      try {
                        await api.saveCustomerTerms(id, {
                          cust_terms: document.getElementById('cust_terms').value,
                          customer_FOB: document.getElementById('customer_FOB').value,
                          cust_ship: document.getElementById('cust_ship').value,
                          cust_ship_via: document.getElementById('cust_ship_via').value,
                          cust_project: document.getElementById('cust_project').value,
                        })
                        toast.success('Terms saved')
                      } catch (err) { toast.error(err.message) }
                    }}><i className="bi bi-check-lg me-1"></i>Save Terms</button>
                  </div>
                </div>
              </div>
            </div>

            {/* Additional Info */}
            <div className="card border-0 shadow-sm rounded-4 mt-3">
              <div className="card-body p-4">
                <h6 className="fw-bold mb-3"><i className="bi bi-info-circle me-2 text-primary"></i>Additional Info</h6>
                <textarea className="form-control" rows="3" defaultValue={cust.additional_info || ''} id="additional_info" placeholder="Enter additional customer information..."></textarea>
                <button className="btn btn-sm btn-success mt-2" onClick={async () => {
                  try {
                    await api.saveCustomerAdditionalInfo(id, document.getElementById('additional_info').value)
                    toast.success('Additional info saved')
                  } catch (err) { toast.error(err.message) }
                }}><i className="bi bi-check-lg me-1"></i>Save Info</button>
              </div>
            </div>
            </>)
          })()}

          {/* ===== INVOICES TAB ===== */}
          {activeTab === 'invoices' && (() => {
            const fi = invFilter
            const is = invSort
            // Filter
            const filtered = (invData || []).filter(row => {
              if (fi.invoiceNo && !(row.invoice_number || '').toLowerCase().includes(fi.invoiceNo.toLowerCase())) return false
              if (fi.poNo && !(row.po_number || '').toLowerCase().includes(fi.poNo.toLowerCase())) return false
              if (fi.dateFrom) { const d = row.invoice_date ? new Date(row.invoice_date) : null; if (!d || d < new Date(fi.dateFrom)) return false }
              if (fi.dateTo) { const d = row.invoice_date ? new Date(row.invoice_date) : null; if (!d || d > new Date(fi.dateTo + 'T23:59:59')) return false }
              if (fi.qty && (row.total_qty || 0) < Number(fi.qty)) return false
              if (fi.amtFrom && (row.net_amount || 0) < Number(fi.amtFrom)) return false
              if (fi.amtTo && (row.net_amount || 0) > Number(fi.amtTo)) return false
              return true
            })
            // Sort
            const sorted = [...filtered].sort((a, b) => {
              let va = a[is.key], vb = b[is.key]
              if (is.key === 'invoice_date') { va = va ? new Date(va).getTime() : 0; vb = vb ? new Date(vb).getTime() : 0 }
              if (typeof va === 'string') { va = va.toLowerCase(); vb = (vb || '').toLowerCase() }
              if (va < vb) return is.dir === 'asc' ? -1 : 1
              if (va > vb) return is.dir === 'asc' ? 1 : -1
              return 0
            })
            // Pagination
            const totalPages = Math.ceil(sorted.length / invPerPage)
            const paged = sorted.slice(invPage * invPerPage, (invPage + 1) * invPerPage)
            const doSort = (key) => { setInvSort(prev => ({ key, dir: prev.key === key && prev.dir === 'asc' ? 'desc' : 'asc' })); setInvPage(0) }
            const sortIcon = (key) => is.key === key ? (is.dir === 'asc' ? 'bi-sort-up' : 'bi-sort-down') : 'bi-chevron-expand'
            const fStyle = { fontSize: 11, padding: '3px 6px', border: '1px solid #ced4da', borderRadius: 4, width: '100%', background: '#fff' }
            const thSort = { cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }
            const resetFilters = () => { setInvFilter({ invoiceNo: '', poNo: '', dateFrom: '', dateTo: '', qty: '', amtFrom: '', amtTo: '' }); setInvPage(0) }
            return (
            <div>
              {/* Header with year selector */}
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h6 className="fw-bold mb-0" style={{ color: '#2563eb', textTransform: 'uppercase', fontSize: 14, letterSpacing: '0.03em' }}>
                  <i className="bi bi-receipt me-2"></i>Invoices
                </h6>
                <div className="d-flex align-items-center gap-2">
                  <select className="form-select form-select-sm" style={{ width: 'auto', fontSize: 12, borderRadius: 6 }}
                    value={invYear} onChange={e => { setInvYear(e.target.value); setInvPage(0) }}>
                    <option value="all">All Years</option>
                    {invYears.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              </div>
              {invLoading ? (
                <div className="text-center py-5"><div className="spinner-border text-primary" role="status"></div><div className="mt-2 text-muted">Loading invoices...</div></div>
              ) : !invData || invData.length === 0 ? (
                <div className="text-center text-muted py-5"><i className="bi bi-receipt fs-1 d-block mb-2 opacity-25"></i>No invoices found{invYear && invYear !== 'all' ? ` for ${invYear}` : ''}</div>
              ) : (<>
                <div className="card border-0 shadow-sm" style={{ borderRadius: 12, overflow: 'hidden' }}>
                  <table className="table table-striped table-bordered table-hover table-sm align-middle mb-0" style={{ fontSize: 13 }}>
                    <thead style={{ backgroundColor: '#C7DEFE' }}>
                      {/* Column Headers */}
                      <tr>
                        <th style={thSort} onClick={() => doSort('invoice_number')}>
                          Invoice&nbsp;# <i className={`bi ${sortIcon('invoice_number')} ms-1`} style={{ fontSize: 10, opacity: 0.6 }}></i>
                        </th>
                        <th style={thSort} onClick={() => doSort('po_number')}>
                          PO# <i className={`bi ${sortIcon('po_number')} ms-1`} style={{ fontSize: 10, opacity: 0.6 }}></i>
                        </th>
                        <th style={thSort} onClick={() => doSort('invoice_date')}>
                          Invoice&nbsp;Date <i className={`bi ${sortIcon('invoice_date')} ms-1`} style={{ fontSize: 10, opacity: 0.6 }}></i>
                        </th>
                        <th className="text-end" style={thSort} onClick={() => doSort('total_qty')}>
                          Qty <i className={`bi ${sortIcon('total_qty')} ms-1`} style={{ fontSize: 10, opacity: 0.6 }}></i>
                        </th>
                        <th className="text-end" style={thSort} onClick={() => doSort('net_amount')}>
                          Totals <i className={`bi ${sortIcon('net_amount')} ms-1`} style={{ fontSize: 10, opacity: 0.6 }}></i>
                        </th>
                        <th>ComAction</th>
                        <th>InvAction</th>
                        <th>Status</th>
                      </tr>
                      {/* Filter Row */}
                      <tr style={{ backgroundColor: '#dde7fb' }}>
                        <td>
                          <input type="text" value={fi.invoiceNo} onChange={e => { setInvFilter(p => ({ ...p, invoiceNo: e.target.value })); setInvPage(0) }} style={fStyle} />
                        </td>
                        <td>
                          <input type="text" value={fi.poNo} onChange={e => { setInvFilter(p => ({ ...p, poNo: e.target.value })); setInvPage(0) }} style={fStyle} />
                        </td>
                        <td>
                          <input type="date" value={fi.dateFrom} onChange={e => { setInvFilter(p => ({ ...p, dateFrom: e.target.value })); setInvPage(0) }} style={{ ...fStyle, marginBottom: 3 }} placeholder="From" />
                          <input type="date" value={fi.dateTo} onChange={e => { setInvFilter(p => ({ ...p, dateTo: e.target.value })); setInvPage(0) }} style={fStyle} placeholder="To" />
                        </td>
                        <td>
                          <input type="number" value={fi.qty} onChange={e => { setInvFilter(p => ({ ...p, qty: e.target.value })); setInvPage(0) }} style={fStyle} />
                        </td>
                        <td>
                          <input type="number" placeholder="From" value={fi.amtFrom} onChange={e => { setInvFilter(p => ({ ...p, amtFrom: e.target.value })); setInvPage(0) }} style={{ ...fStyle, marginBottom: 3 }} />
                          <input type="number" placeholder="To" value={fi.amtTo} onChange={e => { setInvFilter(p => ({ ...p, amtTo: e.target.value })); setInvPage(0) }} style={fStyle} />
                        </td>
                        <td></td>
                        <td>
                          <button className="btn btn-sm btn-warning d-block w-100 mb-1" style={{ fontSize: 11, padding: '3px 6px' }} onClick={() => setInvPage(0)}>
                            <i className="bi bi-search me-1"></i>Search
                          </button>
                          <button className="btn btn-sm btn-danger d-block w-100" style={{ fontSize: 11, padding: '3px 6px' }} onClick={resetFilters}>
                            <i className="bi bi-x-lg me-1"></i>Reset
                          </button>
                        </td>
                        <td></td>
                      </tr>
                    </thead>
                    <tbody>
                      {paged.length === 0 ? (
                        <tr><td colSpan="8" className="text-center text-muted py-4"><i className="bi bi-inbox me-2"></i>No matching invoices</td></tr>
                      ) : paged.map((row, fi2) => (
                        <tr key={row.po_id}>
                          <td><span className="fw-semibold">{row.invoice_number}</span></td>
                          <td>{row.po_number}</td>
                          <td>{row.invoice_date ? new Date(row.invoice_date).toLocaleDateString('en-US') : ''}</td>
                          <td className="text-end">{row.total_qty}</td>
                          <td className="text-end fw-semibold">${Number(row.net_amount || 0).toFixed(2)}</td>
                          {/* ComAction */}
                          <td>
                            <div className="d-flex gap-1">
                              {row.comm_id ? (<>
                                <button className="btn btn-sm d-flex align-items-center justify-content-center"
                                  style={{ width: 28, height: 28, borderRadius: '50%', padding: 0, background: '#fee2e2', color: '#dc2626', border: 'none' }}
                                  title="Edit Commission" onClick={() => toast('Edit commission #' + row.comm_id + ' — coming soon')}>
                                  <i className="bi bi-pencil-fill" style={{ fontSize: 11 }}></i>
                                </button>
                                <button className="btn btn-sm d-flex align-items-center justify-content-center"
                                  style={{ width: 28, height: 28, borderRadius: '50%', padding: 0, background: '#e2e8f0', color: '#475569', border: 'none' }}
                                  title="View Commission" onClick={() => toast('View commission #' + row.comm_id + ' — coming soon')}>
                                  <i className="bi bi-eye-fill" style={{ fontSize: 11 }}></i>
                                </button>
                              </>) : (
                                <button className="btn btn-sm d-flex align-items-center justify-content-center"
                                  style={{ width: 28, height: 28, borderRadius: '50%', padding: 0, background: '#dcfce7', color: '#16a34a', border: 'none' }}
                                  title="Add Commission" onClick={() => toast('Add commission for PO #' + row.po_id + ' — coming soon')}>
                                  <i className="bi bi-plus-lg" style={{ fontSize: 11 }}></i>
                                </button>
                              )}
                            </div>
                          </td>
                          {/* InvAction */}
                          <td>
                            <div className="d-flex gap-1">
                              <button className="btn btn-sm d-flex align-items-center justify-content-center"
                                style={{ width: 28, height: 28, borderRadius: '50%', padding: 0, background: '#e2e8f0', color: '#475569', border: 'none' }}
                                title="Edit Invoice" onClick={() => toast('Edit invoice #' + row.po_id + ' — coming soon')}>
                                <i className="bi bi-pencil-fill" style={{ fontSize: 11 }}></i>
                              </button>
                              <button className="btn btn-sm d-flex align-items-center justify-content-center"
                                style={{ width: 28, height: 28, borderRadius: '50%', padding: 0, background: '#dbeafe', color: '#2563eb', border: 'none' }}
                                title="View Package Slip" onClick={() => toast('View package slip #' + row.po_id + ' — coming soon')}>
                                <i className="bi bi-file-earmark-text" style={{ fontSize: 11 }}></i>
                              </button>
                              <button className="btn btn-sm d-flex align-items-center justify-content-center"
                                style={{ width: 28, height: 28, borderRadius: '50%', padding: 0, background: '#dbeafe', color: '#2563eb', border: 'none' }}
                                title="View Invoice" onClick={() => toast('View invoice #' + row.po_id + ' — coming soon')}>
                                <i className="bi bi-file-text" style={{ fontSize: 11 }}></i>
                              </button>
                              <button className="btn btn-sm d-flex align-items-center justify-content-center"
                                style={{ width: 28, height: 28, borderRadius: '50%', padding: 0, background: '#fef2f2', color: '#dc2626', border: 'none' }}
                                title="Delete Invoice" onClick={() => toast('Delete invoice #' + row.po_id + ' — coming soon')}>
                                <i className="bi bi-trash-fill" style={{ fontSize: 11 }}></i>
                              </button>
                            </div>
                          </td>
                          {/* Status */}
                          <td>
                            <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 10,
                              background: row.po_status === 1 ? '#dcfce7' : row.po_status === 2 ? '#fef2f2' : '#fefce8',
                              color: row.po_status === 1 ? '#166534' : row.po_status === 2 ? '#991b1b' : '#854d0e' }}>
                              {row.po_status === 1 ? 'Active' : row.po_status === 2 ? 'Deleted' : 'Not Active'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {/* Footer: info + pagination */}
                  <div className="d-flex justify-content-between align-items-center px-3 py-2" style={{ borderTop: '1px solid #e2e8f0', background: '#fafbfc' }}>
                    <span className="text-muted" style={{ fontSize: 12 }}>
                      Showing {sorted.length === 0 ? 0 : invPage * invPerPage + 1}–{Math.min((invPage + 1) * invPerPage, sorted.length)} of {sorted.length} invoice{sorted.length !== 1 ? 's' : ''}
                      {sorted.length !== (invData || []).length && <span className="ms-1">(filtered from {invData.length} total)</span>}
                    </span>
                    {totalPages > 1 && (
                      <div className="d-flex gap-1 align-items-center">
                        <button className="btn btn-sm btn-outline-secondary" style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6 }}
                          disabled={invPage === 0} onClick={() => setInvPage(p => p - 1)}>
                          <i className="bi bi-chevron-left"></i>
                        </button>
                        {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                          let pg = i
                          if (totalPages > 7) {
                            if (invPage < 4) pg = i
                            else if (invPage > totalPages - 5) pg = totalPages - 7 + i
                            else pg = invPage - 3 + i
                          }
                          return (
                            <button key={pg} className={`btn btn-sm ${invPage === pg ? 'btn-primary' : 'btn-outline-secondary'}`}
                              style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6, minWidth: 28 }}
                              onClick={() => setInvPage(pg)}>
                              {pg + 1}
                            </button>
                          )
                        })}
                        <button className="btn btn-sm btn-outline-secondary" style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6 }}
                          disabled={invPage >= totalPages - 1} onClick={() => setInvPage(p => p + 1)}>
                          <i className="bi bi-chevron-right"></i>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </>)}
            </div>
            )
          })()}

          {/* ===== COMMISSIONS TAB ===== */}
          {activeTab === 'commissions' && (() => {
            const cf = commFilter
            const cs = commSort
            // Filter
            const filtered = (commData || []).filter(row => {
              if (cf.invoiceNo && !(row.invoice_number || '').toLowerCase().includes(cf.invoiceNo.toLowerCase())) return false
              if (cf.dateFrom) { const d = row.invoice_date ? new Date(row.invoice_date) : null; if (!d || d < new Date(cf.dateFrom)) return false }
              if (cf.dateTo) { const d = row.invoice_date ? new Date(row.invoice_date) : null; if (!d || d > new Date(cf.dateTo + 'T23:59:59')) return false }
              if (cf.qty && (row.total_qty || 0) < Number(cf.qty)) return false
              if (cf.amtFrom && (row.po_total || 0) < Number(cf.amtFrom)) return false
              if (cf.amtTo && (row.po_total || 0) > Number(cf.amtTo)) return false
              if (cf.commFrom && (row.comm_total || 0) < Number(cf.commFrom)) return false
              if (cf.commTo && (row.comm_total || 0) > Number(cf.commTo)) return false
              if (cf.paidStatus === 'paid' && row.payment_status === 'unpaid') return false
              if (cf.paidStatus === 'unpaid' && row.payment_status !== 'unpaid') return false
              return true
            })
            // Sort
            const sorted = [...filtered].sort((a, b) => {
              let va = a[cs.key], vb = b[cs.key]
              if (cs.key === 'invoice_date') { va = va ? new Date(va).getTime() : 0; vb = vb ? new Date(vb).getTime() : 0 }
              if (typeof va === 'string') { va = va.toLowerCase(); vb = (vb || '').toLowerCase() }
              if (va < vb) return cs.dir === 'asc' ? -1 : 1
              if (va > vb) return cs.dir === 'asc' ? 1 : -1
              return 0
            })
            // Pagination
            const totalPages = Math.ceil(sorted.length / commPerPage)
            const paged = sorted.slice(commPage * commPerPage, (commPage + 1) * commPerPage)
            // Sort handler
            const doSort = (key) => { setCommSort(prev => ({ key, dir: prev.key === key && prev.dir === 'asc' ? 'desc' : 'asc' })); setCommPage(0) }
            const sortIcon = (key) => cs.key === key ? (cs.dir === 'asc' ? 'bi-sort-up' : 'bi-sort-down') : 'bi-chevron-expand'
            // Filter input style
            const fStyle = { fontSize: 11, padding: '3px 6px', border: '1px solid #ced4da', borderRadius: 4, width: '100%', background: '#fff' }
            // Sortable header style
            const thSort = { cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }
            const resetFilters = () => { setCommFilter({ invoiceNo: '', dateFrom: '', dateTo: '', qty: '', amtFrom: '', amtTo: '', commFrom: '', commTo: '', paidStatus: '' }); setCommPage(0) }
            return (
            <div>
              <h6 className="fw-bold mb-3" style={{ color: '#1a9e5c', textTransform: 'uppercase', fontSize: 14, letterSpacing: '0.03em' }}>
                <i className="bi bi-percent me-2"></i>Commission List
              </h6>
              {commLoading ? (
                <div className="text-center py-5"><div className="spinner-border text-primary" role="status"></div><div className="mt-2 text-muted">Loading commissions...</div></div>
              ) : !commData || commData.length === 0 ? (
                <div className="text-center text-muted py-5"><i className="bi bi-percent fs-1 d-block mb-2 opacity-25"></i>No commission records found</div>
              ) : (<>
                {/* Table */}
                <div className="card border-0 shadow-sm" style={{ borderRadius: 12, overflow: 'hidden' }}>
                  <table className="table table-striped table-bordered table-hover table-sm align-middle mb-0" style={{ fontSize: 13 }}>
                    <thead style={{ backgroundColor: '#E0F1E2' }}>
                      {/* Column Headers */}
                      <tr>
                        <th style={{ width: 32 }}></th>
                        <th style={thSort} onClick={() => doSort('line')}>
                          # <i className={`bi ${sortIcon('line')} ms-1`} style={{ fontSize: 10, opacity: 0.6 }}></i>
                        </th>
                        <th style={thSort} onClick={() => doSort('invoice_number')}>
                          Invoice&nbsp;# <i className={`bi ${sortIcon('invoice_number')} ms-1`} style={{ fontSize: 10, opacity: 0.6 }}></i>
                        </th>
                        <th style={thSort} onClick={() => doSort('invoice_date')}>
                          Invoice&nbsp;Date <i className={`bi ${sortIcon('invoice_date')} ms-1`} style={{ fontSize: 10, opacity: 0.6 }}></i>
                        </th>
                        <th className="text-end" style={thSort} onClick={() => doSort('total_qty')}>
                          Qty <i className={`bi ${sortIcon('total_qty')} ms-1`} style={{ fontSize: 10, opacity: 0.6 }}></i>
                        </th>
                        <th className="text-end" style={thSort} onClick={() => doSort('po_total')}>
                          PO&nbsp;Total <i className={`bi ${sortIcon('po_total')} ms-1`} style={{ fontSize: 10, opacity: 0.6 }}></i>
                        </th>
                        <th className="text-end" style={thSort} onClick={() => doSort('comm_total')}>
                          ComTotal <i className={`bi ${sortIcon('comm_total')} ms-1`} style={{ fontSize: 10, opacity: 0.6 }}></i>
                        </th>
                        <th style={thSort} onClick={() => doSort('payment_status')}>
                          CommPaid <i className={`bi ${sortIcon('payment_status')} ms-1`} style={{ fontSize: 10, opacity: 0.6 }}></i>
                        </th>
                        <th>Status</th>
                        <th style={{ width: 90 }}>Actions</th>
                      </tr>
                      {/* Filter Row - always visible, inside thead like old PHP */}
                      <tr style={{ backgroundColor: '#f0f4f0' }}>
                        <td></td>
                        <td></td>
                        <td>
                          <input type="text" value={cf.invoiceNo} onChange={e => { setCommFilter(p => ({ ...p, invoiceNo: e.target.value })); setCommPage(0) }} style={fStyle} />
                        </td>
                        <td>
                          <input type="date" value={cf.dateFrom} onChange={e => { setCommFilter(p => ({ ...p, dateFrom: e.target.value })); setCommPage(0) }} style={{ ...fStyle, marginBottom: 3 }} placeholder="From" />
                          <input type="date" value={cf.dateTo} onChange={e => { setCommFilter(p => ({ ...p, dateTo: e.target.value })); setCommPage(0) }} style={fStyle} placeholder="To" />
                        </td>
                        <td>
                          <input type="number" value={cf.qty} onChange={e => { setCommFilter(p => ({ ...p, qty: e.target.value })); setCommPage(0) }} style={fStyle} />
                        </td>
                        <td>
                          <input type="number" placeholder="From" value={cf.amtFrom} onChange={e => { setCommFilter(p => ({ ...p, amtFrom: e.target.value })); setCommPage(0) }} style={{ ...fStyle, marginBottom: 3 }} />
                          <input type="number" placeholder="To" value={cf.amtTo} onChange={e => { setCommFilter(p => ({ ...p, amtTo: e.target.value })); setCommPage(0) }} style={fStyle} />
                        </td>
                        <td>
                          <input type="number" placeholder="From" value={cf.commFrom} onChange={e => { setCommFilter(p => ({ ...p, commFrom: e.target.value })); setCommPage(0) }} style={{ ...fStyle, marginBottom: 3 }} />
                          <input type="number" placeholder="To" value={cf.commTo} onChange={e => { setCommFilter(p => ({ ...p, commTo: e.target.value })); setCommPage(0) }} style={fStyle} />
                        </td>
                        <td>
                          <select value={cf.paidStatus} onChange={e => { setCommFilter(p => ({ ...p, paidStatus: e.target.value })); setCommPage(0) }} style={fStyle}>
                            <option value="">All</option>
                            <option value="paid">Paid</option>
                            <option value="unpaid">Unpaid</option>
                          </select>
                        </td>
                        <td></td>
                        <td>
                          <button className="btn btn-sm btn-warning d-block w-100 mb-1" style={{ fontSize: 11, padding: '3px 6px' }}
                            onClick={() => setCommPage(0)}>
                            <i className="bi bi-search me-1"></i>Search
                          </button>
                          <button className="btn btn-sm btn-danger d-block w-100" style={{ fontSize: 11, padding: '3px 6px' }}
                            onClick={resetFilters}>
                            <i className="bi bi-x-lg me-1"></i>Reset
                          </button>
                        </td>
                      </tr>
                    </thead>
                    <tbody>
                      {paged.length === 0 ? (
                        <tr><td colSpan="10" className="text-center text-muted py-4"><i className="bi bi-inbox me-2"></i>No matching commission records</td></tr>
                      ) : paged.map((row, fi) => {
                        const isExpanded = commExpanded === row.po_id
                        const rowBg = row.payment_status === 'fullpaid' ? '#E4F7D7'
                          : row.payment_status === 'partial' ? '#FEE5CB'
                          : row.payment_status === 'unpaid' ? '#FFD2D3' : 'transparent'
                        const statusLabel = row.payment_status === 'fullpaid' ? 'Paid in Full'
                          : row.payment_status === 'partial' ? 'Partial'
                          : 'Unpaid'
                        const toggleExpand = () => setCommExpanded(isExpanded ? null : row.po_id)
                        return [
                          <tr key={row.po_id} style={{ backgroundColor: rowBg, transition: 'background 0.15s' }}>
                            <td style={{ cursor: 'pointer' }} onClick={toggleExpand}>
                              <i className="bi bi-chevron-right" style={{ fontSize: 11, color: isExpanded ? '#2563eb' : '#94a3b8', transition: 'transform 0.2s', transform: isExpanded ? 'rotate(90deg)' : 'none' }}></i>
                            </td>
                            <td style={{ cursor: 'pointer' }} onClick={toggleExpand}>{commPage * commPerPage + fi + 1}</td>
                            <td style={{ cursor: 'pointer' }} onClick={toggleExpand}><span className="fw-semibold text-primary">{row.invoice_number}</span></td>
                            <td style={{ cursor: 'pointer' }} onClick={toggleExpand}>{row.invoice_date ? new Date(row.invoice_date).toLocaleDateString('en-US') : ''}</td>
                            <td className="text-end" style={{ cursor: 'pointer' }} onClick={toggleExpand}>{row.total_qty}</td>
                            <td className="text-end fw-semibold" style={{ cursor: 'pointer' }} onClick={toggleExpand}>${Number(row.po_total || 0).toFixed(2)}</td>
                            <td className="text-end" style={{ cursor: 'pointer' }} onClick={toggleExpand}>${Number(row.comm_total || 0).toFixed(2)}</td>
                            <td style={{ cursor: 'pointer' }} onClick={toggleExpand}>
                              <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 10,
                                background: row.payment_status === 'fullpaid' ? '#bbf7d0' : row.payment_status === 'partial' ? '#fed7aa' : '#fecaca',
                                color: row.payment_status === 'fullpaid' ? '#166534' : row.payment_status === 'partial' ? '#9a3412' : '#991b1b' }}>
                                {statusLabel}
                              </span>
                              {row.comm_paid_dates && row.comm_paid_dates.length > 0 && (
                                <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                                  {row.comm_paid_dates.map(d => new Date(d).toLocaleDateString('en-US')).join(', ')}
                                </div>
                              )}
                            </td>
                            <td>
                              <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 10,
                                background: row.comm_status === 'Active' ? '#dcfce7' : '#fef2f2',
                                color: row.comm_status === 'Active' ? '#166534' : '#991b1b' }}>
                                {row.comm_status}
                              </span>
                            </td>
                            <td>
                              <div className="d-flex gap-1">
                                {row.comm_id && (<>
                                  <button className="btn btn-sm d-flex align-items-center justify-content-center"
                                    style={{ width: 28, height: 28, borderRadius: '50%', padding: 0, background: '#fee2e2', color: '#dc2626', border: 'none' }}
                                    title="Edit Commission" onClick={e => { e.stopPropagation(); toast('Edit commission #' + row.comm_id + ' — coming soon') }}>
                                    <i className="bi bi-pencil-fill" style={{ fontSize: 11 }}></i>
                                  </button>
                                  <button className="btn btn-sm d-flex align-items-center justify-content-center"
                                    style={{ width: 28, height: 28, borderRadius: '50%', padding: 0, background: '#e2e8f0', color: '#475569', border: 'none' }}
                                    title="View Commission" onClick={e => { e.stopPropagation(); toggleExpand() }}>
                                    <i className="bi bi-eye-fill" style={{ fontSize: 11 }}></i>
                                  </button>
                                </>)}
                              </div>
                            </td>
                          </tr>,
                          isExpanded && (
                            <tr key={`${row.po_id}-detail`}>
                              <td colSpan="10" style={{ padding: 0, background: '#f8fafc', borderTop: '1px dashed #cbd5e1' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
                                  {/* Rep Commissions */}
                                  <div style={{ padding: '16px 20px', borderRight: '1px solid #e2e8f0' }}>
                                    <h6 style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#64748b', marginBottom: 10, fontWeight: 700 }}>
                                      <i className="bi bi-people-fill me-1"></i>Rep Commissions
                                    </h6>
                                    {row.rep_details && row.rep_details.length > 0 ? row.rep_details.map((rep, ri) => (
                                      <div key={ri} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', fontSize: 12.5, borderBottom: ri < row.rep_details.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                                        <span style={{ color: '#334155' }}>{rep.rep_name} <span style={{ color: '#94a3b8', fontSize: 11 }}>({rep.rep_code})</span></span>
                                        <span style={{ fontWeight: 700, color: rep.amount > 0 ? '#059669' : '#94a3b8' }}>${Number(rep.amount).toFixed(2)}</span>
                                      </div>
                                    )) : <span className="text-muted" style={{ fontSize: 12 }}>No rep details</span>}
                                  </div>
                                  {/* Payment Details */}
                                  <div style={{ padding: '16px 20px' }}>
                                    <h6 style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#64748b', marginBottom: 10, fontWeight: 700 }}>
                                      <i className="bi bi-credit-card-2-front-fill me-1"></i>Payment Details
                                    </h6>
                                    {row.payment_details && row.payment_details.length > 0 ? row.payment_details.map((pay, pi) => (
                                      <div key={pi} style={{ fontSize: 12.5, marginBottom: 8, padding: '8px 10px', background: '#fff', borderRadius: 8, border: '1px solid #e8ecf1' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
                                          <span style={{ color: '#64748b' }}>Date</span>
                                          <span style={{ fontWeight: 600 }}>{pay.date ? new Date(pay.date).toLocaleDateString('en-US') : '—'}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
                                          <span style={{ color: '#64748b' }}>Mode</span>
                                          <span style={{ fontWeight: 600 }}>{pay.mode || '—'}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
                                          <span style={{ color: '#64748b' }}>Received</span>
                                          <span style={{ fontWeight: 700, color: '#059669' }}>${Number(pay.amount).toFixed(2)}</span>
                                        </div>
                                      </div>
                                    )) : <span className="text-muted" style={{ fontSize: 12 }}>No payments recorded</span>}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )
                        ]
                      })}
                    </tbody>
                  </table>
                  {/* Footer: info + pagination */}
                  <div className="d-flex justify-content-between align-items-center px-3 py-2" style={{ borderTop: '1px solid #e2e8f0', background: '#fafbfc' }}>
                    <span className="text-muted" style={{ fontSize: 12 }}>
                      Showing {sorted.length === 0 ? 0 : commPage * commPerPage + 1}–{Math.min((commPage + 1) * commPerPage, sorted.length)} of {sorted.length} commission{sorted.length !== 1 ? 's' : ''}
                      {sorted.length !== (commData || []).length && <span className="ms-1">(filtered from {commData.length} total)</span>}
                    </span>
                    {totalPages > 1 && (
                      <div className="d-flex gap-1 align-items-center">
                        <button className="btn btn-sm btn-outline-secondary" style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6 }}
                          disabled={commPage === 0} onClick={() => setCommPage(p => p - 1)}>
                          <i className="bi bi-chevron-left"></i>
                        </button>
                        {Array.from({ length: totalPages }, (_, i) => (
                          <button key={i} className={`btn btn-sm ${commPage === i ? 'btn-primary' : 'btn-outline-secondary'}`}
                            style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6, minWidth: 28 }}
                            onClick={() => setCommPage(i)}>
                            {i + 1}
                          </button>
                        ))}
                        <button className="btn btn-sm btn-outline-secondary" style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6 }}
                          disabled={commPage >= totalPages - 1} onClick={() => setCommPage(p => p + 1)}>
                          <i className="bi bi-chevron-right"></i>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </>)}
            </div>
            )
          })()}

          {/* ===== PAYMENTS TAB ===== */}

          {/* ===== HISTORY TAB ===== */}
          {activeTab === 'history' && (() => {
            const allRows = historyData?.rows || []
            const totalPages = Math.ceil(allRows.length / histPerPage)
            const paged = allRows.slice(histPage * histPerPage, (histPage + 1) * histPerPage)
            return (
            <div>
              <h6 className="fw-bold mb-3"><i className="bi bi-clock-history me-2 text-primary"></i>History List</h6>
              {historyLoading ? (
                <div className="text-center py-5"><div className="spinner-border text-primary" role="status"></div><div className="mt-2 text-muted">Loading history...</div></div>
              ) : allRows.length === 0 ? (
                <div className="text-center text-muted py-5"><i className="bi bi-clock-history fs-1 d-block mb-2 opacity-25"></i>No history records found</div>
              ) : (<>
                <div className="card border-0 shadow-sm" style={{ borderRadius: 12, overflow: 'hidden' }}>
                  <div style={{ overflow: 'auto', maxHeight: '70vh' }}>
                    <table className="table table-striped table-bordered table-hover table-sm align-middle mb-0" style={{ fontSize: 12, whiteSpace: 'nowrap', width: 'max-content', minWidth: '100%' }}>
                      <thead style={{ backgroundColor: '#E0F1E2', position: 'sticky', top: 0, zIndex: 2 }}>
                        <tr>
                          <th style={{ minWidth: 40, position: 'sticky', left: 0, backgroundColor: '#E0F1E2', zIndex: 3 }}>Line</th>
                          <th style={{ minWidth: 70, position: 'sticky', left: 40, backgroundColor: '#E0F1E2', zIndex: 3 }}>Invoice&nbsp;#</th>
                          <th style={{ minWidth: 90 }}>Invoice&nbsp;Date</th>
                          <th style={{ minWidth: 50, textAlign: 'right' }}>Qty</th>
                          <th style={{ minWidth: 80, textAlign: 'right' }}>PO&nbsp;Total</th>
                          {(historyData.itemTypeColumns || []).map(itc => (
                            <th key={itc.id} style={{ minWidth: 90, textAlign: 'right' }}>{itc.name}<br/><small style={{ fontWeight: 'normal' }}>Total</small></th>
                          ))}
                          <th style={{ minWidth: 85, textAlign: 'right' }}>CommTotal</th>
                          {(historyData.repColumns || []).map(rc => (
                            <th key={rc.id} style={{ minWidth: 90, textAlign: 'right' }}>{rc.name}<br/><small className="text-muted">{rc.code}</small></th>
                          ))}
                          <th style={{ minWidth: 90 }}>CommPaid</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paged.map((row, idx) => (
                          <tr key={row.po_id}>
                            <td style={{ position: 'sticky', left: 0, backgroundColor: 'inherit', zIndex: 1 }}>{histPage * histPerPage + idx + 1}</td>
                            <td style={{ position: 'sticky', left: 40, backgroundColor: 'inherit', zIndex: 1 }}>{row.invoice_number}</td>
                            <td>{row.invoice_date ? new Date(row.invoice_date).toLocaleDateString('en-US') : ''}</td>
                            <td style={{ textAlign: 'right' }}>{row.total_qty}</td>
                            <td style={{ textAlign: 'right' }}>${Number(row.po_total || 0).toFixed(2)}</td>
                            {(historyData.itemTypeColumns || []).map(itc => (
                              <td key={itc.id} style={{ textAlign: 'right' }}>${Number(row.item_totals?.[itc.id] || 0).toFixed(2)}</td>
                            ))}
                            <td style={{ textAlign: 'right' }}>${Number(row.comm_total || 0).toFixed(2)}</td>
                            {(historyData.repColumns || []).map(rc => (
                              <td key={rc.id} style={{ textAlign: 'right' }}>${Number(row.rep_amounts?.[rc.id] || 0).toFixed(2)}</td>
                            ))}
                            <td>{(row.comm_paid_dates || []).length > 0 ? row.comm_paid_dates.map(d => new Date(d).toLocaleDateString('en-US')).join(', ') : ''}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {/* Footer: info + pagination */}
                  <div className="d-flex justify-content-between align-items-center px-3 py-2" style={{ borderTop: '1px solid #e2e8f0', background: '#fafbfc' }}>
                    <span className="text-muted" style={{ fontSize: 12 }}>
                      Showing {allRows.length === 0 ? 0 : histPage * histPerPage + 1}–{Math.min((histPage + 1) * histPerPage, allRows.length)} of {allRows.length} record{allRows.length !== 1 ? 's' : ''}
                    </span>
                    {totalPages > 1 && (
                      <div className="d-flex gap-1 align-items-center">
                        <button className="btn btn-sm btn-outline-secondary" style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6 }}
                          disabled={histPage === 0} onClick={() => setHistPage(p => p - 1)}>
                          <i className="bi bi-chevron-left"></i>
                        </button>
                        {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                          let pg = i
                          if (totalPages > 7) {
                            if (histPage < 4) pg = i
                            else if (histPage > totalPages - 5) pg = totalPages - 7 + i
                            else pg = histPage - 3 + i
                          }
                          return (
                            <button key={pg} className={`btn btn-sm ${histPage === pg ? 'btn-primary' : 'btn-outline-secondary'}`}
                              style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6, minWidth: 28 }}
                              onClick={() => setHistPage(pg)}>
                              {pg + 1}
                            </button>
                          )
                        })}
                        <button className="btn btn-sm btn-outline-secondary" style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6 }}
                          disabled={histPage >= totalPages - 1} onClick={() => setHistPage(p => p + 1)}>
                          <i className="bi bi-chevron-right"></i>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </>)}
            </div>
            )
          })()}

        </div>
      </div>

      {/* ===== EDIT CUSTOMER INFO MODAL ===== */}
      {showEditInfo && (<>
        <div className="modal-backdrop fade show" style={{ zIndex: 1050 }}></div>
        <div className="modal fade show d-block" tabIndex="-1" style={{ zIndex: 1055 }} onClick={e => { if (e.target === e.currentTarget) setShowEditInfo(false) }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content border-0" style={{ borderRadius: 16, overflow: 'hidden', boxShadow: '0 25px 60px rgba(0,0,0,0.25)' }}>
              {/* Header */}
              <div className="modal-header border-0 py-3 px-4" style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)' }}>
                <div className="d-flex align-items-center gap-2">
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <i className="bi bi-pencil-square text-white" style={{ fontSize: '1rem' }}></i>
                  </div>
                  <h5 className="modal-title fw-bold text-white mb-0" style={{ fontSize: '1.05rem' }}>Edit Customer</h5>
                </div>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowEditInfo(false)}></button>
              </div>
              <form onSubmit={handleSaveInfo}>
                <div className="modal-body px-4 py-4" style={{ maxHeight: '72vh', overflowY: 'auto' }}>

                  {/* Section: Customer Info */}
                  <div className="d-flex align-items-center gap-2 mb-3 pb-2" style={{ borderBottom: '2px solid #e2e8f0' }}>
                    <i className="bi bi-info-circle-fill" style={{ color: '#3b82f6' }}></i>
                    <span className="fw-bold" style={{ fontSize: '.92rem', color: '#1e293b' }}>Customer Info</span>
                  </div>

                  {/* Customer # */}
                  <div className="mb-3">
                    <label className="form-label fw-semibold" style={{ fontSize: '.84rem' }}>Customer # <span className="text-muted fw-normal" style={{ fontSize: '.76rem' }}>Last: {cust.customer_code}</span></label>
                    <div className="row g-2">
                      <div className="col-4">
                        <input type="text" className="form-control" placeholder="Prefix" value={editForm.cust_alph} onChange={e => setEditForm({ ...editForm, cust_alph: e.target.value })} style={{ fontSize: '.88rem' }} />
                        <div className="text-muted" style={{ fontSize: '.72rem', marginTop: 2 }}>Prefix (optional)</div>
                      </div>
                      <div className="col-1 d-flex align-items-center justify-content-center fw-bold text-muted">—</div>
                      <div className="col-7">
                        <input type="text" className="form-control" placeholder="Number *" value={editForm.cust_number} onChange={e => setEditForm({ ...editForm, cust_number: e.target.value })} required style={{ fontSize: '.88rem' }} />
                      </div>
                    </div>
                  </div>

                  {/* Customer Name (repeater) */}
                  <div className="mb-3">
                    <label className="form-label fw-semibold" style={{ fontSize: '.84rem' }}>Customer Name <span className="text-danger">*</span></label>
                    {(editForm.company_names || ['']).map((nm, ni) => (
                      <div key={ni} className="d-flex align-items-center gap-2 mb-2">
                        <input type="text" className="form-control" placeholder="Customer Name" value={nm} onChange={e => { const arr = [...editForm.company_names]; arr[ni] = e.target.value; setEditForm({ ...editForm, company_names: arr }) }} required={ni === 0} style={{ fontSize: '.88rem' }} />
                        {editForm.company_names.length > 1 && (
                          <button type="button" className="btn btn-sm btn-danger d-flex align-items-center justify-content-center" style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0 }} onClick={() => { const arr = editForm.company_names.filter((_, i) => i !== ni); setEditForm({ ...editForm, company_names: arr }) }}>
                            <i className="bi bi-x-lg" style={{ fontSize: '.72rem' }}></i>
                          </button>
                        )}
                      </div>
                    ))}
                    <button type="button" className="btn btn-sm btn-info d-flex align-items-center gap-1" style={{ fontSize: '.78rem', borderRadius: 6, fontWeight: 600 }} onClick={() => setEditForm({ ...editForm, company_names: [...(editForm.company_names || ['']), ''] })}>
                      <i className="bi bi-plus-lg" style={{ fontSize: '.72rem' }}></i> Add More Name
                    </button>
                  </div>

                  {/* Customer Type + Terms */}
                  <div className="row g-3 mb-3">
                    <div className="col-md-6">
                      <label className="form-label fw-semibold" style={{ fontSize: '.84rem' }}>Customer Type <span className="text-danger">*</span></label>
                      <select className="form-select" value={editForm.customer_type} onChange={e => setEditForm({ ...editForm, customer_type: e.target.value })} style={{ fontSize: '.88rem' }}>
                        <option value="">Select Type</option>
                        {custTypes.map(t => (
                          <option key={t._id} value={t.code}>{t.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold" style={{ fontSize: '.84rem' }}>Terms <span className="text-danger">*</span></label>
                      <input type="text" className="form-control" value={editForm.terms} onChange={e => setEditForm({ ...editForm, terms: e.target.value })} style={{ fontSize: '.88rem' }} />
                    </div>
                  </div>

                  {/* Assigned Sales REP */}
                  <div className="mb-3">
                    <label className="form-label fw-semibold" style={{ fontSize: '.84rem' }}>Assigned Sales REP</label>
                    {/* Selected tags */}
                    <div className="d-flex flex-wrap gap-1 mb-2" style={{ minHeight: 28 }}>
                      {selectedReps.map((r, i) => (
                        <span key={r._id || i} className="d-inline-flex align-items-center gap-1 text-white fw-bold ps-2 pe-1 py-1" style={{ background: '#22c55e', borderRadius: 6, fontSize: '.76rem' }}>
                          {r.name}
                          <button type="button" className="btn btn-sm p-0 ms-1 text-white" style={{ fontSize: '.72rem', lineHeight: 1, border: 'none', background: 'none' }} onClick={() => setSelectedReps(selectedReps.filter(sr => sr._id !== r._id))}>
                            <i className="bi bi-x-lg"></i>
                          </button>
                        </span>
                      ))}
                    </div>
                    {/* Dropdown */}
                    <div className="position-relative">
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Search and select reps..."
                        value={repSearch}
                        onChange={e => { setRepSearch(e.target.value); setRepDropdownOpen(true) }}
                        onFocus={() => setRepDropdownOpen(true)}
                        style={{ fontSize: '.86rem' }}
                      />
                      {repDropdownOpen && (
                        <div className="position-absolute w-100 bg-white border shadow-sm" style={{ zIndex: 20, maxHeight: 200, overflowY: 'auto', borderRadius: '0 0 8px 8px', top: '100%', left: 0 }}>
                          {allReps
                            .filter(r => !selectedReps.some(sr => sr._id === r._id))
                            .filter(r => {
                              if (!repSearch) return true
                              const s = repSearch.toLowerCase()
                              return (r.first_name + ' ' + r.last_name).toLowerCase().includes(s) || (r.rep_number || '').toLowerCase().includes(s)
                            })
                            .map(r => {
                              const rName = ((r.first_name || '') + ' ' + (r.last_name || '')).trim()
                              return (
                                <div
                                  key={r._id}
                                  className="d-flex align-items-center gap-2 px-3 py-2"
                                  style={{ cursor: 'pointer', fontSize: '.84rem', borderBottom: '1px solid #f3f4f6' }}
                                  onMouseEnter={e => e.currentTarget.style.background = '#f0fdf4'}
                                  onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                                  onClick={() => {
                                    setSelectedReps([...selectedReps, { _id: r._id, name: rName, rep_number: r.rep_number }])
                                    setRepSearch('')
                                    setRepDropdownOpen(false)
                                  }}
                                >
                                  <div className="d-flex align-items-center justify-content-center fw-bold text-white" style={{ width: 28, height: 28, borderRadius: 7, background: '#22c55e', fontSize: '.68rem', flexShrink: 0 }}>
                                    {getInitials(rName)}
                                  </div>
                                  <div>
                                    <div className="fw-semibold">{rName}</div>
                                    <div className="text-muted" style={{ fontSize: '.72rem' }}>REP# {r.rep_number || '—'}</div>
                                  </div>
                                </div>
                              )
                            })}
                          {allReps.filter(r => !selectedReps.some(sr => sr._id === r._id)).length === 0 && (
                            <div className="text-center text-muted py-2" style={{ fontSize: '.82rem' }}>No more reps available</div>
                          )}
                          <div className="text-end px-2 py-1" style={{ borderTop: '1px solid #e2e8f0' }}>
                            <button type="button" className="btn btn-sm text-muted" style={{ fontSize: '.76rem' }} onClick={() => setRepDropdownOpen(false)}>Close</button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Status */}
                  <div className="mb-2">
                    <label className="form-label fw-semibold" style={{ fontSize: '.84rem' }}>Status</label>
                    <select className="form-select" value={editForm.status} onChange={e => setEditForm({ ...editForm, status: e.target.value })} style={{ fontSize: '.88rem' }}>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="pilot">Pilot</option>
                    </select>
                  </div>

                </div>
                <div className="modal-footer border-0 px-4 py-3" style={{ background: '#f8fafb' }}>
                  <button type="button" className="btn btn-outline-secondary px-4" style={{ borderRadius: 8 }} onClick={() => setShowEditInfo(false)}>Close</button>
                  <button type="submit" className="btn btn-primary px-4" style={{ borderRadius: 8, fontWeight: 600 }} disabled={editSaving}>
                    {editSaving ? <><span className="spinner-border spinner-border-sm me-1"></span>Saving...</> : <><i className="bi bi-check-lg me-1"></i>Save</>}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </>)}

      {/* ===== EDIT CONTACT MODAL ===== */}
      {showEditContact && (<>
        <div className="modal-backdrop fade show" style={{ zIndex: 1050 }}></div>
        <div className="modal fade show d-block" tabIndex="-1" style={{ zIndex: 1055 }} onClick={e => { if (e.target === e.currentTarget) setShowEditContact(false) }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content border-0" style={{ borderRadius: 16, overflow: 'hidden', boxShadow: '0 25px 60px rgba(0,0,0,0.25)' }}>
              {/* Header */}
              <div className="modal-header border-0 py-3 px-4" style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}>
                <div className="d-flex align-items-center gap-2">
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <i className="bi bi-person-badge-fill text-white" style={{ fontSize: '1rem' }}></i>
                  </div>
                  <h5 className="modal-title fw-bold text-white mb-0" style={{ fontSize: '1.05rem' }}>Edit Contact</h5>
                </div>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowEditContact(false)}></button>
              </div>
              <form onSubmit={handleSaveContact}>
                <div className="modal-body px-4 py-4" style={{ maxHeight: '72vh', overflowY: 'auto' }}>

                  {/* Contact Label */}
                  <div className="mb-3">
                    <label className="form-label fw-semibold" style={{ fontSize: '.84rem' }}>Contact Label</label>
                    <input type="text" className="form-control" placeholder="e.g. Sales, Billing, Support" value={contactForm.label} onChange={e => setContactForm({ ...contactForm, label: e.target.value })} style={{ fontSize: '.88rem' }} />
                  </div>

                  {/* Title + Name */}
                  <div className="row g-3 mb-3">
                    <div className="col-md-4">
                      <label className="form-label fw-semibold" style={{ fontSize: '.84rem' }}>Title</label>
                      <select className="form-select" value={contactForm.title} onChange={e => setContactForm({ ...contactForm, title: e.target.value })} style={{ fontSize: '.88rem' }}>
                        <option value="">Select</option>
                        <option value="mr">Mr</option>
                        <option value="mrs">Mrs</option>
                        <option value="miss">Miss</option>
                      </select>
                    </div>
                    <div className="col-md-8">
                      <label className="form-label fw-semibold" style={{ fontSize: '.84rem' }}>Name of Contact <span className="text-danger">*</span></label>
                      <input type="text" className="form-control" placeholder="Contact Person Name" value={contactForm.person} onChange={e => setContactForm({ ...contactForm, person: e.target.value })} required style={{ fontSize: '.88rem' }} />
                    </div>
                  </div>

                  {/* Position + Main Phone */}
                  <div className="row g-3 mb-3">
                    <div className="col-md-6">
                      <label className="form-label fw-semibold" style={{ fontSize: '.84rem' }}>Position</label>
                      <input type="text" className="form-control" placeholder="Contact Position" value={contactForm.position} onChange={e => setContactForm({ ...contactForm, position: e.target.value })} style={{ fontSize: '.88rem' }} />
                    </div>
                    <div className="col-md-6">
                      <div className="row g-2">
                        <div className="col-8">
                          <label className="form-label fw-semibold" style={{ fontSize: '.84rem' }}>Main Phone <span className="text-danger">*</span></label>
                          <input type="text" className="form-control" placeholder="Main Phone Number" value={contactForm.main_phone} onChange={e => setContactForm({ ...contactForm, main_phone: e.target.value })} required style={{ fontSize: '.88rem' }} />
                        </div>
                        <div className="col-4">
                          <label className="form-label fw-semibold" style={{ fontSize: '.84rem' }}>Ext</label>
                          <input type="text" className="form-control" placeholder="Ext" value={contactForm.main_ext} onChange={e => setContactForm({ ...contactForm, main_ext: e.target.value })} maxLength={6} style={{ fontSize: '.88rem' }} />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Desk Phone + Mobile Phone */}
                  <div className="row g-3 mb-3">
                    <div className="col-md-6">
                      <div className="row g-2">
                        <div className="col-8">
                          <label className="form-label fw-semibold" style={{ fontSize: '.84rem' }}>Desk Phone</label>
                          <input type="text" className="form-control" placeholder="Desk Phone Number" value={contactForm.desk_phone} onChange={e => setContactForm({ ...contactForm, desk_phone: e.target.value })} style={{ fontSize: '.88rem' }} />
                        </div>
                        <div className="col-4">
                          <label className="form-label fw-semibold" style={{ fontSize: '.84rem' }}>Ext</label>
                          <input type="text" className="form-control" placeholder="Ext" value={contactForm.desk_ext} onChange={e => setContactForm({ ...contactForm, desk_ext: e.target.value })} maxLength={6} style={{ fontSize: '.88rem' }} />
                        </div>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold" style={{ fontSize: '.84rem' }}>Mobile Phone</label>
                      <input type="text" className="form-control" placeholder="Mobile Phone Number" value={contactForm.mobile_phone} onChange={e => setContactForm({ ...contactForm, mobile_phone: e.target.value })} style={{ fontSize: '.88rem' }} />
                    </div>
                  </div>

                  {/* Email */}
                  <div className="mb-2">
                    <label className="form-label fw-semibold" style={{ fontSize: '.84rem' }}>Email Address <span className="text-danger">*</span></label>
                    <div className="input-group">
                      <span className="input-group-text"><i className="bi bi-envelope-fill" style={{ color: '#7c3aed' }}></i></span>
                      <input type="email" className="form-control" placeholder="Email Address" value={contactForm.email} onChange={e => setContactForm({ ...contactForm, email: e.target.value })} required style={{ fontSize: '.88rem' }} />
                    </div>
                  </div>

                </div>
                <div className="modal-footer border-0 px-4 py-3" style={{ background: '#f8fafb' }}>
                  <button type="button" className="btn btn-outline-secondary px-4" style={{ borderRadius: 8 }} onClick={() => setShowEditContact(false)}>Close</button>
                  <button type="submit" className="btn px-4 text-white" style={{ borderRadius: 8, fontWeight: 600, background: '#16a34a' }} disabled={contactSaving}>
                    {contactSaving ? <><span className="spinner-border spinner-border-sm me-1"></span>Saving...</> : <><i className="bi bi-check-lg me-1"></i>Save</>}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </>)}

      {/* ===== EDIT ADDRESS MODAL ===== */}
      {showEditAddress && (<>
        <div className="modal-backdrop fade show" style={{ zIndex: 1050 }}></div>
        <div className="modal fade show d-block" tabIndex="-1" style={{ zIndex: 1055 }} onClick={e => { if (e.target === e.currentTarget) setShowEditAddress(false) }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content border-0" style={{ borderRadius: 16, overflow: 'hidden', boxShadow: '0 25px 60px rgba(0,0,0,0.25)' }}>
              <div className="modal-header border-0 py-3 px-4" style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}>
                <div className="d-flex align-items-center gap-2">
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <i className="bi bi-geo-alt-fill text-white" style={{ fontSize: '1rem' }}></i>
                  </div>
                  <h5 className="modal-title fw-bold text-white mb-0" style={{ fontSize: '1.05rem' }}>Edit Address</h5>
                </div>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowEditAddress(false)}></button>
              </div>
              <form onSubmit={handleSaveAddress}>
                <div className="modal-body px-4 py-4" style={{ maxHeight: '72vh', overflowY: 'auto' }}>

                  {/* Label + Address Type */}
                  <div className="row g-3 mb-3">
                    <div className="col-md-6">
                      <label className="form-label fw-semibold" style={{ fontSize: '.84rem' }}>Address Label</label>
                      <input type="text" className="form-control" placeholder="e.g. Main Office, Warehouse" value={addressForm.address_label} onChange={e => setAddressForm({ ...addressForm, address_label: e.target.value })} style={{ fontSize: '.88rem' }} />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold" style={{ fontSize: '.84rem' }}>Address Type</label>
                      <div className="d-flex gap-3 mt-1">
                        {['ship to', 'bill to'].map(tag => (
                          <label key={tag} className="d-flex align-items-center gap-1" style={{ cursor: 'pointer', fontSize: '.88rem' }}>
                            <input type="radio" name="address_tag" checked={addressForm.address_tag === tag} onChange={() => setAddressForm({ ...addressForm, address_tag: tag })} style={{ accentColor: '#0d9488' }} />
                            {tag === 'ship to' ? 'Ship To' : 'Bill To'}
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Name (repeater) */}
                  <div className="mb-3">
                    <label className="form-label fw-semibold" style={{ fontSize: '.84rem' }}>Name / Company Name</label>
                    {(addressForm.names || ['']).map((nm, ni) => (
                      <div key={ni} className="d-flex align-items-center gap-2 mb-2">
                        <input type="text" className="form-control" placeholder="Name" value={nm} onChange={e => { const arr = [...addressForm.names]; arr[ni] = e.target.value; setAddressForm({ ...addressForm, names: arr }) }} style={{ fontSize: '.88rem' }} />
                        {addressForm.names.length > 1 && (
                          <button type="button" className="btn btn-sm btn-danger d-flex align-items-center justify-content-center" style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0 }} onClick={() => { const arr = addressForm.names.filter((_, i) => i !== ni); setAddressForm({ ...addressForm, names: arr }) }}>
                            <i className="bi bi-x-lg" style={{ fontSize: '.72rem' }}></i>
                          </button>
                        )}
                      </div>
                    ))}
                    <button type="button" className="btn btn-sm btn-info d-flex align-items-center gap-1" style={{ fontSize: '.78rem', borderRadius: 6, fontWeight: 600 }} onClick={() => setAddressForm({ ...addressForm, names: [...(addressForm.names || ['']), ''] })}>
                      <i className="bi bi-plus-lg" style={{ fontSize: '.72rem' }}></i> Add More Name
                    </button>
                  </div>

                  {/* Address (repeater) */}
                  <div className="mb-3">
                    <label className="form-label fw-semibold" style={{ fontSize: '.84rem' }}>Address</label>
                    {(addressForm.streets || ['']).map((st, si) => (
                      <div key={si} className="d-flex align-items-center gap-2 mb-2">
                        <input type="text" className="form-control" placeholder="Street Address" value={st} onChange={e => { const arr = [...addressForm.streets]; arr[si] = e.target.value; setAddressForm({ ...addressForm, streets: arr }) }} style={{ fontSize: '.88rem' }} />
                        {addressForm.streets.length > 1 && (
                          <button type="button" className="btn btn-sm btn-danger d-flex align-items-center justify-content-center" style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0 }} onClick={() => { const arr = addressForm.streets.filter((_, i) => i !== si); setAddressForm({ ...addressForm, streets: arr }) }}>
                            <i className="bi bi-x-lg" style={{ fontSize: '.72rem' }}></i>
                          </button>
                        )}
                      </div>
                    ))}
                    <button type="button" className="btn btn-sm btn-info d-flex align-items-center gap-1" style={{ fontSize: '.78rem', borderRadius: 6, fontWeight: 600 }} onClick={() => setAddressForm({ ...addressForm, streets: [...(addressForm.streets || ['']), ''] })}>
                      <i className="bi bi-plus-lg" style={{ fontSize: '.72rem' }}></i> Add More Address Line
                    </button>
                  </div>

                  {/* City + State */}
                  <div className="row g-3 mb-3">
                    <div className="col-md-6">
                      <label className="form-label fw-semibold" style={{ fontSize: '.84rem' }}>City</label>
                      <input type="text" className="form-control" value={addressForm.city} onChange={e => setAddressForm({ ...addressForm, city: e.target.value })} style={{ fontSize: '.88rem' }} />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold" style={{ fontSize: '.84rem' }}>State / Province</label>
                      <input type="text" className="form-control" value={addressForm.state} onChange={e => setAddressForm({ ...addressForm, state: e.target.value })} style={{ fontSize: '.88rem' }} />
                    </div>
                  </div>

                  {/* Zip + Country */}
                  <div className="row g-3 mb-3">
                    <div className="col-md-6">
                      <label className="form-label fw-semibold" style={{ fontSize: '.84rem' }}>Zip Code</label>
                      <input type="text" className="form-control" value={addressForm.zip_code} onChange={e => setAddressForm({ ...addressForm, zip_code: e.target.value })} style={{ fontSize: '.88rem' }} />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold" style={{ fontSize: '.84rem' }}>Country</label>
                      <input type="text" className="form-control" value={addressForm.country} onChange={e => setAddressForm({ ...addressForm, country: e.target.value })} style={{ fontSize: '.88rem' }} />
                    </div>
                  </div>

                  {/* Email + Phone */}
                  <div className="row g-3 mb-3">
                    <div className="col-md-6">
                      <label className="form-label fw-semibold" style={{ fontSize: '.84rem' }}>Email</label>
                      <input type="text" className="form-control" value={addressForm.email} onChange={e => setAddressForm({ ...addressForm, email: e.target.value })} style={{ fontSize: '.88rem' }} />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold" style={{ fontSize: '.84rem' }}>Phone Number</label>
                      <input type="text" className="form-control" value={addressForm.phoneno} onChange={e => setAddressForm({ ...addressForm, phoneno: e.target.value })} style={{ fontSize: '.88rem' }} />
                    </div>
                  </div>

                  {/* Shipping Acnt */}
                  <div className="mb-2">
                    <label className="form-label fw-semibold" style={{ fontSize: '.84rem' }}>Shipping Account</label>
                    <input type="text" className="form-control" value={addressForm.shipping_acnt} onChange={e => setAddressForm({ ...addressForm, shipping_acnt: e.target.value })} style={{ fontSize: '.88rem' }} />
                  </div>

                </div>
                <div className="modal-footer border-0 px-4 py-3" style={{ background: '#f8fafb' }}>
                  <button type="button" className="btn btn-outline-secondary px-4" style={{ borderRadius: 8 }} onClick={() => setShowEditAddress(false)}>Close</button>
                  <button type="submit" className="btn px-4 text-white" style={{ borderRadius: 8, fontWeight: 600, background: '#0d9488' }} disabled={addressSaving}>
                    {addressSaving ? <><span className="spinner-border spinner-border-sm me-1"></span>Saving...</> : <><i className="bi bi-check-lg me-1"></i>Save</>}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </>)}

      {/* ===== DELETE CONFIRMATION MODAL ===== */}
      {deleteConfirm && (<>
        <div className="modal-backdrop fade show" style={{ zIndex: 1060 }}></div>
        <div className="modal fade show d-block" tabIndex="-1" style={{ zIndex: 1065 }} onClick={e => { if (e.target === e.currentTarget) setDeleteConfirm(null) }}>
          <div className="modal-dialog modal-dialog-centered modal-sm">
            <div className="modal-content border-0" style={{ borderRadius: 16, overflow: 'hidden', boxShadow: '0 25px 60px rgba(0,0,0,0.25)' }}>
              <div className="modal-body text-center px-4 py-4">
                <div className="d-flex align-items-center justify-content-center mx-auto mb-3" style={{ width: 64, height: 64, borderRadius: 16, background: '#fef2f2' }}>
                  <i className="bi bi-exclamation-triangle-fill" style={{ fontSize: '1.6rem', color: '#ef4444' }}></i>
                </div>
                <h6 className="fw-bold mb-2">Delete {deleteConfirm.type}?</h6>
                <p className="text-muted mb-0" style={{ fontSize: '.86rem' }}>Are you sure you want to delete <strong>{deleteConfirm.name}</strong>? This action cannot be undone.</p>
              </div>
              <div className="modal-footer border-0 justify-content-center gap-2 px-4 pb-4 pt-0">
                <button className="btn btn-outline-secondary px-4" style={{ borderRadius: 8 }} onClick={() => setDeleteConfirm(null)}>Cancel</button>
                <button className="btn btn-danger px-4" style={{ borderRadius: 8, fontWeight: 600 }} onClick={handleDelete}>
                  <i className="bi bi-trash3 me-1"></i>Yes, Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      </>)}

      {/* ===== ADD CONTACT MODAL ===== */}
      {showAddContact && (<>
        <div className="modal-backdrop fade show" style={{ zIndex: 1050 }}></div>
        <div className="modal fade show d-block" tabIndex="-1" style={{ zIndex: 1055 }} onClick={e => { if (e.target === e.currentTarget) setShowAddContact(false) }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content border-0" style={{ borderRadius: 16, overflow: 'hidden', boxShadow: '0 25px 60px rgba(0,0,0,0.25)' }}>
              <div className="modal-header border-0 py-3 px-4" style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}>
                <div className="d-flex align-items-center gap-2">
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <i className="bi bi-person-plus-fill text-white" style={{ fontSize: '1rem' }}></i>
                  </div>
                  <h5 className="modal-title fw-bold text-white mb-0" style={{ fontSize: '1.05rem' }}>Add Contact</h5>
                </div>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowAddContact(false)}></button>
              </div>
              <form onSubmit={handleAddContact}>
                <div className="modal-body px-4 py-4" style={{ maxHeight: '72vh', overflowY: 'auto' }}>
                  <div className="mb-3">
                    <label className="form-label fw-semibold" style={{ fontSize: '.84rem' }}>Contact Label</label>
                    <input type="text" className="form-control" placeholder="e.g. Sales, Billing" value={addContactForm.label} onChange={e => setAddContactForm({ ...addContactForm, label: e.target.value })} style={{ fontSize: '.88rem' }} />
                  </div>
                  <div className="row g-3 mb-3">
                    <div className="col-md-4">
                      <label className="form-label fw-semibold" style={{ fontSize: '.84rem' }}>Title</label>
                      <select className="form-select" value={addContactForm.title} onChange={e => setAddContactForm({ ...addContactForm, title: e.target.value })} style={{ fontSize: '.88rem' }}>
                        <option value="">Select</option>
                        <option value="mr">Mr</option>
                        <option value="mrs">Mrs</option>
                        <option value="miss">Miss</option>
                      </select>
                    </div>
                    <div className="col-md-8">
                      <label className="form-label fw-semibold" style={{ fontSize: '.84rem' }}>Name of Contact <span className="text-danger">*</span></label>
                      <input type="text" className="form-control" placeholder="Contact Person Name" value={addContactForm.person} onChange={e => setAddContactForm({ ...addContactForm, person: e.target.value })} required style={{ fontSize: '.88rem' }} />
                    </div>
                  </div>
                  <div className="row g-3 mb-3">
                    <div className="col-md-6">
                      <label className="form-label fw-semibold" style={{ fontSize: '.84rem' }}>Position</label>
                      <input type="text" className="form-control" placeholder="Contact Position" value={addContactForm.position} onChange={e => setAddContactForm({ ...addContactForm, position: e.target.value })} style={{ fontSize: '.88rem' }} />
                    </div>
                    <div className="col-md-6">
                      <div className="row g-2">
                        <div className="col-8">
                          <label className="form-label fw-semibold" style={{ fontSize: '.84rem' }}>Main Phone <span className="text-danger">*</span></label>
                          <input type="text" className="form-control" placeholder="Main Phone" value={addContactForm.main_phone} onChange={e => setAddContactForm({ ...addContactForm, main_phone: e.target.value })} required style={{ fontSize: '.88rem' }} />
                        </div>
                        <div className="col-4">
                          <label className="form-label fw-semibold" style={{ fontSize: '.84rem' }}>Ext</label>
                          <input type="text" className="form-control" placeholder="Ext" value={addContactForm.main_ext} onChange={e => setAddContactForm({ ...addContactForm, main_ext: e.target.value })} maxLength={6} style={{ fontSize: '.88rem' }} />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="row g-3 mb-3">
                    <div className="col-md-6">
                      <div className="row g-2">
                        <div className="col-8">
                          <label className="form-label fw-semibold" style={{ fontSize: '.84rem' }}>Desk Phone</label>
                          <input type="text" className="form-control" placeholder="Desk Phone" value={addContactForm.desk_phone} onChange={e => setAddContactForm({ ...addContactForm, desk_phone: e.target.value })} style={{ fontSize: '.88rem' }} />
                        </div>
                        <div className="col-4">
                          <label className="form-label fw-semibold" style={{ fontSize: '.84rem' }}>Ext</label>
                          <input type="text" className="form-control" placeholder="Ext" value={addContactForm.desk_ext} onChange={e => setAddContactForm({ ...addContactForm, desk_ext: e.target.value })} maxLength={6} style={{ fontSize: '.88rem' }} />
                        </div>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold" style={{ fontSize: '.84rem' }}>Mobile Phone</label>
                      <input type="text" className="form-control" placeholder="Mobile Phone" value={addContactForm.mobile_phone} onChange={e => setAddContactForm({ ...addContactForm, mobile_phone: e.target.value })} style={{ fontSize: '.88rem' }} />
                    </div>
                  </div>
                  <div className="mb-2">
                    <label className="form-label fw-semibold" style={{ fontSize: '.84rem' }}>Email Address <span className="text-danger">*</span></label>
                    <div className="input-group">
                      <span className="input-group-text"><i className="bi bi-envelope-fill" style={{ color: '#7c3aed' }}></i></span>
                      <input type="email" className="form-control" placeholder="Email Address" value={addContactForm.email} onChange={e => setAddContactForm({ ...addContactForm, email: e.target.value })} required style={{ fontSize: '.88rem' }} />
                    </div>
                  </div>
                </div>
                <div className="modal-footer border-0 px-4 py-3" style={{ background: '#f8fafb' }}>
                  <button type="button" className="btn btn-outline-secondary px-4" style={{ borderRadius: 8 }} onClick={() => setShowAddContact(false)}>Close</button>
                  <button type="submit" className="btn px-4 text-white" style={{ borderRadius: 8, fontWeight: 600, background: '#16a34a' }} disabled={addContactSaving}>
                    {addContactSaving ? <><span className="spinner-border spinner-border-sm me-1"></span>Saving...</> : <><i className="bi bi-check-lg me-1"></i>Save</>}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </>)}

      {/* ===== ADD ADDRESS MODAL ===== */}
      {showAddAddress && (<>
        <div className="modal-backdrop fade show" style={{ zIndex: 1050 }}></div>
        <div className="modal fade show d-block" tabIndex="-1" style={{ zIndex: 1055 }} onClick={e => { if (e.target === e.currentTarget) setShowAddAddress(false) }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content border-0" style={{ borderRadius: 16, overflow: 'hidden', boxShadow: '0 25px 60px rgba(0,0,0,0.25)' }}>
              <div className="modal-header border-0 py-3 px-4" style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}>
                <div className="d-flex align-items-center gap-2">
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <i className="bi bi-geo-alt-fill text-white" style={{ fontSize: '1rem' }}></i>
                  </div>
                  <h5 className="modal-title fw-bold text-white mb-0" style={{ fontSize: '1.05rem' }}>Add New Address</h5>
                </div>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowAddAddress(false)}></button>
              </div>
              <form onSubmit={handleAddAddress}>
                <div className="modal-body px-4 py-4" style={{ maxHeight: '72vh', overflowY: 'auto' }}>
                  <div className="row g-3 mb-3">
                    <div className="col-md-6">
                      <label className="form-label fw-semibold" style={{ fontSize: '.84rem' }}>Address Label</label>
                      <input type="text" className="form-control" placeholder="e.g. Main Office, Warehouse" value={addAddressForm.address_label} onChange={e => setAddAddressForm({ ...addAddressForm, address_label: e.target.value })} style={{ fontSize: '.88rem' }} />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold" style={{ fontSize: '.84rem' }}>Address Type</label>
                      <div className="d-flex gap-3 mt-1">
                        {['ship to', 'bill to'].map(tag => (
                          <label key={tag} className="d-flex align-items-center gap-1" style={{ cursor: 'pointer', fontSize: '.88rem' }}>
                            <input type="radio" name="add_address_tag" checked={addAddressForm.address_tag === tag} onChange={() => setAddAddressForm({ ...addAddressForm, address_tag: tag })} style={{ accentColor: '#0d9488' }} />
                            {tag === 'ship to' ? 'Ship To' : 'Bill To'}
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                  {/* Name repeater */}
                  <div className="mb-3">
                    <label className="form-label fw-semibold" style={{ fontSize: '.84rem' }}>Name / Company Name</label>
                    {(addAddressForm.names || ['']).map((nm, ni) => (
                      <div key={ni} className="d-flex align-items-center gap-2 mb-2">
                        <input type="text" className="form-control" placeholder="Name" value={nm} onChange={e => { const arr = [...addAddressForm.names]; arr[ni] = e.target.value; setAddAddressForm({ ...addAddressForm, names: arr }) }} style={{ fontSize: '.88rem' }} />
                        {addAddressForm.names.length > 1 && (
                          <button type="button" className="btn btn-sm btn-danger d-flex align-items-center justify-content-center" style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0 }} onClick={() => setAddAddressForm({ ...addAddressForm, names: addAddressForm.names.filter((_, i) => i !== ni) })}>
                            <i className="bi bi-x-lg" style={{ fontSize: '.72rem' }}></i>
                          </button>
                        )}
                      </div>
                    ))}
                    <button type="button" className="btn btn-sm btn-info d-flex align-items-center gap-1" style={{ fontSize: '.78rem', borderRadius: 6, fontWeight: 600 }} onClick={() => setAddAddressForm({ ...addAddressForm, names: [...addAddressForm.names, ''] })}>
                      <i className="bi bi-plus-lg" style={{ fontSize: '.72rem' }}></i> Add More Name
                    </button>
                  </div>
                  {/* Address repeater */}
                  <div className="mb-3">
                    <label className="form-label fw-semibold" style={{ fontSize: '.84rem' }}>Address</label>
                    {(addAddressForm.streets || ['']).map((st, si) => (
                      <div key={si} className="d-flex align-items-center gap-2 mb-2">
                        <input type="text" className="form-control" placeholder="Street Address" value={st} onChange={e => { const arr = [...addAddressForm.streets]; arr[si] = e.target.value; setAddAddressForm({ ...addAddressForm, streets: arr }) }} style={{ fontSize: '.88rem' }} />
                        {addAddressForm.streets.length > 1 && (
                          <button type="button" className="btn btn-sm btn-danger d-flex align-items-center justify-content-center" style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0 }} onClick={() => setAddAddressForm({ ...addAddressForm, streets: addAddressForm.streets.filter((_, i) => i !== si) })}>
                            <i className="bi bi-x-lg" style={{ fontSize: '.72rem' }}></i>
                          </button>
                        )}
                      </div>
                    ))}
                    <button type="button" className="btn btn-sm btn-info d-flex align-items-center gap-1" style={{ fontSize: '.78rem', borderRadius: 6, fontWeight: 600 }} onClick={() => setAddAddressForm({ ...addAddressForm, streets: [...addAddressForm.streets, ''] })}>
                      <i className="bi bi-plus-lg" style={{ fontSize: '.72rem' }}></i> Add More Address Line
                    </button>
                  </div>
                  <div className="row g-3 mb-3">
                    <div className="col-md-6">
                      <label className="form-label fw-semibold" style={{ fontSize: '.84rem' }}>City</label>
                      <input type="text" className="form-control" value={addAddressForm.city} onChange={e => setAddAddressForm({ ...addAddressForm, city: e.target.value })} style={{ fontSize: '.88rem' }} />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold" style={{ fontSize: '.84rem' }}>State / Province</label>
                      <input type="text" className="form-control" value={addAddressForm.state} onChange={e => setAddAddressForm({ ...addAddressForm, state: e.target.value })} style={{ fontSize: '.88rem' }} />
                    </div>
                  </div>
                  <div className="row g-3 mb-3">
                    <div className="col-md-6">
                      <label className="form-label fw-semibold" style={{ fontSize: '.84rem' }}>Zip Code</label>
                      <input type="text" className="form-control" value={addAddressForm.zip_code} onChange={e => setAddAddressForm({ ...addAddressForm, zip_code: e.target.value })} style={{ fontSize: '.88rem' }} />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold" style={{ fontSize: '.84rem' }}>Country</label>
                      <input type="text" className="form-control" value={addAddressForm.country} onChange={e => setAddAddressForm({ ...addAddressForm, country: e.target.value })} style={{ fontSize: '.88rem' }} />
                    </div>
                  </div>
                  <div className="row g-3 mb-3">
                    <div className="col-md-6">
                      <label className="form-label fw-semibold" style={{ fontSize: '.84rem' }}>Email</label>
                      <input type="text" className="form-control" value={addAddressForm.email} onChange={e => setAddAddressForm({ ...addAddressForm, email: e.target.value })} style={{ fontSize: '.88rem' }} />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold" style={{ fontSize: '.84rem' }}>Phone Number</label>
                      <input type="text" className="form-control" value={addAddressForm.phoneno} onChange={e => setAddAddressForm({ ...addAddressForm, phoneno: e.target.value })} style={{ fontSize: '.88rem' }} />
                    </div>
                  </div>
                  <div className="mb-2">
                    <label className="form-label fw-semibold" style={{ fontSize: '.84rem' }}>Shipping Account</label>
                    <input type="text" className="form-control" value={addAddressForm.shipping_acnt} onChange={e => setAddAddressForm({ ...addAddressForm, shipping_acnt: e.target.value })} style={{ fontSize: '.88rem' }} />
                  </div>
                </div>
                <div className="modal-footer border-0 px-4 py-3" style={{ background: '#f8fafb' }}>
                  <button type="button" className="btn btn-outline-secondary px-4" style={{ borderRadius: 8 }} onClick={() => setShowAddAddress(false)}>Close</button>
                  <button type="submit" className="btn px-4 text-white" style={{ borderRadius: 8, fontWeight: 600, background: '#0d9488' }} disabled={addAddressSaving}>
                    {addAddressSaving ? <><span className="spinner-border spinner-border-sm me-1"></span>Saving...</> : <><i className="bi bi-check-lg me-1"></i>Save</>}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </>)}

      {/* ===== ADD EMAILS MODAL ===== */}
      {showAddEmails && (<>
        <div className="modal-backdrop fade show" style={{ zIndex: 1050 }}></div>
        <div className="modal fade show d-block" tabIndex="-1" style={{ zIndex: 1055 }} onClick={e => { if (e.target === e.currentTarget) setShowAddEmails(false) }}>
          <div className="modal-dialog modal-dialog-centered modal-md">
            <div className="modal-content border-0" style={{ borderRadius: 16, overflow: 'hidden', boxShadow: '0 25px 60px rgba(0,0,0,0.25)' }}>
              <div className="modal-header border-0 py-3 px-4" style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)' }}>
                <div className="d-flex align-items-center gap-2">
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <i className="bi bi-envelope-plus-fill text-white" style={{ fontSize: '1rem' }}></i>
                  </div>
                  <h5 className="modal-title fw-bold text-white mb-0" style={{ fontSize: '1.05rem' }}>Add Emails</h5>
                </div>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowAddEmails(false)}></button>
              </div>
              <form onSubmit={handleAddEmails}>
                <div className="modal-body px-4 py-4" style={{ maxHeight: '72vh', overflowY: 'auto' }}>
                  <label className="form-label fw-semibold" style={{ fontSize: '.84rem' }}>Add Emails</label>
                  {addEmailRows.map((row, ri) => (
                    <div key={ri} className="d-flex align-items-start gap-2 mb-3 p-3" style={{ background: '#f8fafb', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                      <div className="flex-grow-1">
                        <div className="mb-2">
                          <label className="form-label mb-1" style={{ fontSize: '.78rem', fontWeight: 600 }}>Name</label>
                          <input type="text" className="form-control form-control-sm" placeholder="Name" value={row.name} onChange={e => { const arr = [...addEmailRows]; arr[ri] = { ...arr[ri], name: e.target.value }; setAddEmailRows(arr) }} style={{ fontSize: '.86rem' }} />
                        </div>
                        <div>
                          <label className="form-label mb-1" style={{ fontSize: '.78rem', fontWeight: 600 }}>Email <span className="text-danger">*</span></label>
                          <input type="email" className="form-control form-control-sm" placeholder="Email Address" value={row.email} onChange={e => { const arr = [...addEmailRows]; arr[ri] = { ...arr[ri], email: e.target.value }; setAddEmailRows(arr) }} required style={{ fontSize: '.86rem' }} />
                        </div>
                      </div>
                      {addEmailRows.length > 1 && (
                        <button type="button" className="btn btn-sm btn-danger d-flex align-items-center justify-content-center mt-3" style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0 }} onClick={() => setAddEmailRows(addEmailRows.filter((_, i) => i !== ri))}>
                          <i className="bi bi-x-lg" style={{ fontSize: '.72rem' }}></i>
                        </button>
                      )}
                    </div>
                  ))}
                  <button type="button" className="btn btn-sm btn-info d-flex align-items-center gap-1" style={{ fontSize: '.78rem', borderRadius: 6, fontWeight: 600 }} onClick={() => setAddEmailRows([...addEmailRows, { name: '', email: '' }])}>
                    <i className="bi bi-plus-lg" style={{ fontSize: '.72rem' }}></i> Add
                  </button>
                </div>
                <div className="modal-footer border-0 px-4 py-3" style={{ background: '#f8fafb' }}>
                  <button type="button" className="btn btn-outline-secondary px-4" style={{ borderRadius: 8 }} onClick={() => setShowAddEmails(false)}>Close</button>
                  <button type="submit" className="btn px-4 text-white" style={{ borderRadius: 8, fontWeight: 600, background: '#4f46e5' }} disabled={addEmailSaving}>
                    {addEmailSaving ? <><span className="spinner-border spinner-border-sm me-1"></span>Saving...</> : <><i className="bi bi-check-lg me-1"></i>Save</>}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </>)}
    </div>
  )
}
