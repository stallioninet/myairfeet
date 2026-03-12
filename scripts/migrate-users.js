import mongoose from 'mongoose'
import fs from 'fs'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: join(__dirname, '..', '.env') })

const MONGO_URI = process.env.MONGO_URI
const SQL_FILE = 'E:/xmapp/htdocs/523prototype/myairfee_8qvsun15.sql'

function parseInserts(sql, tableName) {
  const rows = []
  const regex = new RegExp(`INSERT INTO \`${tableName}\`\\s*\\([^)]+\\)\\s*VALUES`, 'gi')
  let match
  while ((match = regex.exec(sql)) !== null) {
    let pos = match.index + match[0].length
    const colMatch = match[0].match(/\(([^)]+)\)/)
    const cols = colMatch[1].split(',').map(c => c.trim().replace(/`/g, ''))

    while (pos < sql.length) {
      while (pos < sql.length && /\s/.test(sql[pos])) pos++
      if (sql[pos] !== '(') break

      pos++
      const vals = []
      let current = ''
      let inStr = false
      let escape = false
      let depth = 0

      while (pos < sql.length) {
        const ch = sql[pos]
        if (escape) { current += ch; escape = false; pos++; continue }
        if (ch === '\\') { escape = true; current += ch; pos++; continue }
        if (ch === "'" && !inStr) { inStr = true; pos++; continue }
        if (ch === "'" && inStr) {
          if (sql[pos + 1] === "'") { current += "'"; pos += 2; continue }
          inStr = false; pos++; continue
        }
        if (inStr) { current += ch; pos++; continue }
        if (ch === ',' && depth === 0) { vals.push(current.trim()); current = ''; pos++; continue }
        if (ch === ')' && depth === 0) { vals.push(current.trim()); pos++; break }
        current += ch
        pos++
      }

      const row = {}
      cols.forEach((col, i) => {
        let v = vals[i] || ''
        if (v === 'NULL' || v === 'Null' || v === 'null') v = null
        row[col] = v
      })
      rows.push(row)

      while (pos < sql.length && /[\s,;]/.test(sql[pos])) {
        if (sql[pos] === ';') { pos++; break }
        pos++
      }
    }
  }
  return rows
}

function parseDate(val) {
  if (!val || val === '0000-00-00 00:00:00') return null
  const d = new Date(val)
  return isNaN(d.getTime()) ? null : d
}

function mapStatus(val) {
  // SQL: 1 = active, 2 = pilot, 3 = inactive/deleted
  if (val === '1') return 'active'
  return 'inactive'
}

async function main() {
  await mongoose.connect(MONGO_URI, { dbName: '523' })
  console.log('Connected to MongoDB')

  const sql = fs.readFileSync(SQL_FILE, 'utf-8')
  const db = mongoose.connection.db

  // Migrate user_master -> app_user
  console.log('\n--- Migrating user_master -> app_user ---')
  const users = parseInserts(sql, 'user_master')
  console.log(`Found ${users.length} user_master records`)

  if (users.length > 0) {
    await db.collection('app_user').drop().catch(() => {})

    const docs = users.map(u => ({
      legacy_id: parseInt(u.id_user_master) || 0,
      first_name: (u.first_name || '').trim(),
      last_name: (u.last_name || '').trim(),
      username: (u.username || '').trim(),
      email: (u.email || '').trim().toLowerCase(),
      password: (u.password || '').trim(),
      tumb_pass: (u.tumb_pass || '').trim(),
      country_code: (u.country_code || '').trim(),
      phone: (u.phone || '').trim(),
      extension: (u.extention || '').trim(),
      user_notes: (u.user_notes || '').trim(),
      user_type: (u.user_type || '').trim(),
      user_cust_code: (u.user_cust_code || '').trim(),
      profile_image: (u.profile_image || '').trim(),
      otp: (u.otp || '').trim(),
      reset_pwd: (u.reset_pwd || '').trim(),
      blocked: parseInt(u.blocked) === 1,
      site_admin: parseInt(u.site_admin) === 1,
      status: mapStatus(u.status),
      created_at: parseDate(u.created_on) || new Date(),
      updated_at: parseDate(u.update_on),
      last_login: parseDate(u.last_login_time),
      last_logout: parseDate(u.last_logout_time),
    }))

    await db.collection('app_user').insertMany(docs)
    console.log(`Inserted ${docs.length} app_user records`)

    const activeCount = docs.filter(d => d.status === 'active').length
    const inactiveCount = docs.filter(d => d.status === 'inactive').length
    console.log(`Active: ${activeCount}, Inactive: ${inactiveCount}`)

    // Show sample
    console.log('\nSample records:')
    docs.slice(0, 3).forEach(d => {
      console.log(`  ${d.legacy_id}: ${d.first_name} ${d.last_name} (${d.email}) - ${d.user_type} - ${d.status}`)
    })
  }

  await mongoose.disconnect()
  console.log('\nDone!')
}

main().catch(err => { console.error(err); process.exit(1) })
