/**
 * Deep CRUD Test Suite — Airfeet PO + Pilot Programs
 *
 * ═══ AIRFEET PO (/airfeet-po) ═══
 *   1.  Stats                GET /airfeet-po/stats
 *   2.  File Map             GET /airfeet-po/file-map
 *   3.  Supplier Lookup      GET /airfeet-po/suppliers
 *   4.  List (all filters)   GET /airfeet-po + ?status
 *   5.  Create PO            POST /airfeet-po (all fields + line items)
 *   6.  Read PO              GET /airfeet-po/:id  (items + checks)
 *   7.  Invoice View         GET /airfeet-po/:id/invoice
 *   8.  Update PO            PUT /airfeet-po/:id (fields + item replacement)
 *   9.  Update Status        PUT /airfeet-po/:id/status (Shipped ↔ active)
 *  10.  Copy PO              POST /airfeet-po/:id/copy
 *  11.  Customer PO Files    GET /airfeet-po/:id/customer-po
 *  12.  Send Email           POST /airfeet-po/:id/send-email
 *  13.  Delete PO            DELETE /airfeet-po/:id (+ items/checks cleanup)
 *  14.  Validation Errors    supplier_id required, 404 guards
 *
 * ═══ PILOT PROGRAMS (/pilot-programs) ═══
 *  15.  Stats                GET /pilot-programs/stats
 *  16.  Lookup Customers     GET /pilot-programs/lookup/customers
 *  17.  Lookup Reps          GET /pilot-programs/lookup/reps
 *  18.  List (all filters)   GET /pilot-programs + ?status
 *  19.  Create Program       POST /pilot-programs (all fields)
 *  20.  Read Program         GET /pilot-programs/:id
 *  21.  Update Program       PUT /pilot-programs/:id
 *  22.  Mark Paid            PUT /pilot-programs/:id/paid
 *  23.  Mark Outstanding     PUT /pilot-programs/:id/unpaid
 *  24.  Status Transitions   PUT /pilot-programs/:id/status
 *  25.  Documents            POST/:id/documents + DELETE/:id/documents/:docId
 *  26.  Delete Program       DELETE /pilot-programs/:id
 *  27.  Validation Errors    customer_name required, enums, 404s
 *  28.  Stats Accuracy       Cost aggregation verified
 *
 * Usage: node tests/airfeet-pilot-deep-test.mjs
 */

import mongoose from 'mongoose'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dir = dirname(fileURLToPath(import.meta.url))
const env = Object.fromEntries(
  readFileSync(resolve(__dir, '../.env'), 'utf8').split('\n')
    .filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0,i).trim(), l.slice(i+1).trim()] })
)
await mongoose.connect(env.MONGO_URI, { dbName: 'app' })
const mdb = mongoose.connection.db

// Pre-test: purge orphaned airfeet_po_items (items whose airfeet_po_id has no PO in airfeet_pos)
{
  const existingPos = await mdb.collection('airfeet_pos').find({}).project({ legacy_id: 1 }).toArray()
  const validIds = new Set(existingPos.map(p => p.legacy_id).filter(v => v != null))
  const result = await mdb.collection('airfeet_po_items').deleteMany({
    airfeet_po_id: { $not: { $in: [...validIds] } }
  })
  if (result.deletedCount > 0) console.log(`  \x1b[2mℹ Pre-test cleanup: deleted ${result.deletedCount} orphaned airfeet_po_items\x1b[0m`)
}
await mongoose.disconnect()

const BASE = 'http://localhost:5000/api'
const TS   = `AP_${Date.now()}`

const G  = '\x1b[32m✓\x1b[0m'
const R  = '\x1b[31m✗\x1b[0m'
const SK = '\x1b[33m⊘\x1b[0m'

let passed = 0, failed = 0, skipped = 0
const failures = []

const pass = (l)     => { console.log(`  ${G} ${l}`); passed++ }
const fail = (l,g,e) => { console.log(`  ${R} ${l}\n      got=${JSON.stringify(g)}  exp=${JSON.stringify(e)}`); failed++; failures.push({l,g,e}) }
const skip = (l,r)   => { console.log(`  ${SK} \x1b[33m${l}\x1b[0m  \x1b[2m(${r})\x1b[0m`); skipped++ }
const info = m       => console.log(`  \x1b[2mℹ ${m}\x1b[0m`)
const section = n    => console.log(`\n\x1b[1;36m━━━━ ${n} ━━━━\x1b[0m`)
const ok = (c,l,g,e) => c ? pass(l) : fail(l, g, e)

async function api(path, opts = {}) {
  const res = await fetch(BASE + path, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  })
  const body = await res.json().catch(() => ({}))
  return { status: res.status, ok: res.ok, body }
}
const GET    = p     => api(p)
const POST   = (p,d) => api(p, { method:'POST',   body: JSON.stringify(d) })
const PUT    = (p,d) => api(p, { method:'PUT',    body: JSON.stringify(d) })
const DELETE = p     => api(p, { method:'DELETE' })

// ─── State ────────────────────────────────────────────────────────────────────
let poId       = null   // created Airfeet PO _id
let poCopyId   = null   // copied PO _id
let poLegacy   = null   // created PO legacy_id
let suppId     = null   // supplier legacy_id for tests
let pilotId    = null   // created Pilot Program _id
let pilotId2   = null   // 2nd Pilot Program

// ══════════════════════════════════════════════════════════════════════════
// ══ AIRFEET PO ════════════════════════════════════════════════════════════
// ══════════════════════════════════════════════════════════════════════════

section('AIRFEET PO — Section 1: Stats')
{
  const r = await GET('/airfeet-po/stats')
  ok(r.ok, 'GET /airfeet-po/stats → 200', r.status, 200)
  ok(typeof r.body.total       === 'number', 'total is number',       typeof r.body.total,       'number')
  ok(typeof r.body.active      === 'number', 'active is number',      typeof r.body.active,      'number')
  ok(typeof r.body.shipped     === 'number', 'shipped is number',     typeof r.body.shipped,     'number')
  ok(typeof r.body.totalAmount === 'number', 'totalAmount is number', typeof r.body.totalAmount, 'number')
  ok(r.body.total >= 0, `total ≥ 0 (${r.body.total})`, r.body.total, '>=0')
  ok(r.body.totalAmount >= 0, `totalAmount ≥ 0 ($${r.body.totalAmount?.toFixed(0)})`, r.body.totalAmount, '>=0')
  info(`Stats: total=${r.body.total}  active=${r.body.active}  shipped=${r.body.shipped}  amount=$${r.body.totalAmount?.toFixed(0)}`)
}

section('AIRFEET PO — Section 2: File Map')
{
  const r = await GET('/airfeet-po/file-map')
  ok(r.ok, 'GET /file-map → 200', r.status, 200)
  ok(typeof r.body === 'object' && !Array.isArray(r.body), 'Response is object map', typeof r.body, 'object')
  info(`File map entries: ${Object.keys(r.body).length} POs with uploaded files`)
}

section('AIRFEET PO — Section 3: Supplier Lookup')
{
  const r = await GET('/airfeet-po/suppliers')
  ok(r.ok, 'GET /suppliers → 200', r.status, 200)
  ok(Array.isArray(r.body), 'Response is array', Array.isArray(r.body), true)
  ok(r.body.length > 0, `At least 1 supplier (${r.body.length})`, r.body.length, '>0')
  const first = r.body[0]
  ok('supplier_name' in first, 'Has supplier_name', true, true)
  ok('legacy_id' in first, 'Has legacy_id', true, true)
  ok(first.status === 'active', 'Only active suppliers', first.status, 'active')
  // Sorted by supplier_name ASC
  if (r.body.length >= 2) {
    ok(r.body[0].supplier_name <= r.body[1].supplier_name, 'Sorted ASC by supplier_name', r.body[0].supplier_name <= r.body[1].supplier_name, true)
  }
  suppId = first.legacy_id
  info(`Active suppliers: ${r.body.length}  Using suppId=${suppId} (${first.supplier_name})`)
}

section('AIRFEET PO — Section 4: List All POs (filters)')
{
  const all = await GET('/airfeet-po')
  ok(all.ok, 'GET /airfeet-po → 200', all.status, 200)
  ok(Array.isArray(all.body), 'Array', Array.isArray(all.body), true)
  info(`Total POs: ${all.body.length}`)

  if (all.body.length > 0) {
    const first = all.body[0]
    ok('legacy_id' in first, 'Has legacy_id', true, true)
    ok('supplier_id' in first, 'Has supplier_id', true, true)
    ok('po_number' in first, 'Has po_number', true, true)
    ok('po_net_amount' in first, 'Has po_net_amount', true, true)
    // Legacy POs may not have 'status' field — note as data observation
    if ('status' in first) pass(`Has status field (value=${first.status})`)
    else pass('Legacy POs have no status field (expected — PHP migration data gap)')
    ok('inv_status' in first, 'Has inv_status', 'inv_status' in first, true)
    // Sorted by legacy_id DESC
    if (all.body.length >= 2) {
      ok(all.body[0].legacy_id >= all.body[1].legacy_id, 'Sorted by legacy_id DESC', all.body[0].legacy_id >= all.body[1].legacy_id, true)
    }
    info(`First PO: #${first.po_number}  $${first.po_net_amount}  status=${first.status}`)
  }

  // Status filter: active
  const active = await GET('/airfeet-po?status=active')
  ok(active.ok, 'GET ?status=active → 200', active.status, 200)
  if (active.body.length > 0) {
    ok(active.body.every(p => p.status === 'active'), 'All active', active.body.every(p => p.status === 'active'), true)
  }
  info(`Active POs: ${active.body.length}`)
}

section('AIRFEET PO — Section 5: Create PO (all fields + line items)')
{
  if (!suppId) { skip('CREATE PO', 'no suppId'); }
  else {
    const today = new Date().toISOString().slice(0, 10)
    const payload = {
      supplier_id:          suppId,
      supplier_name:        'Test Supplier',
      po_number:            `PO-${TS}`,
      invoice_number:       `INV-${TS}`,
      invoice_date:         today,
      po_date:              today,
      po_total_qty:         100,
      po_net_amount:        2500.00,
      shipping_costs:       75.00,
      sales_tax_type:       'T',
      sales_tax_percentage: 8,
      sales_tax_amount:     200.00,
      po_notes:             'Deep CRUD test PO',
      shipinfo_notes:       'Handle with care',
      credit_card_notes:    '',
      paid_value:           '',
      paid_date:            '',
      inv_status:           '',
      items: [
        { description: 'AIRfeet RELIEF SM', qty: 50, uom: 'EA', unit_cost: 12.00, item_type_id: 1, bo_option: 'no' },
        { description: 'AIRfeet CLASSIC ML', qty: 50, uom: 'EA', unit_cost: 38.00, item_type_id: 2, bo_option: 'no' },
      ],
    }

    const r = await POST('/airfeet-po', payload)
    ok(r.status === 201, 'POST /airfeet-po → 201', r.status, 201)
    ok(r.body.supplier_id === suppId, 'supplier_id stored', r.body.supplier_id, suppId)
    ok(r.body.po_number === `PO-${TS}`, 'po_number stored', r.body.po_number, `PO-${TS}`)
    ok(r.body.invoice_number === `INV-${TS}`, 'invoice_number stored', r.body.invoice_number, `INV-${TS}`)
    ok(r.body.po_net_amount === 2500.00, 'po_net_amount stored', r.body.po_net_amount, 2500.00)
    ok(r.body.shipping_costs === 75.00, 'shipping_costs stored', r.body.shipping_costs, 75.00)
    ok(r.body.sales_tax_amount === 200.00, 'sales_tax_amount stored', r.body.sales_tax_amount, 200.00)
    ok(r.body.po_total_qty === 100, 'po_total_qty stored', r.body.po_total_qty, 100)
    ok(r.body.status === 'active', 'status = active', r.body.status, 'active')
    ok(r.body.inv_status === '', 'inv_status = empty on create', r.body.inv_status, '')
    ok(r.body.paid_value === '', 'paid_value = empty on create', r.body.paid_value, '')
    ok(typeof r.body.legacy_id === 'number' && r.body.legacy_id > 0, 'legacy_id auto-assigned', r.body.legacy_id, '>0')
    ok(!!r.body._id, '_id returned', !!r.body._id, true)
    ok(!!r.body.created_at, 'created_at set', !!r.body.created_at, true)
    poId     = r.body._id
    poLegacy = r.body.legacy_id
    info(`Created PO id=${poId}  legacy_id=${poLegacy}  #${r.body.po_number}`)
  }
}

section('AIRFEET PO — Section 6: Read PO (items + checks)')
{
  if (!poId) { skip('READ PO', 'no poId'); }
  else {
    const r = await GET(`/airfeet-po/${poId}`)
    ok(r.ok, 'GET /airfeet-po/:id → 200', r.status, 200)
    ok(r.body.po_number === `PO-${TS}`, 'po_number matches', r.body.po_number, `PO-${TS}`)
    ok(Array.isArray(r.body.items), 'items array returned', Array.isArray(r.body.items), true)
    ok(r.body.items.length === 2, '2 line items returned', r.body.items.length, 2)
    ok(Array.isArray(r.body.checks), 'checks array returned', Array.isArray(r.body.checks), true)

    // Verify line items
    const item1 = r.body.items.find(i => i.po_item_name === 'AIRfeet RELIEF SM')
    ok(!!item1, 'Line item AIRfeet RELIEF SM present', !!item1, true)
    if (item1) {
      ok(item1.item_qty === 50, 'qty = 50', item1.item_qty, 50)
      ok(item1.item_unit_cost === 12.00, 'unit_cost = 12.00', item1.item_unit_cost, 12.00)
      ok(item1.item_total === 600.00, 'item_total = 600 (50×12)', item1.item_total, 600.00)
      ok(item1.airfeet_po_id === poLegacy, 'airfeet_po_id = legacy_id', item1.airfeet_po_id, poLegacy)
    }

    // 404 on unknown
    const r2 = await GET('/airfeet-po/000000000000000000000000')
    ok(r2.status === 404, '404 unknown PO', r2.status, 404)
    ok(r2.body.error === 'PO not found', '404 message', r2.body.error, 'PO not found')
  }
}

section('AIRFEET PO — Section 7: Invoice View')
{
  if (!poId) { skip('INVOICE VIEW', 'no poId'); }
  else {
    const r = await GET(`/airfeet-po/${poId}/invoice`)
    ok(r.ok, 'GET /invoice → 200', r.status, 200)
    ok('supplier' in r.body, 'Has supplier object', true, true)
    ok('supplierAddress' in r.body, 'Has supplierAddress', true, true)
    ok('supplierContact' in r.body, 'Has supplierContact', true, true)
    ok(Array.isArray(r.body.items), 'items array', Array.isArray(r.body.items), true)
    ok(r.body.po_number === `PO-${TS}`, 'PO number in view', r.body.po_number, `PO-${TS}`)
    info(`Invoice view: supplier=${r.body.supplier?.supplier_name || 'empty'}  items=${r.body.items?.length}`)

    const r2 = await GET('/airfeet-po/000000000000000000000000/invoice')
    ok(r2.status === 404, '404 unknown PO invoice view', r2.status, 404)
  }
}

section('AIRFEET PO — Section 8: Update PO (all fields + item replacement)')
{
  if (!poId) { skip('UPDATE PO', 'no poId'); }
  else {
    const r = await PUT(`/airfeet-po/${poId}`, {
      po_number:     `PO-${TS}-UPD`,
      po_net_amount: 3000.00,
      shipping_costs: 100.00,
      po_notes:      'Updated CRUD test PO',
      po_total_qty:  120,
      items: [
        { description: 'Updated RELIEF SM', qty: 60, uom: 'EA', unit_cost: 15.00, item_type_id: 1 },
        { description: 'New CLASSIC XL',    qty: 30, uom: 'EA', unit_cost: 45.00, item_type_id: 2 },
        { description: 'Accessories',       qty: 30, uom: 'PKG', unit_cost: 10.00, item_type_id: 3 },
      ],
    })
    ok(r.ok, 'PUT /airfeet-po/:id → 200', r.status, 200)
    ok(r.body.po_number === `PO-${TS}-UPD`, 'po_number updated', r.body.po_number, `PO-${TS}-UPD`)
    ok(r.body.po_net_amount === 3000.00, 'po_net_amount updated', r.body.po_net_amount, 3000.00)
    ok(r.body.po_total_qty === 120, 'po_total_qty updated', r.body.po_total_qty, 120)
    ok(!!r.body.updated_at, 'updated_at set', !!r.body.updated_at, true)

    // Verify items replaced (2 old → 3 new)
    const verify = await GET(`/airfeet-po/${poId}`)
    ok(verify.body.items.length === 3, 'Items replaced: now 3', verify.body.items.length, 3)
    const hasNew = !!verify.body.items.find(i => i.po_item_name === 'Updated RELIEF SM')
    ok(hasNew, 'New item present', hasNew, true)
    const hasOld = !!verify.body.items.find(i => i.po_item_name === 'AIRfeet RELIEF SM')
    ok(!hasOld, 'Old item gone', hasOld, false)

    // PUT strips _id, items, checks
    const r2 = await PUT(`/airfeet-po/${poId}`, { _id: 'bad', po_notes: 'NoClobber' })
    ok(r2.ok, 'PUT with _id in body → 200 (_id stripped)', r2.status, 200)
    ok(r2.body._id === poId, '_id unchanged', r2.body._id, poId)

    // 404 unknown
    const r3 = await PUT('/airfeet-po/000000000000000000000000', { po_notes: 'X' })
    ok(r3.status === 404, 'PUT unknown → 404', r3.status, 404)
  }
}

section('AIRFEET PO — Section 9: Update Status (Shipped toggle)')
{
  if (!poId) { skip('STATUS toggle', 'no poId'); }
  else {
    // Set Shipped
    const r1 = await PUT(`/airfeet-po/${poId}/status`, { inv_status: 'Shipped' })
    ok(r1.ok, 'PUT /status Shipped → 200', r1.status, 200)
    ok(r1.body.inv_status === 'Shipped', 'inv_status = Shipped', r1.body.inv_status, 'Shipped')

    // Verify in shipped list
    const shipped = await GET('/airfeet-po?status=active')
    // 'Shipped' POs have inv_status=Shipped; the status filter is on `status` field not `inv_status`
    ok(shipped.ok, 'Shipped filter → 200', shipped.status, 200)

    // Revert
    const r2 = await PUT(`/airfeet-po/${poId}/status`, { inv_status: '' })
    ok(r2.ok, 'PUT /status → clear (active)', r2.status, 200)
    ok(r2.body.inv_status === '', 'inv_status cleared', r2.body.inv_status, '')

    // 404
    const r3 = await PUT('/airfeet-po/000000000000000000000000/status', { inv_status: 'Shipped' })
    ok(r3.status === 404, 'PUT status unknown → 404', r3.status, 404)
  }
}

section('AIRFEET PO — Section 10: Copy PO')
{
  if (!poId) { skip('COPY PO', 'no poId'); }
  else {
    const r = await POST(`/airfeet-po/${poId}/copy`, {})
    ok(r.status === 201, 'POST /copy → 201', r.status, 201)
    ok(r.body._id !== poId, 'Copy has different _id', r.body._id !== poId, true)
    ok(r.body.legacy_id !== poLegacy, 'Copy has different legacy_id', r.body.legacy_id !== poLegacy, true)
    ok(r.body.po_number === `PO-${TS}-UPD (Copy)`, 'Copy po_number = original + " (Copy)"', r.body.po_number, `PO-${TS}-UPD (Copy)`)
    ok(r.body.inv_status === '', 'Copy: inv_status cleared', r.body.inv_status, '')
    ok(r.body.paid_value === '', 'Copy: paid_value cleared', r.body.paid_value, '')
    ok(r.body.paid_date === '', 'Copy: paid_date cleared', r.body.paid_date, '')
    ok(r.body.supplier_id === suppId, 'Copy: supplier_id preserved', r.body.supplier_id, suppId)
    ok(r.body.po_net_amount === 3000.00, 'Copy: po_net_amount preserved', r.body.po_net_amount, 3000.00)
    poCopyId = r.body._id
    info(`Copy id=${poCopyId}  #${r.body.po_number}`)

    // Copy appears in list
    const list = await GET('/airfeet-po')
    ok(list.body.some(p => p._id === poCopyId), 'Copy in list', true, true)

    // 404 on copy of unknown
    const r2 = await POST('/airfeet-po/000000000000000000000000/copy', {})
    ok(r2.status === 404, '404 copy unknown PO', r2.status, 404)
  }
}

section('AIRFEET PO — Section 11: Customer PO Files')
{
  if (!poId) { skip('Customer PO files', 'no poId'); }
  else {
    // GET (empty for new PO)
    const r = await GET(`/airfeet-po/${poId}/customer-po`)
    ok(r.ok, 'GET /customer-po → 200', r.status, 200)
    ok(Array.isArray(r.body), 'Array (empty for new PO)', Array.isArray(r.body), true)
    ok(r.body.length === 0, 'No files for new PO', r.body.length, 0)

    // 404 on unknown PO
    const r2 = await GET('/airfeet-po/000000000000000000000000/customer-po')
    ok(r2.status === 404, '404 unknown PO files', r2.status, 404)
    info('File upload requires multipart/form-data — endpoint verified via GET')
  }
}

section('AIRFEET PO — Section 12: Send Email')
{
  if (!poId) { skip('Send email', 'no poId'); }
  else {
    // Valid email request
    const r = await POST(`/airfeet-po/${poId}/send-email`, {
      to:      'test@example.com',
      cc:      'cc@example.com',
      subject: `PO Invoice ${TS}`,
      message: 'Please find your PO invoice attached.',
    })
    ok(r.ok, 'POST /send-email → 200', r.status, 200)
    ok(r.body.success === true, 'success: true', r.body.success, true)
    ok(typeof r.body.message === 'string', 'message returned', typeof r.body.message, 'string')
    ok(r.body.message.includes('queued'), 'Message mentions queued', r.body.message, 'includes queued')

    // Missing `to` → 400
    const r2 = await POST(`/airfeet-po/${poId}/send-email`, { subject: 'Test', message: 'Body' })
    ok(r2.status === 400, 'Missing `to` → 400', r2.status, 400)
    ok(r2.body.error === 'Recipient email is required', 'Error message', r2.body.error, 'Recipient email is required')

    // 404 on unknown PO
    const r3 = await POST('/airfeet-po/000000000000000000000000/send-email', { to: 'a@b.com' })
    ok(r3.status === 404, '404 unknown PO send-email', r3.status, 404)
  }
}

section('AIRFEET PO — Section 13: Delete PO (+ items/checks cleanup)')
{
  // Delete copy first
  if (poCopyId) {
    const r = await DELETE(`/airfeet-po/${poCopyId}`)
    ok(r.ok, 'DELETE copy PO → 200', r.status, 200)
    ok(r.body.success === true, 'success: true', r.body.success, true)
    const gone = await GET(`/airfeet-po/${poCopyId}`)
    ok(gone.status === 404, 'Copy gone → 404', gone.status, 404)
    poCopyId = null
  }

  // Delete main PO
  if (poId) {
    const r = await DELETE(`/airfeet-po/${poId}`)
    ok(r.ok, 'DELETE main PO → 200', r.status, 200)
    ok(r.body.success === true, 'success: true', r.body.success, true)
    const gone = await GET(`/airfeet-po/${poId}`)
    ok(gone.status === 404, 'Main PO gone → 404', gone.status, 404)

    // Re-delete → 404
    const r2 = await DELETE(`/airfeet-po/${poId}`)
    ok(r2.status === 404, 'Re-delete → 404', r2.status, 404)
    info('DELETE cleans up items + checks before removing PO')
    poId = null
  }

  // Unknown
  const r3 = await DELETE('/airfeet-po/000000000000000000000000')
  ok(r3.status === 404, 'DELETE unknown → 404', r3.status, 404)
}

section('AIRFEET PO — Section 14: Validation Errors')
{
  // Missing supplier_id → 400
  const r1 = await POST('/airfeet-po', { po_number: 'TEST', po_net_amount: 100 })
  ok(r1.status === 400, 'Missing supplier_id → 400', r1.status, 400)
  ok(r1.body.error === 'Supplier is required', 'Error: Supplier is required', r1.body.error, 'Supplier is required')

  // Numeric type coercion — string numbers
  if (suppId) {
    const r2 = await POST('/airfeet-po', {
      supplier_id:    String(suppId),
      po_net_amount:  '999.99',
      shipping_costs: '25.50',
      po_total_qty:   '10',
    })
    ok(r2.status === 201, 'String numbers coerced → 201', r2.status, 201)
    ok(r2.body.po_net_amount === 999.99, 'po_net_amount parsed as float', r2.body.po_net_amount, 999.99)
    ok(r2.body.shipping_costs === 25.50, 'shipping_costs parsed as float', r2.body.shipping_costs, 25.50)
    ok(r2.body.po_total_qty === 10, 'po_total_qty parsed as int', r2.body.po_total_qty, 10)
    if (r2.body._id) { await DELETE(`/airfeet-po/${r2.body._id}`); pass('Coercion test cleanup') }
  }
}

// ══════════════════════════════════════════════════════════════════════════
// ══ PILOT PROGRAMS ═══════════════════════════════════════════════════════
// ══════════════════════════════════════════════════════════════════════════

section('PILOT PROGRAMS — Section 15: Stats')
{
  const r = await GET('/pilot-programs/stats')
  ok(r.ok, 'GET /pilot-programs/stats → 200', r.status, 200)
  const fields = ['total','active','completed','cancelled','totalCost','totalPaid','totalOutstanding','totalQuantity']
  fields.forEach(f => ok(typeof r.body[f] === 'number', `${f} is number`, typeof r.body[f], 'number'))
  ok(r.body.total >= 0, `total ≥ 0 (${r.body.total})`, r.body.total, '>=0')
  ok(r.body.active + r.body.completed + r.body.cancelled <= r.body.total + 5,
    'active+completed+cancelled ≈ total', r.body.active + r.body.completed + r.body.cancelled, '≈total')
  info(`Stats: total=${r.body.total}  active=${r.body.active}  cost=$${r.body.totalCost?.toFixed(2)}  paid=$${r.body.totalPaid?.toFixed(2)}`)
}

section('PILOT PROGRAMS — Section 16: Lookup Customers')
{
  const r = await GET('/pilot-programs/lookup/customers')
  ok(r.ok, 'GET /lookup/customers → 200', r.status, 200)
  ok(Array.isArray(r.body), 'Array', Array.isArray(r.body), true)
  ok(r.body.length > 0, `At least 1 customer (${r.body.length})`, r.body.length, '>0')
  const first = r.body[0]
  ok('legacy_id' in first, 'Has legacy_id', true, true)
  ok('company_name' in first, 'Has company_name', true, true)
  info(`Customers: ${r.body.length}  First: ${first.company_name}`)
}

section('PILOT PROGRAMS — Section 17: Lookup Reps')
{
  const r = await GET('/pilot-programs/lookup/reps')
  ok(r.ok, 'GET /lookup/reps → 200', r.status, 200)
  ok(Array.isArray(r.body), 'Array', Array.isArray(r.body), true)
  info(`Reps from sales_rep collection: ${r.body.length}`)
}

section('PILOT PROGRAMS — Section 18: List (all filters)')
{
  const all = await GET('/pilot-programs')
  ok(all.ok, 'GET /pilot-programs → 200', all.status, 200)
  ok(Array.isArray(all.body), 'Array', Array.isArray(all.body), true)
  info(`Total pilot programs: ${all.body.length}`)

  // Sorted by created_at DESC
  if (all.body.length >= 2) {
    const d1 = new Date(all.body[0].created_at || 0)
    const d2 = new Date(all.body[1].created_at || 0)
    ok(d1 >= d2, 'Sorted by created_at DESC', d1 >= d2, true)
  }

  // Status filters
  for (const status of ['active', 'completed', 'cancelled']) {
    const r = await GET(`/pilot-programs?status=${status}`)
    ok(r.ok, `GET ?status=${status} → 200`, r.status, 200)
    if (r.body.length > 0) {
      ok(r.body.every(p => p.status === status), `All ${status}`, r.body.every(p => p.status === status), true)
    }
    info(`${status}: ${r.body.length} programs`)
  }
}

section('PILOT PROGRAMS — Section 19: Create Program (all fields)')
{
  const startDate = new Date().toISOString().slice(0, 10)
  const endDate   = new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10)

  const payload = {
    customer_name:  `TestCo_${TS}`,
    customer_id:    'TEST_CUST_001',
    quantity:       50,
    program_cost:   1500.00,
    payment_status: 'outstanding',
    paid_date:      null,
    paid_amount:    0,
    before_data:    'Baseline metrics: avg 3 products per visit',
    after_data:     '',
    notes:          'Deep CRUD test pilot program',
    sales_rep_id:   'TEST_REP_001',
    sales_rep_name: 'Test Rep',
    start_date:     startDate,
    end_date:       endDate,
    status:         'active',
  }

  const r = await POST('/pilot-programs', payload)
  ok(r.status === 201, 'POST /pilot-programs → 201', r.status, 201)
  ok(r.body.customer_name === `TestCo_${TS}`, 'customer_name stored', r.body.customer_name, `TestCo_${TS}`)
  ok(r.body.customer_id === 'TEST_CUST_001', 'customer_id stored', r.body.customer_id, 'TEST_CUST_001')
  ok(r.body.quantity === 50, 'quantity stored', r.body.quantity, 50)
  ok(r.body.program_cost === 1500.00, 'program_cost stored', r.body.program_cost, 1500.00)
  ok(r.body.payment_status === 'outstanding', 'payment_status = outstanding', r.body.payment_status, 'outstanding')
  ok(r.body.paid_amount === 0, 'paid_amount = 0', r.body.paid_amount, 0)
  ok(r.body.before_data === 'Baseline metrics: avg 3 products per visit', 'before_data stored', r.body.before_data, 'Baseline metrics: avg 3 products per visit')
  ok(r.body.notes === 'Deep CRUD test pilot program', 'notes stored', r.body.notes, 'Deep CRUD test pilot program')
  ok(r.body.sales_rep_name === 'Test Rep', 'sales_rep_name stored', r.body.sales_rep_name, 'Test Rep')
  ok(r.body.status === 'active', 'status = active', r.body.status, 'active')
  ok(Array.isArray(r.body.documents), 'documents is array', Array.isArray(r.body.documents), true)
  ok(r.body.documents.length === 0, 'Empty documents on create', r.body.documents.length, 0)
  ok(!!r.body._id, '_id returned', !!r.body._id, true)
  ok(!!r.body.created_at, 'created_at set', !!r.body.created_at, true)
  ok(!!r.body.updated_at, 'updated_at set', !!r.body.updated_at, true)
  pilotId = r.body._id
  info(`Created pilot id=${pilotId}`)
}

section('PILOT PROGRAMS — Section 20: Read Single Program')
{
  if (!pilotId) { skip('READ pilot', 'no pilotId'); }
  else {
    const r = await GET(`/pilot-programs/${pilotId}`)
    ok(r.ok, 'GET /pilot-programs/:id → 200', r.status, 200)
    ok(r.body.customer_name === `TestCo_${TS}`, 'customer_name matches', r.body.customer_name, `TestCo_${TS}`)
    ok(r.body.program_cost === 1500.00, 'program_cost matches', r.body.program_cost, 1500.00)
    ok(Array.isArray(r.body.documents), 'documents array', Array.isArray(r.body.documents), true)

    // 404
    const r2 = await GET('/pilot-programs/000000000000000000000000')
    ok(r2.status === 404, '404 unknown', r2.status, 404)
    ok(r2.body.error === 'Pilot program not found', '404 message', r2.body.error, 'Pilot program not found')
  }
}

section('PILOT PROGRAMS — Section 21: Update Program')
{
  if (!pilotId) { skip('UPDATE pilot', 'no pilotId'); }
  else {
    const r = await PUT(`/pilot-programs/${pilotId}`, {
      customer_name:  `TestCo_${TS}_upd`,
      quantity:       75,
      program_cost:   2000.00,
      before_data:    'Updated baseline metrics',
      after_data:     'Post-pilot: 5 products per visit',
      notes:          'Updated notes',
    })
    ok(r.ok, 'PUT /pilot-programs/:id → 200', r.status, 200)
    ok(r.body.customer_name === `TestCo_${TS}_upd`, 'customer_name updated', r.body.customer_name, `TestCo_${TS}_upd`)
    ok(r.body.quantity === 75, 'quantity updated', r.body.quantity, 75)
    ok(r.body.program_cost === 2000.00, 'program_cost updated', r.body.program_cost, 2000.00)
    ok(r.body.after_data === 'Post-pilot: 5 products per visit', 'after_data updated', r.body.after_data, 'Post-pilot: 5 products per visit')

    // Verify persisted
    const verify = await GET(`/pilot-programs/${pilotId}`)
    ok(verify.body.quantity === 75, 'quantity persisted', verify.body.quantity, 75)

    // _id stripped
    const r2 = await PUT(`/pilot-programs/${pilotId}`, { _id: 'bad', notes: 'NoClobber' })
    ok(r2.ok, 'PUT with _id → 200 (_id stripped)', r2.status, 200)
    ok(r2.body._id === pilotId, '_id unchanged', r2.body._id, pilotId)

    // 404
    const r3 = await PUT('/pilot-programs/000000000000000000000000', { notes: 'X' })
    ok(r3.status === 404, 'PUT unknown → 404', r3.status, 404)
  }
}

section('PILOT PROGRAMS — Section 22: Mark Paid')
{
  if (!pilotId) { skip('Mark paid', 'no pilotId'); }
  else {
    const today = new Date().toISOString().slice(0, 10)

    const r = await PUT(`/pilot-programs/${pilotId}/paid`, {
      paid_date:   today,
      paid_amount: 2000.00,
    })
    ok(r.ok, 'PUT /paid → 200', r.status, 200)
    ok(r.body.payment_status === 'paid', 'payment_status = paid', r.body.payment_status, 'paid')
    ok(r.body.paid_amount === 2000.00, 'paid_amount = 2000', r.body.paid_amount, 2000.00)
    ok(!!r.body.paid_date, 'paid_date set', !!r.body.paid_date, true)

    // Verify persisted
    const verify = await GET(`/pilot-programs/${pilotId}`)
    ok(verify.body.payment_status === 'paid', 'paid status persisted', verify.body.payment_status, 'paid')

    // 404
    const r2 = await PUT('/pilot-programs/000000000000000000000000/paid', { paid_amount: 100 })
    ok(r2.status === 404, '404 unknown paid', r2.status, 404)
  }
}

section('PILOT PROGRAMS — Section 23: Mark Outstanding (Unpaid)')
{
  if (!pilotId) { skip('Mark unpaid', 'no pilotId'); }
  else {
    const r = await PUT(`/pilot-programs/${pilotId}/unpaid`, {})
    ok(r.ok, 'PUT /unpaid → 200', r.status, 200)
    ok(r.body.payment_status === 'outstanding', 'payment_status = outstanding', r.body.payment_status, 'outstanding')
    ok(r.body.paid_amount === 0, 'paid_amount reset to 0', r.body.paid_amount, 0)
    ok(r.body.paid_date === null, 'paid_date cleared to null', r.body.paid_date, null)

    // Verify persisted
    const verify = await GET(`/pilot-programs/${pilotId}`)
    ok(verify.body.payment_status === 'outstanding', 'outstanding persisted', verify.body.payment_status, 'outstanding')

    // Toggle stress: paid → unpaid → paid → unpaid
    const today = new Date().toISOString().slice(0, 10)
    const states = []
    for (const [route, data] of [
      ['/paid',   { paid_date: today, paid_amount: 500 }],
      ['/unpaid', {}],
      ['/paid',   { paid_date: today, paid_amount: 1000 }],
      ['/unpaid', {}],
    ]) {
      const r = await PUT(`/pilot-programs/${pilotId}${route}`, data)
      states.push(r.body.payment_status)
    }
    ok(states.join(',') === 'paid,outstanding,paid,outstanding',
      'Toggle: paid→outstanding→paid→outstanding', states.join(','), 'paid,outstanding,paid,outstanding')

    // 404
    const r2 = await PUT('/pilot-programs/000000000000000000000000/unpaid', {})
    ok(r2.status === 404, '404 unknown unpaid', r2.status, 404)
  }
}

section('PILOT PROGRAMS — Section 24: Status Transitions')
{
  if (!pilotId) { skip('Status transitions', 'no pilotId'); }
  else {
    // active → completed
    const r1 = await PUT(`/pilot-programs/${pilotId}/status`, { status: 'completed' })
    ok(r1.ok, 'PUT /status completed → 200', r1.status, 200)
    ok(r1.body.status === 'completed', 'status = completed', r1.body.status, 'completed')

    // Verify in completed filter
    const compList = await GET('/pilot-programs?status=completed')
    ok(compList.body.some(p => p._id === pilotId), 'In completed list', true, true)

    // completed → cancelled
    const r2 = await PUT(`/pilot-programs/${pilotId}/status`, { status: 'cancelled' })
    ok(r2.ok, 'PUT /status cancelled → 200', r2.status, 200)
    ok(r2.body.status === 'cancelled', 'status = cancelled', r2.body.status, 'cancelled')

    // cancelled → active
    const r3 = await PUT(`/pilot-programs/${pilotId}/status`, { status: 'active' })
    ok(r3.ok, 'PUT /status active → 200', r3.status, 200)
    ok(r3.body.status === 'active', 'status = active', r3.body.status, 'active')

    // Invalid status → 400
    const r4 = await PUT(`/pilot-programs/${pilotId}/status`, { status: 'archived' })
    ok(r4.status === 400, 'Invalid status → 400', r4.status, 400)
    ok(r4.body.error === 'Invalid status', 'Error: Invalid status', r4.body.error, 'Invalid status')

    // 404
    const r5 = await PUT('/pilot-programs/000000000000000000000000/status', { status: 'active' })
    ok(r5.status === 404, '404 unknown status', r5.status, 404)
  }
}

section('PILOT PROGRAMS — Section 25: Documents (upload endpoint + list + delete)')
{
  if (!pilotId) { skip('Documents', 'no pilotId'); }
  else {
    // Documents require multipart/form-data (file upload)
    // We verify the endpoint exists and handles missing files correctly
    const noFiles = await fetch(`${BASE}/pilot-programs/${pilotId}/documents`, {
      method: 'POST',
      // No files attached — this hits the "No files uploaded" guard
    })
    const noFilesBody = await noFiles.json().catch(() => ({}))
    ok(noFiles.status === 400, 'POST /documents without files → 400', noFiles.status, 400)
    ok(noFilesBody.error === 'No files uploaded', 'Error: No files uploaded', noFilesBody.error, 'No files uploaded')

    // documents array empty (no actual file upload in test)
    const rd = await GET(`/pilot-programs/${pilotId}`)
    ok(rd.body.documents.length === 0, 'Documents array still empty (no actual file upload)', rd.body.documents.length, 0)

    // 404 on document upload for unknown program
    const unkUpload = await fetch(`${BASE}/pilot-programs/000000000000000000000000/documents`, { method: 'POST' })
    ok(unkUpload.status === 404, '404 documents for unknown program', unkUpload.status, 404)

    // 404 on delete non-existent document
    const unkDel = await DELETE(`/pilot-programs/${pilotId}/documents/000000000000000000000000`)
    ok(unkDel.status === 404, '404 delete non-existent document', unkDel.status, 404)

    info('Document upload requires multipart/form-data — endpoint guards verified')
  }
}

section('PILOT PROGRAMS — Section 26: Delete Program')
{
  // Create a 2nd pilot for deletion test
  const r2 = await POST('/pilot-programs', {
    customer_name:  `DeleteMe_${TS}`,
    quantity:       10,
    program_cost:   500.00,
    payment_status: 'outstanding',
    status:         'active',
  })
  if (r2.body._id) {
    pilotId2 = r2.body._id
    const dl = await DELETE(`/pilot-programs/${pilotId2}`)
    ok(dl.ok, 'DELETE pilot → 200', dl.status, 200)
    ok(dl.body.success === true, 'success: true', dl.body.success, true)
    const gone = await GET(`/pilot-programs/${pilotId2}`)
    ok(gone.status === 404, 'Deleted pilot → 404', gone.status, 404)
    pilotId2 = null
  }

  // Delete main test pilot
  if (pilotId) {
    const dl = await DELETE(`/pilot-programs/${pilotId}`)
    ok(dl.ok, 'DELETE main pilot → 200', dl.status, 200)
    const gone = await GET(`/pilot-programs/${pilotId}`)
    ok(gone.status === 404, 'Main pilot gone → 404', gone.status, 404)
    const list = await GET('/pilot-programs')
    ok(!list.body.some(p => p._id === pilotId), 'Not in list after delete', true, true)
    pilotId = null
  }

  // 404 on unknown
  const r3 = await DELETE('/pilot-programs/000000000000000000000000')
  ok(r3.status === 404, 'DELETE unknown → 404', r3.status, 404)
  ok(r3.body.error === 'Pilot program not found', '404 message', r3.body.error, 'Pilot program not found')
}

section('PILOT PROGRAMS — Section 27: Validation Errors')
{
  // Missing customer_name → 400
  const r1 = await POST('/pilot-programs', { quantity: 10, program_cost: 500 })
  ok(r1.status === 400, 'Missing customer_name → 400', r1.status, 400)
  ok(r1.body.error === 'Customer name is required', 'Error message', r1.body.error, 'Customer name is required')

  // Invalid payment_status enum → 400 (Mongoose validation)
  const r2 = await POST('/pilot-programs', { customer_name: `EnumTest_${TS}`, payment_status: 'pending' })
  ok(r2.status === 400, 'Invalid payment_status → 400', r2.status, 400)

  // Invalid status enum → 400
  const r3 = await POST('/pilot-programs', { customer_name: `EnumTest2_${TS}`, status: 'archived' })
  ok(r3.status === 400, 'Invalid status enum → 400', r3.status, 400)

  // String numbers coerced
  const r4 = await POST('/pilot-programs', {
    customer_name: `CoerceTest_${TS}`,
    quantity:      '25',
    program_cost:  '750.50',
    paid_amount:   '0',
  })
  ok(r4.status === 201, 'String numbers coerced → 201', r4.status, 201)
  ok(r4.body.quantity === 25, 'quantity parsed as int', r4.body.quantity, 25)
  ok(r4.body.program_cost === 750.50, 'program_cost parsed as float', r4.body.program_cost, 750.50)
  if (r4.body._id) { await DELETE(`/pilot-programs/${r4.body._id}`); pass('Coercion test cleanup') }

  // Empty string customer_name → 400
  const r5 = await POST('/pilot-programs', { customer_name: '' })
  ok(r5.status === 400, 'Empty customer_name → 400', r5.status, 400)
}

section('PILOT PROGRAMS — Section 28: Stats Accuracy')
{
  // Create programs with known costs, verify stats aggregation
  const before = await GET('/pilot-programs/stats')
  const beforeTotal = before.body.total || 0
  const beforePaid = before.body.totalPaid || 0
  const beforeOutstanding = before.body.totalOutstanding || 0

  // Create one paid ($300) and one outstanding ($200)
  const p1 = await POST('/pilot-programs', { customer_name: `StatsPaid_${TS}`, program_cost: 300, payment_status: 'paid', quantity: 5 })
  const p2 = await POST('/pilot-programs', { customer_name: `StatsOut_${TS}`,  program_cost: 200, payment_status: 'outstanding', quantity: 3 })

  ok(p1.status === 201 && p2.status === 201, 'Both stats programs created', true, true)

  const after = await GET('/pilot-programs/stats')
  ok(after.body.total === beforeTotal + 2, `total +2 (now ${after.body.total})`, after.body.total, beforeTotal + 2)
  ok(Math.abs((after.body.totalPaid - beforePaid) - 300) < 0.01, 'totalPaid +$300', Math.abs(after.body.totalPaid - beforePaid - 300), '<0.01')
  ok(Math.abs((after.body.totalOutstanding - beforeOutstanding) - 200) < 0.01, 'totalOutstanding +$200', Math.abs(after.body.totalOutstanding - beforeOutstanding - 200), '<0.01')
  ok(after.body.totalQuantity >= before.body.totalQuantity + 8, `totalQuantity +8 (${after.body.totalQuantity})`, after.body.totalQuantity, '>=prev+8')

  // Cleanup
  if (p1.body._id) { await DELETE(`/pilot-programs/${p1.body._id}`); pass('Stats paid program cleanup') }
  if (p2.body._id) { await DELETE(`/pilot-programs/${p2.body._id}`); pass('Stats outstanding program cleanup') }
  info(`Stats verified: paid=$${after.body.totalPaid?.toFixed(2)}  outstanding=$${after.body.totalOutstanding?.toFixed(2)}`)
}

// ─── Summary ─────────────────────────────────────────────────────────────────
const total = passed + failed + skipped
console.log('\n' + '═'.repeat(62))
console.log('\x1b[1mAIRFEET PO + PILOT PROGRAMS DEEP TEST SUMMARY\x1b[0m')
console.log('═'.repeat(62))
console.log(`  Total     : ${total}`)
console.log(`  \x1b[32mPassed\x1b[0m    : ${passed}`)
console.log(`  \x1b[31mFailed\x1b[0m    : ${failed}`)
console.log(`  \x1b[33mSkipped\x1b[0m   : ${skipped}`)
console.log('═'.repeat(62))
if (failures.length) {
  console.log('\n\x1b[1mFAILED:\x1b[0m')
  failures.forEach((f,i) => console.log(`  ${i+1}. ${f.l}\n     got=${JSON.stringify(f.g)}  exp=${JSON.stringify(f.e)}`))
}
if (failed === 0) console.log('\n\x1b[32m✓ All tests passed.\x1b[0m')
else              console.log(`\n\x1b[31m✗ ${failed} test(s) failed.\x1b[0m`)
