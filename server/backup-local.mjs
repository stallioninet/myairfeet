/**
 * backup-local.mjs
 * Dumps every MongoDB collection to a single timestamped JSON file on disk.
 * Run: node server/backup-local.mjs
 */

import mongoose from 'mongoose'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '..', '.env') })

const MONGO_URI = process.env.MONGO_URI
if (!MONGO_URI) { console.error('MONGO_URI not set in .env'); process.exit(1) }

// Output directory: project root / backups
const BACKUP_DIR = path.join(__dirname, '..', 'backups')
if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true })

const SKIP_COLLECTIONS = new Set([
  'backupfiles.files', 'backupfiles.chunks',  // GridFS backup blobs (large, not useful)
])

async function run() {
  console.log('Connecting to MongoDB Atlas …')
  await mongoose.connect(MONGO_URI, { dbName: '523' })
  console.log('Connected.')

  const db = mongoose.connection.db
  const colList = await db.listCollections().toArray()
  const names   = colList.map(c => c.name).filter(n => !SKIP_COLLECTIONS.has(n))

  console.log(`Collections found: ${names.join(', ')}\n`)

  const backup   = { _meta: { created_at: new Date().toISOString(), db: '523', collections: names.length }, data: {} }
  let totalDocs  = 0

  for (const name of names) {
    process.stdout.write(`  Exporting ${name} … `)
    const docs = await db.collection(name).find({}).toArray()
    backup.data[name] = docs
    totalDocs += docs.length
    console.log(`${docs.length} docs`)
  }

  const ts       = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').slice(0, 19)
  const filename = `backup_523_${ts}.json`
  const outPath  = path.join(BACKUP_DIR, filename)

  process.stdout.write(`\nWriting ${filename} … `)
  fs.writeFileSync(outPath, JSON.stringify(backup, null, 2), 'utf8')
  const sizeMB = (fs.statSync(outPath).size / 1_048_576).toFixed(2)
  console.log(`done  (${sizeMB} MB)`)

  console.log(`\n✔  Backup saved to:\n   ${outPath}`)
  console.log(`   Total collections: ${names.length}   Total documents: ${totalDocs}`)

  await mongoose.disconnect()
}

run().catch(err => { console.error(err); process.exit(1) })
