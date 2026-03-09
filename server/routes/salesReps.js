import express from 'express'
import SalesRep from '../models/SalesRep.js'

const router = express.Router()

// GET stats
router.get('/stats', async (req, res) => {
  try {
    const total = await SalesRep.countDocuments()
    const active = await SalesRep.countDocuments({ status: 'active' })
    const inactive = await SalesRep.countDocuments({ status: 'inactive' })
    res.json({ total, active, inactive })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET all sales reps
router.get('/', async (req, res) => {
  try {
    const { status } = req.query
    const filter = status ? { status } : {}
    const reps = await SalesRep.find(filter).sort({ created_at: -1 })
    res.json(reps)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET single sales rep
router.get('/:id', async (req, res) => {
  try {
    const rep = await SalesRep.findById(req.params.id)
    if (!rep) return res.status(404).json({ error: 'Sales rep not found' })
    res.json(rep)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST create sales rep
router.post('/', async (req, res) => {
  try {
    const rep = new SalesRep(req.body)
    await rep.save()
    res.status(201).json(rep)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// PUT update sales rep
router.put('/:id', async (req, res) => {
  try {
    const rep = await SalesRep.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
    if (!rep) return res.status(404).json({ error: 'Sales rep not found' })
    res.json(rep)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// PUT activate
router.put('/:id/activate', async (req, res) => {
  try {
    const rep = await SalesRep.findByIdAndUpdate(req.params.id, { status: 'active' }, { new: true })
    if (!rep) return res.status(404).json({ error: 'Sales rep not found' })
    res.json(rep)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PUT deactivate
router.put('/:id/deactivate', async (req, res) => {
  try {
    const rep = await SalesRep.findByIdAndUpdate(req.params.id, { status: 'inactive' }, { new: true })
    if (!rep) return res.status(404).json({ error: 'Sales rep not found' })
    res.json(rep)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE sales rep
router.delete('/:id', async (req, res) => {
  try {
    const rep = await SalesRep.findByIdAndDelete(req.params.id)
    if (!rep) return res.status(404).json({ error: 'Sales rep not found' })
    res.json({ message: 'Sales rep deleted' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST seed data
router.post('/seed', async (req, res) => {
  try {
    const existing = await SalesRep.countDocuments()
    if (existing > 0) return res.json({ message: 'Sales reps already exist', count: existing })

    const seedData = [
      { rep_number: '37', first_name: 'Sebastian', last_name: 'Y', email: 'SEBA@STALLIONI.COM', phone: '(555) 123-4567', territory: 'Northeast', commission_rate: 15, address: 'Annur', city: 'Coimbatore', state: 'NY', zip: '641653', start_date: '2023-01-15', status: 'active', username: 'sebastian_y', about: 'Experienced sales representative with focus on northeast region.' },
      { rep_number: '36FOT', first_name: 'David', last_name: 'Anderson', email: 'david@fieldoftalent.com', phone: '(317) 441-1817', territory: 'Midwest', commission_rate: 12, address: '123 Main St', city: 'Indianapolis', state: 'IN', zip: '46204', start_date: '2022-06-01', status: 'active', username: 'david_a', about: 'Midwest territory specialist.' },
      { rep_number: '35BN', first_name: 'Brian', last_name: 'Newman', email: 'bnewmanpga@gmail.com', phone: '(864) 800-3227', territory: 'Southeast', commission_rate: 10, address: '456 Palm Rd', city: 'Punta Gorda', state: 'FL', zip: '33950', start_date: '2022-03-15', status: 'active', username: 'brian_n', about: 'Southeast region rep with focus on Florida market.' },
      { rep_number: 'SJ', first_name: 'Sarah', last_name: 'Johnson', email: 'sarah.johnson@example.com', phone: '(555) 123-4567', territory: 'Northeast', commission_rate: 15, address: '742 Maple Ave', city: 'Hartford', state: 'CT', zip: '06103', start_date: '2023-01-15', status: 'active', username: 'sarah_j', about: 'Top-performing sales representative, northeast territory.' },
      { rep_number: 'MP', first_name: 'Mike', last_name: 'Peters', email: 'mike.peters@example.com', phone: '(555) 234-5678', territory: 'Southeast', commission_rate: 12, address: '89 Oak St', city: 'Atlanta', state: 'GA', zip: '30301', start_date: '2023-04-01', status: 'active', username: 'mike_p', about: 'Southeast territory rep.' },
      { rep_number: 'LC', first_name: 'Lisa', last_name: 'Chen', email: 'lisa.chen@example.com', phone: '(555) 345-6789', territory: 'West Coast', commission_rate: 13, address: '200 Pine Ave', city: 'San Francisco', state: 'CA', zip: '94102', start_date: '2023-02-15', status: 'active', username: 'lisa_c', about: 'West coast territory specialist.' },
      { rep_number: 'TW', first_name: 'Tom', last_name: 'Williams', email: 'tom.williams@example.com', phone: '(555) 456-7890', territory: 'Southwest', commission_rate: 11, address: '55 Desert Rd', city: 'Phoenix', state: 'AZ', zip: '85001', start_date: '2023-06-01', status: 'active', username: 'tom_w', about: 'Southwest territory rep.' },
      { rep_number: 'AR', first_name: 'Amy', last_name: 'Rodriguez', email: 'amy.rodriguez@example.com', phone: '(555) 567-8901', territory: 'Midwest', commission_rate: 10, address: '33 River St', city: 'Chicago', state: 'IL', zip: '60601', start_date: '2023-05-15', status: 'active', username: 'amy_r', about: 'Midwest territory rep covering Illinois and Indiana.' },
      { rep_number: '01JS', first_name: 'John', last_name: 'Smith', email: 'john.smith@example.com', phone: '(212) 555-0200', territory: 'Northeast', commission_rate: 10, address: '100 Broadway', city: 'New York', state: 'NY', zip: '10001', start_date: '2022-01-15', status: 'active', username: 'john_s', about: 'Senior sales representative, New York region.' },
      { rep_number: '01NP', first_name: 'Neil', last_name: 'Purcell', email: 'neil.purcell@example.com', phone: '(555) 678-9012', territory: 'Northeast', commission_rate: 12, address: '75 Elm St', city: 'Boston', state: 'MA', zip: '02101', start_date: '2022-09-01', status: 'active', username: 'neil_p', about: 'Commission detail rep.' },
      { rep_number: '02WP', first_name: 'Wayne', last_name: 'Purcell', email: 'wayne.purcell@example.com', phone: '(555) 789-0123', territory: 'Northeast', commission_rate: 12, address: '75 Elm St', city: 'Boston', state: 'MA', zip: '02101', start_date: '2022-09-01', status: 'active', username: 'wayne_p', about: 'Commission detail rep.' },
      { rep_number: '19JTG', first_name: 'Jim', last_name: 'Terry', email: 'jim.terry@example.com', phone: '(555) 890-1234', territory: 'Southeast', commission_rate: 10, address: '400 Peach St', city: 'Savannah', state: 'GA', zip: '31401', start_date: '2023-03-01', status: 'active', username: 'jim_t', about: 'Southeast region specialist.' },
      { rep_number: '28JW', first_name: 'James', last_name: 'Wilson', email: 'james.wilson@example.com', phone: '(555) 890-1234', territory: 'Southeast', commission_rate: 10, address: '456 Maple Ave', city: 'Richmond', state: 'VA', zip: '23220', start_date: '2021-06-01', status: 'inactive', username: 'james_w', about: 'Previously covered Virginia territory.' },
      { rep_number: '15PB', first_name: 'Patricia', last_name: 'Brown', email: 'patricia.brown@example.com', phone: '(555) 901-2345', territory: 'Midwest', commission_rate: 10, address: '789 Oak Lane', city: 'Columbia', state: 'MO', zip: '65201', start_date: '2021-03-15', status: 'inactive', username: 'patricia_b', about: 'Previously covered Missouri territory.' },
    ]

    await SalesRep.insertMany(seedData)
    res.json({ message: 'Sales reps seeded', count: seedData.length })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
