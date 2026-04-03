import { Router } from 'express'
import mongoose from 'mongoose'
import multer from 'multer'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import fs from 'fs'
import PilotProgram from '../models/PilotProgram.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const uploadDir = join(__dirname, '..', '..', 'uploads', 'pilot_programs')
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true })

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, Date.now() + '_' + file.originalname),
})
const upload = multer({ storage, limits: { fileSize: 20 * 1024 * 1024 } })

const router = Router()
const custCol = () => mongoose.connection.db.collection('customers')
const repCol = () => mongoose.connection.db.collection('sales_rep')

// GET all pilot programs
router.get('/', async (req, res) => {
  try {
    const filter = {}
    if (req.query.status) filter.status = req.query.status
    const data = await PilotProgram.find(filter).sort({ created_at: -1 })
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET stats
router.get('/stats', async (req, res) => {
  try {
    const [total, active, completed, cancelled] = await Promise.all([
      PilotProgram.countDocuments(),
      PilotProgram.countDocuments({ status: 'active' }),
      PilotProgram.countDocuments({ status: 'completed' }),
      PilotProgram.countDocuments({ status: 'cancelled' }),
    ])
    const pipeline = [
      { $group: {
        _id: null,
        totalCost: { $sum: '$program_cost' },
        totalPaid: { $sum: { $cond: [{ $eq: ['$payment_status', 'paid'] }, '$program_cost', 0] } },
        totalOutstanding: { $sum: { $cond: [{ $eq: ['$payment_status', 'outstanding'] }, '$program_cost', 0] } },
        totalQuantity: { $sum: '$quantity' },
      }}
    ]
    const agg = await PilotProgram.aggregate(pipeline)
    const amounts = agg[0] || { totalCost: 0, totalPaid: 0, totalOutstanding: 0, totalQuantity: 0 }
    res.json({ total, active, completed, cancelled, ...amounts })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET customers lookup
router.get('/lookup/customers', async (req, res) => {
  try {
    const data = await custCol().find({ status: 'active' })
      .project({ _id: 1, legacy_id: 1, company_name: 1 })
      .sort({ company_name: 1 }).toArray()
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET sales reps lookup
router.get('/lookup/reps', async (req, res) => {
  try {
    const data = await repCol().find({ status: 'active' })
      .project({ _id: 1, legacy_id: 1, first_name: 1, last_name: 1 })
      .sort({ first_name: 1 }).toArray()
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET single pilot program
router.get('/:id', async (req, res) => {
  try {
    const doc = await PilotProgram.findById(req.params.id)
    if (!doc) return res.status(404).json({ error: 'Pilot program not found' })
    res.json(doc)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST create pilot program
router.post('/', async (req, res) => {
  try {
    const b = req.body
    if (!b.customer_name) return res.status(400).json({ error: 'Customer name is required' })
    const doc = await PilotProgram.create({
      customer_id: b.customer_id || '',
      customer_name: b.customer_name,
      quantity: parseInt(b.quantity) || 0,
      program_cost: parseFloat(b.program_cost) || 0,
      payment_status: b.payment_status || 'outstanding',
      paid_date: b.paid_date || null,
      paid_amount: parseFloat(b.paid_amount) || 0,
      before_data: b.before_data || '',
      after_data: b.after_data || '',
      notes: b.notes || '',
      sales_rep_id: b.sales_rep_id || '',
      sales_rep_name: b.sales_rep_name || '',
      start_date: b.start_date || null,
      end_date: b.end_date || null,
      status: b.status || 'active',
    })
    res.status(201).json(doc)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// PUT update pilot program
router.put('/:id', async (req, res) => {
  try {
    const update = { ...req.body }
    delete update._id
    if (update.quantity !== undefined) update.quantity = parseInt(update.quantity) || 0
    if (update.program_cost !== undefined) update.program_cost = parseFloat(update.program_cost) || 0
    if (update.paid_amount !== undefined) update.paid_amount = parseFloat(update.paid_amount) || 0

    const doc = await PilotProgram.findByIdAndUpdate(req.params.id, update, { new: true })
    if (!doc) return res.status(404).json({ error: 'Pilot program not found' })
    res.json(doc)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// PUT mark as paid
router.put('/:id/paid', async (req, res) => {
  try {
    const { paid_date, paid_amount } = req.body
    const doc = await PilotProgram.findByIdAndUpdate(req.params.id, {
      payment_status: 'paid',
      paid_date: paid_date || new Date(),
      paid_amount: parseFloat(paid_amount) || 0,
    }, { new: true })
    if (!doc) return res.status(404).json({ error: 'Pilot program not found' })
    res.json(doc)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// PUT mark as outstanding
router.put('/:id/unpaid', async (req, res) => {
  try {
    const doc = await PilotProgram.findByIdAndUpdate(req.params.id, {
      payment_status: 'outstanding',
      paid_date: null,
      paid_amount: 0,
    }, { new: true })
    if (!doc) return res.status(404).json({ error: 'Pilot program not found' })
    res.json(doc)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// PUT update status (active/completed/cancelled)
router.put('/:id/status', async (req, res) => {
  try {
    const { status } = req.body
    if (!['active', 'completed', 'cancelled'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' })
    }
    const doc = await PilotProgram.findByIdAndUpdate(req.params.id, { status }, { new: true })
    if (!doc) return res.status(404).json({ error: 'Pilot program not found' })
    res.json(doc)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// POST upload documents
router.post('/:id/documents', upload.array('files', 10), async (req, res) => {
  try {
    const doc = await PilotProgram.findById(req.params.id)
    if (!doc) return res.status(404).json({ error: 'Pilot program not found' })
    if (!req.files || req.files.length === 0) return res.status(400).json({ error: 'No files uploaded' })

    const category = req.body.category || 'reports'
    const newDocs = req.files.map(f => ({
      filename: f.filename,
      original_name: f.originalname,
      category,
      size: f.size,
      uploaded_at: new Date(),
    }))

    doc.documents.push(...newDocs)
    await doc.save()
    res.json({ success: true, count: req.files.length, documents: doc.documents })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE a document
router.delete('/:id/documents/:docId', async (req, res) => {
  try {
    const doc = await PilotProgram.findById(req.params.id)
    if (!doc) return res.status(404).json({ error: 'Pilot program not found' })

    const docEntry = doc.documents.id(req.params.docId)
    if (!docEntry) return res.status(404).json({ error: 'Document not found' })

    // Delete file from disk
    const filePath = join(uploadDir, docEntry.filename)
    try { fs.unlinkSync(filePath) } catch (e) {}

    doc.documents.pull(req.params.docId)
    await doc.save()
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET serve a document file
router.get('/file/:filename', (req, res) => {
  const filePath = join(uploadDir, req.params.filename)
  if (fs.existsSync(filePath)) return res.sendFile(filePath)
  res.status(404).json({ error: 'File not found' })
})

// DELETE pilot program
router.delete('/:id', async (req, res) => {
  try {
    const doc = await PilotProgram.findById(req.params.id)
    if (!doc) return res.status(404).json({ error: 'Pilot program not found' })

    // Delete all uploaded files
    doc.documents.forEach(d => {
      const filePath = join(uploadDir, d.filename)
      try { fs.unlinkSync(filePath) } catch (e) {}
    })

    await PilotProgram.findByIdAndDelete(req.params.id)
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
