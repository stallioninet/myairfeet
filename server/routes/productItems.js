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

// GET check unique name/sku
router.get('/check-unique', async (req, res) => {
  try {
    const { field, value, exclude_id } = req.query
    if (!field || !value) return res.json({ unique: true })
    if (!['name', 'sku'].includes(field)) return res.status(400).json({ error: 'Invalid field' })
    const filter = { [field]: { $regex: new RegExp(`^${value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } }
    if (exclude_id) filter._id = { $ne: exclude_id }
    const existing = await ProductItem.findOne(filter)
    res.json({ unique: !existing })
  } catch (err) { res.status(500).json({ error: err.message }) }
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
      website_price: original.website_price,
      website_price_type: original.website_price_type,
      msrp: original.msrp,
      msrp_type: original.msrp_type,
      distributor_price: original.distributor_price,
      distributor_price_type: original.distributor_price_type,
      retail_store_price: original.retail_store_price,
      retail_store_price_type: original.retail_store_price_type,
      manufacturing_cost: original.manufacturing_cost,
      shipping_cost: original.shipping_cost,
      duties: original.duties,
      packaging: original.packaging,
      labor: original.labor,
      other_expenses: original.other_expenses,
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
    const product = await ProductItem.findById(req.params.id)
    if (!product) return res.status(404).json({ error: 'Product not found' })
    // Check if used in PO items or item size maps
    const mongoose = (await import('mongoose')).default
    const db = mongoose.connection.db
    const poItemCount = await db.collection('po_items').countDocuments({ item_id: product.legacy_id || 0 })
    if (poItemCount > 0) return res.status(400).json({ error: `Cannot delete: used in ${poItemCount} PO item(s)` })
    const mapCount = await db.collection('item_size_maps').countDocuments({ item: req.params.id })
    if (mapCount > 0) return res.status(400).json({ error: `Cannot delete: ${mapCount} size mapping(s) reference this product` })
    await ProductItem.findByIdAndDelete(req.params.id)
    res.json({ message: 'Product deleted' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
