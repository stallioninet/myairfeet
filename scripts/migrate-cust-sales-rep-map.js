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

  console.log('\n--- Migrating cust_sales_rep_map -> cust_sales_rep_map ---')
  const maps = parseInserts(sql, 'cust_sales_rep_map')
  console.log(`Found ${maps.length} cust_sales_rep_map records`)

  if (maps.length > 0) {
    await db.collection('cust_sales_rep_map').drop().catch(() => {})
    const docs = maps.map(m => ({
      legacy_id: parseInt(m.id_cust_sales_rep_map) || 0,
      company_id: parseInt(m.company_id) || 0,
      sales_rep_id: parseInt(m.id_sales_rep) || 0,
      sort_order: parseInt(m.sort_order) || 0,
      status: parseInt(m.cust_map_status) || 0,
      created_at: m.cust_map_created_on && m.cust_map_created_on !== '0000-00-00 00:00:00' ? new Date(m.cust_map_created_on) : new Date(),
    }))
    await db.collection('cust_sales_rep_map').insertMany(docs)
    console.log(`Inserted ${docs.length} cust_sales_rep_map records`)

    // Status: 1=active, 3=deleted
    const active = docs.filter(d => d.status === 1).length
    const deleted = docs.filter(d => d.status === 3).length
    console.log(`Active: ${active}, Deleted: ${deleted}`)
  }

  await mongoose.disconnect()
  console.log('\nDone!')
}

main().catch(err => { console.error(err); process.exit(1) })
