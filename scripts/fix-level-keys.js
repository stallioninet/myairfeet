import mongoose from 'mongoose'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: join(__dirname, '..', '.env') })

async function main() {
  await mongoose.connect(process.env.MONGO_URI, { dbName: '523' })
  const col = mongoose.connection.db.collection('userlevels')

  const keyMap = {
    'Super Admin': 'superuser',
    'Sales Representative': 'sales_rep',
    'Accountant': 'accountant',
    'Data Entry': 'data_entry'
  }

  for (const [name, key] of Object.entries(keyMap)) {
    const r = await col.updateOne({ name }, { $set: { key } })
    console.log(`${name} -> ${key} | matched: ${r.matchedCount}, modified: ${r.modifiedCount}`)
  }

  // Verify
  const levels = await col.find({}).toArray()
  levels.forEach(l => console.log(`${l.name} | key: ${l.key}`))

  await mongoose.disconnect()
  console.log('Done')
}

main().catch(err => { console.error(err); process.exit(1) })
