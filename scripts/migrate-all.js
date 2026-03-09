import mongoose from 'mongoose'
import fs from 'fs'

const MONGO_URI = 'mongodb+srv://523:AAJfuYEce0N5elui@cluster0.dg7goyw.mongodb.net/?appName=Cluster0'
const SQL_FILE = 'E:/projcet/523/myairfee_8qvsun15.sql'

// Parse all INSERT statements for a given table
function parseInserts(sql, tableName) {
  // Match INSERT blocks - handle multiline VALUES
  const rows = []
  const insertRe = new RegExp('INSERT INTO `' + tableName + '`\\s*\\(([^)]+)\\)\\s*VALUES', 'g')
  let m
  while ((m = insertRe.exec(sql)) !== null) {
    const cols = m[1].replace(/`/g, '').split(',').map(c => c.trim())
    // Find the VALUES section until the semicolon
    let pos = m.index + m[0].length
    let depth = 0
    let inStr = false
    let escaped = false
    let tupleStart = -1

    for (let i = pos; i < sql.length; i++) {
      const ch = sql[i]
      if (escaped) { escaped = false; continue }
      if (ch === '\\') { escaped = true; continue }
      if (ch === "'" && !inStr) { inStr = true; continue }
      if (ch === "'" && inStr) {
        if (sql[i + 1] === "'") { i++; continue }
        inStr = false; continue
      }
      if (inStr) continue
      if (ch === '(') { if (depth === 0) tupleStart = i + 1; depth++ }
      if (ch === ')') {
        depth--
        if (depth === 0 && tupleStart > 0) {
          const raw = sql.substring(tupleStart, i)
          const vals = parseTuple(raw)
          const obj = {}
          cols.forEach((c, idx) => { obj[c] = vals[idx] !== undefined ? vals[idx] : '' })
          rows.push(obj)
          tupleStart = -1
        }
      }
      if (ch === ';' && depth === 0) break
    }
  }
  return rows
}

function parseTuple(raw) {
  const vals = []
  let val = ''
  let inStr = false
  let escaped = false
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i]
    if (escaped) { val += ch; escaped = false; continue }
    if (ch === '\\' && inStr) { escaped = true; continue }
    if (ch === "'" && !inStr) { inStr = true; continue }
    if (ch === "'" && inStr) {
      if (raw[i + 1] === "'") { val += "'"; i++; continue }
      inStr = false; continue
    }
    if (ch === ',' && !inStr) { vals.push(val.trim()); val = ''; continue }
    val += ch
  }
  vals.push(val.trim())
  return vals.map(v => v === 'NULL' ? null : v)
}

function validDate(d) {
  if (!d || d === 'NULL' || d === '0000-00-00 00:00:00' || d === '0000-00-00') return null
  const dt = new Date(d)
  return isNaN(dt.getTime()) ? null : dt
}

async function migrate() {
  console.log('Reading SQL file...')
  const sql = fs.readFileSync(SQL_FILE, 'utf-8')

  console.log('Connecting to MongoDB (database: 523)...')
  await mongoose.connect(MONGO_URI, { dbName: '523' })
  const db = mongoose.connection.db

  // ID mapping tables
  const typeIdMap = {}
  const productIdMap = {}
  const sizeIdMap = {}
  const companyIdMap = {}
  const userIdMap = {}
  const salesRepIdMap = {}
  const poIdMap = {}
  const invoiceIdMap = {}
  const eventIdMap = {}

  // ==========================================
  // 1. access_privileges -> privileges
  // ==========================================
  const privs = parseInserts(sql, 'access_privileges')
  console.log(`\naccess_privileges: ${privs.length} rows`)
  if (privs.length > 0) {
    await db.collection('privileges').deleteMany({})
    const docs = privs.map(p => ({
      name: p.access_privileges_name,
      key: p.access_privileges_key,
      description: p.access_privileges_desc || '',
      status: p.status === '1' ? 'active' : 'inactive',
    }))
    await db.collection('privileges').insertMany(docs)
    console.log(`  -> migrated ${docs.length} privileges`)
  }

  // ==========================================
  // 2. user_levels -> userlevels
  // ==========================================
  const levels = parseInserts(sql, 'user_levels')
  console.log(`\nuser_levels: ${levels.length} rows`)
  if (levels.length > 0) {
    await db.collection('userlevels').deleteMany({})
    const docs = levels.map(l => ({
      name: l.user_level_name || l.level_name || '',
      level: parseInt(l.user_level) || 0,
      description: l.user_level_desc || '',
      status: l.status === '1' ? 'active' : 'inactive',
    }))
    await db.collection('userlevels').insertMany(docs)
    console.log(`  -> migrated ${docs.length} user levels`)
  }

  // ==========================================
  // 3. user_master -> app_users
  // ==========================================
  const users = parseInserts(sql, 'user_master')
  console.log(`\nuser_master: ${users.length} rows`)
  if (users.length > 0) {
    await db.collection('app_users').deleteMany({})
    const docs = users.map(u => {
      const doc = {
        first_name: u.first_name || '',
        last_name: u.last_name || '',
        username: u.username || '',
        email: u.email || '',
        password: u.password || '',
        phone: u.phone || '',
        extension: u.extention || '',
        notes: u.user_notes || '',
        user_type: u.user_type || '',
        customer_code: u.user_cust_code || '',
        profile_image: u.profile_image || '',
        status: u.status === '1' ? 'active' : 'inactive',
        site_admin: u.site_admin === '1',
        created_at: validDate(u.created_on) || new Date(),
        updated_at: validDate(u.update_on) || new Date(),
        _oldId: parseInt(u.id_user_master)
      }
      return doc
    })
    const result = await db.collection('app_users').insertMany(docs)
    docs.forEach((d, i) => { userIdMap[d._oldId] = result.insertedIds[i] })
    await db.collection('app_users').updateMany({}, { $unset: { _oldId: 1 } })
    console.log(`  -> migrated ${docs.length} users`)
  }

  // ==========================================
  // 4. item_type -> itemtypes
  // ==========================================
  const itemTypes = parseInserts(sql, 'item_type')
  console.log(`\nitem_type: ${itemTypes.length} rows`)
  if (itemTypes.length > 0) {
    await db.collection('itemtypes').deleteMany({})
    const docs = itemTypes.map(t => ({
      name: t.item_type_name,
      description: '',
      icon: 'bi-box-seam',
      icon_bg: '#dbeafe',
      icon_color: '#1d4ed8',
      status: t.type_status === '1' ? 'active' : 'inactive',
      created_at: validDate(t.type_created_on) || new Date(),
      updated_at: validDate(t.type_modified_on) || new Date(),
      _oldId: parseInt(t.id_item_type)
    }))
    const result = await db.collection('itemtypes').insertMany(docs)
    docs.forEach((d, i) => { typeIdMap[d._oldId] = result.insertedIds[i] })
    await db.collection('itemtypes').updateMany({}, { $unset: { _oldId: 1 } })
    console.log(`  -> migrated ${docs.length} item types`)
  }

  // ==========================================
  // 5. product_item -> productitems
  // ==========================================
  const products = parseInserts(sql, 'product_item')
  console.log(`\nproduct_item: ${products.length} rows`)
  if (products.length > 0) {
    await db.collection('productitems').deleteMany({})
    const docs = products.map(p => ({
      name: p.item_name,
      item_type: typeIdMap[parseInt(p.id_item_type)] || null,
      unit_price: parseFloat(p.unit_price) || 0,
      base_price: parseFloat(p.base_price) || 0,
      notes: (p.prod_notes && p.prod_notes !== null) ? p.prod_notes : '',
      sort_order: parseInt(p.item_order) || 0,
      status: p.prod_status === '1' ? 'active' : 'inactive',
      created_at: validDate(p.prod_created_on) || new Date(),
      updated_at: validDate(p.prod_modified_on) || new Date(),
      _oldId: parseInt(p.id_product_item)
    }))
    const result = await db.collection('productitems').insertMany(docs)
    docs.forEach((d, i) => { productIdMap[d._oldId] = result.insertedIds[i] })
    await db.collection('productitems').updateMany({}, { $unset: { _oldId: 1 } })
    console.log(`  -> migrated ${docs.length} product items`)
  }

  // ==========================================
  // 6. item_size -> productsizes
  // ==========================================
  const sizes = parseInserts(sql, 'item_size')
  console.log(`\nitem_size: ${sizes.length} rows`)
  if (sizes.length > 0) {
    await db.collection('productsizes').deleteMany({})
    const docs = sizes.map((s, i) => ({
      name: s.size_name,
      code: s.size_code,
      sort_order: i + 1,
      status: s.size_status === '1' ? 'active' : 'inactive',
      created_at: new Date(),
      updated_at: new Date(),
      _oldId: parseInt(s.id_item_size)
    }))
    const result = await db.collection('productsizes').insertMany(docs)
    docs.forEach((d, i) => { sizeIdMap[d._oldId] = result.insertedIds[i] })
    await db.collection('productsizes').updateMany({}, { $unset: { _oldId: 1 } })
    console.log(`  -> migrated ${docs.length} product sizes`)
  }

  // ==========================================
  // 7. item_map -> itemsizemaps
  // ==========================================
  const itemMaps = parseInserts(sql, 'item_map')
  console.log(`\nitem_map: ${itemMaps.length} rows`)
  if (itemMaps.length > 0) {
    await db.collection('itemsizemaps').deleteMany({})
    const docs = itemMaps.filter(m => productIdMap[parseInt(m.item_id)] && sizeIdMap[parseInt(m.item_size_id)])
      .map(m => ({
        product_item: productIdMap[parseInt(m.item_id)],
        size: sizeIdMap[parseInt(m.item_size_id)],
        sku: m.item_SKU || '',
        status: m.item_map_status === '1' ? 'active' : 'inactive',
        created_at: validDate(m.item_map_created_on) || new Date(),
        updated_at: validDate(m.item_map_updated_on) || new Date(),
      }))
    if (docs.length > 0) await db.collection('itemsizemaps').insertMany(docs)
    const skipped = itemMaps.length - docs.length
    console.log(`  -> migrated ${docs.length} item size maps (${skipped} skipped)`)
  }

  // ==========================================
  // 8. group_productitems -> productgroups
  // ==========================================
  const groups = parseInserts(sql, 'group_productitems')
  console.log(`\ngroup_productitems: ${groups.length} rows`)
  if (groups.length > 0) {
    await db.collection('productgroups').deleteMany({})
    const docs = groups.map(g => {
      const prodIds = (g.product_items || '').split(',').map(id => productIdMap[parseInt(id)]).filter(Boolean)
      return {
        name: g.group_name || '',
        description: g.group_desc || '',
        products: prodIds,
        status: g.status === '1' ? 'active' : 'inactive',
        created_at: validDate(g.created_on) || new Date(),
        updated_at: validDate(g.modified_on) || new Date(),
      }
    })
    await db.collection('productgroups').insertMany(docs)
    console.log(`  -> migrated ${docs.length} product groups`)
  }

  // ==========================================
  // 9. company -> customers
  // ==========================================
  const companies = parseInserts(sql, 'company')
  console.log(`\ncompany: ${companies.length} rows`)
  if (companies.length > 0) {
    await db.collection('customers').deleteMany({})
    const docs = companies.map(c => ({
      company_name: c.company_name || '',
      customer_type: c.customer_type || '',
      contact: c.company_contact || '',
      phone: c.company_phone || '',
      extension: c.extention || '',
      email: c.company_email_address || '',
      customer_code: c.company_cust_code || '',
      notes: c.customer_notes || '',
      terms: c.cust_terms || '',
      fob: c.customer_FOB || '',
      ship_date: c.cust_ship_date || '',
      ship: c.cust_ship || '',
      ship_via: c.cust_ship_via || '',
      project: c.cust_project || '',
      send_due_email: c.send_duemail === '1',
      status: c.company_status === '1' ? 'active' : 'inactive',
      created_at: validDate(c.company_created_on) || new Date(),
      updated_at: validDate(c.company_modified_on) || new Date(),
      _oldId: parseInt(c.id_company)
    }))
    const result = await db.collection('customers').insertMany(docs)
    docs.forEach((d, i) => { companyIdMap[d._oldId] = result.insertedIds[i] })
    await db.collection('customers').updateMany({}, { $unset: { _oldId: 1 } })
    console.log(`  -> migrated ${docs.length} customers`)
  }

  // ==========================================
  // 10. company_address -> customer_addresses
  // ==========================================
  const compAddrs = parseInserts(sql, 'company_address')
  console.log(`\ncompany_address: ${compAddrs.length} rows`)
  if (compAddrs.length > 0) {
    await db.collection('customer_addresses').deleteMany({})
    const docs = compAddrs.map(a => ({
      customer: companyIdMap[parseInt(a.id_company)] || null,
      label: a.address_label || 'Address',
      street: a.street || '',
      city: a.city || '',
      state: a.state || '',
      zip: a.zip || '',
      country: a.country || 'United States',
      status: a.status === '1' ? 'active' : 'inactive',
    })).filter(d => d.customer)
    if (docs.length > 0) await db.collection('customer_addresses').insertMany(docs)
    console.log(`  -> migrated ${docs.length} customer addresses`)
  }

  // ==========================================
  // 11. company_contact -> customer_contacts
  // ==========================================
  const compContacts = parseInserts(sql, 'company_contact')
  console.log(`\ncompany_contact: ${compContacts.length} rows`)
  if (compContacts.length > 0) {
    await db.collection('customer_contacts').deleteMany({})
    const docs = compContacts.map(c => ({
      customer: companyIdMap[parseInt(c.id_company)] || null,
      name: c.contact_name || '',
      phone: c.contact_phone || '',
      extension: c.contact_ext || c.extention || '',
      email: c.contact_email || '',
      type: c.contact_type || '',
      status: c.status === '1' ? 'active' : 'inactive',
    })).filter(d => d.customer)
    if (docs.length > 0) await db.collection('customer_contacts').insertMany(docs)
    console.log(`  -> migrated ${docs.length} customer contacts`)
  }

  // ==========================================
  // 12. company_emails -> customer_emails
  // ==========================================
  const compEmails = parseInserts(sql, 'company_emails')
  console.log(`\ncompany_emails: ${compEmails.length} rows`)
  if (compEmails.length > 0) {
    await db.collection('customer_emails').deleteMany({})
    const docs = compEmails.map(e => ({
      customer: companyIdMap[parseInt(e.id_company)] || null,
      email: e.email_address || e.company_email || '',
      type: e.email_type || '',
      status: e.status === '1' ? 'active' : 'inactive',
    })).filter(d => d.customer)
    if (docs.length > 0) await db.collection('customer_emails').insertMany(docs)
    console.log(`  -> migrated ${docs.length} customer emails`)
  }

  // ==========================================
  // 13. cust_sales_rep_map -> customer_rep_maps
  // ==========================================
  const custRepMaps = parseInserts(sql, 'cust_sales_rep_map')
  console.log(`\ncust_sales_rep_map: ${custRepMaps.length} rows`)
  if (custRepMaps.length > 0) {
    await db.collection('customer_rep_maps').deleteMany({})
    const docs = custRepMaps.map(m => ({
      customer: companyIdMap[parseInt(m.id_company)] || null,
      sales_rep_old_id: parseInt(m.id_user_master) || 0,
      commission_rate: parseFloat(m.commission_rate || m.com_rate) || 0,
      status: m.status === '1' ? 'active' : 'inactive',
    })).filter(d => d.customer)
    if (docs.length > 0) await db.collection('customer_rep_maps').insertMany(docs)
    console.log(`  -> migrated ${docs.length} customer-rep maps`)
  }

  // ==========================================
  // 14. customer_type -> customer_types
  // ==========================================
  const custTypes = parseInserts(sql, 'customer_type')
  console.log(`\ncustomer_type: ${custTypes.length} rows`)
  if (custTypes.length > 0) {
    await db.collection('customer_types').deleteMany({})
    const docs = custTypes.map(t => ({
      name: t.customer_type_name || t.type_name || '',
      status: t.status === '1' ? 'active' : 'inactive',
    }))
    await db.collection('customer_types').insertMany(docs)
    console.log(`  -> migrated ${docs.length} customer types`)
  }

  // ==========================================
  // 15. purchase_order -> purchase_orders
  // ==========================================
  const orders = parseInserts(sql, 'purchase_order')
  console.log(`\npurchase_order: ${orders.length} rows`)
  if (orders.length > 0) {
    await db.collection('purchase_orders').deleteMany({})
    const docs = orders.map(o => ({
      po_number: o.po_number || '',
      customer: companyIdMap[parseInt(o.id_company)] || null,
      customer_old_id: parseInt(o.id_company) || 0,
      po_date: validDate(o.po_date) || null,
      ship_date: validDate(o.ship_date) || null,
      terms: o.terms || '',
      fob: o.fob || '',
      ship_via: o.ship_via || '',
      notes: o.po_notes || '',
      subtotal: parseFloat(o.subtotal) || 0,
      tax: parseFloat(o.tax) || 0,
      shipping: parseFloat(o.shipping) || 0,
      total: parseFloat(o.total) || 0,
      status: o.po_status === '1' ? 'active' : 'inactive',
      created_at: validDate(o.created_on) || new Date(),
      updated_at: validDate(o.modified_on) || new Date(),
      _oldId: parseInt(o.id_purchase_order)
    }))
    const result = await db.collection('purchase_orders').insertMany(docs)
    docs.forEach((d, i) => { poIdMap[d._oldId] = result.insertedIds[i] })
    await db.collection('purchase_orders').updateMany({}, { $unset: { _oldId: 1, customer_old_id: 1 } })
    console.log(`  -> migrated ${docs.length} purchase orders`)
  }

  // ==========================================
  // 16. po_item -> po_items
  // ==========================================
  const poItems = parseInserts(sql, 'po_item')
  console.log(`\npo_item: ${poItems.length} rows`)
  if (poItems.length > 0) {
    await db.collection('po_items').deleteMany({})
    const docs = poItems.map(p => ({
      purchase_order: poIdMap[parseInt(p.id_purchase_order)] || null,
      product_item: productIdMap[parseInt(p.id_product_item)] || null,
      quantity: parseInt(p.quantity || p.qty) || 0,
      unit_price: parseFloat(p.unit_price) || 0,
      total: parseFloat(p.total) || 0,
      status: (p.status === '1' || p.poi_status === '1') ? 'active' : 'inactive',
    })).filter(d => d.purchase_order)
    if (docs.length > 0) await db.collection('po_items').insertMany(docs)
    console.log(`  -> migrated ${docs.length} PO items`)
  }

  // ==========================================
  // 17. po_item_size -> po_item_sizes
  // ==========================================
  const poItemSizes = parseInserts(sql, 'po_item_size')
  console.log(`\npo_item_size: ${poItemSizes.length} rows`)
  if (poItemSizes.length > 0) {
    await db.collection('po_item_sizes').deleteMany({})
    const docs = poItemSizes.map(p => ({
      purchase_order_old_id: parseInt(p.id_purchase_order) || 0,
      product_item: productIdMap[parseInt(p.id_product_item)] || null,
      size: sizeIdMap[parseInt(p.id_item_size)] || null,
      quantity: parseInt(p.quantity || p.qty) || 0,
      status: p.status === '1' ? 'active' : 'inactive',
    }))
    await db.collection('po_item_sizes').insertMany(docs)
    console.log(`  -> migrated ${docs.length} PO item sizes`)
  }

  // ==========================================
  // 18. invoice_commission -> invoices
  // ==========================================
  const invoices = parseInserts(sql, 'invoice_commission')
  console.log(`\ninvoice_commission: ${invoices.length} rows`)
  if (invoices.length > 0) {
    await db.collection('invoices').deleteMany({})
    const docs = invoices.map(inv => ({
      invoice_number: inv.invoice_number || '',
      customer: companyIdMap[parseInt(inv.id_company)] || null,
      customer_old_id: parseInt(inv.id_company) || 0,
      invoice_date: validDate(inv.invoice_date) || null,
      due_date: validDate(inv.due_date) || null,
      subtotal: parseFloat(inv.subtotal) || 0,
      tax: parseFloat(inv.tax) || 0,
      total: parseFloat(inv.total) || 0,
      amount_paid: parseFloat(inv.amount_paid) || 0,
      balance: parseFloat(inv.balance) || 0,
      notes: inv.invoice_notes || '',
      status: inv.invoice_status === '1' ? 'active' : 'inactive',
      created_at: validDate(inv.created_on) || new Date(),
      updated_at: validDate(inv.modified_on) || new Date(),
      _oldId: parseInt(inv.id_invoice_commission)
    }))
    const result = await db.collection('invoices').insertMany(docs)
    docs.forEach((d, i) => { invoiceIdMap[d._oldId] = result.insertedIds[i] })
    await db.collection('invoices').updateMany({}, { $unset: { _oldId: 1, customer_old_id: 1 } })
    console.log(`  -> migrated ${docs.length} invoices`)
  }

  // ==========================================
  // 19. invoice_commission_details -> invoice_details
  // ==========================================
  const invDetails = parseInserts(sql, 'invoice_commission_details')
  console.log(`\ninvoice_commission_details: ${invDetails.length} rows`)
  if (invDetails.length > 0) {
    await db.collection('invoice_details').deleteMany({})
    const docs = invDetails.map(d => ({
      invoice: invoiceIdMap[parseInt(d.id_invoice_commission)] || null,
      invoice_old_id: parseInt(d.id_invoice_commission) || 0,
      product_item: productIdMap[parseInt(d.id_product_item)] || null,
      quantity: parseInt(d.quantity || d.qty) || 0,
      unit_price: parseFloat(d.unit_price) || 0,
      total: parseFloat(d.total) || 0,
      commission_rate: parseFloat(d.commission_rate || d.com_rate) || 0,
      commission_amount: parseFloat(d.commission_amount || d.com_amount) || 0,
    }))
    await db.collection('invoice_details').insertMany(docs)
    await db.collection('invoice_details').updateMany({}, { $unset: { invoice_old_id: 1 } })
    console.log(`  -> migrated ${docs.length} invoice details`)
  }

  // ==========================================
  // 20. invoice_commission_rep_details -> invoice_rep_details
  // ==========================================
  const invRepDetails = parseInserts(sql, 'invoice_commission_rep_details')
  console.log(`\ninvoice_commission_rep_details: ${invRepDetails.length} rows`)
  if (invRepDetails.length > 0) {
    await db.collection('invoice_rep_details').deleteMany({})
    const docs = invRepDetails.map(d => ({
      invoice: invoiceIdMap[parseInt(d.id_invoice_commission)] || null,
      sales_rep_old_id: parseInt(d.id_user_master) || 0,
      commission_rate: parseFloat(d.commission_rate || d.com_rate) || 0,
      commission_amount: parseFloat(d.commission_amount || d.com_amount) || 0,
      status: d.status === '1' ? 'active' : 'inactive',
    }))
    await db.collection('invoice_rep_details').insertMany(docs)
    console.log(`  -> migrated ${docs.length} invoice rep details`)
  }

  // ==========================================
  // 21. invoice_payment -> invoice_payments
  // ==========================================
  const invPayments = parseInserts(sql, 'invoice_payment')
  console.log(`\ninvoice_payment: ${invPayments.length} rows`)
  if (invPayments.length > 0) {
    await db.collection('invoice_payments').deleteMany({})
    const docs = invPayments.map(p => ({
      invoice: invoiceIdMap[parseInt(p.id_invoice_commission)] || null,
      amount: parseFloat(p.amount || p.payment_amount) || 0,
      payment_date: validDate(p.payment_date) || null,
      payment_method: p.payment_method || '',
      notes: p.payment_notes || p.notes || '',
      status: p.status === '1' ? 'active' : 'inactive',
      created_at: validDate(p.created_on) || new Date(),
    }))
    await db.collection('invoice_payments').insertMany(docs)
    console.log(`  -> migrated ${docs.length} invoice payments`)
  }

  // ==========================================
  // 22. events -> events
  // ==========================================
  const events = parseInserts(sql, 'events')
  console.log(`\nevents: ${events.length} rows`)
  if (events.length > 0) {
    await db.collection('events').deleteMany({})
    const docs = events.map(e => ({
      name: e.event_name || '',
      description: e.event_desc || '',
      location: e.event_location || '',
      start_date: validDate(e.start_date || e.event_start) || null,
      end_date: validDate(e.end_date || e.event_end) || null,
      status: e.event_status === '1' ? 'active' : 'inactive',
      created_at: validDate(e.created_on) || new Date(),
      _oldId: parseInt(e.id_event || e.id_events)
    }))
    const result = await db.collection('events').insertMany(docs)
    docs.forEach((d, i) => { eventIdMap[d._oldId] = result.insertedIds[i] })
    await db.collection('events').updateMany({}, { $unset: { _oldId: 1 } })
    console.log(`  -> migrated ${docs.length} events`)
  }

  // ==========================================
  // 23. event_types -> event_types
  // ==========================================
  const eventTypes = parseInserts(sql, 'event_types')
  console.log(`\nevent_types: ${eventTypes.length} rows`)
  if (eventTypes.length > 0) {
    await db.collection('event_types').deleteMany({})
    const docs = eventTypes.map(t => ({
      name: t.event_type_name || t.type_name || '',
      status: t.status === '1' ? 'active' : 'inactive',
    }))
    await db.collection('event_types').insertMany(docs)
    console.log(`  -> migrated ${docs.length} event types`)
  }

  // ==========================================
  // 24. suppliers -> suppliers
  // ==========================================
  const suppliers = parseInserts(sql, 'suppliers')
  console.log(`\nsuppliers: ${suppliers.length} rows`)
  if (suppliers.length > 0) {
    await db.collection('suppliers').deleteMany({})
    const docs = suppliers.map(s => ({
      name: s.supplier_name || '',
      contact: s.supplier_contact || '',
      phone: s.supplier_phone || '',
      email: s.supplier_email || '',
      notes: s.supplier_notes || '',
      status: s.supplier_status === '1' ? 'active' : 'inactive',
      created_at: validDate(s.created_on) || new Date(),
    }))
    await db.collection('suppliers').insertMany(docs)
    console.log(`  -> migrated ${docs.length} suppliers`)
  }

  // ==========================================
  // 25. terms -> terms
  // ==========================================
  const terms = parseInserts(sql, 'terms')
  console.log(`\nterms: ${terms.length} rows`)
  if (terms.length > 0) {
    await db.collection('terms').deleteMany({})
    const docs = terms.map(t => ({
      name: t.terms_name || t.term_name || '',
      days: parseInt(t.terms_days || t.days) || 0,
      status: t.status === '1' ? 'active' : 'inactive',
    }))
    await db.collection('terms').insertMany(docs)
    console.log(`  -> migrated ${docs.length} terms`)
  }

  // ==========================================
  // 26. sales_tax_rates -> tax_rates
  // ==========================================
  const taxRates = parseInserts(sql, 'sales_tax_rates')
  console.log(`\nsales_tax_rates: ${taxRates.length} rows`)
  if (taxRates.length > 0) {
    await db.collection('tax_rates').deleteMany({})
    const docs = taxRates.map(t => ({
      name: t.tax_name || '',
      rate: parseFloat(t.tax_rate || t.rate) || 0,
      state: t.state || '',
      status: t.status === '1' ? 'active' : 'inactive',
    }))
    await db.collection('tax_rates').insertMany(docs)
    console.log(`  -> migrated ${docs.length} tax rates`)
  }

  // ==========================================
  // 27. email_templates -> email_templates
  // ==========================================
  const emailTpls = parseInserts(sql, 'email_templates')
  console.log(`\nemail_templates: ${emailTpls.length} rows`)
  if (emailTpls.length > 0) {
    await db.collection('email_templates').deleteMany({})
    const docs = emailTpls.map(t => ({
      name: t.template_name || t.name || '',
      subject: t.subject || '',
      body: t.body || t.template_body || '',
      status: t.status === '1' ? 'active' : 'inactive',
    }))
    await db.collection('email_templates').insertMany(docs)
    console.log(`  -> migrated ${docs.length} email templates`)
  }

  // ==========================================
  // 28. po_item_total -> po_item_totals (raw)
  // ==========================================
  const poTotals = parseInserts(sql, 'po_item_total')
  console.log(`\npo_item_total: ${poTotals.length} rows`)
  if (poTotals.length > 0) {
    await db.collection('po_item_totals').deleteMany({})
    await db.collection('po_item_totals').insertMany(poTotals.map(r => {
      const doc = {}
      Object.keys(r).forEach(k => {
        const v = r[k]
        doc[k] = (v && !isNaN(v) && k !== 'id_po_item_total') ? parseFloat(v) : v
      })
      return doc
    }))
    console.log(`  -> migrated ${poTotals.length} PO item totals`)
  }

  // ==========================================
  // 29. invoice_commission_item_details -> invoice_item_details (raw)
  // ==========================================
  const invItemDetails = parseInserts(sql, 'invoice_commission_item_details')
  console.log(`\ninvoice_commission_item_details: ${invItemDetails.length} rows`)
  if (invItemDetails.length > 0) {
    await db.collection('invoice_item_details').deleteMany({})
    await db.collection('invoice_item_details').insertMany(invItemDetails)
    console.log(`  -> migrated ${invItemDetails.length} invoice item details`)
  }

  // ==========================================
  // 30. cost_info -> cost_info
  // ==========================================
  const costs = parseInserts(sql, 'cost_info')
  console.log(`\ncost_info: ${costs.length} rows`)
  if (costs.length > 0) {
    await db.collection('cost_info').deleteMany({})
    await db.collection('cost_info').insertMany(costs)
    console.log(`  -> migrated ${costs.length} cost info records`)
  }

  // ==========================================
  // 31. Address -> address_settings
  // ==========================================
  const addresses = parseInserts(sql, 'Address')
  console.log(`\nAddress: ${addresses.length} rows`)
  if (addresses.length > 0) {
    await db.collection('address_settings').deleteMany({})
    await db.collection('address_settings').insertMany(addresses)
    console.log(`  -> migrated ${addresses.length} address records`)
  }

  // ==========================================
  // 32. product_style -> product_styles
  // ==========================================
  const styles = parseInserts(sql, 'product_style')
  console.log(`\nproduct_style: ${styles.length} rows`)
  if (styles.length > 0) {
    await db.collection('product_styles').deleteMany({})
    await db.collection('product_styles').insertMany(styles)
    console.log(`  -> migrated ${styles.length} product styles`)
  }

  // ==========================================
  // FINAL SUMMARY
  // ==========================================
  console.log('\n========== MIGRATION SUMMARY ==========')
  const collections = await db.listCollections().toArray()
  for (const col of collections.sort((a, b) => a.name.localeCompare(b.name))) {
    const count = await db.collection(col.name).countDocuments()
    console.log(`  ${col.name}: ${count} docs`)
  }

  await mongoose.disconnect()
  console.log('\nMigration complete!')
}

migrate().catch(err => { console.error(err); process.exit(1) })
