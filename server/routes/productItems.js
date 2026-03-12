import express from 'express'
import ProductItem from '../models/ProductItem.js'

const router = express.Router()

// GET all product items (populated with item type)
router.get('/', async (req, res) => {
  try {
    const products = await ProductItem.find().populate('item_type').sort({ sort_order: 1, created_at: 1 })
    res.json(products)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET single product item
router.get('/:id', async (req, res) => {
  try {
    const product = await ProductItem.findById(req.params.id).populate('item_type')
    if (!product) return res.status(404).json({ error: 'Product not found' })
    res.json(product)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST create product item
router.post('/', async (req, res) => {
  try {
    const product = new ProductItem(req.body)
    await product.save()
    const populated = await ProductItem.findById(product._id).populate('item_type')
    res.status(201).json(populated)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// POST duplicate product item
router.post('/:id/duplicate', async (req, res) => {
  try {
    const original = await ProductItem.findById(req.params.id)
    if (!original) return res.status(404).json({ error: 'Product not found' })
    const dup = new ProductItem({
      name: original.name + ' (Copy)',
      item_type: original.item_type,
      unit_price: original.unit_price,
      base_price: original.base_price,
      notes: original.notes,
      status: original.status,
    })
    await dup.save()
    const populated = await ProductItem.findById(dup._id).populate('item_type')
    res.status(201).json(populated)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// PUT update product item
router.put('/:id', async (req, res) => {
  try {
    const product = await ProductItem.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }).populate('item_type')
    if (!product) return res.status(404).json({ error: 'Product not found' })
    res.json(product)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// PUT deactivate
router.put('/:id/deactivate', async (req, res) => {
  try {
    const product = await ProductItem.findByIdAndUpdate(req.params.id, { status: 'inactive' }, { new: true }).populate('item_type')
    if (!product) return res.status(404).json({ error: 'Product not found' })
    res.json(product)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PUT activate
router.put('/:id/activate', async (req, res) => {
  try {
    const product = await ProductItem.findByIdAndUpdate(req.params.id, { status: 'active' }, { new: true }).populate('item_type')
    if (!product) return res.status(404).json({ error: 'Product not found' })
    res.json(product)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PUT reorder products
router.put('/reorder/bulk', async (req, res) => {
  try {
    const { order } = req.body // array of { id, sort_order }
    if (!Array.isArray(order)) return res.status(400).json({ error: 'order array required' })
    const ops = order.map(item => ({
      updateOne: {
        filter: { _id: item.id },
        update: { $set: { sort_order: item.sort_order } }
      }
    }))
    await ProductItem.bulkWrite(ops)
    res.json({ message: 'Order updated' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE product item
router.delete('/:id', async (req, res) => {
  try {
    const product = await ProductItem.findByIdAndDelete(req.params.id)
    if (!product) return res.status(404).json({ error: 'Product not found' })
    res.json({ message: 'Product deleted' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
