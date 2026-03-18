import express from 'express'
import mongoose from 'mongoose'
import Backup from '../models/Backup.js'
import BackupSettings from '../models/BackupSettings.js'

const router = express.Router()

function getBucket() {
  return new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: 'backupfiles' })
}

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
    // Calculate next backup time
    const lastBackup = backups.filter(b => b.status === 'success').sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0]
    let nextBackup = null
    if (settings.auto_backup !== false && lastBackup) {
      const last = new Date(lastBackup.created_at)
      if (settings.frequency === 'daily') nextBackup = new Date(last.getTime() + 24 * 60 * 60 * 1000)
      else if (settings.frequency === 'weekly') nextBackup = new Date(last.getTime() + 7 * 24 * 60 * 60 * 1000)
      else if (settings.frequency === 'monthly') nextBackup = new Date(last.getTime() + 30 * 24 * 60 * 60 * 1000)
    }
    const failed = backups.filter(b => b.status === 'failed').length

    res.json({
      total,
      successful,
      failed,
      totalSize: (totalSize / (1024 * 1024)).toFixed(1),
      schedule: settings.auto_backup !== false ? settings.frequency.charAt(0).toUpperCase() + settings.frequency.slice(1) : 'Disabled',
      nextBackup: nextBackup ? nextBackup.toISOString() : null,
      retention: settings.retention || 30,
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Create backup (exports all collections as JSON, stored in GridFS)
router.post('/create', async (req, res) => {
  try {
    const startTime = Date.now()
    const db = mongoose.connection.db
    const collections = await db.listCollections().toArray()
    const backupData = {}
    let totalRecords = 0

    for (const col of collections) {
      if (['backups', 'backupsettings', 'backupfiles.files', 'backupfiles.chunks'].includes(col.name)) continue
      const docs = await db.collection(col.name).find({}).toArray()
      backupData[col.name] = docs
      totalRecords += docs.length
    }

    const jsonStr = JSON.stringify(backupData)
    const sizeBytes = Buffer.byteLength(jsonStr, 'utf8')
    const duration = Date.now() - startTime
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const filename = `backup-${timestamp}.json`

    // Store in GridFS
    const bucket = getBucket()
    const gridfsId = await new Promise((resolve, reject) => {
      const uploadStream = bucket.openUploadStream(filename)
      uploadStream.on('finish', () => resolve(uploadStream.id))
      uploadStream.on('error', reject)
      uploadStream.end(Buffer.from(jsonStr, 'utf8'))
    })

    const backup = new Backup({
      filename,
      size: sizeBytes,
      type: req.body.type || 'full',
      duration,
      status: 'success',
      collections: Object.keys(backupData).length,
      records: totalRecords,
      gridfs_id: gridfsId,
    })
    await backup.save()

    // Check if email notification is enabled
    const settings = await BackupSettings.findOne()
    if (settings?.email_notifications) {
      console.log(`[Backup] Email notification: Manual backup "${filename}" completed (${totalRecords} records, ${(sizeBytes / 1024 / 1024).toFixed(2)} MB)`)
    }

    // Auto-cleanup old backups based on retention
    if (settings?.retention) {
      const cutoff = new Date()
      cutoff.setDate(cutoff.getDate() - settings.retention)
      const oldBackups = await Backup.find({ created_at: { $lt: cutoff } })
      for (const old of oldBackups) {
        if (old.gridfs_id) {
          try { await bucket.delete(old.gridfs_id) } catch {}
        }
        await Backup.findByIdAndDelete(old._id)
      }
      if (oldBackups.length > 0) console.log(`[Backup] Cleaned ${oldBackups.length} expired backups`)
    }

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

// Download backup data from GridFS
router.get('/:id/download', async (req, res) => {
  try {
    const backup = await Backup.findById(req.params.id)
    if (!backup) return res.status(404).json({ error: 'Backup not found' })

    if (backup.gridfs_id) {
      const bucket = getBucket()
      res.setHeader('Content-Type', 'application/json')
      res.setHeader('Content-Disposition', `attachment; filename="${backup.filename}"`)
      const downloadStream = bucket.openDownloadStream(backup.gridfs_id)
      downloadStream.pipe(res)
      downloadStream.on('error', () => res.status(500).json({ error: 'Failed to read backup file' }))
    } else {
      res.status(400).json({ error: 'No backup data available' })
    }
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Restore from backup (reads from GridFS)
router.post('/:id/restore', async (req, res) => {
  try {
    const backup = await Backup.findById(req.params.id)
    if (!backup) return res.status(404).json({ error: 'Backup not found' })
    if (!backup.gridfs_id) return res.status(400).json({ error: 'No backup data found' })

    // Read from GridFS
    const bucket = getBucket()
    const chunks = []
    await new Promise((resolve, reject) => {
      const stream = bucket.openDownloadStream(backup.gridfs_id)
      stream.on('data', chunk => chunks.push(chunk))
      stream.on('end', resolve)
      stream.on('error', reject)
    })
    const backupData = JSON.parse(Buffer.concat(chunks).toString('utf8'))

    const db = mongoose.connection.db
    let restored = 0

    for (const [colName, docs] of Object.entries(backupData)) {
      if (['backups', 'backupsettings', 'backupfiles.files', 'backupfiles.chunks'].includes(colName)) continue
      await db.collection(colName).deleteMany({})
      if (docs.length > 0) {
        await db.collection(colName).insertMany(docs)
        restored += docs.length
      }
    }

    res.json({ message: `Restored ${restored} records from ${Object.keys(backupData).length} collections` })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Delete backup (also removes GridFS file)
router.delete('/:id', async (req, res) => {
  try {
    const backup = await Backup.findByIdAndDelete(req.params.id)
    if (!backup) return res.status(404).json({ error: 'Backup not found' })

    if (backup.gridfs_id) {
      try {
        const bucket = getBucket()
        await bucket.delete(backup.gridfs_id)
      } catch (e) { /* GridFS file may already be gone */ }
    }

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
