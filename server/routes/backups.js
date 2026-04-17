import express from 'express'
import mongoose from 'mongoose'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import Backup from '../models/Backup.js'
import BackupSettings from '../models/BackupSettings.js'

const router = express.Router()
const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Backups are stored as local JSON files — NOT in MongoDB (prevents quota bloat)
const BACKUP_DIR = process.env.VERCEL
  ? '/tmp/backups'
  : path.join(__dirname, '..', '..', 'backups')
try { if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true }) } catch {}

const SKIP_COLS = new Set([
  'backups', 'backupsettings',
  'backupfiles.files', 'backupfiles.chunks',
])

// ─── Core export helper ────────────────────────────────────────────────────────
async function exportAllCollections() {
  const db = mongoose.connection.db
  const cols = (await db.listCollections().toArray()).map(c => c.name).filter(n => !SKIP_COLS.has(n))
  const data = {}
  let totalRecords = 0
  for (const name of cols) {
    const docs = await db.collection(name).find({}).toArray()
    data[name] = docs
    totalRecords += docs.length
  }
  return { data, collections: cols.length, totalRecords }
}

// ─── Routes ────────────────────────────────────────────────────────────────────

// GET all backups
router.get('/', async (req, res) => {
  try {
    const backups = await Backup.find().sort({ created_at: -1 })
    // Attach exists flag so UI can show if file is still on disk
    const enriched = backups.map(b => {
      const obj = b.toObject()
      if (b.file_path) obj.file_exists = fs.existsSync(b.file_path)
      return obj
    })
    res.json(enriched)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET stats
router.get('/stats', async (req, res) => {
  try {
    const backups = await Backup.find()
    const successful = backups.filter(b => b.status === 'success')
    const totalSize = successful.reduce((s, b) => s + (b.size || 0), 0)
    const settings = await BackupSettings.findOne() || { frequency: 'daily' }
    const lastOk = successful.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0]
    let nextBackup = null
    if (settings.auto_backup !== false && lastOk) {
      const last = new Date(lastOk.created_at)
      const map = { daily: 1, weekly: 7, monthly: 30 }
      const days = map[settings.frequency] || 1
      nextBackup = new Date(last.getTime() + days * 86400000).toISOString()
    }
    res.json({
      total: backups.length,
      successful: successful.length,
      failed: backups.filter(b => b.status === 'failed').length,
      totalSize: (totalSize / 1_048_576).toFixed(1),
      schedule: settings.auto_backup !== false
        ? settings.frequency.charAt(0).toUpperCase() + settings.frequency.slice(1)
        : 'Disabled',
      nextBackup,
      retention: settings.retention || 30,
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST create backup — saves to local disk file
router.post('/create', async (req, res) => {
  const startTime = Date.now()
  try {
    const { data, collections, totalRecords } = await exportAllCollections()

    const jsonStr = JSON.stringify({ _meta: { created_at: new Date().toISOString(), db: '523' }, data })
    const sizeBytes = Buffer.byteLength(jsonStr, 'utf8')
    const ts = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').slice(0, 19)
    const filename = `backup_523_${ts}.json`
    const filePath = path.join(BACKUP_DIR, filename)

    fs.writeFileSync(filePath, jsonStr, 'utf8')

    const backup = new Backup({
      filename,
      file_path: filePath,
      size: sizeBytes,
      type: req.body?.type || 'full',
      duration: Date.now() - startTime,
      status: 'success',
      collections,
      records: totalRecords,
      gridfs_id: null,
    })
    await backup.save()

    // Enforce retention: delete old local files + metadata
    const settings = await BackupSettings.findOne()
    const retentionDays = settings?.retention || 30
    const cutoff = new Date(Date.now() - retentionDays * 86400000)
    const old = await Backup.find({ created_at: { $lt: cutoff } })
    for (const b of old) {
      if (b.file_path && fs.existsSync(b.file_path)) {
        try { fs.unlinkSync(b.file_path) } catch {}
      }
      await Backup.findByIdAndDelete(b._id)
    }
    if (old.length > 0) console.log(`[Backup] Purged ${old.length} backups older than ${retentionDays} days`)

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
    // Record the failure
    try {
      await new Backup({ filename: 'failed', size: 0, status: 'failed', duration: Date.now() - startTime }).save()
    } catch {}
    res.status(500).json({ error: err.message })
  }
})

// GET download a backup file
router.get('/:id/download', async (req, res) => {
  try {
    const backup = await Backup.findById(req.params.id)
    if (!backup) return res.status(404).json({ error: 'Backup not found' })

    const filePath = backup.file_path
    if (!filePath || !fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Backup file not found on disk' })
    }

    res.setHeader('Content-Type', 'application/json')
    res.setHeader('Content-Disposition', `attachment; filename="${backup.filename}"`)
    fs.createReadStream(filePath).pipe(res)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST restore from a backup file
router.post('/:id/restore', async (req, res) => {
  try {
    const backup = await Backup.findById(req.params.id)
    if (!backup) return res.status(404).json({ error: 'Backup not found' })

    const filePath = backup.file_path
    if (!filePath || !fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Backup file not found on disk' })
    }

    const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'))
    const backupData = raw.data || raw  // handle both new format and old format
    const db = mongoose.connection.db
    let restored = 0

    for (const [colName, docs] of Object.entries(backupData)) {
      if (SKIP_COLS.has(colName)) continue
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

// DELETE a backup (removes file + metadata)
router.delete('/:id', async (req, res) => {
  try {
    const backup = await Backup.findByIdAndDelete(req.params.id)
    if (!backup) return res.status(404).json({ error: 'Backup not found' })

    if (backup.file_path && fs.existsSync(backup.file_path)) {
      try { fs.unlinkSync(backup.file_path) } catch {}
    }

    res.json({ message: 'Backup deleted' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET backup settings
router.get('/settings/current', async (req, res) => {
  try {
    let settings = await BackupSettings.findOne()
    if (!settings) settings = await BackupSettings.create({})
    res.json(settings)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PUT save backup settings
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
