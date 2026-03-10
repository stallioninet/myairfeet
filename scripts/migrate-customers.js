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
    // Extract column names
    const colMatch = match[0].match(/\(([^)]+)\)/)
    const cols = colMatch[1].split(',').map(c => c.trim().replace(/`/g, ''))

    // Parse value tuples
    while (pos < sql.length) {
      // Skip whitespace
      while (pos < sql.length && /\s/.test(sql[pos])) pos++
      if (sql[pos] !== '(') break

      pos++ // skip (
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

      // Skip comma or semicolon
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

  // Migrate company table -> customers collection
  console.log('\n--- Migrating company -> customers ---')
  const companies = parseInserts(sql, 'company')
  console.log(`Found ${companies.length} company records`)

  if (companies.length > 0) {
    await db.collection('customers').drop().catch(() => {})
    const docs = companies.map(c => ({
      legacy_id: parseInt(c.id_company) || 0,
      company_name: (c.company_name || '').trim(),
      customer_type: (c.customer_type || '').trim(),
      contact_name: (c.company_contact === 'Null' || !c.company_contact) ? '' : c.company_contact.trim(),
      phone: (c.company_phone === 'Null' || !c.company_phone) ? '' : c.company_phone.trim(),
      extension: (c.extention || '').trim(),
      email: (c.company_email_address === 'Null' || !c.company_email_address) ? '' : c.company_email_address.trim(),
      customer_code: (c.company_cust_code || '').trim(),
      notes: (c.customer_notes === 'Null' || !c.customer_notes) ? '' : c.customer_notes.trim(),
      terms: (c.cust_terms === 'Null' || !c.cust_terms) ? '' : c.cust_terms.trim(),
      fob: (c.customer_FOB === 'Null' || !c.customer_FOB) ? '' : c.customer_FOB.trim(),
      ship_date: c.cust_ship_date || null,
      ship: (c.cust_ship === 'Null' || !c.cust_ship) ? '' : c.cust_ship.trim(),
      ship_via: (c.cust_ship_via === 'Null' || !c.cust_ship_via) ? '' : c.cust_ship_via.trim(),
      project: (c.cust_project === 'Null' || !c.cust_project) ? '' : c.cust_project.trim(),
      status: c.company_status === '1' ? 'active' : c.company_status === '4' ? 'inactive' : 'inactive',
      send_duemail: c.send_duemail === '1',
      created_at: c.company_created_on && c.company_created_on !== '0000-00-00 00:00:00' ? new Date(c.company_created_on) : new Date(),
      updated_at: c.company_modified_on && c.company_modified_on !== '0000-00-00 00:00:00' ? new Date(c.company_modified_on) : null,
    }))

    await db.collection('customers').insertMany(docs)
    console.log(`Inserted ${docs.length} customers`)
    const activeCount = docs.filter(d => d.status === 'active').length
    const inactiveCount = docs.filter(d => d.status === 'inactive').length
    console.log(`Active: ${activeCount}, Inactive: ${inactiveCount}`)
  }

  // Migrate customer_type table
  console.log('\n--- Migrating customer_type -> customer_types ---')
  const types = parseInserts(sql, 'customer_type')
  console.log(`Found ${types.length} customer_type records`)

  if (types.length > 0) {
    await db.collection('customer_types').drop().catch(() => {})
    const typeDocs = types.map(t => ({
      legacy_id: parseInt(t.id_customer_type) || 0,
      name: (t.cust_type_name || '').trim(),
      code: (t.customer_type_code || '').trim(),
      start_number: (t.cust_start_number || '').trim(),
      description: (t.description || '').trim(),
      status: t.status === '1' ? 'active' : 'inactive',
      created_at: new Date(),
    }))
    await db.collection('customer_types').insertMany(typeDocs)
    console.log(`Inserted ${typeDocs.length} customer types`)
  }

  await mongoose.disconnect()
  console.log('\nDone!')
}

main().catch(err => { console.error(err); process.exit(1) })
