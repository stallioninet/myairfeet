import { Router } from 'express'
import mongoose from 'mongoose'

const router = Router()
const col = () => mongoose.connection.db.collection('product_styles')
const sizeCol = () => mongoose.connection.db.collection('product_sizes')

// ===== Product Sizes (from product_sizes collection) =====
router.get('/sizes', async (req, res) => {
  try {
    const data = await sizeCol().find({}).sort({ name: 1 }).toArray()
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.post('/sizes', async (req, res) => {
  try {
    const { name, description, status } = req.body
    if (!name) return res.status(400).json({ error: 'Size name is required' })
    const doc = { name: name.trim(), description: (description || '').trim(), status: status || 'active', created_at: new Date() }
    const result = await sizeCol().insertOne(doc)
    res.json({ ...doc, _id: result.insertedId })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.put('/sizes/:id', async (req, res) => {
  try {
    const { name, description, status } = req.body
    const update = { updated_at: new Date() }
    if (name !== undefined) update.name = name.trim()
    if (description !== undefined) update.description = (description || '').trim()
    if (status !== undefined) update.status = status
    await sizeCol().updateOne({ _id: new mongoose.Types.ObjectId(req.params.id) }, { $set: update })
    const updated = await sizeCol().findOne({ _id: new mongoose.Types.ObjectId(req.params.id) })
    res.json(updated)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.delete('/sizes/:id', async (req, res) => {
  try {
    await sizeCol().deleteOne({ _id: new mongoose.Types.ObjectId(req.params.id) })
    res.json({ message: 'Product size deleted' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ===== Product Styles =====

// GET all
router.get('/', async (req, res) => {
  try {
    const data = await col().find({}).sort({ name: 1 }).toArray()
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST create
router.post('/', async (req, res) => {
  try {
    const { name, description, status } = req.body
    if (!name) return res.status(400).json({ error: 'Style name is required' })
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
    const update = { updated_at: new Date() }
    if (name !== undefined) update.name = name.trim()
    if (description !== undefined) update.description = (description || '').trim()
    if (status !== undefined) update.status = status
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
    res.json({ message: 'Product style deleted' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
