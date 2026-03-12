import mongoose from 'mongoose'
import fs from 'fs'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: join(__dirname, '..', '.env') })

function parseInserts(sql, table) {
  const regex = new RegExp('INSERT INTO `' + table + '` \\(([^)]+)\\)\\s*VALUES\\s*', 'gi')
  const results = []
  let m
  while ((m = regex.exec(sql)) !== null) {
    const cols = m[1].replace(/`/g, '').split(',').map(c => c.trim())
    const valStr = sql.substring(m.index + m[0].length)
    const rows = []
    let i = 0, depth = 0, start = -1
    while (i < valStr.length) {
      if (valStr[i] === '(') { if (depth === 0) start = i + 1; depth++ }
      else if (valStr[i] === ')') {
        depth--
        if (depth === 0 && start >= 0) { rows.push(valStr.substring(start, i)); start = -1 }
      } else if (valStr[i] === ';' && depth === 0) break
      else if (valStr[i] === "'" && depth > 0) {
        i++
        while (i < valStr.length && !(valStr[i] === "'" && valStr[i - 1] !== '\\')) i++
      }
      i++
    }
    for (const row of rows) {
      const vals = []
      let j = 0, inStr = false, vStart = 0
      while (j <= row.length) {
        if (j === row.length || (row[j] === ',' && !inStr)) {
          let v = row.substring(vStart, j).trim()
          if (v.startsWith("'") && v.endsWith("'")) v = v.slice(1, -1).replace(/\\'/g, "'")
          else if (v === 'NULL') v = null
          vals.push(v)
          vStart = j + 1
        } else if (row[j] === "'") inStr = !inStr
        j++
      }
      const obj = {}
      cols.forEach((c, idx) => { obj[c] = vals[idx] !== undefined ? vals[idx] : null })
      results.push(obj)
    }
  }
  return results
}

async function main() {
  await mongoose.connect(process.env.MONGO_URI, { dbName: '523' })
  const db = mongoose.connection.db
  const sql = fs.readFileSync('E:/xmapp/htdocs/523prototype/myairfee_8qvsun15.sql', 'utf-8')

  const addrs = parseInserts(sql, 'company_address')
  console.log('Found', addrs.length, 'company_address records')

  await db.collection('cust_addresses').drop().catch(() => {})
  const docs = addrs.map(a => ({
    legacy_id: parseInt(a.id_company_address) || 0,
    company_id: parseInt(a.company_id) || 0,
    name: (a.name || '').trim(),
    street_address: (a.street_address || '').trim(),
    street_address2: (a.street_address2 || '').trim(),
    address1: (a.address1 || '').trim(),
    address2: (a.address2 || '').trim(),
    address3: (a.address3 || '').trim(),
    city: (a.city || '').trim(),
    state: (a.state || '').trim(),
    zip_code: (a.zip_code || '').trim(),
    country: (a.country || '').trim(),
    email: (a.email || '').trim(),
    phone: (a.phoneno || '').trim(),
    shipping_acnt: (a.shipping_acnt || '').trim(),
    address_type: (a.address_type || '').trim(),
    address_label: (a.address_label || '').trim(),
    status: parseInt(a.address_status) || 0,
  }))
  await db.collection('cust_addresses').insertMany(docs)
  console.log('Inserted', docs.length, 'cust_addresses')

  // Verify
  const addr82 = await db.collection('cust_addresses').find({ company_id: 82 }).toArray()
  console.log('\nMajestic Glove (82):', addr82.length, 'addresses')
  addr82.forEach(a => console.log(' ', a.legacy_id, a.name, a.street_address, a.city, a.state, a.zip_code, 'type:', a.address_type))

  const addr456 = await db.collection('cust_addresses').find({ company_id: 456 }).toArray()
  console.log('\nRoppe (456):', addr456.length, 'addresses')
  addr456.forEach(a => console.log(' ', a.legacy_id, a.name, a.street_address, a.city, a.state, a.zip_code))

  await mongoose.disconnect()
  console.log('\nDone!')
}

main().catch(err => { console.error(err); process.exit(1) })
