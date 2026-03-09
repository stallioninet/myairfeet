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

  // Build product_item old ID -> new _id map
  const prods = await db.collection('productitems').find({}).toArray()
  const prodSql = parseInserts(sql, 'product_item')
  const productIdMap = {}
  prodSql.forEach((p, i) => {
    if (prods[i]) productIdMap[parseInt(p.id_product_item)] = prods[i]._id
  })
  console.log(`Product map: ${Object.keys(productIdMap).length} entries`)

  // Parse group_productitems
  const groups = parseInserts(sql, 'group_productitems')
  console.log(`group_productitems: ${groups.length} rows`)
  groups.forEach(g => console.log(`  id=${g.id} name="${g.item_group_name}" items="${g.item}"`))

  // Rebuild productgroups
  await db.collection('productgroups').deleteMany({})
  const docs = groups.map(g => {
    const prodIds = (g.item || '').split(',').map(id => productIdMap[parseInt(id)]).filter(Boolean)
    return {
      name: g.item_group_name || '',
      description: '',
      products: prodIds,
      status: 'active',
      created_at: new Date(),
    }
  })

  if (docs.length > 0) {
    await db.collection('productgroups').insertMany(docs)
  }
  console.log(`Migrated ${docs.length} product groups`)

  // Verify
  const saved = await db.collection('productgroups').find({}).toArray()
  saved.forEach(g => console.log(`  "${g.name}" -> ${g.products.length} products`))

  await mongoose.disconnect()
  console.log('Done!')
}

fix().catch(err => { console.error(err); process.exit(1) })
