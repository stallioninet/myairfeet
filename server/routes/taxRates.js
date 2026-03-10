import { Router } from 'express'
import mongoose from 'mongoose'

const router = Router()
const col = () => mongoose.connection.db.collection('tax_rates')

// GET all tax rates
router.get('/', async (req, res) => {
  try {
    const rates = await col().find({}).sort({ name: 1 }).toArray()
    res.json(rates)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET single tax rate
router.get('/:id', async (req, res) => {
  try {
    const rate = await col().findOne({ _id: new mongoose.Types.ObjectId(req.params.id) })
    if (!rate) return res.status(404).json({ error: 'Tax rate not found' })
    res.json(rate)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST create tax rate
router.post('/', async (req, res) => {
  try {
    const { name, rate, state, status } = req.body
    if (!name) return res.status(400).json({ error: 'Tax name is required' })
    const { factor } = req.body
    const doc = {
      name: name.trim(),
      rate: parseFloat(rate) || 0,
      factor: parseFloat(factor) || 0,
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

// PUT update tax rate
router.put('/:id', async (req, res) => {
  try {
    const { name, rate, factor, state, status } = req.body
    const update = {}
    if (name !== undefined) update.name = name.trim()
    if (rate !== undefined) update.rate = parseFloat(rate) || 0
    if (factor !== undefined) update.factor = parseFloat(factor) || 0
    if (state !== undefined) update.state = (state || '').trim()
    if (status !== undefined) update.status = status
    update.updated_at = new Date()

    await col().updateOne(
      { _id: new mongoose.Types.ObjectId(req.params.id) },
      { $set: update }
    )
    const updated = await col().findOne({ _id: new mongoose.Types.ObjectId(req.params.id) })
    res.json(updated)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE tax rate
router.delete('/:id', async (req, res) => {
  try {
    await col().deleteOne({ _id: new mongoose.Types.ObjectId(req.params.id) })
    res.json({ message: 'Tax rate deleted' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
