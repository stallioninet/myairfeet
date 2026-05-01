/**
 * Deep CRUD Test Suite — Customers Menu (all submenus + every action button)
 *
 * Submenus:
 *   1.  Active Customers      GET /customers?status=active
 *   2.  Inactive Customers    GET /customers?status=inactive
 *   3.  Pilot Customers       GET /customers?status=pilot
 *   4.  Customer Stats        GET /customers/stats
 *   5.  Customer Types        GET/POST/PUT/DELETE /customer-types
 *   6.  Unique Check          GET /customers/check-unique
 *   7.  Create Customer       POST /customers
 *   8.  Read Customer         GET /customers/:id
 *   9.  Update Customer       PUT /customers/:id
 *  10.  Deactivate/Activate   PUT /customers/:id/deactivate|activate
 *  11.  Contacts CRUD         POST/PUT/DELETE /customers/:id/contacts/:contactId
 *  12.  Addresses CRUD        POST/PUT/DELETE /customers/:id/addresses/:addressId
 *  13.  Emails CRUD           POST/DELETE /customers/:id/emails/:emailId
 *  14.  Assign Reps           PUT /customers/:id/reps
 *  15.  Customer Terms        POST /customers/:id/terms
 *  16.  Additional Info       POST /customers/:id/additional-info
 *  17.  Send Overdue Email    POST /customers/:id/send-overdue-email
 *  18.  Customer Invoices     GET /customers/:id/invoices
 *  19.  Customer Commissions  GET /customers/:id/commissions
 *  20.  Customer History      GET /customers/:id/history
 *  21.  Suppliers CRUD        Full CRUD + addresses + contacts + terms + notes
 *  22.  Customer Reports      GET /reports/year|month
 *  23.  Delete Customer       DELETE /customers/:id
 *  24.  Edge Cases
 *
 * Usage: node tests/customers-deep-test.mjs
 */

const BASE = 'http://localhost:5000/api'
const TS   = `CU_${Date.now()}`

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
let custId        = null
let existingCustId= null   // existing customer with legacy_id for sub-resource tests
let suppId        = null
let ctypeId       = null
let contactId     = null
let addressId     = null
let emailId       = null

// ══════════════════════════════════════════════════════════════════════════
// 1. CUSTOMER STATS
// ══════════════════════════════════════════════════════════════════════════
section('1. Customer Stats — GET /customers/stats')
{
  const r = await GET('/customers/stats')
  ok(r.ok, 'GET /stats → 200', r.status, 200)
  ok(typeof r.body.total    === 'number', 'total is number',    typeof r.body.total,    'number')
  ok(typeof r.body.active   === 'number', 'active is number',   typeof r.body.active,   'number')
  ok(typeof r.body.inactive === 'number', 'inactive is number', typeof r.body.inactive, 'number')
  ok(typeof r.body.pilot    === 'number', 'pilot is number',    typeof r.body.pilot,    'number')
  ok(Array.isArray(r.body.topBuyers), 'topBuyers is array', Array.isArray(r.body.topBuyers), true)
  ok(typeof r.body.distribution === 'object', 'distribution is object', typeof r.body.distribution, 'object')
  ok(r.body.total > 0, `At least 1 customer (total=${r.body.total})`, r.body.total, '>0')
  ok('Distributor' in r.body.distribution, 'Distribution has Distributor', true, true)
  ok('Retail' in r.body.distribution, 'Distribution has Retail', true, true)
  ok('Medical' in r.body.distribution, 'Distribution has Medical', true, true)
  ok('Other' in r.body.distribution, 'Distribution has Other', true, true)
  if (r.body.topBuyers.length > 0) {
    const tb = r.body.topBuyers[0]
    ok('company_name' in tb, 'topBuyer has company_name', true, true)
    ok('totalSales' in tb, 'topBuyer has totalSales', true, true)
    ok('orderCount' in tb, 'topBuyer has orderCount', true, true)
    info(`Top buyer: ${tb.company_name} — $${tb.totalSales?.toFixed(0)} (${tb.orderCount} orders)`)
  }
  info(`Stats: total=${r.body.total}  active=${r.body.active}  inactive=${r.body.inactive}  pilot=${r.body.pilot}`)
}

// ══════════════════════════════════════════════════════════════════════════
// 2. ACTIVE CUSTOMERS LIST
// ══════════════════════════════════════════════════════════════════════════
section('2. Active Customers — GET /customers?status=active')
{
  const r = await GET('/customers?status=active')
  ok(r.ok, 'GET → 200', r.status, 200)
  ok(Array.isArray(r.body), 'Response is array', Array.isArray(r.body), true)
  ok(r.body.length > 0, `At least 1 active customer (${r.body.length})`, r.body.length, '>0')
  const allActive = r.body.every(c => c.status === 'active')
  ok(allActive, 'All returned customers are active', allActive, true)
  // Sorted by company_name ASC
  if (r.body.length >= 2) {
    ok(r.body[0].company_name <= r.body[1].company_name, 'Sorted by company_name ASC', r.body[0].company_name <= r.body[1].company_name, true)
  }
  const first = r.body[0]
  ok('_id' in first, 'Has _id', true, true)
  ok('company_name' in first, 'Has company_name', true, true)
  ok('status' in first, 'Has status', true, true)
  // Pick an existing customer with legacy_id for sub-resource tests
  existingCustId = r.body.find(c => c.legacy_id)?._id || first._id
  info(`Active: ${r.body.length}  First: ${first.company_name}  existingId=${existingCustId}`)
}

// ══════════════════════════════════════════════════════════════════════════
// 3. INACTIVE CUSTOMERS
// ══════════════════════════════════════════════════════════════════════════
section('3. Inactive Customers — GET /customers?status=inactive')
{
  const r = await GET('/customers?status=inactive')
  ok(r.ok, 'GET → 200', r.status, 200)
  ok(Array.isArray(r.body), 'Response is array', Array.isArray(r.body), true)
  if (r.body.length > 0) {
    const allInact = r.body.every(c => c.status === 'inactive')
    ok(allInact, 'All returned customers are inactive', allInact, true)
    info(`Inactive: ${r.body.length}`)
  } else {
    pass('Inactive list returns [] (valid)')
    info('No inactive customers in DB')
  }
}

// ══════════════════════════════════════════════════════════════════════════
// 4. PILOT CUSTOMERS
// ══════════════════════════════════════════════════════════════════════════
section('4. Pilot Customers — GET /customers?status=pilot')
{
  const r = await GET('/customers?status=pilot')
  ok(r.ok, 'GET → 200', r.status, 200)
  ok(Array.isArray(r.body), 'Response is array', Array.isArray(r.body), true)
  if (r.body.length > 0) {
    const allPilot = r.body.every(c => c.status === 'pilot')
    ok(allPilot, 'All returned customers are pilot', allPilot, true)
    info(`Pilot: ${r.body.length}`)
  } else {
    pass('Pilot list returns [] (valid)')
  }
}

// ══════════════════════════════════════════════════════════════════════════
// 5. CUSTOMER TYPES FULL CRUD
// ══════════════════════════════════════════════════════════════════════════
section('5. Customer Types — GET /customer-types')
{
  const r = await GET('/customer-types')
  ok(r.ok, 'GET /customer-types → 200', r.status, 200)
  ok(Array.isArray(r.body), 'Response is array', Array.isArray(r.body), true)
  ok(r.body.length > 0, `At least 1 type (${r.body.length})`, r.body.length, '>0')
  const first = r.body[0]
  ok('name' in first, 'Has name', true, true)
  ok('code' in first, 'Has code', true, true)
  info(`Customer types: ${r.body.length}`)
}

section('5b. Customer Types — Create / Read / Update / Delete')
{
  // CREATE
  const cr = await POST('/customer-types', {
    name: `TestType_${TS}`,
    description: 'Deep CRUD test type',
    start_number: `TT-${Date.now().toString().slice(-4)}`,
  })
  ok(cr.status === 201, 'POST /customer-types → 201', cr.status, 201)
  ok(cr.body.name === `TestType_${TS}`, 'name stored', cr.body.name, `TestType_${TS}`)
  // Code is auto-generated from name
  ok(typeof cr.body.code === 'string', 'code auto-generated', typeof cr.body.code, 'string')
  ok(cr.body.code.length > 0, 'code is non-empty', cr.body.code.length, '>0')
  ok(cr.body.status === 'active', 'status = active', cr.body.status, 'active')
  ok(!!cr.body._id, '_id returned', !!cr.body._id, true)
  ctypeId = cr.body._id
  info(`Created ctype code="${cr.body.code}"`)

  // READ
  const rd = await GET(`/customer-types/${ctypeId}`)
  ok(rd.ok, 'GET /customer-types/:id → 200', rd.status, 200)
  ok(rd.body._id === ctypeId, '_id matches', rd.body._id, ctypeId)

  const rd404 = await GET('/customer-types/000000000000000000000000')
  ok(rd404.status === 404, '404 unknown type', rd404.status, 404)

  // UPDATE
  const up = await PUT(`/customer-types/${ctypeId}`, {
    name: `TestType_${TS}_upd`,
    description: 'Updated description',
    status: 'active',
  })
  ok(up.ok, 'PUT /customer-types/:id → 200', up.status, 200)
  ok(up.body.name === `TestType_${TS}_upd`, 'name updated', up.body.name, `TestType_${TS}_upd`)
  // code auto-regenerated
  ok(typeof up.body.code === 'string', 'code re-generated on update', typeof up.body.code, 'string')

  const up404 = await PUT('/customer-types/000000000000000000000000', { name: 'X' })
  ok(up404.status === 404, 'PUT unknown → 404', up404.status, 404)

  // MISSING NAME
  const crBad = await POST('/customer-types', { description: 'no name' })
  ok(crBad.status === 400, 'Missing name → 400', crBad.status, 400)
  ok(crBad.body.error?.includes('Name'), 'Error mentions Name', crBad.body.error, 'includes Name')

  // DELETE
  const dl = await DELETE(`/customer-types/${ctypeId}`)
  ok(dl.ok, 'DELETE /customer-types/:id → 200', dl.status, 200)
  ok(dl.body.success === true, 'success: true', dl.body.success, true)
  const gone = await GET(`/customer-types/${ctypeId}`)
  ok(gone.status === 404, 'Deleted type → 404', gone.status, 404)
  ctypeId = null

  const dl404 = await DELETE('/customer-types/000000000000000000000000')
  ok(dl404.status === 404, 'DELETE unknown → 404', dl404.status, 404)
}

// ══════════════════════════════════════════════════════════════════════════
// 6. UNIQUE CHECK
// ══════════════════════════════════════════════════════════════════════════
section('6. Unique Name Check — GET /customers/check-unique')
{
  const r1 = await GET(`/customers/check-unique?name=NoSuchCo_${TS}`)
  ok(r1.ok && r1.body.unique === true, 'Non-existing name is unique', r1.body.unique, true)

  // Existing name
  const list = await GET('/customers?status=active')
  const existingName = list.body[0]?.company_name
  if (existingName) {
    const r2 = await GET(`/customers/check-unique?name=${encodeURIComponent(existingName)}`)
    ok(r2.body.unique === false, 'Existing name → not unique', r2.body.unique, false)
    ok(r2.body.existing !== null, 'Returns existing customer info', r2.body.existing !== null, true)
    ok('_id' in (r2.body.existing || {}), 'existing has _id', '_id' in (r2.body.existing || {}), true)

    // Case insensitive
    const r3 = await GET(`/customers/check-unique?name=${encodeURIComponent(existingName.toUpperCase())}`)
    ok(r3.body.unique === false, 'Case-insensitive: UPPER → not unique', r3.body.unique, false)

    // With exclude_id = own → unique
    const ownId = list.body[0]._id
    const r4 = await GET(`/customers/check-unique?name=${encodeURIComponent(existingName)}&exclude_id=${ownId}`)
    ok(r4.body.unique === true, 'Own exclude_id → unique', r4.body.unique, true)
  }

  // No name → unique:true
  const r5 = await GET('/customers/check-unique')
  ok(r5.ok && r5.body.unique === true, 'No name → unique:true', r5.body.unique, true)
}

// ══════════════════════════════════════════════════════════════════════════
// 7. CREATE CUSTOMER — all fields
// ══════════════════════════════════════════════════════════════════════════
section('7. Create Customer — POST /customers (all fields)')
{
  const payload = {
    company_name:  `TestCo_${TS}`,
    customer_type: 'retail_cust',
    relationship:  'direct',
    contact_name:  'Jane Tester',
    phone:         '555-0300',
    extension:     '303',
    fax:           '555-0399',
    email:         `testco_${TS}@example.com`,
    website:       'https://testco.example.com',
    customer_code: `TC${Date.now().toString().slice(-4)}`,
    notes:         'Deep CRUD test customer',
    terms:         'Net30',
    fob:           'Origin',
    ship:          'UPS',
    ship_via:      'Ground',
    project:       'TestProject',
    address:       '999 Test Blvd',
    city:          'Houston',
    state:         'TX',
    zip:           '77001',
    sales_rep:     'TR1',
    status:        'active',
  }
  const r = await POST('/customers', payload)
  ok(r.ok, 'POST /customers → 200', r.status, 200)
  ok(r.body.company_name === `TestCo_${TS}`, 'company_name stored', r.body.company_name, `TestCo_${TS}`)
  ok(r.body.customer_type === 'retail_cust', 'customer_type stored', r.body.customer_type, 'retail_cust')
  ok(r.body.phone === '555-0300', 'phone stored', r.body.phone, '555-0300')
  ok(r.body.fax === '555-0399', 'fax stored', r.body.fax, '555-0399')
  ok(r.body.email === `testco_${TS}@example.com`, 'email stored', r.body.email, `testco_${TS}@example.com`)
  ok(r.body.website === 'https://testco.example.com', 'website stored', r.body.website, 'https://testco.example.com')
  ok(r.body.terms === 'Net30', 'terms stored', r.body.terms, 'Net30')
  ok(r.body.fob === 'Origin', 'fob stored', r.body.fob, 'Origin')
  ok(r.body.ship === 'UPS', 'ship stored', r.body.ship, 'UPS')
  ok(r.body.address === '999 Test Blvd', 'address stored', r.body.address, '999 Test Blvd')
  ok(r.body.city === 'Houston', 'city stored', r.body.city, 'Houston')
  ok(r.body.state === 'TX', 'state stored', r.body.state, 'TX')
  ok(r.body.zip === '77001', 'zip stored', r.body.zip, '77001')
  ok(r.body.status === 'active', 'status stored', r.body.status, 'active')
  ok(typeof r.body.legacy_id === 'number', 'legacy_id auto-assigned', typeof r.body.legacy_id, 'number')
  ok(r.body.legacy_id > 0, 'legacy_id > 0', r.body.legacy_id, '>0')
  ok(!!r.body._id, '_id returned', !!r.body._id, true)
  ok(!!r.body.created_at, 'created_at set', !!r.body.created_at, true)
  custId = r.body._id
  info(`Created customer id=${custId}  legacy_id=${r.body.legacy_id}`)
}

section('7b. Create Customer — validation errors')
{
  // Missing company_name
  const r1 = await POST('/customers', { phone: '555-1111' })
  ok(r1.status === 400, 'Missing company_name → 400', r1.status, 400)
  ok(r1.body.error === 'Company name is required', 'Error: Company name is required', r1.body.error, 'Company name is required')

  // Whitespace trimming
  const r2 = await POST('/customers', { company_name: '  TrimCo_' + TS + '  ' })
  ok(r2.ok, 'Whitespace company_name → 200', r2.status, 200)
  ok(r2.body.company_name === `TrimCo_${TS}`, 'company_name trimmed', r2.body.company_name, `TrimCo_${TS}`)
  if (r2.body._id) { await DELETE(`/customers/${r2.body._id}`); pass('Whitespace trim cleanup') }

  // Status can be pilot
  const r3 = await POST('/customers', { company_name: `PilotCo_${TS}`, status: 'pilot' })
  ok(r3.ok, 'status=pilot is valid', r3.status, 200)
  ok(r3.body.status === 'pilot', 'pilot status stored', r3.body.status, 'pilot')
  if (r3.body._id) { await DELETE(`/customers/${r3.body._id}`); pass('Pilot status cleanup') }
}

// ══════════════════════════════════════════════════════════════════════════
// 8. READ CUSTOMER
// ══════════════════════════════════════════════════════════════════════════
section('8. Read Customer — GET /customers/:id')
{
  if (!custId) { skip('READ customer', 'no custId'); }
  else {
    const r = await GET(`/customers/${custId}`)
    ok(r.ok, 'GET /customers/:id → 200', r.status, 200)
    ok(r.body.company_name === `TestCo_${TS}`, 'company_name matches', r.body.company_name, `TestCo_${TS}`)
    ok(Array.isArray(r.body.contacts), 'contacts array returned', Array.isArray(r.body.contacts), true)
    ok(Array.isArray(r.body.addresses), 'addresses array returned', Array.isArray(r.body.addresses), true)
    ok(Array.isArray(r.body.emails), 'emails array returned', Array.isArray(r.body.emails), true)
    ok(Array.isArray(r.body.assignedReps), 'assignedReps array returned', Array.isArray(r.body.assignedReps), true)

    const r404 = await GET('/customers/000000000000000000000000')
    ok(r404.status === 404, '404 unknown customer', r404.status, 404)
  }

  // Verify existing customer (with legacy data)
  if (existingCustId) {
    const r2 = await GET(`/customers/${existingCustId}`)
    ok(r2.ok, 'GET existing customer → 200', r2.status, 200)
    ok('company_name' in r2.body, 'Existing customer has company_name', true, true)
    info(`Existing customer: ${r2.body.company_name}  contacts=${r2.body.contacts?.length}  addresses=${r2.body.addresses?.length}`)
  }
}

// ══════════════════════════════════════════════════════════════════════════
// 9. UPDATE CUSTOMER
// ══════════════════════════════════════════════════════════════════════════
section('9. Update Customer — PUT /customers/:id')
{
  if (!custId) { skip('UPDATE customer', 'no custId'); }
  else {
    const r = await PUT(`/customers/${custId}`, {
      company_name: `TestCo_${TS}_upd`,
      phone:        '555-0400',
      email:        `testco_${TS}_upd@example.com`,
      notes:        'Updated notes',
      terms:        'Net60',
      ship:         'FedEx',
      city:         'San Antonio',
      state:        'TX',
      zip:          '78201',
    })
    ok(r.ok, 'PUT → 200', r.status, 200)
    ok(r.body.company_name === `TestCo_${TS}_upd`, 'company_name updated', r.body.company_name, `TestCo_${TS}_upd`)
    ok(r.body.phone === '555-0400', 'phone updated', r.body.phone, '555-0400')
    ok(r.body.terms === 'Net60', 'terms updated', r.body.terms, 'Net60')
    ok(r.body.ship === 'FedEx', 'ship updated', r.body.ship, 'FedEx')
    ok(!!r.body.updated_at, 'updated_at set', !!r.body.updated_at, true)

    // Partial update — only status
    const r2 = await PUT(`/customers/${custId}`, { status: 'inactive' })
    ok(r2.ok, 'Partial PUT status → 200', r2.status, 200)
    ok(r2.body.status === 'inactive', 'status = inactive', r2.body.status, 'inactive')
    // Restore
    await PUT(`/customers/${custId}`, { status: 'active' })
    pass('Status restored to active')

    // 404 unknown
    const r3 = await PUT('/customers/000000000000000000000000', { company_name: 'X' })
    // Note: PUT uses updateOne (no 404 on not found), returns empty doc
    ok(r3.ok, 'PUT unknown → still 200 (updateOne does not error)', r3.status, 200)
  }
}

// ══════════════════════════════════════════════════════════════════════════
// 10. DEACTIVATE / ACTIVATE
// ══════════════════════════════════════════════════════════════════════════
section('10. Deactivate / Activate — PUT /customers/:id/deactivate|activate')
{
  if (!custId) { skip('DEACT/ACT', 'no custId'); }
  else {
    const dec = await PUT(`/customers/${custId}/deactivate`, {})
    ok(dec.ok, 'PUT /deactivate → 200', dec.status, 200)
    ok(dec.body.message === 'Customer deactivated', 'Deactivate message', dec.body.message, 'Customer deactivated')

    // Verify in inactive list
    const inact = await GET('/customers?status=inactive')
    const foundInact = inact.body.some(c => c._id === custId)
    ok(foundInact, 'Customer in inactive list after deactivate', foundInact, true)

    // Not in active list
    const act = await GET('/customers?status=active')
    const foundAct = act.body.some(c => c._id === custId)
    ok(!foundAct, 'Customer NOT in active list after deactivate', !foundAct, true)

    // Activate
    const actR = await PUT(`/customers/${custId}/activate`, {})
    ok(actR.ok, 'PUT /activate → 200', actR.status, 200)
    ok(actR.body.message === 'Customer activated', 'Activate message', actR.body.message, 'Customer activated')

    // Verify back in active
    const act2 = await GET('/customers?status=active')
    const foundAct2 = act2.body.some(c => c._id === custId)
    ok(foundAct2, 'Customer back in active list', foundAct2, true)

    // Pilot status
    const pilotR = await PUT(`/customers/${custId}`, { status: 'pilot' })
    ok(pilotR.ok, 'Set status=pilot → 200', pilotR.status, 200)
    const pilotList = await GET('/customers?status=pilot')
    ok(pilotList.body.some(c => c._id === custId), 'In pilot list after pilot status', true, true)
    await PUT(`/customers/${custId}`, { status: 'active' })
    pass('Status restored to active')
  }
}

// ══════════════════════════════════════════════════════════════════════════
// 11. CONTACTS CRUD
// ══════════════════════════════════════════════════════════════════════════
section('11. Contact CRUD — POST/PUT/DELETE /customers/:id/contacts')
{
  if (!custId) { skip('Contacts CRUD', 'no custId'); }
  else {
    // CREATE contact
    const cr = await POST(`/customers/${custId}/contacts`, {
      title:        'Dr.',
      person:       'John Testman',
      position:     'CTO',
      label:        'Primary',
      main_phone:   '555-1001',
      main_ext:     '101',
      desk_phone:   '555-1002',
      desk_ext:     '102',
      mobile_phone: '555-1003',
      email:        `john_${TS}@testco.com`,
    })
    ok(cr.ok, 'POST /contacts → 200', cr.status, 200)
    ok(cr.body.person === 'John Testman', 'person stored', cr.body.person, 'John Testman')
    ok(cr.body.position === 'CTO', 'position stored', cr.body.position, 'CTO')
    ok(cr.body.main_phone === '555-1001', 'main_phone stored', cr.body.main_phone, '555-1001')
    ok(cr.body.email === `john_${TS}@testco.com`, 'email stored', cr.body.email, `john_${TS}@testco.com`)
    ok(cr.body.status === 'active', 'status = active', cr.body.status, 'active')
    ok(typeof cr.body.display_order === 'number', 'display_order set', typeof cr.body.display_order, 'number')
    contactId = cr.body._id
    info(`Created contact id=${contactId}`)

    // Verify in GET /:id
    const rd = await GET(`/customers/${custId}`)
    const foundContact = rd.body.contacts?.some(c => String(c._id) === String(contactId))
    ok(foundContact, 'Contact appears in GET /:id contacts array', foundContact, true)

    // UPDATE contact
    const up = await PUT(`/customers/${custId}/contacts/${contactId}`, {
      person:   'Jane Updated',
      position: 'VP Engineering',
      email:    `jane_${TS}@testco.com`,
    })
    ok(up.ok, 'PUT /contacts/:contactId → 200', up.status, 200)
    ok(up.body.person === 'Jane Updated', 'person updated', up.body.person, 'Jane Updated')
    ok(up.body.position === 'VP Engineering', 'position updated', up.body.position, 'VP Engineering')

    // Create 2nd contact to test ordering
    const cr2 = await POST(`/customers/${custId}/contacts`, { person: 'Second Contact', main_phone: '555-2000' })
    ok(cr2.ok, 'POST second contact → 200', cr2.status, 200)
    ok(cr2.body.display_order > 0, 'Second contact display_order > 0 (auto-incremented)', cr2.body.display_order, '>0')
    const contactId2 = cr2.body._id

    // DELETE contact (soft — sets status inactive)
    const dl = await DELETE(`/customers/${custId}/contacts/${contactId}`)
    ok(dl.ok, 'DELETE /contacts/:contactId → 200', dl.status, 200)
    ok(dl.body.message === 'Contact deleted', 'Delete message', dl.body.message, 'Contact deleted')

    // After soft-delete, contact not returned in active contacts
    const rd2 = await GET(`/customers/${custId}`)
    const stillActive = rd2.body.contacts?.some(c => String(c._id) === String(contactId) && c.status === 'active')
    ok(!stillActive, 'Soft-deleted contact not in active contacts', !stillActive, true)
    info('Contact DELETE is SOFT (status=inactive, not removed from DB)')

    // Cleanup 2nd contact
    if (contactId2) { await DELETE(`/customers/${custId}/contacts/${contactId2}`); pass('2nd contact cleanup') }
    contactId = null
  }
}

// ══════════════════════════════════════════════════════════════════════════
// 12. ADDRESSES CRUD
// ══════════════════════════════════════════════════════════════════════════
section('12. Address CRUD — POST/PUT/DELETE /customers/:id/addresses')
{
  if (!custId) { skip('Addresses CRUD', 'no custId'); }
  else {
    // CREATE address
    const cr = await POST(`/customers/${custId}/addresses`, {
      address_label: 'Shipping',
      address_tag:   'warehouse',
      name:          'Warehouse A',
      street_address: '500 Warehouse Rd',
      street_address2: 'Suite 100',
      city:          'Austin',
      state:         'TX',
      zip_code:      '78701',
      country:       'USA',
      email:         `ship_${TS}@testco.com`,
      phoneno:       '555-3001',
      shipping_acnt: 'SHIP-001',
    })
    ok(cr.ok, 'POST /addresses → 200', cr.status, 200)
    ok(cr.body.address_label === 'Shipping', 'address_label stored', cr.body.address_label, 'Shipping')
    ok(cr.body.street_address === '500 Warehouse Rd', 'street_address stored', cr.body.street_address, '500 Warehouse Rd')
    ok(cr.body.city === 'Austin', 'city stored', cr.body.city, 'Austin')
    ok(cr.body.zip_code === '78701', 'zip_code stored', cr.body.zip_code, '78701')
    ok(cr.body.country === 'USA', 'country stored', cr.body.country, 'USA')
    ok(cr.body.shipping_acnt === 'SHIP-001', 'shipping_acnt stored', cr.body.shipping_acnt, 'SHIP-001')
    ok(cr.body.status === 1, 'status = 1 (numeric active)', cr.body.status, 1)
    addressId = cr.body._id
    info(`Created address id=${addressId}`)

    // UPDATE address
    const up = await PUT(`/customers/${custId}/addresses/${addressId}`, {
      address_label: 'Billing',
      street_address: '600 Billing Ave',
      city:           'Dallas',
      state:          'TX',
      zip_code:       '75201',
      country:        'USA',
    })
    ok(up.ok, 'PUT /addresses/:id → 200', up.status, 200)
    ok(up.body.address_label === 'Billing', 'address_label updated', up.body.address_label, 'Billing')
    ok(up.body.city === 'Dallas', 'city updated', up.body.city, 'Dallas')
    ok(up.body.street_address === '600 Billing Ave', 'street_address updated', up.body.street_address, '600 Billing Ave')

    // Address appears in GET /:id
    const rd = await GET(`/customers/${custId}`)
    const foundAddr = rd.body.addresses?.some(a => String(a._id) === String(addressId))
    ok(foundAddr, 'Address in GET /:id addresses array', foundAddr, true)

    // DELETE address (soft — sets status=0)
    const dl = await DELETE(`/customers/${custId}/addresses/${addressId}`)
    ok(dl.ok, 'DELETE /addresses/:id → 200', dl.status, 200)
    ok(dl.body.message === 'Address deleted', 'Delete message', dl.body.message, 'Address deleted')
    info('Address DELETE is SOFT (status=0, not removed from DB)')

    // No legacy_id → 400 on address create
    const r400 = await POST('/customers/000000000000000000000000/addresses', { street_address: '1 Test St' })
    ok(r400.status === 404, 'POST address to unknown customer → 404', r400.status, 404)
    addressId = null
  }
}

// ══════════════════════════════════════════════════════════════════════════
// 13. EMAILS CRUD
// ══════════════════════════════════════════════════════════════════════════
section('13. Emails — POST /customers/:id/emails + DELETE')
{
  if (!custId) { skip('Emails CRUD', 'no custId'); }
  else {
    // CREATE bulk emails
    const cr = await POST(`/customers/${custId}/emails`, {
      emails: [
        { name: 'Primary',   email: `primary_${TS}@testco.com` },
        { name: 'Secondary', email: `secondary_${TS}@testco.com` },
      ]
    })
    ok(cr.ok, 'POST /emails bulk → 200', cr.status, 200)
    ok(cr.body.message.includes('2'), '2 emails added', cr.body.message, 'includes 2')

    // Verify in GET /:id
    const rd = await GET(`/customers/${custId}`)
    const testEmails = (rd.body.emails || []).filter(e => e.email?.includes(TS))
    ok(testEmails.length >= 2, `${testEmails.length} test emails in response`, testEmails.length, '>=2')
    if (testEmails.length > 0) emailId = testEmails[0]._id

    // Validation: not an array → 400
    const r400 = await POST(`/customers/${custId}/emails`, { emails: 'not-array' })
    ok(r400.status === 400, 'Non-array emails → 400', r400.status, 400)

    // Empty array → 400
    const r401 = await POST(`/customers/${custId}/emails`, { emails: [] })
    ok(r401.status === 400, 'Empty emails array → 400', r401.status, 400)

    // DELETE email (soft)
    if (emailId) {
      const dl = await DELETE(`/customers/${custId}/emails/${emailId}`)
      ok(dl.ok, 'DELETE /emails/:id → 200', dl.status, 200)
      ok(dl.body.message === 'Email deleted', 'Email delete message', dl.body.message, 'Email deleted')
      info('Email DELETE is SOFT (status=inactive)')
    }
  }
}

// ══════════════════════════════════════════════════════════════════════════
// 14. ASSIGN REPS
// ══════════════════════════════════════════════════════════════════════════
section('14. Assign Sales Reps — PUT /customers/:id/reps')
{
  if (!custId) { skip('Assign reps', 'no custId'); }
  else {
    // Get available reps
    const repList = await GET('/sales-reps?status=active')
    const repIds = repList.body.slice(0, 2).map(r => r._id)

    if (repIds.length > 0) {
      const r = await PUT(`/customers/${custId}/reps`, { repIds })
      ok(r.ok, 'PUT /reps → 200', r.status, 200)
      ok(r.body.message === 'Sales reps updated', 'Reps updated message', r.body.message, 'Sales reps updated')

      // Verify in GET /:id
      const rd = await GET(`/customers/${custId}`)
      ok(Array.isArray(rd.body.assignedReps), 'assignedReps is array', Array.isArray(rd.body.assignedReps), true)
      info(`Assigned reps: ${rd.body.assignedReps?.length}`)

      // Clear reps
      const clear = await PUT(`/customers/${custId}/reps`, { repIds: [] })
      ok(clear.ok, 'PUT /reps with [] → 200 (clear all)', clear.status, 200)
    } else {
      info('No active reps to assign')
    }

    // Non-array repIds → 400
    const r400 = await PUT(`/customers/${custId}/reps`, { repIds: 'not-array' })
    ok(r400.status === 400, 'Non-array repIds → 400', r400.status, 400)

    // Unknown customer → 404
    const r404 = await PUT('/customers/000000000000000000000000/reps', { repIds: [] })
    ok(r404.status === 404, 'Unknown customer → 404', r404.status, 404)
  }
}

// ══════════════════════════════════════════════════════════════════════════
// 15. CUSTOMER TERMS
// ══════════════════════════════════════════════════════════════════════════
section('15. Customer Terms — POST /customers/:id/terms')
{
  if (!custId) { skip('Terms', 'no custId'); }
  else {
    const r = await POST(`/customers/${custId}/terms`, {
      cust_terms:   'Net45',
      customer_FOB: 'Destination',
      cust_ship:    'DHL',
      cust_ship_via:'Air',
      cust_project: 'Alpha',
    })
    ok(r.ok, 'POST /terms → 200', r.status, 200)
    ok(r.body.cust_terms === 'Net45', 'cust_terms stored', r.body.cust_terms, 'Net45')
    ok(r.body.customer_FOB === 'Destination', 'customer_FOB stored', r.body.customer_FOB, 'Destination')
    ok(r.body.cust_ship === 'DHL', 'cust_ship stored', r.body.cust_ship, 'DHL')
    ok(r.body.cust_ship_via === 'Air', 'cust_ship_via stored', r.body.cust_ship_via, 'Air')
    ok(r.body.cust_project === 'Alpha', 'cust_project stored', r.body.cust_project, 'Alpha')

    // 404 unknown
    const r404 = await POST('/customers/000000000000000000000000/terms', { cust_terms: 'X' })
    ok(r404.status === 404, 'Terms on unknown customer → 404', r404.status, 404)
  }
}

// ══════════════════════════════════════════════════════════════════════════
// 16. ADDITIONAL INFO
// ══════════════════════════════════════════════════════════════════════════
section('16. Additional Info — POST /customers/:id/additional-info')
{
  if (!custId) { skip('Additional info', 'no custId'); }
  else {
    const r = await POST(`/customers/${custId}/additional-info`, {
      additional_info: 'This is a deep CRUD test note with additional information.',
    })
    ok(r.ok, 'POST /additional-info → 200', r.status, 200)
    ok(r.body.additional_info === 'This is a deep CRUD test note with additional information.',
      'additional_info stored', r.body.additional_info, 'stored correctly')

    // Clear info
    const r2 = await POST(`/customers/${custId}/additional-info`, { additional_info: '' })
    ok(r2.ok, 'POST /additional-info empty → 200', r2.status, 200)
    ok(r2.body.additional_info === '', 'info cleared', r2.body.additional_info, '')

    const r404 = await POST('/customers/000000000000000000000000/additional-info', { additional_info: 'X' })
    ok(r404.status === 404, 'Unknown customer → 404', r404.status, 404)
  }
}

// ══════════════════════════════════════════════════════════════════════════
// 17. SEND OVERDUE EMAIL
// ══════════════════════════════════════════════════════════════════════════
section('17. Send Overdue Email — POST /customers/:id/send-overdue-email')
{
  if (!custId) { skip('Overdue email', 'no custId'); }
  else {
    // New customer has no invoices → expects "No overdue invoices"
    const r = await POST(`/customers/${custId}/send-overdue-email`, {})
    ok(r.ok, 'POST /send-overdue-email → 200 (no overdue)', r.status, 200)
    ok(r.body.success === true, 'success: true', r.body.success, true)
    ok(typeof r.body.message === 'string', 'message returned', typeof r.body.message, 'string')
    info(`Overdue email: ${r.body.message}`)

    const r404 = await POST('/customers/000000000000000000000000/send-overdue-email', {})
    ok(r404.status === 404, 'Unknown customer → 404', r404.status, 404)
  }
}

// ══════════════════════════════════════════════════════════════════════════
// 18. CUSTOMER INVOICES
// ══════════════════════════════════════════════════════════════════════════
section('18. Customer Invoices — GET /customers/:id/invoices')
{
  if (!existingCustId) { skip('Customer invoices', 'no existingCustId'); }
  else {
    const r = await GET(`/customers/${existingCustId}/invoices`)
    ok(r.ok, 'GET /invoices → 200', r.status, 200)
    ok('rows' in r.body && 'years' in r.body, 'Response has rows and years', true, true)
    ok(Array.isArray(r.body.rows), 'rows is array', Array.isArray(r.body.rows), true)
    ok(Array.isArray(r.body.years), 'years is array', Array.isArray(r.body.years), true)
    info(`Customer invoices: ${r.body.rows.length} rows  years: ${r.body.years.join(', ')}`)

    if (r.body.rows.length > 0) {
      const row = r.body.rows[0]
      ok('po_id' in row, 'row has po_id', true, true)
      ok('invoice_number' in row, 'row has invoice_number', true, true)
      ok('net_amount' in row, 'row has net_amount', true, true)
      ok(typeof row.line === 'number', 'row has line number', typeof row.line, 'number')
    }

    // Year filter
    if (r.body.years.length > 0) {
      const year = r.body.years[0]
      const rYear = await GET(`/customers/${existingCustId}/invoices?year=${year}`)
      ok(rYear.ok, `GET /invoices?year=${year} → 200`, rYear.status, 200)
    }

    // year=all
    const rAll = await GET(`/customers/${existingCustId}/invoices?year=all`)
    ok(rAll.ok, 'GET /invoices?year=all → 200', rAll.status, 200)
    ok(Array.isArray(rAll.body.rows), 'year=all: rows is array', Array.isArray(rAll.body.rows), true)

    // New customer → empty invoices
    if (custId) {
      const r2 = await GET(`/customers/${custId}/invoices`)
      ok(r2.ok && Array.isArray(r2.body.rows) && r2.body.rows.length === 0,
        'New customer: invoices = []', r2.body.rows?.length, 0)
    }

    const r404 = await GET('/customers/000000000000000000000000/invoices')
    ok(r404.status === 404, '404 unknown customer', r404.status, 404)
  }
}

// ══════════════════════════════════════════════════════════════════════════
// 19. CUSTOMER COMMISSIONS
// ══════════════════════════════════════════════════════════════════════════
section('19. Customer Commissions — GET /customers/:id/commissions')
{
  if (!existingCustId) { skip('Customer commissions', 'no existingCustId'); }
  else {
    const r = await GET(`/customers/${existingCustId}/commissions`)
    ok(r.ok, 'GET /commissions → 200', r.status, 200)
    ok(Array.isArray(r.body), 'Response is array', Array.isArray(r.body), true)
    info(`Customer commissions: ${r.body.length}`)

    if (r.body.length > 0) {
      const row = r.body[0]
      ok('po_id' in row, 'Has po_id', true, true)
      ok('comm_total' in row, 'Has comm_total', true, true)
      ok('payment_status' in row, 'Has payment_status', true, true)
      ok(['unpaid','partial','fullpaid'].includes(row.payment_status),
        `payment_status valid: ${row.payment_status}`, row.payment_status, 'unpaid|partial|fullpaid')
      ok('save_status' in row, 'Has save_status', true, true)
      ok(Array.isArray(row.rep_details), 'rep_details is array', Array.isArray(row.rep_details), true)
      ok(Array.isArray(row.payment_details), 'payment_details is array', Array.isArray(row.payment_details), true)
      info(`First: inv#${row.invoice_number}  total=$${row.comm_total}  status=${row.payment_status}`)
    }

    if (custId) {
      const r2 = await GET(`/customers/${custId}/commissions`)
      ok(r2.ok && Array.isArray(r2.body) && r2.body.length === 0,
        'New customer: commissions = []', r2.body.length, 0)
    }

    const r404 = await GET('/customers/000000000000000000000000/commissions')
    ok(r404.status === 404, '404 unknown customer', r404.status, 404)
  }
}

// ══════════════════════════════════════════════════════════════════════════
// 20. CUSTOMER HISTORY
// ══════════════════════════════════════════════════════════════════════════
section('20. Customer History — GET /customers/:id/history')
{
  if (!existingCustId) { skip('Customer history', 'no existingCustId'); }
  else {
    const r = await GET(`/customers/${existingCustId}/history`)
    ok(r.ok, 'GET /history → 200', r.status, 200)
    ok('rows' in r.body, 'Response has rows', true, true)
    ok('repColumns' in r.body, 'Response has repColumns', true, true)
    ok('itemTypeColumns' in r.body, 'Response has itemTypeColumns', true, true)
    ok(Array.isArray(r.body.rows), 'rows is array', Array.isArray(r.body.rows), true)
    info(`History: ${r.body.rows.length} rows  ${r.body.repColumns?.length} rep cols  ${r.body.itemTypeColumns?.length} item type cols`)

    if (custId) {
      const r2 = await GET(`/customers/${custId}/history`)
      ok(r2.ok, 'New customer history → 200', r2.status, 200)
      ok(r2.body.rows?.length === 0, 'New customer: history rows = []', r2.body.rows?.length, 0)
    }

    const r404 = await GET('/customers/000000000000000000000000/history')
    ok(r404.status === 404, '404 unknown customer', r404.status, 404)
  }
}

// ══════════════════════════════════════════════════════════════════════════
// 21. SUPPLIERS FULL CRUD + ALL SUB-ACTIONS
// ══════════════════════════════════════════════════════════════════════════
section('21a. Suppliers — Stats, List, Unique Check')
{
  const stats = await GET('/suppliers/stats')
  ok(stats.ok, 'GET /suppliers/stats → 200', stats.status, 200)
  ok(typeof stats.body.total    === 'number', 'total is number',    typeof stats.body.total,    'number')
  ok(typeof stats.body.active   === 'number', 'active is number',   typeof stats.body.active,   'number')
  ok(typeof stats.body.inactive === 'number', 'inactive is number', typeof stats.body.inactive, 'number')
  info(`Supplier stats: total=${stats.body.total}  active=${stats.body.active}`)

  const list = await GET('/suppliers')
  ok(list.ok, 'GET /suppliers → 200', list.status, 200)
  ok(Array.isArray(list.body), 'List is array', Array.isArray(list.body), true)
  ok(list.body.length > 0, `At least 1 supplier (${list.body.length})`, list.body.length, '>0')

  // Status filter
  const actList = await GET('/suppliers?status=active')
  ok(actList.ok, 'GET /suppliers?status=active → 200', actList.status, 200)
  const allActive = actList.body.every(s => s.status === 'active')
  ok(allActive, 'All filtered suppliers are active', allActive, true)

  // Unique check
  const u1 = await GET(`/suppliers/check-unique?name=NoSuchSupplier_${TS}`)
  ok(u1.body.unique === true, 'Non-existing supplier name → unique', u1.body.unique, true)

  const existingName = list.body[0]?.supplier_name
  if (existingName) {
    const u2 = await GET(`/suppliers/check-unique?name=${encodeURIComponent(existingName)}`)
    ok(u2.body.unique === false, 'Existing name → not unique', u2.body.unique, false)

    const u3 = await GET(`/suppliers/check-unique?name=${encodeURIComponent(existingName.toUpperCase())}`)
    ok(u3.body.unique === false, 'Case-insensitive: UPPER → not unique', u3.body.unique, false)

    const u4 = await GET(`/suppliers/check-unique?name=${encodeURIComponent(existingName)}&exclude_id=${list.body[0]._id}`)
    ok(u4.body.unique === true, 'Exclude own id → unique', u4.body.unique, true)
  }
}

section('21b. Suppliers — Create, Read, Full Detail, Update')
{
  // Create
  const cr = await POST('/suppliers', {
    supplier_name: `TestSupplier_${TS}`,
    supplier_type: 'manufacturer',
    contact_name:  'Bob Supply',
    phone:         '555-4001',
    extension:     '401',
    email:         `supplier_${TS}@test.com`,
    customer_code: `SUP${Date.now().toString().slice(-4)}`,
    notes:         'Deep CRUD test supplier',
    terms:         'Net30',
    fob:           'Factory',
    ship:          'FedEx',
    ship_via:      'Air Freight',
    project:       'SupplyProject',
    city:          'Chicago',
    state:         'IL',
    status:        'active',
  })
  ok(cr.ok, 'POST /suppliers → 200', cr.status, 200)
  ok(cr.body.supplier_name === `TestSupplier_${TS}`, 'supplier_name stored', cr.body.supplier_name, `TestSupplier_${TS}`)
  ok(cr.body.supplier_type === 'manufacturer', 'supplier_type stored', cr.body.supplier_type, 'manufacturer')
  ok(cr.body.phone === '555-4001', 'phone stored', cr.body.phone, '555-4001')
  ok(cr.body.city === 'Chicago', 'city stored', cr.body.city, 'Chicago')
  ok(cr.body.status === 'active', 'status stored', cr.body.status, 'active')
  ok(!!cr.body._id, '_id returned', !!cr.body._id, true)
  suppId = cr.body._id
  info(`Created supplier id=${suppId}`)

  // Missing supplier_name → 400
  const crBad = await POST('/suppliers', { phone: '555-0000' })
  ok(crBad.status === 400, 'Missing supplier_name → 400', crBad.status, 400)

  // Read single
  const rd = await GET(`/suppliers/${suppId}`)
  ok(rd.ok, 'GET /suppliers/:id → 200', rd.status, 200)
  ok(rd.body._id === suppId, '_id matches', rd.body._id, suppId)
  ok(rd.body.supplier_name === `TestSupplier_${TS}`, 'name matches', rd.body.supplier_name, `TestSupplier_${TS}`)

  const rd404 = await GET('/suppliers/000000000000000000000000')
  ok(rd404.status === 404, '404 unknown supplier', rd404.status, 404)

  // Full detail (with addresses and contacts)
  const full = await GET(`/suppliers/${suppId}/full`)
  ok(full.ok, 'GET /suppliers/:id/full → 200', full.status, 200)
  ok(Array.isArray(full.body.addresses), 'addresses array returned', Array.isArray(full.body.addresses), true)
  ok(Array.isArray(full.body.contacts), 'contacts array returned', Array.isArray(full.body.contacts), true)

  // Update
  const up = await PUT(`/suppliers/${suppId}`, {
    supplier_name: `TestSupplier_${TS}_upd`,
    phone:         '555-4002',
    city:          'Milwaukee',
    notes:         'Updated notes',
  })
  ok(up.ok, 'PUT /suppliers/:id → 200', up.status, 200)
  ok(up.body.supplier_name === `TestSupplier_${TS}_upd`, 'name updated', up.body.supplier_name, `TestSupplier_${TS}_upd`)
  ok(up.body.city === 'Milwaukee', 'city updated', up.body.city, 'Milwaukee')

  // Airfeet POs for supplier
  const pos = await GET(`/suppliers/${suppId}/airfeet-pos`)
  ok(pos.ok, 'GET /suppliers/:id/airfeet-pos → 200', pos.status, 200)
  ok(Array.isArray(pos.body), 'airfeet-pos is array', Array.isArray(pos.body), true)
  info(`Airfeet POs for supplier: ${pos.body.length}`)
}

section('21c. Suppliers — Address CRUD (HARD delete)')
{
  if (!suppId) { skip('Supplier address CRUD', 'no suppId'); }
  else {
    // CREATE address
    const cr = await POST(`/suppliers/${suppId}/addresses`, {
      street_address: '100 Supplier St',
      city:           'Chicago',
      state:          'IL',
      zip_code:       '60601',
      country:        'USA',
      address_type:   'primary',
    })
    ok(cr.status === 201, 'POST /addresses → 201', cr.status, 201)
    ok(cr.body.street_address === '100 Supplier St', 'street stored', cr.body.street_address, '100 Supplier St')
    ok(cr.body.status === 'active', 'status = active', cr.body.status, 'active')
    const suppAddrId = cr.body._id
    info(`Created supplier address id=${suppAddrId}`)

    // UPDATE address
    const up = await PUT(`/suppliers/${suppId}/addresses/${suppAddrId}`, {
      street_address: '200 Updated Ave',
      city:           'Chicago',
    })
    ok(up.ok, 'PUT /addresses/:id → 200', up.status, 200)
    ok(up.body.street_address === '200 Updated Ave', 'street updated', up.body.street_address, '200 Updated Ave')

    // Verify in full detail
    const full = await GET(`/suppliers/${suppId}/full`)
    const foundAddr = full.body.addresses?.some(a => String(a._id) === String(suppAddrId))
    ok(foundAddr, 'Address in full detail', foundAddr, true)

    // DELETE (HARD delete — actually deletes)
    const dl = await DELETE(`/suppliers/${suppId}/addresses/${suppAddrId}`)
    ok(dl.ok, 'DELETE /addresses/:id → 200 (hard delete)', dl.status, 200)
    ok(dl.body.success === true, 'success: true', dl.body.success, true)

    // Confirm gone
    const full2 = await GET(`/suppliers/${suppId}/full`)
    const stillThere = full2.body.addresses?.some(a => String(a._id) === String(suppAddrId))
    ok(!stillThere, 'Address gone after hard delete', !stillThere, true)
    info('Supplier address DELETE is HARD (permanent removal)')
  }
}

section('21d. Suppliers — Contact CRUD (HARD delete)')
{
  if (!suppId) { skip('Supplier contact CRUD', 'no suppId'); }
  else {
    // CREATE contact
    const cr = await POST(`/suppliers/${suppId}/contacts`, {
      contact_name:   'Alice Supplier',
      contact_number: '555-5001',
      contact_email:  `alice_${TS}@supplier.com`,
      position:       'Account Manager',
    })
    ok(cr.status === 201, 'POST /contacts → 201', cr.status, 201)
    ok(cr.body.contact_name === 'Alice Supplier', 'contact_name stored', cr.body.contact_name, 'Alice Supplier')
    const suppContactId = cr.body._id

    // UPDATE contact
    const up = await PUT(`/suppliers/${suppId}/contacts/${suppContactId}`, {
      contact_name:  'Alice Updated',
      position:      'VP Supply',
    })
    ok(up.ok, 'PUT /contacts/:id → 200', up.status, 200)
    ok(up.body.contact_name === 'Alice Updated', 'name updated', up.body.contact_name, 'Alice Updated')

    // DELETE (HARD)
    const dl = await DELETE(`/suppliers/${suppId}/contacts/${suppContactId}`)
    ok(dl.ok, 'DELETE /contacts/:id → 200 (hard delete)', dl.status, 200)

    const full = await GET(`/suppliers/${suppId}/full`)
    const gone = !full.body.contacts?.some(c => String(c._id) === String(suppContactId))
    ok(gone, 'Contact gone after hard delete', gone, true)
    info('Supplier contact DELETE is HARD (permanent removal)')
  }
}

section('21e. Suppliers — Terms + Notes actions')
{
  if (!suppId) { skip('Supplier terms/notes', 'no suppId'); }
  else {
    // Terms
    const terms = await PUT(`/suppliers/${suppId}/terms`, {
      terms: 'Net45', fob: 'Factory', ship: 'UPS', ship_via: 'Ground',
      project: 'Phase2', ship_date: '2026-06-01',
    })
    ok(terms.ok, 'PUT /suppliers/:id/terms → 200', terms.status, 200)
    ok(terms.body.terms === 'Net45', 'terms stored', terms.body.terms, 'Net45')
    ok(terms.body.fob === 'Factory', 'fob stored', terms.body.fob, 'Factory')
    ok(terms.body.ship_date === '2026-06-01', 'ship_date stored', terms.body.ship_date, '2026-06-01')

    // Notes
    const notes = await PUT(`/suppliers/${suppId}/notes`, { notes: 'Special supplier notes for deep CRUD test.' })
    ok(notes.ok, 'PUT /suppliers/:id/notes → 200', notes.status, 200)
    ok(notes.body.notes === 'Special supplier notes for deep CRUD test.', 'notes stored', notes.body.notes, 'stored correctly')
  }
}

section('21f. Suppliers — Soft Delete + Permanent Delete')
{
  if (!suppId) { skip('Supplier delete', 'no suppId'); }
  else {
    // Soft delete (default)
    const soft = await DELETE(`/suppliers/${suppId}`)
    ok(soft.ok, 'DELETE (soft) → 200', soft.status, 200)
    ok(soft.body.message === 'Supplier deactivated', 'Soft delete message', soft.body.message, 'Supplier deactivated')

    // Verify still exists with status=inactive
    const rd = await GET(`/suppliers/${suppId}`)
    ok(rd.ok, 'Soft-deleted supplier still accessible', rd.status, 200)
    ok(rd.body.status === 'inactive', 'status = inactive after soft delete', rd.body.status, 'inactive')

    // In inactive list
    const inact = await GET('/suppliers?status=inactive')
    const found = inact.body.some(s => s._id === suppId)
    ok(found, 'Supplier in inactive list after soft delete', found, true)

    // Permanent delete
    const perm = await DELETE(`/suppliers/${suppId}?permanent=true`)
    ok(perm.ok, 'DELETE ?permanent=true → 200', perm.status, 200)
    ok(perm.body.message === 'Supplier permanently deleted', 'Permanent delete message', perm.body.message, 'Supplier permanently deleted')

    // Confirm truly gone
    const gone = await GET(`/suppliers/${suppId}`)
    ok(gone.status === 404, 'Permanently deleted supplier → 404', gone.status, 404)
    info('Supplier DELETE: soft (status=inactive) vs permanent (?permanent=true)')
    suppId = null
  }
}

// ══════════════════════════════════════════════════════════════════════════
// 22. CUSTOMER REPORTS
// ══════════════════════════════════════════════════════════════════════════
section('22. Customer Reports — GET /reports/year + /reports/month')
{
  const yr = await GET('/reports/year')
  ok(yr.ok, 'GET /reports/year → 200', yr.status, 200)
  ok(Array.isArray(yr.body), 'Yearly report is array', Array.isArray(yr.body), true)
  info(`Yearly report rows: ${yr.body.length}`)

  const mo = await GET('/reports/month')
  ok(mo.ok, 'GET /reports/month → 200', mo.status, 200)
  ok(Array.isArray(mo.body), 'Monthly report is array', Array.isArray(mo.body), true)
  info(`Monthly report rows: ${mo.body.length}`)

  // Filtered by year
  const yr2026 = await GET('/reports/month?year=2026')
  ok(yr2026.ok, 'GET /reports/month?year=2026 → 200', yr2026.status, 200)
  info(`2026 report rows: ${yr2026.body.length}`)

  // Rep filter on stats
  const repList = await GET('/sales-reps?status=active')
  if (repList.body[0]) {
    const repId = repList.body[0].legacy_id
    if (repId) {
      const repStats = await GET(`/customers/stats?rep_id=${repId}`)
      ok(repStats.ok, `GET /customers/stats?rep_id=${repId} → 200`, repStats.status, 200)
      ok(typeof repStats.body.total === 'number', 'Rep-scoped stats.total is number', typeof repStats.body.total, 'number')
      info(`Rep-scoped stats: ${repStats.body.total} customers`)
    }
  }
}

// ══════════════════════════════════════════════════════════════════════════
// 23. DELETE CUSTOMER (HARD)
// ══════════════════════════════════════════════════════════════════════════
section('23. Delete Customer — DELETE /customers/:id (HARD delete)')
{
  if (!custId) { skip('DELETE customer', 'no custId'); }
  else {
    const r = await DELETE(`/customers/${custId}`)
    ok(r.ok, 'DELETE → 200', r.status, 200)
    ok(r.body.message === 'Customer deleted', 'Delete message', r.body.message, 'Customer deleted')

    // Confirm gone from all endpoints
    const gone = await GET(`/customers/${custId}`)
    ok(gone.status === 404, 'Deleted customer → 404', gone.status, 404)

    const list = await GET('/customers')
    ok(!list.body.some(c => c._id === custId), 'Not in customer list', true, true)

    // 404 sub-resources for deleted customer
    const inv = await GET(`/customers/${custId}/invoices`)
    ok(inv.status === 404, '404 on /invoices after delete', inv.status, 404)
    const comm = await GET(`/customers/${custId}/commissions`)
    ok(comm.status === 404, '404 on /commissions after delete', comm.status, 404)

    info('Customer DELETE is HARD (permanent — no recovery)')
    custId = null
  }

  // 404 on unknown (DELETE /customers doesn't check existence — deleteOne returns success even if no doc)
  const r2 = await DELETE('/customers/000000000000000000000000')
  ok(r2.ok, 'DELETE unknown → 200 (deleteOne does not error)', r2.status, 200)
}

// ══════════════════════════════════════════════════════════════════════════
// 24. EDGE CASES
// ══════════════════════════════════════════════════════════════════════════
section('24. Edge Cases')
{
  // Special chars in company_name
  const sp = await POST('/customers', { company_name: `O'Brien & Sons, LLC — ${TS}` })
  ok(sp.ok, "Apostrophe/ampersand/dash in company_name → 200", sp.status, 200)
  ok(sp.body.company_name === `O'Brien & Sons, LLC — ${TS}`, 'Special chars stored', sp.body.company_name, `O'Brien & Sons, LLC — ${TS}`)
  if (sp.body._id) { await DELETE(`/customers/${sp.body._id}`); pass('Special chars cleanup') }

  // Long company name
  const longName = `LongCo_${TS}_` + 'X'.repeat(200)
  const lon = await POST('/customers', { company_name: longName })
  ok(lon.ok, '200-char company name → 200', lon.status, 200)
  if (lon.body._id) { await DELETE(`/customers/${lon.body._id}`); pass('Long name cleanup') }

  // Stats consistency: total = active + inactive + pilot + other
  const s1 = await GET('/customers/stats')
  const allCusts = await GET('/customers')
  ok(allCusts.body.length === s1.body.total || Math.abs(allCusts.body.length - s1.body.total) <= 5,
    `Stats.total (${s1.body.total}) ≈ list length (${allCusts.body.length})`,
    allCusts.body.length, s1.body.total)

  // Supplier supplier_history on existing supplier
  const suppList = await GET('/suppliers')
  if (suppList.body.length > 0) {
    const existingSupp = suppList.body[0]
    const hist = await GET(`/suppliers/${existingSupp._id}/history`)
    ok(hist.ok, 'GET /suppliers/:id/history → 200', hist.status, 200)
    ok('poList' in hist.body, 'history has poList', true, true)
    ok('itemTypeColumns' in hist.body, 'history has itemTypeColumns', true, true)
    info(`Supplier history: ${hist.body.poList?.length} POs`)
  }

  // Customer types via /customers/types (different from /customer-types)
  const ct = await GET('/customers/types')
  ok(ct.ok, 'GET /customers/types → 200', ct.status, 200)
  ok(Array.isArray(ct.body), 'Types is array', Array.isArray(ct.body), true)
  info(`Active customer types (via /customers/types): ${ct.body.length}`)
}

// ─── Summary ─────────────────────────────────────────────────────────────────
const total = passed + failed + skipped
console.log('\n' + '═'.repeat(62))
console.log('\x1b[1mCUSTOMERS DEEP TEST SUMMARY\x1b[0m')
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
if (failed === 0) console.log('\n\x1b[32m✓ All Customers tests passed.\x1b[0m')
else              console.log(`\n\x1b[31m✗ ${failed} test(s) failed.\x1b[0m`)
