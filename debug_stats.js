const mongoose = require('mongoose');

async function debugStats() {
  await mongoose.connect('mongodb://127.0.0.1:27017/stallioninet');
  const db = mongoose.connection.db;
  const customers = db.collection('customers');
  const invoices = db.collection('invoices');

  console.log('--- Checking Documents Counts ---');
  const total = await customers.countDocuments();
  const active = await customers.countDocuments({ status: 'active' });
  const status1 = await invoices.countDocuments({ po_status: 1 });
  const status1Str = await invoices.countDocuments({ po_status: '1' });
  console.log('Total Customers:', total);
  console.log('Active Customers:', active);
  console.log('Invoices with po_status 1 (Number):', status1);
  console.log('Invoices with po_status "1" (String):', status1Str);

  console.log('\n--- Checking Top Buyers Aggregation ---');
  const topBuyerIds = await invoices.aggregate([
    { $match: { po_status: '1', company_id: { $exists: true, $ne: null } } },
    { 
      $group: { 
        _id: '$company_id', 
        totalSales: { $sum: { $toDouble: { $ifNull: ["$net_amount", "0"] } } }, 
        count: { $sum: 1 } 
      } 
    },
    { $sort: { totalSales: -1 } },
    { $limit: 10 }
  ]).toArray();
  console.log('Top Buyer IDs identified:', topBuyerIds.length);
  if (topBuyerIds.length > 0) {
    console.log('Example ID:', topBuyerIds[0]._id, '(type:', typeof topBuyerIds[0]._id, ')');
  }

  const legacyIds = topBuyerIds.map(b => parseInt(b._id)).filter(id => !isNaN(id));
  console.log('Legacy IDs for lookup (Numbers):', JSON.stringify(legacyIds));

  const buyersWithNames = await customers.find({ legacy_id: { $in: legacyIds } }).project({ legacy_id: 1, company_name: 1 }).toArray();
  console.log('Found customers for top buyers:', buyersWithNames.length);

  console.log('\n--- Checking Type Distribution ---');
  const types = await customers.aggregate([
    { $match: { status: 'active' } },
    { $group: { _id: '$customer_type', count: { $sum: 1 } } }
  ]).toArray();
  console.log('Raw types distribution:', JSON.stringify(types));

  process.exit(0);
}

debugStats().catch(err => {
  console.error(err);
  process.exit(1);
});
