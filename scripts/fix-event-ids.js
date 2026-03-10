import mongoose from 'mongoose'
import fs from 'fs'

const MONGO_URI = 'mongodb+srv://523:AAJfuYEce0N5elui@cluster0.dg7goyw.mongodb.net/?appName=Cluster0'
const SQL_FILE = 'E:/projcet/523/myairfee_8qvsun15.sql'

function parseInserts(sql, tableName) {
  const rows = []
  const insertRe = new RegExp('INSERT INTO `' + tableName + '`\\s*\\(([^)]+)\\)\\s*VALUES', 'g')
  let m
  while ((m = insertRe.exec(sql)) !== null) {
    const cols = m[1].replace(/`/g, '').split(',').map(c => c.trim())
    let pos = m.index + m[0].length
    let depth = 0, inStr = false, escaped = false, tupleStart = -1
    for (let i = pos; i < sql.length; i++) {
      const ch = sql[i]
      if (escaped) { escaped = false; continue }
      if (ch === '\\') { escaped = true; continue }
      if (ch === "'" && !inStr) { inStr = true; continue }
      if (ch === "'" && inStr) { if (sql[i+1]==="'"){i++;continue}; inStr=false; continue }
      if (inStr) continue
      if (ch === '(') { if (depth===0) tupleStart=i+1; depth++ }
      if (ch === ')') { depth--; if (depth===0 && tupleStart>0) { rows.push(parseTuple(cols, sql.substring(tupleStart,i))); tupleStart=-1 } }
      if (ch === ';' && depth===0) break
    }
  }
  return rows
}

function parseTuple(cols, raw) {
  const vals = [], obj = {}
  let val='', inStr=false, escaped=false
  for (let i=0;i<raw.length;i++) {
    const ch=raw[i]
    if (escaped){val+=ch;escaped=false;continue}
    if (ch==='\\'&&inStr){escaped=true;continue}
    if (ch==="'"&&!inStr){inStr=true;continue}
    if (ch==="'"&&inStr){if(raw[i+1]==="'"){val+="'";i++;continue};inStr=false;continue}
    if (ch===','&&!inStr){vals.push(val.trim());val='';continue}
    val+=ch
  }
  vals.push(val.trim())
  cols.forEach((c,idx)=>{obj[c]=vals[idx]==='NULL'?null:vals[idx]||''})
  return obj
}

async function fix() {
  console.log('Reading SQL...')
  const sql = fs.readFileSync(SQL_FILE, 'utf-8')
  await mongoose.connect(MONGO_URI, { dbName: '523' })
  const db = mongoose.connection.db

  // Parse events from SQL
  const sqlEvents = parseInserts(sql, 'events')
  console.log(`SQL events: ${sqlEvents.length}`)
  sqlEvents.forEach(e => console.log(`  id=${e.event_id} name="${e.event_name}"`))

  // Get events from MongoDB
  const dbEvents = await db.collection('events').find({}).toArray()
  console.log(`\nDB events: ${dbEvents.length}`)

  // Match by name
  let matched = 0
  for (const se of sqlEvents) {
    const de = dbEvents.find(d => d.name === se.event_name)
    if (de) {
      await db.collection('events').updateOne({_id: de._id}, {$set: {old_event_id: se.event_id}})
      matched++
    } else {
      console.log(`  NOT FOUND: "${se.event_name}"`)
    }
  }
  console.log(`\nMatched ${matched} / ${sqlEvents.length}`)

  // Verify
  const sample = await db.collection('events').find({old_event_id:{$exists:true}}).limit(5).project({name:1,old_event_id:1}).toArray()
  console.log('\nSamples:', sample)

  // Now check which old event_ids are referenced in sub-collections
  const usedIds = new Set()
  const items = await db.collection('event_items').distinct('event_id')
  items.forEach(id => usedIds.add(id))
  const receipts = await db.collection('event_day_receipt_info').distinct('event_id')
  receipts.forEach(id => usedIds.add(id))
  const costs = await db.collection('event_item_cost').distinct('event_id')
  costs.forEach(id => usedIds.add(id))
  console.log('\nUsed event_ids in sub-collections:', [...usedIds].sort((a,b)=>parseInt(a)-parseInt(b)))

  await mongoose.disconnect()
  console.log('Done!')
}

fix().catch(err => { console.error(err); process.exit(1) })
