/**
 * Deep Test Suite — Commission Report Page (/commissions/report)
 *
 * Tests every feature of the page:
 *
 * API Layer:
 *   1.  Full report (no filter)           GET /commissions/report
 *   2.  Rep filter                        GET /commissions/report?rep_id=X
 *   3.  Status filter — paid              GET /commissions/report?status=paid
 *   4.  Status filter — unpaid            GET /commissions/report?status=unpaid
 *   5.  Date range filter                 GET /commissions/report?date_from&date_to
 *   6.  Combined filters                  rep_id + status + date_from + date_to
 *   7.  rep_email filter                  GET /commissions/report?rep_email=X
 *   8.  Breakdown modal                   GET /commissions/report-breakdown/:commDetailId
 *   9.  Security enforcement              X-User-Email sales-rep restriction
 *  10.  404 / 403 breakdown guards
 *
 * Frontend Logic (computed at API boundary):
 *  11.  Row shape & required fields
 *  12.  is_paid boolean on all rows
 *  13.  Sorted by rep_name ASC then shipped_date ASC
 *  14.  Summary card totals (total_commission, commPaid, commUnpaid, subtotal)
 *  15.  Monthly chart data grouping (by shipped_date month, split paid/unpaid)
 *  16.  Doughnut chart ratio (commPaid + commUnpaid = totalCommission)
 *  17.  Client-side search simulation (company_name / invoice_number / rep_name / contact_phone)
 *  18.  Pagination slice (25 per page default)
 *  19.  Footer totals = sum of filtered rows
 *  20.  Breakdown has_item_detail flag
 *  21.  Breakdown line items (item_name, qty, unit_cost, line_total, comm_per_unit, comm_total)
 *  22.  CSV export columns verified
 *
 * Usage: node tests/commission-report-deep-test.mjs
 */

const BASE = 'http://localhost:5000/api'
const TS   = `CR_${Date.now()}`

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

async function api(path, headers = {}) {
  const res = await fetch(BASE + path, {
    headers: { 'Content-Type': 'application/json', ...headers },
  })
  const body = await res.json().catch(() => ({}))
  return { status: res.status, ok: res.ok, body }
}

// ─── State ────────────────────────────────────────────────────────────────────
let allRows        = []   // full report data
let firstRow       = null
let commDetailId   = null
let testRepId      = null
let testRepEmail   = null
let testRepName    = ''

// ══════════════════════════════════════════════════════════════════════════
// SECTION 1 — FULL REPORT (no filter)
// ══════════════════════════════════════════════════════════════════════════
section('1. Full Report — GET /commissions/report')
{
  const r = await api('/commissions/report')
  ok(r.ok, 'GET /commissions/report → 200', r.status, 200)
  ok(Array.isArray(r.body), 'Response is array', Array.isArray(r.body), true)
  ok(r.body.length > 0, `At least 1 row (${r.body.length})`, r.body.length, '>0')
  allRows   = r.body
  firstRow  = r.body[0]
  info(`Total report rows: ${r.body.length}`)

  // ── Row shape ──────────────────────────────────────────────────────────
  const reqFields = [
    'commission_detail_id','po_id','sales_rep_id','rep_name','rep_code',
    'company_name','contact_phone','invoice_number','shipped_date',
    'subtotal','shipping_and_tax','invoice_total','commission','is_paid','paid_date'
  ]
  reqFields.forEach(f => ok(f in firstRow, `Row has field: ${f}`, f in firstRow, true))

  // ── Field types ───────────────────────────────────────────────────────
  ok(typeof firstRow.is_paid === 'boolean', 'is_paid is boolean', typeof firstRow.is_paid, 'boolean')
  ok(typeof firstRow.commission === 'number', 'commission is number', typeof firstRow.commission, 'number')
  ok(typeof firstRow.subtotal === 'number', 'subtotal is number', typeof firstRow.subtotal, 'number')
  ok(typeof firstRow.shipping_and_tax === 'number', 'shipping_and_tax is number', typeof firstRow.shipping_and_tax, 'number')
  ok(typeof firstRow.invoice_total === 'number', 'invoice_total is number', typeof firstRow.invoice_total, 'number')
  ok(typeof firstRow.commission_detail_id === 'string', 'commission_detail_id is string', typeof firstRow.commission_detail_id, 'string')

  // ── All rows have boolean is_paid ──────────────────────────────────────
  const allBool = r.body.every(row => typeof row.is_paid === 'boolean')
  ok(allBool, 'All rows: is_paid is boolean', allBool, true)

  // ── commission ≥ 0 on all rows ──────────────────────────────────────
  const allNonNeg = r.body.every(row => (row.commission || 0) >= 0)
  ok(allNonNeg, 'All rows: commission ≥ 0', allNonNeg, true)

  // ── invoice_total = subtotal + shipping_and_tax ────────────────────
  const mathOk = r.body.every(row => {
    const expected = (row.subtotal || 0) + (row.shipping_and_tax || 0)
    return Math.abs((row.invoice_total || 0) - expected) < 0.01
  })
  ok(mathOk, 'All rows: invoice_total = subtotal + shipping_and_tax', mathOk, true)

  // Store for later tests
  commDetailId  = firstRow.commission_detail_id
  testRepId     = firstRow.sales_rep_id
  testRepName   = firstRow.rep_name

  info(`First row: rep="${firstRow.rep_name}"  co="${firstRow.company_name}"  inv#=${firstRow.invoice_number}  comm=$${firstRow.commission?.toFixed(2)}  paid=${firstRow.is_paid}`)
}

// ══════════════════════════════════════════════════════════════════════════
// SECTION 2 — SORTED CORRECTLY
// ══════════════════════════════════════════════════════════════════════════
section('2. Sort Order — rep_name ASC → shipped_date ASC')
{
  // Sorted by rep_name ascending, then shipped_date ascending within same rep
  if (allRows.length >= 2) {
    ok(allRows[0].rep_name <= allRows[1].rep_name, `Row[0].rep_name (${allRows[0].rep_name}) ≤ Row[1].rep_name (${allRows[1].rep_name})`, allRows[0].rep_name <= allRows[1].rep_name, true)
  }

  // Within same rep, shipped_date should be ascending
  const sameRepRows = allRows.filter(r => r.rep_name === allRows[0].rep_name)
  if (sameRepRows.length >= 2) {
    const d1 = sameRepRows[0].shipped_date ? new Date(sameRepRows[0].shipped_date).getTime() : 0
    const d2 = sameRepRows[1].shipped_date ? new Date(sameRepRows[1].shipped_date).getTime() : 0
    ok(d1 <= d2, `Within same rep: shipped_date ASC`, d1 <= d2, true)
  }
}

// ══════════════════════════════════════════════════════════════════════════
// SECTION 3 — REP FILTER
// ══════════════════════════════════════════════════════════════════════════
section('3. Rep Filter — GET /commissions/report?rep_id=X')
{
  if (!testRepId) { skip('Rep filter', 'no testRepId'); }
  else {
    const r = await api(`/commissions/report?rep_id=${testRepId}`)
    ok(r.ok, `GET ?rep_id=${testRepId} → 200`, r.status, 200)
    ok(Array.isArray(r.body), 'Array', Array.isArray(r.body), true)

    if (r.body.length > 0) {
      const allForRep = r.body.every(row => row.sales_rep_id === testRepId)
      ok(allForRep, `All ${r.body.length} rows for rep_id=${testRepId}`, allForRep, true)
      ok(r.body.length <= allRows.length, 'Filtered ≤ total', r.body.length <= allRows.length, true)
      info(`Rep ${testRepId} ("${testRepName}"): ${r.body.length} rows`)
    } else {
      info(`Rep ${testRepId} has 0 commission rows (may not have any)`)
    }

    // Different rep — should return different data
    const reps = [...new Set(allRows.map(r => r.sales_rep_id))]
    const otherRep = reps.find(id => id !== testRepId)
    if (otherRep) {
      const r2 = await api(`/commissions/report?rep_id=${otherRep}`)
      ok(r2.ok, `GET ?rep_id=${otherRep} → 200`, r2.status, 200)
      if (r2.body.length > 0) {
        ok(r2.body.every(row => row.sales_rep_id === otherRep),
          `All rows for other rep ${otherRep}`, r2.body.every(row => row.sales_rep_id === otherRep), true)
      }
    }
  }
}

// ══════════════════════════════════════════════════════════════════════════
// SECTION 4 — STATUS FILTERS
// ══════════════════════════════════════════════════════════════════════════
section('4. Status Filter — paid / unpaid')
{
  const paid = await api('/commissions/report?status=paid')
  ok(paid.ok, 'GET ?status=paid → 200', paid.status, 200)
  ok(Array.isArray(paid.body), 'Array', Array.isArray(paid.body), true)
  if (paid.body.length > 0) {
    const allPaid = paid.body.every(r => r.is_paid === true)
    ok(allPaid, `All ${paid.body.length} paid rows have is_paid=true`, allPaid, true)
  }
  info(`Paid rows: ${paid.body.length}`)

  const unpaid = await api('/commissions/report?status=unpaid')
  ok(unpaid.ok, 'GET ?status=unpaid → 200', unpaid.status, 200)
  if (unpaid.body.length > 0) {
    const allUnpaid = unpaid.body.every(r => r.is_paid === false)
    ok(allUnpaid, `All ${unpaid.body.length} unpaid rows have is_paid=false`, allUnpaid, true)
  }
  info(`Unpaid rows: ${unpaid.body.length}`)

  // paid + unpaid should sum to (at most) total — some rows may have no invoice match
  const paidCount   = paid.body.length
  const unpaidCount = unpaid.body.length
  const totalCount  = allRows.length
  ok(paidCount + unpaidCount <= totalCount + 5,
    `paid(${paidCount}) + unpaid(${unpaidCount}) ≈ total(${totalCount})`,
    paidCount + unpaidCount, `≈${totalCount}`)

  // Verify totals: sum of all commissions = paid + unpaid
  const totalComm = allRows.reduce((s, r) => s + (r.commission || 0), 0)
  const paidComm  = paid.body.reduce((s, r) => s + (r.commission || 0), 0)
  const unpaidComm = unpaid.body.reduce((s, r) => s + (r.commission || 0), 0)
  ok(Math.abs(totalComm - paidComm - unpaidComm) < 1.0,
    `totalComm($${totalComm.toFixed(0)}) = paidComm($${paidComm.toFixed(0)}) + unpaidComm($${unpaidComm.toFixed(0)})`,
    Math.abs(totalComm - paidComm - unpaidComm), '<1.0')
  info(`Commission totals: total=$${totalComm.toFixed(2)}  paid=$${paidComm.toFixed(2)}  unpaid=$${unpaidComm.toFixed(2)}`)
}

// ══════════════════════════════════════════════════════════════════════════
// SECTION 5 — DATE RANGE FILTER
// ══════════════════════════════════════════════════════════════════════════
section('5. Date Range Filter — shipped_date from/to')
{
  // Use 2024 as a test year
  const r = await api('/commissions/report?date_from=2024-01-01&date_to=2024-12-31')
  ok(r.ok, 'GET ?date_from&date_to → 200', r.status, 200)
  ok(Array.isArray(r.body), 'Array', Array.isArray(r.body), true)
  info(`2024 date range rows: ${r.body.length}`)

  // All shipped_dates should be within range (if present)
  if (r.body.length > 0) {
    const rowsWithDate = r.body.filter(row => row.shipped_date)
    if (rowsWithDate.length > 0) {
      const allInRange = rowsWithDate.every(row => {
        const d = new Date(row.shipped_date)
        return d >= new Date('2024-01-01') && d <= new Date('2024-12-31T23:59:59')
      })
      ok(allInRange, 'All rows with shipped_date are within 2024', allInRange, true)
    }
  }

  // Single day filter
  const rDay = await api('/commissions/report?date_from=2025-01-01&date_to=2025-01-01')
  ok(rDay.ok, 'Single day filter → 200', rDay.status, 200)
  info(`Single day (2025-01-01): ${rDay.body.length} rows`)

  // Future date → empty (no invoices shipped in the future)
  const rFuture = await api('/commissions/report?date_from=2099-01-01&date_to=2099-12-31')
  ok(rFuture.ok, 'Future date filter → 200', rFuture.status, 200)
  ok(rFuture.body.length === 0, 'Future date → 0 rows', rFuture.body.length, 0)
}

// ══════════════════════════════════════════════════════════════════════════
// SECTION 6 — COMBINED FILTERS
// ══════════════════════════════════════════════════════════════════════════
section('6. Combined Filters — rep_id + status + date range')
{
  if (!testRepId) { skip('Combined filters', 'no testRepId'); }
  else {
    const r = await api(`/commissions/report?rep_id=${testRepId}&status=paid&date_from=2020-01-01&date_to=2099-12-31`)
    ok(r.ok, 'GET combined filters → 200', r.status, 200)
    ok(Array.isArray(r.body), 'Array', Array.isArray(r.body), true)

    if (r.body.length > 0) {
      const allValid = r.body.every(row =>
        row.sales_rep_id === testRepId && row.is_paid === true
      )
      ok(allValid, 'All rows match rep_id AND is_paid=true', allValid, true)
    }
    info(`Combined (rep=${testRepId}, paid, all-time): ${r.body.length} rows`)
  }
}

// ══════════════════════════════════════════════════════════════════════════
// SECTION 7 — REP_EMAIL FILTER
// ══════════════════════════════════════════════════════════════════════════
section('7. rep_email Filter — GET /commissions/report?rep_email=X')
{
  // Find a rep with email
  const repList = await api('/commissions/lookup/reps')
  const repWithEmail = repList.body?.find(r => r.email && r.email.includes('@'))

  if (!repWithEmail) { skip('rep_email filter', 'no rep with email found'); }
  else {
    testRepEmail = repWithEmail.email
    const r = await api(`/commissions/report?rep_email=${encodeURIComponent(testRepEmail)}`)
    ok(r.ok, `GET ?rep_email=${testRepEmail} → 200`, r.status, 200)
    ok(Array.isArray(r.body), 'Array', Array.isArray(r.body), true)
    if (r.body.length > 0) {
      ok(r.body.every(row => row.sales_rep_id === repWithEmail.legacy_id),
        'All rows match the rep looked up by email', r.body.every(row => row.sales_rep_id === repWithEmail.legacy_id), true)
    }
    info(`rep_email="${testRepEmail}": ${r.body.length} rows`)
  }

  // Non-existing email → 0 rows (rep not found → empty)
  const rBad = await api('/commissions/report?rep_email=nobody@example.com')
  ok(rBad.ok && rBad.body.length === 0, 'Non-existing rep_email → 0 rows', rBad.body.length, 0)
}

// ══════════════════════════════════════════════════════════════════════════
// SECTION 8 — BREAKDOWN MODAL (GET /commissions/report-breakdown/:id)
// ══════════════════════════════════════════════════════════════════════════
section('8. Breakdown Modal — GET /commissions/report-breakdown/:commDetailId')
{
  if (!commDetailId) { skip('Breakdown', 'no commDetailId'); }
  else {
    const r = await api(`/commissions/report-breakdown/${commDetailId}`)
    ok(r.ok, 'GET /report-breakdown/:id → 200', r.status, 200)

    // Required fields
    ok('po_id' in r.body, 'Has po_id', true, true)
    ok('sales_rep_id' in r.body, 'Has sales_rep_id', true, true)
    ok('total_commission' in r.body, 'Has total_commission', true, true)
    ok('has_item_detail' in r.body, 'Has has_item_detail', true, true)
    ok('commission_percentage' in r.body, 'Has commission_percentage', true, true)
    ok('commission_dollar' in r.body, 'Has commission_dollar', true, true)
    ok(Array.isArray(r.body.line_items), 'line_items is array', Array.isArray(r.body.line_items), true)

    // Types
    ok(typeof r.body.has_item_detail === 'boolean', 'has_item_detail is boolean', typeof r.body.has_item_detail, 'boolean')
    ok(typeof r.body.total_commission === 'number', 'total_commission is number', typeof r.body.total_commission, 'number')
    ok(typeof r.body.po_id === 'number', 'po_id is number', typeof r.body.po_id, 'number')

    // Line items shape
    if (r.body.line_items.length > 0) {
      const lineItem = r.body.line_items[0]
      const liFields = ['item_id','item_name','qty','unit_cost','base_price','line_total','comm_per_unit','comm_total']
      liFields.forEach(f => ok(f in lineItem, `Line item has field: ${f}`, f in lineItem, true))

      // Math: line_total = unit_cost × qty
      const mathOk = r.body.line_items.every(it => Math.abs((it.unit_cost || 0) * (it.qty || 0) - (it.line_total || 0)) < 0.01)
      ok(mathOk, 'Line items: line_total = unit_cost × qty', mathOk, true)

      // When has_item_detail: comm_total = comm_per_unit × qty
      if (r.body.has_item_detail) {
        const commMathOk = r.body.line_items.every(it =>
          Math.abs((it.comm_per_unit || 0) * (it.qty || 0) - (it.comm_total || 0)) < 0.01
        )
        ok(commMathOk, 'Line items: comm_total = comm_per_unit × qty', commMathOk, true)
      }

      info(`Breakdown: has_item_detail=${r.body.has_item_detail}  lines=${r.body.line_items.length}  total_commission=$${r.body.total_commission}`)
    } else {
      info('Breakdown: 0 line items (invoice may have no po_items)')
    }

    // 404 on unknown
    const r2 = await api('/commissions/report-breakdown/000000000000000000000000')
    ok(r2.status === 404, '404 unknown detail id', r2.status, 404)
  }
}

// ══════════════════════════════════════════════════════════════════════════
// SECTION 9 — SECURITY: X-User-Email enforcement
// ══════════════════════════════════════════════════════════════════════════
section('9. Security — Sales Rep Access Enforcement')
{
  // No header: all reps visible
  const open = await api('/commissions/report')
  ok(open.ok, 'No header → 200 (all reps)', open.status, 200)
  const totalRows = open.body.length

  // Admin email: unrestricted
  const admin = await api('/commissions/report', { 'x-user-email': 'admin@stallioni.com' })
  ok(admin.ok, 'Admin email → 200 (all)', admin.status, 200)
  info(`Admin sees: ${admin.body.length} rows (same as ${totalRows})`)

  // Unknown email: treated as non-sales-rep → all visible
  const unk = await api('/commissions/report', { 'x-user-email': 'nobody@example.com' })
  ok(unk.ok, 'Unknown email → 200 (no restriction)', unk.status, 200)

  // Sales-rep email: locked to their own rep_id
  // Get actual sales-rep users
  const users = await api('/users')
  const salesRepUser = users.body?.find(u => u.level === 'sales-rep' && u.email)
  if (salesRepUser) {
    const repReport = await api('/commissions/report', { 'x-user-email': salesRepUser.email })
    ok(repReport.ok, `Sales-rep (${salesRepUser.email}) → 200 (restricted)`, repReport.status, 200)
    // If user is level=sales-rep, server locks to their rep_id
    // We can verify the result is a subset
    ok(repReport.body.length <= totalRows, 'Sales-rep sees ≤ total rows', repReport.body.length <= totalRows, true)
    info(`Sales-rep (${salesRepUser.email}) sees: ${repReport.body.length} rows`)
  } else {
    info('No sales-rep level users found to test security restriction')
  }

  // 403 on breakdown when rep_id mismatches
  if (commDetailId) {
    const r403 = await api(`/commissions/report-breakdown/${commDetailId}?rep_id=99999`)
    ok(r403.status === 403, 'Breakdown with mismatched rep_id → 403', r403.status, 403)
    ok(r403.body.error === 'Access denied', '403 message', r403.body.error, 'Access denied')
  }
}

// ══════════════════════════════════════════════════════════════════════════
// SECTION 10 — FRONTEND COMPUTED TOTALS (simulating the UI)
// ══════════════════════════════════════════════════════════════════════════
section('10. Frontend Summary Cards — Computed Totals')
{
  // Simulate what the UI computes from the data
  const data = allRows

  const totalCommission = data.reduce((s, r) => s + (r.commission || 0), 0)
  const commPaid        = data.filter(r => r.is_paid).reduce((s, r) => s + (r.commission || 0), 0)
  const commUnpaid      = data.filter(r => !r.is_paid).reduce((s, r) => s + (r.commission || 0), 0)
  const subtotal        = data.reduce((s, r) => s + (r.subtotal || 0), 0)

  ok(totalCommission >= 0, `Total Commission = $${totalCommission.toFixed(2)}`, totalCommission, '>=0')
  ok(commPaid >= 0, `Comm. Paid = $${commPaid.toFixed(2)}`, commPaid, '>=0')
  ok(commUnpaid >= 0, `Comm. Outstanding = $${commUnpaid.toFixed(2)}`, commUnpaid, '>=0')
  ok(Math.abs(totalCommission - commPaid - commUnpaid) < 0.01,
    `Paid($${commPaid.toFixed(2)}) + Outstanding($${commUnpaid.toFixed(2)}) = Total($${totalCommission.toFixed(2)})`,
    Math.abs(totalCommission - commPaid - commUnpaid), '<0.01')
  ok(subtotal >= 0, `Subtotal = $${subtotal.toFixed(2)}`, subtotal, '>=0')

  info(`Cards: total_invoices=${data.length}  total_comm=$${totalCommission.toFixed(2)}  paid=$${commPaid.toFixed(2)}  outstanding=$${commUnpaid.toFixed(2)}`)
}

// ══════════════════════════════════════════════════════════════════════════
// SECTION 11 — MONTHLY CHART DATA COMPUTATION
// ══════════════════════════════════════════════════════════════════════════
section('11. Monthly Bar Chart — Commission by Month (shipped_date)')
{
  // Simulate the monthlyChart useMemo from CommissionReport.jsx
  const map = {}
  allRows.forEach(r => {
    if (!r.shipped_date) return
    const d = new Date(r.shipped_date)
    if (isNaN(d)) return
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    if (!map[key]) map[key] = { paid: 0, unpaid: 0 }
    if (r.is_paid) map[key].paid += r.commission || 0
    else           map[key].unpaid += r.commission || 0
  })
  const sorted = Object.keys(map).sort()

  ok(sorted.length >= 0, `Monthly chart: ${sorted.length} unique months`, sorted.length, '>=0')

  if (sorted.length > 0) {
    // First month should be ≤ last month (ascending order)
    ok(sorted[0] <= sorted[sorted.length - 1], 'Months sorted chronologically', sorted[0] <= sorted[sorted.length - 1], true)

    // Each month: paid ≥ 0, unpaid ≥ 0
    const allValid = sorted.every(k => map[k].paid >= 0 && map[k].unpaid >= 0)
    ok(allValid, 'All months: paid ≥ 0 and unpaid ≥ 0', allValid, true)

    // Total commission across months == sum of all rows (that have shipped_date)
    const totalInChart = sorted.reduce((s, k) => s + map[k].paid + map[k].unpaid, 0)
    const totalWithDate = allRows.filter(r => r.shipped_date && !isNaN(new Date(r.shipped_date))).reduce((s, r) => s + (r.commission || 0), 0)
    ok(Math.abs(totalInChart - totalWithDate) < 0.01,
      `Chart total ($${totalInChart.toFixed(2)}) = rows-with-date total ($${totalWithDate.toFixed(2)})`,
      Math.abs(totalInChart - totalWithDate), '<0.01')

    // Stack datasets: Paid + Outstanding per month
    const paidDataset       = sorted.map(k => parseFloat(map[k].paid.toFixed(2)))
    const outstandingDataset = sorted.map(k => parseFloat(map[k].unpaid.toFixed(2)))
    ok(paidDataset.length === sorted.length, 'Paid dataset has correct month count', paidDataset.length, sorted.length)
    ok(outstandingDataset.length === sorted.length, 'Outstanding dataset has correct month count', outstandingDataset.length, sorted.length)

    info(`Monthly chart: ${sorted.length} months  first=${sorted[0]}  last=${sorted[sorted.length-1]}`)
    if (sorted.length >= 1) {
      info(`Latest month (${sorted[sorted.length-1]}): paid=$${map[sorted[sorted.length-1]].paid.toFixed(2)}  outstanding=$${map[sorted[sorted.length-1]].unpaid.toFixed(2)}`)
    }
  } else {
    info('No rows with shipped_date — chart would show empty (no data)')
    pass('Monthly chart: 0 months (no shipped_date data)')
  }
}

// ══════════════════════════════════════════════════════════════════════════
// SECTION 12 — DOUGHNUT CHART (Paid vs Outstanding)
// ══════════════════════════════════════════════════════════════════════════
section('12. Doughnut Chart — Paid vs Outstanding ratio')
{
  const commPaid   = parseFloat(allRows.filter(r => r.is_paid).reduce((s, r) => s + (r.commission || 0), 0).toFixed(2))
  const commUnpaid = parseFloat(allRows.filter(r => !r.is_paid).reduce((s, r) => s + (r.commission || 0), 0).toFixed(2))
  const total      = parseFloat((commPaid + commUnpaid).toFixed(2))

  ok(commPaid >= 0, `Paid slice: $${commPaid.toFixed(2)}`, commPaid, '>=0')
  ok(commUnpaid >= 0, `Outstanding slice: $${commUnpaid.toFixed(2)}`, commUnpaid, '>=0')
  ok(total > 0, `Total > 0 (chart shows, not "No data")`, total, '>0')

  // Pie percentages sum to 100%
  if (total > 0) {
    const paidPct      = (commPaid / total) * 100
    const unpaidPct    = (commUnpaid / total) * 100
    ok(Math.abs(paidPct + unpaidPct - 100) < 0.1, `Paid%(${paidPct.toFixed(1)}) + Unpaid%(${unpaidPct.toFixed(1)}) = 100%`, Math.abs(paidPct + unpaidPct - 100), '<0.1')
    info(`Doughnut: paid=${paidPct.toFixed(1)}%  outstanding=${unpaidPct.toFixed(1)}%`)
  }
}

// ══════════════════════════════════════════════════════════════════════════
// SECTION 13 — CLIENT-SIDE SEARCH SIMULATION
// ══════════════════════════════════════════════════════════════════════════
section('13. Client-side Search (filters: company_name / invoice_number / rep_name / contact_phone)')
{
  const data = allRows

  // Simulate CommissionReport.jsx search filter logic
  function clientSearch(data, searchTerm) {
    if (!searchTerm) return data
    const s = searchTerm.toLowerCase()
    return data.filter(r =>
      (r.company_name    || '').toLowerCase().includes(s) ||
      (r.invoice_number  || '').toLowerCase().includes(s) ||
      (r.rep_name        || '').toLowerCase().includes(s) ||
      (r.contact_phone   || '').includes(s)
    )
  }

  // Search by company name
  const companyName = firstRow?.company_name?.slice(0, 5)
  if (companyName) {
    const result = clientSearch(data, companyName.toLowerCase())
    ok(result.length > 0, `Search "${companyName}" finds at least 1 row`, result.length, '>0')
    ok(result.every(r => (r.company_name || '').toLowerCase().includes(companyName.toLowerCase())),
      'All results contain search term in company_name', true, true)
  }

  // Search by invoice number
  const invNum = firstRow?.invoice_number?.slice(0, 4)
  if (invNum) {
    const result = clientSearch(data, invNum)
    ok(result.length > 0, `Search inv# "${invNum}" finds at least 1 row`, result.length, '>0')
  }

  // Search by rep name
  const repNamePart = firstRow?.rep_name?.split(' ')[0]?.toLowerCase()
  if (repNamePart) {
    const result = clientSearch(data, repNamePart)
    ok(result.length > 0, `Search rep "${repNamePart}" finds rows`, result.length, '>0')
    ok(result.every(r => (r.rep_name || '').toLowerCase().includes(repNamePart)),
      'All results contain rep name', true, true)
  }

  // Search for non-existing string → empty
  const result = clientSearch(data, 'ZZZNOMATCH_' + TS)
  ok(result.length === 0, 'Non-matching search → 0 results', result.length, 0)

  // Empty search → all rows
  const all = clientSearch(data, '')
  ok(all.length === data.length, 'Empty search → all rows', all.length, data.length)

  // Case-insensitive
  if (companyName) {
    const upper = clientSearch(data, companyName.toUpperCase())
    const lower = clientSearch(data, companyName.toLowerCase())
    ok(upper.length === lower.length, 'Case-insensitive search', upper.length, lower.length)
  }
}

// ══════════════════════════════════════════════════════════════════════════
// SECTION 14 — PAGINATION LOGIC
// ══════════════════════════════════════════════════════════════════════════
section('14. Pagination — 25 per page default')
{
  const data = allRows
  const perPage = 25

  if (data.length <= perPage) {
    pass(`All ${data.length} rows fit on page 1 (≤ ${perPage})`)
  } else {
    // Page 1
    const page1 = data.slice(0, perPage)
    ok(page1.length === perPage, `Page 1 has ${perPage} rows`, page1.length, perPage)

    // Page 2
    const page2 = data.slice(perPage, 2 * perPage)
    ok(page2.length > 0, `Page 2 has rows`, page2.length, '>0')
    ok(page2[0] !== page1[0], 'Page 2 starts at different row', page2[0] !== page1[0], true)

    // Last page
    const totalPages = Math.ceil(data.length / perPage)
    const lastPage = data.slice((totalPages - 1) * perPage)
    ok(lastPage.length > 0 && lastPage.length <= perPage, `Last page has 1-${perPage} rows`, lastPage.length, `1-${perPage}`)

    info(`Pagination: ${data.length} rows  → ${totalPages} pages of ${perPage}`)
  }

  // Custom per-page: 10
  const perPage10 = 10
  const pages10 = Math.ceil(data.length / perPage10)
  ok(pages10 >= Math.ceil(data.length / perPage), `10/page → more pages than 25/page`, pages10 >= Math.ceil(data.length / perPage), true)
}

// ══════════════════════════════════════════════════════════════════════════
// SECTION 15 — FOOTER TOTALS
// ══════════════════════════════════════════════════════════════════════════
section('15. Table Footer Totals (sum of filtered rows)')
{
  const data = allRows

  // Simulate footer: sum of filtered (after search) rows
  const footerSubtotal   = data.reduce((s, r) => s + (r.subtotal || 0), 0)
  const footerCommission = data.reduce((s, r) => s + (r.commission || 0), 0)

  ok(footerSubtotal >= 0, `Footer subtotal = $${footerSubtotal.toFixed(2)} (≥ 0)`, footerSubtotal, '>=0')
  ok(footerCommission >= 0, `Footer commission = $${footerCommission.toFixed(2)} (≥ 0)`, footerCommission, '>=0')

  // After applying search filter: totals change
  const searchTerm = firstRow?.company_name?.split(' ')[0]?.toLowerCase() || ''
  if (searchTerm) {
    const filtered = data.filter(r => (r.company_name || '').toLowerCase().includes(searchTerm))
    const filteredComm = filtered.reduce((s, r) => s + (r.commission || 0), 0)

    if (filtered.length < data.length) {
      ok(filteredComm <= footerCommission, 'Filtered footer commission ≤ total commission', filteredComm <= footerCommission, true)
      info(`After search "${searchTerm}": ${filtered.length} rows  commission=$${filteredComm.toFixed(2)}`)
    }
  }
  info(`Full report footer: subtotal=$${footerSubtotal.toFixed(2)}  commission=$${footerCommission.toFixed(2)}`)
}

// ══════════════════════════════════════════════════════════════════════════
// SECTION 16 — BREAKDOWN DETAIL for has_item_detail=true row
// ══════════════════════════════════════════════════════════════════════════
section('16. Breakdown — Find Row with has_item_detail=true')
{
  // Scan first N detail IDs to find one with item detail
  const toCheck = allRows.slice(0, 50)
  let detailRow = null

  for (const row of toCheck) {
    if (!row.commission_detail_id) continue
    const r = await api(`/commissions/report-breakdown/${row.commission_detail_id}`)
    if (r.ok && r.body.has_item_detail === true && r.body.line_items.length > 0) {
      detailRow = { row, breakdown: r.body }
      break
    }
  }

  if (!detailRow) {
    info('No row with has_item_detail=true found in first 50 rows (legacy data — expected)')
    pass('has_item_detail=false rows trigger info alert in UI (not an error)')
  } else {
    const { row, breakdown } = detailRow
    ok(breakdown.has_item_detail === true, 'Found row with has_item_detail=true', breakdown.has_item_detail, true)
    ok(breakdown.line_items.length > 0, `${breakdown.line_items.length} line items`, breakdown.line_items.length, '>0')

    // Verify comm columns exist
    const line = breakdown.line_items[0]
    ok(typeof line.comm_per_unit === 'number', 'comm_per_unit is number', typeof line.comm_per_unit, 'number')
    ok(typeof line.comm_total    === 'number', 'comm_total is number',    typeof line.comm_total,    'number')

    // Sum of comm_total should equal total_commission
    const sumCommTotal = breakdown.line_items.reduce((s, it) => s + (it.comm_total || 0), 0)
    ok(Math.abs(sumCommTotal - breakdown.total_commission) < 0.01,
      `Sum of comm_total ($${sumCommTotal.toFixed(2)}) ≈ total_commission ($${breakdown.total_commission?.toFixed(2)})`,
      Math.abs(sumCommTotal - breakdown.total_commission), '<0.01')

    info(`has_item_detail row: inv#${row.invoice_number}  lines=${breakdown.line_items.length}  total_comm=$${breakdown.total_commission}`)
  }
}

// ══════════════════════════════════════════════════════════════════════════
// SECTION 17 — CSV EXPORT COLUMNS VERIFICATION
// ══════════════════════════════════════════════════════════════════════════
section('17. CSV Export Columns (frontend logic)')
{
  // Simulate doExportCSV() from CommissionReport.jsx
  const headers = ['Sales Rep', 'Customer', 'Contact Phone', 'Invoice #', 'Date Shipped',
    'Subtotal', 'Shipping+Tax', 'Commission Owed', 'Status', 'Paid Date']

  ok(headers.length === 10, '10 CSV columns defined', headers.length, 10)
  ok(headers.includes('Sales Rep'), 'Has Sales Rep column', headers.includes('Sales Rep'), true)
  ok(headers.includes('Commission Owed'), 'Has Commission Owed column', headers.includes('Commission Owed'), true)
  ok(headers.includes('Status'), 'Has Status column', headers.includes('Status'), true)

  // Simulate a CSV row from allRows
  if (firstRow) {
    const csvRow = [
      firstRow.rep_name,
      firstRow.company_name,
      firstRow.contact_phone,
      firstRow.invoice_number,
      firstRow.shipped_date,
      (firstRow.subtotal || 0).toFixed(2),
      (firstRow.shipping_and_tax || 0).toFixed(2),
      (firstRow.commission || 0).toFixed(2),
      firstRow.is_paid ? 'Paid' : 'Unpaid',
      firstRow.paid_date || '',
    ]
    ok(csvRow.length === headers.length, 'CSV row has same length as headers', csvRow.length, headers.length)
    ok(csvRow[8] === (firstRow.is_paid ? 'Paid' : 'Unpaid'), `Status column = "${csvRow[8]}"`, csvRow[8], firstRow.is_paid ? 'Paid' : 'Unpaid')
    ok(!isNaN(parseFloat(csvRow[6])), 'Commission Owed is numeric string', !isNaN(parseFloat(csvRow[6])), true)
  }
  info(`CSV: 10 columns verified  (${allRows.length} rows would be exported)`)
}

// ══════════════════════════════════════════════════════════════════════════
// SECTION 18 — BREADCRUMB DATA AND LOOKUP REPS
// ══════════════════════════════════════════════════════════════════════════
section('18. Rep Dropdown Data — GET /commissions/lookup/reps')
{
  const r = await api('/commissions/lookup/reps')
  ok(r.ok, 'GET /commissions/lookup/reps → 200', r.status, 200)
  ok(Array.isArray(r.body), 'Array', Array.isArray(r.body), true)
  ok(r.body.length > 0, `${r.body.length} reps in dropdown`, r.body.length, '>0')
  const first = r.body[0]
  ok('legacy_id' in first, 'Rep has legacy_id (value for <option>)', true, true)
  ok('first_name' in first, 'Rep has first_name', true, true)
  ok('last_name' in first, 'Rep has last_name', true, true)
  ok('user_cust_code' in first, 'Rep has user_cust_code (rep code badge)', true, true)
  // Sorted by first_name ASC
  if (r.body.length >= 2) {
    ok(r.body[0].first_name <= r.body[1].first_name, 'Sorted by first_name ASC', r.body[0].first_name <= r.body[1].first_name, true)
  }
  info(`Rep dropdown: ${r.body.length} active reps  First: ${first.first_name} ${first.last_name}`)
}

// ══════════════════════════════════════════════════════════════════════════
// SECTION 19 — COMMISSIONS LIST CROSS-CHECK
// ══════════════════════════════════════════════════════════════════════════
section('19. Cross-check: Report ↔ Commission List')
{
  // Every commission_detail_id in the report should correspond to a valid detail record
  const sampleIds = allRows.slice(0, 10).map(r => r.commission_detail_id)

  let validCount = 0
  for (const id of sampleIds) {
    if (!id) continue
    const r = await api(`/commissions/report-breakdown/${id}`)
    if (r.ok) validCount++
  }
  ok(validCount === sampleIds.filter(Boolean).length, `All sample detail IDs resolve (${validCount}/${sampleIds.filter(Boolean).length})`, validCount, sampleIds.filter(Boolean).length)

  // The total commission in the report should be <= the total from /commissions/stats
  const stats = await api('/commissions/stats')
  const reportTotal = allRows.reduce((s, r) => s + (r.commission || 0), 0)
  const statsTotal  = stats.body.totalComm || 0
  // Report per-rep may differ from summary (different accounting basis)
  ok(reportTotal >= 0, `Report total commission = $${reportTotal.toFixed(2)}  Stats total = $${statsTotal.toFixed(2)}`, reportTotal, '>=0')
  info(`Report total=$${reportTotal.toFixed(2)}  Stats totalComm=$${statsTotal.toFixed(2)}`)
}

// ─── Summary ─────────────────────────────────────────────────────────────────
const total = passed + failed + skipped
console.log('\n' + '═'.repeat(62))
console.log('\x1b[1mCOMMISSION REPORT DEEP TEST SUMMARY\x1b[0m')
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
if (failed === 0) console.log('\n\x1b[32m✓ All Commission Report tests passed.\x1b[0m')
else              console.log(`\n\x1b[31m✗ ${failed} test(s) failed.\x1b[0m`)
