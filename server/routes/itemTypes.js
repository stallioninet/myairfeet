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

// GET check unique name
router.get('/check-unique', async (req, res) => {
  try {
    const { name, exclude_id } = req.query
    if (!name) return res.json({ unique: true })
    const filter = { name: { $regex: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } }
    if (exclude_id) filter._id = { $ne: exclude_id }
    const existing = await ItemType.findOne(filter)
    res.json({ unique: !existing })
  } catch (err) { res.status(500).json({ error: err.message }) }
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
    const item = await ItemType.findById(req.params.id)
    if (!item) return res.status(404).json({ error: 'Item type not found' })
    // Check if in use by any product items
    const ProductItem = (await import('../models/ProductItem.js')).default
    const inUse = await ProductItem.countDocuments({ item_type: req.params.id })
    if (inUse > 0) return res.status(400).json({ error: `Cannot delete: ${inUse} product(s) use this item type` })
    await ItemType.findByIdAndDelete(req.params.id)
    res.json({ message: 'Item type deleted' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
