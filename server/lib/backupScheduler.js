import mongoose from 'mongoose'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import Backup from '../models/Backup.js'
import BackupSettings from '../models/BackupSettings.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const BACKUP_DIR = process.env.VERCEL
  ? '/tmp/backups'
  : path.join(__dirname, '..', '..', 'backups')
try { if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true }) } catch {}

const SKIP_COLS = new Set([
  'backups', 'backupsettings',
  'backupfiles.files', 'backupfiles.chunks',
])

let schedulerInterval = null

export async function startBackupScheduler() {
  console.log('[Backup Scheduler] Starting... (saves to local disk, not MongoDB)')
  schedulerInterval = setInterval(checkAndRunBackup, 60 * 60 * 1000) // check hourly
  setTimeout(checkAndRunBackup, 30000) // also check 30 s after startup
}

export function stopBackupScheduler() {
  if (schedulerInterval) {
    clearInterval(schedulerInterval)
    schedulerInterval = null
  }
}

async function checkAndRunBackup() {
  try {
    const settings = await BackupSettings.findOne()
    if (!settings || !settings.auto_backup) return

    const lastBackup = await Backup.findOne({ status: 'success' }).sort({ created_at: -1 })
    const hoursSince = lastBackup
      ? (Date.now() - new Date(lastBackup.created_at)) / 3_600_000
      : Infinity

    const thresholds = { daily: 24, weekly: 168, monthly: 720 }
    const threshold = thresholds[settings.frequency] || 24

    if (hoursSince >= threshold) {
      console.log('[Backup Scheduler] Running scheduled backup...')
      await runAutoBackup(settings)
    }
  } catch (err) {
    console.error('[Backup Scheduler] Error:', err.message)
  }
}

async function runAutoBackup(settings) {
  const startTime = Date.now()
  try {
    const db = mongoose.connection.db
    const colList = (await db.listCollections().toArray()).map(c => c.name).filter(n => !SKIP_COLS.has(n))
    const data = {}
    let totalRecords = 0

    for (const name of colList) {
      const docs = await db.collection(name).find({}).toArray()
      data[name] = docs
      totalRecords += docs.length
    }

    const jsonStr = JSON.stringify({ _meta: { created_at: new Date().toISOString(), db: '523' }, data })
    const sizeBytes = Buffer.byteLength(jsonStr, 'utf8')
    const ts = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').slice(0, 19)
    const filename = `auto-backup_523_${ts}.json`
    const filePath = path.join(BACKUP_DIR, filename)

    fs.writeFileSync(filePath, jsonStr, 'utf8')

    const backup = new Backup({
      filename,
      file_path: filePath,
      size: sizeBytes,
      type: 'auto',
      duration: Date.now() - startTime,
      status: 'success',
      collections: colList.length,
      records: totalRecords,
      gridfs_id: null,
    })
    await backup.save()

    console.log(`[Backup Scheduler] Done: ${filename} (${(sizeBytes / 1_048_576).toFixed(2)} MB, ${totalRecords} records)`)

    if (settings?.email_notifications) {
      console.log(`[Backup Scheduler] Email notification: "${filename}" completed successfully`)
    }

    // Enforce retention
    await cleanOldBackups(settings?.retention || 30)
  } catch (err) {
    console.error('[Backup Scheduler] Backup failed:', err.message)
    try {
      await new Backup({
        filename: `failed_${new Date().toISOString()}`,
        size: 0, type: 'auto', status: 'failed',
        duration: Date.now() - startTime,
        collections: 0, records: 0,
      }).save()
    } catch {}
  }
}

async function cleanOldBackups(retentionDays) {
  try {
    const cutoff = new Date(Date.now() - retentionDays * 86_400_000)
    const old = await Backup.find({ created_at: { $lt: cutoff } })
    if (old.length === 0) return

    for (const b of old) {
      // Delete local file
      if (b.file_path && fs.existsSync(b.file_path)) {
        try { fs.unlinkSync(b.file_path) } catch {}
      }
      await Backup.findByIdAndDelete(b._id)
    }

    console.log(`[Backup Scheduler] Purged ${old.length} backups older than ${retentionDays} days`)
  } catch (err) {
    console.error('[Backup Scheduler] Cleanup error:', err.message)
  }
}
