import { Router } from 'express'
import mongoose from 'mongoose'

const router = Router()
const col = () => mongoose.connection.db.collection('customer_types')

// GET all customer types
router.get('/', async (req, res) => {
  try {
    const data = await col().find({}).sort({ name: 1 }).toArray()
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET single customer type
router.get('/:id', async (req, res) => {
  try {
    const doc = await col().findOne({ _id: new mongoose.Types.ObjectId(req.params.id) })
    if (!doc) return res.status(404).json({ error: 'Customer type not found' })
    res.json(doc)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST create customer type
router.post('/', async (req, res) => {
  try {
    const { name, description, start_number } = req.body
    if (!name || !name.trim()) return res.status(400).json({ error: 'Name is required' })
    const code = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
    const doc = {
      name: name.trim(),
      code,
      start_number: (start_number || '').trim(),
      description: (description || '').trim(),
      status: 'active',
      created_at: new Date(),
      updated_at: new Date()
    }
    const result = await col().insertOne(doc)
    doc._id = result.insertedId
    res.status(201).json(doc)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// PUT update customer type
router.put('/:id', async (req, res) => {
  try {
    const { name, description, start_number, status } = req.body
    const update = { updated_at: new Date() }
    if (name !== undefined) {
      update.name = name.trim()
      update.code = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
    }
    if (description !== undefined) update.description = description.trim()
    if (start_number !== undefined) update.start_number = start_number.trim()
    if (status !== undefined) update.status = status
    const result = await col().findOneAndUpdate(
      { _id: new mongoose.Types.ObjectId(req.params.id) },
      { $set: update },
      { returnDocument: 'after' }
    )
    if (!result) return res.status(404).json({ error: 'Customer type not found' })
    res.json(result)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// DELETE customer type
router.delete('/:id', async (req, res) => {
  try {
    const result = await col().deleteOne({ _id: new mongoose.Types.ObjectId(req.params.id) })
    if (result.deletedCount === 0) return res.status(404).json({ error: 'Customer type not found' })
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
