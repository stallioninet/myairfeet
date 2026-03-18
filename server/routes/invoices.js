import { Router } from 'express'
import mongoose from 'mongoose'

const router = Router()
const col = () => mongoose.connection.db.collection('invoices')
const custCol = () => mongoose.connection.db.collection('customers')
const custPoCol = () => mongoose.connection.db.collection('invoice_customer_pos')

// GET all invoices with customer name
router.get('/', async (req, res) => {
  try {
    const filter = {}
    if (req.query.year) {
      const y = parseInt(req.query.year)
      filter.po_date = {
        $gte: new Date(`${y}-01-01`),
        $lt: new Date(`${y + 1}-01-01`),
      }
    }
    if (req.query.status === 'shipped') filter.inv_status = 'Shipped'
    else if (req.query.status === 'active') filter.inv_status = { $ne: 'Shipped' }

    const invoices = await col().find(filter).sort({ legacy_id: -1 }).toArray()

    // Batch fetch customer names
    const companyIds = [...new Set(invoices.map(i => i.company_id).filter(Boolean))]
    const customers = await custCol().find({ legacy_id: { $in: companyIds } }).project({ legacy_id: 1, company_name: 1 }).toArray()
    const custMap = {}
    customers.forEach(c => { custMap[c.legacy_id] = c.company_name })

    const data = invoices.map(inv => ({
      ...inv,
      company_name: custMap[inv.company_id] || '',
    }))

    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET stats
router.get('/stats', async (req, res) => {
  try {
    const [total, shipped, paid, unpaid] = await Promise.all([
      col().countDocuments(),
      col().countDocuments({ inv_status: 'Shipped' }),
      col().countDocuments({ paid_value: 'PAID' }),
      col().countDocuments({ paid_value: { $nin: ['PAID'] } }),
    ])
    const pipeline = [{ $group: { _id: null, total: { $sum: '$net_amount' } } }]
    const amtResult = await col().aggregate(pipeline).toArray()
    const totalAmount = amtResult[0]?.total || 0
    res.json({ total, shipped, paid, unpaid, totalAmount })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET available years
router.get('/years', async (req, res) => {
  try {
    const pipeline = [
      { $match: { po_date: { $ne: null } } },
      { $group: { _id: { $year: '$po_date' } } },
      { $sort: { _id: -1 } },
    ]
    const result = await col().aggregate(pipeline).toArray()
    const years = result.map(r => r._id).filter(Boolean)
    res.json(years)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET file map (which invoices have customer PO files)
router.get('/file-map', async (req, res) => {
  try {
    const records = await custPoCol().find({}).toArray()
    const map = {}
    records.forEach(r => {
      if (r.cutomer_polink && r.cutomer_polink.trim()) {
        map[r.invoice_id] = true
      }
    })
    res.json(map)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET customers list for dropdown
router.get('/lookup/customers', async (req, res) => {
  try {
    const data = await custCol().find({ status: 'active' }).sort({ company_name: 1 }).project({ legacy_id: 1, company_name: 1, company_cust_code: 1 }).toArray()
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PUT bulk update - mark paid and/or archive
router.put('/bulk/update', async (req, res) => {
  try {
    const { ids, paid, archive } = req.body
    if (!ids || !ids.length) return res.status(400).json({ error: 'No invoices selected' })

    let paidCount = 0
    let archiveCount = 0

    for (const id of ids) {
      const update = { updated_at: new Date() }
      if (paid) {
        update.paid_value = 'PAID'
        update.paid_date = new Date().toLocaleDateString('en-US')
        paidCount++
      }
      if (archive) {
        update.po_status = 2
        archiveCount++
      }
      await col().updateOne({ _id: new mongoose.Types.ObjectId(id) }, { $set: update })
    }

    const msgs = []
    if (paidCount) msgs.push(`${paidCount} marked as PAID`)
    if (archiveCount) msgs.push(`${archiveCount} archived`)
    res.json({ success: true, message: msgs.join(', ') })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET email template
router.get('/email-template', async (req, res) => {
  try {
    const db = mongoose.connection.db
    const tpl = await db.collection('email_templates').findOne({ email_id: 1 })
    res.json(tpl || { email_subject: 'AIRfeet Invoice Payment Due Reminder', email_content: '' })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// PUT save email template
router.put('/email-template', async (req, res) => {
  try {
    const db = mongoose.connection.db
    const { email_subject, email_content } = req.body
    await db.collection('email_templates').updateOne(
      { email_id: 1 },
      { $set: { email_subject, email_content, updated_at: new Date() } },
      { upsert: true }
    )
    res.json({ success: true })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// POST send overdue emails
router.post('/send-overdue-emails', async (req, res) => {
  try {
    const db = mongoose.connection.db
    const { subject, content } = req.body

    // Get overdue invoices grouped by company
    const now = new Date()
    const invoices = await col().find({ paid_value: { $ne: 'PAID' }, due_date: { $lt: now } }).toArray()
    const companyIds = [...new Set(invoices.map(i => i.company_id).filter(Boolean))]
    const customers = await custCol().find({ legacy_id: { $in: companyIds } }).toArray()
    const custMap = {}
    customers.forEach(c => { custMap[c.legacy_id] = c })

    // Get contacts
    const contacts = await db.collection('customer_contacts').find({ company_id: { $in: companyIds } }).toArray()
    const contactMap = {}
    contacts.forEach(c => { if (!contactMap[c.company_id]) contactMap[c.company_id] = []; contactMap[c.company_id].push(c) })

    let sentCount = 0
    for (const compId of companyIds) {
      const cust = custMap[compId]
      if (!cust) continue
      const custInvoices = invoices.filter(i => i.company_id === compId)
      const custContacts = contactMap[compId] || []
      const emails = custContacts.filter(c => c.contact_email && c.contact_email !== 'Null').map(c => c.contact_email)
      if (emails.length === 0) continue

      // Build invoice table
      let invoiceTable = '<table border="1" cellpadding="5" style="border-collapse:collapse;width:100%"><tr><th>Invoice #</th><th>Amount</th><th>Due Date</th></tr>'
      custInvoices.forEach(inv => {
        invoiceTable += `<tr><td>${inv.invoice_number || '-'}</td><td>$${(inv.net_amount || 0).toFixed(2)}</td><td>${inv.due_date ? new Date(inv.due_date).toLocaleDateString() : '-'}</td></tr>`
      })
      invoiceTable += '</table>'

      // Replace keywords
      const contactName = custContacts[0]?.contact_person || cust.company_name
      let emailBody = (content || '')
        .replace(/{client_name}/g, contactName)
        .replace(/{your_company}/g, cust.company_name)
        .replace(/{returnvalimport}/g, invoiceTable)

      // Log email (TODO: actual sending via nodemailer)
      console.log(`[Overdue Email] To: ${emails.join(', ')} | Company: ${cust.company_name} | Invoices: ${custInvoices.length}`)

      // Save to history
      await db.collection('send_email_history').insertOne({
        custname: cust.company_name,
        sending_mailid: emails.join(', '),
        subject: subject || 'AIRfeet Invoice Payment Due Reminder',
        type: 'overdue',
        invoice_count: custInvoices.length,
        send_date: new Date(),
      })
      sentCount++
    }

    res.json({ success: true, message: `Sent reminders to ${sentCount} customer(s) with ${invoices.length} overdue invoice(s)` })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// GET email history
router.get('/email-history', async (req, res) => {
  try {
    const db = mongoose.connection.db
    const history = await db.collection('send_email_history').find({}).sort({ send_date: -1 }).limit(50).toArray()
    res.json(history)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// GET customer PO files for an invoice
router.get('/:id/customer-po', async (req, res) => {
  try {
    const inv = await col().findOne({ _id: new mongoose.Types.ObjectId(req.params.id) })
    if (!inv) return res.status(404).json({ error: 'Invoice not found' })
    const files = await custPoCol().find({ invoice_id: String(inv.legacy_id) }).toArray()
    res.json(files)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// POST upload customer PO files for invoice
router.post('/:id/customer-po', async (req, res) => {
  try {
    // Use multer if available, otherwise just log
    const inv = await col().findOne({ _id: new mongoose.Types.ObjectId(req.params.id) })
    if (!inv) return res.status(404).json({ error: 'Invoice not found' })
    // For now just acknowledge - needs multer middleware
    res.json({ success: true, message: 'Upload endpoint ready - configure multer for file handling' })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// GET single invoice with items
router.get('/:id', async (req, res) => {
  try {
    const inv = await col().findOne({ _id: new mongoose.Types.ObjectId(req.params.id) })
    if (!inv) return res.status(404).json({ error: 'Invoice not found' })

    // Get customer info
    const customer = inv.company_id ? await custCol().findOne({ legacy_id: inv.company_id }) : null

    // Get line items
    const poItemsCol = mongoose.connection.db.collection('po_items')
    const items = await poItemsCol.find({ po_id: inv.legacy_id }).toArray()

    // Get po_item_size details
    const sizeCol = mongoose.connection.db.collection('po_item_sizes')
    const sizes = await sizeCol.find({ po_id: inv.legacy_id }).toArray()

    const mappedItems = items.map(it => ({ ...it, item_name: it.po_item_name || it.item_name || '', qty: it.item_qty || it.qty || 0, unit_cost: parseFloat(it.item_unit_cost || it.unit_cost) || 0 }))
    res.json({ ...inv, customer, items: mappedItems, sizes, company_name: customer?.company_name || '' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET invoice view data (for popup)
router.get('/:id/invoice', async (req, res) => {
  try {
    const inv = await col().findOne({ _id: new mongoose.Types.ObjectId(req.params.id) })
    if (!inv) return res.status(404).json({ error: 'Invoice not found' })

    const customer = inv.company_id ? await custCol().findOne({ legacy_id: inv.company_id }) : null

    // Get customer addresses
    const addrCol = mongoose.connection.db.collection('cust_addresses')
    const billingAddr = inv.billing_address ? await addrCol.findOne({ legacy_id: parseInt(inv.billing_address) }) : null
    const shippingAddr = inv.shipping_address ? await addrCol.findOne({ legacy_id: parseInt(inv.shipping_address) }) : null

    // Get customer contacts
    const contactCol = mongoose.connection.db.collection('customer_contacts')
    const contacts = inv.company_id ? await contactCol.find({ company_id: inv.company_id }).toArray() : []

    // Get line items from po_item_sizes (detailed) or po_items (basic)
    const sizeCol = mongoose.connection.db.collection('po_item_sizes')
    let items = await sizeCol.find({ po_id: inv.legacy_id }).toArray()
    if (!items.length) {
      const poItemsCol = mongoose.connection.db.collection('po_items')
      items = await poItemsCol.find({ po_id: inv.legacy_id }).toArray()
    }

    res.json({
      ...inv,
      customer,
      company_name: customer?.company_name || '',
      billingAddr,
      shippingAddr,
      contacts,
      items,
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST create invoice
router.post('/', async (req, res) => {
  try {
    const maxDoc = await col().find({}).sort({ legacy_id: -1 }).limit(1).toArray()
    const nextId = (maxDoc[0]?.legacy_id || 0) + 1

    const doc = {
      legacy_id: nextId,
      company_id: parseInt(req.body.company_id) || 0,
      invoice_number: req.body.invoice_number || '',
      invoice_date: req.body.invoice_date || null,
      po_number: req.body.po_number || '',
      po_date: req.body.po_date || null,
      due_date: req.body.due_date || null,
      total_qty: parseInt(req.body.total_qty) || 0,
      net_amount: parseFloat(req.body.net_amount) || 0,
      shipping_costs: parseFloat(req.body.shipping_costs) || 0,
      sales_tax_type: req.body.sales_tax_type || 'N',
      sales_tax_percentage: parseInt(req.body.sales_tax_percentage) || 0,
      sales_tax_amount: parseFloat(req.body.sales_tax_amount) || 0,
      po_notes: req.body.po_notes || '',
      project: req.body.project || '',
      shipinfo_notes: req.body.shipinfo_notes || '',
      airfeet_notes: req.body.airfeet_notes || '',
      cust_terms: req.body.cust_terms || '',
      customer_FOB: req.body.customer_FOB || '',
      cust_ship: req.body.cust_ship || '',
      cust_ship_via: req.body.cust_ship_via || '',
      cust_project: req.body.cust_project || '',
      credit_card_notes: req.body.credit_card_notes || '',
      inv_quote_status: parseInt(req.body.inv_quote_status) || 0,
      paid_value: '',
      paid_date: '',
      inv_status: '',
      po_status: 1,
      created_at: new Date(),
      updated_at: new Date(),
    }
    const result = await col().insertOne(doc)
    doc._id = result.insertedId

    // Save line items if provided
    const lineItems = req.body.lineItems
    if (lineItems && Array.isArray(lineItems) && lineItems.length > 0) {
      const db = mongoose.connection.db
      const docs = lineItems.map((it, idx) => ({
        po_id: nextId,
        item_name: it.item_name || '',
        qty: parseInt(it.qty) || 0,
        uom: it.uom || '',
        unit_cost: parseFloat(it.unit_cost) || 0,
        item_total: (parseInt(it.qty) || 0) * (parseFloat(it.unit_cost) || 0),
        bo_option: it.bo_option || 'no',
        item_type_id: parseInt(it.item_type_id) || 0,
        po_item_status: 1,
        sort_order: idx,
      }))
      await db.collection('po_items').insertMany(docs)
    }

    res.status(201).json(doc)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// PUT update invoice
router.put('/:id', async (req, res) => {
  try {
    const lineItems = req.body.lineItems
    const update = { ...req.body, updated_at: new Date() }
    delete update._id
    delete update.customer
    delete update.items
    delete update.sizes
    delete update.lineItems
    delete update.company_name
    delete update.billingAddr
    delete update.shippingAddr
    delete update.contacts

    if (update.company_id !== undefined) update.company_id = parseInt(update.company_id) || 0
    if (update.net_amount !== undefined) update.net_amount = parseFloat(update.net_amount) || 0
    if (update.shipping_costs !== undefined) update.shipping_costs = parseFloat(update.shipping_costs) || 0
    if (update.total_qty !== undefined) update.total_qty = parseInt(update.total_qty) || 0
    if (update.sales_tax_amount !== undefined) update.sales_tax_amount = parseFloat(update.sales_tax_amount) || 0

    const result = await col().findOneAndUpdate(
      { _id: new mongoose.Types.ObjectId(req.params.id) },
      { $set: update },
      { returnDocument: 'after' }
    )
    if (!result) return res.status(404).json({ error: 'Invoice not found' })

    // Save line items if provided
    if (lineItems && Array.isArray(lineItems)) {
      const db = mongoose.connection.db
      const poId = result.legacy_id
      await db.collection('po_items').deleteMany({ po_id: poId })
      if (lineItems.length > 0) {
        const docs = lineItems.map((it, idx) => ({
          po_id: poId,
          item_name: it.item_name || '',
          qty: parseInt(it.qty) || 0,
          uom: it.uom || '',
          unit_cost: parseFloat(it.unit_cost) || 0,
          item_total: (parseInt(it.qty) || 0) * (parseFloat(it.unit_cost) || 0),
          bo_option: it.bo_option || 'no',
          item_type_id: parseInt(it.item_type_id) || 0,
          po_item_status: 1,
          sort_order: idx,
        }))
        await db.collection('po_items').insertMany(docs)
      }
    }

    res.json(result)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// PUT update status (shipped/active toggle)
router.put('/:id/status', async (req, res) => {
  try {
    const { inv_status } = req.body
    const result = await col().findOneAndUpdate(
      { _id: new mongoose.Types.ObjectId(req.params.id) },
      { $set: { inv_status, updated_at: new Date() } },
      { returnDocument: 'after' }
    )
    if (!result) return res.status(404).json({ error: 'Invoice not found' })
    res.json(result)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// PUT update paid status
router.put('/:id/paid', async (req, res) => {
  try {
    const { paid_value, paid_date } = req.body
    const result = await col().findOneAndUpdate(
      { _id: new mongoose.Types.ObjectId(req.params.id) },
      { $set: { paid_value, paid_date: paid_date || '', updated_at: new Date() } },
      { returnDocument: 'after' }
    )
    if (!result) return res.status(404).json({ error: 'Invoice not found' })
    res.json(result)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// PUT update payment due date
// PUT update tracking info
router.put('/:id/tracking', async (req, res) => {
  try {
    const { shipped_date, tracking_no } = req.body
    const result = await col().findOneAndUpdate(
      { _id: new mongoose.Types.ObjectId(req.params.id) },
      { $set: { shipped_date: shipped_date || null, tracking_no: tracking_no || '', updated_at: new Date() } },
      { returnDocument: 'after' }
    )
    if (!result) return res.status(404).json({ error: 'Invoice not found' })
    res.json(result)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

router.put('/:id/due-date', async (req, res) => {
  try {
    const { due_date } = req.body
    const result = await col().findOneAndUpdate(
      { _id: new mongoose.Types.ObjectId(req.params.id) },
      { $set: { due_date, updated_at: new Date() } },
      { returnDocument: 'after' }
    )
    if (!result) return res.status(404).json({ error: 'Invoice not found' })
    res.json(result)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// DELETE invoice
router.delete('/:id', async (req, res) => {
  try {
    const inv = await col().findOne({ _id: new mongoose.Types.ObjectId(req.params.id) })
    if (!inv) return res.status(404).json({ error: 'Invoice not found' })
    await col().deleteOne({ _id: inv._id })
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST copy invoice
router.post('/:id/copy', async (req, res) => {
  try {
    const original = await col().findOne({ _id: new mongoose.Types.ObjectId(req.params.id) })
    if (!original) return res.status(404).json({ error: 'Invoice not found' })

    const maxDoc = await col().find({}).sort({ legacy_id: -1 }).limit(1).toArray()
    const nextId = (maxDoc[0]?.legacy_id || 0) + 1

    const copy = { ...original }
    delete copy._id
    copy.legacy_id = nextId
    copy.invoice_number = (original.invoice_number || '') + ' (Copy)'
    copy.inv_status = ''
    copy.paid_value = ''
    copy.paid_date = ''
    copy.created_at = new Date()
    copy.updated_at = new Date()

    const result = await col().insertOne(copy)
    copy._id = result.insertedId
    res.status(201).json(copy)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

export default router
