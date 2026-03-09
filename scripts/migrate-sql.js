import mongoose from 'mongoose'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const MONGO_URI = 'mongodb+srv://523:AAJfuYEce0N5elui@cluster0.dg7goyw.mongodb.net/?appName=Cluster0'
const SQL_FILE = 'E:/projcet/523/myairfee_8qvsun15.sql'

// Parse INSERT statements from SQL
function parseInserts(sql, tableName) {
  const regex = new RegExp(`INSERT INTO \`${tableName}\`\\s*\\(([^)]+)\\)\\s*VALUES\\s*([\\s\\S]*?);`, 'g')
  const rows = []
  let match
  while ((match = regex.exec(sql)) !== null) {
    const cols = match[1].replace(/`/g, '').split(',').map(c => c.trim())
    const valuesStr = match[2]
    // Parse each row tuple
    const tupleRegex = /\(([^)]*(?:'[^']*'[^)]*)*)\)/g
    let tuple
    while ((tuple = tupleRegex.exec(valuesStr)) !== null) {
      const vals = []
      let val = ''
      let inStr = false
      for (let i = 0; i < tuple[1].length; i++) {
        const ch = tuple[1][i]
        if (ch === "'" && !inStr) { inStr = true; continue }
        if (ch === "'" && inStr) {
          if (tuple[1][i + 1] === "'") { val += "'"; i++; continue }
          inStr = false; continue
        }
        if (ch === ',' && !inStr) { vals.push(val.trim()); val = ''; continue }
        val += ch
      }
      vals.push(val.trim())
      const obj = {}
      cols.forEach((c, idx) => { obj[c] = vals[idx] || '' })
      rows.push(obj)
    }
  }
  return rows
}

async function migrate() {
  console.log('Reading SQL file...')
  const sql = fs.readFileSync(SQL_FILE, 'utf-8')

  console.log('Connecting to MongoDB...')
  await mongoose.connect(MONGO_URI, { dbName: '523' })
  const db = mongoose.connection.db

  // 1. Parse item_type
  const itemTypes = parseInserts(sql, 'item_type')
  console.log(`\nParsed ${itemTypes.length} item_type rows`)

  // 2. Parse product_item (the main one with id_item_type linking to item_type)
  const productItems = parseInserts(sql, 'product_item')
  console.log(`Parsed ${productItems.length} product_item rows`)

  // 3. Parse item_size
  const itemSizes = parseInserts(sql, 'item_size')
  console.log(`Parsed ${itemSizes.length} item_size rows`)

  // 4. Parse item_map
  const itemMaps = parseInserts(sql, 'item_map')
  console.log(`Parsed ${itemMaps.length} item_map rows`)

  // 5. Parse product_size (different from item_size)
  const productSizes = parseInserts(sql, 'product_size')
  console.log(`Parsed ${productSizes.length} product_size rows`)

  // --- Clear existing data ---
  console.log('\nClearing existing collections...')
  await db.collection('itemtypes').deleteMany({})
  await db.collection('productitems').deleteMany({})
  await db.collection('productsizes').deleteMany({})
  await db.collection('itemsizemaps').deleteMany({})

  // --- Migrate item_type -> itemtypes ---
  const typeIdMap = {} // old id -> new _id
  if (itemTypes.length > 0) {
    const typeDocs = itemTypes.map(t => ({
      name: t.item_type_name,
      description: '',
      icon: 'bi-box-seam',
      icon_bg: '#dbeafe',
      icon_color: '#1d4ed8',
      status: t.type_status === '1' ? 'active' : 'inactive',
      created_at: t.type_created_on !== '0000-00-00 00:00:00' ? new Date(t.type_created_on) : new Date(),
      updated_at: t.type_modified_on !== '0000-00-00 00:00:00' ? new Date(t.type_modified_on) : new Date(),
      _oldId: parseInt(t.id_item_type)
    }))
    const result = await db.collection('itemtypes').insertMany(typeDocs)
    typeDocs.forEach((d, i) => { typeIdMap[d._oldId] = result.insertedIds[i] })
    console.log(`Migrated ${typeDocs.length} item types`)
  }

  // --- Migrate product_items -> productitems ---
  const productIdMap = {} // old id -> new _id
  if (productItems.length > 0) {
    const prodDocs = productItems.map(p => ({
      name: p.item_name,
      item_type: typeIdMap[parseInt(p.id_item_type)] || null,
      unit_price: parseFloat(p.unit_price) || 0,
      base_price: parseFloat(p.base_price) || 0,
      notes: (p.prod_notes && p.prod_notes !== 'NULL') ? p.prod_notes : '',
      sort_order: parseInt(p.item_order) || 0,
      status: p.prod_status === '1' ? 'active' : 'inactive',
      created_at: p.prod_created_on !== '0000-00-00 00:00:00' ? new Date(p.prod_created_on) : new Date(),
      updated_at: p.prod_modified_on !== '0000-00-00 00:00:00' ? new Date(p.prod_modified_on) : new Date(),
      _oldId: parseInt(p.id_product_item)
    }))
    const result = await db.collection('productitems').insertMany(prodDocs)
    prodDocs.forEach((d, i) => { productIdMap[d._oldId] = result.insertedIds[i] })
    console.log(`Migrated ${prodDocs.length} product items`)
  }

  // --- Migrate item_size -> productsizes ---
  const sizeIdMap = {} // old id -> new _id
  if (itemSizes.length > 0) {
    const sizeDocs = itemSizes.map((s, i) => ({
      name: s.size_name,
      code: s.size_code,
      sort_order: i + 1,
      status: s.size_status === '1' ? 'active' : 'inactive',
      created_at: new Date(),
      updated_at: new Date(),
      _oldId: parseInt(s.id_item_size)
    }))
    const result = await db.collection('productsizes').insertMany(sizeDocs)
    sizeDocs.forEach((d, i) => { sizeIdMap[d._oldId] = result.insertedIds[i] })
    console.log(`Migrated ${sizeDocs.length} product sizes (from item_size)`)
  }

  // Also add product_size entries that don't overlap
  if (productSizes.length > 0) {
    const existingNames = itemSizes.map(s => s.size_name.toLowerCase())
    const newSizes = productSizes.filter(s => !existingNames.includes(s.size_name.toLowerCase()))
    if (newSizes.length > 0) {
      const extraDocs = newSizes.map((s, i) => ({
        name: s.size_name,
        code: s.size_desc || s.size_name,
        sort_order: itemSizes.length + i + 1,
        status: s.status === '1' ? 'active' : 'inactive',
        created_at: s.created_on !== '0000-00-00 00:00:00' ? new Date(s.created_on) : new Date(),
        updated_at: s.modified_on !== '0000-00-00 00:00:00' ? new Date(s.modified_on) : new Date(),
      }))
      await db.collection('productsizes').insertMany(extraDocs)
      console.log(`Migrated ${extraDocs.length} extra product sizes (from product_size)`)
    }
  }

  // --- Migrate item_map -> itemsizemaps ---
  if (itemMaps.length > 0) {
    const mapDocs = itemMaps.filter(m => {
      const pid = parseInt(m.item_id)
      const sid = parseInt(m.item_size_id)
      return productIdMap[pid] && sizeIdMap[sid]
    }).map(m => ({
      product_item: productIdMap[parseInt(m.item_id)],
      size: sizeIdMap[parseInt(m.item_size_id)],
      sku: m.item_SKU,
      status: m.item_map_status === '1' ? 'active' : 'inactive',
      created_at: m.item_map_created_on !== '0000-00-00 00:00:00' ? new Date(m.item_map_created_on) : new Date(),
      updated_at: m.item_map_updated_on !== '0000-00-00 00:00:00' ? new Date(m.item_map_updated_on) : new Date(),
    }))

    // Also handle maps with size_id=0 (no size)
    const noSizeMaps = itemMaps.filter(m => parseInt(m.item_size_id) === 0 && productIdMap[parseInt(m.item_id)])

    if (mapDocs.length > 0) {
      await db.collection('itemsizemaps').insertMany(mapDocs)
    }
    console.log(`Migrated ${mapDocs.length} item size maps (${noSizeMaps.length} skipped - no size)`)
  }

  // Clean up _oldId fields
  await db.collection('itemtypes').updateMany({}, { $unset: { _oldId: 1 } })
  await db.collection('productitems').updateMany({}, { $unset: { _oldId: 1 } })
  await db.collection('productsizes').updateMany({}, { $unset: { _oldId: 1 } })

  // Print summary
  console.log('\n=== Migration Summary ===')
  console.log('itemtypes:', await db.collection('itemtypes').countDocuments())
  console.log('productitems:', await db.collection('productitems').countDocuments())
  console.log('productsizes:', await db.collection('productsizes').countDocuments())
  console.log('itemsizemaps:', await db.collection('itemsizemaps').countDocuments())

  await mongoose.disconnect()
  console.log('\nDone!')
}

migrate().catch(err => { console.error(err); process.exit(1) })
