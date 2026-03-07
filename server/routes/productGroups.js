import express from 'express'
import ProductGroup from '../models/ProductGroup.js'

const router = express.Router()

// GET all groups (populated)
router.get('/', async (req, res) => {
  try {
    const groups = await ProductGroup.find().populate({ path: 'products', populate: { path: 'item_type' } }).sort({ created_at: 1 })
    res.json(groups)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET single group
router.get('/:id', async (req, res) => {
  try {
    const group = await ProductGroup.findById(req.params.id).populate({ path: 'products', populate: { path: 'item_type' } })
    if (!group) return res.status(404).json({ error: 'Group not found' })
    res.json(group)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST create group
router.post('/', async (req, res) => {
  try {
    const group = new ProductGroup(req.body)
    await group.save()
    const populated = await ProductGroup.findById(group._id).populate({ path: 'products', populate: { path: 'item_type' } })
    res.status(201).json(populated)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// POST duplicate group
router.post('/:id/duplicate', async (req, res) => {
  try {
    const original = await ProductGroup.findById(req.params.id)
    if (!original) return res.status(404).json({ error: 'Group not found' })
    const dup = new ProductGroup({
      name: original.name + ' (Copy)',
      description: original.description,
      products: original.products,
      status: original.status,
    })
    await dup.save()
    const populated = await ProductGroup.findById(dup._id).populate({ path: 'products', populate: { path: 'item_type' } })
    res.status(201).json(populated)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// PUT update group
router.put('/:id', async (req, res) => {
  try {
    const group = await ProductGroup.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }).populate({ path: 'products', populate: { path: 'item_type' } })
    if (!group) return res.status(404).json({ error: 'Group not found' })
    res.json(group)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// PUT deactivate
router.put('/:id/deactivate', async (req, res) => {
  try {
    const group = await ProductGroup.findByIdAndUpdate(req.params.id, { status: 'inactive' }, { new: true }).populate({ path: 'products', populate: { path: 'item_type' } })
    if (!group) return res.status(404).json({ error: 'Group not found' })
    res.json(group)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PUT activate
router.put('/:id/activate', async (req, res) => {
  try {
    const group = await ProductGroup.findByIdAndUpdate(req.params.id, { status: 'active' }, { new: true }).populate({ path: 'products', populate: { path: 'item_type' } })
    if (!group) return res.status(404).json({ error: 'Group not found' })
    res.json(group)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE group
router.delete('/:id', async (req, res) => {
  try {
    const group = await ProductGroup.findByIdAndDelete(req.params.id)
    if (!group) return res.status(404).json({ error: 'Group not found' })
    res.json({ message: 'Group deleted' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
