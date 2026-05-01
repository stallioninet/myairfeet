import 'dotenv/config'
import fs from 'fs'
import mongoose from 'mongoose'

const sql = fs.readFileSync('E:/xmapp/htdocs/523app/co523.sql', 'utf-8')

// Extract company INSERT block
const insertBlock = sql.match(/INSERT INTO `company`[\s\S]+?;(?=\n(--|INSERT|$))/)?.[0]
if (!insertBlock) { console.log('No company block found'); process.exit(1) }

// Get column names
const colMatch = insertBlock.match(/INSERT INTO `company`\s*\(([^)]+)\)/)
const cols = colMatch[1].replace(/`/g, '').split(',').map(c => c.trim())
const statusIdx = cols.indexOf('company_status')
const idIdx = cols.indexOf('id_company')
console.log('Columns found, statusIdx:', statusIdx, 'idIdx:', idIdx)

// Parse all VALUE rows by scanning character by character
const valuesStart = insertBlock.indexOf('VALUES')
const valuesSection = insertBlock.slice(valuesStart + 6)

const rows = []
let depth = 0, inStr = false, escaped = false, cur = ''
for (let i = 0; i < valuesSection.length; i++) {
  const ch = valuesSection[i]
  if (escaped) { escaped = false; cur += ch; continue }
  if (ch === '\\') { escaped = true; cur += ch; continue }
  if (ch === "'") { inStr = !inStr; cur += ch; continue }
  if (inStr) { cur += ch; continue }
  if (ch === '(') { depth++; if (depth === 1) { cur = ''; continue } }
  if (ch === ')') {
    depth--
    if (depth === 0) { rows.push(cur); cur = ''; continue }
  }
  if (depth > 0) cur += ch
}

console.log('Total company rows:', rows.length)

// Parse each row into columns
const pilotIds = []
rows.forEach(row => {
  const vals = []
  let v = '', inS = false, esc = false
  for (const ch of row) {
    if (esc) { esc = false; v += ch; continue }
    if (ch === '\\') { esc = true; continue }
    if (ch === "'") { inS = !inS; continue }
    if (!inS && ch === ',') { vals.push(v.trim()); v = ''; continue }
    v += ch
  }
  vals.push(v.trim())
  if (vals[statusIdx] === '4') pilotIds.push(parseInt(vals[idIdx]))
})

console.log('Pilot customer IDs:', pilotIds.length)
console.log('Sample:', pilotIds.slice(0, 20))

// Now update MongoDB
const MONGO_URI = process.env.MONGO_URI
await mongoose.connect(MONGO_URI)
const db = mongoose.connection.db
const col = db.collection('customers')

const result = await col.updateMany(
  { legacy_id: { $in: pilotIds } },
  { $set: { status: 'pilot' } }
)
console.log('Updated to pilot:', result.modifiedCount)
await mongoose.disconnect()
