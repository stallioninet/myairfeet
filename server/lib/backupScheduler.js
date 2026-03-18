import mongoose from 'mongoose'
import Backup from '../models/Backup.js'
import BackupSettings from '../models/BackupSettings.js'

let schedulerInterval = null

export async function startBackupScheduler() {
  console.log('[Backup Scheduler] Starting...')
  // Check every hour
  schedulerInterval = setInterval(checkAndRunBackup, 60 * 60 * 1000)
  // Also check on startup after 30 seconds
  setTimeout(checkAndRunBackup, 30000)
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
    const now = new Date()
    let shouldRun = false

    if (!lastBackup) {
      shouldRun = true
    } else {
      const lastDate = new Date(lastBackup.created_at)
      const hoursSince = (now - lastDate) / (1000 * 60 * 60)

      if (settings.frequency === 'daily' && hoursSince >= 24) shouldRun = true
      else if (settings.frequency === 'weekly' && hoursSince >= 168) shouldRun = true
      else if (settings.frequency === 'monthly' && hoursSince >= 720) shouldRun = true
    }

    if (shouldRun) {
      console.log('[Backup Scheduler] Running scheduled backup...')
      await runAutoBackup()
      await cleanOldBackups(settings.retention)
    }
  } catch (err) {
    console.error('[Backup Scheduler] Error:', err.message)
  }
}

async function runAutoBackup() {
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
    const filename = `auto-backup-${timestamp}.json`

    // Store in GridFS
    const bucket = new mongoose.mongo.GridFSBucket(db, { bucketName: 'backupfiles' })
    const gridfsId = await new Promise((resolve, reject) => {
      const uploadStream = bucket.openUploadStream(filename)
      uploadStream.on('finish', () => resolve(uploadStream.id))
      uploadStream.on('error', reject)
      uploadStream.end(Buffer.from(jsonStr, 'utf8'))
    })

    const backup = new Backup({
      filename,
      size: sizeBytes,
      type: 'auto',
      duration,
      status: 'success',
      collections: Object.keys(backupData).length,
      records: totalRecords,
      gridfs_id: gridfsId,
    })
    await backup.save()

    console.log(`[Backup Scheduler] Auto backup complete: ${filename} (${(sizeBytes / 1024 / 1024).toFixed(2)} MB, ${duration}ms)`)

    // Log notification
    const settings = await BackupSettings.findOne()
    if (settings?.email_notifications) {
      console.log(`[Backup Scheduler] Email notification: Backup "${filename}" completed successfully (${totalRecords} records)`)
      // TODO: Send actual email via nodemailer/SendGrid
    }
  } catch (err) {
    console.error('[Backup Scheduler] Backup failed:', err.message)
    // Save failed backup record
    try {
      await new Backup({
        filename: `failed-${new Date().toISOString().replace(/[:.]/g, '-')}.json`,
        size: 0,
        type: 'auto',
        duration: 0,
        status: 'failed',
        collections: 0,
        records: 0,
      }).save()
    } catch {}
  }
}

async function cleanOldBackups(retentionDays) {
  try {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - (retentionDays || 30))

    const oldBackups = await Backup.find({ created_at: { $lt: cutoff } })
    if (oldBackups.length === 0) return

    const db = mongoose.connection.db
    const bucket = new mongoose.mongo.GridFSBucket(db, { bucketName: 'backupfiles' })

    for (const backup of oldBackups) {
      // Delete GridFS file
      if (backup.gridfs_id) {
        try { await bucket.delete(backup.gridfs_id) } catch {}
      }
      await Backup.findByIdAndDelete(backup._id)
    }

    console.log(`[Backup Scheduler] Cleaned ${oldBackups.length} old backups (retention: ${retentionDays} days)`)
  } catch (err) {
    console.error('[Backup Scheduler] Cleanup error:', err.message)
  }
}
