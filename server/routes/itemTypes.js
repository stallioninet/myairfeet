import express from 'express'
import ItemType from '../models/ItemType.js'

const router = express.Router()

// GET all item types
router.get('/', async (req, res) => {
  try {
    const items = await ItemType.find().sort({ created_at: 1 })
    res.json(items)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET single item type
router.get('/:id', async (req, res) => {
  try {
    const item = await ItemType.findById(req.params.id)
    if (!item) return res.status(404).json({ error: 'Item type not found' })
    res.json(item)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST create item type
router.post('/', async (req, res) => {
  try {
    const item = new ItemType(req.body)
    await item.save()
    res.status(201).json(item)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// PUT update item type
router.put('/:id', async (req, res) => {
  try {
    const item = await ItemType.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
    if (!item) return res.status(404).json({ error: 'Item type not found' })
    res.json(item)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// PUT deactivate
router.put('/:id/deactivate', async (req, res) => {
  try {
    const item = await ItemType.findByIdAndUpdate(req.params.id, { status: 'inactive' }, { new: true })
    if (!item) return res.status(404).json({ error: 'Item type not found' })
    res.json(item)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PUT activate
router.put('/:id/activate', async (req, res) => {
  try {
    const item = await ItemType.findByIdAndUpdate(req.params.id, { status: 'active' }, { new: true })
    if (!item) return res.status(404).json({ error: 'Item type not found' })
    res.json(item)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE item type
router.delete('/:id', async (req, res) => {
  try {
    const item = await ItemType.findByIdAndDelete(req.params.id)
    if (!item) return res.status(404).json({ error: 'Item type not found' })
    res.json({ message: 'Item type deleted' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
