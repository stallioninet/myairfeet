import express from 'express'
import ProductSize from '../models/ProductSize.js'

const router = express.Router()

// GET all sizes
router.get('/', async (req, res) => {
  try {
    const sizes = await ProductSize.find().sort({ sort_order: 1 })
    res.json(sizes)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET single size
router.get('/:id', async (req, res) => {
  try {
    const size = await ProductSize.findById(req.params.id)
    if (!size) return res.status(404).json({ error: 'Size not found' })
    res.json(size)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST create size
router.post('/', async (req, res) => {
  try {
    const size = new ProductSize(req.body)
    await size.save()
    res.status(201).json(size)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// PUT update size
router.put('/:id', async (req, res) => {
  try {
    const size = await ProductSize.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
    if (!size) return res.status(404).json({ error: 'Size not found' })
    res.json(size)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// PUT deactivate
router.put('/:id/deactivate', async (req, res) => {
  try {
    const size = await ProductSize.findByIdAndUpdate(req.params.id, { status: 'inactive' }, { new: true })
    if (!size) return res.status(404).json({ error: 'Size not found' })
    res.json(size)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PUT activate
router.put('/:id/activate', async (req, res) => {
  try {
    const size = await ProductSize.findByIdAndUpdate(req.params.id, { status: 'active' }, { new: true })
    if (!size) return res.status(404).json({ error: 'Size not found' })
    res.json(size)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE size
router.delete('/:id', async (req, res) => {
  try {
    const size = await ProductSize.findByIdAndDelete(req.params.id)
    if (!size) return res.status(404).json({ error: 'Size not found' })
    res.json({ message: 'Size deleted' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
