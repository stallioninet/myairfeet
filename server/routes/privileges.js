import express from 'express'
import Privilege from '../models/Privilege.js'

const router = express.Router()

// GET all privileges
router.get('/', async (req, res) => {
  try {
    const privileges = await Privilege.find().sort({ created_at: 1 })
    res.json(privileges)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET single privilege
router.get('/:id', async (req, res) => {
  try {
    const privilege = await Privilege.findById(req.params.id)
    if (!privilege) return res.status(404).json({ error: 'Privilege not found' })
    res.json(privilege)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST create privilege
router.post('/', async (req, res) => {
  try {
    const privilege = new Privilege(req.body)
    await privilege.save()
    res.status(201).json(privilege)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// PUT update privilege
router.put('/:id', async (req, res) => {
  try {
    const privilege = await Privilege.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
    if (!privilege) return res.status(404).json({ error: 'Privilege not found' })
    res.json(privilege)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// PUT deactivate privilege
router.put('/:id/deactivate', async (req, res) => {
  try {
    const privilege = await Privilege.findByIdAndUpdate(req.params.id, { status: 'inactive' }, { new: true })
    if (!privilege) return res.status(404).json({ error: 'Privilege not found' })
    res.json(privilege)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PUT activate privilege
router.put('/:id/activate', async (req, res) => {
  try {
    const privilege = await Privilege.findByIdAndUpdate(req.params.id, { status: 'active' }, { new: true })
    if (!privilege) return res.status(404).json({ error: 'Privilege not found' })
    res.json(privilege)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Seed default privileges
router.post('/seed', async (req, res) => {
  try {
    const existing = await Privilege.countDocuments()
    if (existing > 0) return res.json({ message: 'Privileges already exist', count: existing })

    const defaults = [
      { name: 'Create New User', key: 'create_new_user', description: 'Create New User' },
      { name: 'Create New Customer', key: 'create_new_customer', description: 'Create New Customer' },
      { name: 'Create PO', key: 'create_po', description: 'Create Purchase Order' },
      { name: 'View Sales Rep', key: 'view_sales_rep', description: 'View Sales Rep' },
      { name: 'view customer', key: 'view_customer', description: 'Customer Info view' },
      { name: 'Edit Customer', key: 'edit_customer', description: 'customer info edit' },
      { name: 'view invoice', key: 'view_invoice', description: 'view invoice' },
      { name: 'create invoice', key: 'create_invoice', description: 'create invoice' },
      { name: 'delete invoice', key: 'delete_invoice', description: 'delete invoice' },
      { name: 'view commission', key: 'view_commission', description: 'view commission' },
    ]

    await Privilege.insertMany(defaults)
    res.json({ message: 'Default privileges created', count: defaults.length })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE privilege
router.delete('/:id', async (req, res) => {
  try {
    const privilege = await Privilege.findByIdAndDelete(req.params.id)
    if (!privilege) return res.status(404).json({ error: 'Privilege not found' })
    res.json({ message: 'Privilege deleted' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
