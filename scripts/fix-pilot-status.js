import 'dotenv/config'
import mongoose from 'mongoose'

const MONGO_URI = process.env.MONGO_URI
if (!MONGO_URI) { console.error('MONGO_URI not set'); process.exit(1) }

await mongoose.connect(MONGO_URI, { dbName: 'app' })
const col = mongoose.connection.db.collection('customers')

// These legacy IDs had company_status=4 (Pilot) in the original SQL
// but were incorrectly migrated as 'inactive'
const pilotLegacyIds = [6, 7, 11, 18, 20, 97, 105, 111, 122, 129, 132, 133]

const result = await col.updateMany(
  { legacy_id: { $in: pilotLegacyIds } },
  { $set: { status: 'pilot' } }
)
console.log(`Updated ${result.modifiedCount} customers to pilot status`)

// Verify
const pilots = await col.find({ status: 'pilot' }).project({ legacy_id: 1, company_name: 1 }).toArray()
console.log('Pilot customers now:', pilots.length)
pilots.forEach(p => console.log(' -', p.legacy_id, p.company_name))

await mongoose.disconnect()
