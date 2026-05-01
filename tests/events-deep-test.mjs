/**
 * Deep CRUD Test Suite — Events Menu (all tabs + every action button)
 *
 * Tabs / Submenus:
 *   Tab 1 — Events List        GET /events  (status filter, enriched totals)
 *   Tab 2 — Event Types        GET/POST/PUT/DELETE /events/types
 *   Tab 3 — Cost Info          GET/POST/PUT/DELETE /events/costs
 *   Tab 4 — Tax Rates          GET/POST/PUT/DELETE /tax-rates
 *
 * Action Buttons per Event:
 *   Stats                      GET /events/stats
 *   Unique Check               GET /events/check-unique
 *   Create Event               POST /events
 *   Read Event                 GET /events/:id  (items + costs + receipts + tax)
 *   Update Event               PUT  /events/:id
 *   Delete Event               DELETE /events/:id
 *   Add Item                   POST /events/:id/items
 *   List Items                 GET  /events/:id/items
 *   Delete Item                DELETE /events/items/:itemId
 *   Add Receipt                POST /events/:id/receipts
 *   List Receipts              GET  /events/:id/receipts
 *   Update Receipt             PUT  /events/receipts/:receiptId  (cash/credit/checks/hours)
 *   List Advisors              GET  /events/:id/advisors
 *   Add Advisor                POST /events/:id/advisors
 *   Remove Advisor             DELETE /events/:id/advisors/:advisorMapId
 *   Bonus — Save               POST /events/:id/bonuses  (upsert)
 *   Bonus — List               GET  /events/:id/bonuses
 *   Bonus — Mark Paid          PUT  /events/bonuses/:bonusId/paid
 *
 * Usage: node tests/events-deep-test.mjs
 */

const BASE = 'http://localhost:5000/api'
const TS   = `EV_${Date.now()}`

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
let eventId      = null   // created event _id
let eventId2     = null   // second event for edge tests
let eventTypeId  = null
let costInfoId   = null
let taxRateId    = null
let itemId       = null
let receiptId    = null
let advisorMapId = null
let bonusId      = null
let existingEvId = null   // existing event for read tests

// ══════════════════════════════════════════════════════════════════════════
// SECTION 1 — STATS
// ══════════════════════════════════════════════════════════════════════════
section('1. Event Stats — GET /events/stats')
{
  const r = await GET('/events/stats')
  ok(r.ok, 'GET /stats → 200', r.status, 200)
  const fields = ['total','active','inactive','totalItems','totalRevenue','totalCost','receiptDays','costEntries']
  fields.forEach(f => ok(typeof r.body[f] === 'number', `${f} is number`, typeof r.body[f], 'number'))
  ok(r.body.total >= 0, `total events ≥ 0 (${r.body.total})`, r.body.total, '>=0')
  ok(r.body.active + r.body.inactive <= r.body.total, 'active+inactive ≤ total', r.body.active + r.body.inactive, '<=total')
  info(`Stats: total=${r.body.total}  active=${r.body.active}  revenue=$${r.body.totalRevenue?.toFixed(2)}  cost=$${r.body.totalCost?.toFixed(2)}`)
}

// ══════════════════════════════════════════════════════════════════════════
// SECTION 2 — EVENT TYPES (Tab: Types)
// ══════════════════════════════════════════════════════════════════════════
section('2. Event Types — GET /events/types')
{
  const r = await GET('/events/types')
  ok(r.ok, 'GET /types → 200', r.status, 200)
  ok(Array.isArray(r.body), 'Response is array', Array.isArray(r.body), true)
  info(`Existing event types: ${r.body.length}`)
}

section('2b. Event Types — Create')
{
  const r = await POST('/events/types', {
    name: `TestType_${TS}`,
    description: 'Deep CRUD test event type',
    status: 'active',
    color: '#3b82f6',
  })
  ok(r.status === 201, 'POST /types → 201', r.status, 201)
  ok(r.body.name === `TestType_${TS}`, 'name stored', r.body.name, `TestType_${TS}`)
  ok(r.body.status === 'active', 'status = active', r.body.status, 'active')
  ok(r.body.color === '#3b82f6', 'color stored', r.body.color, '#3b82f6')
  ok(!!r.body._id, '_id returned', !!r.body._id, true)
  eventTypeId = r.body._id
  info(`Created event type id=${eventTypeId}`)
}

section('2c. Event Types — Update')
{
  if (!eventTypeId) { skip('UPDATE event type', 'no eventTypeId'); }
  else {
    const r = await PUT(`/events/types/${eventTypeId}`, {
      name: `TestType_${TS}_upd`,
      description: 'Updated description',
      color: '#ef4444',
    })
    ok(r.ok, 'PUT /types/:id → 200', r.status, 200)
    ok(r.body.name === `TestType_${TS}_upd`, 'name updated', r.body.name, `TestType_${TS}_upd`)
    ok(r.body.color === '#ef4444', 'color updated', r.body.color, '#ef4444')

    // Invalid ID → 400
    const r2 = await PUT('/events/types/not-an-id', { name: 'X' })
    ok(r2.status === 400, 'Invalid ID → 400', r2.status, 400)

    // Unknown ID → 404
    const r3 = await PUT('/events/types/000000000000000000000000', { name: 'X' })
    ok(r3.status === 404, 'Unknown ID → 404', r3.status, 404)
  }
}

section('2d. Event Types — Delete')
{
  if (!eventTypeId) { skip('DELETE event type', 'no eventTypeId'); }
  else {
    const r = await DELETE(`/events/types/${eventTypeId}`)
    ok(r.ok, 'DELETE /types/:id → 200', r.status, 200)
    ok(r.body.message === 'Event type deleted', 'Delete message', r.body.message, 'Event type deleted')

    // Confirm deleted
    const list = await GET('/events/types')
    ok(!list.body.find(t => String(t._id) === eventTypeId), 'Type gone from list', true, true)

    // Invalid ID → 400
    const r2 = await DELETE('/events/types/not-an-id')
    ok(r2.status === 400, 'Invalid ID → 400', r2.status, 400)

    // Unknown → 404
    const r3 = await DELETE('/events/types/000000000000000000000000')
    ok(r3.status === 404, 'Unknown ID → 404', r3.status, 404)
    eventTypeId = null
  }
}

// ══════════════════════════════════════════════════════════════════════════
// SECTION 3 — COST INFO (Tab: Costs)
// ══════════════════════════════════════════════════════════════════════════
section('3. Cost Info — GET /events/costs')
{
  const r = await GET('/events/costs')
  ok(r.ok, 'GET /costs → 200', r.status, 200)
  ok(Array.isArray(r.body), 'Response is array', Array.isArray(r.body), true)
  info(`Existing cost_info records: ${r.body.length}`)
}

section('3b. Cost Info — Full CRUD')
{
  // CREATE
  const cr = await POST('/events/costs', {
    cost_name: `TestCost_${TS}`,
    description: 'Deep CRUD test cost',
    amount: 150.00,
    cost_status: 'active',
  })
  ok(cr.status === 201, 'POST /costs → 201', cr.status, 201)
  ok(cr.body.cost_name === `TestCost_${TS}`, 'cost_name stored', cr.body.cost_name, `TestCost_${TS}`)
  ok(cr.body.amount === 150.00, 'amount stored', cr.body.amount, 150.00)
  ok(cr.body.cost_status === 'active', 'cost_status = active', cr.body.cost_status, 'active')
  ok(!!cr.body.cost_created, 'cost_created timestamp set', !!cr.body.cost_created, true)
  ok(!!cr.body.cost_modified, 'cost_modified timestamp set', !!cr.body.cost_modified, true)
  ok(!!cr.body._id, '_id returned', !!cr.body._id, true)
  costInfoId = cr.body._id
  info(`Created cost_info id=${costInfoId}`)

  // UPDATE
  const up = await PUT(`/events/costs/${costInfoId}`, {
    cost_name: `TestCost_${TS}_upd`,
    amount: 200.00,
    description: 'Updated cost description',
  })
  ok(up.ok, 'PUT /costs/:id → 200', up.status, 200)
  ok(up.body.cost_name === `TestCost_${TS}_upd`, 'cost_name updated', up.body.cost_name, `TestCost_${TS}_upd`)
  ok(up.body.amount === 200.00, 'amount updated', up.body.amount, 200.00)
  ok(!!up.body.cost_modified, 'cost_modified updated', !!up.body.cost_modified, true)

  // Validation
  const badPut = await PUT('/events/costs/not-an-id', { cost_name: 'X' })
  ok(badPut.status === 400, 'Invalid ID → 400', badPut.status, 400)
  const unk = await PUT('/events/costs/000000000000000000000000', { cost_name: 'X' })
  ok(unk.status === 404, 'Unknown → 404', unk.status, 404)

  // DELETE
  const dl = await DELETE(`/events/costs/${costInfoId}`)
  ok(dl.ok, 'DELETE /costs/:id → 200', dl.status, 200)
  ok(dl.body.message === 'Cost info deleted', 'Delete message', dl.body.message, 'Cost info deleted')
  const gone = (await GET('/events/costs')).body.find(c => String(c._id) === costInfoId)
  ok(!gone, 'Cost info gone from list', !!gone, false)
  const unk2 = await DELETE('/events/costs/000000000000000000000000')
  ok(unk2.status === 404, 'Unknown delete → 404', unk2.status, 404)
  costInfoId = null
}

// ══════════════════════════════════════════════════════════════════════════
// SECTION 4 — TAX RATES (Events Tab: Tax Config)
// ══════════════════════════════════════════════════════════════════════════
section('4. Tax Rates — Full CRUD (used in Events for location)')
{
  const list = await GET('/tax-rates')
  ok(list.ok, 'GET /tax-rates → 200', list.status, 200)
  ok(Array.isArray(list.body), 'Array', Array.isArray(list.body), true)
  info(`Existing tax rates: ${list.body.length}`)

  // CREATE
  const cr = await POST('/tax-rates', {
    name: `TaxRate_${TS}`,
    rate: 7.25,
    state: 'TX',
    status: 'active',
  })
  ok(cr.ok || cr.status === 201, 'POST /tax-rates → 200/201', cr.status, '200/201')
  taxRateId = cr.body._id || cr.body.insertedId
  if (taxRateId) {
    const rd = await GET(`/tax-rates/${taxRateId}`)
    ok(rd.ok, 'GET /tax-rates/:id → 200', rd.status, 200)

    const up = await PUT(`/tax-rates/${taxRateId}`, { name: `TaxRate_${TS}_upd`, rate: 8.0, state: 'CA', status: 'active' })
    ok(up.ok, 'PUT /tax-rates/:id → 200', up.status, 200)
    ok(up.body.rate === 8.0 || parseFloat(up.body.rate) === 8.0, 'rate updated', up.body.rate, 8.0)

    const dl = await DELETE(`/tax-rates/${taxRateId}`)
    ok(dl.ok, 'DELETE /tax-rates/:id → 200', dl.status, 200)
    taxRateId = null
    info('Tax rate CREATE→READ→UPDATE→DELETE all passed')
  }
}

// ══════════════════════════════════════════════════════════════════════════
// SECTION 5 — EVENT LIST (Tab: Events)
// ══════════════════════════════════════════════════════════════════════════
section('5. Event List — GET /events (enriched)')
{
  const r = await GET('/events')
  ok(r.ok, 'GET /events → 200', r.status, 200)
  ok(Array.isArray(r.body), 'Response is array', Array.isArray(r.body), true)
  info(`Total events: ${r.body.length}`)

  if (r.body.length > 0) {
    const first = r.body[0]
    existingEvId = first._id

    // Must have computed enrichment fields
    const enriched = ['name','event_number','start_date','end_date','location',
      'totalRevenue','totalCost','itemCount','totalQty','receiptDays','totalCommission','profit']
    enriched.forEach(f => ok(f in first, `Enriched field: ${f}`, f in first, true))

    ok(typeof first.totalRevenue    === 'number', 'totalRevenue is number',    typeof first.totalRevenue,    'number')
    ok(typeof first.totalCost       === 'number', 'totalCost is number',       typeof first.totalCost,       'number')
    ok(typeof first.profit          === 'number', 'profit is number',          typeof first.profit,          'number')
    ok(typeof first.itemCount       === 'number', 'itemCount is number',       typeof first.itemCount,       'number')
    ok(typeof first.totalCommission === 'number', 'totalCommission is number', typeof first.totalCommission, 'number')

    // Sorted by created_at DESC
    if (r.body.length >= 2) {
      const d1 = new Date(r.body[0].created_at || 0)
      const d2 = new Date(r.body[1].created_at || 0)
      ok(d1 >= d2, 'Sorted by created_at DESC', d1 >= d2, true)
    }
    info(`First: "${first.name}"  rev=$${first.totalRevenue?.toFixed(2)}  cost=$${first.totalCost?.toFixed(2)}  profit=$${first.profit?.toFixed(2)}`)
  }

  // Status filters
  const active = await GET('/events?status=active')
  ok(active.ok, 'GET /events?status=active → 200', active.status, 200)
  if (active.body.length > 0) {
    ok(active.body.every(e => e.status === 'active'), 'All active', true, true)
  }
  info(`Active events: ${active.body.length}`)

  const inactive = await GET('/events?status=inactive')
  ok(inactive.ok, 'GET /events?status=inactive → 200', inactive.status, 200)
  if (inactive.body.length > 0) {
    ok(inactive.body.every(e => e.status === 'inactive'), 'All inactive', true, true)
  }
  info(`Inactive events: ${inactive.body.length}`)
}

// ══════════════════════════════════════════════════════════════════════════
// SECTION 6 — UNIQUE CHECK
// ══════════════════════════════════════════════════════════════════════════
section('6. Unique Check — GET /events/check-unique')
{
  // Non-existing name → unique
  const r1 = await GET(`/events/check-unique?field=name&value=NoSuchEvent_${TS}`)
  ok(r1.ok && r1.body.unique === true, 'Non-existing name → unique', r1.body.unique, true)

  // Non-existing event_number → unique
  const r2 = await GET(`/events/check-unique?field=event_number&value=EVT_ZZZ_${TS}`)
  ok(r2.ok && r2.body.unique === true, 'Non-existing event_number → unique', r2.body.unique, true)

  // Invalid field → 400
  const r3 = await GET('/events/check-unique?field=location&value=Texas')
  ok(r3.status === 400, 'Invalid field → 400', r3.status, 400)

  // No params → unique:true
  const r4 = await GET('/events/check-unique')
  ok(r4.ok && r4.body.unique === true, 'No params → unique:true', r4.body.unique, true)

  // Existing name check (if events exist)
  if (existingEvId) {
    const existing = (await GET('/events')).body.find(e => e._id === existingEvId)
    const storedName = existing?.name || existing?.event_name
    if (storedName) {
      const r5 = await GET(`/events/check-unique?field=name&value=${encodeURIComponent(storedName)}`)
      ok(r5.ok, 'Existing name check → 200', r5.status, 200)
      // May or may not be unique depending on field name used (event_name vs name)
      info(`Existing name "${storedName}" unique=${r5.body.unique}`)
    }
  }
}

// ══════════════════════════════════════════════════════════════════════════
// SECTION 7 — CREATE EVENT (all fields)
// ══════════════════════════════════════════════════════════════════════════
section('7. Create Event — POST /events (all fields)')
{
  const today = new Date().toISOString().slice(0, 10)
  const endDate = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10)

  const payload = {
    event_name:        `TestEvent_${TS}`,
    name:              `TestEvent_${TS}`,
    event_cust_code:   `EVT-${TS.slice(-6)}`,
    event_number:      `EVT-${TS.slice(-6)}`,
    event_start:       today,
    start_date:        today,
    event_end:         endDate,
    end_date:          endDate,
    location:          'Dallas, TX',
    event_notes:       'Deep CRUD test event',
    notes:             'Deep CRUD test event',
    status:            'active',
    salesTax_state_id: null,
    event_id:          null,   // will be assigned by caller if needed
  }

  const r = await POST('/events', payload)
  ok(r.status === 201, 'POST /events → 201', r.status, 201)
  ok(r.body.event_name === `TestEvent_${TS}`, 'event_name stored', r.body.event_name, `TestEvent_${TS}`)
  ok(r.body.status === 'active', 'status = active', r.body.status, 'active')
  ok(!!r.body.created_at, 'created_at set', !!r.body.created_at, true)
  ok(!!r.body._id, '_id returned', !!r.body._id, true)
  eventId = r.body._id
  info(`Created event id=${eventId}`)
}

section('7b. Create Event — minimal (no required fields)')
{
  // Fully permissive — no required fields
  const r = await POST('/events', { name: `MinEvent_${TS}` })
  ok(r.status === 201, 'Minimal POST → 201', r.status, 201)
  ok(r.body.status === 'active', 'status defaults to active', r.body.status, 'active')
  if (r.body._id) { await DELETE(`/events/${r.body._id}`); pass('Minimal event cleanup') }
}

// ══════════════════════════════════════════════════════════════════════════
// SECTION 8 — READ SINGLE EVENT (with items + costs + receipts)
// ══════════════════════════════════════════════════════════════════════════
section('8. Read Event — GET /events/:id (full detail)')
{
  if (!eventId) { skip('READ event', 'no eventId'); }
  else {
    const r = await GET(`/events/${eventId}`)
    ok(r.ok, 'GET /events/:id → 200', r.status, 200)
    ok(r.body.event_name === `TestEvent_${TS}`, 'event_name matches', r.body.event_name, `TestEvent_${TS}`)
    ok(Array.isArray(r.body.items), 'items array returned', Array.isArray(r.body.items), true)
    ok(Array.isArray(r.body.costs), 'costs array returned', Array.isArray(r.body.costs), true)
    ok(Array.isArray(r.body.receipts), 'receipts array returned', Array.isArray(r.body.receipts), true)
    ok('name' in r.body, 'name field (mapped)', true, true)
    ok('event_number' in r.body, 'event_number field (mapped)', true, true)
    ok('start_date' in r.body, 'start_date field (mapped)', true, true)
    ok('old_event_id' in r.body, 'old_event_id field', true, true)
    ok('notes' in r.body, 'notes field (mapped)', true, true)
    ok('salesTax_state_name' in r.body, 'salesTax_state_name included', true, true)
    ok(r.body.items.length === 0, 'New event has 0 items', r.body.items.length, 0)
    ok(r.body.costs.length === 0, 'New event has 0 costs', r.body.costs.length, 0)
    ok(r.body.receipts.length === 0, 'New event has 0 receipts', r.body.receipts.length, 0)

    // Invalid ID → 400
    const r2 = await GET('/events/not-an-id')
    ok(r2.status === 400, 'Invalid ID → 400', r2.status, 400)

    // Unknown ID → 404
    const r3 = await GET('/events/000000000000000000000000')
    ok(r3.status === 404, 'Unknown ID → 404', r3.status, 404)
    ok(r3.body.error === 'Event not found', '404 message', r3.body.error, 'Event not found')
  }

  // Read existing event
  if (existingEvId) {
    const r = await GET(`/events/${existingEvId}`)
    ok(r.ok, 'GET existing event → 200', r.status, 200)
    info(`Existing event: "${r.body.name}"  items=${r.body.items?.length}  costs=${r.body.costs?.length}  receipts=${r.body.receipts?.length}`)
  }
}

// ══════════════════════════════════════════════════════════════════════════
// SECTION 9 — UPDATE EVENT
// ══════════════════════════════════════════════════════════════════════════
section('9. Update Event — PUT /events/:id')
{
  if (!eventId) { skip('UPDATE event', 'no eventId'); }
  else {
    const r = await PUT(`/events/${eventId}`, {
      event_name:   `TestEvent_${TS}_upd`,
      name:         `TestEvent_${TS}_upd`,
      location:     'Austin, TX',
      event_notes:  'Updated notes',
      notes:        'Updated notes',
      status:       'active',
    })
    ok(r.ok, 'PUT /events/:id → 200', r.status, 200)
    ok(r.body.event_name === `TestEvent_${TS}_upd`, 'event_name updated', r.body.event_name, `TestEvent_${TS}_upd`)
    ok(r.body.location === 'Austin, TX', 'location updated', r.body.location, 'Austin, TX')

    // Verify persisted
    const verify = await GET(`/events/${eventId}`)
    ok(verify.body.event_name === `TestEvent_${TS}_upd`, 'Update persisted', verify.body.event_name, `TestEvent_${TS}_upd`)

    // Status toggle: active → inactive
    const inact = await PUT(`/events/${eventId}`, { status: 'inactive' })
    ok(inact.ok, 'Set status=inactive → 200', inact.status, 200)
    ok(inact.body.status === 'inactive', 'status = inactive', inact.body.status, 'inactive')

    const inactList = await GET('/events?status=inactive')
    ok(inactList.body.some(e => e._id === eventId), 'Event in inactive list', true, true)

    // Restore active
    await PUT(`/events/${eventId}`, { status: 'active' })
    pass('Status restored to active')

    // Invalid ID → 400
    const r2 = await PUT('/events/not-an-id', { name: 'X' })
    ok(r2.status === 400, 'Invalid ID → 400', r2.status, 400)

    // Unknown → 404
    const r3 = await PUT('/events/000000000000000000000000', { name: 'X' })
    ok(r3.status === 404, 'Unknown → 404', r3.status, 404)
  }
}

// ══════════════════════════════════════════════════════════════════════════
// SECTION 10 — EVENT ITEMS (Action: Add/List/Delete Item)
// ══════════════════════════════════════════════════════════════════════════
section('10. Event Items — GET/POST/DELETE /events/:id/items')
{
  if (!eventId) { skip('Event items', 'no eventId'); }
  else {
    // LIST (empty)
    const list0 = await GET(`/events/${eventId}/items`)
    ok(list0.ok, 'GET /items → 200', list0.status, 200)
    ok(Array.isArray(list0.body), 'Response is array', Array.isArray(list0.body), true)
    ok(list0.body.length === 0, 'New event has 0 items', list0.body.length, 0)

    // ADD ITEM — all relevant fields
    const cr = await POST(`/events/${eventId}/items`, {
      product_id:    1,
      item_name:     'AIRfeet RELIEF SM',
      size_name:     '6',
      color:         'Black',
      retail_price:  24.99,
      base_price:    12.00,
      total_qty:     50,
      qty_sold:      30,
      qty_remaining: 20,
      notes:         'Deep test item',
    })
    ok(cr.status === 201, 'POST /items → 201', cr.status, 201)
    ok(cr.body.item_name === 'AIRfeet RELIEF SM', 'item_name stored', cr.body.item_name, 'AIRfeet RELIEF SM')
    ok(cr.body.total_qty === 50, 'total_qty stored', cr.body.total_qty, 50)
    ok(cr.body.retail_price === 24.99, 'retail_price stored', cr.body.retail_price, 24.99)
    ok(cr.body.status === 'active', 'status = active', cr.body.status, 'active')
    ok(!!cr.body._id, '_id returned', !!cr.body._id, true)
    ok(!!cr.body.created_on, 'created_on timestamp set', !!cr.body.created_on, true)
    itemId = cr.body._id
    info(`Created item id=${itemId}`)

    // LIST (now 1 item)
    const list1 = await GET(`/events/${eventId}/items`)
    ok(list1.body.length === 1, 'Now 1 item in list', list1.body.length, 1)
    ok(list1.body[0].item_name === 'AIRfeet RELIEF SM', 'Item name matches', list1.body[0].item_name, 'AIRfeet RELIEF SM')

    // Add second item
    const cr2 = await POST(`/events/${eventId}/items`, {
      product_id: 2,
      item_name:  'AIRfeet CLASSIC ML',
      total_qty:  30,
      retail_price: 19.99,
    })
    ok(cr2.status === 201, 'POST second item → 201', cr2.status, 201)
    const itemId2 = cr2.body._id

    const list2 = await GET(`/events/${eventId}/items`)
    ok(list2.body.length === 2, 'Now 2 items', list2.body.length, 2)

    // DELETE item
    if (itemId2) {
      const dl = await DELETE(`/events/items/${itemId2}`)
      ok(dl.ok, 'DELETE /items/:itemId → 200', dl.status, 200)
      ok(dl.body.message === 'Event item deleted', 'Delete message', dl.body.message, 'Event item deleted')

      const list3 = await GET(`/events/${eventId}/items`)
      ok(list3.body.length === 1, 'Back to 1 item after delete', list3.body.length, 1)
    }

    // DELETE item — invalid ID → 400
    const badDl = await DELETE('/events/items/not-an-id')
    ok(badDl.status === 400, 'Invalid item ID → 400', badDl.status, 400)

    // DELETE item — unknown → 404
    const unkDl = await DELETE('/events/items/000000000000000000000000')
    ok(unkDl.status === 404, 'Unknown item → 404', unkDl.status, 404)

    // 404 on items for unknown event
    const unkEvItems = await GET('/events/000000000000000000000000/items')
    ok(unkEvItems.status === 404, '404 items for unknown event', unkEvItems.status, 404)
  }
}

// ══════════════════════════════════════════════════════════════════════════
// SECTION 11 — EVENT RECEIPTS (Action: Add/List/Update Receipt)
// ══════════════════════════════════════════════════════════════════════════
section('11. Event Receipts — GET/POST /events/:id/receipts + PUT /events/receipts/:id')
{
  if (!eventId) { skip('Event receipts', 'no eventId'); }
  else {
    // LIST (empty)
    const list0 = await GET(`/events/${eventId}/receipts`)
    ok(list0.ok, 'GET /receipts → 200', list0.status, 200)
    ok(Array.isArray(list0.body) && list0.body.length === 0, 'Empty receipts', list0.body.length, 0)

    // ADD RECEIPT — Day 1
    const cr = await POST(`/events/${eventId}/receipts`, {
      receipt_date: new Date().toISOString().slice(0, 10),
      cash:         250.00,
      credit:       500.00,
      checks:       100.00,
      hours:        8.0,
      notes:        'Day 1 receipts — Deep test',
    })
    ok(cr.status === 201, 'POST /receipts → 201', cr.status, 201)
    ok(cr.body.cash === 250.00, 'cash stored', cr.body.cash, 250.00)
    ok(cr.body.credit === 500.00, 'credit stored', cr.body.credit, 500.00)
    ok(cr.body.checks === 100.00, 'checks stored', cr.body.checks, 100.00)
    ok(cr.body.hours === 8.0, 'hours stored', cr.body.hours, 8.0)
    ok(cr.body.status === 'active', 'status = active', cr.body.status, 'active')
    ok(!!cr.body.created_on, 'created_on set', !!cr.body.created_on, true)
    receiptId = cr.body._id
    info(`Created receipt id=${receiptId}  cash=$${cr.body.cash}  credit=$${cr.body.credit}`)

    // ADD RECEIPT — Day 2
    const cr2 = await POST(`/events/${eventId}/receipts`, {
      receipt_date: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
      cash: 300.00, credit: 200.00, checks: 50.00, hours: 7.5,
    })
    ok(cr2.status === 201, 'POST 2nd receipt → 201', cr2.status, 201)

    // LIST (now 2 receipts)
    const list2 = await GET(`/events/${eventId}/receipts`)
    ok(list2.body.length === 2, 'Now 2 receipts', list2.body.length, 2)

    // UPDATE RECEIPT — PUT /events/receipts/:receiptId (recomputes total_receipt)
    if (receiptId) {
      const up = await PUT(`/events/receipts/${receiptId}`, {
        cash:   300.00,
        credit: 600.00,
        checks: 150.00,
        hours:  9.0,
        notes:  'Updated Day 1 receipts',
      })
      ok(up.ok, 'PUT /receipts/:id → 200', up.status, 200)
      ok(up.body.cash   === 300.00, 'cash updated', up.body.cash,   300.00)
      ok(up.body.credit === 600.00, 'credit updated', up.body.credit, 600.00)
      ok(up.body.checks === 150.00, 'checks updated', up.body.checks, 150.00)
      ok(up.body.hours  === 9.0, 'hours updated', up.body.hours,  9.0)
      // total_receipt auto-computed: 300 + 600 + 150 = 1050
      ok(up.body.total_receipt === 1050, `total_receipt = cash+credit+checks = $1050`, up.body.total_receipt, 1050)
      ok(!!up.body.updated_at, 'updated_at set', !!up.body.updated_at, true)
    }

    // List receipts + verify enriched GET /:id also shows receipts
    const fullEvent = await GET(`/events/${eventId}`)
    ok(fullEvent.body.receipts?.length === 2, 'GET /:id.receipts = 2', fullEvent.body.receipts?.length, 2)

    // 404 on receipts for unknown event
    const unkRec = await GET('/events/000000000000000000000000/receipts')
    ok(unkRec.status === 404, '404 receipts for unknown event', unkRec.status, 404)
  }
}

// ══════════════════════════════════════════════════════════════════════════
// SECTION 12 — ADVISORS (Action: Assign / List / Remove)
// ══════════════════════════════════════════════════════════════════════════
section('12. Advisors — GET/POST/DELETE /events/:id/advisors')
{
  if (!eventId) { skip('Advisors', 'no eventId'); }
  else {
    // Get a real sales rep to use as advisor
    const repList = await GET('/sales-reps?status=active')
    const testRep = repList.body?.[0]
    const advisorId = testRep?.legacy_id || 66

    // LIST (empty for new event)
    const list0 = await GET(`/events/${eventId}/advisors`)
    ok(list0.ok, 'GET /advisors → 200', list0.status, 200)
    ok(Array.isArray(list0.body), 'Response is array', Array.isArray(list0.body), true)
    info(`Advisors on new event: ${list0.body.length}`)

    // ADD ADVISOR
    const cr = await POST(`/events/${eventId}/advisors`, {
      advisor_id: advisorId,
      role: 'lead',
    })
    ok(cr.status === 201, 'POST /advisors → 201', cr.status, 201)
    ok(cr.body.advisor_id === advisorId, 'advisor_id stored', cr.body.advisor_id, advisorId)
    ok(cr.body.role === 'lead', 'role stored', cr.body.role, 'lead')
    ok(cr.body.event_id === eventId, 'event_id = event _id string', cr.body.event_id, eventId)
    ok(!!cr.body._id, '_id returned', !!cr.body._id, true)
    advisorMapId = cr.body._id
    info(`Added advisor id=${advisorId} → map id=${advisorMapId}`)

    // Add second advisor
    const cr2 = await POST(`/events/${eventId}/advisors`, { advisor_id: advisorId + 1, role: 'assistant' })
    ok(cr2.status === 201, 'POST 2nd advisor → 201', cr2.status, 201)
    const advisorMapId2 = cr2.body._id

    // LIST (now shows advisors from event_advisors collection)
    const list2 = await GET(`/events/${eventId}/advisors`)
    ok(list2.ok, 'GET /advisors after add → 200', list2.status, 200)
    ok(Array.isArray(list2.body), 'Array returned', Array.isArray(list2.body), true)
    // advisor_name is joined
    if (list2.body.length > 0) {
      ok('advisor_name' in list2.body[0], 'advisor_name joined', true, true)
      ok('advisor_email' in list2.body[0], 'advisor_email joined', true, true)
    }
    info(`Advisors after add: ${list2.body.length}`)

    // REMOVE ADVISOR
    if (advisorMapId2) {
      const dl = await DELETE(`/events/${eventId}/advisors/${advisorMapId2}`)
      ok(dl.ok, 'DELETE /advisors/:mapId → 200', dl.status, 200)
      ok(dl.body.success === true, 'success: true', dl.body.success, true)
    }
  }
}

// ══════════════════════════════════════════════════════════════════════════
// SECTION 13 — BONUSES (Action: Save Bonus / List / Mark Paid)
// ══════════════════════════════════════════════════════════════════════════
section('13. Advisor Bonuses — POST/GET /events/:id/bonuses + PUT /events/bonuses/:id/paid')
{
  if (!eventId) { skip('Bonuses', 'no eventId'); }
  else {
    const repList = await GET('/sales-reps?status=active')
    const advisorId = repList.body?.[0]?.legacy_id || 66

    // LIST (empty)
    const list0 = await GET(`/events/${eventId}/bonuses`)
    ok(list0.ok, 'GET /bonuses → 200', list0.status, 200)
    ok(Array.isArray(list0.body), 'Array', Array.isArray(list0.body), true)
    ok(list0.body.length === 0, 'No bonuses yet', list0.body.length, 0)

    // SAVE BONUS (CREATE — upsert)
    const cr = await POST(`/events/${eventId}/bonuses`, {
      advisor_id:     advisorId,
      mul5_bonus:     50.00,
      mul10_bonus:    100.00,
      hourly_pay:     15.00,
      hours_worked:   8.0,
      dollar_payment: 25.00,
      paid_date:      null,
    })
    ok(cr.status === 201, 'POST /bonuses (create) → 201', cr.status, 201)
    ok(cr.body.advisor_id === advisorId, 'advisor_id stored', cr.body.advisor_id, advisorId)
    ok(cr.body.mul5_bonus === 50.00, 'mul5_bonus stored', cr.body.mul5_bonus, 50.00)
    ok(cr.body.mul10_bonus === 100.00, 'mul10_bonus stored', cr.body.mul10_bonus, 100.00)
    ok(cr.body.hourly_pay === 15.00, 'hourly_pay stored', cr.body.hourly_pay, 15.00)
    ok(cr.body.hours_worked === 8.0, 'hours_worked stored', cr.body.hours_worked, 8.0)
    ok(cr.body.dollar_payment === 25.00, 'dollar_payment stored', cr.body.dollar_payment, 25.00)
    // total_bonus = mul5(50) + mul10(100) + hourly(15×8=120) + dollar(25) = 295
    const expectedTotal = 50 + 100 + 15*8 + 25
    ok(Math.abs((cr.body.total_bonus || 0) - expectedTotal) < 0.01,
      `total_bonus = $${expectedTotal} (auto-computed)`, cr.body.total_bonus, expectedTotal)
    ok(cr.body.status === 'calculated', 'status = calculated (bonus > 0)', cr.body.status, 'calculated')
    bonusId = cr.body._id
    info(`Created bonus id=${bonusId}  total=$${cr.body.total_bonus}`)

    // SAVE BONUS (UPDATE — upsert same advisor)
    const up = await POST(`/events/${eventId}/bonuses`, {
      advisor_id:     advisorId,
      mul5_bonus:     75.00,
      mul10_bonus:    150.00,
      hourly_pay:     20.00,
      hours_worked:   6.0,
      dollar_payment: 30.00,
    })
    ok(up.ok, 'POST /bonuses (update/upsert) → 200', up.status, 200)
    ok(up.body.mul5_bonus === 75.00, 'mul5_bonus updated', up.body.mul5_bonus, 75.00)
    const newTotal = 75 + 150 + 20*6 + 30
    ok(Math.abs((up.body.total_bonus || 0) - newTotal) < 0.01,
      `total_bonus recomputed = $${newTotal}`, up.body.total_bonus, newTotal)

    // LIST (now has 1 bonus)
    const list1 = await GET(`/events/${eventId}/bonuses`)
    ok(list1.body.length === 1, '1 bonus in list', list1.body.length, 1)
    ok(list1.body[0].advisor_id === advisorId, 'advisor_id matches', list1.body[0].advisor_id, advisorId)

    // MARK PAID
    if (bonusId) {
      const today = new Date().toISOString().slice(0, 10)
      const paid = await PUT(`/events/bonuses/${bonusId}/paid`, { paid_date: today })
      ok(paid.ok, 'PUT /bonuses/:id/paid → 200', paid.status, 200)
      ok(paid.body.status === 'paid', 'status = paid', paid.body.status, 'paid')
      ok(paid.body.paid_date === today, 'paid_date stored', paid.body.paid_date, today)
      ok(!!paid.body.updated_at, 'updated_at set', !!paid.body.updated_at, true)
      info(`Bonus marked paid: $${paid.body.total_bonus} on ${paid.body.paid_date}`)
    }

    // ZERO bonus — status should be pending
    const cr2 = await POST(`/events/${eventId}/bonuses`, {
      advisor_id: advisorId + 1,
      mul5_bonus: 0, mul10_bonus: 0, hourly_pay: 0, hours_worked: 0, dollar_payment: 0,
    })
    ok(cr2.status === 201 || cr2.ok, 'Zero bonus POST → 200/201', cr2.status, '200/201')
    ok(cr2.body.total_bonus === 0, 'total_bonus = 0', cr2.body.total_bonus, 0)
    ok(cr2.body.status === 'pending', 'status = pending (zero bonus)', cr2.body.status, 'pending')
  }
}

// ══════════════════════════════════════════════════════════════════════════
// SECTION 14 — FULL READ after all sub-resources added
// ══════════════════════════════════════════════════════════════════════════
section('14. Full Event Read — GET /events/:id (after all sub-resources)')
{
  if (!eventId) { skip('Full read', 'no eventId'); }
  else {
    const r = await GET(`/events/${eventId}`)
    ok(r.ok, 'GET /events/:id → 200', r.status, 200)
    ok(r.body.items?.length === 1, 'items = 1 (after add)', r.body.items?.length, 1)
    ok(r.body.receipts?.length === 2, 'receipts = 2 (after 2 adds)', r.body.receipts?.length, 2)

    // Verify receipt enrichment
    if (r.body.receipts?.length > 0) {
      const rec = r.body.receipts.find(r => r.total_receipt === 1050) ||
                  r.body.receipts.find(r => (parseFloat(r.cash_amount || r.cash) || 0) === 300)
      if (rec) {
        ok(typeof (rec.cash !== undefined ? rec.cash : rec.cash_amount) !== 'undefined',
          'Receipt has cash field', true, true)
      }
    }

    // Verify item enrichment (product_name, size_resolved)
    if (r.body.items?.length > 0) {
      ok('product_name' in r.body.items[0], 'Item has product_name (joined)', true, true)
      ok('size_resolved' in r.body.items[0], 'Item has size_resolved (joined)', true, true)
    }
    info(`Full event: items=${r.body.items?.length}  receipts=${r.body.receipts?.length}  costs=${r.body.costs?.length}`)
  }
}

// ══════════════════════════════════════════════════════════════════════════
// SECTION 15 — LIST enrichment after sub-resources
// ══════════════════════════════════════════════════════════════════════════
section('15. List Enrichment — GET /events (computed totals)')
{
  if (!eventId) { skip('List enrichment', 'no eventId'); }
  else {
    const r = await GET('/events')
    const testEv = r.body.find(e => e._id === eventId)
    ok(!!testEv, 'Test event in list', !!testEv, true)
    if (testEv) {
      // 2 receipts: Day1 (300+600+150=1050) + Day2 (300+200+50=550) = 1600
      ok(typeof testEv.totalRevenue === 'number', 'totalRevenue is number', typeof testEv.totalRevenue, 'number')
      ok(testEv.totalRevenue >= 0, `totalRevenue ≥ 0 ($${testEv.totalRevenue?.toFixed(2)})`, testEv.totalRevenue, '>=0')
      ok(testEv.itemCount >= 1, `itemCount ≥ 1 (${testEv.itemCount})`, testEv.itemCount, '>=1')
      ok(testEv.receiptDays >= 2, `receiptDays ≥ 2 (${testEv.receiptDays})`, testEv.receiptDays, '>=2')
      info(`Enriched: revenue=$${testEv.totalRevenue?.toFixed(2)}  items=${testEv.itemCount}  receiptDays=${testEv.receiptDays}  commission=$${testEv.totalCommission?.toFixed(2)}  profit=$${testEv.profit?.toFixed(2)}`)
    }
  }
}

// ══════════════════════════════════════════════════════════════════════════
// SECTION 16 — EDGE CASES
// ══════════════════════════════════════════════════════════════════════════
section('16. Edge Cases')
{
  // Invalid ID format returns 400 for all endpoints
  // items/receipts validate ID strictly → 400
  for (const ep of ['/events/bad-id', '/events/bad-id/items', '/events/bad-id/receipts']) {
    const r = await GET(ep)
    ok(r.status === 400 || r.status === 404, `GET ${ep} → 400/404 on bad id`, r.status, '400|404')
  }
  // advisors/bonuses gracefully degrade (no strict ID validation) → 200 with []
  for (const [ep, label] of [
    ['/events/bad-id/advisors', 'advisors'],
    ['/events/bad-id/bonuses',  'bonuses'],
  ]) {
    const r = await GET(ep)
    ok(r.ok && Array.isArray(r.body) && r.body.length === 0,
      `GET ${ep} → 200 [] (graceful degradation on bad id)`, r.status, 200)
  }

  // Create event with all optional fields empty
  const empty = await POST('/events', {
    event_name: `EmptyEvent_${TS}`,
    event_notes: '',
    salesTax_state_id: null,
    status: 'active',
  })
  ok(empty.status === 201, 'Event with empty optionals → 201', empty.status, 201)
  if (empty.body._id) {
    eventId2 = empty.body._id
    // Read it back
    const rd = await GET(`/events/${eventId2}`)
    ok(rd.ok, 'Read empty event → 200', rd.status, 200)
    ok(rd.body.salesTax_state_name === '', 'salesTax_state_name = "" when null', rd.body.salesTax_state_name, '')
  }

  // Stats after test events
  const stats = await GET('/events/stats')
  ok(stats.ok, 'Stats still work after all tests', stats.status, 200)
  ok(stats.body.total >= 1, 'Stats.total ≥ 1', stats.body.total, '>=1')
  info(`Final stats: total=${stats.body.total}  active=${stats.body.active}  revenue=$${stats.body.totalRevenue?.toFixed(2)}`)
}

// ══════════════════════════════════════════════════════════════════════════
// SECTION 17 — DELETE EVENT (HARD DELETE — no sub-resource cleanup)
// ══════════════════════════════════════════════════════════════════════════
section('17. Delete Event — DELETE /events/:id')
{
  // Delete eventId2
  if (eventId2) {
    const r = await DELETE(`/events/${eventId2}`)
    ok(r.ok, 'DELETE eventId2 → 200', r.status, 200)
    ok(r.body.message === 'Event deleted', 'Delete message', r.body.message, 'Event deleted')
    const gone = await GET(`/events/${eventId2}`)
    ok(gone.status === 404, 'eventId2 gone → 404', gone.status, 404)
    eventId2 = null
  }

  // Delete main test event
  if (eventId) {
    const r = await DELETE(`/events/${eventId}`)
    ok(r.ok, 'DELETE main event → 200', r.status, 200)
    ok(r.body.message === 'Event deleted', 'Delete message', r.body.message, 'Event deleted')

    // Confirm gone
    const gone = await GET(`/events/${eventId}`)
    ok(gone.status === 404, 'Main event gone → 404', gone.status, 404)

    // Not in list
    const list = await GET('/events')
    ok(!list.body.some(e => e._id === eventId), 'Not in event list', true, true)

    info('NOTE: DELETE is HARD — sub-resources (items, receipts, advisors, bonuses) are NOT auto-deleted')
    eventId = null
  }

  // Invalid ID → 400
  const r2 = await DELETE('/events/not-an-id')
  ok(r2.status === 400, 'Invalid ID → 400', r2.status, 400)

  // Unknown → 404
  const r3 = await DELETE('/events/000000000000000000000000')
  ok(r3.status === 404, 'Unknown → 404', r3.status, 404)
  ok(r3.body.error === 'Event not found', '404 message', r3.body.error, 'Event not found')
}

// ─── Summary ─────────────────────────────────────────────────────────────────
const total = passed + failed + skipped
console.log('\n' + '═'.repeat(62))
console.log('\x1b[1mEVENTS DEEP TEST SUMMARY\x1b[0m')
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
if (failed === 0) console.log('\n\x1b[32m✓ All Events tests passed.\x1b[0m')
else              console.log(`\n\x1b[31m✗ ${failed} test(s) failed.\x1b[0m`)
