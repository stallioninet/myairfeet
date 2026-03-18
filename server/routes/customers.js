import { Router } from 'express'
import mongoose from 'mongoose'

const router = Router()
const col = () => mongoose.connection.db.collection('customers')

// GET all customers (optionally filter by status)
router.get('/', async (req, res) => {
  try {
    const filter = {}
    if (req.query.status) filter.status = req.query.status
    const data = await col().find(filter).sort({ company_name: 1 }).toArray()
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET customer types
router.get('/types', async (req, res) => {
  try {
    const types = await mongoose.connection.db.collection('customer_types')
      .find({ status: 'active' }).sort({ name: 1 }).toArray()
    res.json(types)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET stats
router.get('/stats', async (req, res) => {
  try {
    const [total, active, inactive, pilot] = await Promise.all([
      col().countDocuments(),
      col().countDocuments({ status: 'active' }),
      col().countDocuments({ status: 'inactive' }),
      col().countDocuments({ status: 'pilot' }),
    ])
    // Count distinct customer types
    const types = await col().distinct('customer_type')
    const activeTypes = types.filter(t => t && t.trim() !== '').length
    res.json({ total, active, inactive, pilot, activeTypes })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET check unique company name
router.get('/check-unique', async (req, res) => {
  try {
    const { name, exclude_id } = req.query
    if (!name) return res.json({ unique: true })
    const filter = { company_name: { $regex: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } }
    if (exclude_id) {
      filter._id = { $ne: new mongoose.Types.ObjectId(exclude_id) }
    }
    const existing = await col().findOne(filter)
    res.json({ unique: !existing, existing: existing ? { _id: existing._id, company_name: existing.company_name } : null })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET customer invoices
router.get('/:id/invoices', async (req, res) => {
  try {
    const db = mongoose.connection.db
    const doc = await col().findOne({ _id: new mongoose.Types.ObjectId(req.params.id) })
    if (!doc) return res.status(404).json({ error: 'Customer not found' })
    const legacyId = doc.legacy_id
    if (!legacyId) return res.json({ rows: [], years: [] })

    // Get distinct years from invoices for year filter
    const allInvoices = await db.collection('invoices')
      .find({ company_id: legacyId, po_status: 1 })
      .project({ created_at: 1, legacy_id: 1 })
      .toArray()
    const yearsSet = new Set()
    allInvoices.forEach(inv => {
      if (inv.created_at) { const y = new Date(inv.created_at).getFullYear(); if (y > 2000) yearsSet.add(y) }
    })
    const years = [...yearsSet].sort((a, b) => b - a)

    // Filter by year (defaults to current year like old PHP, use year=all for everything)
    const yearFilter = req.query.year === 'all' ? null
      : req.query.year ? parseInt(req.query.year)
      : new Date().getFullYear()
    let query = { company_id: legacyId, po_status: 1 }
    if (yearFilter) {
      const start = new Date(`${yearFilter}-01-01T00:00:00.000Z`)
      const end = new Date(`${yearFilter + 1}-01-01T00:00:00.000Z`)
      query.created_at = { $gte: start, $lt: end }
    }

    const invoices = await db.collection('invoices')
      .find(query)
      .sort({ legacy_id: -1 })
      .toArray()

    const poIds = invoices.map(inv => inv.legacy_id)

    // Get commission summary to determine commission action buttons
    const commSums = poIds.length > 0
      ? await db.collection('invoice_commission_summary').find({ po_id: { $in: poIds } }).toArray()
      : []
    const commMap = {}
    commSums.forEach(c => { commMap[c.po_id] = c.legacy_id })

    const rows = invoices.map((inv, idx) => ({
      line: idx + 1,
      po_id: inv.legacy_id,
      invoice_number: inv.invoice_number || '',
      po_number: inv.po_number || '',
      invoice_date: inv.invoice_date,
      total_qty: inv.total_qty || 0,
      net_amount: inv.net_amount || 0,
      po_status: inv.po_status,
      comm_id: commMap[inv.legacy_id] || null,
    }))

    res.json({ rows, years })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET customer commissions
router.get('/:id/commissions', async (req, res) => {
  try {
    const db = mongoose.connection.db
    const doc = await col().findOne({ _id: new mongoose.Types.ObjectId(req.params.id) })
    if (!doc) return res.status(404).json({ error: 'Customer not found' })
    const legacyId = doc.legacy_id
    if (!legacyId) return res.json([])

    // Get all invoices for this customer
    const invoices = await db.collection('invoices')
      .find({ company_id: legacyId })
      .sort({ invoice_date: -1 })
      .toArray()
    if (invoices.length === 0) return res.json([])

    const poIds = invoices.map(inv => inv.legacy_id)
    const invMap = {}
    invoices.forEach(inv => { invMap[inv.legacy_id] = inv })

    // Get commission summaries (one per PO that has a commission record)
    const summaries = await db.collection('invoice_commission_summary')
      .find({ po_id: { $in: poIds } })
      .sort({ legacy_id: -1 })
      .toArray()
    if (summaries.length === 0) return res.json([])

    // Get per-rep commission details
    const commissions = await db.collection('invoice_commissions')
      .find({ po_id: { $in: poIds }, status: 1 })
      .toArray()
    const commByPo = {}
    commissions.forEach(c => {
      if (!commByPo[c.po_id]) commByPo[c.po_id] = []
      commByPo[c.po_id].push(c)
    })

    // Get rep names from app_user
    const repIds = [...new Set(commissions.map(c => c.sales_rep_id))]
    const repMap = {}
    if (repIds.length > 0) {
      const reps = await db.collection('app_user')
        .find({ legacy_id: { $in: repIds } })
        .toArray()
      reps.forEach(r => {
        repMap[r.legacy_id] = {
          name: ((r.first_name || '') + ' ' + (r.last_name || '')).trim(),
          code: r.user_cust_code || '',
        }
      })
    }

    // Get commission payments
    const commLegacyIds = summaries.map(s => s.legacy_id)
    const payments = await db.collection('commission_payments')
      .find({ inv_com_id: { $in: commLegacyIds } })
      .toArray()
    const payByComm = {}
    payments.forEach(p => {
      if (!payByComm[p.inv_com_id]) payByComm[p.inv_com_id] = []
      payByComm[p.inv_com_id].push(p)
    })

    const rows = summaries.map((sum, idx) => {
      const inv = invMap[sum.po_id] || {}
      const comms = commByPo[sum.po_id] || []
      const pays = payByComm[sum.legacy_id] || []

      // Commission total based on save_status
      let commTotal = 0
      const saveStatus = sum.save_status || 'default'
      if (saveStatus === 'percent') {
        commTotal = parseFloat(sum.total_commission_percentage) || 0
      } else if (saveStatus === 'dollar') {
        commTotal = parseFloat(sum.total_commission_dollar) || 0
      } else {
        commTotal = sum.total_commission || 0
      }

      // Payment status: compare po_net_amount vs sum of received_amt
      const totalReceived = pays.reduce((s, p) => s + (p.received_amt || 0), 0)
      const poTotal = inv.net_amount || 0
      let paymentStatus = 'unpaid' // 0 = Zero Payment
      if (totalReceived > 0 && totalReceived >= poTotal) paymentStatus = 'fullpaid' // 2 = Full
      else if (totalReceived > 0) paymentStatus = 'partial' // 1 = Partial

      // Commission paid dates
      const paidDates = pays
        .filter(p => p.commission_paid_date)
        .map(p => p.commission_paid_date)

      // Per-rep breakdown
      const repDetails = comms.map(c => ({
        rep_id: c.sales_rep_id,
        rep_name: repMap[c.sales_rep_id] ? repMap[c.sales_rep_id].name : 'Unknown',
        rep_code: repMap[c.sales_rep_id] ? repMap[c.sales_rep_id].code : '',
        amount: c.total_price || 0,
      }))

      // Payment details
      const paymentDetails = pays.map(p => ({
        date: p.commission_paid_date,
        mode: p.compaid_mode || '',
        amount: p.received_amt || 0,
        partial_total: p.partial_com_total || 0,
      }))

      return {
        line: idx + 1,
        po_id: inv.legacy_id,
        comm_id: sum.legacy_id,
        invoice_number: inv.invoice_number || '',
        invoice_date: inv.invoice_date,
        total_qty: inv.total_qty || 0,
        po_total: poTotal,
        comm_total: commTotal,
        save_status: saveStatus,
        payment_status: paymentStatus,
        comm_paid_dates: paidDates,
        comm_status: sum.status === 1 ? 'Active' : 'Not Active',
        rep_details: repDetails,
        payment_details: paymentDetails,
      }
    })

    res.json(rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET customer history (invoices + commissions + reps)
router.get('/:id/history', async (req, res) => {
  try {
    const db = mongoose.connection.db
    const doc = await col().findOne({ _id: new mongoose.Types.ObjectId(req.params.id) })
    if (!doc) return res.status(404).json({ error: 'Customer not found' })
    const legacyId = doc.legacy_id
    if (!legacyId) return res.json({ rows: [], repColumns: [], itemTypeColumns: [] })

    // Get all invoices (purchase_orders) for this customer
    const invoices = await db.collection('invoices')
      .find({ company_id: legacyId })
      .sort({ invoice_date: -1 })
      .toArray()
    if (invoices.length === 0) return res.json({ rows: [], repColumns: [], itemTypeColumns: [] })

    const poIds = invoices.map(inv => inv.legacy_id)

    // Get ALL item types (show all columns like old PHP)
    const allItemTypes = await db.collection('itemtypes')
      .find({ legacy_id: { $exists: true } })
      .sort({ legacy_id: 1 })
      .toArray()
    const itemTypeColumns = allItemTypes.map(it => ({
      id: it.legacy_id,
      name: it.name || '',
    }))

    // Get PO item totals (po_item_total in old PHP)
    const poItemTotals = await db.collection('po_item_totals')
      .find({ po_id: { $in: poIds }, total_type: 'type_total' })
      .toArray()
    const itemTotalsByPo = {}
    poItemTotals.forEach(pit => {
      if (!itemTotalsByPo[pit.po_id]) itemTotalsByPo[pit.po_id] = {}
      itemTotalsByPo[pit.po_id][pit.item_type_id] = (itemTotalsByPo[pit.po_id][pit.item_type_id] || 0) + (pit.net_amount || 0)
    })

    // Get commission summaries (invoice_commission in old PHP)
    const summaries = await db.collection('invoice_commission_summary')
      .find({ po_id: { $in: poIds } })
      .toArray()
    const sumMap = {}
    summaries.forEach(s => { sumMap[s.po_id] = s })

    // Get invoice commissions per rep (invoice_commission_details in old PHP)
    const commissions = await db.collection('invoice_commissions')
      .find({ po_id: { $in: poIds }, status: 1 })
      .toArray()
    const commByPo = {}
    commissions.forEach(c => {
      if (!commByPo[c.po_id]) commByPo[c.po_id] = []
      commByPo[c.po_id].push(c)
    })

    // Get assigned reps from cust_sales_rep_map (all assigned reps become columns)
    const custRepMaps = await db.collection('cust_sales_rep_map')
      .find({ company_id: legacyId, status: 1 })
      .sort({ sort_order: 1 })
      .toArray()

    // Collect all rep IDs (from both commissions and assigned reps)
    const commRepIds = [...new Set(commissions.map(c => c.sales_rep_id))]
    const assignedRepIds = custRepMaps.map(c => c.sales_rep_id)
    const allRepIds = [...new Set([...assignedRepIds, ...commRepIds])]

    // Get rep names from app_user (legacy migrated data with user_cust_code)
    const repMap = {}
    if (allRepIds.length > 0) {
      const reps = await db.collection('app_user')
        .find({ legacy_id: { $in: allRepIds } })
        .toArray()
      reps.forEach(r => {
        repMap[r.legacy_id] = {
          name: ((r.first_name || '') + ' ' + (r.last_name || '')).trim(),
          code: r.user_cust_code || '',
        }
      })
    }

    const repColumns = allRepIds.filter(rid => repMap[rid]).map(rid => ({
      id: rid,
      name: repMap[rid].name,
      code: repMap[rid].code,
    }))

    // Get commission payments
    const payments = await db.collection('commission_payments')
      .find({ po_id: { $in: poIds } })
      .toArray()
    const payMap = {}
    payments.forEach(p => {
      if (!payMap[p.po_id]) payMap[p.po_id] = []
      payMap[p.po_id].push(p)
    })

    const rows = invoices.map((inv, idx) => {
      const sum = sumMap[inv.legacy_id] || {}
      const comms = commByPo[inv.legacy_id] || []
      const pays = payMap[inv.legacy_id] || []

      // Commission total based on save_status (matches old PHP logic)
      let commTotal = 0
      const saveStatus = sum.save_status || 'default'
      if (saveStatus === 'percent') {
        commTotal = sum.total_commission_percentage || 0
      } else if (saveStatus === 'dollar') {
        commTotal = sum.total_commission_dollar || 0
      } else {
        commTotal = sum.total_commission || 0
      }

      // Per-rep commission amounts
      const repAmounts = {}
      comms.forEach(c => { repAmounts[c.sales_rep_id] = (repAmounts[c.sales_rep_id] || 0) + (c.total_price || 0) })

      // Item type totals for this PO
      const itemTotals = itemTotalsByPo[inv.legacy_id] || {}

      // Commission paid dates
      const paidDates = pays
        .filter(p => p.commission_paid_date)
        .map(p => p.commission_paid_date)
        .sort((a, b) => new Date(b) - new Date(a))

      return {
        line: idx + 1,
        po_id: inv.legacy_id,
        invoice_number: inv.invoice_number || '',
        invoice_date: inv.invoice_date,
        total_qty: inv.total_qty || 0,
        po_total: inv.net_amount || 0,
        comm_total: commTotal,
        rep_amounts: repAmounts,
        item_totals: itemTotals,
        comm_paid_dates: paidDates,
      }
    })

    res.json({ rows, repColumns, itemTypeColumns })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET single customer (with contacts, addresses, emails, assigned reps)
router.get('/:id', async (req, res) => {
  try {
    const db = mongoose.connection.db
    const doc = await col().findOne({ _id: new mongoose.Types.ObjectId(req.params.id) })
    if (!doc) return res.status(404).json({ error: 'Customer not found' })

    const legacyId = doc.legacy_id

    // Fetch addresses from cust_addresses (PHP-migrated, keyed by company_id)
    const rawAddresses = legacyId
      ? await db.collection('cust_addresses').find({ company_id: legacyId, status: 1 }).toArray()
      : []
    const addresses = rawAddresses.map(a => ({
      _id: a._id,
      label: a.address_label || 'Address',
      name: a.name || '',
      street: a.street_address || '',
      street2: a.street_address2 || '',
      city: a.city || '',
      state: a.state || '',
      zip: a.zip_code || '',
      country: a.country || '',
      email: a.email || '',
      phone: a.phoneno || a.phone || '',
      shipping_acnt: a.shipping_acnt || '',
      address_type: a.address_type || '',
    }))

    // Fetch contacts: customer_contacts uses old ObjectId refs, not current customer _id
    // Find old ObjectId by matching address street in customer_addresses collection
    let contacts = []
    if (rawAddresses.length > 0) {
      const street = rawAddresses[0].street_address
      if (street) {
        const oldAddr = await db.collection('customer_addresses').findOne({ street })
        if (oldAddr && oldAddr.customer) {
          contacts = await db.collection('customer_contacts')
            .find({ customer: oldAddr.customer, status: 'active' })
            .sort({ display_order: 1 })
            .toArray()
        }
      }
    }
    // Fallback: try direct ObjectId query (works for newer records)
    if (contacts.length === 0) {
      contacts = await db.collection('customer_contacts')
        .find({ customer: doc._id, status: 'active' })
        .sort({ display_order: 1 })
        .toArray()
    }

    // Fetch emails
    const emails = legacyId
      ? await db.collection('customer_emails').find({ company_id: legacyId }).toArray()
      : []
    // Fallback: try ObjectId query
    const emailsFallback = emails.length === 0
      ? await db.collection('customer_emails').find({ customer: doc._id }).toArray()
      : []

    // Fetch assigned rep mappings
    const repMaps = legacyId
      ? await db.collection('cust_sales_rep_map').find({ company_id: legacyId, status: 1 }).sort({ sort_order: 1 }).toArray()
      : []

    // Get rep names from app_user
    let assignedReps = []
    if (repMaps.length > 0) {
      const repIds = [...new Set(repMaps.map(m => m.sales_rep_id))]
      const reps = await db.collection('app_user').find({ legacy_id: { $in: repIds } }).toArray()
      // Sort reps by the same sort_order as repMaps
      const repMap = {}
      reps.forEach(r => { repMap[r.legacy_id] = r })
      assignedReps = repMaps.map(m => {
        const r = repMap[m.sales_rep_id]
        return r ? { _id: r._id, name: ((r.first_name || '') + ' ' + (r.last_name || '')).trim(), rep_number: r.user_cust_code || '' } : null
      }).filter(Boolean)
    }

    res.json({ ...doc, contacts, addresses, emails: emails.length > 0 ? emails : emailsFallback, assignedReps })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST create customer
router.post('/', async (req, res) => {
  try {
    const { company_name, customer_type, contact_name, phone, extension, email, customer_code,
      notes, terms, fob, ship, ship_via, project, status, relationship, address, city, state, zip, fax, website, sales_rep } = req.body
    if (!company_name) return res.status(400).json({ error: 'Company name is required' })
    const doc = {
      company_name: company_name.trim(),
      customer_type: (customer_type || '').trim(),
      relationship: (relationship || '').trim(),
      contact_name: (contact_name || '').trim(),
      phone: (phone || '').trim(),
      extension: (extension || '').trim(),
      fax: (fax || '').trim(),
      email: (email || '').trim(),
      website: (website || '').trim(),
      customer_code: (customer_code || '').trim(),
      notes: (notes || '').trim(),
      terms: (terms || '').trim(),
      fob: (fob || '').trim(),
      ship: (ship || '').trim(),
      ship_via: (ship_via || '').trim(),
      project: (project || '').trim(),
      address: (address || '').trim(),
      city: (city || '').trim(),
      state: (state || '').trim(),
      zip: (zip || '').trim(),
      sales_rep: (sales_rep || '').trim(),
      status: status || 'active',
      created_at: new Date(),
    }
    const result = await col().insertOne(doc)
    res.json({ ...doc, _id: result.insertedId })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PUT update customer
router.put('/:id', async (req, res) => {
  try {
    const update = { updated_at: new Date() }
    const fields = ['company_name', 'customer_type', 'relationship', 'contact_name', 'phone', 'extension',
      'fax', 'email', 'website', 'customer_code', 'notes', 'terms', 'fob', 'ship', 'ship_via', 'project',
      'address', 'city', 'state', 'zip', 'sales_rep', 'status']
    fields.forEach(f => {
      if (req.body[f] !== undefined) update[f] = typeof req.body[f] === 'string' ? req.body[f].trim() : req.body[f]
    })
    await col().updateOne({ _id: new mongoose.Types.ObjectId(req.params.id) }, { $set: update })
    const updated = await col().findOne({ _id: new mongoose.Types.ObjectId(req.params.id) })
    res.json(updated)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PUT update a contact
router.put('/:id/contacts/:contactId', async (req, res) => {
  try {
    const db = mongoose.connection.db
    const contactId = new mongoose.Types.ObjectId(req.params.contactId)
    const update = {}
    const fields = ['title', 'person', 'position', 'label', 'main_phone', 'main_ext', 'desk_phone', 'desk_ext', 'mobile_phone', 'email']
    fields.forEach(f => {
      if (req.body[f] !== undefined) update[f] = typeof req.body[f] === 'string' ? req.body[f].trim() : req.body[f]
    })
    await db.collection('customer_contacts').updateOne({ _id: contactId }, { $set: update })
    const updated = await db.collection('customer_contacts').findOne({ _id: contactId })
    res.json(updated)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST create a new contact
router.post('/:id/contacts', async (req, res) => {
  try {
    const db = mongoose.connection.db
    const doc = await col().findOne({ _id: new mongoose.Types.ObjectId(req.params.id) })
    if (!doc) return res.status(404).json({ error: 'Customer not found' })
    // Find the customer ObjectId reference used in customer_contacts
    let customerRef = doc._id
    const legacyId = doc.legacy_id
    if (legacyId) {
      const addr = await db.collection('cust_addresses').findOne({ company_id: legacyId, status: 1 })
      if (addr && addr.street_address) {
        const oldAddr = await db.collection('customer_addresses').findOne({ street: addr.street_address })
        if (oldAddr && oldAddr.customer) customerRef = oldAddr.customer
      }
    }
    const existing = await db.collection('customer_contacts').find({ customer: customerRef }).sort({ display_order: -1 }).limit(1).toArray()
    const nextOrder = existing.length > 0 ? (existing[0].display_order || 0) + 1 : 0
    const contact = {
      customer: customerRef,
      title: (req.body.title || '').trim(),
      person: (req.body.person || '').trim(),
      position: (req.body.position || '').trim(),
      label: (req.body.label || '').trim(),
      main_phone: (req.body.main_phone || '').trim(),
      main_ext: (req.body.main_ext || '').trim(),
      desk_phone: (req.body.desk_phone || '').trim(),
      desk_ext: (req.body.desk_ext || '').trim(),
      mobile_phone: (req.body.mobile_phone || '').trim(),
      email: (req.body.email || '').trim(),
      display_order: nextOrder,
      status: 'active',
      created_at: new Date(),
    }
    await db.collection('customer_contacts').insertOne(contact)
    res.json(contact)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST create a new address
router.post('/:id/addresses', async (req, res) => {
  try {
    const db = mongoose.connection.db
    const doc = await col().findOne({ _id: new mongoose.Types.ObjectId(req.params.id) })
    if (!doc) return res.status(404).json({ error: 'Customer not found' })
    const legacyId = doc.legacy_id
    if (!legacyId) return res.status(400).json({ error: 'Customer has no legacy_id for address mapping' })
    const address = {
      company_id: legacyId,
      address_label: (req.body.address_label || '').trim() || 'Address',
      address_tag: (req.body.address_tag || '').trim(),
      name: (req.body.name || '').trim(),
      street_address: (req.body.street_address || '').trim(),
      street_address2: (req.body.street_address2 || '').trim(),
      city: (req.body.city || '').trim(),
      state: (req.body.state || '').trim(),
      zip_code: (req.body.zip_code || '').trim(),
      country: (req.body.country || '').trim(),
      email: (req.body.email || '').trim(),
      phoneno: (req.body.phoneno || '').trim(),
      shipping_acnt: (req.body.shipping_acnt || '').trim(),
      status: 1,
      created_at: new Date(),
    }
    await db.collection('cust_addresses').insertOne(address)
    res.json(address)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST create new emails (supports multiple)
router.post('/:id/emails', async (req, res) => {
  try {
    const db = mongoose.connection.db
    const doc = await col().findOne({ _id: new mongoose.Types.ObjectId(req.params.id) })
    if (!doc) return res.status(404).json({ error: 'Customer not found' })
    const legacyId = doc.legacy_id
    if (!legacyId) return res.status(400).json({ error: 'Customer has no legacy_id' })
    const { emails } = req.body // array of { name, email }
    if (!Array.isArray(emails) || emails.length === 0) return res.status(400).json({ error: 'emails array required' })
    const docs = emails.filter(e => e.email && e.email.trim()).map(e => ({
      company_id: legacyId,
      name: (e.name || '').trim(),
      email: (e.email || '').trim(),
      status: 'active',
      created_at: new Date(),
    }))
    if (docs.length > 0) await db.collection('customer_emails').insertMany(docs)
    res.json({ message: `${docs.length} email(s) added` })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE a contact (set status inactive)
router.delete('/:id/contacts/:contactId', async (req, res) => {
  try {
    const db = mongoose.connection.db
    const contactId = new mongoose.Types.ObjectId(req.params.contactId)
    await db.collection('customer_contacts').updateOne({ _id: contactId }, { $set: { status: 'inactive' } })
    res.json({ message: 'Contact deleted' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PUT update an address
router.put('/:id/addresses/:addressId', async (req, res) => {
  try {
    const db = mongoose.connection.db
    const addressId = new mongoose.Types.ObjectId(req.params.addressId)
    const update = {}
    const fields = ['address_label', 'name', 'street_address', 'street_address2', 'city', 'state', 'zip_code', 'country', 'email', 'phoneno', 'shipping_acnt', 'address_tag']
    fields.forEach(f => {
      if (req.body[f] !== undefined) update[f] = typeof req.body[f] === 'string' ? req.body[f].trim() : req.body[f]
    })
    await db.collection('cust_addresses').updateOne({ _id: addressId }, { $set: update })
    const updated = await db.collection('cust_addresses').findOne({ _id: addressId })
    res.json(updated)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE an address (set status inactive)
router.delete('/:id/addresses/:addressId', async (req, res) => {
  try {
    const db = mongoose.connection.db
    const addressId = new mongoose.Types.ObjectId(req.params.addressId)
    await db.collection('cust_addresses').updateOne({ _id: addressId }, { $set: { status: 0 } })
    res.json({ message: 'Address deleted' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE an email
router.delete('/:id/emails/:emailId', async (req, res) => {
  try {
    const db = mongoose.connection.db
    const emailId = new mongoose.Types.ObjectId(req.params.emailId)
    await db.collection('customer_emails').updateOne({ _id: emailId }, { $set: { status: 'inactive' } })
    res.json({ message: 'Email deleted' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PUT update assigned sales reps
router.put('/:id/reps', async (req, res) => {
  try {
    const db = mongoose.connection.db
    const doc = await col().findOne({ _id: new mongoose.Types.ObjectId(req.params.id) })
    if (!doc) return res.status(404).json({ error: 'Customer not found' })
    const legacyId = doc.legacy_id
    if (!legacyId) return res.status(400).json({ error: 'Customer has no legacy_id for rep mapping' })

    const { repIds } = req.body // array of app_user ObjectId strings
    if (!Array.isArray(repIds)) return res.status(400).json({ error: 'repIds must be an array' })

    // Look up legacy_id for each selected rep
    const repObjectIds = repIds.map(rid => new mongoose.Types.ObjectId(rid))
    const repUsers = repObjectIds.length > 0
      ? await db.collection('app_user').find({ _id: { $in: repObjectIds } }).toArray()
      : []
    const selectedLegacyIds = repUsers.map(r => r.legacy_id).filter(Boolean)

    // Deactivate all current reps for this customer (set status 3)
    await db.collection('cust_sales_rep_map').updateMany(
      { company_id: legacyId, status: 1 },
      { $set: { status: 3 } }
    )

    // Upsert selected reps with status 1 and sort_order
    for (let i = 0; i < selectedLegacyIds.length; i++) {
      const repLegacyId = selectedLegacyIds[i]
      const existing = await db.collection('cust_sales_rep_map').findOne({
        company_id: legacyId, sales_rep_id: repLegacyId
      })
      if (existing) {
        await db.collection('cust_sales_rep_map').updateOne(
          { _id: existing._id },
          { $set: { status: 1, sort_order: i + 1 } }
        )
      } else {
        await db.collection('cust_sales_rep_map').insertOne({
          company_id: legacyId,
          sales_rep_id: repLegacyId,
          status: 1,
          sort_order: i + 1,
        })
      }
    }

    res.json({ message: 'Sales reps updated' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PUT deactivate
router.put('/:id/deactivate', async (req, res) => {
  try {
    await col().updateOne({ _id: new mongoose.Types.ObjectId(req.params.id) }, { $set: { status: 'inactive', updated_at: new Date() } })
    res.json({ message: 'Customer deactivated' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PUT activate
router.put('/:id/activate', async (req, res) => {
  try {
    await col().updateOne({ _id: new mongoose.Types.ObjectId(req.params.id) }, { $set: { status: 'active', updated_at: new Date() } })
    res.json({ message: 'Customer activated' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE customer
router.delete('/:id', async (req, res) => {
  try {
    await col().deleteOne({ _id: new mongoose.Types.ObjectId(req.params.id) })
    res.json({ message: 'Customer deleted' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST send overdue payment reminder email to customer contacts
router.post('/:id/send-overdue-email', async (req, res) => {
  try {
    const customer = await col().findOne({ _id: new mongoose.Types.ObjectId(req.params.id) })
    if (!customer) return res.status(404).json({ error: 'Customer not found' })

    const db = mongoose.connection.db
    // Get overdue invoices for this customer
    const invoices = await db.collection('invoices').find({
      company_id: customer.legacy_id,
      paid_value: { $ne: 'PAID' },
      due_date: { $lt: new Date() },
    }).toArray()

    if (!invoices.length) return res.json({ success: true, message: 'No overdue invoices found' })

    // Get customer contacts with emails
    const contacts = await db.collection('customer_contacts').find({ company_id: customer.legacy_id }).toArray()
    const emails = contacts.filter(c => c.contact_email && c.contact_email !== 'Null').map(c => ({ name: c.contact_person || '', email: c.contact_email }))

    // Build invoice list for email
    const invoiceList = invoices.map(inv => ({
      invoice_number: inv.invoice_number,
      po_number: inv.po_number,
      amount: inv.net_amount,
      due_date: inv.due_date,
    }))

    // Log the email (TODO: integrate with actual email service)
    console.log('Overdue email for:', customer.company_name)
    console.log('To:', emails.map(e => e.email).join(', '))
    console.log('Invoices:', invoiceList.length)

    // Update customer send_duemail flag
    await col().updateOne({ _id: customer._id }, { $set: { send_duemail: 1 } })

    res.json({ success: true, message: `Overdue reminder queued for ${emails.length} contact(s) with ${invoiceList.length} overdue invoice(s)`, emails, invoices: invoiceList })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST save customer terms
router.post('/:id/terms', async (req, res) => {
  try {
    const { cust_terms, customer_FOB, cust_ship, cust_ship_via, cust_project } = req.body
    const result = await col().findOneAndUpdate(
      { _id: new mongoose.Types.ObjectId(req.params.id) },
      { $set: { cust_terms: cust_terms || '', customer_FOB: customer_FOB || '', cust_ship: cust_ship || '', cust_ship_via: cust_ship_via || '', cust_project: cust_project || '' } },
      { returnDocument: 'after' }
    )
    if (!result) return res.status(404).json({ error: 'Customer not found' })
    res.json(result)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// POST save additional info
router.post('/:id/additional-info', async (req, res) => {
  try {
    const { additional_info } = req.body
    const result = await col().findOneAndUpdate(
      { _id: new mongoose.Types.ObjectId(req.params.id) },
      { $set: { additional_info: additional_info || '' } },
      { returnDocument: 'after' }
    )
    if (!result) return res.status(404).json({ error: 'Customer not found' })
    res.json(result)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

export default router
