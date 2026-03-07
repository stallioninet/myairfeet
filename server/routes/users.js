import express from 'express'
import User from '../models/User.js'

const router = express.Router()

// GET stats/counts - must be before /:id
router.get('/stats/counts', async (req, res) => {
  try {
    const total = await User.countDocuments()
    const levels = await User.aggregate([
      { $group: { _id: '$level', count: { $sum: 1 } } }
    ])
    res.json({ total, levels })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET all users
router.get('/', async (req, res) => {
  try {
    const users = await User.find().sort({ created_at: 1 })
    res.json(users)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET single user
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
    if (!user) return res.status(404).json({ error: 'User not found' })
    res.json(user)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST create user
router.post('/', async (req, res) => {
  try {
    const user = new User(req.body)
    await user.save()
    res.status(201).json(user)
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ error: 'Email already exists' })
    }
    res.status(400).json({ error: err.message })
  }
})

// PUT update user
router.put('/:id', async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
    if (!user) return res.status(404).json({ error: 'User not found' })
    res.json(user)
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ error: 'Email already exists' })
    }
    res.status(400).json({ error: err.message })
  }
})

// DELETE user
router.delete('/:id', async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id)
    if (!user) return res.status(404).json({ error: 'User not found' })
    res.json({ message: 'User deleted' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST login (find by email)
router.post('/login', async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email })
    if (!user) return res.status(404).json({ error: 'User not found' })
    if (user.status === 'inactive') return res.status(403).json({ error: 'Account is inactive' })
    user.last_login = new Date()
    await user.save()
    res.json(user)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
