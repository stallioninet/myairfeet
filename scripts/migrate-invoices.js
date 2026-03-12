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

function validDate(str) {
  if (!str || str === '0000-00-00' || str === '0000-00-00 00:00:00') return null
  const d = new Date(str)
  return isNaN(d.getTime()) ? null : d
}

async function main() {
  await mongoose.connect(MONGO_URI, { dbName: '523' })
  console.log('Connected to MongoDB')

  const sql = fs.readFileSync(SQL_FILE, 'utf-8')
  const db = mongoose.connection.db

  // 1. Migrate purchase_order -> invoices
  console.log('\n--- Migrating purchase_order -> invoices ---')
  const orders = parseInserts(sql, 'purchase_order')
  console.log(`Found ${orders.length} purchase_order records`)

  if (orders.length > 0) {
    await db.collection('invoices').drop().catch(() => {})
    const docs = orders.map(o => ({
      legacy_id: parseInt(o.id_purchase_order) || 0,
      company_id: parseInt(o.company_id) || 0,
      invoice_number: (o.invoice_number || '').trim(),
      invoice_date: validDate(o.invoice_date),
      po_number: (o.po_number || '').trim(),
      po_date: validDate(o.po_date),
      due_date: validDate(o.paymentdue_date),
      total_qty: parseInt(o.po_total_qty) || 0,
      net_amount: parseFloat(o.po_net_amount) || 0,
      shipping_costs: parseFloat(o.shipping_costs) || 0,
      sales_tax_amount: parseFloat(o.sales_tax_amount) || 0,
      paid_value: (o.paid_value || '').trim(),
      paid_date: (o.paid_date || '').trim(),
      po_notes: (o.po_notes || '').trim(),
      project: (o.project || '').trim(),
      shipped_date: validDate(o.shippied_date),
      tracking_no: (o.tracking_no || '').trim(),
      inv_status: (o.inv_status || '').trim(),
      po_status: parseInt(o.po_status) || 0,
      billing_address: (o.billing_address || '').trim(),
      shipping_address: (o.shipping_address || '').trim(),
      shipping_contact_info: (o.shipping_contact_info || '').trim(),
      shipinfo_notes: (o.shipinfo_notes || '').trim(),
      airfeet_notes: (o.airfeet_notes || '').trim(),
      sales_tax_type: (o.sales_tax_type || '').trim(),
      sales_tax_percentage: parseFloat(o.sales_tax_percentage) || 0,
      charge_ccard: (o.charge_ccard || '').trim(),
      cc_per: parseFloat(o.cc_per) || 0,
      cc_amt: parseFloat(o.cc_amt) || 0,
      drop_ship_check: (o.drop_ship_check || '').trim(),
      drop_company_name: (o.drop_company_name || '').trim(),
      cust_terms: (o.cust_terms || '').trim(),
      customer_FOB: (o.customer_FOB || '').trim(),
      cust_ship: (o.cust_ship || '').trim(),
      cust_ship_via: (o.cust_ship_via || '').trim(),
      cust_project: (o.cust_project || '').trim(),
      created_by: parseInt(o.po_created_by) || 0,
      created_at: validDate(o.po_created_on) || new Date(),
      updated_at: validDate(o.po_modified_on) || new Date(),
    }))
    await db.collection('invoices').insertMany(docs)
    console.log(`Inserted ${docs.length} invoices`)

    const active = docs.filter(d => d.po_status === 1).length
    console.log(`Active (status=1): ${active}, Total: ${docs.length}`)
  }

  // 2. Migrate invoice_commission_details -> invoice_commissions
  console.log('\n--- Migrating invoice_commission_details -> invoice_commissions ---')
  const commDetails = parseInserts(sql, 'invoice_commission_details')
  console.log(`Found ${commDetails.length} invoice_commission_details records`)

  if (commDetails.length > 0) {
    await db.collection('invoice_commissions').drop().catch(() => {})
    const docs = commDetails.map(c => ({
      legacy_id: parseInt(c.id_inv_com_details) || 0,
      po_id: parseInt(c.po_id) || 0,
      sales_rep_id: parseInt(c.sales_rep_id) || 0,
      total_price: parseFloat(c.total_price) || 0,
      commission_percentage: (c.total_price_percentage || '').trim(),
      commission_dollar: (c.total_price_dollar || '').trim(),
      status: parseInt(c.inv_com_status) || 0,
      created_at: validDate(c.inv_com_created_on) || new Date(),
    }))
    await db.collection('invoice_commissions').insertMany(docs)
    console.log(`Inserted ${docs.length} invoice_commissions`)
  }

  // 3. Migrate invoice_commission (summary) -> invoice_commission_summary
  console.log('\n--- Migrating invoice_commission -> invoice_commission_summary ---')
  const commSummary = parseInserts(sql, 'invoice_commission')
  console.log(`Found ${commSummary.length} invoice_commission records`)

  if (commSummary.length > 0) {
    await db.collection('invoice_commission_summary').drop().catch(() => {})
    const docs = commSummary.map(c => ({
      legacy_id: parseInt(c.id_inv_com) || 0,
      po_id: parseInt(c.po_id) || 0,
      company_ids: (c.company_ids || '').trim(),
      total_commission: parseFloat(c.total_commission) || 0,
      commission_paid_status: parseInt(c.commission_paid_status) || 0,
      comm_paid_date: validDate(c.comm_paid_date),
      total_commission_percentage: (c.total_commission_percentage || '').trim(),
      total_commission_dollar: (c.total_commission_dollar || '').trim(),
      status: parseInt(c.comm_status) || 0,
      created_at: validDate(c.comm_created_on) || new Date(),
    }))
    await db.collection('invoice_commission_summary').insertMany(docs)
    console.log(`Inserted ${docs.length} invoice_commission_summary`)
  }

  // 4. Migrate invoice_check_details -> invoice_payments
  console.log('\n--- Migrating invoice_check_details -> invoice_payments ---')
  const checks = parseInserts(sql, 'invoice_check_details')
  console.log(`Found ${checks.length} invoice_check_details records`)

  if (checks.length > 0) {
    await db.collection('invoice_payments').drop().catch(() => {})
    const docs = checks.map(c => ({
      legacy_id: parseInt(c.id_invoice_check_details) || 0,
      company_id: parseInt(c.company_id) || 0,
      po_id: parseInt(c.po_id) || 0,
      check_number: (c.check_number || '').trim(),
      check_date: validDate(c.check_date),
      check_amount: parseFloat(c.check_amount) || 0,
      status: parseInt(c.check_status) || 0,
    }))
    await db.collection('invoice_payments').insertMany(docs)
    console.log(`Inserted ${docs.length} invoice_payments`)
  }

  // 5. Migrate invoice_payment -> commission_payments
  console.log('\n--- Migrating invoice_payment -> commission_payments ---')
  const commPayments = parseInserts(sql, 'invoice_payment')
  console.log(`Found ${commPayments.length} invoice_payment records`)

  if (commPayments.length > 0) {
    await db.collection('commission_payments').drop().catch(() => {})
    const docs = commPayments.map(c => ({
      legacy_id: parseInt(c.id_invoice_payment) || 0,
      po_id: parseInt(c.po_id) || 0,
      inv_com_id: parseInt(c.inv_com_id) || 0,
      commission_paid_date: validDate(c.commission_paid_date),
      compaid_mode: (c.compaid_mode || '').trim(),
      partial_com_total: parseFloat(c.partial_com_total) || 0,
      received_date: validDate(c.received_date),
      received_amt: parseFloat(c.received_amt) || 0,
      status: parseInt(c.inv_payment_status) || 0,
      created_at: validDate(c.inv_paymen_created_on) || new Date(),
    }))
    await db.collection('commission_payments').insertMany(docs)
    console.log(`Inserted ${docs.length} commission_payments`)
  }

  // 6. Migrate po_item -> po_items
  console.log('\n--- Migrating po_item -> po_items ---')
  const poItems = parseInserts(sql, 'po_item')
  console.log(`Found ${poItems.length} po_item records`)

  if (poItems.length > 0) {
    await db.collection('po_items').drop().catch(() => {})
    const docs = poItems.map(p => ({
      legacy_id: parseInt(p.id_po_item) || 0,
      po_id: parseInt(p.po_id) || 0,
      item_id: parseInt(p.item_id) || 0,
      item_name: (p.po_item_name || '').trim(),
      item_type_id: parseInt(p.item_type_id) || 0,
      unit_cost: parseFloat(p.item_unit_cost) || 0,
      qty: parseInt(p.item_qty) || 0,
      bo_option: (p.bo_option || '').trim(),
      total: parseFloat(p.item_total) || 0,
      status: parseInt(p.po_item_status) || 0,
      created_at: validDate(p.po_item_created_on) || new Date(),
      updated_at: validDate(p.po_item_modified_on) || new Date(),
    }))
    await db.collection('po_items').insertMany(docs)
    console.log(`Inserted ${docs.length} po_items`)
  }

  // 7. Migrate airfeet_part_desc -> po_item_descriptions
  console.log('\n--- Migrating airfeet_part_desc -> po_item_descriptions ---')
  const partDescs = parseInserts(sql, 'airfeet_part_desc')
  console.log(`Found ${partDescs.length} airfeet_part_desc records`)

  if (partDescs.length > 0) {
    await db.collection('po_item_descriptions').drop().catch(() => {})
    const docs = partDescs.map(p => ({
      legacy_id: parseInt(p.pd_id) || 0,
      po_id: parseInt(p.po_id) || 0,
      item_with_desc: (p.item_with_desc || '').trim(),
      uom: (p.uom || '').trim(),
      unit_cost: parseFloat(p.unit_cost) || 0,
      qty: parseInt(p.qty) || 0,
      total: parseFloat(p.total) || 0,
      status: parseInt(p.po_item_status) || 0,
    }))
    await db.collection('po_item_descriptions').insertMany(docs)
    console.log(`Inserted ${docs.length} po_item_descriptions`)
  }

  // 8. Migrate po_item_size -> po_item_sizes_detail
  console.log('\n--- Migrating po_item_size -> po_item_sizes_detail ---')
  const poItemSizes = parseInserts(sql, 'po_item_size')
  console.log(`Found ${poItemSizes.length} po_item_size records`)

  if (poItemSizes.length > 0) {
    await db.collection('po_item_sizes_detail').drop().catch(() => {})
    const docs = poItemSizes.map(p => ({
      legacy_id: parseInt(p.id_po_item_size) || 0,
      po_id: parseInt(p.po_id) || 0,
      po_item_id: parseInt(p.pk_id_po_item) || 0,
      item_id: parseInt(p.item_id) || 0,
      size_name: (p.size_name || '').trim(),
      item_sku: (p.item_sku || '').trim(),
      inv_item_name: (p.inv_item_name || '').trim(),
      item_size_name: (p.item_size_name || '').trim(),
      qty: parseInt(p.size_qty) || 0,
      unit_cost: parseFloat(p.item_unit_cost) || 0,
      bo_option: (p.bo_option || '').trim(),
    }))
    await db.collection('po_item_sizes_detail').insertMany(docs)
    console.log(`Inserted ${docs.length} po_item_sizes_detail`)
  }

  await mongoose.disconnect()
  console.log('\nDone!')
}

main().catch(err => { console.error(err); process.exit(1) })
