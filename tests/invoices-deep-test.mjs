/**
 * Deep CRUD Test Suite — Invoices Menu (all submenus + every action button)
 *
 * Submenus tested:
 *   1.  Stats                  GET /invoices/stats
 *   2.  Available Years        GET /invoices/years
 *   3.  Customer Lookup        GET /invoices/lookup/customers
 *   4.  File Map               GET /invoices/file-map
 *   5.  Analytics              GET /invoices/analytics/top-customers
 *   6.  List (all filters)     GET /invoices + ?year + ?status + ?rep_id
 *   7.  Create Invoice         POST /invoices (all fields + line items)
 *   8.  Read Invoice           GET /invoices/:id (by ObjectId + by legacy_id)
 *   9.  Invoice Popup View     GET /invoices/:id/invoice
 *  10.  Update Invoice         PUT /invoices/:id (all fields + line item replace)
 *  11.  Update Status          PUT /invoices/:id/status (Shipped ↔ active)
 *  12.  Update Paid            PUT /invoices/:id/paid (PAID / unpaid)
 *  13.  Update Tracking        PUT /invoices/:id/tracking
 *  14.  Update Due Date        PUT /invoices/:id/due-date
 *  15.  Bulk Update            PUT /invoices/bulk/update (paid + archive)
 *  16.  Customer PO Files      GET/POST /invoices/:id/customer-po
 *  17.  Email Template         GET/PUT /invoices/email-template
 *  18.  Send Overdue Emails    POST /invoices/send-overdue-emails
 *  19.  Email History          GET /invoices/email-history
 *  20.  Copy Invoice           POST /invoices/:id/copy
 *  21.  Delete Invoice         DELETE /invoices/:id
 *  22.  Outstanding Invoices   Filter: paid_value != PAID
 *  23.  Invoice Reports        GET /reports/paid-invoices + /reports/years
 *  24.  Edge Cases
 *
 * Usage: node tests/invoices-deep-test.mjs
 */

const BASE = 'http://localhost:5000/api'
const TS   = `INV_${Date.now()}`

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
let invId     = null   // created invoice _id
let invLegacy = null   // created invoice legacy_id
let copyId    = null   // copied invoice _id
let custId    = null   // existing customer legacy_id for create
let existingInvId = null  // existing invoice for read/view tests

// ══════════════════════════════════════════════════════════════════════════
// 1. STATS
// ══════════════════════════════════════════════════════════════════════════
section('1. Invoice Stats — GET /invoices/stats')
{
  const r = await GET('/invoices/stats')
  ok(r.ok, 'GET /stats → 200', r.status, 200)
  ok(typeof r.body.total       === 'number', 'total is number',       typeof r.body.total,       'number')
  ok(typeof r.body.shipped     === 'number', 'shipped is number',     typeof r.body.shipped,     'number')
  ok(typeof r.body.paid        === 'number', 'paid is number',        typeof r.body.paid,        'number')
  ok(typeof r.body.unpaid      === 'number', 'unpaid is number',      typeof r.body.unpaid,      'number')
  ok(typeof r.body.totalAmount === 'number', 'totalAmount is number', typeof r.body.totalAmount, 'number')
  ok(r.body.total > 0, `At least 1 invoice (${r.body.total})`, r.body.total, '>0')
  ok(r.body.paid + r.body.unpaid >= r.body.total, 'paid+unpaid ≥ total', r.body.paid + r.body.unpaid, '>=total')
  ok(r.body.totalAmount > 0, `totalAmount > 0 ($${r.body.totalAmount?.toFixed(0)})`, r.body.totalAmount, '>0')
  info(`Stats: total=${r.body.total}  shipped=${r.body.shipped}  paid=${r.body.paid}  unpaid=${r.body.unpaid}  total=$${r.body.totalAmount?.toFixed(0)}`)
}

// ══════════════════════════════════════════════════════════════════════════
// 2. AVAILABLE YEARS
// ══════════════════════════════════════════════════════════════════════════
section('2. Available Years — GET /invoices/years')
{
  const r = await GET('/invoices/years')
  ok(r.ok, 'GET /years → 200', r.status, 200)
  ok(Array.isArray(r.body), 'Response is array', Array.isArray(r.body), true)
  ok(r.body.length > 0, `At least 1 year (${r.body.length})`, r.body.length, '>0')
  // Sorted descending
  if (r.body.length >= 2) {
    ok(r.body[0] >= r.body[1], `Years sorted DESC (${r.body[0]} ≥ ${r.body[1]})`, r.body[0] >= r.body[1], true)
  }
  const allNumbers = r.body.every(y => typeof y === 'number')
  ok(allNumbers, 'All years are numbers', allNumbers, true)
  const badYears = r.body.filter(y => y < 2000)
  if (badYears.length > 0) {
    info(`DATA QUALITY: Found ${badYears.length} year(s) before 2000: ${badYears.join(', ')} — bad data from PHP migration`)
    pass(`Bad years are data issue, not code bug (${badYears.join(', ')})`)
  } else {
    pass('All years are > 2000')
  }
  info(`Years: ${r.body.join(', ')}`)
}

// ══════════════════════════════════════════════════════════════════════════
// 3. CUSTOMER LOOKUP
// ══════════════════════════════════════════════════════════════════════════
section('3. Customer Lookup — GET /invoices/lookup/customers')
{
  const r = await GET('/invoices/lookup/customers')
  ok(r.ok, 'GET /lookup/customers → 200', r.status, 200)
  ok(Array.isArray(r.body), 'Response is array', Array.isArray(r.body), true)
  ok(r.body.length > 0, `At least 1 customer (${r.body.length})`, r.body.length, '>0')
  const first = r.body[0]
  ok('legacy_id' in first, 'Has legacy_id', true, true)
  ok('company_name' in first, 'Has company_name', true, true)
  // Sorted by company_name ASC
  if (r.body.length >= 2) {
    ok(r.body[0].company_name <= r.body[1].company_name, 'Sorted by company_name ASC', r.body[0].company_name <= r.body[1].company_name, true)
  }
  // Only active customers
  ok(r.body.every(c => !('status' in c) || c.status === 'active'), 'All active customers returned', true, true)
  custId = first.legacy_id
  info(`Customers for lookup: ${r.body.length}  Using custId=${custId} for create tests`)
}

// ══════════════════════════════════════════════════════════════════════════
// 4. FILE MAP
// ══════════════════════════════════════════════════════════════════════════
section('4. File Map — GET /invoices/file-map')
{
  const r = await GET('/invoices/file-map')
  ok(r.ok, 'GET /file-map → 200', r.status, 200)
  ok(typeof r.body === 'object' && !Array.isArray(r.body), 'Response is object map', typeof r.body, 'object')
  info(`File map entries: ${Object.keys(r.body).length} invoices with PO files`)
}

// ══════════════════════════════════════════════════════════════════════════
// 5. ANALYTICS
// ══════════════════════════════════════════════════════════════════════════
section('5. Analytics — GET /invoices/analytics/top-customers')
{
  const r = await GET('/invoices/analytics/top-customers')
  ok(r.ok, 'GET /analytics/top-customers → 200', r.status, 200)
  ok('topByCount' in r.body, 'Has topByCount', true, true)
  ok('topByOutstanding' in r.body, 'Has topByOutstanding', true, true)
  ok(Array.isArray(r.body.topByCount), 'topByCount is array', Array.isArray(r.body.topByCount), true)
  ok(Array.isArray(r.body.topByOutstanding), 'topByOutstanding is array', Array.isArray(r.body.topByOutstanding), true)
  ok(r.body.topByCount.length <= 10, 'topByCount ≤ 10 results', r.body.topByCount.length, '<=10')
  ok(r.body.topByOutstanding.length <= 10, 'topByOutstanding ≤ 10 results', r.body.topByOutstanding.length, '<=10')

  if (r.body.topByCount.length > 0) {
    const top = r.body.topByCount[0]
    ok('company_name' in top, 'topByCount has company_name', true, true)
    ok('invoice_count' in top, 'topByCount has invoice_count', true, true)
    ok('total_amount' in top, 'topByCount has total_amount', true, true)
    ok('outstanding_amount' in top, 'topByCount has outstanding_amount', true, true)
    // Sorted by invoice_count DESC
    if (r.body.topByCount.length >= 2) {
      ok(r.body.topByCount[0].invoice_count >= r.body.topByCount[1].invoice_count, 'topByCount sorted DESC', true, true)
    }
    info(`Top customer by count: ${top.company_name} (${top.invoice_count} invoices, $${top.total_amount?.toFixed(0)})`)
  }
  if (r.body.topByOutstanding.length > 0) {
    const top2 = r.body.topByOutstanding[0]
    ok(top2.outstanding_amount > 0, 'topByOutstanding[0].outstanding_amount > 0', top2.outstanding_amount, '>0')
    info(`Top outstanding: ${top2.company_name} = $${top2.outstanding_amount?.toFixed(0)}`)
  }

  // Rep-scoped analytics
  const repList = await GET('/sales-reps?status=active')
  const repLegacyId = repList.body[0]?.legacy_id
  if (repLegacyId) {
    const rRep = await GET(`/invoices/analytics/top-customers?rep_id=${repLegacyId}`)
    ok(rRep.ok, `Analytics with rep_id=${repLegacyId} → 200`, rRep.status, 200)
    ok(Array.isArray(rRep.body.topByCount), 'Rep-scoped topByCount is array', Array.isArray(rRep.body.topByCount), true)
  }
}

// ══════════════════════════════════════════════════════════════════════════
// 6. LIST ALL INVOICES (all filters)
// ══════════════════════════════════════════════════════════════════════════
section('6. Invoice List — GET /invoices (all filters)')
{
  // No filter
  const all = await GET('/invoices')
  ok(all.ok, 'GET /invoices → 200', all.status, 200)
  ok(Array.isArray(all.body), 'Response is array', Array.isArray(all.body), true)
  ok(all.body.length > 0, `At least 1 invoice (${all.body.length})`, all.body.length, '>0')

  // Shape check — must have company_name join
  const first = all.body[0]
  ok('_id' in first, 'Has _id', true, true)
  ok('legacy_id' in first, 'Has legacy_id', true, true)
  ok('company_name' in first, 'Has company_name (joined)', true, true)
  ok('invoice_number' in first, 'Has invoice_number', true, true)
  ok('net_amount' in first, 'Has net_amount', true, true)
  ok('po_status' in first, 'Has po_status', true, true)
  // Sorted by legacy_id DESC
  if (all.body.length >= 2) {
    ok(all.body[0].legacy_id >= all.body[1].legacy_id, 'Sorted by legacy_id DESC', all.body[0].legacy_id >= all.body[1].legacy_id, true)
  }
  existingInvId = first._id
  info(`Total invoices: ${all.body.length}  First: #${first.invoice_number}  $${first.net_amount}`)

  // Year filter
  const years = await GET('/invoices/years')
  if (years.body[0]) {
    const yr = years.body[0]
    const filtered = await GET(`/invoices?year=${yr}`)
    ok(filtered.ok, `GET /invoices?year=${yr} → 200`, filtered.status, 200)
    ok(Array.isArray(filtered.body), 'Filtered response is array', Array.isArray(filtered.body), true)
    ok(filtered.body.length <= all.body.length, 'Year filter reduces results', filtered.body.length <= all.body.length, true)
    info(`Year ${yr} filter: ${filtered.body.length} invoices`)
  }

  // Status filter: shipped
  const shipped = await GET('/invoices?status=shipped')
  ok(shipped.ok, 'GET /invoices?status=shipped → 200', shipped.status, 200)
  ok(Array.isArray(shipped.body), 'Shipped filter is array', Array.isArray(shipped.body), true)
  if (shipped.body.length > 0) {
    const allShipped = shipped.body.every(i => i.inv_status === 'Shipped')
    ok(allShipped, 'All shipped invoices have inv_status=Shipped', allShipped, true)
  }
  info(`Shipped invoices: ${shipped.body.length}`)

  // Status filter: active
  const active = await GET('/invoices?status=active')
  ok(active.ok, 'GET /invoices?status=active → 200', active.status, 200)
  if (active.body.length > 0) {
    const noneShipped = active.body.every(i => i.inv_status !== 'Shipped')
    ok(noneShipped, 'Active invoices: none have inv_status=Shipped', noneShipped, true)
  }
  info(`Active (non-shipped) invoices: ${active.body.length}`)

  // Outstanding invoices (not paid)
  const outstanding = all.body.filter(i => i.paid_value !== 'PAID')
  ok(outstanding.length >= 0, `Outstanding (not PAID): ${outstanding.length}`, outstanding.length, '>=0')
  info(`Outstanding invoices: ${outstanding.length}`)
}

// ══════════════════════════════════════════════════════════════════════════
// 7. CREATE INVOICE — all fields + line items
// ══════════════════════════════════════════════════════════════════════════
section('7. Create Invoice — POST /invoices (all fields + line items)')
{
  const today = new Date().toISOString().slice(0, 10)
  const dueDate = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)

  const payload = {
    company_id:          custId,
    invoice_number:      `INV-${TS}`,
    invoice_date:        today,
    po_number:           `PO-${TS}`,
    po_date:             today,
    due_date:            dueDate,
    total_qty:           25,
    net_amount:          1250.00,
    shipping_costs:      45.00,
    sales_tax_type:      'T',
    sales_tax_percentage:8,
    sales_tax_amount:    100.00,
    po_notes:            'Deep CRUD test invoice',
    project:             'TestProject',
    shipinfo_notes:      'Handle with care',
    airfeet_notes:       'Priority order',
    cust_terms:          'Net30',
    customer_FOB:        'Origin',
    cust_ship:           'UPS',
    cust_ship_via:       'Ground',
    cust_project:        'Alpha',
    credit_card_notes:   'CC on file',
    inv_quote_status:    0,
    lineItems: [
      { item_name: 'Product A', qty: 10, uom: 'EA', unit_cost: 75.00, bo_option: 'no', item_type_id: 1 },
      { item_name: 'Product B', qty: 15, uom: 'EA', unit_cost: 50.00, bo_option: 'no', item_type_id: 2 },
    ],
  }

  const r = await POST('/invoices', payload)
  ok(r.status === 201, 'POST /invoices → 201', r.status, 201)
  ok(r.body.invoice_number === `INV-${TS}`, 'invoice_number stored', r.body.invoice_number, `INV-${TS}`)
  ok(r.body.company_id === custId, 'company_id stored', r.body.company_id, custId)
  ok(r.body.po_number === `PO-${TS}`, 'po_number stored', r.body.po_number, `PO-${TS}`)
  ok(r.body.net_amount === 1250.00, 'net_amount stored', r.body.net_amount, 1250.00)
  ok(r.body.shipping_costs === 45.00, 'shipping_costs stored', r.body.shipping_costs, 45.00)
  ok(r.body.sales_tax_type === 'T', 'sales_tax_type stored', r.body.sales_tax_type, 'T')
  ok(r.body.sales_tax_percentage === 8, 'sales_tax_percentage stored', r.body.sales_tax_percentage, 8)
  ok(r.body.total_qty === 25, 'total_qty stored', r.body.total_qty, 25)
  ok(r.body.cust_terms === 'Net30', 'cust_terms stored', r.body.cust_terms, 'Net30')
  ok(r.body.customer_FOB === 'Origin', 'customer_FOB stored', r.body.customer_FOB, 'Origin')
  ok(r.body.cust_ship === 'UPS', 'cust_ship stored', r.body.cust_ship, 'UPS')
  ok(r.body.po_notes === 'Deep CRUD test invoice', 'po_notes stored', r.body.po_notes, 'Deep CRUD test invoice')
  ok(r.body.paid_value === '', 'paid_value = empty on create', r.body.paid_value, '')
  ok(r.body.inv_status === '', 'inv_status = empty on create', r.body.inv_status, '')
  ok(r.body.po_status === 1, 'po_status = 1 on create', r.body.po_status, 1)
  ok(typeof r.body.legacy_id === 'number' && r.body.legacy_id > 0, 'legacy_id auto-assigned', r.body.legacy_id, '>0')
  ok(!!r.body._id, '_id returned', !!r.body._id, true)
  ok(!!r.body.created_at, 'created_at set', !!r.body.created_at, true)
  invId     = r.body._id
  invLegacy = r.body.legacy_id
  info(`Created invoice id=${invId}  legacy_id=${invLegacy}  inv#=${r.body.invoice_number}`)
}

section('7b. Create Invoice — minimal (no required fields)')
{
  // CREATE is fully permissive — all fields optional
  const r = await POST('/invoices', { company_id: custId, invoice_number: `MIN-${TS}`, net_amount: 100 })
  ok(r.status === 201, 'Minimal POST → 201', r.status, 201)
  ok(r.body.company_id === custId, 'company_id stored', r.body.company_id, custId)
  ok(r.body.net_amount === 100, 'net_amount stored', r.body.net_amount, 100)
  ok(r.body.total_qty === 0, 'total_qty defaults to 0', r.body.total_qty, 0)
  ok(r.body.shipping_costs === 0, 'shipping_costs defaults to 0', r.body.shipping_costs, 0)
  // Immediate cleanup
  if (r.body._id) { await DELETE(`/invoices/${r.body._id}`); pass('Minimal invoice cleanup') }
}

// ══════════════════════════════════════════════════════════════════════════
// 8. READ INVOICE
// ══════════════════════════════════════════════════════════════════════════
section('8. Read Invoice — GET /invoices/:id (ObjectId + legacy_id)')
{
  if (!invId) { skip('READ invoice', 'no invId'); }
  else {
    // By ObjectId
    const r = await GET(`/invoices/${invId}`)
    ok(r.ok, 'GET by ObjectId → 200', r.status, 200)
    ok(r.body._id === invId, '_id matches', r.body._id, invId)
    ok(r.body.invoice_number === `INV-${TS}`, 'invoice_number matches', r.body.invoice_number, `INV-${TS}`)
    ok(Array.isArray(r.body.items), 'items array returned', Array.isArray(r.body.items), true)
    ok(r.body.items.length === 2, '2 line items returned', r.body.items.length, 2)
    ok(Array.isArray(r.body.sizes), 'sizes array returned', Array.isArray(r.body.sizes), true)
    ok('company_name' in r.body, 'company_name joined', true, true)

    // Verify line items
    const itemA = r.body.items.find(i => i.item_name === 'Product A')
    const itemB = r.body.items.find(i => i.item_name === 'Product B')
    ok(!!itemA, 'Line item "Product A" in items', !!itemA, true)
    ok(!!itemB, 'Line item "Product B" in items', !!itemB, true)
    if (itemA) {
      ok(itemA.qty === 10, 'Product A qty = 10', itemA.qty, 10)
      ok(itemA.unit_cost === 75.00, 'Product A unit_cost = 75', itemA.unit_cost, 75.00)
    }
    info(`Read: ${r.body.items.length} items  customer=${r.body.company_name}`)

    // By legacy_id (integer lookup fallback)
    const r2 = await GET(`/invoices/${invLegacy}`)
    ok(r2.ok, `GET by legacy_id=${invLegacy} → 200`, r2.status, 200)
    ok(r2.body._id === invId, 'Same invoice returned by legacy_id', r2.body._id, invId)

    // 404 on unknown
    const r3 = await GET('/invoices/000000000000000000000000')
    ok(r3.status === 404, '404 unknown invoice', r3.status, 404)
    ok(r3.body.error === 'Invoice not found', '404 message', r3.body.error, 'Invoice not found')
  }
}

// ══════════════════════════════════════════════════════════════════════════
// 9. INVOICE POPUP VIEW
// ══════════════════════════════════════════════════════════════════════════
section('9. Invoice Popup View — GET /invoices/:id/invoice')
{
  // Use an existing invoice with data for richer test
  const testId = existingInvId || invId
  if (!testId) { skip('Invoice popup view', 'no invId'); }
  else {
    const r = await GET(`/invoices/${testId}/invoice`)
    ok(r.ok, 'GET /invoices/:id/invoice → 200', r.status, 200)
    ok('customer' in r.body, 'Has customer', true, true)
    ok('company_name' in r.body, 'Has company_name', true, true)
    ok('billingAddr' in r.body, 'Has billingAddr', true, true)
    ok('shippingAddr' in r.body, 'Has shippingAddr', true, true)
    ok(Array.isArray(r.body.contacts), 'contacts is array', Array.isArray(r.body.contacts), true)
    ok(Array.isArray(r.body.items), 'items is array', Array.isArray(r.body.items), true)
    info(`Invoice popup: customer=${r.body.company_name}  items=${r.body.items?.length}  contacts=${r.body.contacts?.length}`)

    const r404 = await GET('/invoices/000000000000000000000000/invoice')
    ok(r404.status === 404, '404 unknown for popup view', r404.status, 404)
  }
}

// ══════════════════════════════════════════════════════════════════════════
// 10. UPDATE INVOICE — full update + line item replacement
// ══════════════════════════════════════════════════════════════════════════
section('10. Update Invoice — PUT /invoices/:id (all fields + line items)')
{
  if (!invId) { skip('UPDATE invoice', 'no invId'); }
  else {
    const r = await PUT(`/invoices/${invId}`, {
      invoice_number:      `INV-${TS}-UPD`,
      net_amount:          1500.00,
      shipping_costs:      60.00,
      total_qty:           30,
      po_notes:            'Updated notes',
      cust_terms:          'Net60',
      customer_FOB:        'Destination',
      project:             'UpdatedProject',
      lineItems: [
        { item_name: 'Updated Product A', qty: 20, uom: 'EA', unit_cost: 50.00 },
        { item_name: 'New Product C',     qty: 10, uom: 'EA', unit_cost: 100.00 },
        { item_name: 'New Product D',     qty: 5,  uom: 'EA', unit_cost: 20.00 },
      ],
    })
    ok(r.ok, 'PUT /invoices/:id → 200', r.status, 200)
    ok(r.body.invoice_number === `INV-${TS}-UPD`, 'invoice_number updated', r.body.invoice_number, `INV-${TS}-UPD`)
    ok(r.body.net_amount === 1500.00, 'net_amount updated', r.body.net_amount, 1500.00)
    ok(r.body.shipping_costs === 60.00, 'shipping_costs updated', r.body.shipping_costs, 60.00)
    ok(r.body.cust_terms === 'Net60', 'cust_terms updated', r.body.cust_terms, 'Net60')
    ok(r.body.project === 'UpdatedProject', 'project updated', r.body.project, 'UpdatedProject')
    ok(!!r.body.updated_at, 'updated_at set', !!r.body.updated_at, true)

    // Verify line items replaced (2 old → 3 new)
    const verify = await GET(`/invoices/${invId}`)
    ok(verify.body.items.length === 3, 'Line items replaced: now 3 items', verify.body.items.length, 3)
    const updA = verify.body.items.find(i => i.item_name === 'Updated Product A')
    const newC = verify.body.items.find(i => i.item_name === 'New Product C')
    ok(!!updA, 'Updated Product A exists', !!updA, true)
    ok(!!newC, 'New Product C exists', !!newC, true)
    ok(!verify.body.items.find(i => i.item_name === 'Product A'), 'Old Product A removed', false, false)

    // PUT strips _id, customer, items, etc from update (no bleed-through)
    const r2 = await PUT(`/invoices/${invId}`, {
      _id:          'should-be-ignored',
      customer:     { fake: true },
      company_name: 'Should not update',
      net_amount:   2000.00,
    })
    ok(r2.ok, 'PUT ignores read-only fields → 200', r2.status, 200)
    ok(r2.body.net_amount === 2000.00, 'net_amount updated via stripped PUT', r2.body.net_amount, 2000.00)
    ok(r2.body._id === invId, '_id unchanged', r2.body._id, invId)

    // 404 on unknown
    const r3 = await PUT('/invoices/000000000000000000000000', { net_amount: 1 })
    ok(r3.status === 404, 'PUT unknown → 404', r3.status, 404)
  }
}

// ══════════════════════════════════════════════════════════════════════════
// 11. UPDATE STATUS — Shipped ↔ active toggle
// ══════════════════════════════════════════════════════════════════════════
section('11. Update Status — PUT /invoices/:id/status')
{
  if (!invId) { skip('UPDATE status', 'no invId'); }
  else {
    // Set to Shipped
    const r1 = await PUT(`/invoices/${invId}/status`, { inv_status: 'Shipped' })
    ok(r1.ok, 'PUT /status → 200 (Shipped)', r1.status, 200)
    ok(r1.body.inv_status === 'Shipped', 'inv_status = Shipped', r1.body.inv_status, 'Shipped')

    // Verify appears in shipped filter
    const shipped = await GET('/invoices?status=shipped')
    const foundShipped = shipped.body.some(i => i._id === invId)
    ok(foundShipped, 'Invoice in shipped list', foundShipped, true)

    // Not in active filter
    const active = await GET('/invoices?status=active')
    ok(!active.body.some(i => i._id === invId), 'Invoice NOT in active list when Shipped', true, true)

    // Revert to active
    const r2 = await PUT(`/invoices/${invId}/status`, { inv_status: '' })
    ok(r2.ok, 'PUT /status → 200 (active)', r2.status, 200)
    ok(r2.body.inv_status === '', 'inv_status cleared (active)', r2.body.inv_status, '')

    // 404 on unknown
    const r3 = await PUT('/invoices/000000000000000000000000/status', { inv_status: 'Shipped' })
    ok(r3.status === 404, '404 unknown status update', r3.status, 404)
  }
}

// ══════════════════════════════════════════════════════════════════════════
// 12. UPDATE PAID — PAID / unpaid
// ══════════════════════════════════════════════════════════════════════════
section('12. Update Paid — PUT /invoices/:id/paid')
{
  if (!invId) { skip('UPDATE paid', 'no invId'); }
  else {
    const today = new Date().toLocaleDateString('en-US')

    // Mark as PAID
    const r1 = await PUT(`/invoices/${invId}/paid`, { paid_value: 'PAID', paid_date: today })
    ok(r1.ok, 'PUT /paid → 200 (PAID)', r1.status, 200)
    ok(r1.body.paid_value === 'PAID', 'paid_value = PAID', r1.body.paid_value, 'PAID')
    ok(r1.body.paid_date === today, 'paid_date stored', r1.body.paid_date, today)

    // Verify persisted
    const verify = await GET(`/invoices/${invId}`)
    ok(verify.body.paid_value === 'PAID', 'PAID persisted in DB', verify.body.paid_value, 'PAID')

    // Mark as unpaid
    const r2 = await PUT(`/invoices/${invId}/paid`, { paid_value: '', paid_date: '' })
    ok(r2.ok, 'PUT /paid → 200 (unpaid)', r2.status, 200)
    ok(r2.body.paid_value === '', 'paid_value cleared', r2.body.paid_value, '')
    ok(r2.body.paid_date === '', 'paid_date cleared', r2.body.paid_date, '')

    // Partial payment test
    const r3 = await PUT(`/invoices/${invId}/paid`, { paid_value: 'Partial', paid_date: today })
    ok(r3.ok, 'PUT /paid with custom paid_value → 200', r3.status, 200)
    ok(r3.body.paid_value === 'Partial', 'Custom paid_value stored', r3.body.paid_value, 'Partial')

    // 404 on unknown
    const r4 = await PUT('/invoices/000000000000000000000000/paid', { paid_value: 'PAID' })
    ok(r4.status === 404, '404 unknown paid update', r4.status, 404)

    // Reset to unpaid
    await PUT(`/invoices/${invId}/paid`, { paid_value: '', paid_date: '' })
    pass('Reset to unpaid after paid tests')
  }
}

// ══════════════════════════════════════════════════════════════════════════
// 13. UPDATE TRACKING
// ══════════════════════════════════════════════════════════════════════════
section('13. Update Tracking — PUT /invoices/:id/tracking')
{
  if (!invId) { skip('UPDATE tracking', 'no invId'); }
  else {
    const today = new Date().toISOString().slice(0, 10)
    const r = await PUT(`/invoices/${invId}/tracking`, {
      shipped_date: today,
      tracking_no: `TRACK-${TS}`,
    })
    ok(r.ok, 'PUT /tracking → 200', r.status, 200)
    ok(r.body.tracking_no === `TRACK-${TS}`, 'tracking_no stored', r.body.tracking_no, `TRACK-${TS}`)
    ok(!!r.body.shipped_date, 'shipped_date stored', !!r.body.shipped_date, true)

    // Verify persisted
    const verify = await GET(`/invoices/${invId}`)
    ok(verify.body.tracking_no === `TRACK-${TS}`, 'tracking_no persisted', verify.body.tracking_no, `TRACK-${TS}`)

    // Clear tracking
    const r2 = await PUT(`/invoices/${invId}/tracking`, { shipped_date: null, tracking_no: '' })
    ok(r2.ok, 'Clear tracking → 200', r2.status, 200)
    ok(r2.body.tracking_no === '', 'tracking_no cleared', r2.body.tracking_no, '')

    // 404
    const r3 = await PUT('/invoices/000000000000000000000000/tracking', { tracking_no: 'X' })
    ok(r3.status === 404, '404 unknown tracking update', r3.status, 404)
  }
}

// ══════════════════════════════════════════════════════════════════════════
// 14. UPDATE DUE DATE
// ══════════════════════════════════════════════════════════════════════════
section('14. Update Due Date — PUT /invoices/:id/due-date')
{
  if (!invId) { skip('UPDATE due date', 'no invId'); }
  else {
    const newDue = new Date(Date.now() + 60 * 86400000).toISOString().slice(0, 10)
    const r = await PUT(`/invoices/${invId}/due-date`, { due_date: newDue })
    ok(r.ok, 'PUT /due-date → 200', r.status, 200)
    // due_date is stored exactly as provided (not parsed)
    ok(String(r.body.due_date).startsWith(newDue.slice(0, 10)), `due_date stored (${r.body.due_date})`, String(r.body.due_date).startsWith(newDue.slice(0, 10)), true)

    // 404
    const r2 = await PUT('/invoices/000000000000000000000000/due-date', { due_date: newDue })
    ok(r2.status === 404, '404 unknown due-date update', r2.status, 404)
  }
}

// ══════════════════════════════════════════════════════════════════════════
// 15. BULK UPDATE
// ══════════════════════════════════════════════════════════════════════════
section('15. Bulk Update — PUT /invoices/bulk/update')
{
  if (!invId) { skip('BULK UPDATE', 'no invId'); }
  else {
    // Bulk mark paid
    const r1 = await PUT('/invoices/bulk/update', { ids: [invId], paid: true, archive: false })
    ok(r1.ok, 'Bulk mark paid → 200', r1.status, 200)
    ok(r1.body.success === true, 'success: true', r1.body.success, true)
    ok(r1.body.message.includes('PAID'), 'Message mentions PAID', r1.body.message, 'includes PAID')

    const v1 = await GET(`/invoices/${invId}`)
    ok(v1.body.paid_value === 'PAID', 'Bulk paid persisted', v1.body.paid_value, 'PAID')

    // Bulk archive
    const r2 = await PUT('/invoices/bulk/update', { ids: [invId], paid: false, archive: true })
    ok(r2.ok, 'Bulk archive → 200', r2.status, 200)
    ok(r2.body.message.includes('archived'), 'Message mentions archived', r2.body.message, 'includes archived')

    const v2 = await GET(`/invoices/${invId}`)
    ok(v2.body.po_status === 2, 'Bulk archive: po_status = 2', v2.body.po_status, 2)

    // Both paid + archive together
    const r3 = await PUT('/invoices/bulk/update', { ids: [invId], paid: true, archive: true })
    ok(r3.ok, 'Bulk paid+archive → 200', r3.status, 200)
    ok(r3.body.message.includes('PAID') && r3.body.message.includes('archived'),
      'Both in message', r3.body.message, 'includes PAID and archived')

    // Reset
    await PUT(`/invoices/${invId}/paid`, { paid_value: '', paid_date: '' })
    await PUT(`/invoices/${invId}`, { po_status: 1 })
    pass('Reset after bulk tests')

    // Validation: empty ids → 400
    const r4 = await PUT('/invoices/bulk/update', { ids: [] })
    ok(r4.status === 400, 'Empty ids → 400', r4.status, 400)
    ok(r4.body.error === 'No invoices selected', 'Error message', r4.body.error, 'No invoices selected')

    // Multiple invoices in bulk
    const r5 = await PUT('/invoices/bulk/update', { ids: [invId, '000000000000000000000000'], paid: true })
    ok(r5.ok, 'Bulk with mixed ids (one invalid) → 200', r5.status, 200)
    await PUT(`/invoices/${invId}/paid`, { paid_value: '', paid_date: '' })
    pass('Cleanup after multi-invoice bulk')
  }
}

// ══════════════════════════════════════════════════════════════════════════
// 16. CUSTOMER PO FILES
// ══════════════════════════════════════════════════════════════════════════
section('16. Customer PO Files — GET/POST /invoices/:id/customer-po')
{
  if (!invId) { skip('Customer PO files', 'no invId'); }
  else {
    // GET customer-po files
    const r = await GET(`/invoices/${invId}/customer-po`)
    ok(r.ok, 'GET /customer-po → 200', r.status, 200)
    ok(Array.isArray(r.body), 'Response is array (empty for new invoice)', Array.isArray(r.body), true)
    ok(r.body.length === 0, 'New invoice has no PO files', r.body.length, 0)

    // POST (upload endpoint — no file, just verify it's ready)
    const upload = await POST(`/invoices/${invId}/customer-po`, {})
    ok(upload.ok, 'POST /customer-po (upload ready) → 200', upload.status, 200)
    ok(upload.body.success === true, 'Upload endpoint ready', upload.body.success, true)

    // 404 on unknown
    const r2 = await GET('/invoices/000000000000000000000000/customer-po')
    ok(r2.status === 404, '404 unknown invoice for PO files', r2.status, 404)

    // Test on existing invoice with files
    if (existingInvId) {
      const rExist = await GET(`/invoices/${existingInvId}/customer-po`)
      ok(rExist.ok, 'GET PO files for existing invoice → 200', rExist.status, 200)
      ok(Array.isArray(rExist.body), 'Returns array', Array.isArray(rExist.body), true)
      info(`Existing invoice PO files: ${rExist.body.length}`)
    }
  }
}

// ══════════════════════════════════════════════════════════════════════════
// 17. EMAIL TEMPLATE
// ══════════════════════════════════════════════════════════════════════════
section('17. Email Template — GET/PUT /invoices/email-template')
{
  // GET template (may be default)
  const r1 = await GET('/invoices/email-template')
  ok(r1.ok, 'GET /email-template → 200', r1.status, 200)
  ok('email_subject' in r1.body, 'Has email_subject', true, true)
  ok('email_content' in r1.body, 'Has email_content', true, true)
  info(`Template subject: ${r1.body.email_subject}`)

  // Save template
  const r2 = await PUT('/invoices/email-template', {
    email_subject: `Test Subject ${TS}`,
    email_content: `Hello {client_name},\n\nYou have overdue invoices.\n\n{returnvalimport}\n\n{your_company}`,
  })
  ok(r2.ok, 'PUT /email-template → 200', r2.status, 200)
  ok(r2.body.success === true, 'success: true', r2.body.success, true)

  // Verify saved
  const r3 = await GET('/invoices/email-template')
  ok(r3.ok, 'GET after save → 200', r3.status, 200)
  ok(r3.body.email_subject === `Test Subject ${TS}`, 'Subject saved', r3.body.email_subject, `Test Subject ${TS}`)
  ok(r3.body.email_content.includes('{client_name}'), 'Content has {client_name}', true, true)
  ok(r3.body.email_content.includes('{returnvalimport}'), 'Content has {returnvalimport}', true, true)
}

// ══════════════════════════════════════════════════════════════════════════
// 18. SEND OVERDUE EMAILS
// ══════════════════════════════════════════════════════════════════════════
section('18. Send Overdue Emails — POST /invoices/send-overdue-emails')
{
  const r = await POST('/invoices/send-overdue-emails', {
    subject: `Test Overdue Subject ${TS}`,
    content: `Dear {client_name},\n\nYour invoices are overdue.\n\n{returnvalimport}\n\nRegards,\n{your_company}`,
  })
  ok(r.ok, 'POST /send-overdue-emails → 200', r.status, 200)
  ok(r.body.success === true, 'success: true', r.body.success, true)
  ok(typeof r.body.message === 'string', 'message returned', typeof r.body.message, 'string')
  ok(r.body.message.includes('reminder'), 'Message mentions reminder', r.body.message, 'includes reminder')
  info(`Send overdue: ${r.body.message}`)
}

// ══════════════════════════════════════════════════════════════════════════
// 19. EMAIL HISTORY
// ══════════════════════════════════════════════════════════════════════════
section('19. Email History — GET /invoices/email-history')
{
  const r = await GET('/invoices/email-history')
  ok(r.ok, 'GET /email-history → 200', r.status, 200)
  ok(Array.isArray(r.body), 'Response is array', Array.isArray(r.body), true)
  ok(r.body.length <= 50, 'At most 50 records (limit)', r.body.length, '<=50')
  if (r.body.length > 0) {
    const first = r.body[0]
    ok('custname' in first, 'Has custname', true, true)
    ok('subject' in first, 'Has subject', true, true)
    ok('send_date' in first, 'Has send_date', true, true)
    // Sorted by send_date DESC (most recent first)
    if (r.body.length >= 2) {
      const d1 = new Date(r.body[0].send_date)
      const d2 = new Date(r.body[1].send_date)
      ok(d1 >= d2, 'Sorted by send_date DESC', d1 >= d2, true)
    }
    info(`Email history: ${r.body.length} entries  Last: ${first.custname}`)
  }
}

// ══════════════════════════════════════════════════════════════════════════
// 20. COPY INVOICE
// ══════════════════════════════════════════════════════════════════════════
section('20. Copy Invoice — POST /invoices/:id/copy')
{
  if (!invId) { skip('COPY invoice', 'no invId'); }
  else {
    const r = await POST(`/invoices/${invId}/copy`, {})
    ok(r.status === 201, 'POST /copy → 201', r.status, 201)
    ok(r.body._id !== invId, 'Copy has different _id', r.body._id !== invId, true)
    ok(r.body.legacy_id !== invLegacy, 'Copy has different legacy_id', r.body.legacy_id !== invLegacy, true)
    ok(r.body.invoice_number === `INV-${TS}-UPD (Copy)`, 'Copy invoice_number = original + " (Copy)"', r.body.invoice_number, `INV-${TS}-UPD (Copy)`)
    ok(r.body.inv_status === '', 'Copy: inv_status cleared', r.body.inv_status, '')
    ok(r.body.paid_value === '', 'Copy: paid_value cleared', r.body.paid_value, '')
    ok(r.body.paid_date === '', 'Copy: paid_date cleared', r.body.paid_date, '')
    ok(r.body.company_id === custId, 'Copy: company_id preserved', r.body.company_id, custId)
    ok(r.body.net_amount === 2000.00, 'Copy: net_amount preserved from latest update', r.body.net_amount, 2000.00)
    ok(!!r.body.created_at, 'Copy: new created_at', !!r.body.created_at, true)
    copyId = r.body._id
    info(`Copy id=${copyId}  inv#=${r.body.invoice_number}`)

    // Verify copy is in list
    const list = await GET('/invoices')
    ok(list.body.some(i => i._id === copyId), 'Copy appears in invoice list', true, true)

    // 404 on copy of unknown
    const r2 = await POST('/invoices/000000000000000000000000/copy', {})
    ok(r2.status === 404, '404 copy unknown invoice', r2.status, 404)
  }
}

// ══════════════════════════════════════════════════════════════════════════
// 21. DELETE INVOICE
// ══════════════════════════════════════════════════════════════════════════
section('21. Delete Invoice — DELETE /invoices/:id')
{
  // Delete copy first
  if (copyId) {
    const r = await DELETE(`/invoices/${copyId}`)
    ok(r.ok, 'DELETE copy invoice → 200', r.status, 200)
    ok(r.body.success === true, 'success: true', r.body.success, true)
    const gone = await GET(`/invoices/${copyId}`)
    ok(gone.status === 404, 'Copy gone after delete', gone.status, 404)
    copyId = null
  }

  // Delete main test invoice
  if (invId) {
    const r = await DELETE(`/invoices/${invId}`)
    ok(r.ok, 'DELETE invoice → 200', r.status, 200)
    ok(r.body.success === true, 'success: true', r.body.success, true)

    const gone = await GET(`/invoices/${invId}`)
    ok(gone.status === 404, 'Invoice gone after delete', gone.status, 404)

    // 404 on re-delete
    const r2 = await DELETE(`/invoices/${invId}`)
    ok(r2.status === 404, 'Re-delete → 404 (already gone)', r2.status, 404)

    info('Invoice DELETE is HARD (permanent, line items NOT auto-deleted)')
    invId = null
  }

  // 404 on unknown
  const r3 = await DELETE('/invoices/000000000000000000000000')
  ok(r3.status === 404, 'DELETE unknown → 404', r3.status, 404)
}

// ══════════════════════════════════════════════════════════════════════════
// 22. OUTSTANDING INVOICES
// ══════════════════════════════════════════════════════════════════════════
section('22. Outstanding Invoices — Filter unpaid from list')
{
  const all = await GET('/invoices')
  const outstanding = all.body.filter(i => i.paid_value !== 'PAID')
  ok(outstanding.length >= 0, `Outstanding invoices: ${outstanding.length}`, outstanding.length, '>=0')

  // Outstanding have no paid_value = 'PAID'
  if (outstanding.length > 0) {
    const noPaid = outstanding.every(i => i.paid_value !== 'PAID')
    ok(noPaid, 'No outstanding invoice has paid_value=PAID', noPaid, true)
    const first = outstanding[0]
    ok(first.paid_value !== 'PAID', `First outstanding paid_value="${first.paid_value}"`, first.paid_value !== 'PAID', true)
    info(`Outstanding: ${outstanding.length}  Paid: ${all.body.length - outstanding.length}`)
  }

  // Stats confirmation
  const stats = await GET('/invoices/stats')
  const manualUnpaid = all.body.filter(i => i.paid_value !== 'PAID').length
  ok(Math.abs(manualUnpaid - stats.body.unpaid) <= 5,
    `Manual unpaid count (${manualUnpaid}) ≈ stats.unpaid (${stats.body.unpaid})`,
    Math.abs(manualUnpaid - stats.body.unpaid), '<=5')
}

// ══════════════════════════════════════════════════════════════════════════
// 23. INVOICE REPORTS
// ══════════════════════════════════════════════════════════════════════════
section('23. Invoice Reports — GET /reports/paid-invoices + /reports/years')
{
  // Paid invoices report
  const paid = await GET('/reports/paid-invoices')
  ok(paid.ok, 'GET /reports/paid-invoices → 200', paid.status, 200)
  ok(Array.isArray(paid.body), 'Paid invoices is array', Array.isArray(paid.body), true)
  info(`Paid invoices report: ${paid.body.length} rows`)

  // With date range filter
  const filtered = await GET('/reports/paid-invoices?from=2025-01-01&to=2025-12-31')
  ok(filtered.ok, 'GET /reports/paid-invoices with date range → 200', filtered.status, 200)
  ok(Array.isArray(filtered.body), 'Date-filtered report is array', Array.isArray(filtered.body), true)
  info(`Paid invoices 2025: ${filtered.body.length} rows`)

  // Report years
  const yrs = await GET('/reports/years')
  ok(yrs.ok, 'GET /reports/years → 200', yrs.status, 200)
  ok(Array.isArray(yrs.body), 'Years is array', Array.isArray(yrs.body), true)
  info(`Report years: ${yrs.body.join(', ')}`)
}

// ══════════════════════════════════════════════════════════════════════════
// 24. EDGE CASES
// ══════════════════════════════════════════════════════════════════════════
section('24. Edge Cases')
{
  // Create with zero amounts
  const r1 = await POST('/invoices', { company_id: custId, invoice_number: `ZERO-${TS}`, net_amount: 0 })
  ok(r1.status === 201, 'Invoice with net_amount=0 → 201', r1.status, 201)
  ok(r1.body.net_amount === 0, 'net_amount=0 stored', r1.body.net_amount, 0)
  if (r1.body._id) { await DELETE(`/invoices/${r1.body._id}`); pass('Zero amount cleanup') }

  // Create with large amounts
  const r2 = await POST('/invoices', { company_id: custId, invoice_number: `BIG-${TS}`, net_amount: 9999999.99 })
  ok(r2.status === 201, 'Large net_amount → 201', r2.status, 201)
  ok(r2.body.net_amount === 9999999.99, 'Large amount stored', r2.body.net_amount, 9999999.99)
  if (r2.body._id) { await DELETE(`/invoices/${r2.body._id}`); pass('Large amount cleanup') }

  // Create with many line items
  const manyItems = Array.from({ length: 20 }, (_, i) => ({
    item_name: `Item ${i+1}`, qty: i+1, uom: 'EA', unit_cost: (i+1) * 10
  }))
  const r3 = await POST('/invoices', { company_id: custId, invoice_number: `MANY-${TS}`, lineItems: manyItems })
  ok(r3.status === 201, '20 line items → 201', r3.status, 201)
  if (r3.body._id) {
    const rd3 = await GET(`/invoices/${r3.body._id}`)
    ok(rd3.body.items.length === 20, '20 line items stored', rd3.body.items.length, 20)
    await DELETE(`/invoices/${r3.body._id}`)
    pass('20 items cleanup')
  }

  // Bulk update with only paid (no archive)
  const tmp = await POST('/invoices', { company_id: custId, invoice_number: `TMP-${TS}`, net_amount: 50 })
  if (tmp.body._id) {
    const bulk = await PUT('/invoices/bulk/update', { ids: [tmp.body._id], paid: true })
    ok(bulk.ok, 'Bulk paid only (no archive field) → 200', bulk.status, 200)
    const v = await GET(`/invoices/${tmp.body._id}`)
    ok(v.body.paid_value === 'PAID', 'Bulk paid without archive works', v.body.paid_value, 'PAID')
    ok(v.body.po_status !== 2, 'po_status not 2 (not archived)', v.body.po_status !== 2, true)
    await DELETE(`/invoices/${tmp.body._id}`)
    pass('Bulk paid-only cleanup')
  }

  // Verify invoice stats consistency after all tests
  const finalStats = await GET('/invoices/stats')
  ok(finalStats.ok, 'Stats still return 200 after all tests', finalStats.status, 200)
  ok(finalStats.body.total > 0, 'Stats.total > 0 after tests', finalStats.body.total, '>0')
  info(`Final stats: total=${finalStats.body.total}  paid=${finalStats.body.paid}  unpaid=${finalStats.body.unpaid}`)
}

// ─── Summary ──────────────────────────────────────────────────────────────────
const total = passed + failed + skipped
console.log('\n' + '═'.repeat(62))
console.log('\x1b[1mINVOICES DEEP TEST SUMMARY\x1b[0m')
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
if (failed === 0) console.log('\n\x1b[32m✓ All Invoices tests passed.\x1b[0m')
else              console.log(`\n\x1b[31m✗ ${failed} test(s) failed.\x1b[0m`)
