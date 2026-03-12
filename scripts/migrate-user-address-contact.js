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

async function main() {
  await mongoose.connect(MONGO_URI, { dbName: '523' })
  console.log('Connected to MongoDB')

  const sql = fs.readFileSync(SQL_FILE, 'utf-8')
  const db = mongoose.connection.db

  // Migrate user_address -> user_addresses
  console.log('\n--- Migrating user_address -> user_addresses ---')
  const addresses = parseInserts(sql, 'user_address')
  console.log(`Found ${addresses.length} user_address records`)

  if (addresses.length > 0) {
    await db.collection('user_addresses').drop().catch(() => {})
    const addrDocs = addresses.map(a => ({
      legacy_id: parseInt(a.id_user_address) || 0,
      user_legacy_id: parseInt(a.pk_id_user) || 0,
      address_1: (a.address_1 || '').trim(),
      address_2: (a.address_2 || '').trim(),
      city: (a.city || '').trim(),
      state: (a.state || '').trim(),
      post_code: (a.post_code || '').trim(),
      country: (a.counry || '').trim(),
      phone_number: (a.phone_number || '').trim(),
      extension: (a.extention || '').trim(),
      address_type: (a.address_type || '').trim(),
      address_label: (a.address_label || 'Address').trim(),
      status: parseInt(a.address_status) === 1 ? 'active' : 'inactive',
      created_at: a.address_created_on && a.address_created_on !== '0000-00-00 00:00:00' ? new Date(a.address_created_on) : new Date(),
    }))
    await db.collection('user_addresses').insertMany(addrDocs)
    console.log(`Inserted ${addrDocs.length} user_addresses`)
  }

  // Migrate user_contact -> user_contacts
  console.log('\n--- Migrating user_contact -> user_contacts ---')
  const contacts = parseInserts(sql, 'user_contact')
  console.log(`Found ${contacts.length} user_contact records`)

  // contact_type mapping: 1=Home, 2=Office, 5=Cell/Mobile
  const contactTypeMap = { '1': 'Home', '2': 'Office', '3': 'Work', '5': 'Cell' }

  if (contacts.length > 0) {
    await db.collection('user_contacts').drop().catch(() => {})
    const contactDocs = contacts.map(c => ({
      legacy_id: parseInt(c.id_user_contact) || 0,
      user_legacy_id: parseInt(c.pk_id_user) || 0,
      contact_type: contactTypeMap[c.contact_type] || 'Phone',
      contact_label: (c.contact_label || '').trim(),
      contact_number: (c.contact_number || '').trim(),
      extension: (c.extention || '').trim(),
      status: parseInt(c.contact_status) === 1 ? 'active' : 'inactive',
      created_at: c.contact_created_on && c.contact_created_on !== '0000-00-00 00:00:00' ? new Date(c.contact_created_on) : new Date(),
    }))
    await db.collection('user_contacts').insertMany(contactDocs)
    console.log(`Inserted ${contactDocs.length} user_contacts`)
  }

  await mongoose.disconnect()
  console.log('\nDone!')
}

main().catch(err => { console.error(err); process.exit(1) })
