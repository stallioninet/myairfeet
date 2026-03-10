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
        current += ch; pos++
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

function clean(val) {
  if (!val || val === 'Null' || val === 'NULL') return ''
  return val.trim()
}

async function main() {
  await mongoose.connect(MONGO_URI, { dbName: '523' })
  console.log('Connected to MongoDB')
  const sql = fs.readFileSync(SQL_FILE, 'utf-8')
  const db = mongoose.connection.db

  // Migrate suppliers
  console.log('\n--- Migrating suppliers ---')
  const suppliers = parseInserts(sql, 'suppliers')
  console.log(`Found ${suppliers.length} supplier records`)

  if (suppliers.length > 0) {
    await db.collection('suppliers').drop().catch(() => {})
    const docs = suppliers.map(s => ({
      legacy_id: parseInt(s.id_supplier) || 0,
      supplier_name: clean(s.supplier_name),
      supplier_type: clean(s.supplier_type),
      contact_name: clean(s.supplier_contact),
      phone: clean(s.supplier_phone),
      extension: clean(s.extention),
      email: clean(s.supplier_email_address),
      customer_code: clean(s.supplier_cust_code),
      notes: clean(s.supplier_notes),
      terms: clean(s.supplier_terms),
      fob: clean(s.supplier_FOB),
      ship_date: s.supp_ship_date || null,
      ship: clean(s.supp_ship),
      ship_via: clean(s.supp_ship_via),
      project: clean(s.supp_project),
      status: s.supplier_status === '1' ? 'active' : 'inactive',
      created_at: s.supplier_created_on && s.supplier_created_on !== '0000-00-00 00:00:00' ? new Date(s.supplier_created_on) : new Date(),
      updated_at: s.supplier_modified_on && s.supplier_modified_on !== '0000-00-00 00:00:00' ? new Date(s.supplier_modified_on) : null,
    }))
    await db.collection('suppliers').insertMany(docs)
    const active = docs.filter(d => d.status === 'active').length
    console.log(`Inserted ${docs.length} suppliers (Active: ${active}, Inactive: ${docs.length - active})`)
  }

  // Migrate supplier_address
  console.log('\n--- Migrating supplier_address ---')
  const addresses = parseInserts(sql, 'supplier_address')
  console.log(`Found ${addresses.length} supplier address records`)
  if (addresses.length > 0) {
    await db.collection('supplier_addresses').drop().catch(() => {})
    const addrDocs = addresses.map(a => ({
      legacy_id: parseInt(a.id_supplier_address) || 0,
      supplier_id: parseInt(a.supplier_id) || 0,
      name: clean(a.name),
      street_address: clean(a.street_address),
      street_address2: clean(a.street_address2),
      city: clean(a.city),
      state: clean(a.state),
      zip_code: clean(a.zip_code),
      country: clean(a.country),
      email: clean(a.email),
      phone: clean(a.phoneno),
      address_type: clean(a.address_type),
      address_tag: clean(a.address_tag),
      status: a.address_status === '1' ? 'active' : 'inactive',
      created_at: a.address_created_on && a.address_created_on !== '0000-00-00 00:00:00' ? new Date(a.address_created_on) : new Date(),
    }))
    await db.collection('supplier_addresses').insertMany(addrDocs)
    console.log(`Inserted ${addrDocs.length} supplier addresses`)
  }

  // Migrate supplier_contact
  console.log('\n--- Migrating supplier_contact ---')
  const contacts = parseInserts(sql, 'supplier_contact')
  console.log(`Found ${contacts.length} supplier contact records`)
  if (contacts.length > 0) {
    await db.collection('supplier_contacts').drop().catch(() => {})
    const contDocs = contacts.map(c => ({
      legacy_id: parseInt(c.id_supplier_contact) || 0,
      supplier_id: parseInt(c.supplier_id) || 0,
      contact_type: clean(c.contact_type),
      title: clean(c.contact_title),
      name: clean(c.contact_person),
      position: clean(c.contact_position),
      main_phone: clean(c.main_phone),
      desk_phone: clean(c.desk_phone),
      mobile_phone: clean(c.mobile_phone),
      email: clean(c.contact_email),
      status: c.contact_status === '1' ? 'active' : 'inactive',
      created_at: c.contact_created_on && c.contact_created_on !== '0000-00-00 00:00:00' ? new Date(c.contact_created_on) : new Date(),
    }))
    await db.collection('supplier_contacts').insertMany(contDocs)
    console.log(`Inserted ${contDocs.length} supplier contacts`)
  }

  await mongoose.disconnect()
  console.log('\nDone!')
}

main().catch(err => { console.error(err); process.exit(1) })
