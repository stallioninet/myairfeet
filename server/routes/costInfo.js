import { Router } from 'express'
import mongoose from 'mongoose'

const router = Router()
const col = () => mongoose.connection.db.collection('cost_info')

// GET all cost info
router.get('/', async (req, res) => {
  try {
    const data = await col().find({}).sort({ name: 1 }).toArray()
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET single
router.get('/:id', async (req, res) => {
  try {
    const doc = await col().findOne({ _id: new mongoose.Types.ObjectId(req.params.id) })
    if (!doc) return res.status(404).json({ error: 'Cost info not found' })
    res.json(doc)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST create
router.post('/', async (req, res) => {
  try {
    const { name, description, status } = req.body
    if (!name) return res.status(400).json({ error: 'Cost name is required' })
    const doc = {
      name: name.trim(),
      description: (description || '').trim(),
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
    const { name, description, status } = req.body
    const update = {}
    if (name !== undefined) update.name = name.trim()
    if (description !== undefined) update.description = (description || '').trim()
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

// DELETE
router.delete('/:id', async (req, res) => {
  try {
    await col().deleteOne({ _id: new mongoose.Types.ObjectId(req.params.id) })
    res.json({ message: 'Cost info deleted' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
