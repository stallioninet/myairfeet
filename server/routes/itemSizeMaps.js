import express from 'express'
import ItemSizeMap from '../models/ItemSizeMap.js'

const router = express.Router()

// GET all item size maps (populated)
router.get('/', async (req, res) => {
  try {
    const maps = await ItemSizeMap.find()
      .populate('product_item')
      .populate('size')
      .sort({ created_at: 1 })
    res.json(maps)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST create one or many item size maps (bulk)
router.post('/', async (req, res) => {
  try {
    const items = Array.isArray(req.body) ? req.body : [req.body]
    const created = await ItemSizeMap.insertMany(items)
    const populated = await ItemSizeMap.find({ _id: { $in: created.map(c => c._id) } })
      .populate('product_item')
      .populate('size')
    res.status(201).json(populated)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// PUT update item size map
router.put('/:id', async (req, res) => {
  try {
    const map = await ItemSizeMap.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
      .populate('product_item')
      .populate('size')
    if (!map) return res.status(404).json({ error: 'Item size map not found' })
    res.json(map)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// DELETE item size map
router.delete('/:id', async (req, res) => {
  try {
    const map = await ItemSizeMap.findByIdAndDelete(req.params.id)
    if (!map) return res.status(404).json({ error: 'Item size map not found' })
    res.json({ message: 'Item size map deleted' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
