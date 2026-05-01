import mongoose from 'mongoose'
import fs from 'fs'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: join(__dirname, '..', '.env') })

const SQL_FILE = 'E:/xmapp/htdocs/523app/co523.sql'

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
      const vals = []; let current = '', inStr = false, escape = false
      while (pos < sql.length) {
        const ch = sql[pos]
        if (escape) { current += ch; escape = false; pos++; continue }
        if (ch === '\\') { escape = true; pos++; continue }
        if (ch === "'" && !inStr) { inStr = true; pos++; continue }
        if (ch === "'" && inStr) {
          if (sql[pos + 1] === "'") { current += "'"; pos += 2; continue }
          inStr = false; pos++; continue
        }
        if (inStr) { current += ch; pos++; continue }
        if (ch === ',' ) { vals.push(current.trim()); current = ''; pos++; continue }
        if (ch === ')') { vals.push(current.trim()); pos++; break }
        current += ch; pos++
      }
      const row = {}
      cols.forEach((col, i) => {
        let v = vals[i] ?? ''
        if (v === 'NULL' || v === 'null') v = null
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

function vDate(s) {
  if (!s || s === '0000-00-00' || s === '0000-00-00 00:00:00') return null
  const d = new Date(s)
  return isNaN(d) ? null : d
}

async function main() {
  console.log('Reading SQL file...')
  const sql = fs.readFileSync(SQL_FILE, 'utf-8')

  await mongoose.connect(process.env.MONGO_URI, { dbName: 'app' })
  const db = mongoose.connection.db

  // 1. airfeet_po -> airfeet_pos
  console.log('\nMigrating airfeet_po -> airfeet_pos...')
  const pos = parseInserts(sql, 'airfeet_po')
  console.log(`Found ${pos.length} records`)
  if (pos.length > 0) {
    await db.collection('airfeet_pos').drop().catch(() => {})
    const docs = pos.map(p => ({
      legacy_id: parseInt(p.airfeet_po_id) || 0,
      supplier_id: parseInt(p.supplier_id) || 0,
      project: (p.project || '').trim(),
      po_number: (p.po_number || '').trim(),
      invoice_number: (p.invoice_number || '').trim(),
      invoice_date: vDate(p.invoice_date),
      po_date: vDate(p.po_date),
      po_total_qty: parseInt(p.po_total_qty) || 0,
      po_net_amount: parseFloat(p.po_net_amount) || 0,
      shipping_costs: parseFloat(p.shipping_costs) || 0,
      po_notes: (p.po_notes || '').trim(),
      shipinfo_notes: (p.shipinfo_notes || '').trim(),
      airfeet_notes: (p.airfeet_notes || '').trim(),
      inv_status: (p.inv_status || '').trim(),
      tracking_no: (p.tracking_no || '').trim(),
      shippied_date: vDate(p.shippied_date),
      status: parseInt(p.po_status) === 1 ? 'active' : 'inactive',
      po_status: parseInt(p.po_status) || 0,
      billing_address: p.billing_address || '',
      shipping_address: p.shipping_address || '',
      created_at: vDate(p.po_created_on) || new Date(),
      updated_at: vDate(p.po_modified_on) || new Date(),
    }))
    await db.collection('airfeet_pos').insertMany(docs)
    console.log(`Inserted ${docs.length} airfeet_pos`)
  }

  // 2. airfeet_part_desc -> airfeet_part_descs
  console.log('\nMigrating airfeet_part_desc -> airfeet_part_descs...')
  const parts = parseInserts(sql, 'airfeet_part_desc')
  console.log(`Found ${parts.length} records`)
  if (parts.length > 0) {
    await db.collection('airfeet_part_descs').drop().catch(() => {})
    const docs = parts.map(p => ({
      legacy_id: parseInt(p.pd_id) || 0,
      po_id: parseInt(p.po_id) || 0,
      item_with_desc: (p.item_with_desc || '').trim(),
      uom: (p.uom || '').trim(),
      unit_cost: parseFloat(p.unit_cost) || 0,
      qty: parseInt(p.qty) || 0,
      total: parseFloat(p.total) || 0,
      status: parseInt(p.po_item_status) === 1 ? 'active' : 'inactive',
    }))
    await db.collection('airfeet_part_descs').insertMany(docs)
    console.log(`Inserted ${docs.length} airfeet_part_descs`)
  }

  // 3. airfeet_po_sales_rep_mapping -> airfeet_po_rep_maps
  console.log('\nMigrating airfeet_po_sales_rep_mapping -> airfeet_po_rep_maps...')
  const repMaps = parseInserts(sql, 'airfeet_po_sales_rep_mapping')
  console.log(`Found ${repMaps.length} records`)
  if (repMaps.length > 0) {
    await db.collection('airfeet_po_rep_maps').drop().catch(() => {})
    const docs = repMaps.map(r => ({
      po_id: parseInt(r.airfeet_po_id || r.po_id) || 0,
      sales_rep_id: parseInt(r.sales_rep_id || r.id_user_master) || 0,
      status: parseInt(r.status) === 1 ? 'active' : 'inactive',
    }))
    await db.collection('airfeet_po_rep_maps').insertMany(docs)
    console.log(`Inserted ${docs.length} airfeet_po_rep_maps`)
  }

  await mongoose.disconnect()
  console.log('\nDone!')
}

main().catch(err => { console.error(err); process.exit(1) })
