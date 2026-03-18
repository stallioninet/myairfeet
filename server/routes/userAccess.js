import express from 'express'
import UserAccess from '../models/UserAccess.js'

const router = express.Router()

// Get all level defaults - must be before /:userId
router.get('/levels/all', async (req, res) => {
  try {
    const defaults = await UserAccess.find({ user: { $regex: /^level_/ } })
    res.json(defaults)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Get default access for a user level - must be before /:userId
router.get('/level/:levelKey', async (req, res) => {
  try {
    const access = await UserAccess.findOne({ user: `level_${req.params.levelKey}` })
    if (!access) return res.json({ user: `level_${req.params.levelKey}`, access: [] })
    res.json(access)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Save default access for a user level - must be before /:userId
router.put('/level/:levelKey', async (req, res) => {
  try {
    const key = `level_${req.params.levelKey}`
    const access = await UserAccess.findOneAndUpdate(
      { user: key },
      { user: key, access: req.body.access },
      { upsert: true, new: true, runValidators: true }
    )
    res.json(access)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Get access for a user
router.get('/:userId', async (req, res) => {
  try {
    const access = await UserAccess.findOne({ user: req.params.userId })
    if (!access) {
      return res.json({ user: req.params.userId, access: [] })
    }
    res.json(access)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Save access for a user (upsert)
router.put('/:userId', async (req, res) => {
  try {
    const access = await UserAccess.findOneAndUpdate(
      { user: req.params.userId },
      { user: req.params.userId, access: req.body.access },
      { upsert: true, new: true, runValidators: true }
    )
    res.json(access)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
