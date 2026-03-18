import express from 'express'
import mongoose from 'mongoose'
import { ObjectId } from 'mongodb'

const router = express.Router()

// Helper to get raw collections
const db = () => mongoose.connection.db
const col = (name) => db().collection(name)

// Helper to safely parse ObjectId
const toObjectId = (id) => {
  try {
    return new ObjectId(id)
  } catch {
    return null
  }
}

// ============================================================
// EVENT TYPES
// ============================================================

// GET /types - list all event types
router.get('/types', async (req, res) => {
  try {
    const types = await col('event_types').find({}).toArray()
    res.json(types)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /types - create event type
router.post('/types', async (req, res) => {
  try {
    const doc = { ...req.body, status: req.body.status || 'active' }
    const result = await col('event_types').insertOne(doc)
    res.status(201).json({ _id: result.insertedId, ...doc })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// PUT /types/:id - update event type
router.put('/types/:id', async (req, res) => {
  try {
    const oid = toObjectId(req.params.id)
    if (!oid) return res.status(400).json({ error: 'Invalid ID' })
    const result = await col('event_types').findOneAndUpdate(
      { _id: oid },
      { $set: req.body },
      { returnDocument: 'after' }
    )
    if (!result) return res.status(404).json({ error: 'Event type not found' })
    res.json(result)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// DELETE /types/:id - delete event type
router.delete('/types/:id', async (req, res) => {
  try {
    const oid = toObjectId(req.params.id)
    if (!oid) return res.status(400).json({ error: 'Invalid ID' })
    const result = await col('event_types').deleteOne({ _id: oid })
    if (result.deletedCount === 0) return res.status(404).json({ error: 'Event type not found' })
    res.json({ message: 'Event type deleted' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ============================================================
// COST INFO
// ============================================================

// GET /costs - list all cost_info
router.get('/costs', async (req, res) => {
  try {
    const costs = await col('cost_info').find({}).toArray()
    res.json(costs)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /costs - create cost_info
router.post('/costs', async (req, res) => {
  try {
    const doc = {
      ...req.body,
      cost_created: new Date(),
      cost_modified: new Date(),
      cost_status: req.body.cost_status || 'active'
    }
    const result = await col('cost_info').insertOne(doc)
    res.status(201).json({ _id: result.insertedId, ...doc })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// PUT /costs/:id - update cost_info
router.put('/costs/:id', async (req, res) => {
  try {
    const oid = toObjectId(req.params.id)
    if (!oid) return res.status(400).json({ error: 'Invalid ID' })
    const update = { ...req.body, cost_modified: new Date() }
    const result = await col('cost_info').findOneAndUpdate(
      { _id: oid },
      { $set: update },
      { returnDocument: 'after' }
    )
    if (!result) return res.status(404).json({ error: 'Cost info not found' })
    res.json(result)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// DELETE /costs/:id - delete cost_info
router.delete('/costs/:id', async (req, res) => {
  try {
    const oid = toObjectId(req.params.id)
    if (!oid) return res.status(400).json({ error: 'Invalid ID' })
    const result = await col('cost_info').deleteOne({ _id: oid })
    if (result.deletedCount === 0) return res.status(404).json({ error: 'Cost info not found' })
    res.json({ message: 'Cost info deleted' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ============================================================
// EVENTS STATS
// ============================================================

// GET /stats - summary stats
router.get('/stats', async (req, res) => {
  try {
    const events = col('events')
    const total = await events.countDocuments()
    const active = await events.countDocuments({ status: 'active' })
    const inactive = await events.countDocuments({ status: 'inactive' })

    // Total receipts across all events
    const receiptAgg = await col('event_day_receipt_info').aggregate([
      { $match: { status: { $ne: 'deleted' } } },
      { $group: {
        _id: null,
        totalCash: { $sum: { $toDouble: { $ifNull: ['$cash', 0] } } },
        totalCredit: { $sum: { $toDouble: { $ifNull: ['$credit', 0] } } },
        totalChecks: { $sum: { $toDouble: { $ifNull: ['$checks', 0] } } },
        count: { $sum: 1 }
      }}
    ]).toArray()

    // Total costs across all events
    const costAgg = await col('event_item_cost').aggregate([
      { $match: { status: { $ne: 'deleted' } } },
      { $group: {
        _id: null,
        totalCost: { $sum: { $toDouble: { $ifNull: ['$price', 0] } } },
        count: { $sum: 1 }
      }}
    ]).toArray()

    const totalItems = await col('event_items').countDocuments()

    const receipt = receiptAgg[0] || { totalCash: 0, totalCredit: 0, totalChecks: 0, count: 0 }
    const cost = costAgg[0] || { totalCost: 0, count: 0 }
    const totalRevenue = receipt.totalCash + receipt.totalCredit + receipt.totalChecks

    res.json({
      total,
      active,
      inactive,
      totalItems,
      totalRevenue,
      totalCost: cost.totalCost,
      receiptDays: receipt.count,
      costEntries: cost.count
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ============================================================
// EVENTS CRUD
// ============================================================

// GET / - list all events with computed receipts/costs
router.get('/', async (req, res) => {
  try {
    const { status } = req.query
    const filter = status ? { status } : {}
    const events = await col('events').find(filter).sort({ created_at: -1 }).toArray()

    // Use event_id (numeric) for sub-collection lookups
    const eventIds = events.map(e => e.event_id || e.legacy_id).filter(Boolean)

    // Resolve tax state names for location column
    const taxIds = [...new Set(events.map(e => e.salesTax_state_id).filter(Boolean))]
    const taxes = taxIds.length > 0 ? await col('tax_rates').find({ sales_tax_id: { $in: taxIds } }).toArray() : []
    const taxMap = {}
    taxes.forEach(t => { taxMap[t.sales_tax_id] = t.sales_tax_item_name || '' })

    // Fetch receipt totals grouped by event_id
    const receipts = await col('event_day_receipt_info').aggregate([
      { $match: { event_id: { $in: eventIds } } },
      { $group: {
        _id: '$event_id',
        totalCash: { $sum: { $toDouble: { $ifNull: ['$cash', 0] } } },
        totalCredit: { $sum: { $toDouble: { $ifNull: ['$credit', 0] } } },
        totalChecks: { $sum: { $toDouble: { $ifNull: ['$checks', 0] } } },
        days: { $sum: 1 }
      }}
    ]).toArray()
    const receiptMap = Object.fromEntries(receipts.map(r => [r._id, r]))

    // Fetch cost totals grouped by event_id
    const costs = await col('event_item_cost').aggregate([
      { $match: { event_id: { $in: eventIds } } },
      { $group: {
        _id: '$event_id',
        totalCost: { $sum: { $toDouble: { $ifNull: ['$price', 0] } } },
        costEntries: { $sum: 1 }
      }}
    ]).toArray()
    const costMap = Object.fromEntries(costs.map(c => [c._id, c]))

    // Fetch item counts and total qty grouped by event_id
    const items = await col('event_items').aggregate([
      { $match: { event_id: { $in: eventIds } } },
      { $group: { _id: '$event_id', itemCount: { $sum: 1 }, totalQty: { $sum: { $toInt: { $ifNull: ['$total_qty', 0] } } } } }
    ]).toArray()
    const itemMap = Object.fromEntries(items.map(i => [i._id, i]))

    // Fetch commission (advisor bonus) totals grouped by event_id
    const bonuses = await col('advisor_bonus_info').aggregate([
      { $match: { event_id: { $in: eventIds } } },
      { $group: {
        _id: '$event_id',
        totalCommission: { $sum: { $toDouble: { $ifNull: ['$total_bonus', 0] } } },
        paidDate: { $max: '$paid_date' }
      }}
    ]).toArray()
    const bonusMap = Object.fromEntries(bonuses.map(b => [b._id, b]))

    // Attach computed fields to each event
    const enriched = events.map(e => {
      const eid = e.event_id || e.legacy_id || ''
      const r = receiptMap[eid] || { totalCash: 0, totalCredit: 0, totalChecks: 0, days: 0 }
      const c = costMap[eid] || { totalCost: 0, costEntries: 0 }
      const it = itemMap[eid] || { itemCount: 0, totalQty: 0 }
      const b = bonusMap[eid] || { totalCommission: 0, paidDate: null }
      const totalRevenue = r.totalCash + r.totalCredit + r.totalChecks
      const profit = totalRevenue - c.totalCost - b.totalCommission
      return {
        ...e,
        // Map old MySQL fields to what frontend expects
        name: e.event_name || e.name || '',
        event_number: e.event_cust_code || e.event_number || '',
        start_date: e.event_start || e.start_date || '',
        end_date: e.event_end || e.end_date || '',
        location: taxMap[e.salesTax_state_id] || e.location || '',
        old_event_id: e.event_id || e.legacy_id || '',
        totalRevenue,
        totalCost: c.totalCost,
        itemCount: it.itemCount,
        totalQty: it.totalQty,
        receiptDays: r.days,
        totalCommission: b.totalCommission,
        paidDate: b.paidDate,
        profit
      }
    })

    res.json(enriched)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /check-unique - validate event name/number
router.get('/check-unique', async (req, res) => {
  try {
    const { field, value, exclude_id } = req.query
    if (!field || !value) return res.json({ unique: true })
    if (!['event_number', 'name'].includes(field)) return res.status(400).json({ error: 'Invalid field' })
    const filter = { [field]: { $regex: new RegExp(`^${value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } }
    if (exclude_id) filter._id = { $ne: toObjectId(exclude_id) }
    const existing = await col('events').findOne(filter)
    res.json({ unique: !existing })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// GET /:id - single event with items, costs, receipts
router.get('/:id', async (req, res) => {
  try {
    const oid = toObjectId(req.params.id)
    if (!oid) return res.status(400).json({ error: 'Invalid ID' })

    const event = await col('events').findOne({ _id: oid })
    if (!event) return res.status(404).json({ error: 'Event not found' })

    const eid = event.event_id || event.legacy_id
    const eidQuery = { $in: [eid, String(eid), parseInt(eid)] }

    const [items, costs, receipts] = await Promise.all([
      col('event_items').find({ event_id: eidQuery }).toArray(),
      col('event_item_cost').find({ event_id: eidQuery }).toArray(),
      col('event_day_receipt_info').find({ event_id: eidQuery }).toArray()
    ])

    // Resolve sales tax state name
    let salesTax_state_name = ''
    if (event.salesTax_state_id) {
      const tax = await col('tax_rates').findOne({ $or: [{ sales_tax_id: event.salesTax_state_id }, { legacy_id: event.salesTax_state_id }] })
      salesTax_state_name = tax?.sales_tax_item_name || tax?.name || ''
    }

    // Resolve product names for items
    const productIds = [...new Set(items.map(i => i.product_id).filter(Boolean))]
    const products = productIds.length > 0 ? await col('product_items_master').find({ legacy_id: { $in: productIds } }).toArray() : []
    const prodMap = {}
    products.forEach(p => { prodMap[p.legacy_id] = p.item_name || '' })

    // Resolve size names
    const sizeIds = [...new Set(items.map(i => parseInt(i.size_name)).filter(Boolean))]
    const sizes = sizeIds.length > 0 ? await col('item_sizes').find({ id_item_size: { $in: sizeIds } }).toArray() : []
    const sizeMap = {}
    sizes.forEach(s => { sizeMap[s.id_item_size] = s.size_name || '' })

    const resolvedItems = items.map(i => ({
      ...i,
      product_name: prodMap[i.product_id] || '',
      size_resolved: sizeMap[parseInt(i.size_name)] || i.size_name || '',
    }))

    // Resolve cost item names
    const costItemIds = [...new Set(costs.map(c => c.item_name).filter(Boolean))]
    const costInfos = costItemIds.length > 0 ? await col('cost_infos').find({ cost_id: { $in: costItemIds.map(Number) } }).toArray() : []
    const costMap = {}
    costInfos.forEach(c => { costMap[c.cost_id] = c.items || c.description || '' })

    const resolvedCosts = costs.map(c => ({
      ...c,
      item_name_resolved: costMap[c.item_name] || `Cost #${c.item_name}`,
    }))

    // Resolve receipt fields
    const resolvedReceipts = receipts.map(r => ({
      ...r,
      cash: parseFloat(r.cash_amount || r.cash) || 0,
      credit: parseFloat(r.credit_amount || r.credit) || 0,
      checks: parseFloat(r.check_amount || r.checks) || 0,
      hours: r.hours || r.receipt_hours || '',
      receipt_date: r.receipt_date || r.day_date || '',
    }))

    res.json({
      ...event,
      name: event.event_name || event.name || '',
      event_number: event.event_cust_code || event.event_number || '',
      start_date: event.event_start || event.start_date || '',
      end_date: event.event_end || event.end_date || '',
      old_event_id: event.event_id || event.legacy_id || '',
      notes: event.event_notes || event.notes || '',
      items: resolvedItems, costs: resolvedCosts, receipts: resolvedReceipts, salesTax_state_name
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST / - create event
router.post('/', async (req, res) => {
  try {
    const doc = {
      ...req.body,
      status: req.body.status || 'active',
      created_at: new Date()
    }
    const result = await col('events').insertOne(doc)
    res.status(201).json({ _id: result.insertedId, ...doc })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// PUT /:id - update event
router.put('/:id', async (req, res) => {
  try {
    const oid = toObjectId(req.params.id)
    if (!oid) return res.status(400).json({ error: 'Invalid ID' })
    const result = await col('events').findOneAndUpdate(
      { _id: oid },
      { $set: req.body },
      { returnDocument: 'after' }
    )
    if (!result) return res.status(404).json({ error: 'Event not found' })
    res.json(result)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// DELETE /:id - delete event
router.delete('/:id', async (req, res) => {
  try {
    const oid = toObjectId(req.params.id)
    if (!oid) return res.status(400).json({ error: 'Invalid ID' })
    const result = await col('events').deleteOne({ _id: oid })
    if (result.deletedCount === 0) return res.status(404).json({ error: 'Event not found' })
    res.json({ message: 'Event deleted' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ============================================================
// EVENT ITEMS (for a specific event)
// ============================================================

// GET /:id/items - list items for an event
router.get('/:id/items', async (req, res) => {
  try {
    const oid = toObjectId(req.params.id)
    if (!oid) return res.status(400).json({ error: 'Invalid ID' })

    const event = await col('events').findOne({ _id: oid })
    if (!event) return res.status(404).json({ error: 'Event not found' })

    const items = await col('event_items').find({ event_id: event.event_id || event.legacy_id || event._id.toString() }).toArray()
    res.json(items)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /:id/items - add item to event
router.post('/:id/items', async (req, res) => {
  try {
    const oid = toObjectId(req.params.id)
    if (!oid) return res.status(400).json({ error: 'Invalid ID' })

    const event = await col('events').findOne({ _id: oid })
    if (!event) return res.status(404).json({ error: 'Event not found' })

    const doc = {
      ...req.body,
      event_id: event.event_id || event.legacy_id || event._id.toString(),
      created_on: new Date(),
      modified_on: new Date(),
      status: req.body.status || 'active'
    }
    const result = await col('event_items').insertOne(doc)
    res.status(201).json({ _id: result.insertedId, ...doc })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// DELETE /items/:itemId - delete an event item
router.delete('/items/:itemId', async (req, res) => {
  try {
    const oid = toObjectId(req.params.itemId)
    if (!oid) return res.status(400).json({ error: 'Invalid ID' })
    const result = await col('event_items').deleteOne({ _id: oid })
    if (result.deletedCount === 0) return res.status(404).json({ error: 'Event item not found' })
    res.json({ message: 'Event item deleted' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ============================================================
// EVENT DAY RECEIPTS
// ============================================================

// GET /:id/receipts - list receipts for an event
router.get('/:id/receipts', async (req, res) => {
  try {
    const oid = toObjectId(req.params.id)
    if (!oid) return res.status(400).json({ error: 'Invalid ID' })

    const event = await col('events').findOne({ _id: oid })
    if (!event) return res.status(404).json({ error: 'Event not found' })

    const receipts = await col('event_day_receipt_info').find({ event_id: event.event_id || event.legacy_id || event._id.toString() }).toArray()
    res.json(receipts)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /:id/receipts - add receipt to event
router.post('/:id/receipts', async (req, res) => {
  try {
    const oid = toObjectId(req.params.id)
    if (!oid) return res.status(400).json({ error: 'Invalid ID' })

    const event = await col('events').findOne({ _id: oid })
    if (!event) return res.status(404).json({ error: 'Event not found' })

    const doc = {
      ...req.body,
      event_id: event.event_id || event.legacy_id || event._id.toString(),
      created_on: new Date(),
      modified_on: new Date(),
      status: req.body.status || 'active'
    }
    const result = await col('event_day_receipt_info').insertOne(doc)
    res.status(201).json({ _id: result.insertedId, ...doc })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// ============================================================
// ADVISORS (assign sales reps/advisors to events)
// ============================================================

// GET advisors for an event
router.get('/:id/advisors', async (req, res) => {
  try {
    // Get event to find numeric event_id
    const oid = toObjectId(req.params.id)
    const event = oid ? await col('events').findOne({ _id: oid }) : null
    const numericId = event?.event_id || event?.legacy_id

    // Search both old (event_advisor_map) and new (event_advisors) collections
    let advisors = []
    if (numericId) {
      advisors = await col('event_advisor_map').find({ event_id: numericId }).toArray()
    }
    if (advisors.length === 0) {
      advisors = await col('event_advisors').find({ event_id: req.params.id }).toArray()
    }

    // Get rep names - advisor_id is numeric (legacy user ID)
    const repIds = advisors.map(a => a.advisor_id).filter(Boolean)
    const reps = repIds.length > 0 ? await col('app_user').find({ legacy_id: { $in: repIds } }).toArray() : []
    const repMap = {}
    reps.forEach(r => { repMap[r.legacy_id] = r })

    const result = advisors.map(a => ({
      ...a,
      advisor_name: repMap[a.advisor_id] ? `${repMap[a.advisor_id].first_name || ''} ${repMap[a.advisor_id].last_name || ''}`.trim() : `Advisor #${a.advisor_id}`,
      advisor_email: repMap[a.advisor_id]?.email_address || repMap[a.advisor_id]?.email || '',
    }))
    res.json(result)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// POST add advisor to event
router.post('/:id/advisors', async (req, res) => {
  try {
    const doc = {
      event_id: req.params.id,
      advisor_id: req.body.advisor_id,
      role: req.body.role || 'advisor',
      created_at: new Date(),
    }
    const result = await col('event_advisors').insertOne(doc)
    res.status(201).json({ _id: result.insertedId, ...doc })
  } catch (err) { res.status(400).json({ error: err.message }) }
})

// DELETE remove advisor from event
router.delete('/:id/advisors/:advisorMapId', async (req, res) => {
  try {
    await col('event_advisors').deleteOne({ _id: toObjectId(req.params.advisorMapId) })
    res.json({ success: true })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ============================================================
// ADVISOR BONUS PAYMENTS
// ============================================================

// GET bonuses for an event
router.get('/:id/bonuses', async (req, res) => {
  try {
    const oid = toObjectId(req.params.id)
    const event = oid ? await col('events').findOne({ _id: oid }) : null
    const numericId = event?.event_id || event?.legacy_id
    let bonuses = []
    if (numericId) {
      bonuses = await col('advisor_bonus_info').find({ event_id: numericId }).toArray()
    }
    if (bonuses.length === 0) {
      bonuses = await col('advisor_bonus_info').find({ event_id: req.params.id }).toArray()
    }
    res.json(bonuses)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// POST save/update bonus for advisor
router.post('/:id/bonuses', async (req, res) => {
  try {
    const { advisor_id, mul5_bonus, mul10_bonus, hourly_pay, hours_worked, dollar_payment, paid_date, status } = req.body
    const totalBonus = (parseFloat(mul5_bonus) || 0) + (parseFloat(mul10_bonus) || 0) +
      ((parseFloat(hourly_pay) || 0) * (parseFloat(hours_worked) || 0)) + (parseFloat(dollar_payment) || 0)

    const existing = await col('advisor_bonus_info').findOne({ event_id: req.params.id, advisor_id })
    const doc = {
      event_id: req.params.id,
      advisor_id,
      mul5_bonus: parseFloat(mul5_bonus) || 0,
      mul10_bonus: parseFloat(mul10_bonus) || 0,
      hourly_pay: parseFloat(hourly_pay) || 0,
      hours_worked: parseFloat(hours_worked) || 0,
      dollar_payment: parseFloat(dollar_payment) || 0,
      total_bonus: totalBonus,
      paid_date: paid_date || null,
      status: status || (totalBonus > 0 ? 'calculated' : 'pending'),
      updated_at: new Date(),
    }

    if (existing) {
      await col('advisor_bonus_info').updateOne({ _id: existing._id }, { $set: doc })
      res.json({ ...existing, ...doc })
    } else {
      doc.created_at = new Date()
      const result = await col('advisor_bonus_info').insertOne(doc)
      res.status(201).json({ _id: result.insertedId, ...doc })
    }
  } catch (err) { res.status(400).json({ error: err.message }) }
})

// PUT mark bonus as paid
router.put('/bonuses/:bonusId/paid', async (req, res) => {
  try {
    const result = await col('advisor_bonus_info').findOneAndUpdate(
      { _id: toObjectId(req.params.bonusId) },
      { $set: { status: 'paid', paid_date: req.body.paid_date || new Date().toISOString().slice(0, 10), updated_at: new Date() } },
      { returnDocument: 'after' }
    )
    res.json(result)
  } catch (err) { res.status(400).json({ error: err.message }) }
})

// ============================================================
// DAILY RECEIPTS (enhanced with calculation fields)
// ============================================================

// PUT update receipt with daily calculations
router.put('/receipts/:receiptId', async (req, res) => {
  try {
    const { cash, credit, checks, hours, notes } = req.body
    const total_receipt = (parseFloat(cash) || 0) + (parseFloat(credit) || 0) + (parseFloat(checks) || 0)
    const update = {
      cash: parseFloat(cash) || 0,
      credit: parseFloat(credit) || 0,
      checks: parseFloat(checks) || 0,
      hours: parseFloat(hours) || 0,
      total_receipt,
      notes: notes || '',
      updated_at: new Date(),
    }
    const result = await col('event_day_receipt_info').findOneAndUpdate(
      { _id: toObjectId(req.params.receiptId) },
      { $set: update },
      { returnDocument: 'after' }
    )
    res.json(result)
  } catch (err) { res.status(400).json({ error: err.message }) }
})

export default router
