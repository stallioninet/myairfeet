import express from 'express'
import mongoose from 'mongoose'

const router = express.Router()

function getCollection() {
  return mongoose.connection.db.collection('app_user')
}

// GET stats
router.get('/stats', async (req, res) => {
  try {
    const col = getCollection()
    const total = await col.countDocuments({ user_type: 'sales_rep' })
    const active = await col.countDocuments({ user_type: 'sales_rep', status: 'active' })
    const inactive = await col.countDocuments({ user_type: 'sales_rep', status: 'inactive' })
    res.json({ total, active, inactive })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET all sales reps (from app_user where user_type = sales_rep)
router.get('/', async (req, res) => {
  try {
    const { status } = req.query
    const filter = { user_type: 'sales_rep' }
    if (status) filter.status = status
    const reps = await getCollection().find(filter).sort({ created_at: -1 }).toArray()
    // Map app_user fields to what frontend expects
    const mapped = reps.map(r => ({
      _id: r._id,
      legacy_id: r.legacy_id,
      rep_number: r.user_cust_code || '',
      first_name: (r.first_name || '').trim(),
      last_name: (r.last_name || '').trim(),
      username: r.username || '',
      email: r.email || '',
      phone: r.phone || '',
      extension: r.extension || '',
      user_notes: r.user_notes || '',
      user_type: r.user_type || '',
      user_cust_code: r.user_cust_code || '',
      profile_image: r.profile_image || '',
      status: r.status || 'active',
      blocked: r.blocked || false,
      site_admin: r.site_admin || false,
      created_at: r.created_at,
      updated_at: r.updated_at,
      last_login: r.last_login,
      last_logout: r.last_logout,
    }))
    res.json(mapped)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET invoice detail (full invoice with line items, billing/shipping)
router.get('/invoice/:invoiceId', async (req, res) => {
  try {
    const db = mongoose.connection.db
    const invoiceId = parseInt(req.params.invoiceId)
    const inv = await db.collection('invoices').findOne({ legacy_id: invoiceId })
    if (!inv) return res.status(404).json({ error: 'Invoice not found' })

    // Get customer
    const customer = inv.company_id
      ? await db.collection('customers').findOne({ legacy_id: inv.company_id })
      : null

    // Get line items from po_items
    const items = await db.collection('po_items')
      .find({ po_id: inv.legacy_id, status: 1 })
      .sort({ legacy_id: 1 })
      .toArray()

    // Get size detail breakdown
    const sizeDetails = await db.collection('po_item_sizes_detail')
      .find({ po_id: inv.legacy_id })
      .sort({ legacy_id: 1 })
      .toArray()

    // Get item descriptions from po_item_descriptions
    const descs = await db.collection('po_item_descriptions')
      .find({ po_id: inv.legacy_id })
      .toArray()

    // Build item cost map from parent po_items
    const itemCostMap = {}
    items.forEach(it => { itemCostMap[it.legacy_id] = it.unit_cost || 0 })

    // Get commission reps for this invoice
    const commReps = await db.collection('invoice_commissions')
      .find({ po_id: inv.legacy_id, status: 1 })
      .toArray()
    const repIds = commReps.map(c => c.sales_rep_id).filter(Boolean)
    const reps = repIds.length > 0
      ? await db.collection('app_user').find({ legacy_id: { $in: repIds } }).toArray()
      : []
    const repNames = reps.map(r => (r.user_cust_code || (r.first_name + ' ' + r.last_name).trim()))

    // Get customer addresses for bill-to/ship-to
    const custAddresses = customer && customer.legacy_id
      ? await db.collection('cust_addresses').find({ company_id: customer.legacy_id, status: 1 }).sort({ legacy_id: 1 }).toArray()
      : []

    // Build line items from po_items (primary source), enrich with size detail SKUs
    // Build a map: po_item legacy_id -> size detail (for item_sku lookup)
    const sizeByPoItem = {}
    sizeDetails.forEach(s => {
      if (s.item_sku && s.po_item_id) sizeByPoItem[s.po_item_id] = s
    })

    let lineItems = []
    if (items.length > 0) {
      lineItems = items.map((it, i) => {
        const sd = sizeByPoItem[it.legacy_id]
        const itemCode = sd ? sd.item_sku : ''
        const unitCost = it.unit_cost || 0
        const amount = (it.qty || 0) * unitCost
        return {
          line: i + 1,
          item_code: itemCode,
          description: it.item_name || '',
          bo_qty: 0,
          shipped_qty: it.qty || 0,
          price_each: unitCost,
          amount: amount,
        }
      })
      // Add Shipping row if shipping_costs > 0
      if (inv.shipping_costs > 0) {
        lineItems.push({
          line: lineItems.length + 1,
          item_code: 'Shipping',
          description: 'Shipping Costs',
          bo_qty: 0,
          shipped_qty: 1,
          price_each: inv.shipping_costs,
          amount: inv.shipping_costs,
        })
      }
    } else if (descs.length > 0) {
      lineItems = descs.map((d, i) => ({
        line: i + 1,
        item_code: d.item_with_desc ? d.item_with_desc.split(' ')[0] : '',
        description: d.item_with_desc || '',
        bo_qty: 0,
        shipped_qty: d.qty || 0,
        price_each: d.unit_cost || 0,
        amount: d.total || 0,
      }))
    }

    // Build address strings from customer addresses
    const fmtAddr = (addr, cust) => {
      if (!addr) return ''
      const lines = [
        addr.name || '',
        addr.street_address || '',
        addr.street_address2 || '',
        [addr.city, addr.state, addr.zip_code].filter(Boolean).join(', '),
      ].filter(Boolean)
      // Add contact info from customer record
      if (cust) {
        if (cust.contact_name) lines.push('Contact Info:' + cust.contact_name)
        if (cust.phone) {
          let ph = cust.phone.replace(/[^\d]/g, '')
          if (ph.length === 10) ph = '(' + ph.slice(0,3) + ') ' + ph.slice(3,6) + '-' + ph.slice(6)
          else ph = cust.phone
          lines.push('Main phone: ' + ph)
        }
        if (cust.email) lines.push('Email :' + cust.email)
      }
      return lines.join('\n')
    }
    // billing_address/shipping_address in invoice stores a legacy_id that matches cust_addresses.legacy_id
    const billAddrId = parseInt(inv.billing_address) || 0
    const shipAddrId = parseInt(inv.shipping_address) || 0
    const billAddr = custAddresses.find(a => a.legacy_id === billAddrId) || custAddresses.find(a => a.address_type === 'address_0') || custAddresses[0]
    const shipAddr = custAddresses.find(a => a.legacy_id === shipAddrId) || custAddresses.find(a => a.address_type === 'address_1') || billAddr

    res.json({
      _id: inv._id,
      legacy_id: inv.legacy_id,
      invoice_number: inv.invoice_number,
      invoice_date: inv.invoice_date,
      po_number: inv.po_number,
      po_date: inv.po_date,
      due_date: inv.due_date,
      total_qty: inv.total_qty,
      net_amount: inv.net_amount,
      shipping_costs: inv.shipping_costs,
      sales_tax_amount: inv.sales_tax_amount,
      sales_tax_percentage: inv.sales_tax_percentage || 0,
      po_notes: inv.po_notes,
      project: inv.project,
      billing_address: fmtAddr(billAddr, customer),
      shipping_address: fmtAddr(shipAddr, customer),
      shipping_contact_info: inv.shipping_contact_info || (shipAddr ? shipAddr.shipping_acnt : '') || '',
      shipinfo_notes: inv.shipinfo_notes || '',
      tracking_no: inv.tracking_no,
      paid_value: inv.paid_value,
      paid_date: inv.paid_date,
      po_status: inv.po_status,
      charge_ccard: inv.charge_ccard || '',
      cc_per: inv.cc_per || 0,
      cc_amt: inv.cc_amt || 0,
      cust_terms: inv.cust_terms || (customer ? customer.terms : '') || '',
      customer_FOB: inv.customer_FOB || (customer ? customer.fob : '') || '',
      cust_ship: inv.cust_ship || (customer ? customer.ship : '') || '',
      cust_ship_via: inv.cust_ship_via || (customer ? customer.ship_via : '') || '',
      cust_project: inv.cust_project || (customer ? customer.project : '') || '',
      customer: customer ? {
        company_name: customer.company_name || '',
        customer_code: customer.customer_code || '',
      } : null,
      rep_names: repNames,
      line_items: lineItems,
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET commission stats for header
router.get('/:id/commission-stats', async (req, res) => {
  try {
    const db = mongoose.connection.db
    let user
    try {
      user = await getCollection().findOne({ _id: new mongoose.Types.ObjectId(req.params.id) })
    } catch {
      user = await getCollection().findOne({ legacy_id: parseInt(req.params.id) })
    }
    if (!user) return res.status(404).json({ error: 'Sales rep not found' })

    const commissions = await db.collection('invoice_commissions')
      .find({ sales_rep_id: user.legacy_id, status: 1 })
      .toArray()

    if (commissions.length === 0) return res.json({ total_commission: 0, ytd_outstanding: 0, ytd_paid: 0 })

    const poIds = [...new Set(commissions.map(c => c.po_id))]

    // Get summaries for total_commission per PO
    const summaries = await db.collection('invoice_commission_summary')
      .find({ po_id: { $in: poIds } })
      .toArray()
    const sumMap = {}
    summaries.forEach(s => { sumMap[s.po_id] = s })

    // Get commission payments
    const payments = await db.collection('commission_payments')
      .find({ po_id: { $in: poIds }, status: 1 })
      .toArray()
    const payMap = {}
    payments.forEach(p => {
      if (!payMap[p.po_id]) payMap[p.po_id] = []
      payMap[p.po_id].push(p)
    })

    let totalCommission = 0
    let ytdOutstanding = 0
    let ytdPaid = 0

    commissions.forEach(c => {
      const sum = sumMap[c.po_id] || {}
      const comTotal = sum.total_commission || 0
      const repShare = comTotal > 0 ? (c.total_price || 0) / comTotal : 0
      const pays = payMap[c.po_id] || []
      const partialTotal = pays.reduce((s, p) => s + (p.partial_com_total || 0), 0)
      const repPayment = partialTotal * repShare

      if (sum.commission_paid_status === 1) {
        totalCommission += repPayment
      }
      // YTD: all commission payments for this rep
      ytdOutstanding += repPayment
      ytdPaid += repPayment
    })

    res.json({
      total_commission: Math.round(totalCommission * 100) / 100,
      ytd_outstanding: Math.round(ytdOutstanding * 100) / 100,
      ytd_paid: Math.round(ytdPaid * 100) / 100,
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET commissions for a sales rep
router.get('/:id/commissions', async (req, res) => {
  try {
    const db = mongoose.connection.db
    let user
    try {
      user = await getCollection().findOne({ _id: new mongoose.Types.ObjectId(req.params.id) })
    } catch {
      user = await getCollection().findOne({ legacy_id: parseInt(req.params.id) })
    }
    if (!user) return res.status(404).json({ error: 'Sales rep not found' })

    // Get invoice_commissions for this rep
    const commissions = await db.collection('invoice_commissions')
      .find({ sales_rep_id: user.legacy_id, status: 1 })
      .toArray()

    if (commissions.length === 0) return res.json([])

    const poIds = [...new Set(commissions.map(c => c.po_id))]

    // Fetch invoices for dates/qty/amounts
    const invoices = await db.collection('invoices')
      .find({ legacy_id: { $in: poIds } })
      .sort({ invoice_date: -1 })
      .toArray()
    const invMap = {}
    invoices.forEach(inv => { invMap[inv.legacy_id] = inv })

    // Fetch commission summaries for total commission per PO
    const summaries = await db.collection('invoice_commission_summary')
      .find({ po_id: { $in: poIds } })
      .toArray()
    const sumMap = {}
    summaries.forEach(s => { sumMap[s.po_id] = s })

    // Fetch commission payments by po_id
    const commPayments = await db.collection('commission_payments')
      .find({ po_id: { $in: poIds }, status: 1 })
      .toArray()
    const payMap = {}
    commPayments.forEach(p => {
      if (!payMap[p.po_id]) payMap[p.po_id] = []
      payMap[p.po_id].push(p)
    })

    const result = commissions.map(c => {
      const inv = invMap[c.po_id] || {}
      const sum = sumMap[c.po_id] || {}
      const pays = payMap[c.po_id] || []
      const totalPaid = pays.reduce((s, p) => s + (p.received_amt || 0), 0)
      const latestPay = pays.length > 0 ? pays.sort((a, b) => new Date(b.commission_paid_date || 0) - new Date(a.commission_paid_date || 0))[0] : null
      return {
        _id: c._id,
        legacy_id: c.legacy_id,
        po_id: c.po_id,
        invoice_number: inv.invoice_number || '',
        invoice_date: inv.invoice_date,
        total_qty: inv.total_qty || 0,
        po_total: inv.net_amount || 0,
        com_total: sum.total_commission || 0,
        rep_com_total: c.total_price || 0,
        commission_paid_status: sum.commission_paid_status || 0,
        comm_paid_date: latestPay ? latestPay.commission_paid_date : sum.comm_paid_date,
        comm_paid_amount: totalPaid,
        compaid_mode: latestPay ? latestPay.compaid_mode : '',
      }
    })

    res.json(result)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET invoices for a sales rep
router.get('/:id/invoices', async (req, res) => {
  try {
    const db = mongoose.connection.db
    let user
    try {
      user = await getCollection().findOne({ _id: new mongoose.Types.ObjectId(req.params.id) })
    } catch {
      user = await getCollection().findOne({ legacy_id: parseInt(req.params.id) })
    }
    if (!user) return res.status(404).json({ error: 'Sales rep not found' })

    // Get invoice_commissions for this rep -> get po_ids
    const commissions = await db.collection('invoice_commissions')
      .find({ sales_rep_id: user.legacy_id, status: 1 })
      .toArray()

    if (commissions.length === 0) return res.json([])

    const poIds = [...new Set(commissions.map(c => c.po_id))]

    // Fetch invoices
    const invoices = await db.collection('invoices')
      .find({ legacy_id: { $in: poIds } })
      .sort({ invoice_date: -1 })
      .toArray()

    // Fetch customers for company names
    const companyIds = [...new Set(invoices.map(inv => inv.company_id))]
    const customers = await db.collection('customers')
      .find({ legacy_id: { $in: companyIds } })
      .toArray()
    const custMap = {}
    customers.forEach(c => { custMap[c.legacy_id] = c })

    // Build commission map per po_id for this rep
    const commMap = {}
    commissions.forEach(c => { commMap[c.po_id] = c })

    // Fetch payments
    const payments = await db.collection('invoice_payments')
      .find({ po_id: { $in: poIds } })
      .toArray()
    const payMap = {}
    payments.forEach(p => {
      if (!payMap[p.po_id]) payMap[p.po_id] = 0
      payMap[p.po_id] += p.check_amount || 0
    })

    const result = invoices.map(inv => {
      const cust = custMap[inv.company_id] || {}
      const comm = commMap[inv.legacy_id] || {}
      const paid = payMap[inv.legacy_id] || 0
      const balance = inv.net_amount - paid
      return {
        _id: inv._id,
        legacy_id: inv.legacy_id,
        invoice_number: inv.invoice_number,
        invoice_date: inv.invoice_date,
        po_number: inv.po_number,
        po_date: inv.po_date,
        due_date: inv.due_date,
        total_qty: inv.total_qty,
        net_amount: inv.net_amount,
        paid_amount: paid,
        balance: balance,
        company_name: cust.company_name || 'Unknown',
        customer_code: cust.customer_code || '',
        company_id: inv.company_id,
        commission: comm.total_price || 0,
        po_status: inv.po_status,
      }
    })

    res.json(result)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET customers for a sales rep
router.get('/:id/customers', async (req, res) => {
  try {
    const db = mongoose.connection.db
    // Find the app_user to get legacy_id
    let user
    try {
      user = await getCollection().findOne({ _id: new mongoose.Types.ObjectId(req.params.id) })
    } catch {
      user = await getCollection().findOne({ legacy_id: parseInt(req.params.id) })
    }
    if (!user) return res.status(404).json({ error: 'Sales rep not found' })

    // Get active mappings (status=1) for this sales rep
    const mappings = await db.collection('cust_sales_rep_map')
      .find({ sales_rep_id: user.legacy_id, status: 1 })
      .sort({ sort_order: 1 })
      .toArray()

    if (mappings.length === 0) return res.json([])

    // Get unique company_ids
    const companyIds = [...new Set(mappings.map(m => m.company_id))]

    // Fetch customers by legacy_id
    const customers = await db.collection('customers')
      .find({ legacy_id: { $in: companyIds } })
      .toArray()

    // Map to response with line numbers
    const customerMap = {}
    customers.forEach(c => { customerMap[c.legacy_id] = c })

    const result = companyIds.map((cid, i) => {
      const c = customerMap[cid] || {}
      return {
        line: i + 1,
        _id: c._id || null,
        legacy_id: cid,
        customer_code: c.customer_code || '',
        company_name: c.company_name || 'Unknown',
        status: c.status || 'unknown',
      }
    }).filter(r => r._id) // only return customers that exist

    res.json(result)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET single sales rep (with addresses and contacts)
router.get('/:id', async (req, res) => {
  try {
    const db = mongoose.connection.db
    let r
    try {
      r = await getCollection().findOne({ _id: new mongoose.Types.ObjectId(req.params.id) })
    } catch {
      r = await getCollection().findOne({ legacy_id: parseInt(req.params.id) })
    }
    if (!r) return res.status(404).json({ error: 'Sales rep not found' })

    // Fetch addresses and contacts by legacy_id
    const addresses = r.legacy_id
      ? await db.collection('user_addresses').find({ user_legacy_id: r.legacy_id }).toArray()
      : []
    const contacts = r.legacy_id
      ? await db.collection('user_contacts').find({ user_legacy_id: r.legacy_id }).toArray()
      : []

    res.json({
      _id: r._id,
      legacy_id: r.legacy_id,
      rep_number: r.user_cust_code || '',
      first_name: (r.first_name || '').trim(),
      last_name: (r.last_name || '').trim(),
      username: r.username || '',
      email: r.email || '',
      phone: r.phone || '',
      extension: r.extension || '',
      user_notes: r.user_notes || '',
      user_type: r.user_type || '',
      user_cust_code: r.user_cust_code || '',
      profile_image: r.profile_image || '',
      status: r.status || 'active',
      blocked: r.blocked || false,
      site_admin: r.site_admin || false,
      created_at: r.created_at,
      updated_at: r.updated_at,
      last_login: r.last_login,
      last_logout: r.last_logout,
      addresses,
      contacts,
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PUT update sales rep
router.put('/:id', async (req, res) => {
  try {
    const col = getCollection()
    const update = { ...req.body }
    delete update._id
    update.updated_at = new Date()
    const result = await col.findOneAndUpdate(
      { _id: new mongoose.Types.ObjectId(req.params.id) },
      { $set: update },
      { returnDocument: 'after' }
    )
    if (!result) return res.status(404).json({ error: 'Sales rep not found' })
    res.json(result)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// PUT activate
router.put('/:id/activate', async (req, res) => {
  try {
    const result = await getCollection().findOneAndUpdate(
      { _id: new mongoose.Types.ObjectId(req.params.id) },
      { $set: { status: 'active', updated_at: new Date() } },
      { returnDocument: 'after' }
    )
    if (!result) return res.status(404).json({ error: 'Sales rep not found' })
    res.json(result)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PUT deactivate
router.put('/:id/deactivate', async (req, res) => {
  try {
    const result = await getCollection().findOneAndUpdate(
      { _id: new mongoose.Types.ObjectId(req.params.id) },
      { $set: { status: 'inactive', updated_at: new Date() } },
      { returnDocument: 'after' }
    )
    if (!result) return res.status(404).json({ error: 'Sales rep not found' })
    res.json(result)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST create sales rep
router.post('/', async (req, res) => {
  try {
    const doc = {
      first_name: (req.body.first_name || '').trim(),
      last_name: (req.body.last_name || '').trim(),
      username: (req.body.username || '').trim(),
      email: (req.body.email || '').trim(),
      phone: (req.body.phone || '').trim(),
      extension: (req.body.extension || '').trim(),
      user_cust_code: (req.body.user_cust_code || '').trim(),
      user_notes: (req.body.user_notes || '').trim(),
      user_type: 'sales_rep',
      status: 'active',
      blocked: false,
      site_admin: false,
      created_at: new Date(),
      updated_at: new Date(),
    }
    const result = await getCollection().insertOne(doc)
    res.status(201).json({ _id: result.insertedId, ...doc })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// DELETE sales rep
router.delete('/:id', async (req, res) => {
  try {
    const result = await getCollection().findOneAndDelete({ _id: new mongoose.Types.ObjectId(req.params.id) })
    if (!result) return res.status(404).json({ error: 'Sales rep not found' })
    res.json({ message: 'Sales rep deleted' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
