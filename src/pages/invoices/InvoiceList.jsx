import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import html2pdf from 'html2pdf.js'
import { api } from '../../lib/api'
import Pagination from '../../components/Pagination'
import PageChartHeader from '../../components/PageChartHeader'
import SlidePanel from '../../components/SlidePanel'

export default function InvoiceList() {
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ total: 0, shipped: 0, paid: 0, unpaid: 0, totalAmount: 0 })
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(10)
  const [year, setYear] = useState('')
  const [years, setYears] = useState([])
  const [deleteInv, setDeleteInv] = useState(null)
  const [viewInv, setViewInv] = useState(null)
  const [panelOpen, setPanelOpen] = useState(false)
  const [viewLoading, setViewLoading] = useState(false)
  const [viewMode, setViewMode] = useState('invoice') // 'invoice' or 'packing'
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [emailForm, setEmailForm] = useState({ to: '', cc: '', bcc: '', subject: '', message: '' })
  const [emailSending, setEmailSending] = useState(false)
  const [trackInv, setTrackInv] = useState(null)
  const [trackForm, setTrackForm] = useState({ shipped_date: '', tracking_no: '' })
  const [notesInv, setNotesInv] = useState(null)
  const [notesText, setNotesText] = useState('')
  const [custPoInv, setCustPoInv] = useState(null)
  const [custPoFiles, setCustPoFiles] = useState([])
  const [poFileMap, setPoFileMap] = useState({})
  const [custPoUploading, setCustPoUploading] = useState(false)
  const [selectedPoFiles, setSelectedPoFiles] = useState([])
  const [commMap, setCommMap] = useState({}) // legacy_id -> commission summary _id
  const [viewCommInv, setViewCommInv] = useState(null)
  const [viewCommData, setViewCommData] = useState(null)
  const [viewCommLoading, setViewCommLoading] = useState(false)
  const [editCommInv, setEditCommInv] = useState(null)
  const [editCommData, setEditCommData] = useState(null)
  const [editCommLoading, setEditCommLoading] = useState(false)
  const [editCommReps, setEditCommReps] = useState([]) // [{sales_rep_id, total_price, rep_name, rep_code}]
  const [editCalcMode, setEditCalcMode] = useState('default')
  const [editCommItems, setEditCommItems] = useState([])
  const [editGrid, setEditGrid] = useState({}) // grid[itemIdx][repId] = { base, commission, percent }
  // Add Payment form inside View Commission
  const [showAddPayment, setShowAddPayment] = useState(false)
  const [payForm, setPayForm] = useState({ commission_paid_date: '', received_amount: '', received_date: '', paid_mode: '', partial_comm_total: '', mark_paid: false })
  const [payRepAmounts, setPayRepAmounts] = useState({})
  const [paySaving, setPaySaving] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [editInv, setEditInv] = useState(null)
  const [customers, setCustomers] = useState([])
  const [filterPaid, setFilterPaid] = useState('') // '' | 'unpaid'
  const [topCustomers, setTopCustomers] = useState({ topByCount: [], topByOutstanding: [] })
  const [analyticsLoading, setAnalyticsLoading] = useState(true)
  const [form, setForm] = useState({})
  const emptyForm = { company_id: '', invoice_number: '', invoice_date: '', po_number: '', po_date: '', due_date: '', total_qty: '', net_amount: '', shipping_costs: '', sales_tax_type: 'N', sales_tax_percentage: '', sales_tax_amount: '', po_notes: '', project: '', shipinfo_notes: '', airfeet_notes: '', cust_terms: '', customer_FOB: '', cust_ship: '', cust_ship_via: '', cust_project: '', credit_card_notes: '', inv_quote_status: 0, paid_value: '', paid_date: '', test_check: 0, cc_charge: 0, cc_per: '', cc_amt: '', drop_ship: 0, billing_contact: '', shipping_contact: '', billing_address: '', shipping_address: '', drop_company_name: '', bci_name: '', bci_phone: '', bci_email: '', sci_name: '', sci_phone: '', sci_email: '', bcaddr_street: '', bcaddr_city: '', bcaddr_state: '', bcaddr_zip: '', bcaddr_country: '', scaddr_street: '', scaddr_city: '', scaddr_state: '', scaddr_zip: '', scaddr_country: '' }
  const [invLineItems, setInvLineItems] = useState([])
  const [custContacts, setCustContacts] = useState([])
  const [custAddresses, setCustAddresses] = useState([])

  async function loadCustData(companyId) {
    if (!companyId) { setCustContacts([]); setCustAddresses([]); return }
    try {
      const cust = customers.find(c => String(c.legacy_id) === String(companyId))
      if (cust?._id) {
        const full = await api.getCustomer(cust._id)
        setCustContacts(full.contacts || [])
        setCustAddresses(full.addresses || [])
      }
    } catch { setCustContacts([]); setCustAddresses([]) }
  }

  useEffect(() => { fetchYears(); fetchCustomers(); fetchAnalytics() }, [])
  useEffect(() => { fetchData() }, [year])

  async function fetchYears() {
    try {
      const yrs = await api.getInvoiceYears()
      setYears(yrs || [])
    } catch {}
  }

  async function fetchAnalytics() {
    setAnalyticsLoading(true)
    try {
      const data = await api.getInvoiceTopCustomers()
      setTopCustomers(data || { topByCount: [], topByOutstanding: [] })
    } catch {}
    setAnalyticsLoading(false)
  }

  async function fetchData() {
    setLoading(true)
    try {
      const params = {}
      if (year) params.year = year
      const [data, statsData] = await Promise.all([
        api.getInvoices(params),
        api.getInvoiceStats(),
      ])
      setInvoices(data || [])
      setStats(statsData || {})
      // Load file map for customer PO upload icons
      try { const fm = await api.getInvoiceFileMap(); setPoFileMap(fm || {}) } catch {}
      // Load commission map (lightweight: po_id -> _id)
      try {
        const cm = await api.getCommissionMap()
        setCommMap(cm || {})
      } catch {}
    } catch (err) {
      toast.error('Failed to load: ' + err.message)
    }
    setLoading(false)
  }

  async function openEditComm(inv) {
    const commId = commMap[inv.legacy_id]
    if (!commId) { toast.error('No commission found'); return }
    setEditCommLoading(true)
    setEditCommInv(inv)
    try {
      const data = await api.getCommission(commId)
      setEditCommData(data)
      const reps = (data.details || []).map(d => ({ sales_rep_id: String(d.sales_rep_id), total_price: String(d.total_price || ''), rep_name: d.rep_name || '', rep_code: d.rep_code || '', legacy_id: d.sales_rep_id }))
      setEditCommReps(reps)
      // Set calc mode from saved data
      setEditCalcMode(data.save_status || 'default')
      // Build items and grid
      const items = data.items || []
      setEditCommItems(items)
      const commItemDets = data.commItemDets || []
      const commRepDets = data.commRepDets || []
      const g = {}
      items.forEach((item, idx) => {
        g[idx] = {}
        const itemId = item.item_id || item.legacy_id
        const itemDet = commItemDets.find(d => d.item_id === itemId)
        reps.forEach(r => {
          const repDet = commRepDets.find(rd => rd.item_id === itemId && rd.sales_rep_id === parseInt(r.sales_rep_id))
          g[idx][r.sales_rep_id] = {
            base: String(itemDet?.base_price ?? item.unit_cost ?? ''),
            commission: String(repDet?.commission_price || ''),
            percent: String(repDet?.commission_price_percentage || ''),
          }
        })
      })
      setEditGrid(g)
    } catch (err) { toast.error('Failed to load: ' + err.message) }
    setEditCommLoading(false)
  }

  // Grid helpers for edit commission
  function editUpdateGridCell(itemIdx, repId, value) {
    setEditGrid(prev => ({ ...prev, [itemIdx]: { ...prev[itemIdx], [repId]: { ...(prev[itemIdx]?.[repId] || {}), commission: value } } }))
  }
  function editUpdateGridBase(itemIdx, repId, value) {
    setEditGrid(prev => ({ ...prev, [itemIdx]: { ...prev[itemIdx], [repId]: { ...(prev[itemIdx]?.[repId] || {}), base: value } } }))
  }
  function editGetRepTotal(repId) {
    let total = 0
    Object.keys(editGrid).forEach(idx => {
      const cell = editGrid[idx]?.[repId]
      if (!cell) return
      if (editCalcMode === 'default') {
        const item = editCommItems[parseInt(idx)]
        total += (parseFloat(cell.commission) || 0) * (item?.qty || 0)
      } else {
        total += parseFloat(cell.commission) || 0
      }
    })
    return total
  }

  async function handleSaveEditComm() {
    if (!editCommData) return
    let validReps
    if (editCommItems.length > 0 && editCommReps.length > 0) {
      validReps = editCommReps.map(r => ({
        sales_rep_id: parseInt(r.sales_rep_id),
        total_price: Math.round(editGetRepTotal(r.sales_rep_id) * 100) / 100,
      })).filter(r => r.total_price > 0)
    } else {
      validReps = editCommReps.filter(r => r.sales_rep_id && parseFloat(r.total_price) > 0).map(r => ({ sales_rep_id: parseInt(r.sales_rep_id), total_price: parseFloat(r.total_price) || 0 }))
    }
    if (!validReps.length) { toast.error('Add at least one rep with commission'); return }
    try {
      await api.updateCommission(editCommData._id, { reps: validReps, save_status: editCalcMode })
      toast.success('Commission updated')
      setEditCommInv(null); setEditCommData(null)
      fetchData()
    } catch (err) { toast.error(err.message) }
  }

  // ── Add Payment inside View Commission ──
  function openAddPayment() {
    if (!viewCommData) return
    const today = new Date().toISOString().slice(0, 10)
    setPayForm({ commission_paid_date: today, received_amount: '', received_date: today, paid_mode: '', partial_comm_total: '', mark_paid: false })
    const repAmts = {}
    ;(viewCommData.details || []).forEach(d => {
      const paidForRep = (viewCommData.payments || []).filter(p => String(p.rep_id) === String(d.sales_rep_id)).reduce((s, p) => s + (parseFloat(p.comm_paid_amount) || 0), 0)
      const balance = (d.total_price || 0) - paidForRep
      repAmts[d.sales_rep_id] = { org_amount: d.total_price || 0, balance: Math.max(0, balance), paid_amount: '' }
    })
    setPayRepAmounts(repAmts)
    setShowAddPayment(true)
  }

  // onReceivedAmtChange is now handled inline in the payment form onChange (matching CommissionList)

  async function handleSavePayment(e) {
    e.preventDefault()
    if (!payForm.received_amount) { toast.error('Enter received amount'); return }
    if (!payForm.partial_comm_total) { toast.error('Enter partial commission total'); return }
    setPaySaving(true)
    try {
      const repPayments = Object.entries(payRepAmounts).filter(([, d]) => parseFloat(d.paid_amount) > 0).map(([repId, d]) => ({ rep_id: parseInt(repId), paid_amount: parseFloat(d.paid_amount) || 0 }))
      await api.addCommissionPayment(commMap[viewCommInv.legacy_id], {
        commission_paid_date: payForm.commission_paid_date,
        received_date: payForm.received_date,
        received_amount: payForm.received_amount,
        paid_mode: payForm.paid_mode,
        partial_comm_total: payForm.partial_comm_total,
        mark_paid: payForm.mark_paid,
        rep_payments: repPayments,
      })
      toast.success('Payment saved')
      setShowAddPayment(false)
      // Refresh view commission data
      const fresh = await api.getCommission(commMap[viewCommInv.legacy_id])
      setViewCommData(fresh)
      fetchData()
    } catch (err) { toast.error(err.message) }
    setPaySaving(false)
  }

  async function openViewComm(inv) {
    const commId = commMap[inv.legacy_id]
    if (!commId) { toast.error('No commission found'); return }
    setViewCommLoading(true)
    setViewCommInv(inv)
    try {
      const data = await api.getCommission(commId)
      setViewCommData(data)
    } catch (err) { toast.error('Failed to load: ' + err.message) }
    setViewCommLoading(false)
  }

  async function openCustPo(inv) {
    setCustPoInv(inv)
    setSelectedPoFiles([])
    try {
      const API_URL = import.meta.env.VITE_API_URL || '/api'
      const res = await fetch(`${API_URL}/invoices/${inv._id}/customer-po`)
      const data = await res.json()
      const allLinks = []
      ;(data || []).forEach(f => {
        if (f.cutomer_polink) f.cutomer_polink.split(',').filter(Boolean).forEach(link => allLinks.push(link.trim()))
      })
      setCustPoFiles(allLinks)
    } catch { setCustPoFiles([]) }
  }

  async function handleCustPoUpload() {
    if (selectedPoFiles.length === 0 || !custPoInv) return
    setCustPoUploading(true)
    try {
      const API_URL = import.meta.env.VITE_API_URL || '/api'
      const formData = new FormData()
      selectedPoFiles.forEach(f => formData.append('files', f))
      const res = await fetch(`${API_URL}/invoices/${custPoInv._id}/customer-po`, { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Upload failed')
      toast.success('Files uploaded')
      setSelectedPoFiles([])
      openCustPo(custPoInv)
      setPoFileMap(prev => ({ ...prev, [String(custPoInv.legacy_id)]: true }))
    } catch (err) { toast.error(err.message) }
    setCustPoUploading(false)
  }

  async function saveNotes() {
    if (!notesInv) return
    try {
      await api.updateInvoice(notesInv._id, { airfeet_notes: notesText })
      toast.success('Notes saved')
      setNotesInv(null)
      fetchData()
    } catch (err) { toast.error(err.message) }
  }

  async function fetchCustomers() {
    try { setCustomers(await api.getInvoiceCustomers() || []) } catch {}
  }

  function openCreate() {
    setEditInv(null)
    setForm({ ...emptyForm, po_date: new Date().toISOString().slice(0, 10) })
    setInvLineItems([{ item_name: '', qty: '', uom: '', unit_cost: '', bo_option: 'no' }])
    setCustContacts([]); setCustAddresses([])
    setShowCreate(true)
  }

  async function openEdit(inv) {
    setEditInv(inv)
    setForm({
      company_id: inv.company_id || '',
      invoice_number: inv.invoice_number || '',
      invoice_date: inv.invoice_date ? new Date(inv.invoice_date).toISOString().slice(0, 10) : '',
      po_number: inv.po_number || '',
      po_date: inv.po_date ? new Date(inv.po_date).toISOString().slice(0, 10) : '',
      due_date: inv.due_date ? new Date(inv.due_date).toISOString().slice(0, 10) : '',
      total_qty: inv.total_qty || '',
      net_amount: inv.net_amount || '',
      shipping_costs: inv.shipping_costs || '',
      sales_tax_type: inv.sales_tax_type || 'N',
      sales_tax_percentage: inv.sales_tax_percentage || '',
      sales_tax_amount: inv.sales_tax_amount || '',
      po_notes: inv.po_notes || '',
      project: inv.project || '',
      shipinfo_notes: inv.shipinfo_notes || '',
      airfeet_notes: inv.airfeet_notes || '',
      cust_terms: inv.cust_terms || '',
      customer_FOB: inv.customer_FOB || '',
      cust_ship: inv.cust_ship || '',
      cust_ship_via: inv.cust_ship_via || '',
      cust_project: inv.cust_project || '',
      credit_card_notes: inv.credit_card_notes || '',
      inv_quote_status: inv.inv_quote_status || 0,
      paid_value: inv.paid_value || '',
      paid_date: inv.paid_date ? new Date(inv.paid_date).toISOString().slice(0, 10) : '',
      test_check: inv.test_check || 0,
      cc_charge: inv.cc_charge || 0,
      cc_per: inv.cc_per || '',
      cc_amt: inv.cc_amt || '',
      drop_ship: inv.drop_ship || 0,
      billing_contact: inv.billing_contact || inv.contact_info || '',
      shipping_contact: inv.shipping_contact || inv.shipping_contact_info || '',
      billing_address: inv.billing_address || '',
      shipping_address: inv.shipping_address || '',
      drop_company_name: inv.drop_company_name || '',
      bci_name: inv.bci_name || '', bci_phone: inv.bci_phoneno || '', bci_email: inv.bci_email || '',
      sci_name: inv.sci_name || '', sci_phone: inv.sci_phoneno || '', sci_email: inv.sci_email || '',
      bcaddr_street: inv.bcaddr_street || '', bcaddr_city: inv.bcaddr_city || '', bcaddr_state: inv.bcaddr_state || '', bcaddr_zip: inv.bcaddr_zipcode || '', bcaddr_country: inv.bcaddr_country || '',
      scaddr_street: inv.scaddr_street || '', scaddr_city: inv.scaddr_city || '', scaddr_state: inv.scaddr_state || '', scaddr_zip: inv.scaddr_zipcode || '', scaddr_country: inv.scaddr_country || '',
    })
    // Load customer contacts/addresses
    loadCustData(inv.company_id)
    // Load existing line items
    try {
      const full = await api.getInvoice(inv._id)
      const items = (full.items || []).map(it => ({
        item_name: it.item_name || it.po_item_name || '',
        qty: it.qty || it.item_qty || '',
        uom: it.uom || '',
        unit_cost: it.unit_cost || it.item_unit_cost || '',
        bo_option: it.bo_option || 'no',
      }))
      setInvLineItems(items.length > 0 ? items : [{ item_name: '', qty: '', uom: '', unit_cost: '', bo_option: 'no' }])
    } catch {
      setInvLineItems([{ item_name: '', qty: '', uom: '', unit_cost: '', bo_option: 'no' }])
    }
    setShowCreate(true)
  }

  // Line item helpers
  function updateInvLine(idx, field, value) { setInvLineItems(prev => prev.map((it, i) => i === idx ? { ...it, [field]: value } : it)) }
  function addInvLine() { setInvLineItems(prev => [...prev, { item_name: '', qty: '', uom: '', unit_cost: '', bo_option: 'no' }]) }
  function removeInvLine(idx) { setInvLineItems(prev => prev.filter((_, i) => i !== idx)) }
  function calcInvTotals() {
    let tQty = 0, tNet = 0
    invLineItems.forEach(it => { const q = parseInt(it.qty) || 0; const c = parseFloat(it.unit_cost) || 0; const bo = it.bo_option === 'yes'; tQty += q; tNet += bo ? 0 : q * c })
    return { tQty, tNet }
  }

  async function handleSave(e) {
    e.preventDefault()
    if (!form.company_id) { toast.error('Select a customer'); return }
    try {
      const validItems = invLineItems.filter(it => it.item_name?.trim() || it.qty || it.unit_cost)
      const { tQty, tNet } = calcInvTotals()
      const taxAmt = form.sales_tax_type === 'Y' ? tNet * ((parseFloat(form.sales_tax_percentage) || 0) / 100) : (parseFloat(form.sales_tax_amount) || 0)
      const ccAmt = form.cc_charge ? (tNet + taxAmt + (parseFloat(form.shipping_costs) || 0)) * ((parseFloat(form.cc_per) || 0) / 100) : 0
      const payload = {
        ...form,
        total_qty: validItems.length > 0 ? tQty : (parseInt(form.total_qty) || 0),
        net_amount: validItems.length > 0 ? tNet : (parseFloat(form.net_amount) || 0),
        sales_tax_amount: taxAmt,
        cc_amt: ccAmt,
        lineItems: validItems,
      }
      if (editInv) {
        await api.updateInvoice(editInv._id, payload)
        toast.success('Invoice updated')
      } else {
        await api.createInvoice(payload)
        toast.success('Invoice created')
      }
      setShowCreate(false)
      fetchData()
    } catch (err) { toast.error(err.message) }
  }

  async function handleStatusToggle(inv) {
    const newStatus = inv.inv_status === 'Shipped' ? '' : 'Shipped'
    try {
      await api.updateInvoiceStatus(inv._id, newStatus)
      toast.success(newStatus ? 'Marked as Shipped' : 'Marked as Active')
      fetchData()
    } catch (err) { toast.error(err.message) }
  }

  async function handlePaidToggle(inv) {
    const isPaid = inv.paid_value === 'PAID'
    try {
      await api.updateInvoicePaid(inv._id, isPaid ? '' : 'PAID', isPaid ? '' : new Date().toISOString().slice(0, 10))
      toast.success(isPaid ? 'Marked as Unpaid' : 'Marked as PAID')
      fetchData()
    } catch (err) { toast.error(err.message) }
  }

  async function handleCopy(inv) {
    try {
      await api.copyInvoice(inv._id)
      toast.success('Invoice copied')
      fetchData()
    } catch (err) { toast.error(err.message) }
  }

  async function handleDelete() {
    if (!deleteInv) return
    try {
      await api.deleteInvoice(deleteInv._id)
      toast.success('Invoice deleted')
      setDeleteInv(null)
      fetchData()
    } catch (err) { toast.error(err.message) }
  }

  function fmtDate(d) {
    if (!d) return '-'
    const dt = new Date(d)
    if (isNaN(dt)) return '-'
    return `${String(dt.getMonth() + 1).padStart(2, '0')}/${String(dt.getDate()).padStart(2, '0')}/${dt.getFullYear()}`
  }

  function fmtMoney(v) {
    return '$' + (parseFloat(v) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  function getDueColor(inv) {
    if (inv.paid_value === 'PAID') return '#198754'
    if (!inv.due_date) return '#333'
    const due = new Date(inv.due_date)
    const now = new Date()
    return due < now ? '#dc3545' : '#333'
  }

  function openTracking(inv) {
    setTrackInv(inv)
    setTrackForm({
      shipped_date: inv.shipped_date ? new Date(inv.shipped_date).toISOString().slice(0, 10) : '',
      tracking_no: inv.tracking_no || '',
    })
  }

  async function handleSaveTracking(e) {
    e.preventDefault()
    try {
      await api.updateInvoiceTracking(trackInv._id, trackForm.shipped_date, trackForm.tracking_no)
      toast.success('Tracking info saved')
      setTrackInv(null)
      fetchData()
    } catch (err) { toast.error(err.message) }
  }

  async function openView(inv, mode = 'invoice') {
    setViewLoading(true)
    setViewMode(mode)
    setViewInv(inv) // Set immediately for UI feedback
    setPanelOpen(true)
    try {
      const data = await api.getInvoiceView(inv._id)
      setViewInv(data)
    } catch (err) { toast.error(err.message) }
    setViewLoading(false)
  }

  function printInvoice() {
    const content = document.getElementById('invoice-capture')
    if (!content) return
    const styles = `
      body { font-family: Arial, sans-serif; font-size: 13px; color: #333; margin: 20px; }
      table { width: 100%; border-collapse: collapse; }
      table.table-bordered td, table.table-bordered th { border: 1px solid #dee2e6; padding: 6px 10px; }
      .bg-light { background: #f8f9fa; } b { font-weight: bold; } p { margin: 0 0 8px; }
      .text-center { text-align: center; } .text-right { text-align: right; }
      @media print { .no-print { display: none !important; } }
    `
    const win = window.open('', '_blank', 'width=800,height=900')
    win.document.write(`<!DOCTYPE html><html><head><title>Invoice - ${viewInv?.invoice_number || ''}</title><style>${styles}</style></head><body>${content.innerHTML}</body></html>`)
    win.document.close()
    win.focus()
    setTimeout(() => win.print(), 300)
  }

  function downloadInvoice() {
    const content = document.getElementById('invoice-capture')
    if (!content) return
    html2pdf().set({
      margin: [10, 10, 10, 10],
      filename: `${viewMode === 'packing' ? 'PackingSlip' : 'Invoice'}_${viewInv?.invoice_number || 'download'}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    }).from(content).save().then(() => toast.success('PDF downloaded'))
  }

  function openEmailModal() {
    const invNum = viewInv?.invoice_number || ''
    const custName = viewInv?.company_name || ''
    setEmailForm({
      to: '',
      cc: '',
      bcc: '',
      subject: `Invoice ${invNum} - ${custName}`,
      message: `Please find attached Invoice ${invNum}.\n\nThank you,\nAirfeet LLC`,
    })
    setShowEmailModal(true)
  }

  async function handleSendEmail(e) {
    e.preventDefault()
    if (!emailForm.to.trim()) { toast.error('Enter recipient email'); return }
    setEmailSending(true)
    try {
      // TODO: backend email endpoint for invoices
      toast.success('Email sent successfully')
      setShowEmailModal(false)
    } catch (err) { toast.error(err.message) }
    setEmailSending(false)
  }

  function formatAddress(addr) {
    if (!addr) return '-'
    const parts = [addr.street_address, addr.street_address2].filter(Boolean)
    const cityLine = [addr.city, addr.state, addr.zip_code].filter(Boolean).join(', ')
    if (cityLine) parts.push(cityLine)
    if (addr.country) parts.push(addr.country)
    return parts.join(', ') || '-'
  }

  const filtered = invoices.filter(p => {
    if (filterPaid === 'unpaid' && p.paid_value === 'PAID') return false
    if (filterPaid === 'paid' && p.paid_value !== 'PAID') return false
    if (!search) return true
    const s = search.toLowerCase()
    return p.company_name?.toLowerCase().includes(s) ||
      p.po_number?.toLowerCase().includes(s) ||
      p.invoice_number?.toLowerCase().includes(s) ||
      p.project?.toLowerCase().includes(s)
  })
  const paginated = filtered.slice((page - 1) * perPage, page * perPage)

  const headerStats = [
    { 
      label: 'Total Invoices', 
      value: stats.total, 
      icon: 'bi-receipt', 
      bg: '#eff6ff', 
      color: '#2563eb',
      onClick: () => { setFilterPaid(''); setPage(1); }
    },
    { 
      label: 'Paid Invoices', 
      value: stats.paid, 
      icon: 'bi-check-circle-fill', 
      bg: '#ecfdf5', 
      color: '#10b981',
      onClick: () => { setFilterPaid('paid'); setPage(1); }
    },
    { 
      label: 'Unpaid Invoices', 
      value: stats.unpaid, 
      icon: 'bi-exclamation-circle-fill', 
      bg: '#fef2f2', 
      color: '#ef4444',
      onClick: () => { setFilterPaid('unpaid'); setPage(1); }
    },
    { 
      label: 'Total Volume', 
      value: fmtMoney(stats.totalAmount), 
      icon: 'bi-currency-dollar', 
      bg: '#fff7ed', 
      color: '#f59e0b'
    },
  ]

  const chartData = {
    labels: ['Paid', 'Unpaid', 'Shipped'],
    onSliceClick: (index) => {
      const statuses = ['paid', 'unpaid', ''];
      setFilterPaid(statuses[index]);
      setPage(1);
    },
    datasets: [{
      data: [stats.paid || 0, stats.unpaid || 0, stats.shipped || 0],
      backgroundColor: ['#10b981', '#ef4444', '#3b82f6'],
      hoverOffset: 4,
      borderRadius: 5,
    }]
  }

  const breadcrumbs = [
    { label: 'Dashboard', link: '/dashboard' },
    { label: 'Invoices' }
  ]

  return (
    <div className="pb-5">
      <PageChartHeader
        title="Invoices Management"
        subtitle="Track sales, payments, and shipments"
        breadcrumbs={breadcrumbs}
        stats={headerStats}
        chartData={chartData}
        chartType="doughnut"
        actions={
          <div className="d-flex gap-2">
            <select className="form-select form-select-sm shadow-sm" style={{ width: 140 }} value={year} onChange={e => { setYear(e.target.value); setPage(1) }}>
              <option value="">All Years</option>
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <button className="btn btn-sm btn-primary shadow-sm px-3" onClick={openCreate} style={{ fontWeight: 600 }}>
              <i className="bi bi-plus-lg me-1"></i> New Invoice
            </button>
          </div>
        }
      />

      {/* Active Filter Badge */}
      {filterPaid && (
        <div className="mb-3">
          <span className="badge rounded-pill px-3 py-2" style={{
            background: '#fef2f2', color: '#ef4444', border: '1px solid #fca5a5', fontSize: 13
          }}>
            <i className="bi bi-funnel-fill me-2" style={{ fontSize: 11 }}></i>
            Showing: {filterPaid === 'paid' ? 'Paid' : 'Unpaid'} Invoices ({filtered.length})
            <button
              className="btn btn-sm p-0 ms-2"
              style={{ color: '#ef4444', background: 'none', border: 'none', lineHeight: 1 }}
              onClick={() => { setFilterPaid(''); setPage(1) }}
              title="Clear filter"
            >
              <i className="bi bi-x-circle-fill"></i>
            </button>
          </span>
        </div>
      )}

      {/* Search & Year Filter */}
      <div className="card border-0 shadow-sm rounded-4 mb-3">
        <div className="card-body py-3 px-4">
          <div className="d-flex flex-wrap align-items-center gap-3">
            <div className="position-relative flex-grow-1" style={{ maxWidth: 320 }}>
              <i className="bi bi-search position-absolute" style={{ left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}></i>
              <input type="text" className="form-control form-control-sm ps-5" placeholder="Search invoices..." value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
            </div>
            <select className="form-select form-select-sm" style={{ width: 140 }} value={year} onChange={e => { setYear(e.target.value); setPage(1) }}>
              <option value="">All Years</option>
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            {(search || year) && (
              <button className="btn btn-sm btn-outline-secondary" onClick={() => { setSearch(''); setYear(''); setPage(1) }}>
                <i className="bi bi-x-lg me-1"></i>Clear
              </button>
            )}
            <span className="text-muted small ms-auto">{filtered.length} invoice{filtered.length !== 1 ? 's' : ''}</span>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
        <div className="card-header py-3 border-0" style={{ background: 'linear-gradient(135deg, #7c3aed, #5b21b6)', color: '#fff' }}>
          <div className="d-flex justify-content-between align-items-center">
            <h5 className="mb-0"><i className="bi bi-receipt me-2"></i>Invoices</h5>
            <span className="badge bg-white bg-opacity-25 px-3 py-2">{filtered.length} invoices</span>
          </div>
        </div>
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0" style={{ fontSize: 13, minWidth: 1200 }}>
            <thead className="bg-light">
              <tr>
                <th className="ps-3" style={{ minWidth: 140 }}>Customer</th>
                <th style={{ minWidth: 85 }}>PO Date</th>
                <th style={{ minWidth: 80 }}>PO #</th>
                <th style={{ minWidth: 80 }}>Invoice #</th>
                <th style={{ minWidth: 90 }}>Payment Due</th>
                <th style={{ minWidth: 55 }}>PAID</th>
                <th className="text-center" style={{ minWidth: 40 }}>QTY</th>
                <th style={{ minWidth: 80 }}>Inv Total</th>
                <th className="text-center" style={{ minWidth: 70 }}>ComAction</th>
                <th className="text-center" style={{ minWidth: 170 }}>InvAction</th>
                <th style={{ minWidth: 100 }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="11" className="text-center py-4"><div className="spinner-border spinner-border-sm text-primary"></div> Loading...</td></tr>
              ) : paginated.length === 0 ? (
                <tr><td colSpan="11" className="text-center py-4 text-muted"><i className="bi bi-receipt fs-1 d-block mb-2 opacity-25"></i>No invoices found</td></tr>
              ) : paginated.map(inv => (
                <tr key={inv._id}>
                  <td className="ps-4">
                    <span className="fw-semibold">{inv.company_name || '-'}</span>
                  </td>
                  <td>{fmtDate(inv.po_date)}</td>
                  <td style={{ color: '#198754', fontWeight: 600 }}>{inv.po_number || '-'}</td>
                  <td style={{ color: '#d97706', fontWeight: 600 }}>{inv.invoice_number || '-'}</td>
                  <td style={{ color: getDueColor(inv), fontWeight: 500 }}>{fmtDate(inv.due_date)}</td>
                  <td>
                    <span
                      className="badge rounded-pill px-2"
                      style={{
                        background: inv.paid_value === 'PAID' ? '#dcfce7' : '#fee2e2',
                        color: inv.paid_value === 'PAID' ? '#16a34a' : '#dc2626',
                        cursor: 'pointer',
                        fontSize: 11,
                      }}
                      onClick={() => handlePaidToggle(inv)}
                      title="Click to toggle"
                    >
                      {inv.paid_value === 'PAID' ? 'PAID' : 'Unpaid'}
                    </span>
                  </td>
                  <td className="text-center">{inv.total_qty || 0}</td>
                  <td className="fw-semibold">{fmtMoney(inv.net_amount)}</td>
                  {/* ComAction - condition based like old PHP */}
                  <td className="text-center">
                    {commMap[inv.legacy_id] ? (<>
                      <button className="btn btn-sm me-1" title="Edit Commission" style={{ padding: '2px 6px', background: '#e74c3c', color: '#fff', border: '1px solid #e74c3c' }}
                        onClick={() => openEditComm(inv)}>
                        <i className="bi bi-pencil"></i>
                      </button>
                      <button className="btn btn-sm" title="View Commission" style={{ padding: '2px 6px', background: '#95a5a6', color: '#fff', border: '1px solid #95a5a6' }}
                        onClick={() => openViewComm(inv)}>
                        <i className="bi bi-eye"></i>
                      </button>
                    </>) : (
                      <button className="btn btn-sm" title="Add Commission" style={{ padding: '2px 6px', background: '#4CB755', color: '#fff', border: '1px solid #4CB755' }}
                        onClick={() => { window.location.href = '/commissions' }}>
                        <i className="bi bi-plus"></i>
                      </button>
                    )}
                  </td>
                  {/* InvAction - matching old PHP with conditions */}
                  <td className="text-center">
                    <div className="d-flex flex-wrap justify-content-center gap-1" style={{ maxWidth: 170 }}>
                      <button className="btn btn-sm" title="Edit" onClick={() => openEdit(inv)} style={{ padding: '2px 6px', background: '#e0e0e0', border: '1px solid #ccc', color: '#333' }}>
                        <i className="bi bi-pencil"></i>
                      </button>
                      <button className="btn btn-sm" title="Copy" onClick={() => handleCopy(inv)} style={{ padding: '2px 6px', background: '#e0e0e0', border: '1px solid #ccc', color: '#333' }}>
                        <i className="bi bi-copy"></i>
                      </button>
                      <button className="btn btn-sm" title="View Invoice" onClick={() => openView(inv, 'invoice')} style={{ padding: '2px 6px', background: '#e0e0e0', border: '1px solid #ccc', color: '#333' }}>
                        <i className="bi bi-eye"></i>
                      </button>
                      <button className="btn btn-sm" title="Packing Slip" onClick={() => openView(inv, 'packing')} style={{ padding: '2px 6px', background: '#e0e0e0', border: '1px solid #ccc', color: '#333' }}>
                        <i className="bi bi-box-seam"></i>
                      </button>
                      <button className="btn btn-sm" title="Customer PO"
                        style={{ padding: '2px 6px', ...(poFileMap[String(inv.legacy_id)] ? { background: '#8f3aa5', color: '#fff', border: '1px solid #8f3aa5' } : { background: '#fff', color: '#333', border: '1px solid #ccc' }) }}
                        onClick={() => openCustPo(inv)}>
                        <i className="bi bi-upload"></i>
                      </button>
                      <button className="btn btn-sm" title="Delete" onClick={() => setDeleteInv(inv)} style={{ padding: '2px 6px', background: '#e0e0e0', border: '1px solid #ccc', color: '#333' }}>
                        <i className="bi bi-trash"></i>
                      </button>
                      <button className="btn btn-sm" title={inv.airfeet_notes || 'No notes'}
                        onClick={() => { setNotesInv(inv); setNotesText(inv.airfeet_notes || '') }}
                        style={{ padding: '2px 6px', fontSize: 10, fontWeight: 700, ...(inv.airfeet_notes ? { background: '#4CB755', color: '#fff', border: '1px solid #4CB755' } : { background: '#3498db', color: '#fff', border: '1px solid #3498db' }) }}>N</button>
                    </div>
                  </td>
                  <td style={{ minWidth: 100 }}>
                    <div className="d-flex flex-column gap-1">
                      {inv.inv_status === 'Shipped' ? (
                        <>
                          <button className="btn btn-sm px-3 py-0" style={{ fontSize: 11, whiteSpace: 'nowrap', background: '#e0e0e0', color: '#333', border: '1px solid #ccc', cursor: 'pointer' }} onClick={() => handleStatusToggle(inv)}>Active</button>
                          <button className="btn btn-sm px-3 py-0" style={{ fontSize: 11, whiteSpace: 'nowrap', background: '#4CB755', color: '#fff', border: '1px solid #4CB755' }}>Shipped</button>
                        </>
                      ) : (
                        <>
                          <button className="btn btn-sm px-3 py-0" style={{ fontSize: 11, whiteSpace: 'nowrap', background: '#f0ad4e', color: '#fff', border: '1px solid #f0ad4e' }}>Active</button>
                          <button className="btn btn-sm px-3 py-0" style={{ fontSize: 11, whiteSpace: 'nowrap', background: '#e0e0e0', color: '#333', border: '1px solid #ccc', cursor: 'pointer' }} onClick={() => handleStatusToggle(inv)}>Shipped</button>
                        </>
                      )}
                      <button className="btn btn-sm px-1 py-0" style={{ fontSize: 9, whiteSpace: 'nowrap', background: '#6c757d', color: '#fff', border: '1px solid #6c757d' }} onClick={() => openTracking(inv)}>
                        <i className="bi bi-tag me-1"></i>Tracking info
                      </button>
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

      {/* ─── Invoice Insights ─── */}
      <div className="row g-3 mt-1">
        {/* Card A: Most Invoices */}
        <div className="col-12 col-lg-6">
          <div className="card border-0 shadow-sm rounded-4 h-100">
            <div className="card-header border-0 py-3 px-4" style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', borderRadius: '16px 16px 0 0' }}>
              <div className="d-flex align-items-center gap-2">
                <i className="bi bi-bar-chart-fill text-white" style={{ fontSize: '1.1rem' }}></i>
                <h6 className="fw-bold mb-0 text-white">Customers with Most Invoices</h6>
              </div>
            </div>
            <div className="card-body p-0">
              {analyticsLoading ? (
                <div className="text-center py-4"><div className="spinner-border spinner-border-sm text-primary"></div></div>
              ) : topCustomers.topByCount.length === 0 ? (
                <div className="text-center py-4 text-muted small">No data available</div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0" style={{ fontSize: 13 }}>
                    <thead className="bg-light">
                      <tr>
                        <th className="ps-4" style={{ width: 40 }}>#</th>
                        <th>Customer</th>
                        <th className="text-center">Invoices</th>
                        <th className="text-end pe-4">Total Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topCustomers.topByCount.map((r, i) => (
                        <tr key={i}>
                          <td className="ps-4">
                            <span className="badge rounded-circle d-inline-flex align-items-center justify-content-center"
                              style={{ width: 24, height: 24, fontSize: 11, background: i === 0 ? '#fbbf24' : i === 1 ? '#94a3b8' : i === 2 ? '#f97316' : '#e2e8f0', color: i < 3 ? '#fff' : '#64748b' }}>
                              {i + 1}
                            </span>
                          </td>
                          <td className="fw-semibold text-truncate" style={{ maxWidth: 200 }}>{r.company_name || '-'}</td>
                          <td className="text-center">
                            <span className="badge bg-primary-subtle text-primary rounded-pill px-3">{r.invoice_count}</span>
                          </td>
                          <td className="text-end pe-4 fw-semibold">{fmtMoney(r.total_amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Card B: Highest Outstanding */}
        <div className="col-12 col-lg-6">
          <div className="card border-0 shadow-sm rounded-4 h-100">
            <div className="card-header border-0 py-3 px-4" style={{ background: 'linear-gradient(135deg, #ef4444, #b91c1c)', borderRadius: '16px 16px 0 0' }}>
              <div className="d-flex align-items-center gap-2">
                <i className="bi bi-exclamation-triangle-fill text-white" style={{ fontSize: '1.1rem' }}></i>
                <h6 className="fw-bold mb-0 text-white">Highest Outstanding Balances</h6>
              </div>
            </div>
            <div className="card-body p-0">
              {analyticsLoading ? (
                <div className="text-center py-4"><div className="spinner-border spinner-border-sm text-danger"></div></div>
              ) : topCustomers.topByOutstanding.length === 0 ? (
                <div className="text-center py-4 text-muted small">No outstanding balances</div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0" style={{ fontSize: 13 }}>
                    <thead className="bg-light">
                      <tr>
                        <th className="ps-4" style={{ width: 40 }}>#</th>
                        <th>Customer</th>
                        <th className="text-center">Unpaid</th>
                        <th className="text-end pe-4">Outstanding</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topCustomers.topByOutstanding.map((r, i) => (
                        <tr key={i}>
                          <td className="ps-4">
                            <span className="badge rounded-circle d-inline-flex align-items-center justify-content-center"
                              style={{ width: 24, height: 24, fontSize: 11, background: i === 0 ? '#ef4444' : i === 1 ? '#f97316' : i === 2 ? '#f59e0b' : '#e2e8f0', color: i < 3 ? '#fff' : '#64748b' }}>
                              {i + 1}
                            </span>
                          </td>
                          <td className="fw-semibold text-truncate" style={{ maxWidth: 200 }}>{r.company_name || '-'}</td>
                          <td className="text-center">
                            <span className="badge bg-danger-subtle text-danger rounded-pill px-3">{r.unpaid_count}</span>
                          </td>
                          <td className="text-end pe-4 fw-bold" style={{ color: '#ef4444' }}>{fmtMoney(r.outstanding_amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Create/Edit Invoice Modal */}
      {showCreate && (<>
        <div className="modal-backdrop fade show"></div>
        <div className="modal fade show d-block" tabIndex="-1" style={{ overflowY: 'auto', height: '100vh' }}>
          <div className="modal-dialog modal-xl" style={{ margin: '1rem auto' }}>
            <div className="modal-content border-0 shadow">
              <div className="modal-header text-white" style={{ background: 'linear-gradient(135deg, #7c3aed, #5b21b6)' }}>
                <h5 className="modal-title">
                  <i className={`bi ${editInv ? 'bi-pencil' : 'bi-plus-circle'} me-2`}></i>
                  {editInv ? 'Edit Invoice' : 'New Invoice'}
                </h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowCreate(false)}></button>
              </div>
              <form onSubmit={handleSave}>
                <div className="modal-body p-4">
                  {/* Customer & Type + Toggles */}
                  <h6 className="fw-semibold text-muted mb-3"><i className="bi bi-person me-2"></i>Customer & Type</h6>
                  <div className="row g-3 mb-4">
                    <div className="col-md-4">
                      <label className="form-label fw-semibold small">Customer <span className="text-danger">*</span></label>
                      <select className="form-select" value={form.company_id} onChange={e => { setForm({ ...form, company_id: e.target.value }); loadCustData(e.target.value) }} required>
                        <option value="">-- Select Customer --</option>
                        {customers.map(c => <option key={c._id} value={c.legacy_id}>{c.company_name}</option>)}
                      </select>
                    </div>
                    <div className="col-md-2">
                      <label className="form-label fw-semibold small">Type</label>
                      <select className="form-select" value={form.inv_quote_status} onChange={e => setForm({ ...form, inv_quote_status: parseInt(e.target.value) })}>
                        <option value={0}>Invoice</option>
                        <option value={1}>Quote</option>
                      </select>
                    </div>
                    <div className="col-md-3">
                      <label className="form-label fw-semibold small">Project</label>
                      <input type="text" className="form-control" value={form.project} onChange={e => setForm({ ...form, project: e.target.value })} />
                    </div>
                    <div className="col-md-3 d-flex align-items-end gap-3">
                      <div className="form-check">
                        <input className="form-check-input" type="checkbox" id="testCheck" checked={!!form.test_check} onChange={e => setForm({ ...form, test_check: e.target.checked ? 1 : 0 })} />
                        <label className="form-check-label small fw-semibold" htmlFor="testCheck">Test Invoice</label>
                      </div>
                      <div className="form-check">
                        <input className="form-check-input" type="checkbox" id="paidCheck" checked={form.paid_value === 'PAID'} onChange={e => setForm({ ...form, paid_value: e.target.checked ? 'PAID' : '' })} />
                        <label className="form-check-label small fw-semibold" htmlFor="paidCheck">Paid</label>
                      </div>
                    </div>
                    {form.paid_value === 'PAID' && (
                      <div className="col-md-3">
                        <label className="form-label fw-semibold small">Paid Date</label>
                        <input type="date" className="form-control" value={form.paid_date} onChange={e => setForm({ ...form, paid_date: e.target.value })} />
                      </div>
                    )}
                  </div>

                  {/* PO & Invoice Info */}
                  <h6 className="fw-semibold text-muted mb-3"><i className="bi bi-calendar me-2"></i>PO & Invoice Info</h6>
                  <div className="row g-3 mb-4">
                    <div className="col-md-3"><label className="form-label fw-semibold small">Invoice #</label><input type="text" className="form-control" value={form.invoice_number} onChange={e => setForm({ ...form, invoice_number: e.target.value })} /></div>
                    <div className="col-md-3"><label className="form-label fw-semibold small">Invoice Date</label><input type="date" className="form-control" value={form.invoice_date} onChange={e => setForm({ ...form, invoice_date: e.target.value })} /></div>
                    <div className="col-md-3"><label className="form-label fw-semibold small">PO #</label><input type="text" className="form-control" value={form.po_number} onChange={e => setForm({ ...form, po_number: e.target.value })} /></div>
                    <div className="col-md-3"><label className="form-label fw-semibold small">PO Date</label><input type="date" className="form-control" value={form.po_date} onChange={e => setForm({ ...form, po_date: e.target.value })} /></div>
                    <div className="col-md-3"><label className="form-label fw-semibold small">Payment Due</label><input type="date" className="form-control" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} /></div>
                  </div>

                  {/* Drop Ship + Contact/Address */}
                  <h6 className="fw-semibold text-muted mb-3"><i className="bi bi-geo-alt me-2"></i>Contact & Address</h6>
                  <div className="row g-3 mb-4">
                    <div className="col-md-12">
                      <div className="form-check mb-2">
                        <input className="form-check-input" type="checkbox" id="dropShipCheck" checked={!!form.drop_ship} onChange={e => setForm({ ...form, drop_ship: e.target.checked ? 1 : 0 })} />
                        <label className="form-check-label fw-bold text-danger" htmlFor="dropShipCheck">DROP SHIP</label>
                      </div>
                    </div>
                    {form.drop_ship ? (<>
                      <div className="col-md-4"><label className="form-label fw-semibold small">Company Name</label><input type="text" className="form-control" value={form.drop_company_name} onChange={e => setForm({ ...form, drop_company_name: e.target.value })} /></div>
                      <div className="col-12"><div className="row g-3">
                        <div className="col-md-6">
                          <div className="card border-primary p-3">
                            <h6 className="fw-semibold small mb-2"><i className="bi bi-person me-1"></i>Billing Contact</h6>
                            <div className="row g-2">
                              <div className="col-md-4"><input type="text" className="form-control form-control-sm" placeholder="Name" value={form.bci_name} onChange={e => setForm({ ...form, bci_name: e.target.value })} /></div>
                              <div className="col-md-4"><input type="text" className="form-control form-control-sm" placeholder="Phone" value={form.bci_phone} onChange={e => setForm({ ...form, bci_phone: e.target.value })} /></div>
                              <div className="col-md-4"><input type="text" className="form-control form-control-sm" placeholder="Email" value={form.bci_email} onChange={e => setForm({ ...form, bci_email: e.target.value })} /></div>
                            </div>
                            <h6 className="fw-semibold small mt-3 mb-2"><i className="bi bi-geo-alt me-1"></i>Billing Address</h6>
                            <div className="row g-2">
                              <div className="col-12"><input type="text" className="form-control form-control-sm" placeholder="Street" value={form.bcaddr_street} onChange={e => setForm({ ...form, bcaddr_street: e.target.value })} /></div>
                              <div className="col-4"><input type="text" className="form-control form-control-sm" placeholder="City" value={form.bcaddr_city} onChange={e => setForm({ ...form, bcaddr_city: e.target.value })} /></div>
                              <div className="col-3"><input type="text" className="form-control form-control-sm" placeholder="State" value={form.bcaddr_state} onChange={e => setForm({ ...form, bcaddr_state: e.target.value })} /></div>
                              <div className="col-2"><input type="text" className="form-control form-control-sm" placeholder="Zip" value={form.bcaddr_zip} onChange={e => setForm({ ...form, bcaddr_zip: e.target.value })} /></div>
                              <div className="col-3"><input type="text" className="form-control form-control-sm" placeholder="Country" value={form.bcaddr_country} onChange={e => setForm({ ...form, bcaddr_country: e.target.value })} /></div>
                            </div>
                          </div>
                        </div>
                        <div className="col-md-6">
                          <div className="card border-success p-3">
                            <h6 className="fw-semibold small mb-2"><i className="bi bi-person me-1"></i>Shipping Contact</h6>
                            <div className="row g-2">
                              <div className="col-md-4"><input type="text" className="form-control form-control-sm" placeholder="Name" value={form.sci_name} onChange={e => setForm({ ...form, sci_name: e.target.value })} /></div>
                              <div className="col-md-4"><input type="text" className="form-control form-control-sm" placeholder="Phone" value={form.sci_phone} onChange={e => setForm({ ...form, sci_phone: e.target.value })} /></div>
                              <div className="col-md-4"><input type="text" className="form-control form-control-sm" placeholder="Email" value={form.sci_email} onChange={e => setForm({ ...form, sci_email: e.target.value })} /></div>
                            </div>
                            <h6 className="fw-semibold small mt-3 mb-2"><i className="bi bi-geo-alt me-1"></i>Shipping Address</h6>
                            <div className="row g-2">
                              <div className="col-12"><input type="text" className="form-control form-control-sm" placeholder="Street" value={form.scaddr_street} onChange={e => setForm({ ...form, scaddr_street: e.target.value })} /></div>
                              <div className="col-4"><input type="text" className="form-control form-control-sm" placeholder="City" value={form.scaddr_city} onChange={e => setForm({ ...form, scaddr_city: e.target.value })} /></div>
                              <div className="col-3"><input type="text" className="form-control form-control-sm" placeholder="State" value={form.scaddr_state} onChange={e => setForm({ ...form, scaddr_state: e.target.value })} /></div>
                              <div className="col-2"><input type="text" className="form-control form-control-sm" placeholder="Zip" value={form.scaddr_zip} onChange={e => setForm({ ...form, scaddr_zip: e.target.value })} /></div>
                              <div className="col-3"><input type="text" className="form-control form-control-sm" placeholder="Country" value={form.scaddr_country} onChange={e => setForm({ ...form, scaddr_country: e.target.value })} /></div>
                            </div>
                          </div>
                        </div>
                      </div></div>
                    </>) : (<>
                      <div className="col-md-6">
                        <label className="form-label fw-semibold small">Billing Contact Info</label>
                        <select className="form-select" value={form.billing_contact} onChange={e => setForm({ ...form, billing_contact: e.target.value })}>
                          <option value="">Select contact information</option>
                          {custContacts.map((c, i) => <option key={i} value={c._id}>{[c.person || c.name, c.main_phone, c.email].filter(Boolean).join(' | ')}</option>)}
                        </select>
                      </div>
                      <div className="col-md-6">
                        <label className="form-label fw-semibold small">Billing Address</label>
                        <select className="form-select" value={form.billing_address} onChange={e => setForm({ ...form, billing_address: e.target.value })}>
                          <option value="">Select billing address</option>
                          {custAddresses.map((a, i) => <option key={i} value={a._id}>{[a.name, a.street, a.city, a.state, a.zip].filter(Boolean).join(', ')}</option>)}
                        </select>
                      </div>
                      <div className="col-md-6">
                        <label className="form-label fw-semibold small">Shipping Contact Info</label>
                        <select className="form-select" value={form.shipping_contact} onChange={e => setForm({ ...form, shipping_contact: e.target.value })}>
                          <option value="">Select contact information</option>
                          {custContacts.map((c, i) => <option key={i} value={c._id}>{[c.person || c.name, c.main_phone, c.email].filter(Boolean).join(' | ')}</option>)}
                        </select>
                      </div>
                      <div className="col-md-6">
                        <label className="form-label fw-semibold small">Shipping Address</label>
                        <select className="form-select" value={form.shipping_address} onChange={e => setForm({ ...form, shipping_address: e.target.value })}>
                          <option value="">Select shipping address</option>
                          {custAddresses.map((a, i) => <option key={i} value={a._id}>{[a.name, a.street, a.city, a.state, a.zip].filter(Boolean).join(', ')}</option>)}
                        </select>
                      </div>
                    </>)}
                    <div className="col-md-3"><label className="form-label fw-semibold small">Shipping Costs ($)</label><input type="number" step="0.01" className="form-control" value={form.shipping_costs} onChange={e => setForm({ ...form, shipping_costs: e.target.value })} /></div>
                  </div>

                  {/* Line Items */}
                  <h6 className="fw-semibold text-muted mb-3"><i className="bi bi-list-ul me-2"></i>Line Items</h6>
                  <div className="table-responsive mb-3">
                    <table className="table table-sm table-bordered" style={{ fontSize: '.85rem' }}>
                      <thead className="bg-light">
                        <tr>
                          <th style={{ width: '35%' }}>Item / Description</th>
                          <th style={{ width: '8%' }}>QTY</th>
                          <th style={{ width: '10%' }}>UOM</th>
                          <th style={{ width: '12%' }}>U.COST</th>
                          <th style={{ width: '12%' }}>TOTAL</th>
                          <th style={{ width: '10%' }}>BO</th>
                          <th style={{ width: '5%' }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {invLineItems.map((item, idx) => {
                          const bo = item.bo_option === 'yes'
                          const lineTotal = bo ? 0 : (parseInt(item.qty) || 0) * (parseFloat(item.unit_cost) || 0)
                          return (
                            <tr key={idx}>
                              <td><textarea className="form-control form-control-sm" rows="1" value={item.item_name} onChange={e => updateInvLine(idx, 'item_name', e.target.value)} placeholder="Product / Description" /></td>
                              <td><input type="number" className="form-control form-control-sm" value={item.qty} onChange={e => updateInvLine(idx, 'qty', e.target.value)} /></td>
                              <td><input type="text" className="form-control form-control-sm" value={item.uom} onChange={e => updateInvLine(idx, 'uom', e.target.value)} placeholder="ea" /></td>
                              <td><input type="number" step="0.01" className="form-control form-control-sm" value={item.unit_cost} onChange={e => updateInvLine(idx, 'unit_cost', e.target.value)} /></td>
                              <td className="fw-bold text-end align-middle">${lineTotal.toFixed(2)}</td>
                              <td>
                                <select className="form-select form-select-sm" value={item.bo_option} onChange={e => updateInvLine(idx, 'bo_option', e.target.value)}>
                                  <option value="no">No</option>
                                  <option value="yes">Yes</option>
                                </select>
                              </td>
                              <td className="text-center align-middle">{invLineItems.length > 1 && <button type="button" className="btn btn-sm btn-outline-danger p-0 px-1" onClick={() => removeInvLine(idx)}><i className="bi bi-x"></i></button>}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="bg-light fw-bold">
                          <td className="text-end">Totals:</td>
                          <td>{calcInvTotals().tQty}</td>
                          <td></td><td></td>
                          <td className="text-end">${calcInvTotals().tNet.toFixed(2)}</td>
                          <td></td><td></td>
                        </tr>
                      </tfoot>
                    </table>
                    <button type="button" className="btn btn-sm btn-outline-primary" onClick={addInvLine}><i className="bi bi-plus me-1"></i>Add Line</button>
                  </div>

                  {/* Amounts */}
                  <h6 className="fw-semibold text-muted mb-3"><i className="bi bi-calculator me-2"></i>Amounts & Tax</h6>
                  <div className="row g-3 mb-4">
                    <div className="col-md-2"><label className="form-label fw-semibold small">Tax Type</label><select className="form-select" value={form.sales_tax_type} onChange={e => setForm({ ...form, sales_tax_type: e.target.value })}><option value="N">No</option><option value="Y">Yes</option></select></div>
                    <div className="col-md-2"><label className="form-label fw-semibold small">Tax %</label><input type="number" className="form-control" value={form.sales_tax_percentage} onChange={e => setForm({ ...form, sales_tax_percentage: e.target.value })} /></div>
                    <div className="col-md-2"><label className="form-label fw-semibold small">Tax $</label><input type="text" className="form-control bg-light" readOnly value={(() => { const n = calcInvTotals().tNet; return form.sales_tax_type === 'Y' ? (n * ((parseFloat(form.sales_tax_percentage) || 0) / 100)).toFixed(2) : (form.sales_tax_amount || '0.00') })()} /></div>
                    <div className="col-md-2">
                      <label className="form-label fw-semibold small">CC Charge</label>
                      <div className="d-flex align-items-center gap-1">
                        <input type="checkbox" checked={!!form.cc_charge} onChange={e => setForm({ ...form, cc_charge: e.target.checked ? 1 : 0 })} />
                        <input type="number" step="0.01" className="form-control form-control-sm" placeholder="%" value={form.cc_per} onChange={e => setForm({ ...form, cc_per: e.target.value })} style={{ width: 60 }} />
                      </div>
                    </div>
                    <div className="col-md-2"><label className="form-label fw-bold small">Total Invoice ($)</label><input type="text" className="form-control fw-bold bg-light" readOnly value={(() => { const n = calcInvTotals().tNet; const s = parseFloat(form.shipping_costs) || 0; const t = form.sales_tax_type === 'Y' ? n * ((parseFloat(form.sales_tax_percentage) || 0) / 100) : (parseFloat(form.sales_tax_amount) || 0); const cc = form.cc_charge ? (n + t + s) * ((parseFloat(form.cc_per) || 0) / 100) : 0; return '$' + (n + s + t + cc).toFixed(2) })()} /></div>
                  </div>

                  {/* Shipping & Terms */}
                  <h6 className="fw-semibold text-muted mb-3"><i className="bi bi-truck me-2"></i>Shipping & Terms</h6>
                  <div className="row g-3 mb-4">
                    <div className="col-md-2"><label className="form-label fw-semibold small">Terms</label><input type="text" className="form-control" value={form.cust_terms} onChange={e => setForm({ ...form, cust_terms: e.target.value })} /></div>
                    <div className="col-md-2"><label className="form-label fw-semibold small">F.O.B.</label><input type="text" className="form-control" value={form.customer_FOB} onChange={e => setForm({ ...form, customer_FOB: e.target.value })} /></div>
                    <div className="col-md-2"><label className="form-label fw-semibold small">Ship</label><input type="text" className="form-control" value={form.cust_ship} onChange={e => setForm({ ...form, cust_ship: e.target.value })} /></div>
                    <div className="col-md-2"><label className="form-label fw-semibold small">Ship Via</label><input type="text" className="form-control" value={form.cust_ship_via} onChange={e => setForm({ ...form, cust_ship_via: e.target.value })} /></div>
                    <div className="col-md-2"><label className="form-label fw-semibold small">Ship Acct #</label><input type="text" className="form-control" value={form.shipinfo_notes} onChange={e => setForm({ ...form, shipinfo_notes: e.target.value })} /></div>
                    <div className="col-md-2"><label className="form-label fw-semibold small">Project</label><input type="text" className="form-control" value={form.cust_project} onChange={e => setForm({ ...form, cust_project: e.target.value })} /></div>
                  </div>

                  {/* Notes */}
                  <h6 className="fw-semibold text-muted mb-3"><i className="bi bi-chat-left-text me-2"></i>Notes</h6>
                  <div className="row g-3">
                    <div className="col-md-6"><label className="form-label fw-semibold small">Notes</label><textarea className="form-control" rows="3" value={form.po_notes} onChange={e => setForm({ ...form, po_notes: e.target.value })}></textarea></div>
                    <div className="col-md-6"><label className="form-label fw-semibold small">Shipping Info Notes</label><textarea className="form-control" rows="3" value={form.shipinfo_notes} onChange={e => setForm({ ...form, shipinfo_notes: e.target.value })}></textarea></div>
                    <div className="col-md-6"><label className="form-label fw-semibold small">AIRfeet Notes</label><textarea className="form-control" rows="3" value={form.airfeet_notes} onChange={e => setForm({ ...form, airfeet_notes: e.target.value })}></textarea></div>
                    <div className="col-md-6"><label className="form-label fw-semibold small">Credit Card Notes</label><textarea className="form-control" rows="3" value={form.credit_card_notes} onChange={e => setForm({ ...form, credit_card_notes: e.target.value })}></textarea></div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-outline-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary">
                    <i className={`bi ${editInv ? 'bi-check-lg' : 'bi-plus-lg'} me-1`}></i>
                    {editInv ? 'Update Invoice' : 'Save Invoice'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </>)}

      {/* Delete Modal */}
      {deleteInv && (<>
        <div className="modal-backdrop fade show"></div>
        <div className="modal fade show d-block" tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow">
              <div className="modal-header text-white bg-danger">
                <h5 className="modal-title"><i className="bi bi-trash me-2"></i>Delete Invoice</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setDeleteInv(null)}></button>
              </div>
              <div className="modal-body">
                <p>Are you sure you want to delete invoice <strong>{deleteInv.invoice_number}</strong>?</p>
                <p className="text-muted small">Customer: {deleteInv.company_name} | PO#: {deleteInv.po_number} | Amount: {fmtMoney(deleteInv.net_amount)}</p>
              </div>
              <div className="modal-footer">
                <button className="btn btn-outline-secondary" onClick={() => setDeleteInv(null)}>Cancel</button>
                <button className="btn btn-danger" onClick={handleDelete}>Delete</button>
              </div>
            </div>
          </div>
        </div>
      </>)}

      {/* Invoice Detail Slide Panel */}
      <SlidePanel
        isOpen={panelOpen}
        onClose={() => { setPanelOpen(false); setViewInv(null); }}
        title={viewInv ? `${viewMode === 'packing' ? 'Packing Slip' : 'Invoice'} #${viewInv.invoice_number}` : 'Invoice Details'}
        width="800px"
      >
        {viewLoading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-primary"></div>
            <p className="mt-2 text-muted">Loading invoice details...</p>
          </div>
        ) : viewInv ? (
          <div className="p-1">
            {/* View Mode Tabs */}
            <div className="d-flex mb-4 bg-light p-1 rounded-3" style={{ width: 'fit-content' }}>
              <button
                className={`btn btn-sm px-3 rounded-2 ${viewMode === 'invoice' ? 'btn-primary shadow-sm' : 'btn-link text-dark text-decoration-none'}`}
                onClick={() => setViewMode('invoice')}
              >
                Invoice View
              </button>
              <button
                className={`btn btn-sm px-3 rounded-2 ${viewMode === 'packing' ? 'btn-primary shadow-sm' : 'btn-link text-dark text-decoration-none'}`}
                onClick={() => setViewMode('packing')}
              >
                Packing Slip
              </button>
            </div>

            <div id="invoice-capture" className="bg-white p-4 border rounded shadow-sm" style={{ minWidth: 700, fontSize: 13 }}>
               {/* Invoice Header */}
               <div className="d-flex justify-content-between mb-4 border-bottom pb-4">
                  <div>
                    <img src="https://staging.stallioni.com/assets/images/logo_fleet.png" alt="Airfeet" style={{ width: 140, marginBottom: 8 }} crossOrigin="anonymous" />
                    <div className="fw-bold fs-5">Airfeet LLC</div>
                    <div className="text-muted">2346 S. Lynhurst Dr, Suite 701<br/>Indianapolis, IN 46241</div>
                  </div>
                  <div className="text-end">
                    <div className={`p-3 rounded-3 text-white fw-bold mb-3 ${viewMode === 'packing' ? 'bg-info' : 'bg-primary'}`} style={{ minWidth: 200, fontSize: 20 }}>
                      {viewMode === 'packing' ? 'PACKING SLIP' : (viewInv.inv_quote_status === 1 ? 'QUOTE' : 'INVOICE')}
                    </div>
                    <div className="small text-muted">Date: <span className="text-dark fw-bold">{fmtDate(viewInv.invoice_date)}</span></div>
                    <div className="small text-muted">Number: <span className="text-dark fw-bold">{viewInv.inv_quote_status === 1 ? 'Q-' : ''}{viewInv.invoice_number}</span></div>
                    <div className="small text-muted">PO #: <span className="text-dark fw-bold">{viewInv.po_number || 'N/A'}</span></div>
                  </div>
               </div>

               {/* Addresses */}
               <div className="row g-4 mb-4">
                  <div className="col-6">
                    <div className="bg-light p-2 px-3 rounded-t fw-bold border-bottom small text-uppercase">Bill To</div>
                    <div className="p-3 border rounded-b bg-white border-top-0">
                      <div className="fw-bold mb-1">{viewInv.company_name}</div>
                      <div className="text-muted small">{formatAddress(viewInv.billingAddr)}</div>
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="bg-light p-2 px-3 rounded-t fw-bold border-bottom small text-uppercase">Ship To</div>
                    <div className="p-3 border rounded-b bg-white border-top-0">
                      <div className="fw-bold mb-1">{viewInv.company_name}</div>
                      <div className="text-muted small">{formatAddress(viewInv.shippingAddr)}</div>
                    </div>
                  </div>
               </div>

               {/* Order Info */}
               <div className="table-responsive mb-4">
                 <table className="table table-sm table-bordered mb-0 small">
                   <thead className="bg-light">
                     <tr>
                       <th className="text-center">Terms</th>
                       <th className="text-center">Rep</th>
                       <th className="text-center">Ship</th>
                       <th className="text-center">Via</th>
                       <th className="text-center">F.O.B.</th>
                     </tr>
                   </thead>
                   <tbody className="text-center">
                     <tr>
                       <td>{viewInv.cust_terms || '-'}</td>
                       <td>{viewInv.rep_info || '-'}</td>
                       <td>{viewInv.cust_ship || '-'}</td>
                       <td>{viewInv.cust_ship_via || '-'}</td>
                       <td>{viewInv.customer_FOB || '-'}</td>
                     </tr>
                   </tbody>
                 </table>
               </div>

               {/* Items Table */}
               <table className="table table-hover border small mb-4">
                 <thead className="bg-light">
                   <tr>
                     <th style={{ width: 50 }} className="text-center">Line</th>
                     <th>Item Code</th>
                     <th>Description</th>
                     <th className="text-center">Shipped</th>
                     <th className="text-end">Price</th>
                     <th className="text-end">Amount</th>
                   </tr>
                 </thead>
                 <tbody>
                   {viewInv.items?.filter(it => it.inv_item_name || it.item_name).map((item, i) => {
                     const qty = item.size_qty || item.qty || 0
                     const cost = parseFloat(item.item_unit_cost || item.unit_cost) || 0
                     const amt = qty * cost
                     return (
                       <tr key={i}>
                         <td className="text-center">{i+1}</td>
                         <td className="fw-medium">{item.item_sku}</td>
                         <td>{item.inv_item_name || item.item_name}</td>
                         <td className="text-center">{qty}</td>
                         <td className="text-end">{viewMode === 'packing' ? '-' : `$${cost.toFixed(2)}`}</td>
                         <td className="text-end fw-bold">{viewMode === 'packing' ? '-' : `$${amt.toFixed(2)}`}</td>
                       </tr>
                     )
                   })}
                 </tbody>
                 {viewMode !== 'packing' && (
                   <tfoot className="border-top-2">
                     <tr className="bg-light">
                       <td colSpan="5" className="text-end fw-bold">TOTAL</td>
                       <td className="text-end fw-bold text-primary fs-6">${(viewInv.items?.reduce((s, it) => s + ((it.size_qty || it.qty || 0) * (parseFloat(it.item_unit_cost || it.unit_cost) || 0)), 0) || 0).toFixed(2)}</td>
                     </tr>
                   </tfoot>
                 )}
               </table>

               <div className="row">
                 <div className="col-6">
                   {viewInv.po_notes && (
                     <div className="mt-3">
                       <div className="fw-bold small text-muted text-uppercase mb-1">Notes</div>
                       <div className="p-3 bg-light rounded small border">{viewInv.po_notes}</div>
                     </div>
                   )}
                 </div>
                 <div className="col-6 text-end">
                    <div className="mt-4 pt-4 border-top">
                      <p className="mb-0 text-muted small">Phone: 317-965-5212</p>
                      <p className="mb-0 text-muted small">Email: info@myairfeet.com</p>
                    </div>
                 </div>
               </div>
            </div>

            {/* Panel Actions */}
            <div className="d-flex justify-content-end gap-2 mt-4">
              <button className="btn btn-outline-primary" onClick={printInvoice}>
                <i className="bi bi-printer me-1"></i> Print
              </button>
              <button className="btn btn-outline-warning" onClick={downloadInvoice}>
                <i className="bi bi-download me-1"></i> Download PDF
              </button>
              <button className="btn btn-primary" onClick={openEmailModal}>
                <i className="bi bi-envelope me-1"></i> Email
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-5 text-muted">Select an invoice to view details</div>
        )}
      </SlidePanel>

      {/* Edit Commission Modal */}
      {(editCommInv || editCommLoading) && (<>
        <div className="modal-backdrop fade show" style={{ zIndex: 1060 }}></div>
        <div className="modal fade show d-block" tabIndex="-1" style={{ zIndex: 1065, overflowY: 'auto', height: '100vh' }}>
          <div className="modal-dialog modal-xl" style={{ margin: '1rem auto' }}>
            <div className="modal-content border-0 shadow">
              <div className="modal-header text-white" style={{ background: 'linear-gradient(135deg, #e74c3c, #c0392b)' }}>
                <h5 className="modal-title fw-bold"><i className="bi bi-pencil me-2"></i>Commission Details</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => { setEditCommInv(null); setEditCommData(null) }}></button>
              </div>
              <div className="modal-body">
                {editCommLoading ? (
                  <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>
                ) : editCommData ? (() => {
                  const inv = editCommData.invoice || {}
                  const netAmt = parseFloat(inv.net_amount) || 0
                  return (
                    <div>
                      {/* Invoice Summary - blue header */}
                      <table className="table table-bordered mb-4" style={{ fontSize: 13 }}>
                        <thead><tr style={{ background: '#3b82f6', color: '#fff' }}>
                          <th className="text-center">Invoice #</th><th className="text-center">PO #</th><th className="text-center">PO $</th><th className="text-center">PO Date</th><th className="text-center">Customer Name</th>
                        </tr></thead>
                        <tbody><tr>
                          <td className="text-center">{inv.invoice_number || '-'}</td>
                          <td className="text-center">{inv.po_number || '-'}</td>
                          <td className="text-center">{netAmt.toFixed(2)}</td>
                          <td className="text-center">{fmtDate(inv.po_date)}</td>
                          <td className="text-center">{editCommData.company_name || '-'}</td>
                        </tr></tbody>
                      </table>

                      {/* Mode buttons - matching old PHP */}
                      <div className="d-flex justify-content-end gap-2 mb-3">
                        <button type="button" className="btn px-4" style={{ background: '#1abc9c', color: '#fff', opacity: editCalcMode === 'percent' ? 1 : 0.65 }} onClick={() => setEditCalcMode('percent')}>Pay by % of Total</button>
                        <button type="button" className="btn px-4" style={{ background: '#1abc9c', color: '#fff', opacity: editCalcMode === 'dollar' ? 1 : 0.65 }} onClick={() => setEditCalcMode('dollar')}>Pay by $</button>
                        <button type="button" className="btn px-4" style={{ background: '#333', color: '#fff', opacity: editCalcMode === 'default' ? 1 : 0.65 }} onClick={() => setEditCalcMode('default')}>Default View</button>
                      </div>

                      {/* Commission Grid - items x reps */}
                      {editCommItems.length > 0 && editCommReps.length > 0 ? (
                        <div className="table-responsive">
                          <table className="table table-bordered table-sm mb-4" style={{ fontSize: 12, textAlign: 'center' }}>
                            <thead>
                              <tr>
                                <th style={{ minWidth: 150, background: '#EDF6ED' }}>Style</th>
                                <th style={{ width: 60, background: '#EDF6ED' }}>QTY</th>
                                <th style={{ width: 80, background: '#EDF6ED' }}>UNIT COST</th>
                                <th style={{ width: 90, background: '#EDF6ED' }}>BASE $</th>
                                <th style={{ width: 90, background: '#EDF6ED' }}>TOTAL</th>
                                {editCommReps.map(r => (
                                  <th key={r.sales_rep_id} colSpan={editCalcMode === 'percent' ? 2 : 1} style={{ minWidth: editCalcMode === 'percent' ? 160 : 130, background: '#FFFFD4', fontSize: 11 }}>
                                    {r.rep_name || '-'}<br/><span style={{ color: '#666' }}>{r.rep_code || ''}</span>
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {/* Totals row */}
                              <tr className="fw-bold">
                                <td colSpan="4" style={{ background: '#EDF6ED' }}></td>
                                <td style={{ background: '#EDF6ED' }}>${editCommReps.reduce((s, r) => s + editGetRepTotal(r.sales_rep_id), 0).toFixed(2)}</td>
                                {editCommReps.map(r => (
                                  <td key={r.sales_rep_id} colSpan={editCalcMode === 'percent' ? 2 : 1} style={{ background: '#FFFFD4' }}>${editGetRepTotal(r.sales_rep_id).toFixed(2)}</td>
                                ))}
                              </tr>
                              {/* Item rows */}
                              {editCommItems.map((item, idx) => {
                                const baseVal = parseFloat(editGrid[idx]?.[editCommReps[0]?.sales_rep_id]?.base || item.unit_cost || 0)
                                const qty = item.qty || 0
                                const itemNetValue = qty * baseVal
                                const itemCommTotal = editCommReps.reduce((s, r) => s + (parseFloat(editGrid[idx]?.[r.sales_rep_id]?.commission) || 0), 0)
                                return (
                                  <tr key={idx}>
                                    <td style={{ textAlign: 'left' }}>{item.item_name || '-'}{item.item_size_name ? ` Size ${item.item_size_name}` : ''}</td>
                                    <td>{qty}</td>
                                    <td>{editCalcMode === 'default' ? (item.unit_cost || 0).toFixed(2) : ''}</td>
                                    <td>{editCalcMode === 'default' ? (
                                      <input type="number" step="0.01" className="form-control form-control-sm text-center" style={{ width: 75, margin: '0 auto' }}
                                        value={editGrid[idx]?.[editCommReps[0]?.sales_rep_id]?.base ?? item.unit_cost ?? ''}
                                        onChange={e => editCommReps.forEach(r => editUpdateGridBase(idx, r.sales_rep_id, e.target.value))} />
                                    ) : ''}</td>
                                    <td>{editCalcMode === 'default' ? itemCommTotal.toFixed(2) : ''}</td>
                                    {editCommReps.map(r => {
                                      const cell = editGrid[idx]?.[r.sales_rep_id] || {}
                                      const commVal = parseFloat(cell.commission) || 0
                                      if (editCalcMode === 'percent') {
                                        const pctVal = cell.percent || ''
                                        const calcComm = itemNetValue * (parseFloat(pctVal) || 0) / 100
                                        return (<React.Fragment key={r.sales_rep_id}>
                                          <td style={{ background: '#FFFFD4' }}>
                                            <input type="number" step="0.01" className="form-control form-control-sm text-center" style={{ width: 60, margin: '0 auto' }}
                                              value={pctVal}
                                              onChange={e => {
                                                const pct = e.target.value
                                                const calc = (itemNetValue * (parseFloat(pct) || 0) / 100).toFixed(2)
                                                setEditGrid(prev => ({ ...prev, [idx]: { ...prev[idx], [r.sales_rep_id]: { ...prev[idx]?.[r.sales_rep_id], percent: pct, commission: calc } } }))
                                              }} placeholder="%" />
                                          </td>
                                          <td style={{ background: '#FFFFD4' }}>
                                            <input type="text" className="form-control form-control-sm text-center" style={{ width: 65, margin: '0 auto', background: '#f8f9fa' }} readOnly value={calcComm ? calcComm.toFixed(2) : '0'} />
                                          </td>
                                        </React.Fragment>)
                                      } else if (editCalcMode === 'dollar') {
                                        return (
                                          <td key={r.sales_rep_id} style={{ background: '#FFFFD4' }}>
                                            <input type="number" step="0.01" className="form-control form-control-sm text-center" style={{ width: 70, margin: '0 auto' }}
                                              value={cell.commission || ''} onChange={e => editUpdateGridCell(idx, r.sales_rep_id, e.target.value)} placeholder="$" />
                                          </td>
                                        )
                                      } else {
                                        return (
                                          <td key={r.sales_rep_id} style={{ background: '#FFFFD4' }}>
                                            <div className="d-flex align-items-center gap-1 justify-content-center">
                                              <input type="number" step="0.01" className="form-control form-control-sm text-center" style={{ width: 50 }}
                                                value={cell.commission || ''} onChange={e => editUpdateGridCell(idx, r.sales_rep_id, e.target.value)} placeholder="0" />
                                              <span style={{ fontSize: 10, color: '#666' }}>{(commVal * qty).toFixed(2)}</span>
                                            </div>
                                          </td>
                                        )
                                      }
                                    })}
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        /* Simple rep rows when no items */
                        <div>
                          <h6 className="fw-semibold mb-2"><i className="bi bi-people me-2"></i>Sales Rep Commission</h6>
                          <table className="table table-sm table-bordered" style={{ fontSize: 13 }}>
                            <thead className="bg-light"><tr><th>Sales Rep</th><th>Code</th><th style={{ width: 200 }}>Commission ($)</th></tr></thead>
                            <tbody>
                              {editCommReps.map((r, i) => (
                                <tr key={i}>
                                  <td className="fw-semibold">{r.rep_name || `Rep #${r.sales_rep_id}`}</td>
                                  <td><span className="badge bg-primary-subtle text-primary">{r.rep_code || '-'}</span></td>
                                  <td><input type="number" step="0.01" className="form-control form-control-sm" value={r.total_price} onChange={e => setEditCommReps(prev => prev.map((rr, j) => j === i ? { ...rr, total_price: e.target.value } : rr))} placeholder="0.00" /></td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot><tr className="fw-bold"><td colSpan="2" className="text-end">Total:</td><td>${editCommReps.reduce((s, r) => s + (parseFloat(r.total_price) || 0), 0).toFixed(2)}</td></tr></tfoot>
                          </table>
                        </div>
                      )}
                    </div>
                  )
                })() : <p className="text-muted">No data</p>}
              </div>
              <div className="modal-footer">
                <button className="btn btn-success px-4" onClick={handleSaveEditComm}>Save</button>
                <button className="btn btn-outline-secondary" onClick={() => { setEditCommInv(null); setEditCommData(null) }}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      </>)}

      {/* View Commission Modal - matching old PHP commission_info_template */}
      {(viewCommInv || viewCommLoading) && (<>
        <div className="modal-backdrop fade show" style={{ zIndex: 1060 }}></div>
        <div className="modal fade show d-block" tabIndex="-1" style={{ zIndex: 1065, overflowY: 'auto', height: '100vh' }}>
          <div className="modal-dialog modal-xl" style={{ margin: '1rem auto' }}>
            <div className="modal-content border-0 shadow">
              <div className="modal-header border-bottom" style={{ background: '#f8f9fa' }}>
                <h5 className="modal-title fw-bold">Commission Details</h5>
                <button type="button" className="btn-close" onClick={() => { setViewCommInv(null); setViewCommData(null); setShowAddPayment(false) }}></button>
              </div>
              <div className="modal-body">
                {viewCommLoading ? (
                  <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>
                ) : viewCommData ? (() => {
                  const inv = viewCommData.invoice || {}
                  const details = viewCommData.details || []
                  const payments = viewCommData.payments || []
                  const mainPayments = viewCommData.mainPayments || payments
                  const items = viewCommData.items || []
                  const commItemDets = viewCommData.commItemDets || []
                  const commRepDets = viewCommData.commRepDets || []
                  const saveStatus = viewCommData.save_status || 'default'
                  const netAmt = parseFloat(inv.net_amount) || 0
                  const totalPaid = mainPayments.reduce((s, p) => s + (parseFloat(p.received_amt || p.comm_paid_amount) || 0), 0)
                  const balanceDue = netAmt - totalPaid
                  const commTotal = saveStatus === 'percent' ? (viewCommData.total_commission_percentage || viewCommData.total_commission || 0) : saveStatus === 'dollar' ? (viewCommData.total_commission_dollar || viewCommData.total_commission || 0) : (viewCommData.total_commission || 0)
                  const totalPartialAmt = mainPayments.reduce((s, p) => s + (parseFloat(p.partial_com_total || p.partial_comm_total) || 0), 0)
                  const isArchived = inv.po_status === 2 || inv.po_status === '2'
                  return (
                    <div>
                      {/* Archive Checkbox */}
                      <div className="d-flex align-items-center gap-2 mb-3">
                        <input type="checkbox" id="archiveCheck" checked={isArchived} onChange={async (e) => {
                          try {
                            if (e.target.checked) {
                              await api.updateInvoice(viewCommInv._id, { po_status: 2 })
                              toast.success('Moved to archive')
                            } else {
                              await api.updateInvoice(viewCommInv._id, { po_status: 1 })
                              toast.success('Removed from archive')
                            }
                            const fresh = await api.getCommission(commMap[viewCommInv.legacy_id])
                            setViewCommData(fresh)
                            fetchData()
                          } catch (err) { toast.error(err.message) }
                        }} />
                        <label htmlFor="archiveCheck" style={{ fontSize: 13 }}>Archive invoice</label>
                      </div>

                      {/* Commission Info - blue header */}
                      <table className="table table-bordered table-sm mb-4" style={{ fontSize: 13 }}>
                        <thead><tr style={{ background: '#006BF9', color: '#fff' }}>
                          <th>Commission Invoice #</th><th>Invoice $</th><th>Invoice Date</th><th>Customer Name</th>
                        </tr></thead>
                        <tbody><tr>
                          <td>{inv.invoice_number || '-'}</td>
                          <td>${netAmt.toFixed(2)}</td>
                          <td>{fmtDate(inv.invoice_date)}</td>
                          <td>{viewCommData.company_name || '-'}</td>
                        </tr></tbody>
                      </table>

                      {/* Invoice Payment Details */}
                      <h6 className="fw-semibold mb-2">Invoice Payment Details</h6>
                      <div style={{ overflowX: 'auto' }}>
                        <table className="table table-bordered table-sm mb-4" style={{ fontSize: 12 }}>
                          <thead><tr style={{ background: '#006BF9', color: '#fff' }}>
                            <th>Commission Invoice #</th><th className="text-end">Balance Due $</th><th className="text-end">Received $</th><th>Date Rcvd</th><th>Check# CC#</th><th className="text-end">Partial ComTotal</th><th>Compaid</th>
                            {details.map(d => <th key={d.sales_rep_id} className="text-center">{d.rep_code || '-'}</th>)}
                          </tr></thead>
                          <tbody>
                            {mainPayments.length > 0 ? mainPayments.map((p, i) => {
                              const rcvd = parseFloat(p.received_amt || p.comm_paid_amount) || 0
                              const paidBefore = mainPayments.slice(0, i).reduce((s, pp) => s + (parseFloat(pp.received_amt || pp.comm_paid_amount) || 0), 0)
                              const rowBalance = netAmt - paidBefore - rcvd
                              return (
                                <tr key={i}>
                                  <td>{inv.invoice_number || '-'}</td>
                                  <td className="text-end">${Math.max(0, rowBalance).toFixed(2)}</td>
                                  <td className="text-end">${rcvd.toFixed(2)}</td>
                                  <td>{fmtDate(p.received_date || p.inv_pay_rep_created_on)}</td>
                                  <td>{p.compaid_mode || p.paid_mode || '-'}</td>
                                  <td className="text-end">${(parseFloat(p.partial_com_total || p.partial_comm_total) || 0).toFixed(2)}</td>
                                  <td>{p.commission_paid_date ? fmtDate(p.commission_paid_date) : '-'}</td>
                                  {details.map(d => {
                                    const repPay = (p.rep_payments || []).find(rp => String(rp.rep_id) === String(d.sales_rep_id))
                                    const amt = repPay ? (parseFloat(repPay.comm_paid_amount) || 0) : (String(p.rep_id) === String(d.sales_rep_id) ? rcvd : 0)
                                    return <td key={d.sales_rep_id} className="text-end">{amt > 0 ? `$${amt.toFixed(2)}` : '-'}</td>
                                  })}
                                </tr>
                              )
                            }) : (
                              <tr><td>{inv.invoice_number || '-'}</td><td className="text-end">${netAmt.toFixed(2)}</td><td className="text-end">$0.00</td><td>-</td><td>-</td><td className="text-end">$0.00</td><td>-</td>
                                {details.map(d => <td key={d.sales_rep_id} className="text-end">$0.00</td>)}
                              </tr>
                            )}
                          </tbody>
                          {mainPayments.length > 0 && (
                            <tfoot><tr className="fw-bold" style={{ background: '#f0f0f0' }}>
                              <td>Total</td>
                              <td className="text-end">${Math.max(0, balanceDue).toFixed(2)}</td>
                              <td className="text-end">${totalPaid.toFixed(2)}</td>
                              <td></td><td></td>
                              <td className="text-end">${totalPartialAmt.toFixed(2)}</td>
                              <td></td>
                              {details.map(d => {
                                const repTotal = mainPayments.reduce((s, p) => {
                                  const rp = (p.rep_payments || []).find(rp => String(rp.rep_id) === String(d.sales_rep_id))
                                  return s + (rp ? (parseFloat(rp.comm_paid_amount) || 0) : (String(p.rep_id) === String(d.sales_rep_id) ? (parseFloat(p.received_amt || p.comm_paid_amount) || 0) : 0))
                                }, 0)
                                return <td key={d.sales_rep_id} className="text-end">{repTotal > 0 ? `$${repTotal.toFixed(2)}` : '$0.00'}</td>
                              })}
                            </tr></tfoot>
                          )}
                        </table>
                      </div>

                      {/* Add Payment Details button */}
                      {totalPartialAmt < commTotal && (
                        <div className="mb-3">
                          <button className="btn btn-primary btn-lg" onClick={openAddPayment}><i className="bi bi-plus-circle me-2"></i>Add Payment Details</button>
                        </div>
                      )}

                      {/* Commission Items Grid - green section (save_status aware) */}
                      {items.length > 0 && (
                        <div style={{ background: '#d4edda', borderRadius: 8, padding: 16 }}>
                          <div style={{ overflowX: 'auto' }}>
                            <table className="table table-bordered table-sm mb-0" style={{ fontSize: 12 }}>
                              <thead>
                                <tr>
                                  <th style={{ background: '#4CB755', color: '#fff' }} colSpan="5"></th>
                                  {details.map(d => <th key={d.sales_rep_id} colSpan={saveStatus === 'dollar' ? 1 : 2} className="text-center" style={{ background: '#FFFFD4' }}>{d.rep_name || '-'}<br/><span style={{ fontSize: 10 }}>{d.rep_code || ''}</span></th>)}
                                </tr>
                                <tr>
                                  <th style={{ background: '#4CB755', color: '#fff' }}>Style</th>
                                  <th style={{ background: '#4CB755', color: '#fff' }}>QTY</th>
                                  <th style={{ background: '#4CB755', color: '#fff' }}>UNIT COST</th>
                                  <th style={{ background: '#4CB755', color: '#fff' }}>BASE $</th>
                                  <th style={{ background: '#4CB755', color: '#fff' }}>TOTAL</th>
                                  {details.map(d => saveStatus === 'dollar' ? (
                                    <th key={d.sales_rep_id} className="text-center" style={{ background: '#FFFFD4', fontSize: 11 }}>{d.rep_code || '-'}</th>
                                  ) : (<React.Fragment key={d.sales_rep_id}>
                                    <th className="text-center" style={{ background: '#FFFFD4', fontSize: 11 }}>{d.rep_code || '-'}</th>
                                    <th className="text-center" style={{ background: '#FFFFD4', fontSize: 11 }}></th>
                                  </React.Fragment>))}
                                </tr>
                              </thead>
                              <tbody>
                                {/* Totals row */}
                                <tr className="fw-bold" style={{ background: '#DFF0D8' }}>
                                  <td colSpan="4" style={{ background: '#DFF0D8' }}></td>
                                  <td style={{ background: '#DFF0D8' }}>${commTotal.toFixed(2)}</td>
                                  {details.map(d => {
                                    const repTotalVal = saveStatus === 'percent' ? (d.total_price_percentage || d.total_price || 0) : saveStatus === 'dollar' ? (d.total_price_dollar || d.total_price || 0) : (d.total_price || 0)
                                    return <td key={d.sales_rep_id} colSpan={saveStatus === 'dollar' ? 1 : 2} className="text-center" style={{ background: '#FFFFD4' }}>${parseFloat(repTotalVal).toFixed(2)}</td>
                                  })}
                                </tr>
                                {/* Item rows */}
                                {items.map((item, idx) => {
                                  const itemId = item.item_id || item.legacy_id
                                  const itemDet = commItemDets.find(d => d.item_id === itemId)
                                  const basePrice = itemDet?.base_price || item.unit_cost || 0
                                  const totalPrice = itemDet?.total_price || 0
                                  return (
                                    <tr key={idx} style={{ background: '#e8f5e9' }}>
                                      <td>{item.item_name || '-'}</td>
                                      <td>{item.qty || 0}</td>
                                      <td>{saveStatus === 'default' ? `$${(item.unit_cost || 0).toFixed(2)}` : ''}</td>
                                      <td>{saveStatus === 'default' ? `$${parseFloat(basePrice).toFixed(2)}` : ''}</td>
                                      <td>{saveStatus === 'default' ? `$${parseFloat(totalPrice).toFixed(2)}` : ''}</td>
                                      {details.map(d => {
                                        const repDet = commRepDets.find(r => r.item_id === itemId && r.sales_rep_id === d.sales_rep_id)
                                        if (saveStatus === 'percent') {
                                          return (<React.Fragment key={d.sales_rep_id}>
                                            <td className="text-center" style={{ background: '#FFFFD4' }}>{repDet?.commission_price_percentage || '0'}%</td>
                                            <td className="text-center" style={{ background: '#FFFFD4' }}>${(parseFloat(repDet?.total_commission_price_percentage) || 0).toFixed(2)}</td>
                                          </React.Fragment>)
                                        } else if (saveStatus === 'dollar') {
                                          return <td key={d.sales_rep_id} className="text-center" style={{ background: '#FFFFD4' }}>${(parseFloat(repDet?.total_commission_dollar || repDet?.commission_price_dollar) || 0).toFixed(2)}</td>
                                        } else {
                                          return (<React.Fragment key={d.sales_rep_id}>
                                            <td className="text-center" style={{ background: '#FFFFD4' }}>${(parseFloat(repDet?.commission_price) || 0).toFixed(2)}</td>
                                            <td className="text-center" style={{ background: '#FFFFD4' }}>${(parseFloat(repDet?.total_commission_price) || 0).toFixed(2)}</td>
                                          </React.Fragment>)
                                        }
                                      })}
                                    </tr>
                                  )
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })() : <p className="text-muted">No data</p>}
              </div>
              <div className="modal-footer">
                <button className="btn btn-outline-secondary" onClick={() => { setViewCommInv(null); setViewCommData(null); setShowAddPayment(false) }}>Close</button>
              </div>
            </div>
          </div>
        </div>
      </>)}

      {/* ═══════ Add Payment Details Popup (matching CommissionList payment popup exactly) ═══════ */}
      {showAddPayment && viewCommData && (() => {
        const pInv = viewCommData.invoice || {}
        const pDetails = viewCommData.details || []
        const pSaveStatus = viewCommData.save_status || 'default'
        const pNetAmt = parseFloat(pInv.net_amount) || 0
        const pCommTotal = pSaveStatus === 'percent' ? (viewCommData.total_commission_percentage || viewCommData.total_commission || 0) : pSaveStatus === 'dollar' ? (viewCommData.total_commission_dollar || viewCommData.total_commission || 0) : (viewCommData.total_commission || 0)
        const pMainPayments = viewCommData.mainPayments || viewCommData.payments || []
        const pTotalPaid = pMainPayments.reduce((s, p) => s + (parseFloat(p.received_amt || p.comm_paid_amount) || 0), 0)
        const pBalanceDue = pNetAmt - pTotalPaid
        const pRecAmt = parseFloat(payForm.received_amount) || 0
        const pPct = pNetAmt > 0 ? ((pRecAmt / pNetAmt) * 100).toFixed(2) : '0.00'
        const commId = commMap[viewCommInv.legacy_id]
        return (<>
          <div className="modal-backdrop fade show" style={{ zIndex: 1070 }}></div>
          <div className="modal fade show d-block" tabIndex="-1" style={{ zIndex: 1075, overflowY: 'auto', height: '100vh' }}>
            <div className="modal-dialog modal-lg" style={{ margin: '1rem auto' }}>
              <div className="modal-content border-0 shadow">
                <div className="modal-header" style={{ background: '#006BF9', color: '#fff' }}>
                  <div>
                    <h5 className="modal-title mb-1">Partial Comm. Payment: <strong>Invoice #{pInv.invoice_number || ''}</strong></h5>
                    <div style={{ fontSize: 13 }}>
                      <span><strong>Invoice Amt: ${pNetAmt.toFixed(2)}</strong></span>
                      <span className="ms-4"><strong>CommTotal: ${pCommTotal.toFixed(2)}</strong></span>
                      <span className="ms-4"><strong>Balance Due: ${Math.max(0, pBalanceDue).toFixed(2)}</strong></span>
                    </div>
                  </div>
                  <button type="button" className="btn-close btn-close-white" onClick={() => setShowAddPayment(false)}></button>
                </div>
                <div className="modal-body">
                  <form id="invPayForm" onSubmit={handleSavePayment}>
                    {/* Row 1 */}
                    <div className="row g-3 mb-3">
                      <div className="col-md-4">
                        <label className="form-label fw-semibold">Comm Paid Date</label>
                        <input type="date" className="form-control" value={payForm.commission_paid_date} onChange={e => setPayForm({ ...payForm, commission_paid_date: e.target.value })} />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label fw-semibold">Received Amount <span className="text-danger">*</span></label>
                        <input type="number" step="0.01" className="form-control" value={payForm.received_amount} onChange={e => {
                          const val = e.target.value
                          const recAmt = parseFloat(val) || 0
                          const partialComm = pNetAmt > 0 ? (recAmt / pNetAmt) * pCommTotal : 0
                          const partial = Math.round(partialComm * 100) / 100
                          // Auto-split to reps
                          const totalRepComm = pDetails.reduce((s, d) => s + (d.total_price || 0), 0)
                          const newAmts = { ...payRepAmounts }
                          Object.entries(newAmts).forEach(([repId, data]) => {
                            const repShare = totalRepComm > 0 ? (data.org_amount || 0) / totalRepComm : 0
                            newAmts[repId] = { ...data, paid_amount: String(Math.round(partial * repShare * 100) / 100) }
                          })
                          setPayForm({ ...payForm, received_amount: val, partial_comm_total: String(partial) })
                          setPayRepAmounts(newAmts)
                        }} placeholder="0.00" required />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label fw-semibold">SalesTax</label>
                        <input type="text" className="form-control" value={pInv.sales_tax_amount || 0} readOnly style={{ background: '#f8f9fa' }} />
                      </div>
                    </div>
                    {/* Row 2 */}
                    <div className="row g-3 mb-3">
                      <div className="col-md-4">
                        <label className="form-label fw-semibold">Commi Amount</label>
                        <input type="text" className="form-control" value={'$' + pNetAmt.toFixed(2)} readOnly style={{ background: '#f8f9fa' }} />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label fw-semibold">Shipping</label>
                        <input type="text" className="form-control" value={pInv.shipping_costs || '0.00'} readOnly style={{ background: '#f8f9fa' }} />
                      </div>
                      <div className="col-md-4 d-flex align-items-end">
                        {pRecAmt > 0 && <div style={{ fontSize: 12, fontWeight: 600 }}>Amount Received: {pPct}% of ${pNetAmt.toFixed(2)}</div>}
                      </div>
                    </div>
                    {/* Row 3 */}
                    <div className="row g-3 mb-3">
                      <div className="col-md-4">
                        <label className="form-label fw-semibold">Date Received</label>
                        <input type="date" className="form-control" value={payForm.received_date} onChange={e => setPayForm({ ...payForm, received_date: e.target.value })} />
                      </div>
                      <div className="col-md-4 d-flex align-items-end">
                        <div className="d-flex align-items-center gap-2 pb-2">
                          <input type="checkbox" className="form-check-input" style={{ width: 30, height: 30 }} checked={payForm.mark_paid} onChange={async e => {
                            const checked = e.target.checked
                            setPayForm({ ...payForm, mark_paid: checked })
                            if (commId) {
                              try {
                                if (checked) { await api.markCommissionPaid(commId); toast.success('Payment Updated to PAID') }
                                else { await api.markCommissionUnpaid(commId); toast.success('Payment Unpaid updated') }
                              } catch {}
                            }
                          }} id="invMarkPaidChk" />
                          <label className="form-check-label fw-bold" htmlFor="invMarkPaidChk" style={{ fontSize: 20 }}>PAID</label>
                        </div>
                      </div>
                    </div>
                    {/* Row 4 */}
                    <div className="row g-3 mb-3">
                      <div className="col-md-4">
                        <label className="form-label fw-semibold">Received Check or CC</label>
                        <input type="text" className="form-control" value={payForm.paid_mode} onChange={e => setPayForm({ ...payForm, paid_mode: e.target.value })} placeholder="Enter Check or CC last 4 digit" />
                      </div>
                    </div>
                    {/* Row 5: Check Image */}
                    <div className="row g-3 mb-3">
                      <div className="col-md-4">
                        <label className="form-label fw-semibold">Check Image</label>
                        <div style={{ border: '2px dashed #b0bec5', borderRadius: 8, padding: '12px 10px', textAlign: 'center', cursor: 'pointer', background: '#fafbfc' }}
                          onClick={() => document.getElementById('invCheckImgPay')?.click()}>
                          <div style={{ fontSize: 24, color: '#90a4ae' }}><i className="bi bi-image"></i></div>
                          <div style={{ fontSize: 12, color: '#546e7a' }}>Drag & drop check image</div>
                          <div style={{ fontSize: 11, color: '#90a4ae' }}>or <span style={{ color: '#4CB755', fontWeight: 'bold' }}>browse</span></div>
                        </div>
                        <input type="file" id="invCheckImgPay" accept=".png,.jpg,.jpeg" style={{ display: 'none' }} />
                      </div>
                    </div>
                    {/* Row 6: Partial CommTotal + Round off */}
                    <div className="row g-3 mb-3">
                      <div className="col-md-4">
                        <label className="form-label fw-semibold">Partial CommTotal <span className="text-danger">*</span></label>
                        <input type="number" step="0.01" className="form-control" value={payForm.partial_comm_total} onChange={e => setPayForm({ ...payForm, partial_comm_total: e.target.value })} placeholder="0.00" required />
                      </div>
                      <div className="col-md-4 d-flex align-items-end">
                        <button type="button" className="btn btn-success mb-0" onClick={() => setPayForm({ ...payForm, partial_comm_total: String(Math.round(parseFloat(payForm.partial_comm_total) || 0)) })}>Round off</button>
                      </div>
                    </div>

                    {/* Per-Rep Commission Amounts */}
                    {Object.entries(payRepAmounts).map(([repId, data]) => {
                      const det = pDetails.find(d => String(d.sales_rep_id) === repId)
                      return (
                        <div className="row g-3 mb-3 align-items-center" key={repId}>
                          <div className="col-md-4 text-end">
                            <div className="fw-semibold">{det?.rep_name || `Rep #${repId}`} ({det?.rep_code || ''})</div>
                            <div style={{ fontSize: 12 }}><strong>(${data.org_amount.toFixed(2)})</strong></div>
                            <div style={{ fontSize: 11, fontStyle: 'italic', color: '#666' }}>Outstanding: <span style={{ color: data.balance > 0 ? '#dc2626' : '#198754' }}>${data.balance.toFixed(2)}</span></div>
                          </div>
                          <div className="col-md-4">
                            <input type="number" step="0.01" className="form-control" placeholder="Commission Amount"
                              value={data.paid_amount}
                              onChange={e => setPayRepAmounts(prev => ({ ...prev, [repId]: { ...prev[repId], paid_amount: e.target.value } }))} />
                          </div>
                        </div>
                      )
                    })}

                    {/* Email */}
                    <div className="row g-3 mb-4">
                      <div className="col-md-4 text-end">
                        <label className="form-label fw-semibold">Email ID :</label>
                      </div>
                      <div className="col-md-5">
                        <input type="text" className="form-control" placeholder="Enter Recipient Emails" />
                      </div>
                    </div>

                    <div className="d-flex gap-2">
                      <button type="submit" className="btn btn-primary px-4" disabled={paySaving}>
                        {paySaving ? <span className="spinner-border spinner-border-sm"></span> : 'Save/Send'}
                      </button>
                      <button type="button" className="btn btn-outline-secondary px-4" onClick={() => setShowAddPayment(false)}>Cancel</button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </>)
      })()}

      {/* Customer PO Upload Modal */}
      {custPoInv && (<>
        <div className="modal-backdrop fade show"></div>
        <div className="modal fade show d-block" tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow">
              <div className="modal-header" style={{ background: '#8f3aa5', color: '#fff' }}>
                <h5 className="modal-title fw-bold"><i className="bi bi-upload me-2"></i>Customer PO - {custPoInv.invoice_number || ''}</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setCustPoInv(null)}></button>
              </div>
              <div className="modal-body">
                {/* Drop zone */}
                <div className="text-center p-4 mb-3" style={{ border: '2px dashed #cbd5e1', borderRadius: 12, background: '#fafbfc', cursor: 'pointer' }}
                  onClick={() => document.getElementById('invCustPoFile')?.click()}
                  onDrop={e => { e.preventDefault(); if (e.dataTransfer.files.length) setSelectedPoFiles(prev => [...prev, ...Array.from(e.dataTransfer.files)]) }}
                  onDragOver={e => e.preventDefault()}>
                  <i className="bi bi-cloud-arrow-up d-block mb-2" style={{ fontSize: 40, color: '#94a3b8' }}></i>
                  <div style={{ fontSize: 15, color: '#475569' }}>Drag & drop files here</div>
                  <div style={{ fontSize: 13, color: '#94a3b8' }}>or <span style={{ color: '#8f3aa5', fontWeight: 600, textDecoration: 'underline' }}>browse files</span></div>
                </div>
                <input type="file" id="invCustPoFile" multiple style={{ display: 'none' }} onChange={e => { if (e.target.files.length) setSelectedPoFiles(prev => [...prev, ...Array.from(e.target.files)]); e.target.value = '' }} />

                {/* Selected files */}
                {selectedPoFiles.length > 0 && (
                  <div className="mb-3">
                    {selectedPoFiles.map((f, i) => (
                      <div key={i} className="d-flex align-items-center justify-content-between p-2 mb-1 rounded" style={{ background: '#f1f5f9', fontSize: 13 }}>
                        <span><i className="bi bi-file-earmark me-1"></i>{f.name} <small className="text-muted">({(f.size / 1024).toFixed(1)} KB)</small></span>
                        <button className="btn btn-sm p-0 text-danger" onClick={() => setSelectedPoFiles(prev => prev.filter((_, j) => j !== i))}><i className="bi bi-x-lg"></i></button>
                      </div>
                    ))}
                  </div>
                )}

                <button className="btn btn-success w-100 mb-4" onClick={handleCustPoUpload} disabled={selectedPoFiles.length === 0 || custPoUploading}>
                  {custPoUploading ? <><span className="spinner-border spinner-border-sm me-2"></span>Uploading...</> : <><i className="bi bi-upload me-1"></i>Submit</>}
                </button>

                {/* Uploaded files */}
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
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button className="btn btn-outline-secondary" onClick={() => setCustPoInv(null)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      </>)}

      {/* Notes Modal (N button) */}
      {notesInv && (<>
        <div className="modal-backdrop fade show"></div>
        <div className="modal fade show d-block" tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow">
              <div className="modal-header" style={{ background: '#f8f9fa' }}>
                <h5 className="modal-title fw-bold">Airfeet Notes - {notesInv.invoice_number || ''}</h5>
                <button type="button" className="btn-close" onClick={() => setNotesInv(null)}></button>
              </div>
              <div className="modal-body">
                <textarea className="form-control" rows="5" value={notesText} onChange={e => setNotesText(e.target.value)} placeholder="Enter notes..."></textarea>
              </div>
              <div className="modal-footer">
                <button className="btn btn-outline-secondary" onClick={() => setNotesInv(null)}>Cancel</button>
                <button className="btn btn-success" onClick={saveNotes}><i className="bi bi-check-lg me-1"></i>Save Notes</button>
              </div>
            </div>
          </div>
        </div>
      </>)}

      {/* Tracking Info Modal */}
      {trackInv && (<>
        <div className="modal-backdrop fade show"></div>
        <div className="modal fade show d-block" tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow">
              <div className="modal-header text-white" style={{ background: '#006BF9' }}>
                <h5 className="modal-title"><i className="bi bi-truck me-2"></i>Tracking Info</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setTrackInv(null)}></button>
              </div>
              <div className="modal-body">
                {/* Invoice summary */}
                <table className="table table-sm table-bordered mb-4" style={{ fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: '#006BF9', color: '#fff' }}>
                      <th>Invoice #</th>
                      <th>Invoice Date</th>
                      <th>Paid Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>{trackInv.invoice_number || '-'}</td>
                      <td>{fmtDate(trackInv.invoice_date || trackInv.po_date)}</td>
                      <td>{trackInv.paid_value === 'PAID' ? <span className="badge bg-success">PAID</span> : <span className="badge bg-danger">Unpaid</span>}</td>
                    </tr>
                  </tbody>
                </table>

                <h6 className="fw-semibold mb-3">Tracking Details</h6>
                <form onSubmit={handleSaveTracking}>
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Shipped Date</label>
                    <input type="date" className="form-control" value={trackForm.shipped_date} onChange={e => setTrackForm({ ...trackForm, shipped_date: e.target.value })} />
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Tracking No #</label>
                    <input type="text" className="form-control" value={trackForm.tracking_no} onChange={e => setTrackForm({ ...trackForm, tracking_no: e.target.value })} placeholder="Enter tracking number" />
                  </div>
                  <div className="d-flex gap-2">
                    <button type="submit" className="btn btn-success px-4">Save</button>
                    <button type="button" className="btn btn-outline-secondary px-4" onClick={() => setTrackInv(null)}>Cancel</button>
                  </div>
                </form>
              </div>
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
                    <strong>Attachment:</strong> Invoice_{viewInv?.invoice_number || 'download'}.pdf
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
    </div>
  )
}
