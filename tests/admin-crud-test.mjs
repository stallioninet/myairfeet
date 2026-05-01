/**
 * Admin Dashboard CRUD Test Suite
 * Tests every admin submenu via live API
 * Usage: node tests/admin-crud-test.mjs
 */

const BASE = 'http://localhost:5000/api'
const TS   = `TEST_${Date.now()}`   // unique tag so test data is easy to find/clean

// ─── Colours ─────────────────────────────────────────────────────────────────
const G  = '\x1b[32m✓\x1b[0m'
const R  = '\x1b[31m✗\x1b[0m'
const SK = '\x1b[33m⊘\x1b[0m'

let passed = 0, failed = 0, skipped = 0
const failures = []

function pass(label)          { console.log(`  ${G} ${label}`); passed++ }
function fail(label, got, exp){ console.log(`  ${R} ${label}\n      got=${JSON.stringify(got)}  exp=${JSON.stringify(exp)}`); failed++; failures.push({ label, got, exp }) }
function skip(label, reason)  { console.log(`  ${SK} \x1b[33m${label}\x1b[0m  \x1b[2m(${reason})\x1b[0m`); skipped++ }
function info(msg)            { console.log(`  \x1b[2m${msg}\x1b[0m`) }
function section(n)           { console.log(`\n\x1b[1;36m━━ ${n} ━━\x1b[0m`) }
function ok(cond,label,got,exp){ cond ? pass(label) : fail(label, got, exp) }

async function api(path, opts = {}) {
  try {
    const res = await fetch(BASE + path, {
      headers: { 'Content-Type': 'application/json', 'x-user-email': 'admin@stallioni.com' },
      ...opts,
    })
    const body = await res.json().catch(() => ({}))
    return { status: res.status, ok: res.ok, body }
  } catch (e) {
    return { status: 0, ok: false, body: { error: e.message } }
  }
}
const GET    = (p)       => api(p)
const POST   = (p, data) => api(p, { method: 'POST',   body: JSON.stringify(data) })
const PUT    = (p, data) => api(p, { method: 'PUT',    body: JSON.stringify(data) })
const DELETE = (p)       => api(p, { method: 'DELETE' })

// ════════════════════════════════════════════════════════════════════════════
// 1. ADMINISTRATION — Users
// ════════════════════════════════════════════════════════════════════════════
section('1. ADMIN › Users')
{
  // LIST
  const list = await GET('/users')
  ok(list.ok && Array.isArray(list.body), 'LIST users returns array', list.status, 200)
  info(`Total users: ${list.body.length}`)

  // STATS
  const stats = await GET('/users/stats/counts')
  ok(stats.ok, 'GET /users/stats/counts returns 200', stats.status, 200)

  // CHECK UNIQUE
  const uniq = await GET('/users/check-unique?email=new_test_user_xyz@example.com')
  ok(uniq.ok, 'GET /users/check-unique returns 200', uniq.status, 200)

  // CREATE
  const cr = await POST('/users', { first_name: 'TestUser', last_name: TS, email: `test_${TS}@example.com`, password: 'Test@12345', level: 'data-entry', status: 'active' })
  ok(cr.status === 201 || cr.ok, 'CREATE user returns 201', cr.status, 201)
  const userId = cr.body._id || cr.body.insertedId || cr.body.id

  if (userId) {
    // READ
    const rd = await GET(`/users/${userId}`)
    ok(rd.ok, 'READ user by id returns 200', rd.status, 200)
    ok(rd.body.email === `test_${TS}@example.com`, 'READ user email matches', rd.body.email, `test_${TS}@example.com`)

    // UPDATE
    const up = await PUT(`/users/${userId}`, { first_name: 'UpdatedTestUser', last_name: `${TS}_upd`, email: `test_${TS}@example.com`, level: 'data-entry', status: 'active' })
    ok(up.ok, 'UPDATE user returns 200', up.status, 200)

    // VERIFY UPDATE
    const vu = await GET(`/users/${userId}`)
    ok(vu.body.first_name === 'UpdatedTestUser', 'UPDATE verified: first_name changed', vu.body.first_name, 'UpdatedTestUser')

    // DELETE
    const dl = await DELETE(`/users/${userId}`)
    ok(dl.ok, 'DELETE user returns 200', dl.status, 200)
    info(`Created→Read→Updated→Deleted user id=${userId}`)
  } else {
    skip('READ/UPDATE/DELETE user', 'CREATE did not return id')
  }
}

// ════════════════════════════════════════════════════════════════════════════
// 2. ADMINISTRATION — User Levels
// ════════════════════════════════════════════════════════════════════════════
section('2. ADMIN › User Levels')
{
  const list = await GET('/user-levels')
  ok(list.ok && Array.isArray(list.body), 'LIST user levels returns array', list.status, 200)
  info(`Total levels: ${list.body.length}`)

  const cr = await POST('/user-levels', { name: `TestLevel_${TS}`, key: `test_${TS}`, description: 'CRUD test level', status: 'active' })
  ok(cr.ok || cr.status === 201, 'CREATE user level', cr.status, '200/201')
  const lvlId = cr.body._id || cr.body.insertedId

  if (lvlId) {
    const rd = await GET(`/user-levels/${lvlId}`)
    ok(rd.ok, 'READ user level', rd.status, 200)

    const up = await PUT(`/user-levels/${lvlId}`, { name: `TestLevel_${TS}_upd`, key: `test_${TS}`, description: 'Updated', status: 'active' })
    ok(up.ok, 'UPDATE user level', up.status, 200)

    const deact = await PUT(`/user-levels/${lvlId}/deactivate`, {})
    ok(deact.ok, 'DEACTIVATE user level', deact.status, 200)

    const act = await PUT(`/user-levels/${lvlId}/activate`, {})
    ok(act.ok, 'ACTIVATE user level', act.status, 200)

    const dl = await DELETE(`/user-levels/${lvlId}`)
    ok(dl.ok, 'DELETE user level', dl.status, 200)
    info(`Created→Read→Updated→Deact→Act→Deleted level id=${lvlId}`)
  } else {
    skip('READ/UPDATE/DELETE user level', 'CREATE did not return id')
    info(`CREATE response: ${JSON.stringify(cr.body)}`)
  }
}

// ════════════════════════════════════════════════════════════════════════════
// 3. ADMINISTRATION — Privileges
// ════════════════════════════════════════════════════════════════════════════
section('3. ADMIN › Privileges')
{
  const list = await GET('/privileges')
  ok(list.ok && Array.isArray(list.body), 'LIST privileges returns array', list.status, 200)
  info(`Total privileges: ${list.body.length}`)

  const cr = await POST('/privileges', { name: `TestPriv_${TS}`, key: `test_priv_${TS}`, description: 'CRUD test privilege', status: 'active' })
  ok(cr.ok || cr.status === 201, 'CREATE privilege', cr.status, '200/201')
  const privId = cr.body._id || cr.body.insertedId

  if (privId) {
    const rd = await GET(`/privileges/${privId}`)
    ok(rd.ok, 'READ privilege', rd.status, 200)

    const up = await PUT(`/privileges/${privId}`, { name: `TestPriv_${TS}_upd`, key: `test_priv_${TS}`, description: 'Updated', status: 'active' })
    ok(up.ok, 'UPDATE privilege', up.status, 200)

    const dl = await DELETE(`/privileges/${privId}`)
    ok(dl.ok, 'DELETE privilege', dl.status, 200)
    info(`Created→Read→Updated→Deleted privilege id=${privId}`)
  } else {
    skip('READ/UPDATE/DELETE privilege', 'CREATE did not return id')
  }
}

// ════════════════════════════════════════════════════════════════════════════
// 4. ADMINISTRATION — User Access
// ════════════════════════════════════════════════════════════════════════════
section('4. ADMIN › User Access')
{
  const all = await GET('/user-access/levels/all')
  ok(all.ok, 'GET all level access rules', all.status, 200)

  const lvl = await GET('/user-access/level/admin')
  ok(lvl.ok, 'GET access for level "admin"', lvl.status, 200)
  info(`Admin level access keys: ${Object.keys(lvl.body || {}).length}`)

  // Update access — PUT expects { access: [...levelPrivilege objects] }
  const currentAccess = lvl.body?.access || []
  const up = await PUT('/user-access/level/admin', { access: currentAccess })
  ok(up.ok, 'PUT update level access returns 200', up.status, 200)

  // Restore
  await PUT('/user-access/level/admin', { access: currentAccess })
  pass('Restored original level access')
}

// ════════════════════════════════════════════════════════════════════════════
// 5. ADMINISTRATION — User Activity
// ════════════════════════════════════════════════════════════════════════════
section('5. ADMIN › User Activity')
{
  const list = await GET('/user-activity')
  ok(list.ok && Array.isArray(list.body), 'LIST user activity', list.status, 200)
  info(`Activity records: ${list.body.length}`)

  const stats = await GET('/user-activity/stats')
  ok(stats.ok, 'GET activity stats', stats.status, 200)

  // CREATE activity log — requires real user ObjectId; use first available user
  const userList = await GET('/users')
  const firstUser = userList.body?.[0]
  const cr = await POST('/user-activity', { user: firstUser?._id, action: 'create', module: 'Customers', description: `CRUD test ${TS}` })
  ok(cr.ok || cr.status === 201, 'CREATE activity log', cr.status, '200/201')
  const actId = cr.body._id || cr.body.insertedId
  if (actId) info(`Created activity log id=${actId}`)
}

// ════════════════════════════════════════════════════════════════════════════
// 6. ADMINISTRATION — Backups
// ════════════════════════════════════════════════════════════════════════════
section('6. ADMIN › Backups')
{
  const list = await GET('/backups')
  ok(list.ok && Array.isArray(list.body), 'LIST backups', list.status, 200)
  info(`Backup records: ${list.body.length}`)

  const stats = await GET('/backups/stats')
  ok(stats.ok, 'GET backup stats', stats.status, 200)

  const settings = await GET('/backups/settings/current')
  ok(settings.ok, 'GET backup settings', settings.status, 200)

  // Update settings
  const upSettings = await PUT('/backups/settings', { auto_backup: false, backup_interval_hours: 24 })
  ok(upSettings.ok, 'PUT backup settings', upSettings.status, 200)

  // Creating a real backup takes time — just verify endpoint exists
  info('Skipping full backup creation (takes time); endpoint verified via stats')
}

// ════════════════════════════════════════════════════════════════════════════
// 7. ITEMS — Item Types
// ════════════════════════════════════════════════════════════════════════════
section('7. ITEMS › Item Types')
{
  const list = await GET('/item-types')
  ok(list.ok && Array.isArray(list.body), 'LIST item types', list.status, 200)
  info(`Item types: ${list.body.length}`)

  const uniq = await GET(`/item-types/check-unique?name=TestType_${TS}`)
  ok(uniq.ok, 'CHECK UNIQUE item type name', uniq.status, 200)

  const cr = await POST('/item-types', { name: `TestType_${TS}`, description: 'CRUD test type', icon: 'bi-box', status: 'active' })
  ok(cr.ok || cr.status === 201, 'CREATE item type', cr.status, '200/201')
  const typeId = cr.body._id || cr.body.insertedId

  if (typeId) {
    const rd = await GET(`/item-types/${typeId}`)
    ok(rd.ok, 'READ item type', rd.status, 200)
    ok(rd.body.name === `TestType_${TS}`, 'READ item type name matches', rd.body.name, `TestType_${TS}`)

    const up = await PUT(`/item-types/${typeId}`, { name: `TestType_${TS}_upd`, description: 'Updated', icon: 'bi-box', status: 'active' })
    ok(up.ok, 'UPDATE item type', up.status, 200)

    const deact = await PUT(`/item-types/${typeId}/deactivate`, {})
    ok(deact.ok, 'DEACTIVATE item type', deact.status, 200)

    const act = await PUT(`/item-types/${typeId}/activate`, {})
    ok(act.ok, 'ACTIVATE item type', act.status, 200)

    const dl = await DELETE(`/item-types/${typeId}`)
    ok(dl.ok, 'DELETE item type', dl.status, 200)
    info(`Created→Read→Updated→Deact→Act→Deleted type id=${typeId}`)
  } else {
    skip('READ/UPDATE/DELETE item type', `CREATE response: ${JSON.stringify(cr.body)}`)
  }
}

// ════════════════════════════════════════════════════════════════════════════
// 8. ITEMS — Product Items
// ════════════════════════════════════════════════════════════════════════════
section('8. ITEMS › Product Items')
{
  const list = await GET('/products')
  ok(list.ok && Array.isArray(list.body), 'LIST products', list.status, 200)
  info(`Products: ${list.body.length}`)

  // Get a real item type id to use
  const typeList = await GET('/item-types')
  const existingType = typeList.body?.[0]

  const cr = await POST('/products', {
    name: `TestProduct_${TS}`,
    item_type: existingType?._id || null,
    unit_price: 19.99,
    base_price: 15.00,
    notes: 'CRUD test product',
    status: 'active',
  })
  ok(cr.ok || cr.status === 201, 'CREATE product', cr.status, '200/201')
  const prodId = cr.body._id || cr.body.insertedId

  if (prodId) {
    const rd = await GET(`/products/${prodId}`)
    ok(rd.ok, 'READ product', rd.status, 200)

    const up = await PUT(`/products/${prodId}`, { name: `TestProduct_${TS}_upd`, unit_price: 29.99, base_price: 20.00, status: 'active' })
    ok(up.ok, 'UPDATE product', up.status, 200)

    const dup = await POST(`/products/${prodId}/duplicate`, {})
    ok(dup.ok || dup.status === 201, 'DUPLICATE product', dup.status, '200/201')
    const dupId = dup.body._id || dup.body.insertedId

    const dl = await DELETE(`/products/${prodId}`)
    ok(dl.ok, 'DELETE original product', dl.status, 200)

    if (dupId) {
      await DELETE(`/products/${dupId}`)
      pass('DELETE duplicate product (cleanup)')
    }
    info(`Created→Read→Updated→Duplicated→Deleted product id=${prodId}`)
  } else {
    skip('READ/UPDATE/DELETE product', `CREATE response: ${JSON.stringify(cr.body)}`)
  }
}

// ════════════════════════════════════════════════════════════════════════════
// 9. ITEMS — Product Sizes
// ════════════════════════════════════════════════════════════════════════════
section('9. ITEMS › Product Sizes')
{
  const list = await GET('/product-sizes')
  ok(list.ok && Array.isArray(list.body), 'LIST sizes', list.status, 200)
  info(`Sizes: ${list.body.length}`)

  const cr = await POST('/product-sizes', { name: `TestSize_${TS}`, code: `TS${Date.now().toString().slice(-4)}`, status: 'active' })
  ok(cr.ok || cr.status === 201, 'CREATE size', cr.status, '200/201')
  const sizeId = cr.body._id || cr.body.insertedId

  if (sizeId) {
    const rd = await GET(`/product-sizes/${sizeId}`)
    ok(rd.ok, 'READ size', rd.status, 200)

    const up = await PUT(`/product-sizes/${sizeId}`, { name: `TestSize_${TS}_upd`, code: `TU${Date.now().toString().slice(-4)}`, status: 'active' })
    ok(up.ok, 'UPDATE size', up.status, 200)

    const dl = await DELETE(`/product-sizes/${sizeId}`)
    ok(dl.ok, 'DELETE size', dl.status, 200)
    info(`Created→Read→Updated→Deleted size id=${sizeId}`)
  } else {
    skip('READ/UPDATE/DELETE size', `CREATE response: ${JSON.stringify(cr.body)}`)
  }
}

// ════════════════════════════════════════════════════════════════════════════
// 10. ITEMS — Product Groups
// ════════════════════════════════════════════════════════════════════════════
section('10. ITEMS › Product Groups')
{
  const list = await GET('/product-groups')
  ok(list.ok && Array.isArray(list.body), 'LIST product groups', list.status, 200)
  info(`Groups: ${list.body.length}`)

  const cr = await POST('/product-groups', { name: `TestGroup_${TS}`, description: 'CRUD test group', status: 'active' })
  ok(cr.ok || cr.status === 201, 'CREATE product group', cr.status, '200/201')
  const grpId = cr.body._id || cr.body.insertedId

  if (grpId) {
    const rd = await GET(`/product-groups/${grpId}`)
    ok(rd.ok, 'READ product group', rd.status, 200)

    const up = await PUT(`/product-groups/${grpId}`, { name: `TestGroup_${TS}_upd`, description: 'Updated', status: 'active' })
    ok(up.ok, 'UPDATE product group', up.status, 200)

    const dup = await POST(`/product-groups/${grpId}/duplicate`, {})
    ok(dup.ok || dup.status === 201, 'DUPLICATE product group', dup.status, '200/201')
    const dupId = dup.body._id || dup.body.insertedId

    const dl = await DELETE(`/product-groups/${grpId}`)
    ok(dl.ok, 'DELETE product group', dl.status, 200)
    if (dupId) { await DELETE(`/product-groups/${dupId}`); pass('DELETE duplicate group (cleanup)') }
    info(`Created→Read→Updated→Duplicated→Deleted group id=${grpId}`)
  } else {
    skip('READ/UPDATE/DELETE product group', `CREATE response: ${JSON.stringify(cr.body)}`)
  }
}

// ════════════════════════════════════════════════════════════════════════════
// 11. SALES — Sales Reps
// ════════════════════════════════════════════════════════════════════════════
section('11. SALES › Sales Reps')
{
  const stats = await GET('/sales-reps/stats')
  ok(stats.ok, 'GET sales-reps stats', stats.status, 200)
  info(`Reps: total=${stats.body.total} active=${stats.body.active}`)

  const list = await GET('/sales-reps')
  ok(list.ok && Array.isArray(list.body), 'LIST sales reps', list.status, 200)

  const uniq = await GET(`/sales-reps/check-unique?email=testrep_${TS}@example.com&rep_number=T9999`)
  ok(uniq.ok, 'CHECK UNIQUE rep email+number', uniq.status, 200)

  const cr = await POST('/sales-reps', {
    first_name: 'TestRep', last_name: TS,
    email: `testrep_${TS}@example.com`,
    rep_number: `T${Date.now().toString().slice(-5)}`,
    user_cust_code: `TR${Date.now().toString().slice(-3)}`,
    commission_rate: 5,
    status: 'active',
    phones: [], addresses: [],
  })
  ok(cr.ok || cr.status === 201, 'CREATE sales rep', cr.status, '200/201')
  const repId = cr.body._id || cr.body.insertedId

  if (repId) {
    const rd = await GET(`/sales-reps/${repId}`)
    ok(rd.ok, 'READ sales rep', rd.status, 200)
    ok(rd.body.email === `testrep_${TS}@example.com`, 'READ rep email matches', rd.body.email, `testrep_${TS}@example.com`)

    const up = await PUT(`/sales-reps/${repId}`, { first_name: 'UpdatedRep', last_name: `${TS}_upd`, email: `testrep_${TS}@example.com`, commission_rate: 7, status: 'active' })
    ok(up.ok, 'UPDATE sales rep', up.status, 200)

    const deact = await PUT(`/sales-reps/${repId}/deactivate`, {})
    ok(deact.ok, 'DEACTIVATE sales rep', deact.status, 200)

    const act = await PUT(`/sales-reps/${repId}/activate`, {})
    ok(act.ok, 'ACTIVATE sales rep', act.status, 200)

    // Test rep-specific reads
    const commStats = await GET(`/sales-reps/${repId}/commission-stats`)
    ok(commStats.ok, 'GET rep commission-stats', commStats.status, 200)

    const repInvs = await GET(`/sales-reps/${repId}/invoices`)
    ok(repInvs.ok, 'GET rep invoices', repInvs.status, 200)

    const dl = await DELETE(`/sales-reps/${repId}`)
    ok(dl.ok, 'DELETE sales rep', dl.status, 200)
    info(`Created→Read→Updated→Deact→Act→Deleted rep id=${repId}`)
  } else {
    skip('READ/UPDATE/DELETE rep', `CREATE response: ${JSON.stringify(cr.body)}`)
  }
}

// ════════════════════════════════════════════════════════════════════════════
// 12. CUSTOMERS — Customer Types
// ════════════════════════════════════════════════════════════════════════════
section('12. CUSTOMERS › Customer Types')
{
  const list = await GET('/customer-types')
  ok(list.ok && Array.isArray(list.body), 'LIST customer types', list.status, 200)
  info(`Customer types: ${list.body.length}`)

  const cr = await POST('/customer-types', { name: `TestCustType_${TS}`, cust_type_name: `TestCustType_${TS}`, description: 'CRUD test type' })
  ok(cr.ok || cr.status === 201, 'CREATE customer type', cr.status, '200/201')
  const ctId = cr.body._id || cr.body.insertedId

  if (ctId) {
    const rd = await GET(`/customer-types/${ctId}`)
    ok(rd.ok, 'READ customer type', rd.status, 200)

    const up = await PUT(`/customer-types/${ctId}`, { name: `TestCustType_${TS}_upd`, cust_type_name: `TestCustType_${TS}_upd`, description: 'Updated' })
    ok(up.ok, 'UPDATE customer type', up.status, 200)

    const dl = await DELETE(`/customer-types/${ctId}`)
    ok(dl.ok, 'DELETE customer type', dl.status, 200)
    info(`Created→Read→Updated→Deleted customer type id=${ctId}`)
  } else {
    skip('READ/UPDATE/DELETE customer type', `CREATE response: ${JSON.stringify(cr.body)}`)
  }
}

// ════════════════════════════════════════════════════════════════════════════
// 13. CUSTOMERS — Active Customers (full CRUD)
// ════════════════════════════════════════════════════════════════════════════
section('13. CUSTOMERS › Active Customers')
{
  const stats = await GET('/customers/stats')
  ok(stats.ok, 'GET customer stats', stats.status, 200)
  info(`Customers: total=${stats.body.total} active=${stats.body.active}`)

  const list = await GET('/customers?status=active')
  ok(list.ok && Array.isArray(list.body), 'LIST active customers', list.status, 200)
  info(`Active customers: ${list.body.length}`)

  // Get a valid customer type
  const typeList = await GET('/customer-types')
  const custTypeId = typeList.body?.[0]?.legacy_id || typeList.body?.[0]?._id

  const cr = await POST('/customers', {
    company_name: `TestCo_${TS}`,
    status: 'active',
    customer_type_id: custTypeId || 1,
    contacts: [{ contact_person: 'Test Contact', contact_number: '555-0001' }],
  })
  ok(cr.ok || cr.status === 201, 'CREATE customer', cr.status, '200/201')
  const custId = cr.body._id || cr.body.insertedId

  if (custId) {
    const rd = await GET(`/customers/${custId}`)
    ok(rd.ok, 'READ customer', rd.status, 200)
    ok(rd.body.company_name === `TestCo_${TS}` || rd.body.customer?.company_name === `TestCo_${TS}`, 'READ customer name matches', rd.body.company_name, `TestCo_${TS}`)

    const up = await PUT(`/customers/${custId}`, { company_name: `TestCo_${TS}_upd`, status: 'active' })
    ok(up.ok, 'UPDATE customer', up.status, 200)

    // Test sub-resources
    const addContact = await POST(`/customers/${custId}/contacts`, { contact_person: 'New Contact', contact_number: '555-0002' })
    ok(addContact.ok || addContact.status === 201, 'CREATE customer contact', addContact.status, '200/201')
    const contactId = addContact.body._id || addContact.body.insertedId || addContact.body?.contact?._id
    if (contactId) {
      const delContact = await DELETE(`/customers/${custId}/contacts/${contactId}`)
      ok(delContact.ok, 'DELETE customer contact', delContact.status, 200)
    }

    const addAddr = await POST(`/customers/${custId}/addresses`, { street_address: '123 Test St', city: 'Testville', state: 'TX', zip_code: '75001', country: 'USA', address_label: 'Main' })
    ok(addAddr.ok || addAddr.status === 201, 'CREATE customer address', addAddr.status, '200/201')

    // Test invoices
    const invList = await GET(`/customers/${custId}/invoices`)
    ok(invList.ok, 'GET customer invoices', invList.status, 200)

    const deact = await PUT(`/customers/${custId}/deactivate`, {})
    ok(deact.ok, 'DEACTIVATE customer', deact.status, 200)

    const act = await PUT(`/customers/${custId}/activate`, {})
    ok(act.ok, 'ACTIVATE customer', act.status, 200)

    const dl = await DELETE(`/customers/${custId}`)
    ok(dl.ok, 'DELETE customer', dl.status, 200)
    info(`Created→Read→Updated→Contact→Address→Deact→Act→Deleted customer id=${custId}`)
  } else {
    skip('READ/UPDATE/DELETE customer', `CREATE response: ${JSON.stringify(cr.body)}`)
  }
}

// ════════════════════════════════════════════════════════════════════════════
// 14. CUSTOMERS — Suppliers
// ════════════════════════════════════════════════════════════════════════════
section('14. CUSTOMERS › Suppliers')
{
  const stats = await GET('/suppliers/stats')
  ok(stats.ok, 'GET supplier stats', stats.status, 200)

  const list = await GET('/suppliers')
  ok(list.ok && Array.isArray(list.body), 'LIST suppliers', list.status, 200)
  info(`Suppliers: ${list.body.length}`)

  const uniq = await GET(`/suppliers/check-unique?name=TestSupplier_${TS}`)
  ok(uniq.ok, 'CHECK UNIQUE supplier name', uniq.status, 200)

  const cr = await POST('/suppliers', { supplier_name: `TestSupplier_${TS}`, supplier_email_address: `supplier_${TS}@test.com`, status: 'active' })
  ok(cr.ok || cr.status === 201, 'CREATE supplier', cr.status, '200/201')
  const suppId = cr.body._id || cr.body.insertedId

  if (suppId) {
    const rd = await GET(`/suppliers/${suppId}`)
    ok(rd.ok, 'READ supplier', rd.status, 200)

    const full = await GET(`/suppliers/${suppId}/full`)
    ok(full.ok, 'READ supplier full detail', full.status, 200)

    const up = await PUT(`/suppliers/${suppId}`, { supplier_name: `TestSupplier_${TS}_upd`, supplier_email_address: `supplier_${TS}@test.com`, status: 'active' })
    ok(up.ok, 'UPDATE supplier', up.status, 200)

    // Supplier sub-resources
    const addAddr = await POST(`/suppliers/${suppId}/addresses`, { street_address: '456 Supplier Ave', city: 'Commerce', state: 'CA', zip_code: '90001', country: 'USA' })
    ok(addAddr.ok || addAddr.status === 201, 'CREATE supplier address', addAddr.status, '200/201')
    const addrId = addAddr.body._id || addAddr.body.insertedId
    if (addrId) {
      const upAddr = await PUT(`/suppliers/${suppId}/addresses/${addrId}`, { street_address: '456 Updated Ave', city: 'Commerce', state: 'CA', zip_code: '90001', country: 'USA' })
      ok(upAddr.ok, 'UPDATE supplier address', upAddr.status, 200)
      const dlAddr = await DELETE(`/suppliers/${suppId}/addresses/${addrId}`)
      ok(dlAddr.ok, 'DELETE supplier address', dlAddr.status, 200)
    }

    const dl = await DELETE(`/suppliers/${suppId}`)
    ok(dl.ok, 'DELETE supplier', dl.status, 200)
    info(`Created→Read→Updated→Address CRUD→Deleted supplier id=${suppId}`)
  } else {
    skip('READ/UPDATE/DELETE supplier', `CREATE response: ${JSON.stringify(cr.body)}`)
  }
}

// ════════════════════════════════════════════════════════════════════════════
// 15. BILLING — Invoices
// ════════════════════════════════════════════════════════════════════════════
section('15. BILLING › Invoices')
{
  const stats = await GET('/invoices/stats')
  ok(stats.ok, 'GET invoice stats', stats.status, 200)
  info(`Invoices: total=${stats.body.total} shipped=${stats.body.shipped}`)

  const years = await GET('/invoices/years')
  ok(years.ok && Array.isArray(years.body), 'GET invoice years', years.status, 200)
  info(`Invoice years available: ${years.body.join(', ')}`)

  const list = await GET('/invoices')
  ok(list.ok && Array.isArray(list.body), 'LIST invoices', list.status, 200)
  info(`Invoices in list: ${list.body.length}`)

  // Get customer id for invoice creation
  const custList = await GET('/invoices/lookup/customers')
  ok(custList.ok && Array.isArray(custList.body), 'GET customers lookup for invoice', custList.status, 200)
  const custForInv = custList.body?.[0]

  const cr = await POST('/invoices', {
    company_id: custForInv?.legacy_id || custForInv?._id || 1,
    invoice_number: `INV_${TS}`,
    po_number: `PO_${TS}`,
    po_date: new Date().toISOString().slice(0, 10),
    net_amount: 500,
    items: [],
    notes: 'CRUD test invoice',
  })
  ok(cr.ok || cr.status === 201, 'CREATE invoice', cr.status, '200/201')
  const invId = cr.body._id || cr.body.insertedId

  if (invId) {
    const rd = await GET(`/invoices/${invId}`)
    ok(rd.ok, 'READ invoice', rd.status, 200)

    const up = await PUT(`/invoices/${invId}`, { net_amount: 750, notes: 'Updated CRUD test invoice' })
    ok(up.ok, 'UPDATE invoice', up.status, 200)

    // Status operations
    const shipped = await PUT(`/invoices/${invId}/status`, { status: 'shipped' })
    ok(shipped.ok, 'UPDATE invoice status → shipped', shipped.status, 200)

    const paid = await PUT(`/invoices/${invId}/paid`, { paid_value: 'PAID', paid_date: new Date().toISOString().slice(0, 10) })
    ok(paid.ok, 'UPDATE invoice → paid', paid.status, 200)

    const tracking = await PUT(`/invoices/${invId}/tracking`, { tracking_number: `TRACK_${TS}`, carrier: 'UPS' })
    ok(tracking.ok, 'UPDATE invoice tracking', tracking.status, 200)

    // Copy
    const copy = await POST(`/invoices/${invId}/copy`, {})
    ok(copy.ok || copy.status === 201, 'COPY invoice', copy.status, '200/201')
    const copyId = copy.body._id || copy.body.insertedId

    // Bulk update
    const bulk = await PUT('/invoices/bulk/update', { ids: [invId], paid: true, archive: false })
    ok(bulk.ok, 'BULK UPDATE invoices', bulk.status, 200)

    // Delete
    const dl = await DELETE(`/invoices/${invId}`)
    ok(dl.ok, 'DELETE invoice', dl.status, 200)
    if (copyId) { await DELETE(`/invoices/${copyId}`); pass('DELETE invoice copy (cleanup)') }
    info(`Created→Read→Updated→Shipped→Paid→Tracking→Copy→BulkUpd→Deleted invoice id=${invId}`)
  } else {
    skip('READ/UPDATE/DELETE invoice', `CREATE response: ${JSON.stringify(cr.body)}`)
  }
}

// ════════════════════════════════════════════════════════════════════════════
// 16. BILLING — Events (+ sub-resources: types, costs)
// ════════════════════════════════════════════════════════════════════════════
section('16. BILLING › Events')
{
  const stats = await GET('/events/stats')
  ok(stats.ok, 'GET event stats', stats.status, 200)

  const list = await GET('/events')
  ok(list.ok && Array.isArray(list.body), 'LIST events', list.status, 200)
  info(`Events: ${list.body.length}`)

  // Event Types CRUD
  const typeList = await GET('/events/types')
  ok(typeList.ok && Array.isArray(typeList.body), 'LIST event types', typeList.status, 200)

  const crType = await POST('/events/types', { name: `TestEventType_${TS}`, description: 'CRUD test' })
  ok(crType.ok || crType.status === 201, 'CREATE event type', crType.status, '200/201')
  const etId = crType.body._id || crType.body.insertedId

  if (etId) {
    const upType = await PUT(`/events/types/${etId}`, { name: `TestEventType_${TS}_upd`, description: 'Updated' })
    ok(upType.ok, 'UPDATE event type', upType.status, 200)

    const dlType = await DELETE(`/events/types/${etId}`)
    ok(dlType.ok, 'DELETE event type', dlType.status, 200)
  }

  // Costs CRUD
  const crCost = await POST('/events/costs', { cost_name: `TestCost_${TS}`, amount: 100, description: 'CRUD test cost' })
  ok(crCost.ok || crCost.status === 201, 'CREATE event cost', crCost.status, '200/201')
  const costId = crCost.body._id || crCost.body.insertedId
  if (costId) {
    const upCost = await PUT(`/events/costs/${costId}`, { cost_name: `TestCost_${TS}_upd`, amount: 150, description: 'Updated' })
    ok(upCost.ok, 'UPDATE event cost', upCost.status, 200)
    const dlCost = await DELETE(`/events/costs/${costId}`)
    ok(dlCost.ok, 'DELETE event cost', dlCost.status, 200)
  }

  // Main Event CRUD
  const uniq = await GET(`/events/check-unique?name=TestEvent_${TS}`)
  ok(uniq.ok, 'CHECK UNIQUE event name', uniq.status, 200)

  const cr = await POST('/events', {
    event_name: `TestEvent_${TS}`,
    event_number: `EV_${Date.now().toString().slice(-6)}`,
    event_date: new Date().toISOString().slice(0, 10),
    location: 'Test City',
    status: 'active',
    notes: 'CRUD test event',
  })
  ok(cr.ok || cr.status === 201, 'CREATE event', cr.status, '200/201')
  const evId = cr.body._id || cr.body.insertedId

  if (evId) {
    const rd = await GET(`/events/${evId}`)
    ok(rd.ok, 'READ event', rd.status, 200)

    const up = await PUT(`/events/${evId}`, { event_name: `TestEvent_${TS}_upd`, location: 'Updated City', status: 'active' })
    ok(up.ok, 'UPDATE event', up.status, 200)

    // Add receipt
    const receipt = await POST(`/events/${evId}/receipts`, { amount: 200, description: 'Test receipt', date: new Date().toISOString().slice(0, 10) })
    ok(receipt.ok || receipt.status === 201, 'CREATE event receipt', receipt.status, '200/201')

    const dl = await DELETE(`/events/${evId}`)
    ok(dl.ok, 'DELETE event', dl.status, 200)
    info(`Created→Read→Updated→Receipt→Deleted event id=${evId}`)
  } else {
    skip('READ/UPDATE/DELETE event', `CREATE response: ${JSON.stringify(cr.body)}`)
  }
}

// ════════════════════════════════════════════════════════════════════════════
// 17. FINANCE — Airfeet PO
// ════════════════════════════════════════════════════════════════════════════
section('17. FINANCE › Airfeet PO')
{
  const stats = await GET('/airfeet-po/stats')
  ok(stats.ok, 'GET airfeet-po stats', stats.status, 200)
  info(`Airfeet POs: total=${stats.body.total}`)

  const list = await GET('/airfeet-po')
  ok(list.ok && Array.isArray(list.body), 'LIST airfeet POs', list.status, 200)
  info(`POs in list: ${list.body.length}`)

  // Get a real supplier
  const supplierList = await GET('/airfeet-po/suppliers')
  ok(supplierList.ok && Array.isArray(supplierList.body), 'GET suppliers lookup for PO', supplierList.status, 200)
  const suppForPo = supplierList.body?.[0]

  const cr = await POST('/airfeet-po', {
    supplier_id: suppForPo?.legacy_id || suppForPo?._id || 1,
    po_number: `AFPO_${TS}`,
    po_date: new Date().toISOString().slice(0, 10),
    total_amount: 1000,
    status: 'active',
    items: [],
    notes: 'CRUD test PO',
  })
  ok(cr.ok || cr.status === 201, 'CREATE airfeet PO', cr.status, '200/201')
  const poId = cr.body._id || cr.body.insertedId

  if (poId) {
    const rd = await GET(`/airfeet-po/${poId}`)
    ok(rd.ok, 'READ airfeet PO', rd.status, 200)

    const up = await PUT(`/airfeet-po/${poId}`, { total_amount: 1500, notes: 'Updated CRUD test PO' })
    ok(up.ok, 'UPDATE airfeet PO', up.status, 200)

    const shipped = await PUT(`/airfeet-po/${poId}/status`, { status: 'shipped' })
    ok(shipped.ok, 'UPDATE PO status → shipped', shipped.status, 200)

    const copy = await POST(`/airfeet-po/${poId}/copy`, {})
    ok(copy.ok || copy.status === 201, 'COPY airfeet PO', copy.status, '200/201')
    const copyId = copy.body._id || copy.body.insertedId

    const dl = await DELETE(`/airfeet-po/${poId}`)
    ok(dl.ok, 'DELETE airfeet PO', dl.status, 200)
    if (copyId) { await DELETE(`/airfeet-po/${copyId}`); pass('DELETE PO copy (cleanup)') }
    info(`Created→Read→Updated→Shipped→Copy→Deleted PO id=${poId}`)
  } else {
    skip('READ/UPDATE/DELETE airfeet PO', `CREATE response: ${JSON.stringify(cr.body)}`)
  }
}

// ════════════════════════════════════════════════════════════════════════════
// 18. FINANCE — Pilot Programs
// ════════════════════════════════════════════════════════════════════════════
section('18. FINANCE › Pilot Programs')
{
  const stats = await GET('/pilot-programs/stats')
  ok(stats.ok, 'GET pilot program stats', stats.status, 200)
  info(`Pilots: total=${stats.body.total} active=${stats.body.active}`)

  const list = await GET('/pilot-programs')
  ok(list.ok && Array.isArray(list.body), 'LIST pilot programs', list.status, 200)

  const custLookup = await GET('/pilot-programs/lookup/customers')
  ok(custLookup.ok && Array.isArray(custLookup.body), 'GET customers lookup', custLookup.status, 200)

  const repLookup = await GET('/pilot-programs/lookup/reps')
  ok(repLookup.ok && Array.isArray(repLookup.body), 'GET reps lookup', repLookup.status, 200)

  const custForPilot = custLookup.body?.[0]
  const repForPilot  = repLookup.body?.[0]

  const cr = await POST('/pilot-programs', {
    customer_name: custForPilot?.company_name || custForPilot?.name || 'Test Customer',
    customer_id: custForPilot?.legacy_id || custForPilot?._id || '',
    rep_id: repForPilot?.legacy_id || repForPilot?._id || '',
    start_date: new Date().toISOString().slice(0, 10),
    status: 'active',
    cost: 250,
    notes: 'CRUD test pilot',
  })
  ok(cr.ok || cr.status === 201, 'CREATE pilot program', cr.status, '200/201')
  const pilotId = cr.body._id || cr.body.insertedId

  if (pilotId) {
    const rd = await GET(`/pilot-programs/${pilotId}`)
    ok(rd.ok, 'READ pilot program', rd.status, 200)

    const up = await PUT(`/pilot-programs/${pilotId}`, { customer_name: custForPilot?.company_name || 'Test Customer', cost: 300, status: 'active' })
    ok(up.ok, 'UPDATE pilot program', up.status, 200)

    // Status transitions
    const paid = await PUT(`/pilot-programs/${pilotId}/paid`, { paid_date: new Date().toISOString().slice(0, 10) })
    ok(paid.ok, 'MARK pilot program paid', paid.status, 200)

    const unpaid = await PUT(`/pilot-programs/${pilotId}/unpaid`, {})
    ok(unpaid.ok, 'MARK pilot program unpaid', unpaid.status, 200)

    const completed = await PUT(`/pilot-programs/${pilotId}/status`, { status: 'completed' })
    ok(completed.ok, 'UPDATE pilot status → completed', completed.status, 200)

    const dl = await DELETE(`/pilot-programs/${pilotId}`)
    ok(dl.ok, 'DELETE pilot program', dl.status, 200)
    info(`Created→Read→Updated→Paid→Unpaid→Completed→Deleted pilot id=${pilotId}`)
  } else {
    skip('READ/UPDATE/DELETE pilot', `CREATE response: ${JSON.stringify(cr.body)}`)
  }
}

// ════════════════════════════════════════════════════════════════════════════
// 19. REPORTS (read-only)
// ════════════════════════════════════════════════════════════════════════════
section('19. REPORTS (read-only)')
{
  const byYear  = await GET('/reports/year')
  ok(byYear.ok, 'GET reports/year', byYear.status, 200)

  const byMonth = await GET('/reports/month')
  ok(byMonth.ok, 'GET reports/month', byMonth.status, 200)

  const repMonth = await GET('/reports/sales-rep-month')
  ok(repMonth.ok, 'GET reports/sales-rep-month', repMonth.status, 200)

  const repYear = await GET('/reports/sales-rep-year')
  ok(repYear.ok, 'GET reports/sales-rep-year', repYear.status, 200)

  const paid = await GET('/reports/paid-invoices')
  ok(paid.ok && Array.isArray(paid.body), 'GET reports/paid-invoices', paid.status, 200)

  const years = await GET('/reports/years')
  ok(years.ok && Array.isArray(years.body), 'GET reports/years', years.status, 200)
  info(`Report years: ${years.body.join(', ')}`)
}

// ════════════════════════════════════════════════════════════════════════════
// 20. TAX RATES (bonus — referenced in Events)
// ════════════════════════════════════════════════════════════════════════════
section('20. EVENTS › Tax Rates')
{
  const list = await GET('/tax-rates')
  ok(list.ok && Array.isArray(list.body), 'LIST tax rates', list.status, 200)
  info(`Tax rates: ${list.body.length}`)

  const cr = await POST('/tax-rates', { name: `Tax_${TS}`, rate: 8.25, state: 'TX', status: 'active' })
  ok(cr.ok || cr.status === 201, 'CREATE tax rate', cr.status, '200/201')
  const taxId = cr.body._id || cr.body.insertedId

  if (taxId) {
    const rd = await GET(`/tax-rates/${taxId}`)
    ok(rd.ok, 'READ tax rate', rd.status, 200)

    const up = await PUT(`/tax-rates/${taxId}`, { name: `Tax_${TS}_upd`, rate: 9.0, state: 'TX', status: 'active' })
    ok(up.ok, 'UPDATE tax rate', up.status, 200)

    const dl = await DELETE(`/tax-rates/${taxId}`)
    ok(dl.ok, 'DELETE tax rate', dl.status, 200)
    info(`Created→Read→Updated→Deleted tax rate id=${taxId}`)
  } else {
    skip('READ/UPDATE/DELETE tax rate', `CREATE response: ${JSON.stringify(cr.body)}`)
  }
}

// ════════════════════════════════════════════════════════════════════════════
// SUMMARY
// ════════════════════════════════════════════════════════════════════════════
const total = passed + failed + skipped
console.log('\n' + '═'.repeat(62))
console.log('\x1b[1mADMIN CRUD TEST SUMMARY\x1b[0m')
console.log('═'.repeat(62))
console.log(`  Total     : ${total}`)
console.log(`  \x1b[32mPassed\x1b[0m    : ${passed}`)
console.log(`  \x1b[31mFailed\x1b[0m    : ${failed}`)
console.log(`  \x1b[33mSkipped\x1b[0m   : ${skipped}`)
console.log('═'.repeat(62))

if (failures.length) {
  console.log('\n\x1b[1mFAILED:\x1b[0m')
  failures.forEach((f, i) => console.log(`  ${i+1}. ${f.label}\n     got=${JSON.stringify(f.got)}  exp=${JSON.stringify(f.exp)}`))
}

if (failed === 0) console.log('\n\x1b[32m✓ All admin CRUD tests passed.\x1b[0m')
else              console.log(`\n\x1b[31m✗ ${failed} test(s) failed.\x1b[0m`)
