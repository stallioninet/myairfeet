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
        if (ch === ',') { vals.push(current.trim()); current = ''; pos++; continue }
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

  // 1. events
  console.log('\nMigrating events...')
  const events = parseInserts(sql, 'events')
  console.log(`Found ${events.length} events`)
  if (events.length > 0) {
    await db.collection('events').drop().catch(() => {})
    const docs = events.map(e => ({
      legacy_id: parseInt(e.event_id) || 0,
      event_id: parseInt(e.event_id) || 0,
      event_cust_code: (e.event_cust_code || '').trim(),
      name: (e.event_name || '').trim(),
      event_type: parseInt(e.event_type) || 0,
      salesTax_state_id: parseInt(e.salesTax_state_id) || 0,
      salesTax_percentage: parseFloat(e.salesTax_percentage) || 0,
      salesTax_fact: parseFloat(e.salesTax_fact) || 0,
      start_date: vDate(e.event_start),
      end_date: vDate(e.event_end),
      notes: (e.event_notes || '').trim(),
      event_total_item_cost: parseFloat(e.event_total_item_cost) || 0,
      overall_qty: parseInt(e.overall_qty) || 0,
      location: (e.event_location || '').trim(),
      status: e.event_status === '1' || e.status === '1' ? 'active' : 'inactive',
      created_at: vDate(e.created_on) || new Date(),
    }))
    await db.collection('events').insertMany(docs)
    console.log(`Inserted ${docs.length} events`)
  }

  // 2. event_types
  console.log('\nMigrating event_types...')
  const types = parseInserts(sql, 'event_types')
  console.log(`Found ${types.length} event_types`)
  if (types.length > 0) {
    await db.collection('event_types').drop().catch(() => {})
    const docs = types.map(t => ({
      legacy_id: parseInt(t.event_type_id) || 0,
      name: (t.event_type_name || t.type_name || '').trim(),
      status: t.status === '1' ? 'active' : 'inactive',
    }))
    await db.collection('event_types').insertMany(docs)
    console.log(`Inserted ${docs.length} event_types`)
  }

  // 3. event_items
  console.log('\nMigrating event_items...')
  const items = parseInserts(sql, 'event_items')
  console.log(`Found ${items.length} event_items`)
  if (items.length > 0) {
    await db.collection('event_items').drop().catch(() => {})
    const docs = items.map(i => ({
      legacy_id: parseInt(i.event_item_id) || 0,
      event_id: parseInt(i.event_id) || 0,
      product_id: parseInt(i.product_id) || 0,
      status_type: parseInt(i.status_type) || 0,
      size_name: (i.size_name || '').trim(),
      style_name: (i.style_name || '').trim(),
      description: (i.description || '').trim(),
      total_qty: parseInt(i.total_qty) || 0,
      status: parseInt(i.status) === 1 ? 'active' : 'inactive',
      created_at: vDate(i.created_on) || new Date(),
      updated_at: vDate(i.modified_on) || new Date(),
    }))
    await db.collection('event_items').insertMany(docs)
    console.log(`Inserted ${docs.length} event_items`)
  }

  // 4. event_item_cost
  console.log('\nMigrating event_item_cost...')
  const costs = parseInserts(sql, 'event_item_cost')
  console.log(`Found ${costs.length} event_item_cost`)
  if (costs.length > 0) {
    await db.collection('event_item_cost').drop().catch(() => {})
    const docs = costs.map(c => ({
      legacy_id: parseInt(c.event_cost_id || c.id) || 0,
      event_id: parseInt(c.event_id) || 0,
      item_name: parseInt(c.item_name) || 0,
      price: parseFloat(c.price) || 0,
      status: c.status === '1' ? 'active' : 'inactive',
      created_at: vDate(c.created_on) || new Date(),
    }))
    await db.collection('event_item_cost').insertMany(docs)
    console.log(`Inserted ${docs.length} event_item_cost`)
  }

  // 5. event_day_receipt_info
  console.log('\nMigrating event_day_receipt_info...')
  const receipts = parseInserts(sql, 'event_day_receipt_info')
  console.log(`Found ${receipts.length} event_day_receipt_info`)
  if (receipts.length > 0) {
    await db.collection('event_day_receipt_info').drop().catch(() => {})
    const docs = receipts.map(r => ({
      legacy_id: parseInt(r.day_reci_id || r.id) || 0,
      event_id: parseInt(r.event_id) || 0,
      event_day: vDate(r.event_day),
      hours: parseFloat(r.hours) || 0,
      cash: parseFloat(r.cash) || 0,
      credit: parseFloat(r.credit) || 0,
      checks: parseFloat(r.checks) || 0,
      status: parseInt(r.status) === 1 ? 'active' : 'inactive',
      created_at: vDate(r.created_on) || new Date(),
    }))
    await db.collection('event_day_receipt_info').insertMany(docs)
    console.log(`Inserted ${docs.length} event_day_receipt_info`)
  }

  // 6. event_advisor_map
  console.log('\nMigrating event_advisor_map...')
  const advisors = parseInserts(sql, 'event_advisor_map')
  console.log(`Found ${advisors.length} event_advisor_map`)
  if (advisors.length > 0) {
    await db.collection('event_advisor_map').drop().catch(() => {})
    const docs = advisors.map(a => ({
      legacy_id: parseInt(a.event_advisor_id || a.id) || 0,
      event_id: parseInt(a.event_id) || 0,
      sales_rep_id: parseInt(a.sales_rep_id || a.id_user_master) || 0,
      commission_rate: parseFloat(a.commission_rate || a.com_rate) || 0,
      paid_date: vDate(a.paid_date),
      status: a.status === '1' ? 'active' : 'inactive',
    }))
    await db.collection('event_advisor_map').insertMany(docs)
    console.log(`Inserted ${docs.length} event_advisor_map`)
  }

  await mongoose.disconnect()
  console.log('\nDone!')
}

main().catch(err => { console.error(err); process.exit(1) })
