import express from 'express'
import mongoose from 'mongoose'
import cors from 'cors'
import usersRouter from '../server/routes/users.js'
import privilegesRouter from '../server/routes/privileges.js'
import itemTypesRouter from '../server/routes/itemTypes.js'
import productItemsRouter from '../server/routes/productItems.js'
import productSizesRouter from '../server/routes/productSizes.js'
import itemSizeMapsRouter from '../server/routes/itemSizeMaps.js'
import productGroupsRouter from '../server/routes/productGroups.js'
import userAccessRouter from '../server/routes/userAccess.js'
import userActivityRouter from '../server/routes/userActivity.js'
import userLevelsRouter from '../server/routes/userLevels.js'
import backupsRouter from '../server/routes/backups.js'
import salesRepsRouter from '../server/routes/salesReps.js'
import customersRouter from '../server/routes/customers.js'
import customerTypesRouter from '../server/routes/customerTypes.js'
import suppliersRouter from '../server/routes/suppliers.js'
import customerImportExportRouter from '../server/routes/customerImportExport.js'
import eventsRouter from '../server/routes/events.js'
import taxRatesRouter from '../server/routes/taxRates.js'
import costInfoRouter from '../server/routes/costInfo.js'
import productStylesRouter from '../server/routes/productStyles.js'
import airfeetPoRouter from '../server/routes/airfeetPo.js'
import invoicesRouter from '../server/routes/invoices.js'
import commissionsRouter from '../server/routes/commissions.js'
import reportsRouter from '../server/routes/reports.js'

const app = express()

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}))
app.use(express.json({ limit: '50mb' }))

// MongoDB Connection - reuse connection across serverless invocations
const MONGO_URI = process.env.MONGO_URI

let cachedConn = null

async function connectDB() {
  if (cachedConn && mongoose.connection.readyState === 1) {
    return cachedConn
  }
  try {
    cachedConn = await mongoose.connect(MONGO_URI, {
      dbName: '523',
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    })
    console.log('MongoDB connected')
    return cachedConn
  } catch (err) {
    console.error('MongoDB connection error:', err.message)
    throw err
  }
}

// Middleware to ensure DB is connected before handling requests
app.use(async (req, res, next) => {
  if (!MONGO_URI) {
    return res.status(500).json({
      error: 'Configuration error',
      detail: 'MONGO_URI environment variable is missing in Vercel settings.'
    })
  }
  try {
    await connectDB()
    next()
  } catch (err) {
    return res.status(500).json({
      error: 'Database connection failed',
      detail: err.message,
      hint: 'Check if your IP is whitelisted (0.0.0.0/0) in MongoDB Atlas Network Access.'
    })
  }
})

// Routes
app.use('/api/users', usersRouter)
app.use('/api/privileges', privilegesRouter)
app.use('/api/item-types', itemTypesRouter)
app.use('/api/products', productItemsRouter)
app.use('/api/product-sizes', productSizesRouter)
app.use('/api/item-size-maps', itemSizeMapsRouter)
app.use('/api/product-groups', productGroupsRouter)
app.use('/api/user-access', userAccessRouter)
app.use('/api/user-activity', userActivityRouter)
app.use('/api/user-levels', userLevelsRouter)
app.use('/api/backups', backupsRouter)
app.use('/api/sales-reps', salesRepsRouter)
app.use('/api/customers', customersRouter)
app.use('/api/customer-types', customerTypesRouter)
app.use('/api/suppliers', suppliersRouter)
app.use('/api/customer-io', customerImportExportRouter)
app.use('/api/events', eventsRouter)
app.use('/api/tax-rates', taxRatesRouter)
app.use('/api/cost-info', costInfoRouter)
app.use('/api/product-styles', productStylesRouter)
app.use('/api/airfeet-po', airfeetPoRouter)
app.use('/api/invoices', invoicesRouter)
app.use('/api/commissions', commissionsRouter)
app.use('/api/reports', reportsRouter)

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected' })
})

export default app
