import mongoose from 'mongoose'

await mongoose.connect('mongodb://127.0.0.1:27017/523')
const db = mongoose.connection.db

// Sample invoice
const first = await db.collection('invoices').findOne({})
console.log('FIRST INVOICE KEYS:', Object.keys(first || {}))
console.log('po_status type:', typeof first?.po_status, '| value:', first?.po_status)
console.log('company_id type:', typeof first?.company_id, '| value:', first?.company_id)
console.log('net_amount type:', typeof first?.net_amount, '| value:', first?.net_amount)

// Count by status types
const statuses = await db.collection('invoices').distinct('po_status')
console.log('ALL DISTINCT po_status values:', statuses.slice(0, 10))

// Count with string '1'
const count1Str = await db.collection('invoices').countDocuments({ po_status: '1' })
console.log('Invoices with po_status "1" (str):', count1Str)

// Count with number 1
const count1Num = await db.collection('invoices').countDocuments({ po_status: 1 })
console.log('Invoices with po_status 1 (num):', count1Num)

// Top sample with company_id
const withCid = await db.collection('invoices').findOne({ company_id: { $exists: true, $ne: null, $ne: '' } })
console.log('Invoice WITH company_id:', withCid?.company_id, '| type:', typeof withCid?.company_id)

// Even without po_status filter - just get top by net_amount
const topRaw = await db.collection('invoices').aggregate([
  { $match: { company_id: { $exists: true, $ne: null } } },
  { $group: { _id: '$company_id', totalSales: { $sum: { $toDouble: { $ifNull: ['$net_amount','0'] } } }, count: { $sum: 1 } } },
  { $sort: { totalSales: -1 } },
  { $limit: 5 }
]).toArray()
console.log('TOP 5 BUYERS (no status filter):', JSON.stringify(topRaw))

await mongoose.disconnect()
process.exit(0)
