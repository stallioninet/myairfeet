import express from 'express'
import UserAccess from '../models/UserAccess.js'

const router = express.Router()

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
