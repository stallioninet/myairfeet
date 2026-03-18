import { Router } from 'express'
import mongoose from 'mongoose'

const router = Router()
const invoiceCol = () => mongoose.connection.db.collection('invoices')
const custCol = () => mongoose.connection.db.collection('customers')
const commSummaryCol = () => mongoose.connection.db.collection('invoice_commission_summary')
const commDetailCol = () => mongoose.connection.db.collection('invoice_commissions')
const repCol = () => mongoose.connection.db.collection('sales_reps')
const custRepMapCol = () => mongoose.connection.db.collection('cust_sales_rep_map')

// GET Year report - sales by customer grouped by year
router.get('/year', async (req, res) => {
  try {
    const pipeline = [
      { $match: { po_date: { $ne: null } } },
      { $group: {
        _id: { company_id: '$company_id', year: { $year: '$po_date' } },
        total_qty: { $sum: '$total_qty' },
        total_sales: { $sum: '$net_amount' },
        total_po: { $sum: 1 },
      }},
      { $sort: { '_id.year': -1, total_sales: -1 } },
    ]
    const data = await invoiceCol().aggregate(pipeline).toArray()

    // Get customer names
    const companyIds = [...new Set(data.map(d => d._id.company_id).filter(Boolean))]
    const customers = await custCol().find({ legacy_id: { $in: companyIds } }).project({ legacy_id: 1, company_name: 1, company_cust_code: 1 }).toArray()
    const custMap = {}
    customers.forEach(c => { custMap[c.legacy_id] = c })

    const result = data.map(d => ({
      company_id: d._id.company_id,
      company_name: custMap[d._id.company_id]?.company_name || '',
      company_cust_code: custMap[d._id.company_id]?.company_cust_code || '',
      year: d._id.year,
      total_qty: d.total_qty,
      total_sales: d.total_sales,
      total_po: d.total_po,
    }))

    res.json(result)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET Month report - sales by customer grouped by month
router.get('/month', async (req, res) => {
  try {
    const match = { po_date: { $ne: null } }
    if (req.query.year) {
      const y = parseInt(req.query.year)
      match.po_date = { $gte: new Date(`${y}-01-01`), $lt: new Date(`${y + 1}-01-01`) }
    }

    const pipeline = [
      { $match: match },
      { $group: {
        _id: { company_id: '$company_id', year: { $year: '$po_date' }, month: { $month: '$po_date' } },
        total_qty: { $sum: '$total_qty' },
        total_sales: { $sum: '$net_amount' },
        total_po: { $sum: 1 },
      }},
      { $sort: { '_id.year': -1, '_id.month': -1, total_sales: -1 } },
    ]
    const data = await invoiceCol().aggregate(pipeline).toArray()

    const companyIds = [...new Set(data.map(d => d._id.company_id).filter(Boolean))]
    const customers = await custCol().find({ legacy_id: { $in: companyIds } }).project({ legacy_id: 1, company_name: 1 }).toArray()
    const custMap = {}
    customers.forEach(c => { custMap[c.legacy_id] = c.company_name })

    const months = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const result = data.map(d => ({
      company_id: d._id.company_id,
      company_name: custMap[d._id.company_id] || '',
      year: d._id.year,
      month: d._id.month,
      month_name: months[d._id.month] || '',
      total_qty: d.total_qty,
      total_sales: d.total_sales,
      total_po: d.total_po,
    }))

    res.json(result)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET Sales Rep Month report
router.get('/sales-rep-month', async (req, res) => {
  try {
    const match = { po_date: { $ne: null } }
    if (req.query.year) {
      const y = parseInt(req.query.year)
      match.po_date = { $gte: new Date(`${y}-01-01`), $lt: new Date(`${y + 1}-01-01`) }
    }

    // Get all invoices
    const invoices = await invoiceCol().find(match).toArray()

    // Get commission details
    const poIds = invoices.map(i => i.legacy_id)
    const commissions = await commDetailCol().find({ po_id: { $in: poIds }, status: { $in: [1, '1'] } }).toArray()

    // Get customer names
    const companyIds = [...new Set(invoices.map(i => i.company_id).filter(Boolean))]
    const customers = await custCol().find({ legacy_id: { $in: companyIds } }).project({ legacy_id: 1, company_name: 1 }).toArray()
    const custMap = {}
    customers.forEach(c => { custMap[c.legacy_id] = c.company_name })

    // Get rep names
    const repIds = [...new Set(commissions.map(c => c.sales_rep_id).filter(Boolean))]
    const reps = await repCol().find({ legacy_id: { $in: repIds } }).project({ legacy_id: 1, first_name: 1, last_name: 1, user_cust_code: 1 }).toArray()
    const repMap = {}
    reps.forEach(r => { repMap[r.legacy_id] = r })

    // Build report data: per rep, per month
    const months = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const result = []

    commissions.forEach(comm => {
      const inv = invoices.find(i => i.legacy_id === comm.po_id)
      if (!inv || !inv.po_date) return
      const dt = new Date(inv.po_date)
      const rep = repMap[comm.sales_rep_id]
      result.push({
        rep_id: comm.sales_rep_id,
        rep_name: rep ? `${rep.first_name} ${rep.last_name}` : `Rep #${comm.sales_rep_id}`,
        rep_code: rep?.user_cust_code || '',
        company_id: inv.company_id,
        company_name: custMap[inv.company_id] || '',
        year: dt.getFullYear(),
        month: dt.getMonth() + 1,
        month_name: months[dt.getMonth() + 1],
        total_qty: inv.total_qty || 0,
        total_sales: inv.net_amount || 0,
        commission: comm.total_price || 0,
        invoice_number: inv.invoice_number || '',
        po_number: inv.po_number || '',
      })
    })

    res.json(result)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET Sales Rep Year report
router.get('/sales-rep-year', async (req, res) => {
  try {
    const invoices = await invoiceCol().find({ po_date: { $ne: null } }).toArray()
    const poIds = invoices.map(i => i.legacy_id)
    const commissions = await commDetailCol().find({ po_id: { $in: poIds }, status: { $in: [1, '1'] } }).toArray()

    const companyIds = [...new Set(invoices.map(i => i.company_id).filter(Boolean))]
    const customers = await custCol().find({ legacy_id: { $in: companyIds } }).project({ legacy_id: 1, company_name: 1 }).toArray()
    const custMap = {}
    customers.forEach(c => { custMap[c.legacy_id] = c.company_name })

    const repIds = [...new Set(commissions.map(c => c.sales_rep_id).filter(Boolean))]
    const reps = await repCol().find({ legacy_id: { $in: repIds } }).project({ legacy_id: 1, first_name: 1, last_name: 1, user_cust_code: 1 }).toArray()
    const repMap = {}
    reps.forEach(r => { repMap[r.legacy_id] = r })

    // Group by rep + year
    const grouped = {}
    commissions.forEach(comm => {
      const inv = invoices.find(i => i.legacy_id === comm.po_id)
      if (!inv || !inv.po_date) return
      const year = new Date(inv.po_date).getFullYear()
      const key = `${comm.sales_rep_id}_${year}`
      if (!grouped[key]) {
        const rep = repMap[comm.sales_rep_id]
        grouped[key] = {
          rep_id: comm.sales_rep_id,
          rep_name: rep ? `${rep.first_name} ${rep.last_name}` : `Rep #${comm.sales_rep_id}`,
          rep_code: rep?.user_cust_code || '',
          year,
          total_qty: 0, total_sales: 0, total_commission: 0, total_po: 0,
        }
      }
      grouped[key].total_qty += inv.total_qty || 0
      grouped[key].total_sales += inv.net_amount || 0
      grouped[key].total_commission += comm.total_price || 0
      grouped[key].total_po++
    })

    res.json(Object.values(grouped).sort((a, b) => b.year - a.year || b.total_sales - a.total_sales))
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET Paid Invoice report
router.get('/paid-invoices', async (req, res) => {
  try {
    const match = { paid_value: 'PAID' }
    if (req.query.from) match.po_date = { ...match.po_date, $gte: new Date(req.query.from) }
    if (req.query.to) match.po_date = { ...(match.po_date || {}), $lte: new Date(req.query.to + 'T23:59:59') }

    const invoices = await invoiceCol().find(match).sort({ legacy_id: -1 }).toArray()

    const companyIds = [...new Set(invoices.map(i => i.company_id).filter(Boolean))]
    const customers = await custCol().find({ legacy_id: { $in: companyIds } }).project({ legacy_id: 1, company_name: 1, company_cust_code: 1 }).toArray()
    const custMap = {}
    customers.forEach(c => { custMap[c.legacy_id] = c })

    const result = invoices.map(inv => ({
      ...inv,
      company_name: custMap[inv.company_id]?.company_name || '',
      company_cust_code: custMap[inv.company_id]?.company_cust_code || '',
    }))

    res.json(result)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET available years for filters
router.get('/years', async (req, res) => {
  try {
    const pipeline = [
      { $match: { po_date: { $ne: null } } },
      { $group: { _id: { $year: '$po_date' } } },
      { $sort: { _id: -1 } },
    ]
    const result = await invoiceCol().aggregate(pipeline).toArray()
    res.json(result.map(r => r._id).filter(Boolean))
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
