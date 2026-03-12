import mongoose from 'mongoose'
import dotenv from 'dotenv'
dotenv.config()

await mongoose.connect(process.env.MONGO_URI, { dbName: '523' })
const col = mongoose.connection.db.collection('app_user')

const allUsers = await col.find({}).toArray()
console.log('Total app_user records:', allUsers.length)

const types = {}
allUsers.forEach(u => { types[u.user_type] = (types[u.user_type] || 0) + 1 })
console.log('By user_type:', JSON.stringify(types))

const statuses = {}
allUsers.forEach(u => { statuses[u.status] = (statuses[u.status] || 0) + 1 })
console.log('By status:', JSON.stringify(statuses))

const salesRepActive = allUsers.filter(u => u.user_type === 'sales_rep' && u.status === 'active')
console.log('sales_rep + active:', salesRepActive.length)

const salesRepInactive = allUsers.filter(u => u.user_type === 'sales_rep' && u.status === 'inactive')
console.log('sales_rep + inactive:', salesRepInactive.length)

console.log('\nNon-sales_rep users:')
allUsers.filter(u => u.user_type !== 'sales_rep').forEach(u => {
  console.log(' ', u.legacy_id, u.first_name, u.last_name, '| type:', u.user_type, '| status:', u.status)
})

console.log('\nInactive sales_rep users:')
salesRepInactive.forEach(u => {
  console.log(' ', u.legacy_id, u.first_name, u.last_name, '| email:', u.email, '| status:', u.status)
})

await mongoose.disconnect()
