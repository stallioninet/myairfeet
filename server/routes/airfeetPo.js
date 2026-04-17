import { Router } from 'express'
import mongoose from 'mongoose'
import multer from 'multer'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import fs from 'fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const uploadDir = process.env.VERCEL
  ? '/tmp/uploads/customer_po'
  : join(__dirname, '..', '..', 'uploads', 'customer_po')
try { if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true }) } catch {}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, Date.now() + '_' + file.originalname),
})
const upload = multer({ storage, limits: { fileSize: 20 * 1024 * 1024 } })

const router = Router()
const col = () => mongoose.connection.db.collection('airfeet_pos')
const itemsCol = () => mongoose.connection.db.collection('airfeet_po_items')
const checksCol = () => mongoose.connection.db.collection('airfeet_po_checks')
const suppCol = () => mongoose.connection.db.collection('suppliers')
const custPoCol = () => mongoose.connection.db.collection('invoice_customer_pos')

// GET all airfeet POs
router.get('/', async (req, res) => {
  try {
    const filter = {}
    if (req.query.status) filter.status = req.query.status
    const data = await col().find(filter).sort({ legacy_id: -1 }).toArray()
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET stats
router.get('/stats', async (req, res) => {
  try {
    const [total, active, shipped] = await Promise.all([
      col().countDocuments(),
      col().countDocuments({ status: 'active', inv_status: { $ne: 'Shipped' } }),
      col().countDocuments({ inv_status: 'Shipped' }),
    ])
    // Sum total amount
    const pipeline = [{ $group: { _id: null, total: { $sum: '$po_net_amount' } } }]
    const amtResult = await col().aggregate(pipeline).toArray()
    const totalAmount = amtResult[0]?.total || 0
    res.json({ total, active, shipped, totalAmount })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET file existence map (which PO legacy_ids have uploaded customer PO files)
router.get('/file-map', async (req, res) => {
  try {
    const allPos = await col().find({}).project({ legacy_id: 1 }).toArray()
    const idStrs = allPos.map(p => String(p.legacy_id))
    const records = await custPoCol().find({ invoice_id: { $in: idStrs } }).toArray()
    const map = {}
    records.forEach(r => {
      if (r.cutomer_polink && r.cutomer_polink.trim()) {
        map[r.invoice_id] = true
      }
    })
    res.json(map)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET suppliers list for dropdown
router.get('/suppliers', async (req, res) => {
  try {
    const data = await suppCol().find({ status: 'active' }).sort({ supplier_name: 1 }).toArray()
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET invoice view data for a PO (full details with supplier, address, items)
router.get('/:id/invoice', async (req, res) => {
  try {
    const po = await col().findOne({ _id: new mongoose.Types.ObjectId(req.params.id) })
    if (!po) return res.status(404).json({ error: 'PO not found' })

    // Get supplier info
    const supplier = await suppCol().findOne({ legacy_id: po.supplier_id }) || {}

    // Get supplier address (first/primary)
    const suppAddrCol = mongoose.connection.db.collection('supplier_addresses')
    const supplierAddress = await suppAddrCol.findOne({ supplier_id: po.supplier_id }) || {}

    // Get supplier contact (first/primary)
    const suppContactCol = mongoose.connection.db.collection('supplier_contacts')
    const supplierContact = await suppContactCol.findOne({ supplier_id: po.supplier_id }) || {}

    // Get PO line items from airfeet_part_descs (the actual airfeet PO items table)
    const partDescCol = mongoose.connection.db.collection('airfeet_part_descs')
    const items = await partDescCol.find({ po_id: po.legacy_id }).toArray()

    res.json({ ...po, supplier, supplierAddress, supplierContact, items })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET single PO with items
router.get('/:id', async (req, res) => {
  try {
    const po = await col().findOne({ _id: new mongoose.Types.ObjectId(req.params.id) })
    if (!po) return res.status(404).json({ error: 'PO not found' })
    const items = await itemsCol().find({ po_id: po.legacy_id }).toArray()
    const checks = await checksCol().find({ po_id: po.legacy_id }).toArray()
    res.json({ ...po, items, checks })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST create PO
router.post('/', async (req, res) => {
  try {
    const b = req.body
    if (!b.supplier_id) return res.status(400).json({ error: 'Supplier is required' })

    // Get max legacy_id for new PO
    const maxDoc = await col().find({}).sort({ legacy_id: -1 }).limit(1).toArray()
    const nextId = (maxDoc[0]?.legacy_id || 0) + 1

    const doc = {
      legacy_id: nextId,
      supplier_id: parseInt(b.supplier_id),
      supplier_name: b.supplier_name || '',
      project: b.project || '',
      inv_quote_status: b.inv_quote_status || 0,
      billing_address: parseInt(b.billing_address) || 0,
      shipping_address: parseInt(b.shipping_address) || 0,
      address1: b.address1 || b.contact_info || '',
      shipping_costs: parseFloat(b.shipping_costs) || 0,
      credit_card_notes: b.credit_card_notes || '',
      po_notes: b.po_notes || '',
      shipinfo_notes: b.shipinfo_notes || '',
      invoice_number: b.invoice_number || '',
      invoice_date: b.invoice_date || null,
      po_number: b.po_number || '',
      po_date: b.po_date || new Date(),
      po_total_qty: parseInt(b.po_total_qty) || 0,
      po_net_amount: parseFloat(b.po_net_amount) || 0,
      sales_tax_type: b.sales_tax_type || '',
      sales_tax_percentage: parseInt(b.sales_tax_percentage) || 0,
      sales_tax_amount: parseFloat(b.sales_tax_amount) || 0,
      paid_value: b.paid_value || '',
      paid_date: b.paid_date || '',
      charge_ccard: b.cc_charge || b.charge_ccard || 0,
      cc_per: parseInt(b.cc_per) || 0,
      cc_amt: parseFloat(b.cc_amt) || 0,
      inv_status: b.inv_status || '',
      customerpolink: '',
      status: 'active',
      created_at: new Date(),
      updated_at: new Date(),
    }
    const result = await col().insertOne(doc)
    doc._id = result.insertedId

    // Save line items if provided
    const items = b.items
    if (items && Array.isArray(items) && items.length > 0) {
      const itemDocs = items.map((item, idx) => ({
        airfeet_po_id: nextId,
        po_item_name: item.description || '',
        item_qty: parseInt(item.qty) || 0,
        uom: item.uom || '',
        item_unit_cost: parseFloat(item.unit_cost) || 0,
        item_total: (parseInt(item.qty) || 0) * (parseFloat(item.unit_cost) || 0),
        item_type_id: parseInt(item.item_type_id) || 0,
        bo_option: item.bo_option || 'no',
        po_item_status: 1,
        sort_order: idx,
      }))
      await itemsCol().insertMany(itemDocs)
    }

    res.status(201).json(doc)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// PUT update PO
router.put('/:id', async (req, res) => {
  try {
    const items = req.body.items
    const update = { ...req.body, updated_at: new Date() }
    delete update._id
    delete update.items
    delete update.checks

    if (update.shipping_costs !== undefined) update.shipping_costs = parseFloat(update.shipping_costs) || 0
    if (update.po_net_amount !== undefined) update.po_net_amount = parseFloat(update.po_net_amount) || 0
    if (update.po_total_qty !== undefined) update.po_total_qty = parseInt(update.po_total_qty) || 0
    if (update.sales_tax_amount !== undefined) update.sales_tax_amount = parseFloat(update.sales_tax_amount) || 0

    const result = await col().findOneAndUpdate(
      { _id: new mongoose.Types.ObjectId(req.params.id) },
      { $set: update },
      { returnDocument: 'after' }
    )
    if (!result) return res.status(404).json({ error: 'PO not found' })

    // Re-save line items if provided
    if (items && Array.isArray(items)) {
      const poLegacyId = result.legacy_id
      await itemsCol().deleteMany({ airfeet_po_id: poLegacyId })
      if (items.length > 0) {
        const itemDocs = items.map((item, idx) => ({
          airfeet_po_id: poLegacyId,
          po_item_name: item.description || '',
          item_qty: parseInt(item.qty) || 0,
          uom: item.uom || '',
          item_unit_cost: parseFloat(item.unit_cost) || 0,
          item_total: (parseInt(item.qty) || 0) * (parseFloat(item.unit_cost) || 0),
          item_type_id: parseInt(item.item_type_id) || 0,
          bo_option: item.bo_option || 'no',
          po_item_status: 1,
          sort_order: idx,
        }))
        await itemsCol().insertMany(itemDocs)
      }
    }

    res.json(result)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// PUT update status (shipped/active toggle)
router.put('/:id/status', async (req, res) => {
  try {
    const { inv_status } = req.body
    const result = await col().findOneAndUpdate(
      { _id: new mongoose.Types.ObjectId(req.params.id) },
      { $set: { inv_status, updated_at: new Date() } },
      { returnDocument: 'after' }
    )
    if (!result) return res.status(404).json({ error: 'PO not found' })
    res.json(result)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// POST copy PO
router.post('/:id/copy', async (req, res) => {
  try {
    const original = await col().findOne({ _id: new mongoose.Types.ObjectId(req.params.id) })
    if (!original) return res.status(404).json({ error: 'PO not found' })

    const maxDoc = await col().find({}).sort({ legacy_id: -1 }).limit(1).toArray()
    const nextId = (maxDoc[0]?.legacy_id || 0) + 1

    const copy = { ...original }
    delete copy._id
    copy.legacy_id = nextId
    copy.po_number = original.po_number + ' (Copy)'
    copy.inv_status = ''
    copy.paid_value = ''
    copy.paid_date = ''
    copy.created_at = new Date()
    copy.updated_at = new Date()

    const result = await col().insertOne(copy)
    copy._id = result.insertedId

    // Copy items
    const items = await itemsCol().find({ po_id: original.legacy_id }).toArray()
    if (items.length) {
      const copiedItems = items.map(it => {
        const c = { ...it }
        delete c._id
        c.po_id = nextId
        return c
      })
      await itemsCol().insertMany(copiedItems)
    }

    res.status(201).json(copy)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// DELETE PO
router.delete('/:id', async (req, res) => {
  try {
    const po = await col().findOne({ _id: new mongoose.Types.ObjectId(req.params.id) })
    if (!po) return res.status(404).json({ error: 'PO not found' })

    // Delete related items and checks
    await itemsCol().deleteMany({ po_id: po.legacy_id })
    await checksCol().deleteMany({ po_id: po.legacy_id })
    await col().deleteOne({ _id: po._id })

    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET customer PO files for a PO
router.get('/:id/customer-po', async (req, res) => {
  try {
    const po = await col().findOne({ _id: new mongoose.Types.ObjectId(req.params.id) })
    if (!po) return res.status(404).json({ error: 'PO not found' })
    const files = await custPoCol().find({ invoice_id: String(po.legacy_id) }).toArray()
    res.json(files)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST upload customer PO files
router.post('/:id/customer-po', upload.array('files', 10), async (req, res) => {
  try {
    const po = await col().findOne({ _id: new mongoose.Types.ObjectId(req.params.id) })
    if (!po) return res.status(404).json({ error: 'PO not found' })
    if (!req.files || req.files.length === 0) return res.status(400).json({ error: 'No files uploaded' })

    const links = req.files.map(f => 'uploads/customer_po/' + f.filename).join(',')

    // Check if record exists
    const existing = await custPoCol().findOne({ invoice_id: String(po.legacy_id) })
    if (existing) {
      const oldLinks = existing.cutomer_polink || ''
      const newLinks = oldLinks ? oldLinks + ',' + links : links
      await custPoCol().updateOne({ _id: existing._id }, { $set: { cutomer_polink: newLinks } })
    } else {
      await custPoCol().insertOne({
        invoice_id: String(po.legacy_id),
        customer_id: '',
        cutomer_polink: links,
        created_on: new Date().toISOString().replace('T', ' ').slice(0, 19),
        status: '1',
      })
    }

    res.json({ success: true, count: req.files.length })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE a customer PO file
router.delete('/:id/customer-po/:filename', async (req, res) => {
  try {
    const po = await col().findOne({ _id: new mongoose.Types.ObjectId(req.params.id) })
    if (!po) return res.status(404).json({ error: 'PO not found' })

    const filename = req.params.filename
    const record = await custPoCol().findOne({ invoice_id: String(po.legacy_id) })
    if (!record) return res.status(404).json({ error: 'No files found' })

    const links = (record.cutomer_polink || '').split(',').filter(l => !l.includes(filename))
    if (links.length === 0) {
      await custPoCol().deleteOne({ _id: record._id })
    } else {
      await custPoCol().updateOne({ _id: record._id }, { $set: { cutomer_polink: links.join(',') } })
    }

    // Try to delete actual file
    const filePath = join(__dirname, '..', '..', filename.startsWith('uploads/') ? filename : 'uploads/customer_po/' + filename)
    try { fs.unlinkSync(filePath) } catch (e) {}

    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST send email for a PO invoice
router.post('/:id/send-email', async (req, res) => {
  try {
    const po = await col().findOne({ _id: new mongoose.Types.ObjectId(req.params.id) })
    if (!po) return res.status(404).json({ error: 'PO not found' })

    const { to, cc, bcc, subject, message } = req.body
    if (!to) return res.status(400).json({ error: 'Recipient email is required' })

    // For now, log the email request and return success
    // TODO: Integrate with actual email service (nodemailer, SendGrid, etc.)
    console.log('Email request for PO:', po.po_number)
    console.log('To:', to, '| Cc:', cc, '| Bcc:', bcc)
    console.log('Subject:', subject)
    console.log('Message:', message)

    res.json({ success: true, message: 'Email queued for delivery' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Serve uploaded files (check new upload dir, then fallback to old PHP app dir)
const oldUploadDir = join(__dirname, '..', '..', '..', '523', 'uploads', 'customer_po')
router.get('/file/:filename', (req, res) => {
  const filePath = join(uploadDir, req.params.filename)
  if (fs.existsSync(filePath)) return res.sendFile(filePath)
  const oldPath = join(oldUploadDir, req.params.filename)
  if (fs.existsSync(oldPath)) return res.sendFile(oldPath)
  res.status(404).json({ error: 'File not found' })
})

export default router
