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
      if (ch === ')') { depth--; if (depth===0 && tupleStart>0) { rows.push(parseTupleObj(cols, sql.substring(tupleStart,i))); tupleStart=-1 } }
      if (ch === ';' && depth===0) break
    }
  }
  return rows
}

function parseTupleObj(cols, raw) {
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

function validDate(d) {
  if (!d||d==='NULL'||d==='0000-00-00 00:00:00'||d==='0000-00-00') return null
  const dt=new Date(d); return isNaN(dt.getTime())?null:dt
}

async function fix() {
  console.log('Reading SQL...')
  const sql = fs.readFileSync(SQL_FILE, 'utf-8')
  await mongoose.connect(MONGO_URI, { dbName: '523' })
  const db = mongoose.connection.db

  // Build company_id -> MongoDB _id map from customers
  const customers = await db.collection('customers').find({}).toArray()
  // We need to rebuild the old ID map by parsing company again
  const companies = parseInserts(sql, 'company')
  const companyIdMap = {}
  companies.forEach((c, i) => {
    if (customers[i]) companyIdMap[parseInt(c.id_company)] = customers[i]._id
  })
  console.log(`Built company map: ${Object.keys(companyIdMap).length} entries`)

  // Build product_id map
  const prods = await db.collection('productitems').find({}).toArray()
  const prodSql = parseInserts(sql, 'product_item')
  const productIdMap = {}
  prodSql.forEach((p, i) => {
    if (prods[i]) productIdMap[parseInt(p.id_product_item)] = prods[i]._id
  })
  console.log(`Built product map: ${Object.keys(productIdMap).length} entries`)

  // Build PO map
  const pos = await db.collection('purchase_orders').find({}).toArray()
  const poSql = parseInserts(sql, 'purchase_order')
  const poIdMap = {}
  poSql.forEach((o, i) => {
    if (pos[i]) poIdMap[parseInt(o.id_purchase_order)] = pos[i]._id
  })
  console.log(`Built PO map: ${Object.keys(poIdMap).length} entries`)

  // Build size map
  const szs = await db.collection('productsizes').find({}).toArray()
  const szSql = parseInserts(sql, 'item_size')
  const sizeIdMap = {}
  szSql.forEach((s, i) => {
    if (szs[i]) sizeIdMap[parseInt(s.id_item_size)] = szs[i]._id
  })

  // ===== company_address =====
  const addrs = parseInserts(sql, 'company_address')
  console.log(`\ncompany_address: ${addrs.length} rows`)
  await db.collection('customer_addresses').deleteMany({})
  const addrDocs = addrs.map(a => ({
    customer: companyIdMap[parseInt(a.company_id)] || null,
    label: a.address_label || a.name || 'Address',
    street: a.street_address || '',
    street2: a.street_address2 || '',
    city: a.city || '',
    state: a.state || '',
    zip: a.zip_code || '',
    country: a.country || 'United States',
    email: a.email || '',
    phone: a.phoneno || '',
    address_type: a.address_type || '',
    shipping_acnt: a.shipping_acnt || '',
    status: a.address_status === '1' ? 'active' : 'inactive',
    created_at: validDate(a.address_created_on) || new Date(),
  })).filter(d => d.customer)
  if (addrDocs.length > 0) await db.collection('customer_addresses').insertMany(addrDocs)
  console.log(`  -> migrated ${addrDocs.length} customer addresses`)

  // ===== company_contact =====
  const contacts = parseInserts(sql, 'company_contact')
  console.log(`\ncompany_contact: ${contacts.length} rows`)
  await db.collection('customer_contacts').deleteMany({})
  const contactDocs = contacts.map(c => ({
    customer: companyIdMap[parseInt(c.company_id)] || null,
    type: c.contact_type || '',
    title: c.contact_title || '',
    person: c.contact_person || '',
    position: c.contact_position || '',
    main_phone: c.main_phone || '',
    main_ext: c.main_ext || '',
    desk_phone: c.desk_phone || '',
    desk_ext: c.desk_ext || '',
    mobile_phone: c.mobile_phone || '',
    email: c.contact_email || '',
    label: c.contact_label || '',
    display_order: parseInt(c.display_order) || 0,
    status: c.contact_status === '1' ? 'active' : 'inactive',
    created_at: validDate(c.contact_created_on) || new Date(),
  })).filter(d => d.customer)
  if (contactDocs.length > 0) await db.collection('customer_contacts').insertMany(contactDocs)
  console.log(`  -> migrated ${contactDocs.length} customer contacts`)

  // ===== company_emails =====
  const emails = parseInserts(sql, 'company_emails')
  console.log(`\ncompany_emails: ${emails.length} rows`)
  await db.collection('customer_emails').deleteMany({})
  const emailDocs = emails.map(e => ({
    customer: companyIdMap[parseInt(e.company_id)] || null,
    name: e.name || '',
    email: e.email || '',
    status: e.status === '1' ? 'active' : 'inactive',
    created_at: validDate(e.created_on) || new Date(),
  })).filter(d => d.customer)
  if (emailDocs.length > 0) await db.collection('customer_emails').insertMany(emailDocs)
  console.log(`  -> migrated ${emailDocs.length} customer emails`)

  // ===== cust_sales_rep_map =====
  const repMaps = parseInserts(sql, 'cust_sales_rep_map')
  console.log(`\ncust_sales_rep_map: ${repMaps.length} rows`)
  await db.collection('customer_rep_maps').deleteMany({})
  const repDocs = repMaps.map(m => ({
    customer: companyIdMap[parseInt(m.company_id)] || null,
    sales_rep_old_id: parseInt(m.id_sales_rep) || 0,
    sort_order: parseInt(m.sort_order) || 0,
    status: m.cust_map_status === '1' ? 'active' : 'inactive',
    created_at: validDate(m.cust_map_created_on) || new Date(),
  })).filter(d => d.customer)
  if (repDocs.length > 0) await db.collection('customer_rep_maps').insertMany(repDocs)
  console.log(`  -> migrated ${repDocs.length} customer-rep maps`)

  // ===== po_item =====
  const poItems = parseInserts(sql, 'po_item')
  console.log(`\npo_item: ${poItems.length} rows`)
  await db.collection('po_items').deleteMany({})
  const poItemDocs = poItems.map(p => ({
    purchase_order: poIdMap[parseInt(p.po_id)] || null,
    product_item: productIdMap[parseInt(p.item_id)] || null,
    item_name: p.po_item_name || '',
    item_type_id: parseInt(p.item_type_id) || 0,
    unit_price: parseFloat(p.item_unit_cost) || 0,
    quantity: parseInt(p.item_qty) || 0,
    back_order: p.bo_option || '',
    total: parseFloat(p.item_total) || 0,
    status: p.po_item_status === '1' ? 'active' : 'inactive',
    created_at: validDate(p.po_item_created_on) || new Date(),
    updated_at: validDate(p.po_item_modified_on) || new Date(),
  })).filter(d => d.purchase_order)
  if (poItemDocs.length > 0) await db.collection('po_items').insertMany(poItemDocs)
  console.log(`  -> migrated ${poItemDocs.length} PO items`)

  // ===== Remaining small tables =====
  // supplier_address
  const suppAddrs = parseInserts(sql, 'supplier_address')
  console.log(`\nsupplier_address: ${suppAddrs.length} rows`)
  if (suppAddrs.length > 0) {
    await db.collection('supplier_addresses').deleteMany({})
    await db.collection('supplier_addresses').insertMany(suppAddrs)
    console.log(`  -> migrated ${suppAddrs.length}`)
  }

  // supplier_contact
  const suppContacts = parseInserts(sql, 'supplier_contact')
  console.log(`supplier_contact: ${suppContacts.length} rows`)
  if (suppContacts.length > 0) {
    await db.collection('supplier_contacts').deleteMany({})
    await db.collection('supplier_contacts').insertMany(suppContacts)
    console.log(`  -> migrated ${suppContacts.length}`)
  }

  // user_address
  const userAddrs = parseInserts(sql, 'user_address')
  console.log(`user_address: ${userAddrs.length} rows`)
  if (userAddrs.length > 0) {
    await db.collection('user_addresses').deleteMany({})
    await db.collection('user_addresses').insertMany(userAddrs)
    console.log(`  -> migrated ${userAddrs.length}`)
  }

  // user_contact
  const userContacts = parseInserts(sql, 'user_contact')
  console.log(`user_contact: ${userContacts.length} rows`)
  if (userContacts.length > 0) {
    await db.collection('user_contacts').deleteMany({})
    await db.collection('user_contacts').insertMany(userContacts)
    console.log(`  -> migrated ${userContacts.length}`)
  }

  // user_privileges
  const userPrivs = parseInserts(sql, 'user_privileges')
  console.log(`user_privileges: ${userPrivs.length} rows`)
  if (userPrivs.length > 0) {
    await db.collection('user_privileges').deleteMany({})
    await db.collection('user_privileges').insertMany(userPrivs)
    console.log(`  -> migrated ${userPrivs.length}`)
  }

  // default_privilege_access
  const defPrivs = parseInserts(sql, 'default_privilege_access')
  console.log(`default_privilege_access: ${defPrivs.length} rows`)
  if (defPrivs.length > 0) {
    await db.collection('default_privilege_access').deleteMany({})
    await db.collection('default_privilege_access').insertMany(defPrivs)
    console.log(`  -> migrated ${defPrivs.length}`)
  }

  // invoice_check_details
  const invChecks = parseInserts(sql, 'invoice_check_details')
  console.log(`invoice_check_details: ${invChecks.length} rows`)
  if (invChecks.length > 0) {
    await db.collection('invoice_check_details').deleteMany({})
    await db.collection('invoice_check_details').insertMany(invChecks)
    console.log(`  -> migrated ${invChecks.length}`)
  }

  // invoice_payment_rep
  const invPayRep = parseInserts(sql, 'invoice_payment_rep')
  console.log(`invoice_payment_rep: ${invPayRep.length} rows`)
  if (invPayRep.length > 0) {
    await db.collection('invoice_payment_reps').deleteMany({})
    await db.collection('invoice_payment_reps').insertMany(invPayRep)
    console.log(`  -> migrated ${invPayRep.length}`)
  }

  // invoice_customer_po
  const invCustPo = parseInserts(sql, 'invoice_customer_po')
  console.log(`invoice_customer_po: ${invCustPo.length} rows`)
  if (invCustPo.length > 0) {
    await db.collection('invoice_customer_pos').deleteMany({})
    await db.collection('invoice_customer_pos').insertMany(invCustPo)
    console.log(`  -> migrated ${invCustPo.length}`)
  }

  // po_sales_rep_mapping
  const poRepMaps = parseInserts(sql, 'po_sales_rep_mapping')
  console.log(`po_sales_rep_mapping: ${poRepMaps.length} rows`)
  if (poRepMaps.length > 0) {
    await db.collection('po_sales_rep_maps').deleteMany({})
    await db.collection('po_sales_rep_maps').insertMany(poRepMaps)
    console.log(`  -> migrated ${poRepMaps.length}`)
  }

  // event related
  for (const t of ['event_items', 'event_item_cost', 'event_advisor_map', 'event_day_receipt_info', 'event_email_history', 'advisor_bonus_info']) {
    const rows = parseInserts(sql, t)
    console.log(`${t}: ${rows.length} rows`)
    if (rows.length > 0) {
      const col = t.replace(/_/g, '_')
      await db.collection(col).deleteMany({})
      await db.collection(col).insertMany(rows)
      console.log(`  -> migrated ${rows.length}`)
    }
  }

  // status table
  const statuses = parseInserts(sql, 'status')
  if (statuses.length > 0) {
    await db.collection('statuses').deleteMany({})
    await db.collection('statuses').insertMany(statuses)
    console.log(`statuses: ${statuses.length}`)
  }

  // FINAL
  console.log('\n========== UPDATED SUMMARY ==========')
  const collections = await db.listCollections().toArray()
  for (const col of collections.sort((a,b)=>a.name.localeCompare(b.name))) {
    const count = await db.collection(col.name).countDocuments()
    if (count > 0) console.log(`  ${col.name}: ${count}`)
  }

  await mongoose.disconnect()
  console.log('\nFix migration complete!')
}

fix().catch(err => { console.error(err); process.exit(1) })
