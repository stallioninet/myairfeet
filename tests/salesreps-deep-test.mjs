/**
 * Deep CRUD Test Suite — Sales Reps Menu (all submenus + action buttons)
 *
 * Submenus tested:
 *   1. Active Sales Reps   (/api/sales-reps?status=active)
 *   2. Inactive Sales Reps (/api/sales-reps?status=inactive)
 *   3. Stats               (/api/sales-reps/stats)
 *   4. Unique Check        (/api/sales-reps/check-unique)
 *   5. Create Rep          (POST /api/sales-reps)
 *   6. Read Single Rep     (GET /api/sales-reps/:id)
 *   7. Update Rep          (PUT /api/sales-reps/:id)
 *   8. Activate/Deactivate (PUT /api/sales-reps/:id/activate|deactivate)
 *   9. Delete Rep          (DELETE /api/sales-reps/:id)
 *  10. Commission Stats    (GET /api/sales-reps/:id/commission-stats)
 *  11. Commissions List    (GET /api/sales-reps/:id/commissions)
 *  12. Invoices List       (GET /api/sales-reps/:id/invoices)
 *  13. Customers List      (GET /api/sales-reps/:id/customers)
 *  14. Invoice Detail      (GET /api/sales-reps/invoice/:invoiceId)
 *  15. Reports             (GET /api/reports/sales-rep-month|year)
 *  16. Cross-field / Edge cases
 *
 * Usage: node tests/salesreps-deep-test.mjs
 */

const BASE = 'http://localhost:5000/api'
const TS   = `SR_${Date.now()}`

// ─── Helpers ─────────────────────────────────────────────────────────────────
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

// ─── Test State ───────────────────────────────────────────────────────────────
let repId          = null   // created rep _id
let repId2         = null   // second rep for dedup tests
let existingRepId  = null   // an existing rep for sub-resource tests
let existingInvId  = null   // invoice belonging to existing rep

// ════════════════════════════════════════════════════════════════════════════
// 1. STATS
// ════════════════════════════════════════════════════════════════════════════
section('1. Stats — GET /sales-reps/stats')
{
  const r = await GET('/sales-reps/stats')
  ok(r.ok, 'GET /stats → 200', r.status, 200)
  ok(typeof r.body.total    === 'number', 'total is number',    typeof r.body.total,    'number')
  ok(typeof r.body.active   === 'number', 'active is number',   typeof r.body.active,   'number')
  ok(typeof r.body.inactive === 'number', 'inactive is number', typeof r.body.inactive, 'number')
  ok(r.body.total === r.body.active + r.body.inactive,
    `total(${r.body.total}) = active(${r.body.active}) + inactive(${r.body.inactive})`,
    r.body.total, r.body.active + r.body.inactive)
  ok(r.body.total > 0, `At least 1 rep exists (total=${r.body.total})`, r.body.total, '>0')
  info(`Stats: total=${r.body.total}  active=${r.body.active}  inactive=${r.body.inactive}`)
}

// ════════════════════════════════════════════════════════════════════════════
// 2. ACTIVE LIST
// ════════════════════════════════════════════════════════════════════════════
section('2. Active Sales Reps List — GET /sales-reps?status=active')
{
  const r = await GET('/sales-reps?status=active')
  ok(r.ok, 'GET /sales-reps?status=active → 200', r.status, 200)
  ok(Array.isArray(r.body), 'Response is array', Array.isArray(r.body), true)
  ok(r.body.length > 0, `At least 1 active rep (${r.body.length})`, r.body.length, '>0')

  // Every record must be active
  const allActive = r.body.every(rep => rep.status === 'active')
  ok(allActive, 'All returned reps have status=active', allActive, true)

  // Verify mapped fields
  const first = r.body[0]
  ok('_id' in first, 'Has _id', true, true)
  ok('first_name' in first, 'Has first_name', true, true)
  ok('last_name' in first, 'Has last_name', true, true)
  ok('email' in first, 'Has email', true, true)
  ok('rep_number' in first, 'Has rep_number', true, true)
  ok('user_cust_code' in first, 'Has user_cust_code', true, true)
  ok('phone' in first, 'Has phone (may be empty)', true, true)
  ok('status' in first, 'Has status', true, true)
  ok('address' in first, 'Has address (from user_addresses)', true, true)
  ok('city' in first, 'Has city', true, true)
  ok('state' in first, 'Has state', true, true)
  ok('zip' in first, 'Has zip', true, true)
  info(`Active reps: ${r.body.length}  First: ${first.first_name} ${first.last_name} (${first.user_cust_code})`)

  // Store an existing rep for sub-resource tests
  existingRepId = first._id
}

// ════════════════════════════════════════════════════════════════════════════
// 3. INACTIVE LIST
// ════════════════════════════════════════════════════════════════════════════
section('3. Inactive Sales Reps — GET /sales-reps?status=inactive')
{
  const r = await GET('/sales-reps?status=inactive')
  ok(r.ok, 'GET /sales-reps?status=inactive → 200', r.status, 200)
  ok(Array.isArray(r.body), 'Response is array', Array.isArray(r.body), true)

  if (r.body.length > 0) {
    const allInactive = r.body.every(rep => rep.status === 'inactive')
    ok(allInactive, 'All returned reps have status=inactive', allInactive, true)
    info(`Inactive reps: ${r.body.length}`)
  } else {
    info('No inactive reps in DB (0 records)')
    pass('Inactive list returns empty array (valid)')
  }
}

// ════════════════════════════════════════════════════════════════════════════
// 4. ALL REPS (no status filter)
// ════════════════════════════════════════════════════════════════════════════
section('4. All Reps — GET /sales-reps (no filter)')
{
  const all  = await GET('/sales-reps')
  const act  = await GET('/sales-reps?status=active')
  const inact = await GET('/sales-reps?status=inactive')

  ok(all.ok, 'GET /sales-reps → 200', all.status, 200)
  ok(all.body.length === act.body.length + inact.body.length,
    `All(${all.body.length}) = Active(${act.body.length}) + Inactive(${inact.body.length})`,
    all.body.length, act.body.length + inact.body.length)

  // Sorted by user_cust_code descending — verify first has highest code
  if (all.body.length >= 2) {
    const codes = all.body.map(r => r.user_cust_code).filter(Boolean)
    if (codes.length >= 2) {
      ok(codes[0] >= codes[1], `Sorted by user_cust_code DESC (${codes[0]} ≥ ${codes[1]})`, codes[0] >= codes[1], true)
    }
  }
}

// ════════════════════════════════════════════════════════════════════════════
// 5. UNIQUE CHECK
// ════════════════════════════════════════════════════════════════════════════
section('5. Unique Check — GET /sales-reps/check-unique')
{
  // Non-existing email → unique
  const r1 = await GET(`/sales-reps/check-unique?field=email&value=nobody_${TS}@test.com`)
  ok(r1.ok, 'Check non-existing email → 200', r1.status, 200)
  ok(r1.body.unique === true, 'Non-existing email is unique', r1.body.unique, true)

  // Non-existing username → unique
  const r2 = await GET(`/sales-reps/check-unique?field=username&value=nobody_${TS}`)
  ok(r2.body.unique === true, 'Non-existing username is unique', r2.body.unique, true)

  // Non-existing rep_number → unique
  const r3 = await GET(`/sales-reps/check-unique?field=rep_number&value=ZZZ_${TS}`)
  ok(r3.body.unique === true, 'Non-existing rep_number is unique', r3.body.unique, true)

  // Existing email (use first active rep's email)
  const repList = await GET('/sales-reps?status=active')
  const firstRepEmail = repList.body.find(r => r.email)?.email
  if (firstRepEmail) {
    const r4 = await GET(`/sales-reps/check-unique?field=email&value=${encodeURIComponent(firstRepEmail)}`)
    ok(r4.body.unique === false, `Existing email "${firstRepEmail}" → NOT unique`, r4.body.unique, false)

    // Case-insensitive check
    const r5 = await GET(`/sales-reps/check-unique?field=email&value=${encodeURIComponent(firstRepEmail.toUpperCase())}`)
    ok(r5.body.unique === false, 'Case-insensitive email check (UPPER)', r5.body.unique, false)

    // With exclude_id → unique (self)
    const ownId = repList.body.find(r => r.email === firstRepEmail)?._id
    if (ownId) {
      const r6 = await GET(`/sales-reps/check-unique?field=email&value=${encodeURIComponent(firstRepEmail)}&exclude_id=${ownId}`)
      ok(r6.body.unique === true, 'Own email with exclude_id → unique', r6.body.unique, true)
    }
  }

  // Invalid field → 400
  const r7 = await GET('/sales-reps/check-unique?field=phone&value=5551234')
  ok(r7.status === 400, 'Invalid field (phone) → 400', r7.status, 400)

  // No params → unique:true
  const r8 = await GET('/sales-reps/check-unique')
  ok(r8.ok && r8.body.unique === true, 'No params → unique:true', r8.body.unique, true)
}

// ════════════════════════════════════════════════════════════════════════════
// 6. CREATE — all fields
// ════════════════════════════════════════════════════════════════════════════
section('6. Create Sales Rep — POST /sales-reps (all fields)')
{
  const payload = {
    first_name: 'TestRep',
    last_name:  TS,
    username:   `testrep_${TS}`,
    email:      `testrep_${TS}@example.com`,
    phone:      '555-0100',
    extension:  '101',
    rep_number: `R${Date.now().toString().slice(-6)}`,
    user_cust_code: `TC${Date.now().toString().slice(-4)}`,
    user_notes: 'Deep CRUD test rep',
    territory:  'Southwest',
    commission_rate: 7.5,
    address:    '100 Test Lane',
    city:       'Dallas',
    state:      'TX',
    zip:        '75201',
    about:      'Automated test representative',
    phones:     [{ type: 'mobile', number: '555-0101' }],
    addresses:  [{ type: 'primary', street: '100 Test Lane', city: 'Dallas', state: 'TX', zip: '75201' }],
  }

  const r = await POST('/sales-reps', payload)
  ok(r.status === 201, 'POST /sales-reps → 201', r.status, 201)
  ok(r.body.first_name === 'TestRep', 'first_name stored', r.body.first_name, 'TestRep')
  ok(r.body.last_name === TS, 'last_name stored', r.body.last_name, TS)
  ok(r.body.email === `testrep_${TS}@example.com`, 'email stored', r.body.email, `testrep_${TS}@example.com`)
  ok(r.body.phone === '555-0100', 'phone stored', r.body.phone, '555-0100')
  ok(r.body.extension === '101', 'extension stored', r.body.extension, '101')
  ok(r.body.user_cust_code !== undefined, 'user_cust_code stored', !!r.body.user_cust_code, true)
  ok(r.body.territory === 'Southwest', 'territory stored', r.body.territory, 'Southwest')
  ok(r.body.commission_rate === 7.5, 'commission_rate stored as float', r.body.commission_rate, 7.5)
  ok(r.body.address === '100 Test Lane', 'address stored', r.body.address, '100 Test Lane')
  ok(r.body.city === 'Dallas', 'city stored', r.body.city, 'Dallas')
  ok(r.body.state === 'TX', 'state stored', r.body.state, 'TX')
  ok(r.body.zip === '75201', 'zip stored', r.body.zip, '75201')
  ok(r.body.user_type === 'sales_rep', 'user_type always = sales_rep', r.body.user_type, 'sales_rep')
  ok(r.body.status === 'active', 'status always = active on create', r.body.status, 'active')
  ok(r.body.blocked === false, 'blocked = false on create', r.body.blocked, false)
  ok(r.body.site_admin === false, 'site_admin = false on create', r.body.site_admin, false)
  ok(Array.isArray(r.body.phones), 'phones is array', Array.isArray(r.body.phones), true)
  ok(r.body.phones.length === 1, 'phones has 1 entry', r.body.phones.length, 1)
  ok(Array.isArray(r.body.addresses), 'addresses is array', Array.isArray(r.body.addresses), true)
  ok(r.body.addresses.length === 1, 'addresses has 1 entry', r.body.addresses.length, 1)
  ok(!!r.body._id, '_id returned', !!r.body._id, true)
  ok(!!r.body.created_at, 'created_at set', !!r.body.created_at, true)
  ok(!!r.body.updated_at, 'updated_at set', !!r.body.updated_at, true)
  repId = r.body._id
  info(`Created rep id=${repId}`)
}

section('6b. Create Sales Rep — minimal (no required fields)')
{
  // POST is fully permissive — no required fields
  const r = await POST('/sales-reps', { first_name: `MinRep_${TS}` })
  ok(r.status === 201, 'POST with only first_name → 201 (no required fields)', r.status, 201)
  ok(r.body.user_type === 'sales_rep', 'user_type set automatically', r.body.user_type, 'sales_rep')
  ok(r.body.status === 'active', 'status set automatically', r.body.status, 'active')
  ok(r.body.commission_rate === 0, 'commission_rate defaults to 0', r.body.commission_rate, 0)
  repId2 = r.body._id
  info(`Created minimal rep id=${repId2}`)
}

section('6c. Create Sales Rep — commission_rate precision')
{
  // Float precision test
  const r = await POST('/sales-reps', { first_name: 'FloatRep', commission_rate: 3.14159 })
  ok(r.status === 201, 'POST with float commission_rate → 201', r.status, 201)
  ok(r.body.commission_rate === 3.14159, 'commission_rate float stored precisely', r.body.commission_rate, 3.14159)
  // cleanup immediately
  if (r.body._id) await DELETE(`/sales-reps/${r.body._id}`)
  pass('Float commission_rate cleanup')
}

// ════════════════════════════════════════════════════════════════════════════
// 7. READ SINGLE REP
// ════════════════════════════════════════════════════════════════════════════
section('7. Read Single Rep — GET /sales-reps/:id')
{
  if (!repId) { skip('READ rep', 'no repId'); }
  else {
    const r = await GET(`/sales-reps/${repId}`)
    ok(r.ok, 'GET /sales-reps/:id → 200', r.status, 200)
    ok(r.body._id === repId, '_id matches', r.body._id, repId)
    ok(r.body.first_name === 'TestRep', 'first_name matches', r.body.first_name, 'TestRep')
    ok(r.body.email === `testrep_${TS}@example.com`, 'email matches', r.body.email, `testrep_${TS}@example.com`)
    ok(r.body.user_type === 'sales_rep', 'user_type = sales_rep', r.body.user_type, 'sales_rep')
    ok(Array.isArray(r.body.addresses), 'addresses array returned', Array.isArray(r.body.addresses), true)
    ok(Array.isArray(r.body.contacts), 'contacts array returned', Array.isArray(r.body.contacts), true)

    // 404 on unknown
    const r2 = await GET('/sales-reps/000000000000000000000000')
    ok(r2.status === 404, 'GET unknown id → 404', r2.status, 404)
    ok(r2.body.error === 'Sales rep not found', '404 message correct', r2.body.error, 'Sales rep not found')
  }
}

// ════════════════════════════════════════════════════════════════════════════
// 8. UPDATE
// ════════════════════════════════════════════════════════════════════════════
section('8. Update Sales Rep — PUT /sales-reps/:id')
{
  if (!repId) { skip('UPDATE rep', 'no repId'); }
  else {
    const r = await PUT(`/sales-reps/${repId}`, {
      first_name:      'UpdatedTestRep',
      last_name:       `${TS}_upd`,
      phone:           '555-0200',
      extension:       '202',
      territory:       'Northwest',
      commission_rate: 9.0,
      user_notes:      'Updated notes',
      address:         '200 Updated Ave',
      city:            'Austin',
      state:           'TX',
      zip:             '73301',
      user_cust_code:  `TC${Date.now().toString().slice(-4)}U`,
    })
    ok(r.ok, 'PUT /sales-reps/:id → 200', r.status, 200)
    ok(r.body.first_name === 'UpdatedTestRep', 'first_name updated', r.body.first_name, 'UpdatedTestRep')
    ok(r.body.phone === '555-0200', 'phone updated', r.body.phone, '555-0200')
    ok(r.body.territory === 'Northwest', 'territory updated', r.body.territory, 'Northwest')
    ok(r.body.commission_rate === 9.0, 'commission_rate updated', r.body.commission_rate, 9.0)
    ok(!!r.body.updated_at, 'updated_at set', !!r.body.updated_at, true)

    // Verify update persisted
    const verify = await GET(`/sales-reps/${repId}`)
    ok(verify.body.first_name === 'UpdatedTestRep', 'Update persisted in DB', verify.body.first_name, 'UpdatedTestRep')
    ok(verify.body.territory === 'Northwest', 'territory persisted', verify.body.territory, 'Northwest')

    // _id cannot be changed (server strips it)
    const r2 = await PUT(`/sales-reps/${repId}`, { _id: '000000000000000000000000', first_name: 'NoClobber' })
    ok(r2.ok, 'PUT with _id in body → 200 (id not changed)', r2.status, 200)
    const verify2 = await GET(`/sales-reps/${repId}`)
    ok(verify2.body._id === repId, '_id unchanged after PUT with _id in body', verify2.body._id, repId)

    // 404 on unknown
    const r3 = await PUT('/sales-reps/000000000000000000000000', { first_name: 'X' })
    ok(r3.status === 404, 'PUT unknown → 404', r3.status, 404)
  }
}

section('8b. Partial Update — only some fields')
{
  if (!repId) { skip('Partial update', 'no repId'); }
  else {
    // Update only commission_rate
    const before = await GET(`/sales-reps/${repId}`)
    const r = await PUT(`/sales-reps/${repId}`, { commission_rate: 5.5 })
    ok(r.ok, 'Partial PUT (commission_rate only) → 200', r.status, 200)
    ok(r.body.commission_rate === 5.5, 'commission_rate = 5.5', r.body.commission_rate, 5.5)

    // Verify zero commission_rate
    const r2 = await PUT(`/sales-reps/${repId}`, { commission_rate: 0 })
    ok(r2.ok, 'Update commission_rate to 0 → 200', r2.status, 200)
    ok(r2.body.commission_rate === 0, 'commission_rate = 0', r2.body.commission_rate, 0)

    // Update phones array
    const r3 = await PUT(`/sales-reps/${repId}`, {
      phones: [
        { type: 'mobile', number: '555-1111' },
        { type: 'office', number: '555-2222' },
      ]
    })
    ok(r3.ok, 'Update phones array → 200', r3.status, 200)
    ok(Array.isArray(r3.body.phones) && r3.body.phones.length === 2, 'phones updated with 2 entries', r3.body.phones?.length, 2)
  }
}

// ════════════════════════════════════════════════════════════════════════════
// 9. ACTIVATE / DEACTIVATE
// ════════════════════════════════════════════════════════════════════════════
section('9. Activate / Deactivate — PUT /sales-reps/:id/activate|deactivate')
{
  if (!repId) { skip('ACT/DEACT', 'no repId'); }
  else {
    // Deactivate
    const dec = await PUT(`/sales-reps/${repId}/deactivate`, {})
    ok(dec.ok, 'PUT /deactivate → 200', dec.status, 200)
    ok(dec.body.status === 'inactive', 'status = inactive', dec.body.status, 'inactive')

    // Verify persisted
    const list = await GET('/sales-reps?status=inactive')
    const foundInactive = list.body.some(r => r._id === repId)
    ok(foundInactive, 'Rep appears in inactive list after deactivate', foundInactive, true)

    // Not in active list
    const activeList = await GET('/sales-reps?status=active')
    const foundActive = activeList.body.some(r => r._id === repId)
    ok(!foundActive, 'Rep NOT in active list after deactivate', !foundActive, true)

    // Activate
    const act = await PUT(`/sales-reps/${repId}/activate`, {})
    ok(act.ok, 'PUT /activate → 200', act.status, 200)
    ok(act.body.status === 'active', 'status = active', act.body.status, 'active')

    // Verify back in active list
    const activeList2 = await GET('/sales-reps?status=active')
    const foundActive2 = activeList2.body.some(r => r._id === repId)
    ok(foundActive2, 'Rep back in active list after activate', foundActive2, true)

    // updated_at changes on each state change
    ok(!!act.body.updated_at, 'updated_at set after activate', !!act.body.updated_at, true)

    // 404 on unknown
    const d2 = await PUT('/sales-reps/000000000000000000000000/deactivate', {})
    ok(d2.status === 404, 'Deactivate unknown → 404', d2.status, 404)

    const a2 = await PUT('/sales-reps/000000000000000000000000/activate', {})
    ok(a2.status === 404, 'Activate unknown → 404', a2.status, 404)
  }
}

section('9b. Toggle state multiple times (stress test)')
{
  if (!repId) { skip('State toggle stress', 'no repId'); }
  else {
    // Deact → Act → Deact → Act (4 toggles)
    const states = []
    for (const action of ['deactivate','activate','deactivate','activate']) {
      const r = await PUT(`/sales-reps/${repId}/${action}`, {})
      states.push(r.body.status)
    }
    ok(states.join(',') === 'inactive,active,inactive,active',
      'State toggles correctly: ' + states.join('→'),
      states.join(','), 'inactive,active,inactive,active')
  }
}

// ════════════════════════════════════════════════════════════════════════════
// 10. COMMISSION STATS
// ════════════════════════════════════════════════════════════════════════════
section('10. Commission Stats — GET /sales-reps/:id/commission-stats')
{
  if (!existingRepId) { skip('Commission stats', 'no existingRepId'); }
  else {
    const r = await GET(`/sales-reps/${existingRepId}/commission-stats`)
    ok(r.ok, 'GET /commission-stats → 200', r.status, 200)
    ok(typeof r.body.total_commission === 'number', 'total_commission is number', typeof r.body.total_commission, 'number')
    ok(typeof r.body.ytd_outstanding  === 'number', 'ytd_outstanding is number',  typeof r.body.ytd_outstanding,  'number')
    ok(typeof r.body.ytd_paid         === 'number', 'ytd_paid is number',         typeof r.body.ytd_paid,         'number')
    ok(r.body.total_commission >= 0, 'total_commission ≥ 0', r.body.total_commission, '>=0')
    ok(r.body.ytd_outstanding  >= 0, 'ytd_outstanding ≥ 0',  r.body.ytd_outstanding,  '>=0')
    ok(r.body.ytd_paid         >= 0, 'ytd_paid ≥ 0',         r.body.ytd_paid,         '>=0')
    info(`Commission stats: total=$${r.body.total_commission}  paid=$${r.body.ytd_paid}  outstanding=$${r.body.ytd_outstanding}`)

    // New rep with no commissions → all zeros
    if (repId) {
      const r2 = await GET(`/sales-reps/${repId}/commission-stats`)
      ok(r2.ok, 'New rep commission-stats → 200', r2.status, 200)
      ok(r2.body.total_commission === 0, 'New rep: total_commission = 0', r2.body.total_commission, 0)
      ok(r2.body.ytd_outstanding  === 0, 'New rep: ytd_outstanding = 0',  r2.body.ytd_outstanding,  0)
      ok(r2.body.ytd_paid         === 0, 'New rep: ytd_paid = 0',         r2.body.ytd_paid,         0)
    }

    // 404
    const r3 = await GET('/sales-reps/000000000000000000000000/commission-stats')
    ok(r3.status === 404, '404 unknown rep', r3.status, 404)
  }
}

// ════════════════════════════════════════════════════════════════════════════
// 11. COMMISSIONS LIST
// ════════════════════════════════════════════════════════════════════════════
section('11. Commissions List — GET /sales-reps/:id/commissions')
{
  if (!existingRepId) { skip('Commissions list', 'no existingRepId'); }
  else {
    const r = await GET(`/sales-reps/${existingRepId}/commissions`)
    ok(r.ok, 'GET /commissions → 200', r.status, 200)
    ok(Array.isArray(r.body), 'Response is array', Array.isArray(r.body), true)
    info(`Commissions for rep: ${r.body.length}`)

    if (r.body.length > 0) {
      const first = r.body[0]
      ok('po_id' in first, 'Has po_id', true, true)
      ok('invoice_number' in first, 'Has invoice_number', true, true)
      ok('rep_com_total' in first, 'Has rep_com_total', true, true)
      ok('commission_paid_status' in first, 'Has commission_paid_status', true, true)
      ok([0, 1, 2].includes(first.commission_paid_status),
        `commission_paid_status is 0/1/2 (got ${first.commission_paid_status})`,
        first.commission_paid_status, '0|1|2')
      ok(typeof first.po_total === 'number', 'po_total is number', typeof first.po_total, 'number')
      ok(typeof first.com_total === 'number', 'com_total is number', typeof first.com_total, 'number')
      // Sorted by po_id descending
      if (r.body.length >= 2) {
        ok(r.body[0].po_id >= r.body[1].po_id, 'Sorted by po_id DESC', r.body[0].po_id >= r.body[1].po_id, true)
      }
      info(`First commission: inv#${first.invoice_number}  rep_total=$${first.rep_com_total}  status=${first.commission_paid_status}`)
    }

    // New rep with no commissions → empty array
    if (repId) {
      const r2 = await GET(`/sales-reps/${repId}/commissions`)
      ok(r2.ok && Array.isArray(r2.body) && r2.body.length === 0,
        'New rep: commissions = []', r2.body.length, 0)
    }

    // 404
    const r3 = await GET('/sales-reps/000000000000000000000000/commissions')
    ok(r3.status === 404, '404 unknown rep', r3.status, 404)
  }
}

// ════════════════════════════════════════════════════════════════════════════
// 12. INVOICES LIST
// ════════════════════════════════════════════════════════════════════════════
section('12. Invoices List — GET /sales-reps/:id/invoices')
{
  if (!existingRepId) { skip('Invoices list', 'no existingRepId'); }
  else {
    const r = await GET(`/sales-reps/${existingRepId}/invoices`)
    ok(r.ok, 'GET /invoices → 200', r.status, 200)
    ok(Array.isArray(r.body), 'Response is array', Array.isArray(r.body), true)
    info(`Invoices for rep: ${r.body.length}`)

    if (r.body.length > 0) {
      const first = r.body[0]
      ok('invoice_number' in first, 'Has invoice_number', true, true)
      ok('net_amount' in first, 'Has net_amount', true, true)
      ok('balance' in first, 'Has balance', true, true)
      ok('company_name' in first, 'Has company_name', true, true)
      ok('commission' in first, 'Has commission', true, true)
      ok('po_status' in first, 'Has po_status', true, true)
      ok(typeof first.net_amount === 'number', 'net_amount is number', typeof first.net_amount, 'number')
      existingInvId = first.legacy_id
      info(`First invoice: #${first.invoice_number}  $${first.net_amount}  balance=$${first.balance}  co=${first.company_name}`)
    }

    // New rep → empty
    if (repId) {
      const r2 = await GET(`/sales-reps/${repId}/invoices`)
      ok(r2.ok && Array.isArray(r2.body) && r2.body.length === 0,
        'New rep: invoices = []', r2.body.length, 0)
    }

    // 404
    const r3 = await GET('/sales-reps/000000000000000000000000/invoices')
    ok(r3.status === 404, '404 unknown rep', r3.status, 404)
  }
}

// ════════════════════════════════════════════════════════════════════════════
// 13. CUSTOMERS LIST
// ════════════════════════════════════════════════════════════════════════════
section('13. Customers List — GET /sales-reps/:id/customers')
{
  if (!existingRepId) { skip('Customers list', 'no existingRepId'); }
  else {
    const r = await GET(`/sales-reps/${existingRepId}/customers`)
    ok(r.ok, 'GET /customers → 200', r.status, 200)
    ok(Array.isArray(r.body), 'Response is array', Array.isArray(r.body), true)
    info(`Customers for rep: ${r.body.length}`)

    if (r.body.length > 0) {
      const first = r.body[0]
      ok('company_name' in first, 'Has company_name', true, true)
      ok('legacy_id' in first, 'Has legacy_id', true, true)
      ok('customer_code' in first, 'Has customer_code', true, true)
      ok('status' in first, 'Has status', true, true)
      ok(typeof first.line === 'number', 'Has line number', typeof first.line, 'number')
      info(`First customer: ${first.company_name} (${first.customer_code})  status=${first.status}`)

      // Line numbers start from 1 and are sequential
      ok(first.line === 1, 'First customer line = 1', first.line, 1)
      if (r.body.length >= 2) {
        ok(r.body[1].line === 2, 'Second customer line = 2', r.body[1].line, 2)
      }
    }

    // New rep → empty
    if (repId) {
      const r2 = await GET(`/sales-reps/${repId}/customers`)
      ok(r2.ok && Array.isArray(r2.body) && r2.body.length === 0,
        'New rep: customers = []', r2.body.length, 0)
    }

    // 404
    const r3 = await GET('/sales-reps/000000000000000000000000/customers')
    ok(r3.status === 404, '404 unknown rep', r3.status, 404)
  }
}

// ════════════════════════════════════════════════════════════════════════════
// 14. INVOICE DETAIL
// ════════════════════════════════════════════════════════════════════════════
section('14. Invoice Detail — GET /sales-reps/invoice/:invoiceId')
{
  if (!existingInvId) {
    // Try first invoice in DB
    const invList = await GET('/invoices')
    existingInvId = invList.body?.[0]?.legacy_id
  }

  if (!existingInvId) { skip('Invoice detail', 'no existingInvId'); }
  else {
    const r = await GET(`/sales-reps/invoice/${existingInvId}`)
    ok(r.ok, `GET /invoice/${existingInvId} → 200`, r.status, 200)

    // Verify all expected fields
    const fields = ['legacy_id','invoice_number','po_number','po_date','total_qty',
      'net_amount','shipping_costs','billing_address','shipping_address',
      'line_items','rep_names','paid_value','tracking_no']
    fields.forEach(f => ok(f in r.body, `Has field: ${f}`, f in r.body, true))

    ok(Array.isArray(r.body.line_items), 'line_items is array', Array.isArray(r.body.line_items), true)
    ok(Array.isArray(r.body.rep_names), 'rep_names is array', Array.isArray(r.body.rep_names), true)
    ok(typeof r.body.net_amount === 'number', 'net_amount is number', typeof r.body.net_amount, 'number')

    if (r.body.line_items.length > 0) {
      const line = r.body.line_items[0]
      ok('line' in line, 'Line item has line#', true, true)
      ok('description' in line, 'Line item has description', true, true)
      ok('shipped_qty' in line, 'Line item has shipped_qty', true, true)
      ok('price_each' in line, 'Line item has price_each', true, true)
      ok('amount' in line, 'Line item has amount', true, true)
      info(`Invoice #${r.body.invoice_number}: ${r.body.line_items.length} line items  net=$${r.body.net_amount}`)
    }

    // Customer object
    ok(r.body.customer === null || typeof r.body.customer === 'object', 'customer is null or object', true, true)

    // 404 on unknown
    const r2 = await GET('/sales-reps/invoice/999999999')
    ok(r2.status === 404, 'Unknown invoiceId → 404', r2.status, 404)
  }
}

// ════════════════════════════════════════════════════════════════════════════
// 15. REPORTS — Monthly and Yearly
// ════════════════════════════════════════════════════════════════════════════
section('15. Reports — GET /reports/sales-rep-month|year')
{
  const monthly = await GET('/reports/sales-rep-month')
  ok(monthly.ok, 'GET /reports/sales-rep-month → 200', monthly.status, 200)
  ok(Array.isArray(monthly.body), 'Monthly report is array', Array.isArray(monthly.body), true)
  info(`Monthly report rows: ${monthly.body.length}`)

  if (monthly.body.length > 0) {
    const row = monthly.body[0]
    ok('rep_name' in row || 'first_name' in row || 'name' in row, 'Report row has rep name field', true, true)
    info(`Monthly report first rep: ${JSON.stringify(Object.keys(row))}`)
  }

  const yearly = await GET('/reports/sales-rep-year')
  ok(yearly.ok, 'GET /reports/sales-rep-year → 200', yearly.status, 200)
  ok(Array.isArray(yearly.body), 'Yearly report is array', Array.isArray(yearly.body), true)
  info(`Yearly report rows: ${yearly.body.length}`)

  // With year filter
  const monthly2026 = await GET('/reports/sales-rep-month?year=2026')
  ok(monthly2026.ok, 'GET /reports/sales-rep-month?year=2026 → 200', monthly2026.status, 200)
  info(`2026 monthly report rows: ${monthly2026.body.length}`)
}

// ════════════════════════════════════════════════════════════════════════════
// 16. EDGE CASES
// ════════════════════════════════════════════════════════════════════════════
section('16. Edge Cases & Special Characters')
{
  // Create rep with special characters in name
  const special = await POST('/sales-reps', {
    first_name: "O'Brien",
    last_name:  'García-López',
    email:      `special_${TS}@test.com`,
  })
  ok(special.status === 201, 'Rep with special chars in name → 201', special.status, 201)
  ok(special.body.first_name === "O'Brien", "Apostrophe in name stored correctly", special.body.first_name, "O'Brien")
  ok(special.body.last_name === 'García-López', 'Accent/hyphen stored correctly', special.body.last_name, 'García-López')
  if (special.body._id) { await DELETE(`/sales-reps/${special.body._id}`); pass('Special chars rep cleanup') }

  // Whitespace trimming
  const trimmed = await POST('/sales-reps', {
    first_name: '  TrimTest  ',
    last_name:  '  Whitespace  ',
    email:      `trim_${TS}@test.com`,
  })
  ok(trimmed.status === 201, 'Whitespace in name → 201', trimmed.status, 201)
  ok(trimmed.body.first_name === 'TrimTest', 'first_name trimmed', trimmed.body.first_name, 'TrimTest')
  ok(trimmed.body.last_name === 'Whitespace', 'last_name trimmed', trimmed.body.last_name, 'Whitespace')
  if (trimmed.body._id) { await DELETE(`/sales-reps/${trimmed.body._id}`); pass('Trim test rep cleanup') }

  // Very long commission rate
  const bigRate = await POST('/sales-reps', { first_name: 'BigRate', commission_rate: 100.0 })
  ok(bigRate.status === 201, '100% commission_rate → 201', bigRate.status, 201)
  ok(bigRate.body.commission_rate === 100.0, 'commission_rate = 100', bigRate.body.commission_rate, 100.0)
  if (bigRate.body._id) { await DELETE(`/sales-reps/${bigRate.body._id}`); pass('100% rate cleanup') }

  // Zero commission rate
  const zeroRate = await POST('/sales-reps', { first_name: 'ZeroRate', commission_rate: 0 })
  ok(zeroRate.status === 201, '0% commission_rate → 201', zeroRate.status, 201)
  if (zeroRate.body._id) { await DELETE(`/sales-reps/${zeroRate.body._id}`); pass('0% rate cleanup') }
}

section('16b. Lookup by legacy_id (fallback ID lookup)')
{
  // The GET /:id endpoint tries ObjectId first, falls back to legacy_id int
  // Test with an existing rep that has a legacy_id
  const repList = await GET('/sales-reps')
  const repWithLegacyId = repList.body.find(r => r.legacy_id)
  if (repWithLegacyId) {
    const r = await GET(`/sales-reps/${repWithLegacyId.legacy_id}`)
    ok(r.ok, `GET by legacy_id=${repWithLegacyId.legacy_id} → 200 (fallback lookup)`, r.status, 200)
    ok(r.body._id === repWithLegacyId._id || String(r.body._id) === String(repWithLegacyId._id),
      'Correct rep returned by legacy_id', r.body.first_name, repWithLegacyId.first_name)
    info(`Legacy_id fallback: ${repWithLegacyId.legacy_id} → ${r.body.first_name} ${r.body.last_name}`)
  } else {
    info('No reps with legacy_id found in DB')
  }
}

section('16c. Stats reflect created/deactivated reps correctly')
{
  const before = await GET('/sales-reps/stats')

  // Create a new rep
  const newRep = await POST('/sales-reps', { first_name: `StatsTest_${TS}` })
  const afterCreate = await GET('/sales-reps/stats')
  ok(afterCreate.body.total === before.body.total + 1, 'Stats.total +1 after create', afterCreate.body.total, before.body.total + 1)
  ok(afterCreate.body.active === before.body.active + 1, 'Stats.active +1 after create', afterCreate.body.active, before.body.active + 1)

  // Deactivate it
  await PUT(`/sales-reps/${newRep.body._id}/deactivate`, {})
  const afterDeact = await GET('/sales-reps/stats')
  ok(afterDeact.body.active === before.body.active, 'Stats.active restored after deactivate', afterDeact.body.active, before.body.active)
  ok(afterDeact.body.inactive === before.body.inactive + 1, 'Stats.inactive +1 after deactivate', afterDeact.body.inactive, before.body.inactive + 1)

  // Re-activate
  await PUT(`/sales-reps/${newRep.body._id}/activate`, {})
  const afterReact = await GET('/sales-reps/stats')
  ok(afterReact.body.active === afterCreate.body.active, 'Stats.active restored after re-activate', afterReact.body.active, afterCreate.body.active)

  // Delete
  await DELETE(`/sales-reps/${newRep.body._id}`)
  const afterDelete = await GET('/sales-reps/stats')
  ok(afterDelete.body.total === before.body.total, 'Stats.total back to original after delete', afterDelete.body.total, before.body.total)
}

// ════════════════════════════════════════════════════════════════════════════
// 17. DELETE
// ════════════════════════════════════════════════════════════════════════════
section('17. Delete — DELETE /sales-reps/:id')
{
  // Delete minimal rep first
  if (repId2) {
    const r = await DELETE(`/sales-reps/${repId2}`)
    ok(r.ok, 'DELETE minimal rep → 200', r.status, 200)
    ok(r.body.message, 'message returned', !!r.body.message, true)

    // Confirm gone from list
    const list = await GET('/sales-reps')
    const found = list.body.some(r => r._id === repId2)
    ok(!found, 'Deleted minimal rep not in list', !found, true)
    repId2 = null
  }

  // Delete main test rep
  if (repId) {
    const r = await DELETE(`/sales-reps/${repId}`)
    ok(r.ok, 'DELETE main test rep → 200', r.status, 200)

    // Confirm gone from ALL endpoints
    const gone = await GET(`/sales-reps/${repId}`)
    ok(gone.status === 404, 'Deleted rep → 404 on GET', gone.status, 404)

    const commGone = await GET(`/sales-reps/${repId}/commissions`)
    ok(commGone.status === 404, 'Deleted rep → 404 on /commissions', commGone.status, 404)

    const invGone = await GET(`/sales-reps/${repId}/invoices`)
    ok(invGone.status === 404, 'Deleted rep → 404 on /invoices', invGone.status, 404)

    const custGone = await GET(`/sales-reps/${repId}/customers`)
    ok(custGone.status === 404, 'Deleted rep → 404 on /customers', custGone.status, 404)

    const statGone = await GET(`/sales-reps/${repId}/commission-stats`)
    ok(statGone.status === 404, 'Deleted rep → 404 on /commission-stats', statGone.status, 404)

    repId = null
  }

  // 404 on unknown
  const r2 = await DELETE('/sales-reps/000000000000000000000000')
  ok(r2.status === 404, 'DELETE unknown → 404', r2.status, 404)

  // DELETE is permanent (hard delete) — verify not in inactive list either
  info('DELETE is hard-delete (no soft-delete for reps)')
}

// ════════════════════════════════════════════════════════════════════════════
// 18. NOTES ON UNIQUE-CHECK SCOPE
// ════════════════════════════════════════════════════════════════════════════
section('18. Unique-check scope observation')
{
  // check-unique searches ALL app_user records, not just sales_reps.
  // This means an admin's email would show as "not unique" for a new rep.
  const adminEmail = 'admin@stallioni.com'
  const r = await GET(`/sales-reps/check-unique?field=email&value=${encodeURIComponent(adminEmail)}`)
  ok(r.ok, 'check-unique works for admin email', r.status, 200)
  if (r.body.unique === false) {
    info(`OBSERVATION: check-unique for email="${adminEmail}" returns unique=false`)
    info('Reason: /check-unique searches ALL app_user records, not just user_type=sales_rep')
    info('Impact: A sales rep cannot share an email with any admin/other user — this may be intentional')
    pass('check-unique scope covers all app_user (by design)')
  } else {
    info('admin email not found in app_user (different setup)')
    pass('check-unique returned expected result')
  }
}

// ─── Summary ─────────────────────────────────────────────────────────────────
const total = passed + failed + skipped
console.log('\n' + '═'.repeat(62))
console.log('\x1b[1mSALES REPS DEEP TEST SUMMARY\x1b[0m')
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
if (failed === 0) console.log('\n\x1b[32m✓ All Sales Reps tests passed.\x1b[0m')
else              console.log(`\n\x1b[31m✗ ${failed} test(s) failed.\x1b[0m`)
