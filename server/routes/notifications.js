import { Router } from 'express'
import mongoose from 'mongoose'

const router = Router()
const invoiceCol = () => mongoose.connection.db.collection('invoices')
const summaryCol = () => mongoose.connection.db.collection('invoice_commission_summary')
const custCol = () => mongoose.connection.db.collection('customers')

// GET notifications: overdue invoices + unpaid commissions
router.get('/', async (req, res) => {
  try {
    const today = new Date()

    // Overdue invoices: due_date < today, not fully paid, active
    const overdueRaw = await invoiceCol().find({
      po_status: { $in: [1, '1'] },
      due_date: { $lt: today, $exists: true, $ne: null },
      paid_value: { $nin: ['PAID', 'paid'] },
    }).sort({ due_date: 1 }).limit(8).toArray()

    const companyIds = [...new Set(overdueRaw.map(i => i.company_id).filter(Boolean))]
    const customers = companyIds.length
      ? await custCol().find({ legacy_id: { $in: companyIds } }).project({ legacy_id: 1, company_name: 1 }).toArray()
      : []
    const custMap = Object.fromEntries(customers.map(c => [c.legacy_id, c.company_name]))

    const overdueInvoices = overdueRaw.map(inv => {
      const netAmt = parseFloat(inv.net_amount) || 0
      const paidStr = (inv.paid_value || '').toString().trim().toUpperCase()
      const paidAmt = paidStr === 'PAID' ? netAmt : (parseFloat(paidStr) || 0)
      const balance = Math.max(0, netAmt - paidAmt)
      const daysOverdue = Math.floor((today - new Date(inv.due_date)) / (1000 * 60 * 60 * 24))
      return {
        type: 'overdue',
        id: String(inv._id),
        invoice_number: inv.invoice_number || '',
        company_name: custMap[inv.company_id] || `Customer #${inv.company_id}`,
        balance,
        due_date: inv.due_date,
        days_overdue: daysOverdue,
      }
    }).filter(i => i.balance > 0.01)

    // Unpaid commissions: status=1, commission_paid_status != 1
    const unpaidComms = await summaryCol().find({
      status: { $in: [1, '1'] },
      $or: [{ commission_paid_status: { $ne: 1 } }, { commission_paid_status: { $exists: false } }],
    }).sort({ _id: -1 }).limit(8).toArray()

    const commPoIds = [...new Set(unpaidComms.map(c => c.po_id).filter(Boolean))]
    const commInvoices = commPoIds.length
      ? await invoiceCol().find({ legacy_id: { $in: commPoIds } }).project({ legacy_id: 1, invoice_number: 1, company_id: 1 }).toArray()
      : []
    const invMap = Object.fromEntries(commInvoices.map(i => [i.legacy_id, i]))

    // Get company names for commissions
    const commCompanyIds = [...new Set(commInvoices.map(i => i.company_id).filter(Boolean))]
    const commCustomers = commCompanyIds.length
      ? await custCol().find({ legacy_id: { $in: commCompanyIds } }).project({ legacy_id: 1, company_name: 1 }).toArray()
      : []
    const commCustMap = Object.fromEntries(commCustomers.map(c => [c.legacy_id, c.company_name]))

    const unpaidCommissions = unpaidComms.map(c => {
      const inv = invMap[c.po_id] || {}
      const ss = c.save_status || 'default'
      const total = ss === 'percent' ? (parseFloat(c.total_commission_percentage) || 0)
        : ss === 'dollar' ? (parseFloat(c.total_commission_dollar) || 0)
        : (parseFloat(c.total_commission) || 0)
      return {
        type: 'unpaid_commission',
        id: String(c._id),
        invoice_number: inv.invoice_number || '',
        company_name: commCustMap[inv.company_id] || '',
        total_commission: total,
      }
    })

    const total = overdueInvoices.length + unpaidCommissions.length

    res.json({ total, overdueInvoices, unpaidCommissions })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
