/**
 * Live API Test Suite — Commission "Pay by % of Total"
 * Runs against the live Express + MongoDB server at http://localhost:5000/api
 * Usage: node tests/live-api-test.mjs
 *
 * Connects directly to MongoDB for pre-run cleanup so tests are fully idempotent.
 */

import mongoose from 'mongoose'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dir = dirname(fileURLToPath(import.meta.url))
const envPath = resolve(__dir, '../.env')
const env = Object.fromEntries(
  readFileSync(envPath, 'utf8').split('\n')
    .filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0,i).trim(), l.slice(i+1).trim()] })
)
const MONGO_URI = env.MONGO_URI
const BASE = 'http://localhost:5000/api'

// ─── Colours ─────────────────────────────────────────────────────────────────
const G = '\x1b[32m✓\x1b[0m'
const R = '\x1b[31m✗\x1b[0m'
const I = '\x1b[36mℹ\x1b[0m'

let passed = 0, failed = 0
const results = []

function pass(label, detail = '') {
  console.log(`  ${G} ${label}${detail ? '  \x1b[2m' + detail + '\x1b[0m' : ''}`)
  passed++
  results.push({ status: 'PASS', label })
}
function fail(label, got, expected, detail = '') {
  console.log(`  ${R} ${label}`)
  if (detail) console.log(`      ${detail}`)
  console.log(`      got:      ${JSON.stringify(got)}`)
  console.log(`      expected: ${JSON.stringify(expected)}`)
  failed++
  results.push({ status: 'FAIL', label, got, expected })
}
function info(msg) { console.log(`  ${I} \x1b[2m${msg}\x1b[0m`) }
function section(name) { console.log(`\n\x1b[1m══ ${name} ══\x1b[0m`) }
function assert(cond, label, got, expected, detail = '') {
  cond ? pass(label, detail) : fail(label, got, expected, detail)
}

async function api(path, opts = {}) {
  const res = await fetch(BASE + path, {
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
    ...opts,
  })
  const body = await res.json().catch(() => ({}))
  return { status: res.status, ok: res.ok, body }
}

// ─── DB helpers (direct Mongoose — for idempotent cleanup only) ───────────────
let db
async function dbConnect() {
  await mongoose.connect(MONGO_URI, { dbName: 'app' })
  db = mongoose.connection.db
}
async function dbDisconnect() { await mongoose.disconnect() }

/** Wipe ALL commission-related records for a given po_id so tests start fresh. */
async function purgePoId(poId) {
  const pid = parseInt(poId)
  const pids = String(pid)
  await Promise.all([
    db.collection('invoice_commission_summary').updateMany({ po_id: pid }, { $set: { status: 2 } }),
    db.collection('invoice_commissions').deleteMany({ po_id: { $in: [pid, pids] } }),
    db.collection('invoice_payment_reps').deleteMany({ po_id: { $in: [pid, pids] } }),
    db.collection('invoice_payments').deleteMany({ po_id: { $in: [pid, pids] } }),
    db.collection('commission_item_details').deleteMany({ po_id: { $in: [pid, pids] } }),
    db.collection('commission_rep_details').deleteMany({ po_id: { $in: [pid, pids] } }),
  ])
}

// ─── State ───────────────────────────────────────────────────────────────────
let testInvoice   = null
let testInvoice2  = null   // separate invoice used only by TC-16
let testReps      = []
let createdCommId = null
let createdPoId   = null

// ─── Connect + pre-run cleanup ────────────────────────────────────────────────
section('SETUP  DB Connection & Pre-run Cleanup')
{
  assert(!!MONGO_URI, 'MONGO_URI found in .env', !!MONGO_URI, true)
  try {
    await dbConnect()
    pass('Connected to MongoDB')
  } catch (e) {
    fail('MongoDB connection', e.message, 'connected')
    process.exit(1)
  }

  // Pick test invoices first so we can purge them
  const invRes = await api('/commissions/lookup/invoices')
  const repRes = await api('/commissions/lookup/reps')
  const eligible = (invRes.body || []).filter(i => parseFloat(i.net_amount) > 1000)
  testInvoice  = eligible[1] || eligible[0] || invRes.body[1] || invRes.body[0]
  testInvoice2 = eligible[2] || eligible[3] || invRes.body[2]  // distinct invoice for TC-16
  testReps     = (repRes.body || []).slice(0, 2)

  if (testInvoice) {
    await purgePoId(testInvoice.legacy_id)
    pass(`Purged all records for main test po_id=${testInvoice.legacy_id}`)
  }
  if (testInvoice2 && testInvoice2.legacy_id !== testInvoice?.legacy_id) {
    await purgePoId(testInvoice2.legacy_id)
    pass(`Purged all records for TC-16 test po_id=${testInvoice2.legacy_id}`)
  }
}

// ─── TC-00: Preconditions ─────────────────────────────────────────────────────
section('TC-00  Preconditions — Lookup Data')
{
  const invRes = await api('/commissions/lookup/invoices')
  const repRes = await api('/commissions/lookup/reps')

  assert(invRes.ok,  'GET /lookup/invoices returns 200', invRes.status, 200)
  assert(repRes.ok,  'GET /lookup/reps returns 200',     repRes.status, 200)
  assert(Array.isArray(invRes.body) && invRes.body.length > 0, 'At least 1 invoice available', invRes.body?.length, '>0')
  assert(Array.isArray(repRes.body) && repRes.body.length >= 2,'At least 2 reps available',   repRes.body?.length, '>=2')
  assert(!!testInvoice,  `Main test invoice selected (id=${testInvoice?.legacy_id})`,  !!testInvoice,  true)
  assert(!!testInvoice2, `TC-16 invoice selected (id=${testInvoice2?.legacy_id})`,     !!testInvoice2, true)

  info(`Main invoice : id=${testInvoice.legacy_id}  inv#=${testInvoice.invoice_number}  net=$${testInvoice.net_amount}  co=${testInvoice.company_name}`)
  info(`TC-16 invoice: id=${testInvoice2?.legacy_id}  net=$${testInvoice2?.net_amount}`)
  info(`Rep A: id=${testReps[0].legacy_id}  ${testReps[0].first_name} ${testReps[0].last_name}`)
  info(`Rep B: id=${testReps[1].legacy_id}  ${testReps[1].first_name} ${testReps[1].last_name}`)
}

// ─── TC-01: Create commission — Pay by % of Total ────────────────────────────
section('TC-01  Create Commission — Pay by % of Total')

const NET = parseFloat(testInvoice.net_amount) || 0
const PCT_A = 5, PCT_B = 3
const COMM_A = Math.round(NET * PCT_A / 100 * 100) / 100
const COMM_B = Math.round(NET * PCT_B / 100 * 100) / 100
const TOTAL_COMM = Math.round((COMM_A + COMM_B) * 100) / 100

info(`RepA ${PCT_A}% of $${NET} = $${COMM_A}  |  RepB ${PCT_B}% of $${NET} = $${COMM_B}  |  Total = $${TOTAL_COMM}`)
{
  const res = await api('/commissions', {
    method: 'POST',
    body: JSON.stringify({
      po_id: testInvoice.legacy_id,
      company_id: testInvoice.company_id,
      save_status: 'percent',
      reps: [
        { sales_rep_id: testReps[0].legacy_id, total_price: COMM_A },
        { sales_rep_id: testReps[1].legacy_id, total_price: COMM_B },
      ],
      item_details: [],
    }),
  })
  assert(res.status === 201, 'POST /commissions returns 201 Created', res.status, 201)
  assert(res.body.success === true, 'success: true', res.body.success, true)
  assert(Math.abs((res.body.total_commission || 0) - TOTAL_COMM) < 0.01,
    `total_commission = $${TOTAL_COMM}`, res.body.total_commission, TOTAL_COMM)
}

// ─── TC-02: Verify saved fields ───────────────────────────────────────────────
section('TC-02  Verify Saved Fields in DB')
{
  const listRes = await api('/commissions')
  assert(listRes.ok, 'GET /commissions returns 200', listRes.status, 200)

  const found = listRes.body.find(c => String(c.po_id) === String(testInvoice.legacy_id))
  assert(!!found, `Commission in list for po_id=${testInvoice.legacy_id}`, !!found, true)

  if (found) {
    createdCommId = String(found._id)
    createdPoId   = testInvoice.legacy_id

    const detRes = await api(`/commissions/${createdCommId}`)
    assert(detRes.ok, 'GET /commissions/:id returns 200', detRes.status, 200)
    const comm = detRes.body

    assert(comm.save_status === 'percent', 'save_status = "percent"', comm.save_status, 'percent')
    assert(Math.abs((parseFloat(comm.total_commission_percentage) || 0) - TOTAL_COMM) < 0.01,
      `total_commission_percentage = $${TOTAL_COMM}`, comm.total_commission_percentage, TOTAL_COMM)
    assert(comm.total_commission_dollar === '' || comm.total_commission_dollar == null,
      'total_commission_dollar is empty', comm.total_commission_dollar, '')
    assert(Math.abs((comm.total_commission || 0) - TOTAL_COMM) < 0.01,
      `total_commission = $${TOTAL_COMM}`, comm.total_commission, TOTAL_COMM)

    const details = comm.details || []
    assert(details.length === 2, '2 rep detail records created', details.length, 2)

    const dA = details.find(d => d.sales_rep_id === testReps[0].legacy_id)
    const dB = details.find(d => d.sales_rep_id === testReps[1].legacy_id)
    assert(!!dA, 'Rep A detail exists', !!dA, true)
    assert(!!dB, 'Rep B detail exists', !!dB, true)
    if (dA) assert(Math.abs((parseFloat(dA.total_price)||0) - COMM_A) < 0.01, `Rep A total_price = $${COMM_A}`, dA.total_price, COMM_A)
    if (dB) assert(Math.abs((parseFloat(dB.total_price)||0) - COMM_B) < 0.01, `Rep B total_price = $${COMM_B}`, dB.total_price, COMM_B)

    assert(comm.commission_paid_status === 0, 'Initial paid_status = 0 (unpaid)', comm.commission_paid_status, 0)
    assert(comm.invoice?.legacy_id === testInvoice.legacy_id || String(comm.invoice?.legacy_id) === String(testInvoice.legacy_id),
      'Linked to correct invoice', comm.invoice?.legacy_id, testInvoice.legacy_id)
  }
}

// ─── TC-03: List view ─────────────────────────────────────────────────────────
section('TC-03  List View — Balance & Pay Status')
{
  const listRes = await api('/commissions')
  const comm = listRes.body.find(c => String(c._id) === createdCommId)

  assert(!!comm, 'Commission in list', !!comm, true)
  if (comm) {
    assert(comm.pay_status === 0, 'pay_status = 0 (unpaid)',  comm.pay_status, 0)
    assert(Math.abs((comm.total_comm||0) - TOTAL_COMM) < 0.01, `total_comm = $${TOTAL_COMM}`, comm.total_comm, TOTAL_COMM)
    assert(Math.abs((comm.balance||0)    - TOTAL_COMM) < 0.01, `balance = $${TOTAL_COMM}`,    comm.balance,    TOTAL_COMM)
    assert((comm.total_paid||0) === 0, 'total_paid = 0', comm.total_paid, 0)
    info(`Company: ${comm.company_name}  Invoice#: ${comm.invoice_number}  Net: $${comm.net_amount}`)
  }
}

// ─── TC-04: Update — new % values ─────────────────────────────────────────────
section('TC-04  Update Commission — New % Values')
{
  const NEW_A = Math.round(NET * 7 / 100 * 100) / 100
  const NEW_B = Math.round(NET * 4 / 100 * 100) / 100
  const NEW_T = Math.round((NEW_A + NEW_B) * 100) / 100
  info(`7% = $${NEW_A}  +  4% = $${NEW_B}  =  $${NEW_T}`)

  const res = await api(`/commissions/${createdCommId}`, {
    method: 'PUT',
    body: JSON.stringify({
      save_status: 'percent',
      reps: [
        { sales_rep_id: testReps[0].legacy_id, total_price: NEW_A },
        { sales_rep_id: testReps[1].legacy_id, total_price: NEW_B },
      ],
      item_details: [],
    }),
  })
  assert(res.ok, 'PUT returns 200', res.status, 200)
  assert(Math.abs((res.body.total_commission||0) - NEW_T) < 0.01, `Updated total = $${NEW_T}`, res.body.total_commission, NEW_T)

  const det = await api(`/commissions/${createdCommId}`)
  assert(det.body.save_status === 'percent', 'save_status still percent', det.body.save_status, 'percent')
  assert(Math.abs((parseFloat(det.body.total_commission_percentage)||0) - NEW_T) < 0.01, `percentage = $${NEW_T}`, det.body.total_commission_percentage, NEW_T)
  assert(det.body.details?.length === 2, 'Still 2 rep details', det.body.details?.length, 2)
}

// ─── TC-05: Mode switch percent → dollar → percent ───────────────────────────
section('TC-05  Mode Switch — Percent → Dollar → Percent')
{
  const r1 = await api(`/commissions/${createdCommId}`, { method: 'PUT', body: JSON.stringify({ save_status: 'dollar', reps: [{ sales_rep_id: testReps[0].legacy_id, total_price: 100 }, { sales_rep_id: testReps[1].legacy_id, total_price: 75 }], item_details: [] }) })
  assert(r1.ok, 'PUT dollar mode returns 200', r1.status, 200)
  const d1 = await api(`/commissions/${createdCommId}`)
  assert(d1.body.save_status === 'dollar', 'save_status = dollar', d1.body.save_status, 'dollar')
  assert(Math.abs((parseFloat(d1.body.total_commission_dollar)||0) - 175) < 0.01, 'total_commission_dollar = $175', d1.body.total_commission_dollar, 175)
  assert(d1.body.total_commission_percentage === '' || d1.body.total_commission_percentage == null, 'percentage cleared', d1.body.total_commission_percentage, '')

  const r2 = await api(`/commissions/${createdCommId}`, { method: 'PUT', body: JSON.stringify({ save_status: 'percent', reps: [{ sales_rep_id: testReps[0].legacy_id, total_price: COMM_A }, { sales_rep_id: testReps[1].legacy_id, total_price: COMM_B }], item_details: [] }) })
  const d2 = await api(`/commissions/${createdCommId}`)
  assert(d2.body.save_status === 'percent', 'Back to percent', d2.body.save_status, 'percent')
  assert(d2.body.total_commission_dollar === '' || d2.body.total_commission_dollar == null, 'dollar cleared on switch back', d2.body.total_commission_dollar, '')
}

// ─── TC-06: Partial payment ───────────────────────────────────────────────────
section('TC-06  Add Partial Payment')
{
  const received    = Math.round(NET * 0.5 * 100) / 100
  const partialComm = Math.round((received / NET) * TOTAL_COMM * 100) / 100
  const totalRep    = COMM_A + COMM_B
  const splitA      = Math.round(partialComm * (COMM_A / totalRep) * 100) / 100
  const splitB      = Math.round(partialComm * (COMM_B / totalRep) * 100) / 100
  const today       = new Date().toISOString().slice(0, 10)
  info(`Received $${received} (50% of $${NET}) → partial comm = $${partialComm}`)
  info(`Rep A split: $${splitA}  Rep B split: $${splitB}`)

  const payRes = await api(`/commissions/${createdCommId}/payment`, {
    method: 'POST',
    body: JSON.stringify({
      commission_paid_date: today, received_date: today,
      received_amount: received, paid_mode: 'CHECK-TEST',
      partial_comm_total: partialComm, mark_paid: false,
      rep_payments: [
        { rep_id: testReps[0].legacy_id, org_amount: COMM_A, paid_amount: splitA },
        { rep_id: testReps[1].legacy_id, org_amount: COMM_B, paid_amount: splitB },
      ],
    }),
  })
  assert(payRes.ok, 'POST /payment returns 200', payRes.status, 200)
  assert(payRes.body.success === true, 'Payment success: true', payRes.body.success, true)

  const list = await api('/commissions')
  const comm = list.body.find(c => String(c._id) === createdCommId)
  assert(comm?.pay_status === 1, 'pay_status = 1 (partial)', comm?.pay_status, 1)
  assert((comm?.total_paid||0) > 0, 'total_paid > 0', comm?.total_paid, '>0')
  assert((comm?.balance||0) > 0, `balance > 0 ($${comm?.balance?.toFixed(2)})`, comm?.balance, '>0')
  info(`After payment: total_paid=$${comm?.total_paid?.toFixed(2)}  balance=$${comm?.balance?.toFixed(2)}`)
}

// ─── TC-07: Full payoff ────────────────────────────────────────────────────────
section('TC-07  Second Payment — Full Payoff')
{
  const detRes  = await api(`/commissions/${createdCommId}`)
  const details  = detRes.body.details || []
  const payments = detRes.body.payments || []
  const today   = new Date().toISOString().slice(0, 10)

  const repAmounts = details.map(d => {
    const prevPaid = payments.filter(p => String(p.rep_id) === String(d.sales_rep_id))
      .reduce((s, p) => s + (parseFloat(p.comm_paid_amount)||0), 0)
    const balance = Math.max(0, (parseFloat(d.total_price)||0) - prevPaid)
    return { rep_id: d.sales_rep_id, org_amount: d.total_price, paid_amount: balance }
  }).filter(r => r.paid_amount > 0)

  const remaining = repAmounts.reduce((s, r) => s + r.paid_amount, 0)
  info(`Paying remaining: $${remaining.toFixed(2)}`)

  const payRes = await api(`/commissions/${createdCommId}/payment`, {
    method: 'POST',
    body: JSON.stringify({
      commission_paid_date: today, received_date: today,
      received_amount: NET, paid_mode: 'CHECK-TEST2',
      partial_comm_total: remaining, mark_paid: true,
      rep_payments: repAmounts,
    }),
  })
  assert(payRes.ok, 'Second payment returns 200', payRes.status, 200)

  const list = await api('/commissions')
  const comm = list.body.find(c => String(c._id) === createdCommId)
  assert(comm?.pay_status === 2, 'pay_status = 2 (fully paid)', comm?.pay_status, 2)
  assert((comm?.balance||0) <= 0, `balance = $0.00`, comm?.balance, 0)
  info(`Final: total_paid=$${comm?.total_paid?.toFixed(2)}  balance=$${comm?.balance?.toFixed(2)}`)
}

// ─── TC-08: Toggle paid/unpaid ────────────────────────────────────────────────
section('TC-08  Toggle Paid / Unpaid Status')
{
  const r1 = await api(`/commissions/${createdCommId}/unpaid`, { method: 'PUT' })
  assert(r1.ok, 'PUT /unpaid returns 200', r1.status, 200)
  assert(r1.body.commission_paid_status === 0, 'commission_paid_status=0', r1.body.commission_paid_status, 0)

  const r2 = await api(`/commissions/${createdCommId}/paid`, { method: 'PUT' })
  assert(r2.ok, 'PUT /paid returns 200', r2.status, 200)
  assert(r2.body.commission_paid_status === 1, 'commission_paid_status=1', r2.body.commission_paid_status, 1)
}

// ─── TC-09: Negative commission rejected ─────────────────────────────────────
section('TC-09  Validation — Reject Negative Commission')
{
  const res = await api('/commissions', { method: 'POST', body: JSON.stringify({ po_id: 99999, save_status: 'percent', reps: [{ sales_rep_id: testReps[0].legacy_id, total_price: -50 }], item_details: [] }) })
  assert(res.status === 400, 'Negative total_price → 400', res.status, 400)
  assert(typeof res.body.error === 'string' && res.body.error.includes('negative'), 'Error mentions "negative"', res.body.error, 'includes "negative"')
}

// ─── TC-10: Missing invoice ID ────────────────────────────────────────────────
section('TC-10  Validation — Missing Invoice ID')
{
  const res = await api('/commissions', { method: 'POST', body: JSON.stringify({ reps: [{ sales_rep_id: 1, total_price: 10 }], save_status: 'percent', item_details: [] }) })
  assert(res.status === 400, 'Missing po_id → 400', res.status, 400)
  assert(typeof res.body.error === 'string', 'Error string returned', typeof res.body.error, 'string')
}

// ─── TC-11: Empty reps ────────────────────────────────────────────────────────
section('TC-11  Validation — No Reps')
{
  const res = await api('/commissions', { method: 'POST', body: JSON.stringify({ po_id: 9999, reps: [], save_status: 'percent', item_details: [] }) })
  assert(res.status === 400, 'Empty reps → 400', res.status, 400)
}

// ─── TC-12: Stats ─────────────────────────────────────────────────────────────
section('TC-12  Stats Endpoint')
{
  const res = await api('/commissions/stats')
  assert(res.ok, 'GET /stats returns 200', res.status, 200)
  assert(typeof res.body.total     === 'number', 'total is number',    typeof res.body.total,    'number')
  assert(typeof res.body.totalComm === 'number', 'totalComm is number',typeof res.body.totalComm,'number')
  assert(res.body.total > 0, `total > 0 (= ${res.body.total})`, res.body.total, '>0')
  info(`Stats: ${res.body.total} records  $${res.body.totalComm?.toFixed(2)} total`)
}

// ─── TC-13: Commission map ────────────────────────────────────────────────────
section('TC-13  Commission Map')
{
  const res = await api('/commissions/map')
  assert(res.ok, 'GET /map returns 200', res.status, 200)
  assert(typeof res.body === 'object' && !Array.isArray(res.body), 'Returns object map', null, null)
  if (createdPoId) assert(String(createdPoId) in res.body || createdPoId in res.body, `Map has po_id=${createdPoId}`, null, null)
}

// ─── TC-14: Report ────────────────────────────────────────────────────────────
section('TC-14  Commission Report')
{
  const res = await api('/commissions/report')
  assert(res.ok, 'GET /report returns 200', res.status, 200)
  assert(Array.isArray(res.body), 'Returns array', Array.isArray(res.body), true)
  if (res.body.length > 0) {
    const row = res.body[0]
    ;['po_id','rep_name','commission','invoice_number','subtotal','is_paid'].forEach(f =>
      assert(f in row, `Report row has field: ${f}`, f in row, true)
    )
  }
  info(`Report rows: ${res.body.length}`)
}

// ─── TC-15: Soft delete ───────────────────────────────────────────────────────
section('TC-15  Soft Delete + Associated Record Cleanup')
{
  const delRes = await api(`/commissions/${createdCommId}`, { method: 'DELETE' })
  assert(delRes.ok, 'DELETE returns 200', delRes.status, 200)
  assert(delRes.body.success === true, 'success: true', delRes.body.success, true)

  const list = await api('/commissions')
  assert(!list.body.find(c => String(c._id) === createdCommId), 'Not in active list after delete', false, false)

  const det = await api(`/commissions/${createdCommId}`)
  assert(det.ok, 'Direct fetch still 200', det.status, 200)
  assert(det.body.status === 2 || String(det.body.status) === '2', 'status=2 (soft deleted)', det.body.status, 2)

  // Verify associated records were cleaned from DB
  const commDets = await db.collection('invoice_commissions').find({ po_id: { $in: [testInvoice.legacy_id, String(testInvoice.legacy_id)] } }).toArray()
  const payReps  = await db.collection('invoice_payment_reps').find({ po_id: { $in: [testInvoice.legacy_id, String(testInvoice.legacy_id)] } }).toArray()
  const invPays  = await db.collection('invoice_payments').find({ po_id: { $in: [testInvoice.legacy_id, String(testInvoice.legacy_id)] } }).toArray()
  assert(commDets.length === 0, 'invoice_commissions deleted on soft-delete', commDets.length, 0)
  assert(payReps.length  === 0, 'invoice_payment_reps deleted on soft-delete', payReps.length,  0)
  assert(invPays.length  === 0, 'invoice_payments deleted on soft-delete',     invPays.length,  0)
}

// ─── TC-16: item_details written and read back ────────────────────────────────
section('TC-16  item_details — Breakdown Written and Read Back')
{
  // Use the SEPARATE invoice (testInvoice2), not the main test invoice,
  // to avoid interference with TC-15's cleanup.
  if (!testInvoice2) {
    pass('TC-16 skipped — no second invoice available')
  } else {
    const net2   = parseFloat(testInvoice2.net_amount) || 0
    const commA2 = Math.round(net2 * 0.05 * 100) / 100
    const commB2 = Math.round(net2 * 0.03 * 100) / 100
    const total2 = Math.round((commA2 + commB2) * 100) / 100

    const itemDetails = [{
      item_id: 9001,
      base_price: net2,
      total_price: total2,
      rep_details: [
        { sales_rep_id: testReps[0].legacy_id, commission_price: commA2, total_commission_price: commA2 },
        { sales_rep_id: testReps[1].legacy_id, commission_price: commB2, total_commission_price: commB2 },
      ],
    }]

    const createRes = await api('/commissions', {
      method: 'POST',
      body: JSON.stringify({
        po_id: testInvoice2.legacy_id,
        company_id: testInvoice2.company_id,
        save_status: 'percent',
        reps: [
          { sales_rep_id: testReps[0].legacy_id, total_price: commA2 },
          { sales_rep_id: testReps[1].legacy_id, total_price: commB2 },
        ],
        item_details: itemDetails,
      }),
    })
    assert(createRes.status === 201, 'POST with item_details returns 201', createRes.status, 201)

    const list2 = await api('/commissions')
    const comm2 = list2.body.find(c => String(c.po_id) === String(testInvoice2.legacy_id))
    if (comm2) {
      const detRes = await api(`/commissions/${comm2._id}`)
      const commItemDets = detRes.body.commItemDets || []
      const commRepDets  = detRes.body.commRepDets  || []

      assert(commItemDets.length === 1, `commission_item_details = 1 row (got ${commItemDets.length})`, commItemDets.length, 1)
      assert(commRepDets.length  === 2, `commission_rep_details = 2 rows (got ${commRepDets.length})`,  commRepDets.length,  2)
      if (commItemDets[0]) {
        assert(Math.abs((parseFloat(commItemDets[0].total_price)||0) - total2) < 0.01, `item total_price = $${total2}`, commItemDets[0].total_price, total2)
        assert(Math.abs((parseFloat(commItemDets[0].base_price) ||0) - net2)   < 0.01, `item base_price  = $${net2}`,   commItemDets[0].base_price,  net2)
      }

      // report-breakdown
      const dets = detRes.body.details || []
      if (dets.length > 0) {
        const bk = await api(`/commissions/report-breakdown/${dets[0]._id}`)
        assert(bk.ok, 'GET /report-breakdown/:id returns 200', bk.status, 200)
        assert(bk.body.has_item_detail === true, 'has_item_detail = true', bk.body.has_item_detail, true)
        assert(Array.isArray(bk.body.line_items), 'line_items is array', Array.isArray(bk.body.line_items), true)
        info(`Breakdown: ${bk.body.line_items?.length} line items  total_commission=$${bk.body.total_commission}`)
      }

      // Cleanup
      const delRes = await api(`/commissions/${comm2._id}`, { method: 'DELETE' })
      assert(delRes.ok, 'TC-16 commission cleaned up', delRes.status, 200)

      // Verify cleanup via DB
      const leftover = await db.collection('commission_item_details').find({ po_id: { $in: [testInvoice2.legacy_id, String(testInvoice2.legacy_id)] } }).toArray()
      assert(leftover.length === 0, 'commission_item_details = 0 after TC-16 cleanup', leftover.length, 0)
    } else {
      info('Commission not found in list (po may have been re-used)')
    }
  }
}

// ─── TC-17: Repeated run — no ghost data ─────────────────────────────────────
section('TC-17  Idempotency — No Ghost Records After Cleanup')
{
  // Confirm that after all deletes, both test po_ids are fully clean in DB
  for (const [label, inv] of [['main', testInvoice], ['TC-16', testInvoice2]]) {
    if (!inv) continue
    const pid = inv.legacy_id
    const counts = await Promise.all([
      db.collection('invoice_commissions').countDocuments({ po_id: { $in: [pid, String(pid)] } }),
      db.collection('invoice_payment_reps').countDocuments({ po_id: { $in: [pid, String(pid)] } }),
      db.collection('commission_item_details').countDocuments({ po_id: { $in: [pid, String(pid)] } }),
    ])
    const [dets, pays, items] = counts
    assert(dets === 0,  `[${label}] invoice_commissions clean (po_id=${pid})`,      dets,  0)
    assert(pays === 0,  `[${label}] invoice_payment_reps clean (po_id=${pid})`,     pays,  0)
    assert(items === 0, `[${label}] commission_item_details clean (po_id=${pid})`,  items, 0)
  }
}

// ─── Disconnect + Summary ─────────────────────────────────────────────────────
await dbDisconnect()

console.log('\n' + '═'.repeat(62))
console.log('\x1b[1mLIVE API TEST SUMMARY\x1b[0m')
console.log('═'.repeat(62))
console.log(`  Total  : ${passed + failed}`)
console.log(`  \x1b[32mPassed\x1b[0m : ${passed}`)
console.log(`  \x1b[31mFailed\x1b[0m : ${failed}`)
console.log('═'.repeat(62))

const failures = results.filter(r => r.status === 'FAIL')
if (failures.length > 0) {
  console.log('\n\x1b[1mFAILED ASSERTIONS:\x1b[0m')
  failures.forEach((f, i) => console.log(`  ${i+1}. ${f.label}\n     got=${JSON.stringify(f.got)}  expected=${JSON.stringify(f.expected)}`))
  process.exit(1)
} else {
  console.log('\n\x1b[32m✓ All live API tests passed.\x1b[0m')
}
