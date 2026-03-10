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

    // Use old_event_id for sub-collection lookups (migrated MySQL IDs)
    const eventIds = events.map(e => e.old_event_id).filter(Boolean)

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
      const eid = e.old_event_id || ''
      const r = receiptMap[eid] || { totalCash: 0, totalCredit: 0, totalChecks: 0, days: 0 }
      const c = costMap[eid] || { totalCost: 0, costEntries: 0 }
      const it = itemMap[eid] || { itemCount: 0, totalQty: 0 }
      const b = bonusMap[eid] || { totalCommission: 0, paidDate: null }
      const totalRevenue = r.totalCash + r.totalCredit + r.totalChecks
      const profit = totalRevenue - c.totalCost - b.totalCommission
      return {
        ...e,
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

// GET /:id - single event with items, costs, receipts
router.get('/:id', async (req, res) => {
  try {
    const oid = toObjectId(req.params.id)
    if (!oid) return res.status(400).json({ error: 'Invalid ID' })

    const event = await col('events').findOne({ _id: oid })
    if (!event) return res.status(404).json({ error: 'Event not found' })

    const eid = event.old_event_id || event._id.toString()

    const [items, costs, receipts] = await Promise.all([
      col('event_items').find({ event_id: eid }).toArray(),
      col('event_item_cost').find({ event_id: eid }).toArray(),
      col('event_day_receipt_info').find({ event_id: eid }).toArray()
    ])

    res.json({ ...event, items, costs, receipts })
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

    const items = await col('event_items').find({ event_id: event.old_event_id || event._id.toString() }).toArray()
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
      event_id: event.old_event_id || event._id.toString(),
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

    const receipts = await col('event_day_receipt_info').find({ event_id: event.old_event_id || event._id.toString() }).toArray()
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
      event_id: event.old_event_id || event._id.toString(),
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

export default router
