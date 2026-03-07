import express from 'express'
import mongoose from 'mongoose'
import Backup from '../models/Backup.js'
import BackupSettings from '../models/BackupSettings.js'

const router = express.Router()

// Get all backups
router.get('/', async (req, res) => {
  try {
    const backups = await Backup.find().sort({ created_at: -1 })
    res.json(backups)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Get stats
router.get('/stats', async (req, res) => {
  try {
    const backups = await Backup.find()
    const total = backups.length
    const successful = backups.filter(b => b.status === 'success').length
    const totalSize = backups.reduce((sum, b) => sum + (b.size || 0), 0)
    const settings = await BackupSettings.findOne() || { frequency: 'daily' }
    res.json({
      total,
      successful,
      totalSize: (totalSize / (1024 * 1024)).toFixed(1),
      schedule: settings.frequency.charAt(0).toUpperCase() + settings.frequency.slice(1),
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Create backup (exports all collections as JSON)
router.post('/create', async (req, res) => {
  try {
    const startTime = Date.now()
    const db = mongoose.connection.db
    const collections = await db.listCollections().toArray()
    const backupData = {}
    let totalRecords = 0

    for (const col of collections) {
      if (col.name === 'backups' || col.name === 'backupsettings') continue
      const docs = await db.collection(col.name).find({}).toArray()
      backupData[col.name] = docs
      totalRecords += docs.length
    }

    const jsonStr = JSON.stringify(backupData)
    const sizeBytes = Buffer.byteLength(jsonStr, 'utf8')
    const duration = Date.now() - startTime
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')

    const backup = new Backup({
      filename: `backup-${timestamp}.json`,
      size: sizeBytes,
      type: req.body.type || 'full',
      duration,
      status: 'success',
      collections: Object.keys(backupData).length,
      records: totalRecords,
      data: backupData,
    })
    await backup.save()

    res.status(201).json({
      _id: backup._id,
      filename: backup.filename,
      size: backup.size,
      type: backup.type,
      duration: backup.duration,
      status: backup.status,
      collections: backup.collections,
      records: backup.records,
      created_at: backup.created_at,
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Download backup data
router.get('/:id/download', async (req, res) => {
  try {
    const backup = await Backup.findById(req.params.id)
    if (!backup) return res.status(404).json({ error: 'Backup not found' })

    const jsonStr = JSON.stringify(backup.data, null, 2)
    res.setHeader('Content-Type', 'application/json')
    res.setHeader('Content-Disposition', `attachment; filename="${backup.filename}"`)
    res.send(jsonStr)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Restore from backup
router.post('/:id/restore', async (req, res) => {
  try {
    const backup = await Backup.findById(req.params.id)
    if (!backup) return res.status(404).json({ error: 'Backup not found' })
    if (!backup.data) return res.status(400).json({ error: 'No backup data found' })

    const db = mongoose.connection.db
    let restored = 0

    for (const [colName, docs] of Object.entries(backup.data)) {
      if (colName === 'backups' || colName === 'backupsettings') continue
      await db.collection(colName).deleteMany({})
      if (docs.length > 0) {
        await db.collection(colName).insertMany(docs)
        restored += docs.length
      }
    }

    res.json({ message: `Restored ${restored} records from ${Object.keys(backup.data).length} collections` })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Delete backup
router.delete('/:id', async (req, res) => {
  try {
    const backup = await Backup.findByIdAndDelete(req.params.id)
    if (!backup) return res.status(404).json({ error: 'Backup not found' })
    res.json({ message: 'Backup deleted' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Get backup settings
router.get('/settings/current', async (req, res) => {
  try {
    let settings = await BackupSettings.findOne()
    if (!settings) {
      settings = await BackupSettings.create({})
    }
    res.json(settings)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Save backup settings
router.put('/settings', async (req, res) => {
  try {
    let settings = await BackupSettings.findOne()
    if (settings) {
      Object.assign(settings, req.body)
      await settings.save()
    } else {
      settings = await BackupSettings.create(req.body)
    }
    res.json(settings)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
