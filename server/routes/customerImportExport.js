import { Router } from 'express'
import mongoose from 'mongoose'
import multer from 'multer'
import XLSX from 'xlsx'

const router = Router()
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } })
const col = () => mongoose.connection.db.collection('customers')
const typesCol = () => mongoose.connection.db.collection('customer_types')
const addrCol = () => mongoose.connection.db.collection('cust_addresses')

// POST import customers from Excel/CSV
router.post('/import', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' })

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' })
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' })

    if (!rows.length) return res.status(400).json({ error: 'File is empty or has no data rows' })

    // Map header names to MongoDB fields
    const fieldMap = {
      'company_name': 'company_name',
      'Company Name': 'company_name',
      'customer_type': 'customer_type',
      'Customer Type': 'customer_type',
      'company_contact': 'contact_name',
      'Company Contact': 'contact_name',
      'company_email_address': 'email',
      'Email': 'email',
      'email': 'email',
      'company_cust_code': 'customer_code',
      'Customer Code': 'customer_code',
      'customer_notes': 'notes',
      'Notes': 'notes',
      'cust_terms': 'terms',
      'Terms': 'terms',
      'customer_FOB': 'fob',
      'FOB': 'fob',
      'cust_ship': 'ship',
      'Ship': 'ship',
      'cust_ship_via': 'ship_via',
      'Ship Via': 'ship_via',
      'cust_project': 'project',
      'Project': 'project',
      'company_phone': 'phone',
      'Phone': 'phone',
      'street_address': 'address',
      'Address': 'address',
      'city': 'city',
      'City': 'city',
      'state': 'state',
      'State': 'state',
      'country': 'country',
      'Country': 'country',
      'zip_code': 'zip',
      'Zip Code': 'zip',
      'shipping_acnt': 'shipping_acnt',
      'address_label': 'address_label',
      'contact_title': 'contact_title',
      'contact_person': 'contact_person',
      'contact_position': 'contact_position',
      'main_phone': 'main_phone',
      'desk_phone': 'desk_phone',
      'mobile_phone': 'mobile_phone',
      'contact_email': 'contact_email',
    }

    let imported = 0
    let updated = 0
    let skipped = 0

    for (const row of rows) {
      // Map row fields
      const mapped = {}
      for (const [key, value] of Object.entries(row)) {
        const field = fieldMap[key.trim()]
        if (field) mapped[field] = String(value).trim()
      }

      if (!mapped.company_name) { skipped++; continue }

      // Slugify customer_type if it looks like a name
      if (mapped.customer_type && !mapped.customer_type.match(/^[a-z0-9_]+$/)) {
        mapped.customer_type = mapped.customer_type.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
      }

      // Build address object
      const address = {}
      if (mapped.address) address.street_address = mapped.address
      if (mapped.city) address.city = mapped.city
      if (mapped.state) address.state = mapped.state
      if (mapped.zip) address.zip_code = mapped.zip
      if (mapped.country) address.country = mapped.country
      if (mapped.shipping_acnt) address.shipping_acnt = mapped.shipping_acnt
      if (mapped.address_label) address.address_label = mapped.address_label
      delete mapped.address; delete mapped.city; delete mapped.state
      delete mapped.zip; delete mapped.country
      delete mapped.shipping_acnt; delete mapped.address_label

      // Build contact object
      const contact = {}
      if (mapped.contact_title) contact.contact_title = mapped.contact_title
      if (mapped.contact_person) contact.contact_person = mapped.contact_person
      if (mapped.contact_position) contact.contact_position = mapped.contact_position
      if (mapped.main_phone) contact.main_phone = mapped.main_phone
      if (mapped.desk_phone) contact.desk_phone = mapped.desk_phone || mapped.main_phone
      if (mapped.mobile_phone) contact.mobile_phone = mapped.mobile_phone || mapped.main_phone
      if (mapped.contact_email) contact.contact_email = mapped.contact_email
      delete mapped.contact_title; delete mapped.contact_person; delete mapped.contact_position
      delete mapped.main_phone; delete mapped.desk_phone; delete mapped.mobile_phone; delete mapped.contact_email

      // Check if customer exists by customer_code
      let customerId = null
      if (mapped.customer_code) {
        const existing = await col().findOne({ customer_code: mapped.customer_code })
        if (existing) {
          customerId = existing._id
          await col().updateOne({ _id: existing._id }, { $set: { ...mapped, updated_at: new Date() } })

          // Update or insert address
          if (Object.keys(address).length > 0) {
            const existingAddr = await addrCol().findOne({ company_id: existing.legacy_id, address_type: 'address_0' })
            if (existingAddr) {
              await addrCol().updateOne({ _id: existingAddr._id }, { $set: address })
            } else {
              await addrCol().insertOne({ ...address, company_id: existing.legacy_id, address_type: 'address_0', status: 1, created_at: new Date() })
            }
          }

          // Update or insert contact
          if (contact.contact_person) {
            const contactCol = mongoose.connection.db.collection('customer_contacts')
            const existingContact = await contactCol.findOne({ company_id: existing.legacy_id, contact_type: 'contact_1' })
            if (existingContact) {
              await contactCol.updateOne({ _id: existingContact._id }, { $set: contact })
            } else {
              await contactCol.insertOne({ ...contact, company_id: existing.legacy_id, contact_type: 'contact_1', status: 1, created_at: new Date() })
            }
          }

          updated++
          continue
        }
      }

      // Insert new customer
      const doc = {
        ...mapped,
        status: 'active',
        created_at: new Date(),
        updated_at: new Date(),
      }
      const result = await col().insertOne(doc)
      customerId = result.insertedId

      // Insert address into cust_addresses
      if (Object.keys(address).length > 0) {
        await addrCol().insertOne({
          ...address,
          company_id: null,
          customer: customerId,
          address_type: 'address_0',
          status: 1,
          created_at: new Date(),
        })
      }

      // Insert contact into customer_contacts
      if (contact.contact_person) {
        const contactCol = mongoose.connection.db.collection('customer_contacts')
        await contactCol.insertOne({
          ...contact,
          company_id: null,
          customer: customerId,
          contact_type: 'contact_1',
          status: 1,
          created_at: new Date(),
        })
      }

      imported++
    }

    res.json({
      success: true,
      message: `Import complete: ${imported} new, ${updated} updated, ${skipped} skipped`,
      imported,
      updated,
      skipped,
      total: rows.length
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET export customers as CSV
router.get('/export', async (req, res) => {
  try {
    const customers = await col().find({}).sort({ company_name: 1 }).toArray()
    const types = await typesCol().find({}).toArray()
    const typeMap = Object.fromEntries(types.map(t => [t.code, t.name]))

    // Fetch all addresses and build lookup by company_id (legacy_id)
    const allAddresses = await addrCol().find({}).toArray()
    const addrMap = {}
    for (const a of allAddresses) {
      const key = a.company_id
      if (key && !addrMap[key]) addrMap[key] = a
    }

    const rows = customers.map(c => {
      const addr = addrMap[c.legacy_id] || {}
      return {
        'Company Name': c.company_name || '',
        'Customer Type': typeMap[c.customer_type] || c.customer_type || '',
        'Company Contact': c.contact_name || '',
        'Email': c.email || '',
        'Customer Code': c.customer_code || '',
        'Notes': c.notes || '',
        'Terms': c.terms || '',
        'FOB': c.fob || '',
        'Ship': c.ship || '',
        'Ship Via': c.ship_via || '',
        'Project': c.project || '',
        'Phone': c.phone || '',
        'Address': addr.street_address || '',
        'City': addr.city || '',
        'State': addr.state || '',
        'Country': addr.country || '',
        'Zip Code': addr.zip_code || '',
      }
    })

    const worksheet = XLSX.utils.json_to_sheet(rows)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Customers')
    const csvBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'csv' })

    const filename = `customers_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}.csv`
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.send(csvBuffer)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET sample template with sample data (matches old PHP template)
router.get('/template', (req, res) => {
  const headers = [
    'company_name', 'customer_type', 'company_contact', 'company_phone',
    'company_email_address', 'company_cust_code', 'customer_notes',
    'cust_terms', 'customer_FOB', 'cust_ship', 'cust_ship_via', 'cust_project',
    'street_address', 'state', 'city', 'zip_code', 'country',
    'shipping_acnt', 'address_label',
    'contact_title', 'contact_person', 'contact_position',
    'main_phone', 'desk_phone', 'mobile_phone', 'contact_email'
  ]
  const sampleRow = [
    'Stallioni Net Solutions', 'retail_store', 'kesav', '(444) 555-6767',
    'kesav@stallioni.in', 'SNS-001', 'Test Notes',
    'NET30, 2%Net15', '', '', '', '',
    '100 Detroit St', 'MI', 'Detroit', '86421', 'US',
    'FEDEX 12344321', 'Billing Address',
    'mr', 'kesavan', 'Sales',
    '(987) 654-1258', '', '', 'kesavan@stallioni.in'
  ]
  const worksheet = XLSX.utils.aoa_to_sheet([headers, sampleRow])

  // Set column widths for readability
  worksheet['!cols'] = headers.map(h => ({ wch: Math.max(h.length + 2, 15) }))

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Template')
  const buf = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })

  res.setHeader('Content-Disposition', 'attachment; filename="customer_import_template.xlsx"')
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  res.send(buf)
})

export default router
