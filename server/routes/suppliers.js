import { Router } from 'express'
import mongoose from 'mongoose'

const router = Router()
const col = () => mongoose.connection.db.collection('suppliers')

// GET all suppliers (optionally filter by status)
router.get('/', async (req, res) => {
  try {
    const filter = {}
    if (req.query.status) filter.status = req.query.status
    const data = await col().find(filter).sort({ supplier_name: 1 }).toArray()
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET stats
router.get('/stats', async (req, res) => {
  try {
    const [total, active, inactive] = await Promise.all([
      col().countDocuments(),
      col().countDocuments({ status: 'active' }),
      col().countDocuments({ status: 'inactive' }),
    ])
    const types = await col().distinct('supplier_type')
    const activeTypes = types.filter(t => t && t.trim() !== '').length
    res.json({ total, active, inactive, activeTypes })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET single supplier
// GET check unique supplier name
router.get('/check-unique', async (req, res) => {
  try {
    const { name, exclude_id } = req.query
    if (!name) return res.json({ unique: true })
    const filter = { supplier_name: { $regex: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } }
    if (exclude_id) filter._id = { $ne: new mongoose.Types.ObjectId(exclude_id) }
    const existing = await col().findOne(filter)
    res.json({ unique: !existing })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// GET supplier with addresses and contacts
router.get('/:id/full', async (req, res) => {
  try {
    const db = mongoose.connection.db
    const supplier = await col().findOne({ _id: new mongoose.Types.ObjectId(req.params.id) })
    if (!supplier) return res.status(404).json({ error: 'Supplier not found' })
    const addresses = await db.collection('supplier_addresses').find({ supplier_id: supplier.legacy_id }).toArray()
    const contacts = await db.collection('supplier_contacts').find({ supplier_id: supplier.legacy_id }).toArray()
    res.json({ ...supplier, addresses, contacts })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// GET Airfeet POs for this supplier
router.get('/:id/airfeet-pos', async (req, res) => {
  try {
    const db = mongoose.connection.db
    const supplier = await col().findOne({ _id: new mongoose.Types.ObjectId(req.params.id) })
    if (!supplier) return res.status(404).json({ error: 'Supplier not found' })
    const suppId = supplier.legacy_id
    const pos = await db.collection('airfeet_pos').find({ supplier_id: suppId, po_status: { $ne: 2 } }).sort({ legacy_id: -1 }).toArray()
    res.json(pos)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// GET History for this supplier (PO list with item type breakdowns + commission totals)
router.get('/:id/history', async (req, res) => {
  try {
    const db = mongoose.connection.db
    const supplier = await col().findOne({ _id: new mongoose.Types.ObjectId(req.params.id) })
    if (!supplier) return res.status(404).json({ error: 'Supplier not found' })
    const suppId = supplier.legacy_id
    const pos = await db.collection('airfeet_pos').find({ supplier_id: suppId }).sort({ legacy_id: -1 }).toArray()

    const itemTypes = await db.collection('item_types').find({}).toArray()
    const itemTypeMap = {}
    itemTypes.forEach(it => { itemTypeMap[it.legacy_id || it._id] = it.item_type_name || it.name || '-' })

    const poIds = pos.map(p => p.legacy_id)
    const allItems = poIds.length > 0
      ? await db.collection('airfeet_po_items').find({ airfeet_po_id: { $in: poIds } }).toArray()
      : []

    const commissions = poIds.length > 0
      ? await db.collection('invoice_commissions').find({ po_id: { $in: [...poIds, ...poIds.map(String)] } }).toArray()
      : []
    const commMap = {}
    commissions.forEach(c => { commMap[String(c.po_id)] = c })

    const usedItemTypes = new Set()
    allItems.forEach(item => {
      const typeId = item.item_type_id || item.item_type
      if (typeId) usedItemTypes.add(String(typeId))
    })

    const itemTypeColumns = []
    usedItemTypes.forEach(typeId => {
      itemTypeColumns.push({ id: typeId, name: itemTypeMap[parseInt(typeId)] || itemTypeMap[typeId] || `Type ${typeId}` })
    })

    const poList = pos.map((po, idx) => {
      const poItems = allItems.filter(item => item.airfeet_po_id === po.legacy_id)
      const totals = {}
      itemTypeColumns.forEach(col => {
        const items = poItems.filter(item => String(item.item_type_id || item.item_type) === col.id)
        totals[col.id] = items.reduce((s, item) => s + (parseFloat(item.total_amount) || parseFloat(item.net_amount) || 0), 0)
      })

      const comm = commMap[String(po.legacy_id)]
      let commTotal = 0
      if (comm) {
        if (comm.save_status === 'percent') commTotal = parseFloat(comm.total_commission_percentage) || 0
        else if (comm.save_status === 'dollar') commTotal = parseFloat(comm.total_commission_dollar) || 0
        else commTotal = parseFloat(comm.commission_total) || 0
      }

      return {
        line: idx + 1,
        po_id: po.legacy_id,
        po_number: po.po_number || '',
        invoice_number: po.invoice_number || '',
        po_date: po.po_date || '',
        po_tqty: po.po_total_qty || 0,
        po_total: parseFloat(po.po_net_amount) || 0,
        totals,
        commTotal,
      }
    })

    res.json({ poList, itemTypeColumns })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.get('/:id', async (req, res) => {
  try {
    const doc = await col().findOne({ _id: new mongoose.Types.ObjectId(req.params.id) })
    if (!doc) return res.status(404).json({ error: 'Supplier not found' })
    res.json(doc)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST create
router.post('/', async (req, res) => {
  try {
    const { supplier_name, supplier_type, contact_name, phone, extension, email, customer_code,
      notes, terms, fob, ship, ship_via, project, status, city, state } = req.body
    if (!supplier_name) return res.status(400).json({ error: 'Supplier name is required' })
    const doc = {
      supplier_name: supplier_name.trim(),
      supplier_type: (supplier_type || '').trim(),
      contact_name: (contact_name || '').trim(),
      phone: (phone || '').trim(),
      extension: (extension || '').trim(),
      email: (email || '').trim(),
      customer_code: (customer_code || '').trim(),
      notes: (notes || '').trim(),
      terms: (terms || '').trim(),
      fob: (fob || '').trim(),
      ship: (ship || '').trim(),
      ship_via: (ship_via || '').trim(),
      project: (project || '').trim(),
      city: (city || '').trim(),
      state: (state || '').trim(),
      status: status || 'active',
      created_at: new Date(),
    }
    const result = await col().insertOne(doc)
    res.json({ ...doc, _id: result.insertedId })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PUT update
router.put('/:id', async (req, res) => {
  try {
    const update = { updated_at: new Date() }
    const fields = ['supplier_name', 'supplier_type', 'contact_name', 'phone', 'extension',
      'email', 'customer_code', 'notes', 'terms', 'fob', 'ship', 'ship_via', 'project',
      'city', 'state', 'status']
    fields.forEach(f => {
      if (req.body[f] !== undefined) update[f] = typeof req.body[f] === 'string' ? req.body[f].trim() : req.body[f]
    })
    await col().updateOne({ _id: new mongoose.Types.ObjectId(req.params.id) }, { $set: update })
    const updated = await col().findOne({ _id: new mongoose.Types.ObjectId(req.params.id) })
    res.json(updated)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE (soft or permanent)
router.delete('/:id', async (req, res) => {
  try {
    if (req.query.permanent === 'true') {
      await col().deleteOne({ _id: new mongoose.Types.ObjectId(req.params.id) })
      res.json({ message: 'Supplier permanently deleted' })
    } else {
      await col().findOneAndUpdate({ _id: new mongoose.Types.ObjectId(req.params.id) }, { $set: { status: 'inactive' } })
      res.json({ message: 'Supplier deactivated' })
    }
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})


// POST add supplier address
router.post('/:id/addresses', async (req, res) => {
  try {
    const db = mongoose.connection.db
    const supplier = await col().findOne({ _id: new mongoose.Types.ObjectId(req.params.id) })
    if (!supplier) return res.status(404).json({ error: 'Supplier not found' })
    const doc = { ...req.body, supplier_id: supplier.legacy_id, status: 'active', created_at: new Date() }
    const result = await db.collection('supplier_addresses').insertOne(doc)
    res.status(201).json({ _id: result.insertedId, ...doc })
  } catch (err) { res.status(400).json({ error: err.message }) }
})

// PUT update supplier address
router.put('/:id/addresses/:addrId', async (req, res) => {
  try {
    const db = mongoose.connection.db
    const result = await db.collection('supplier_addresses').findOneAndUpdate(
      { _id: new mongoose.Types.ObjectId(req.params.addrId) },
      { $set: { ...req.body, updated_at: new Date() } },
      { returnDocument: 'after' }
    )
    res.json(result)
  } catch (err) { res.status(400).json({ error: err.message }) }
})

// DELETE supplier address
router.delete('/:id/addresses/:addrId', async (req, res) => {
  try {
    const db = mongoose.connection.db
    await db.collection('supplier_addresses').deleteOne({ _id: new mongoose.Types.ObjectId(req.params.addrId) })
    res.json({ success: true })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// POST add supplier contact
router.post('/:id/contacts', async (req, res) => {
  try {
    const db = mongoose.connection.db
    const supplier = await col().findOne({ _id: new mongoose.Types.ObjectId(req.params.id) })
    if (!supplier) return res.status(404).json({ error: 'Supplier not found' })
    const doc = { ...req.body, supplier_id: supplier.legacy_id, status: 'active', created_at: new Date() }
    const result = await db.collection('supplier_contacts').insertOne(doc)
    res.status(201).json({ _id: result.insertedId, ...doc })
  } catch (err) { res.status(400).json({ error: err.message }) }
})

// PUT update supplier contact
router.put('/:id/contacts/:contactId', async (req, res) => {
  try {
    const db = mongoose.connection.db
    const result = await db.collection('supplier_contacts').findOneAndUpdate(
      { _id: new mongoose.Types.ObjectId(req.params.contactId) },
      { $set: { ...req.body, updated_at: new Date() } },
      { returnDocument: 'after' }
    )
    res.json(result)
  } catch (err) { res.status(400).json({ error: err.message }) }
})

// DELETE supplier contact
router.delete('/:id/contacts/:contactId', async (req, res) => {
  try {
    const db = mongoose.connection.db
    await db.collection('supplier_contacts').deleteOne({ _id: new mongoose.Types.ObjectId(req.params.contactId) })
    res.json({ success: true })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// PUT save supplier terms
router.put('/:id/terms', async (req, res) => {
  try {
    const { terms, fob, ship, ship_via, project, ship_date } = req.body
    const result = await col().findOneAndUpdate(
      { _id: new mongoose.Types.ObjectId(req.params.id) },
      { $set: { terms, fob, ship, ship_via, project, ship_date, updated_at: new Date() } },
      { returnDocument: 'after' }
    )
    res.json(result)
  } catch (err) { res.status(400).json({ error: err.message }) }
})

// PUT save supplier notes
router.put('/:id/notes', async (req, res) => {
  try {
    const { notes } = req.body
    const result = await col().findOneAndUpdate(
      { _id: new mongoose.Types.ObjectId(req.params.id) },
      { $set: { notes, updated_at: new Date() } },
      { returnDocument: 'after' }
    )
    res.json(result)
  } catch (err) { res.status(400).json({ error: err.message }) }
})

export default router
