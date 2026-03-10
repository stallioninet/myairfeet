import { Router } from 'express'
import mongoose from 'mongoose'

const router = Router()
const col = () => mongoose.connection.db.collection('suppliers')

// GET all suppliers (optionally filter by status)
router.get('/', async (req, res) => {
  try {
    const filter = {}
    if (req.query.status) filter.status = req.query.status
    const data = await col().find(filter).sort({ supplier_name: 1 }).toArray()
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET stats
router.get('/stats', async (req, res) => {
  try {
    const [total, active, inactive] = await Promise.all([
      col().countDocuments(),
      col().countDocuments({ status: 'active' }),
      col().countDocuments({ status: 'inactive' }),
    ])
    const types = await col().distinct('supplier_type')
    const activeTypes = types.filter(t => t && t.trim() !== '').length
    res.json({ total, active, inactive, activeTypes })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET single supplier
router.get('/:id', async (req, res) => {
  try {
    const doc = await col().findOne({ _id: new mongoose.Types.ObjectId(req.params.id) })
    if (!doc) return res.status(404).json({ error: 'Supplier not found' })
    res.json(doc)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST create
router.post('/', async (req, res) => {
  try {
    const { supplier_name, supplier_type, contact_name, phone, extension, email, customer_code,
      notes, terms, fob, ship, ship_via, project, status, city, state } = req.body
    if (!supplier_name) return res.status(400).json({ error: 'Supplier name is required' })
    const doc = {
      supplier_name: supplier_name.trim(),
      supplier_type: (supplier_type || '').trim(),
      contact_name: (contact_name || '').trim(),
      phone: (phone || '').trim(),
      extension: (extension || '').trim(),
      email: (email || '').trim(),
      customer_code: (customer_code || '').trim(),
      notes: (notes || '').trim(),
      terms: (terms || '').trim(),
      fob: (fob || '').trim(),
      ship: (ship || '').trim(),
      ship_via: (ship_via || '').trim(),
      project: (project || '').trim(),
      city: (city || '').trim(),
      state: (state || '').trim(),
      status: status || 'active',
      created_at: new Date(),
    }
    const result = await col().insertOne(doc)
    res.json({ ...doc, _id: result.insertedId })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PUT update
router.put('/:id', async (req, res) => {
  try {
    const update = { updated_at: new Date() }
    const fields = ['supplier_name', 'supplier_type', 'contact_name', 'phone', 'extension',
      'email', 'customer_code', 'notes', 'terms', 'fob', 'ship', 'ship_via', 'project',
      'city', 'state', 'status']
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

// DELETE
router.delete('/:id', async (req, res) => {
  try {
    await col().deleteOne({ _id: new mongoose.Types.ObjectId(req.params.id) })
    res.json({ message: 'Supplier deleted' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
