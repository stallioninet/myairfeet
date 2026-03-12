import { Router } from 'express'
import mongoose from 'mongoose'

const router = Router()
const col = () => mongoose.connection.db.collection('customers')

// GET all customers (optionally filter by status)
router.get('/', async (req, res) => {
  try {
    const filter = {}
    if (req.query.status) filter.status = req.query.status
    const data = await col().find(filter).sort({ company_name: 1 }).toArray()
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET customer types
router.get('/types', async (req, res) => {
  try {
    const types = await mongoose.connection.db.collection('customer_types')
      .find({ status: 'active' }).sort({ name: 1 }).toArray()
    res.json(types)
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
    // Count distinct customer types
    const types = await col().distinct('customer_type')
    const activeTypes = types.filter(t => t && t.trim() !== '').length
    res.json({ total, active, inactive, activeTypes })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET single customer (with contacts, addresses, emails, assigned reps)
router.get('/:id', async (req, res) => {
  try {
    const db = mongoose.connection.db
    const doc = await col().findOne({ _id: new mongoose.Types.ObjectId(req.params.id) })
    if (!doc) return res.status(404).json({ error: 'Customer not found' })

    const custId = doc._id

    // Fetch related data
    const [contacts, addresses, emails, repMaps] = await Promise.all([
      db.collection('customer_contacts').find({ customer: custId }).sort({ display_order: 1 }).toArray(),
      db.collection('customer_addresses').find({ customer: custId }).toArray(),
      db.collection('customer_emails').find({ customer: custId }).toArray(),
      db.collection('cust_sales_rep_map').find({ company_id: doc.legacy_id, status: 1 }).toArray(),
    ])

    // Get rep names from app_user
    let assignedReps = []
    if (repMaps.length > 0) {
      const repIds = [...new Set(repMaps.map(m => m.sales_rep_id))]
      const reps = await db.collection('app_user').find({ legacy_id: { $in: repIds } }).toArray()
      assignedReps = reps.map(r => ({ _id: r._id, name: ((r.first_name || '') + ' ' + (r.last_name || '')).trim(), rep_number: r.user_cust_code || '' }))
    }

    res.json({ ...doc, contacts, addresses, emails, assignedReps })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST create customer
router.post('/', async (req, res) => {
  try {
    const { company_name, customer_type, contact_name, phone, extension, email, customer_code,
      notes, terms, fob, ship, ship_via, project, status, relationship, address, city, state, zip, fax, website, sales_rep } = req.body
    if (!company_name) return res.status(400).json({ error: 'Company name is required' })
    const doc = {
      company_name: company_name.trim(),
      customer_type: (customer_type || '').trim(),
      relationship: (relationship || '').trim(),
      contact_name: (contact_name || '').trim(),
      phone: (phone || '').trim(),
      extension: (extension || '').trim(),
      fax: (fax || '').trim(),
      email: (email || '').trim(),
      website: (website || '').trim(),
      customer_code: (customer_code || '').trim(),
      notes: (notes || '').trim(),
      terms: (terms || '').trim(),
      fob: (fob || '').trim(),
      ship: (ship || '').trim(),
      ship_via: (ship_via || '').trim(),
      project: (project || '').trim(),
      address: (address || '').trim(),
      city: (city || '').trim(),
      state: (state || '').trim(),
      zip: (zip || '').trim(),
      sales_rep: (sales_rep || '').trim(),
      status: status || 'active',
      created_at: new Date(),
    }
    const result = await col().insertOne(doc)
    res.json({ ...doc, _id: result.insertedId })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PUT update customer
router.put('/:id', async (req, res) => {
  try {
    const update = { updated_at: new Date() }
    const fields = ['company_name', 'customer_type', 'relationship', 'contact_name', 'phone', 'extension',
      'fax', 'email', 'website', 'customer_code', 'notes', 'terms', 'fob', 'ship', 'ship_via', 'project',
      'address', 'city', 'state', 'zip', 'sales_rep', 'status']
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

// PUT deactivate
router.put('/:id/deactivate', async (req, res) => {
  try {
    await col().updateOne({ _id: new mongoose.Types.ObjectId(req.params.id) }, { $set: { status: 'inactive', updated_at: new Date() } })
    res.json({ message: 'Customer deactivated' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PUT activate
router.put('/:id/activate', async (req, res) => {
  try {
    await col().updateOne({ _id: new mongoose.Types.ObjectId(req.params.id) }, { $set: { status: 'active', updated_at: new Date() } })
    res.json({ message: 'Customer activated' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE customer
router.delete('/:id', async (req, res) => {
  try {
    await col().deleteOne({ _id: new mongoose.Types.ObjectId(req.params.id) })
    res.json({ message: 'Customer deleted' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
