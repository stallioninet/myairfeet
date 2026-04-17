import express from 'express'
import User from '../models/User.js'
import { hashPassword, verifyPassword } from '../lib/password.js'

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

// GET check unique email/username
router.get('/check-unique', async (req, res) => {
  try {
    const { field, value, exclude_id } = req.query
    if (!field || !value) return res.json({ unique: true })
    if (!['email', 'username'].includes(field)) return res.status(400).json({ error: 'Invalid field' })
    const filter = { [field]: { $regex: new RegExp(`^${value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } }
    if (exclude_id) filter._id = { $ne: exclude_id }
    const existing = await User.findOne(filter)
    res.json({ unique: !existing })
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

// POST reset-password — reset a single user's password by email (admin setup utility)
// Body: { email, new_password }
router.post('/reset-password', async (req, res) => {
  try {
    const { email, new_password } = req.body
    if (!email || !new_password) return res.status(400).json({ error: 'email and new_password required' })
    if (new_password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' })
    const hashed = hashPassword(new_password)
    const user = await User.findOneAndUpdate(
      { email: { $regex: new RegExp(`^${email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } },
      { $set: { password: hashed } },
      { new: true }
    )
    if (!user) return res.status(404).json({ error: 'User not found' })
    res.json({ message: 'Password updated', email: user.email })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST seed-passwords — sets a default password for every user that has an empty password
// Default: Admin@1  (call once after initial import to ensure everyone has a valid hash)
router.post('/seed-passwords', async (req, res) => {
  try {
    const defaultPlain = req.body?.default_password || 'Admin@1'
    const hashed = hashPassword(defaultPlain)
    const result = await User.updateMany(
      { $or: [{ password: '' }, { password: null }, { password: { $exists: false } }] },
      { $set: { password: hashed } }
    )
    res.json({ message: 'Passwords seeded', modified: result.modifiedCount, default_password: defaultPlain })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST create user
router.post('/', async (req, res) => {
  try {
    const body = { ...req.body }
    if (body.password) body.password = hashPassword(body.password)
    const user = new User(body)
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
    const body = { ...req.body }
    if (body.password) body.password = hashPassword(body.password)
    else delete body.password  // never overwrite with empty string
    const user = await User.findByIdAndUpdate(req.params.id, body, { new: true, runValidators: true })
    if (!user) return res.status(404).json({ error: 'User not found' })
    res.json(user)
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ error: 'Email already exists' })
    }
    res.status(400).json({ error: err.message })
  }
})

// DELETE user (soft or permanent)
router.delete('/:id', async (req, res) => {
  try {
    const permanent = req.query.permanent === 'true'
    if (permanent) {
      const user = await User.findByIdAndDelete(req.params.id)
      if (!user) return res.status(404).json({ error: 'User not found' })
      res.json({ message: 'User permanently deleted' })
    } else {
      const user = await User.findByIdAndUpdate(req.params.id, { status: 'inactive' }, { new: true })
      if (!user) return res.status(404).json({ error: 'User not found' })
      res.json({ message: 'User deactivated' })
    }
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST login — verify email (or username) + password
router.post('/login', async (req, res) => {
  try {
    const { email, username, password } = req.body
    if (!password) return res.status(400).json({ error: 'Password is required' })

    // Accept login by email or username
    const identifier = email || username
    if (!identifier) return res.status(400).json({ error: 'Email or username is required' })

    const query = email
      ? { email: { $regex: new RegExp(`^${identifier.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } }
      : { username: identifier }

    const user = await User.findOne(query)
    if (!user) return res.status(401).json({ error: 'Invalid email or password' })
    if (user.status === 'inactive') return res.status(403).json({ error: 'Account is inactive' })

    if (!verifyPassword(password, user.password)) {
      return res.status(401).json({ error: 'Invalid email or password' })
    }

    // Update last_login but don't block the response if the write fails (e.g. storage quota)
    User.findByIdAndUpdate(user._id, { last_login: new Date() }).catch(() => {})

    // Return user without the password field
    const userObj = user.toObject()
    delete userObj.password
    res.json(userObj)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
