import express from 'express'
import mongoose from 'mongoose'
import cors from 'cors'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import usersRouter from './routes/users.js'
import privilegesRouter from './routes/privileges.js'
import itemTypesRouter from './routes/itemTypes.js'
import productItemsRouter from './routes/productItems.js'
import productSizesRouter from './routes/productSizes.js'
import itemSizeMapsRouter from './routes/itemSizeMaps.js'
import productGroupsRouter from './routes/productGroups.js'
import userAccessRouter from './routes/userAccess.js'
import userActivityRouter from './routes/userActivity.js'
import userLevelsRouter from './routes/userLevels.js'
import backupsRouter from './routes/backups.js'
import salesRepsRouter from './routes/salesReps.js'
import eventsRouter from './routes/events.js'
import taxRatesRouter from './routes/taxRates.js'
import costInfoRouter from './routes/costInfo.js'
import productStylesRouter from './routes/productStyles.js'
import customersRouter from './routes/customers.js'
import customerTypesRouter from './routes/customerTypes.js'
import suppliersRouter from './routes/suppliers.js'
import customerImportExportRouter from './routes/customerImportExport.js'
import airfeetPoRouter from './routes/airfeetPo.js'
import invoicesRouter from './routes/invoices.js'
import commissionsRouter from './routes/commissions.js'
import reportsRouter from './routes/reports.js'
import User from './models/User.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: join(__dirname, '..', '.env') })

const app = express()
app.use(cors())
app.use(express.json({ limit: '50mb' }))

// MongoDB Connection
const MONGO_URI = process.env.MONGO_URI

import { startBackupScheduler } from './lib/backupScheduler.js'

mongoose.connect(MONGO_URI, { dbName: '523' })
  .then(() => {
    console.log('MongoDB connected to database: 523')
    startBackupScheduler()
  })
  .catch(err => console.error('MongoDB connection error:', err))

// Seed route - before user routes
app.get('/api/seed', async (req, res) => {
  try {
    const existing = await User.countDocuments()
    if (existing > 0) return res.json({ message: 'Data already exists', count: existing })

    const sampleUsers = [
      { first_name: 'John', last_name: 'Smith', email: 'john.smith@example.com', phone: '(555) 100-0001', level: 'superuser', status: 'active', last_login: new Date('2025-01-15T09:32:00Z') },
      { first_name: 'Sarah', last_name: 'Johnson', email: 'sarah.johnson@example.com', phone: '(555) 100-0002', level: 'admin', status: 'active', last_login: new Date('2025-01-15T08:15:00Z') },
      { first_name: 'Mike', last_name: 'Williams', email: 'mike.williams@example.com', phone: '(555) 100-0003', level: 'sales-rep', status: 'active', last_login: new Date('2025-01-14T14:20:00Z') },
      { first_name: 'Emily', last_name: 'Brown', email: 'emily.brown@example.com', phone: '(555) 100-0004', level: 'data-entry', status: 'active', last_login: new Date('2025-01-13T11:45:00Z') },
      { first_name: 'David', last_name: 'Lee', email: 'david.lee@example.com', phone: '(555) 100-0005', level: 'sales-rep', status: 'active', last_login: new Date('2025-01-10T16:30:00Z') },
      { first_name: 'Lisa', last_name: 'Garcia', email: 'lisa.garcia@example.com', phone: '(555) 100-0006', level: 'admin', status: 'active', last_login: new Date('2025-01-08T10:00:00Z') },
      { first_name: 'Tom', last_name: 'Martinez', email: 'tom.martinez@example.com', phone: '(555) 100-0007', level: 'data-entry', status: 'inactive', last_login: null },
      { first_name: 'Amy', last_name: 'Wilson', email: 'amy.wilson@example.com', phone: '(555) 100-0008', level: 'sales-rep', status: 'inactive', last_login: new Date('2024-12-01T09:00:00Z') },
    ]

    await User.insertMany(sampleUsers)
    res.json({ message: 'Sample data inserted', count: sampleUsers.length })
  } catch (err) {
    res.status(500).json({ error: err.message })
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
app.use('/api/events', eventsRouter)
app.use('/api/tax-rates', taxRatesRouter)
app.use('/api/cost-info', costInfoRouter)
app.use('/api/product-styles', productStylesRouter)
app.use('/api/customers', customersRouter)
app.use('/api/customer-types', customerTypesRouter)
app.use('/api/suppliers', suppliersRouter)
app.use('/api/customer-io', customerImportExportRouter)
app.use('/api/airfeet-po', airfeetPoRouter)
app.use('/api/invoices', invoicesRouter)
app.use('/api/commissions', commissionsRouter)
app.use('/api/reports', reportsRouter)

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected' })
})

// Catch-all 404 for /api/* routes - return JSON instead of HTML
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'Route not found', path: req.originalUrl })
})

const PORT = process.env.PORT || 5000
app.listen(PORT, () => console.log(`Server running on port ${PORT}`))
