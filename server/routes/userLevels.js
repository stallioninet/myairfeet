import express from 'express'
import UserLevel from '../models/UserLevel.js'

const router = express.Router()

// Get all levels
router.get('/', async (req, res) => {
  try {
    const levels = await UserLevel.find().sort({ created_at: 1 })
    res.json(levels)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Get single level
router.get('/:id', async (req, res) => {
  try {
    const level = await UserLevel.findById(req.params.id)
    if (!level) return res.status(404).json({ error: 'Level not found' })
    res.json(level)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Create level
router.post('/', async (req, res) => {
  try {
    const level = new UserLevel(req.body)
    await level.save()
    res.status(201).json(level)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// Update level
router.put('/:id', async (req, res) => {
  try {
    const level = await UserLevel.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
    if (!level) return res.status(404).json({ error: 'Level not found' })
    res.json(level)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// Duplicate level
router.post('/:id/duplicate', async (req, res) => {
  try {
    const original = await UserLevel.findById(req.params.id)
    if (!original) return res.status(404).json({ error: 'Level not found' })
    const dup = new UserLevel({
      name: original.name + ' (Copy)',
      key: original.key + '-copy-' + Date.now(),
      icon: original.icon,
      icon_bg: original.icon_bg,
      icon_color: original.icon_color,
      description: original.description,
      permissions: [...original.permissions],
      status: original.status,
    })
    await dup.save()
    res.status(201).json(dup)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// Activate
router.put('/:id/activate', async (req, res) => {
  try {
    const level = await UserLevel.findByIdAndUpdate(req.params.id, { status: 'active' }, { new: true })
    if (!level) return res.status(404).json({ error: 'Level not found' })
    res.json(level)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Deactivate
router.put('/:id/deactivate', async (req, res) => {
  try {
    const level = await UserLevel.findByIdAndUpdate(req.params.id, { status: 'inactive' }, { new: true })
    if (!level) return res.status(404).json({ error: 'Level not found' })
    res.json(level)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Delete level
router.delete('/:id', async (req, res) => {
  try {
    const level = await UserLevel.findByIdAndDelete(req.params.id)
    if (!level) return res.status(404).json({ error: 'Level not found' })
    res.json({ message: 'Level deleted' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Seed default levels
router.post('/seed', async (req, res) => {
  try {
    const existing = await UserLevel.countDocuments()
    if (existing > 0) return res.json({ message: 'Levels already exist', count: existing })

    const defaults = [
      { name: 'Accountant', key: 'accountant' },
      { name: 'Data Entry', key: 'Data Entry' },
      { name: 'Sales Representative', key: 'sales_rep' },
      { name: 'Super Admin', key: 'superuser' },
    ]

    await UserLevel.insertMany(defaults)
    res.json({ message: 'Default levels created', count: defaults.length })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
