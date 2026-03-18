import mongoose from 'mongoose'
import mysql from 'mysql2/promise'
import dotenv from 'dotenv'
dotenv.config()

const MONGO_URI = process.env.MONGO_URI
const MYSQL_CONFIG = { host: 'localhost', user: 'root', password: '', database: 'myairfee_8qvsun15' }

// Tables to migrate: MySQL table -> MongoDB collection name
const TABLES = [
  // Core business
  { mysql: 'purchase_order', mongo: 'purchase_orders', idField: 'id_purchase_order' },
  { mysql: 'company', mongo: 'companies', idField: 'id_company' },
  { mysql: 'company_address', mongo: 'cust_addresses', idField: 'id_company_address' },
  { mysql: 'company_contact', mongo: 'customer_contacts', idField: 'id_company_contact' },
  { mysql: 'company_emails', mongo: 'company_emails', idField: 'id' },
  { mysql: 'cust_email_rep_map', mongo: 'cust_email_rep_map', idField: 'id' },
  { mysql: 'cust_sales_rep_map', mongo: 'cust_sales_rep_map', idField: 'id' },
  { mysql: 'customer_type', mongo: 'customer_types', idField: 'id_customer_type' },

  // Suppliers
  { mysql: 'suppliers', mongo: 'suppliers', idField: 'id_supplier' },
  { mysql: 'supplier_address', mongo: 'supplier_addresses', idField: 'id_supplier_address' },
  { mysql: 'supplier_contact', mongo: 'supplier_contacts', idField: 'id_supplier_contact' },

  // Items & Products
  { mysql: 'item_type', mongo: 'item_types', idField: 'id_item_type' },
  { mysql: 'item_size', mongo: 'item_sizes', idField: 'id_item_size' },
  { mysql: 'item_map', mongo: 'item_maps', idField: 'id_item_map' },
  { mysql: 'product_item', mongo: 'product_items_master', idField: 'id_product_item' },
  { mysql: 'product_items', mongo: 'product_items_group', idField: 'id' },
  { mysql: 'product_size', mongo: 'product_sizes', idField: 'id_product_size' },
  { mysql: 'product_style', mongo: 'product_styles', idField: 'id_product_style' },
  { mysql: 'group_productitems', mongo: 'group_productitems', idField: 'id' },

  // PO Items
  { mysql: 'po_item', mongo: 'po_items', idField: 'id_po_item' },
  { mysql: 'po_item_size', mongo: 'po_item_sizes', idField: 'id_po_item_size' },
  { mysql: 'po_item_total', mongo: 'po_item_totals', idField: 'id_po_item_total' },
  { mysql: 'po_sales_rep_mapping', mongo: 'po_sales_rep_mappings', idField: 'id' },

  // Airfeet PO
  { mysql: 'airfeet_po', mongo: 'airfeet_pos', idField: 'airfeet_po_id' },
  { mysql: 'airfeet_part_desc', mongo: 'airfeet_part_descs', idField: 'id' },
  { mysql: 'airfeet_po_item_total', mongo: 'airfeet_po_item_totals', idField: 'id' },
  { mysql: 'airfeet_item_map', mongo: 'airfeet_item_maps', idField: 'id' },

  // Commissions
  { mysql: 'invoice_commission', mongo: 'invoice_commissions', idField: 'id_inv_com' },
  { mysql: 'invoice_commission_details', mongo: 'invoice_commission_details', idField: 'id_inv_com_detail' },
  { mysql: 'invoice_commission_item_details', mongo: 'commission_item_details', idField: 'id' },
  { mysql: 'invoice_commission_rep_details', mongo: 'commission_rep_details', idField: 'id' },

  // Payments
  { mysql: 'invoice_payment', mongo: 'commission_payments', idField: 'id_invoice_payment' },
  { mysql: 'invoice_payment_rep', mongo: 'invoice_payment_reps', idField: 'id' },
  { mysql: 'invoice_customer_po', mongo: 'invoice_customer_pos', idField: 'id' },

  // Users
  { mysql: 'user_master', mongo: 'app_user', idField: 'id_user_master' },
  { mysql: 'user_levels', mongo: 'user_levels', idField: 'id_user_level' },
  { mysql: 'user_address', mongo: 'user_addresses', idField: 'id_user_address' },
  { mysql: 'user_contact', mongo: 'user_contacts', idField: 'id_user_contact' },
  { mysql: 'user_privileges', mongo: 'user_privileges', idField: 'id' },
  { mysql: 'access_privileges', mongo: 'access_privileges', idField: 'id_access_privilege' },
  { mysql: 'default_privilege_access', mongo: 'default_privilege_access', idField: 'id' },

  // Events
  { mysql: 'events', mongo: 'events', idField: 'event_id' },
  { mysql: 'event_types', mongo: 'event_types', idField: 'event_type_id' },
  { mysql: 'event_items', mongo: 'event_items', idField: 'event_item_id' },
  { mysql: 'event_item_cost', mongo: 'event_item_costs', idField: 'id' },
  { mysql: 'event_day_receipt_info', mongo: 'event_day_receipts', idField: 'id' },
  { mysql: 'event_advisor_map', mongo: 'event_advisor_maps', idField: 'id' },
  { mysql: 'advisor_bonus_info', mongo: 'advisor_bonus_infos', idField: 'id' },
  { mysql: 'event_email_history', mongo: 'event_email_history', idField: 'id' },

  // Cost & Tax
  { mysql: 'cost_info', mongo: 'cost_infos', idField: 'id' },
  { mysql: 'sales_tax_rates', mongo: 'sales_tax_rates', idField: 'id' },
  { mysql: 'terms', mongo: 'terms', idField: 'id' },
  { mysql: 'status', mongo: 'statuses', idField: 'id' },

  // Email
  { mysql: 'send_email_history', mongo: 'send_email_history', idField: 'id' },
  { mysql: 'send_email_history_airfeet', mongo: 'send_email_history_airfeet', idField: 'id' },
]

async function migrate() {
  console.log('Connecting to MySQL...')
  const mysqlConn = await mysql.createConnection(MYSQL_CONFIG)
  console.log('MySQL connected.')

  console.log('Connecting to MongoDB...')
  await mongoose.connect(MONGO_URI, { dbName: '523' })
  const db = mongoose.connection.db
  console.log('MongoDB connected.')

  let totalMigrated = 0

  for (const table of TABLES) {
    try {
      const [rows] = await mysqlConn.query(`SELECT * FROM \`${table.mysql}\``)
      if (!rows || rows.length === 0) {
        console.log(`  SKIP ${table.mysql} -> ${table.mongo} (0 rows)`)
        continue
      }

      // Map rows: add legacy_id from the primary key
      const docs = rows.map(row => {
        const doc = { ...row }
        // Add legacy_id from the id field
        if (table.idField && row[table.idField] !== undefined) {
          doc.legacy_id = row[table.idField]
        }
        // Convert Buffer/Binary fields to strings
        Object.keys(doc).forEach(key => {
          if (Buffer.isBuffer(doc[key])) {
            doc[key] = doc[key].toString()
          }
        })
        return doc
      })

      // Drop existing collection if it has data
      try {
        const existing = await db.collection(table.mongo).countDocuments()
        if (existing > 0) {
          await db.collection(table.mongo).drop()
          console.log(`  DROPPED existing ${table.mongo} (${existing} docs)`)
        }
      } catch {}

      // Insert in batches of 1000
      const batchSize = 1000
      for (let i = 0; i < docs.length; i += batchSize) {
        const batch = docs.slice(i, i + batchSize)
        await db.collection(table.mongo).insertMany(batch)
      }

      console.log(`  OK ${table.mysql} -> ${table.mongo} (${docs.length} rows)`)
      totalMigrated += docs.length
    } catch (err) {
      console.error(`  ERROR ${table.mysql}: ${err.message}`)
    }
  }

  console.log(`\nMigration complete. Total: ${totalMigrated} records migrated.`)

  // Create indexes for performance
  console.log('\nCreating indexes...')
  try {
    await db.collection('purchase_orders').createIndex({ legacy_id: 1 })
    await db.collection('purchase_orders').createIndex({ company_id: 1 })
    await db.collection('companies').createIndex({ legacy_id: 1 })
    await db.collection('suppliers').createIndex({ legacy_id: 1 })
    await db.collection('cust_addresses').createIndex({ company_id: 1 })
    await db.collection('customer_contacts').createIndex({ customer: 1 })
    await db.collection('po_items').createIndex({ po_id: 1 })
    await db.collection('po_item_sizes').createIndex({ po_id: 1 })
    await db.collection('invoice_commissions').createIndex({ po_id: 1 })
    await db.collection('invoice_commission_details').createIndex({ po_id: 1 })
    await db.collection('commission_item_details').createIndex({ inv_com_id: 1 })
    await db.collection('commission_rep_details').createIndex({ inv_com_id: 1 })
    await db.collection('commission_payments').createIndex({ inv_com_id: 1 })
    await db.collection('invoice_payment_reps').createIndex({ inv_payment_id: 1 })
    await db.collection('airfeet_pos').createIndex({ legacy_id: 1 })
    await db.collection('airfeet_pos').createIndex({ supplier_id: 1 })
    await db.collection('airfeet_part_descs').createIndex({ airfeet_po_id: 1 })
    await db.collection('app_user').createIndex({ legacy_id: 1 })
    await db.collection('events').createIndex({ legacy_id: 1 })
    await db.collection('po_sales_rep_mappings').createIndex({ po_id: 1 })
    await db.collection('supplier_addresses').createIndex({ supplier_id: 1 })
    await db.collection('supplier_contacts').createIndex({ supplier_id: 1 })
    console.log('Indexes created.')
  } catch (err) {
    console.error('Index error:', err.message)
  }

  await mysqlConn.end()
  await mongoose.disconnect()
  console.log('Done!')
}

migrate().catch(err => { console.error('Fatal:', err.message); process.exit(1) })
