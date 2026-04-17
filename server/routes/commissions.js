import { Router } from 'express'
import mongoose from 'mongoose'

const router = Router()
const summaryCol = () => mongoose.connection.db.collection('invoice_commission_summary')
const detailCol = () => mongoose.connection.db.collection('invoice_commissions')
const invoiceCol = () => mongoose.connection.db.collection('invoices')
const custCol = () => mongoose.connection.db.collection('customers')
const repCol = () => mongoose.connection.db.collection('sales_reps')
const payRepCol = () => mongoose.connection.db.collection('invoice_payment_reps')
const payCol = () => mongoose.connection.db.collection('invoice_payments')

// GET commission map (lightweight: po_id -> _id) for invoice page
router.get('/map', async (req, res) => {
  try {
    const comms = await summaryCol().find({ status: { $in: [1, '1'] } }).project({ po_id: 1 }).toArray()
    const map = {}
    comms.forEach(c => { if (c.po_id) map[c.po_id] = c._id })
    res.json(map)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// GET all commissions with invoice & customer data
router.get('/', async (req, res) => {
  try {
    const summaryFilter = { status: { $in: [1, '1'] } }
    if (req.query.rep_id) {
      const repId = parseInt(req.query.rep_id)
      const repDetails = await detailCol().find({ sales_rep_id: repId, status: { $in: [1, '1'] } }).project({ po_id: 1 }).toArray()
      const poIds = [...new Set(repDetails.map(d => d.po_id).filter(v => v != null))]
      summaryFilter.po_id = { $in: poIds }
    }
    const commissions = await summaryCol().find(summaryFilter).sort({ legacy_id: -1 }).toArray()

    // Batch fetch invoice data
    const poIds = [...new Set(commissions.map(c => c.po_id).filter(Boolean))]
    const invoices = await invoiceCol().find({ legacy_id: { $in: poIds } }).project({ legacy_id: 1, company_id: 1, invoice_number: 1, po_number: 1, po_date: 1, total_qty: 1, net_amount: 1 }).toArray()
    const invMap = {}
    invoices.forEach(inv => { invMap[inv.legacy_id] = inv })

    // Batch fetch customer names
    const companyIds = [...new Set(invoices.map(i => i.company_id).filter(Boolean))]
    const customers = await custCol().find({ legacy_id: { $in: companyIds } }).project({ legacy_id: 1, company_name: 1 }).toArray()
    const custMap = {}
    customers.forEach(c => { custMap[c.legacy_id] = c.company_name })

    // Batch fetch payment info for balance calc
    const payReps = await payRepCol().find({ po_id: { $in: poIds.map(String) } }).toArray()
    const paidMap = {} // po_id -> total paid
    payReps.forEach(pr => {
      const pid = String(pr.po_id)
      paidMap[pid] = (paidMap[pid] || 0) + (parseFloat(pr.comm_paid_amount) || 0)
    })

    const data = commissions.map(comm => {
      const inv = invMap[comm.po_id] || {}
      const companyName = custMap[inv.company_id] || ''
      const totalComm = comm.total_commission || parseFloat(comm.total_commission_percentage) || parseFloat(comm.total_commission_dollar) || 0
      const totalPaid = paidMap[String(comm.po_id)] || 0
      const balance = totalComm - totalPaid

      return {
        ...comm,
        invoice_number: inv.invoice_number || '',
        po_number: inv.po_number || '',
        po_date: inv.po_date || '',
        total_qty: inv.total_qty || 0,
        net_amount: inv.net_amount || 0,
        company_name: companyName,
        company_id: inv.company_id || '',
        total_comm: totalComm,
        total_paid: totalPaid,
        balance: balance,
        // Payment status: 0=unpaid, 1=partial, 2=full
        pay_status: totalPaid <= 0 ? 0 : (balance <= 0 ? 2 : 1),
      }
    })

    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET stats
router.get('/stats', async (req, res) => {
  try {
    const total = await summaryCol().countDocuments({ status: { $in: [1, '1'] } })
    const pipeline = [
      { $match: { status: { $in: [1, '1'] } } },
      { $group: { _id: null, totalComm: { $sum: '$total_commission' } } },
    ]
    const result = await summaryCol().aggregate(pipeline).toArray()
    const totalComm = result[0]?.totalComm || 0
    res.json({ total, totalComm })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET sales reps for commission form
router.get('/lookup/reps', async (req, res) => {
  try {
    const reps = await repCol().find({ status: 'active' }).sort({ first_name: 1 }).project({ legacy_id: 1, first_name: 1, last_name: 1, user_cust_code: 1, commission_rate: 1 }).toArray()
    res.json(reps)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET invoices without commission (for "add commission" dropdown)
router.get('/lookup/invoices', async (req, res) => {
  try {
    const existingPoIds = await summaryCol().distinct('po_id', { status: { $in: [1, '1'] } })
    const invoices = await invoiceCol().find({ legacy_id: { $nin: existingPoIds } }).sort({ legacy_id: -1 }).limit(200).toArray()
    const companyIds = [...new Set(invoices.map(i => i.company_id).filter(Boolean))]
    const customers = await custCol().find({ legacy_id: { $in: companyIds } }).project({ legacy_id: 1, company_name: 1 }).toArray()
    const custMap = {}
    customers.forEach(c => { custMap[c.legacy_id] = c.company_name })
    const data = invoices.map(inv => ({ ...inv, company_name: custMap[inv.company_id] || '' }))
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET commission report — per-rep invoice detail for commissions
router.get('/report', async (req, res) => {
  try {
    const { rep_id, rep_email, status, date_from, date_to } = req.query

    const commFilter = { status: { $in: [1, '1'] } }

    if (rep_id) {
      commFilter.sales_rep_id = parseInt(rep_id)
    } else if (rep_email) {
      const rep = await repCol().findOne({ email: rep_email })
      if (!rep) return res.json([])
      commFilter.sales_rep_id = rep.legacy_id
    }

    const details = await detailCol().find(commFilter).toArray()
    if (!details.length) return res.json([])

    const poIds = [...new Set(details.map(d => d.po_id).filter(v => v != null))]

    // Build invoice query with optional paid-status and date filters
    const invQuery = { legacy_id: { $in: poIds } }
    if (status === 'paid') invQuery.paid_value = 'PAID'
    else if (status === 'unpaid') invQuery.paid_value = { $not: { $regex: /^PAID$/i } }
    if (date_from || date_to) {
      invQuery.shipped_date = {}
      if (date_from) invQuery.shipped_date.$gte = date_from
      if (date_to) invQuery.shipped_date.$lte = date_to
    }

    const invoices = await invoiceCol().find(invQuery).toArray()
    const invMap = {}
    invoices.forEach(inv => { invMap[inv.legacy_id] = inv })

    const matchedDetails = details.filter(d => invMap[d.po_id])
    if (!matchedDetails.length) return res.json([])

    const companyIds = [...new Set(invoices.map(i => i.company_id).filter(Boolean))]
    const repIds = [...new Set(matchedDetails.map(d => d.sales_rep_id).filter(Boolean))]

    const [customers, contacts, reps] = await Promise.all([
      custCol().find({ legacy_id: { $in: companyIds } }).project({ legacy_id: 1, company_name: 1 }).toArray(),
      mongoose.connection.db.collection('customer_contacts').find({ company_id: { $in: companyIds } }).project({ company_id: 1, contact_number: 1, contact_person: 1 }).toArray(),
      repCol().find({ legacy_id: { $in: repIds } }).project({ legacy_id: 1, first_name: 1, last_name: 1, user_cust_code: 1 }).toArray(),
    ])

    const custMap = {}
    customers.forEach(c => { custMap[c.legacy_id] = c })

    const contactMap = {}
    contacts.forEach(c => {
      if (c.company_id != null && !contactMap[c.company_id]) {
        contactMap[c.company_id] = c.contact_number || ''
      }
    })

    const repMap = {}
    reps.forEach(r => { repMap[r.legacy_id] = r })

    const rows = matchedDetails.map(d => {
      const inv = invMap[d.po_id] || {}
      const cust = custMap[inv.company_id] || {}
      const rep = repMap[d.sales_rep_id] || {}
      const subtotal = parseFloat(inv.net_amount) || 0
      const shippingTax = (parseFloat(inv.shipping_costs) || 0) + (parseFloat(inv.sales_tax_amount) || 0)
      const isPaid = (inv.paid_value || '').toUpperCase() === 'PAID'
      const commission = parseFloat(d.total_price) || 0

      return {
        commission_detail_id: String(d._id),
        po_id: d.po_id,
        sales_rep_id: d.sales_rep_id,
        rep_name: rep.first_name ? `${rep.first_name} ${rep.last_name || ''}`.trim() : `Rep #${d.sales_rep_id}`,
        rep_code: rep.user_cust_code || '',
        company_name: cust.company_name || '',
        contact_phone: contactMap[inv.company_id] || '',
        invoice_number: inv.invoice_number || '',
        shipped_date: inv.shipped_date || '',
        subtotal,
        shipping_and_tax: shippingTax,
        invoice_total: subtotal + shippingTax,
        commission,
        is_paid: isPaid,
        paid_date: inv.paid_date || '',
      }
    })

    rows.sort((a, b) => {
      if (a.rep_name !== b.rep_name) return a.rep_name.localeCompare(b.rep_name)
      const da = a.shipped_date ? new Date(a.shipped_date).getTime() : 0
      const db2 = b.shipped_date ? new Date(b.shipped_date).getTime() : 0
      return da - db2
    })

    res.json(rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET single commission with details
router.get('/:id', async (req, res) => {
  try {
    const comm = await summaryCol().findOne({ _id: new mongoose.Types.ObjectId(req.params.id) })
    if (!comm) return res.status(404).json({ error: 'Commission not found' })

    // Get invoice info
    const inv = await invoiceCol().findOne({ legacy_id: comm.po_id })
    const customer = inv?.company_id ? await custCol().findOne({ legacy_id: inv.company_id }) : null

    // Get commission details (per sales rep)
    const details = await detailCol().find({ po_id: comm.po_id, status: { $in: [1, '1'] } }).toArray()

    // Get sales rep names
    const repIds = [...new Set(details.map(d => d.sales_rep_id).filter(Boolean))]
    const reps = await repCol().find({ legacy_id: { $in: repIds } }).project({ legacy_id: 1, first_name: 1, last_name: 1, user_cust_code: 1 }).toArray()
    const repMap = {}
    reps.forEach(r => { repMap[r.legacy_id] = r })

    // Get payment records
    const payments = await payRepCol().find({ po_id: String(comm.po_id) }).toArray()

    // Get PO line items
    const poItemsCol = mongoose.connection.db.collection('po_items')
    const items = await poItemsCol.find({ po_id: comm.po_id }).toArray()

    // Get commission item details (base_price, total_price per item)
    const commItemDetCol = mongoose.connection.db.collection('commission_item_details')
    const commItemDets = await commItemDetCol.find({ po_id: comm.po_id }).toArray()

    // Get commission rep details (per-unit commission per rep per item)
    const commRepDetCol = mongoose.connection.db.collection('commission_rep_details')
    const commRepDets = await commRepDetCol.find({ po_id: comm.po_id }).toArray()

    // Get all reps assigned to this customer
    const custRepMapCol = mongoose.connection.db.collection('cust_sales_rep_map')
    const custRepMaps = inv?.company_id ? await custRepMapCol.find({ company_id: inv.company_id, status: { $in: [1, '1'] } }).toArray() : []
    const allRepIds = [...new Set([...repIds, ...custRepMaps.map(m => m.sales_rep_id)])]
    const allReps = await repCol().find({ legacy_id: { $in: allRepIds } }).project({ legacy_id: 1, first_name: 1, last_name: 1, user_cust_code: 1, commission_rate: 1 }).toArray()
    const allRepMap = {}
    allReps.forEach(r => { allRepMap[r.legacy_id] = r })

    const detailsWithReps = details.map(d => ({
      ...d,
      rep_name: allRepMap[d.sales_rep_id] ? `${allRepMap[d.sales_rep_id].first_name || ''} ${allRepMap[d.sales_rep_id].last_name || ''}`.trim() : '',
      rep_code: allRepMap[d.sales_rep_id]?.user_cust_code || '',
    }))

    // Old PHP: Balance Due = po_net_amount - SUM(received_amt FROM invoice_payment WHERE inv_com_id = commission_id)
    // Check both commission_payments (old migrated) and invoice_payments (new) collections
    const invComId = String(comm.legacy_id)
    const poId = comm.po_id
    const [oldPayments, newPayments] = await Promise.all([
      mongoose.connection.db.collection('commission_payments').find({ $or: [{ inv_com_id: invComId }, { po_id: poId }, { po_id: String(poId) }] }).toArray(),
      mongoose.connection.db.collection('invoice_payments').find({ $or: [{ inv_com_id: invComId }, { po_id: String(poId) }] }).toArray(),
    ])
    const totalReceived = [...oldPayments, ...newPayments].reduce((s, p) => s + (parseFloat(p.received_amt) || 0), 0)

    res.json({
      ...comm,
      invoice: { ...(inv || {}), total_received: totalReceived, balance_due: Math.max(0, (inv?.net_amount || 0) - totalReceived) },
      customer: customer || {},
      company_name: customer?.company_name || '',
      details: detailsWithReps,
      payments,
      mainPayments: [...oldPayments, ...newPayments],
      items: items.map(it => ({ ...it, item_name: it.po_item_name || it.item_name || '', qty: it.item_qty || it.qty || 0, unit_cost: parseFloat(it.item_unit_cost || it.unit_cost) || 0, item_id: it.item_id || it.legacy_id })),
      reps: allReps,
      commItemDets,
      commRepDets,
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PUT mark commission as paid
router.put('/:id/paid', async (req, res) => {
  try {
    const result = await summaryCol().findOneAndUpdate(
      { _id: new mongoose.Types.ObjectId(req.params.id) },
      { $set: { commission_paid_status: 1, comm_paid_date: new Date() } },
      { returnDocument: 'after' }
    )
    if (!result) return res.status(404).json({ error: 'Commission not found' })
    res.json(result)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// PUT mark commission as unpaid
router.put('/:id/unpaid', async (req, res) => {
  try {
    const result = await summaryCol().findOneAndUpdate(
      { _id: new mongoose.Types.ObjectId(req.params.id) },
      { $set: { commission_paid_status: 0, comm_paid_date: null } },
      { returnDocument: 'after' }
    )
    if (!result) return res.status(404).json({ error: 'Commission not found' })
    res.json(result)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// POST create commission
router.post('/', async (req, res) => {
  try {
    const { po_id, company_id, reps } = req.body
    // reps = [{ sales_rep_id, total_price }]
    if (!po_id) return res.status(400).json({ error: 'Invoice/PO is required' })
    if (!reps || !reps.length) return res.status(400).json({ error: 'At least one sales rep is required' })

    const totalComm = reps.reduce((s, r) => s + (parseFloat(r.total_price) || 0), 0)

    // Create summary
    const maxDoc = await summaryCol().find({}).sort({ legacy_id: -1 }).limit(1).toArray()
    const nextId = (maxDoc[0]?.legacy_id || 0) + 1

    const summary = {
      legacy_id: nextId,
      po_id: parseInt(po_id),
      company_ids: String(company_id || ''),
      total_commission: totalComm,
      commission_paid_status: 0,
      comm_paid_date: null,
      total_commission_percentage: '',
      total_commission_dollar: '',
      status: 1,
      created_at: new Date(),
    }
    await summaryCol().insertOne(summary)

    // Create detail records per rep
    const maxDet = await detailCol().find({}).sort({ legacy_id: -1 }).limit(1).toArray()
    let detId = (maxDet[0]?.legacy_id || 0)
    const detDocs = reps.map(r => {
      detId++
      return {
        legacy_id: detId,
        po_id: parseInt(po_id),
        sales_rep_id: parseInt(r.sales_rep_id),
        total_price: parseFloat(r.total_price) || 0,
        commission_percentage: '',
        commission_dollar: '',
        status: 1,
        created_at: new Date(),
      }
    })
    if (detDocs.length) await detailCol().insertMany(detDocs)

    res.status(201).json({ success: true, total_commission: totalComm })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// PUT update commission
router.put('/:id', async (req, res) => {
  try {
    const comm = await summaryCol().findOne({ _id: new mongoose.Types.ObjectId(req.params.id) })
    if (!comm) return res.status(404).json({ error: 'Commission not found' })

    const { reps, save_status } = req.body
    if (!reps || !reps.length) return res.status(400).json({ error: 'At least one sales rep is required' })

    const totalComm = reps.reduce((s, r) => s + (parseFloat(r.total_price) || 0), 0)

    // Update summary
    const updateFields = { total_commission: totalComm }
    if (save_status) {
      updateFields.save_status = save_status
      if (save_status === 'percent') updateFields.total_commission_percentage = totalComm
      else if (save_status === 'dollar') updateFields.total_commission_dollar = totalComm
    }
    await summaryCol().updateOne({ _id: comm._id }, { $set: updateFields })

    // Delete old details and insert new
    await detailCol().deleteMany({ po_id: comm.po_id })
    const maxDet = await detailCol().find({}).sort({ legacy_id: -1 }).limit(1).toArray()
    let detId = (maxDet[0]?.legacy_id || 0)
    const detDocs = reps.map(r => {
      detId++
      return {
        legacy_id: detId,
        po_id: comm.po_id,
        sales_rep_id: parseInt(r.sales_rep_id),
        total_price: parseFloat(r.total_price) || 0,
        commission_percentage: '',
        commission_dollar: '',
        status: 1,
        created_at: new Date(),
      }
    })
    if (detDocs.length) await detailCol().insertMany(detDocs)

    res.json({ success: true, total_commission: totalComm })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// POST add payment to commission
router.post('/:id/payment', async (req, res) => {
  try {
    const comm = await summaryCol().findOne({ _id: new mongoose.Types.ObjectId(req.params.id) })
    if (!comm) return res.status(404).json({ error: 'Commission not found' })

    const { commission_paid_date, received_date, received_amount, paid_mode, partial_comm_total, mark_paid, rep_payments } = req.body
    // rep_payments = [{rep_id, paid_amount}]

    // Insert payment record into invoice_payments
    const paymentDoc = {
      po_id: String(comm.po_id),
      inv_com_id: String(comm.legacy_id),
      commission_paid_date: commission_paid_date || '',
      received_date: received_date || '',
      compaid_mode: paid_mode || '',
      partial_com_total: parseFloat(partial_comm_total) || 0,
      received_amt: parseFloat(received_amount) || 0,
      inv_payment_status: 1,
      created_at: new Date(),
    }
    const payResult = await payCol().insertOne(paymentDoc)

    // Insert per-rep payment records (matching old PHP logic)
    // Old PHP: balance_comm_amount = current outstanding balance (before payment - paid = new balance)
    if (rep_payments && rep_payments.length) {
      // Get current outstanding per rep from existing payment_reps
      const existingRepPays = await payRepCol().find({ po_id: String(comm.po_id) }).toArray()

      const repDocs = rep_payments.map(rp => {
        const paid = parseFloat(rp.paid_amount) || 0
        const orgAmount = parseFloat(rp.org_amount) || 0
        // Calculate current outstanding: org_amount - sum of all previous payments for this rep
        const prevPaid = existingRepPays
          .filter(p => String(p.rep_id) === String(rp.rep_id))
          .reduce((s, p) => s + (parseFloat(p.comm_paid_amount) || 0), 0)
        const currentOutstanding = orgAmount - prevPaid
        const newBalance = Math.max(0, currentOutstanding - paid)

        return {
          po_id: String(comm.po_id),
          rep_id: String(rp.rep_id),
          id_inv_payment: String(payResult.insertedId),
          rep_comm_org_amount: String(orgAmount),
          comm_paid_amount: String(paid),
          balance_comm_amount: String(newBalance),
          inv_pay_rep_created_on: new Date().toISOString().replace('T', ' ').slice(0, 19),
          inv_pay_rep_status: '1',
        }
      })
      await payRepCol().insertMany(repDocs)
    }

    // Mark commission as paid if requested
    if (mark_paid) {
      await summaryCol().updateOne({ _id: comm._id }, { $set: { commission_paid_status: 1, comm_paid_date: commission_paid_date || new Date().toISOString().slice(0, 10) } })
    }

    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE commission (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    const result = await summaryCol().findOneAndUpdate(
      { _id: new mongoose.Types.ObjectId(req.params.id) },
      { $set: { status: 2 } },
      { returnDocument: 'after' }
    )
    if (!result) return res.status(404).json({ error: 'Commission not found' })
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
