import express from 'express'
import UserActivity from '../models/UserActivity.js'

const router = express.Router()

// Get all activities with optional filters
router.get('/', async (req, res) => {
  try {
    const { user, action, date_from, date_to } = req.query
    const filter = {}
    if (user) filter.user = user
    if (action) filter.action = action
    if (date_from || date_to) {
      filter.created_at = {}
      if (date_from) filter.created_at.$gte = new Date(date_from)
      if (date_to) filter.created_at.$lte = new Date(date_to + 'T23:59:59.999Z')
    }
    const activities = await UserActivity.find(filter)
      .populate('user', 'first_name last_name email level status')
      .sort({ created_at: -1 })
    res.json(activities)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Get stats
router.get('/stats', async (req, res) => {
  try {
    const total = await UserActivity.countDocuments()
    const logins = await UserActivity.countDocuments({ action: 'login' })
    const creates = await UserActivity.countDocuments({ action: 'create' })
    const updates = await UserActivity.countDocuments({ action: 'update' })
    const deletes = await UserActivity.countDocuments({ action: 'delete' })
    const activeUsers = await UserActivity.distinct('user')
    res.json({ total, logins, creates, updates, deletes, activeUsers: activeUsers.length })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Get activities for a specific user
router.get('/user/:userId', async (req, res) => {
  try {
    const activities = await UserActivity.find({ user: req.params.userId })
      .populate('user', 'first_name last_name email level status')
      .sort({ created_at: -1 })
    res.json(activities)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Create activity
router.post('/', async (req, res) => {
  try {
    const activity = new UserActivity(req.body)
    await activity.save()
    const populated = await activity.populate('user', 'first_name last_name email level status')
    res.status(201).json(populated)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// Delete old logs (older than 30 days)
router.delete('/clear-old', async (req, res) => {
  try {
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const result = await UserActivity.deleteMany({ created_at: { $lt: thirtyDaysAgo } })
    res.json({ message: `Cleared ${result.deletedCount} old activity logs` })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Seed sample activity data
router.post('/seed', async (req, res) => {
  try {
    const existing = await UserActivity.countDocuments()
    if (existing > 0) return res.json({ message: 'Activity data already exists', count: existing })

    // Get users from DB
    const User = (await import('../models/User.js')).default
    const users = await User.find().limit(8)
    if (users.length === 0) return res.status(400).json({ error: 'No users found. Seed users first.' })

    const modules = ['Authentication', 'Customers', 'Invoices', 'Commissions', 'Sales Reps', 'Events', 'Settings']
    const sampleActivities = []

    const descriptions = {
      login: ['User logged in successfully'],
      create: ['Created Invoice #142', 'Created Customer Global Tech Inc', 'Created commission entry for Q1 2025', 'Created Event "Annual Sales Summit 2025"'],
      update: ['Updated Customer Acme Corp', 'Updated commission rate for Tier 2', 'Updated Invoice #137 status to Paid'],
      delete: ['Deleted draft Invoice #139'],
    }

    const actions = ['login', 'create', 'update', 'delete']
    const now = new Date()

    for (let i = 0; i < 10; i++) {
      const action = actions[i % actions.length]
      const descs = descriptions[action]
      const user = users[i % users.length]
      const module = action === 'login' ? 'Authentication' : modules[Math.floor(Math.random() * (modules.length - 1)) + 1]
      const hoursAgo = i * 6
      const date = new Date(now.getTime() - hoursAgo * 60 * 60 * 1000)

      sampleActivities.push({
        user: user._id,
        action,
        module,
        description: descs[i % descs.length],
        ip_address: `192.168.1.${100 + (i * 5)}`,
        created_at: date,
      })
    }

    await UserActivity.insertMany(sampleActivities)
    res.json({ message: 'Sample activity data inserted', count: sampleActivities.length })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
