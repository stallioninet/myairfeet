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

// Routes - Vercel routes /api/* to this file, so paths here are relative (no /api prefix)
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

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected' })
})

export default app
