import 'dotenv/config'
import mongoose from 'mongoose'

const baseUri = process.env.MONGO_URI || 'mongodb://localhost:27017/523'
const MONGO_URI = baseUri.includes('/?') ? baseUri.replace('/?', '/523?') : baseUri + '/523'

// ---- DATA FROM SQL ----

const accessPrivileges = [
  { name: 'Create New User', key: 'create_new_user', description: 'Create New User', status: 'inactive' },
  { name: 'Create New Customer', key: 'create_new_customer', description: 'Create New Customer', status: 'active' },
  { name: 'Create PO', key: 'create_po', description: 'Create Purchase Order', status: 'active' },
  { name: 'View Sales Rep', key: 'view_sales_rep', description: 'View Sales Rep', status: 'active' },
  { name: 'view customer', key: 'view_customer', description: 'Customer Info view', status: 'active' },
  { name: 'Edit Customer', key: 'edit_customer', description: 'customer info edit', status: 'active' },
  { name: 'view invoice', key: 'view_invoice', description: 'view invoice', status: 'active' },
  { name: 'create invoice', key: 'create_invoice', description: 'create invoice', status: 'active' },
  { name: 'delete invoice', key: 'delete_invoice', description: 'delete invoice', status: 'active' },
  { name: 'view commission', key: 'view_commission', description: 'view commission', status: 'active' },
  { name: 'create commission', key: 'create_commission', description: 'create commission', status: 'active' },
  { name: 'Delete Customer', key: 'delete_customer', description: 'Delete Customer', status: 'active' },
  { name: 'Edit Invoice', key: 'edit_invoice', description: 'edit Invoice', status: 'active' },
  { name: 'Delete commission', key: 'delete_commission', description: 'Delete commission', status: 'active' },
  { name: 'Edit commission', key: 'edit_commission', description: 'Edit commission', status: 'active' },
  { name: 'Add Commission Payment', key: 'add_commission_payment', description: 'Add Commission Payment1', status: 'active' },
  { name: 'view_user', key: 'view_user', description: 'view_user', status: 'active' },
  { name: 'view privileges', key: 'view_privileges', description: 'view_privileges', status: 'active' },
  { name: 'view item type', key: 'view_item_type', description: 'view item type', status: 'active' },
  { name: 'view pdtitem type', key: 'view_pdtitem_type', description: 'view pdtitem type', status: 'active' },
  { name: 'view report', key: 'view_report', description: 'view report', status: 'active' },
  { name: 'view backup files', key: 'view_backup_files', description: 'view backup files', status: 'active' },
  { name: 'view salesRep', key: 'view_salesrep', description: 'view salesRep', status: 'active' },
  { name: 'view customer form fields', key: 'view_customer_form_fields', description: 'view customer form fields', status: 'active' },
  { name: 'view user activity', key: 'view_user_activity', description: 'view user activity', status: 'active' },
  { name: 'view customer details', key: 'view_customer_details', description: 'view customer details', status: 'active' },
  { name: 'view item total price', key: 'view_item_total_price', description: 'view item total price', status: 'active' },
  { name: 'view item base price', key: 'view_item_base_price', description: 'view item base price', status: 'active' },
  { name: 'edit commission payment', key: 'edit_commission_payment', description: 'edit commission payment', status: 'active' },
]

const userLevels = [
  { name: 'Super Admin', key: 'superuser', status: 'active' },
  { name: 'Sales Representative', key: 'sales_rep', status: 'active' },
  { name: 'Accountant', key: 'accountant', status: 'active' },
  { name: 'Data Entry', key: 'Date Entry', status: 'active' },
]

function parseDate(d) {
  if (!d || d === '0000-00-00 00:00:00') return null
  return new Date(d)
}

// status: 1=active, 2=deleted, 3=inactive
function mapUserStatus(s) {
  return s === 1 ? 'active' : 'inactive'
}

const userMaster = [
  { first_name: 'superuser', last_name: '', username: 'superuser', email: 'admin@stallioni.com', phone: '', level: 'superuser', status: 1, notes: '', created_at: '2017-08-12', last_login: '2026-02-12 10:44:25' },
  { first_name: 'Neil', last_name: 'Purcell', username: 'NeilP', email: 'neil@myairfeet.com', phone: '', level: 'sales_rep', status: 1, notes: '', created_at: '2017-12-19 06:20:41', last_login: '2017-12-19 06:50:53' },
  { first_name: 'Wayne', last_name: 'Purcell', username: 'WayneP', email: 'wayne@myairfeet.com', phone: '', level: 'sales_rep', status: 1, notes: '', created_at: '2017-12-19 06:22:53', last_login: null },
  { first_name: 'Neil', last_name: 'Purcell', username: 'AFNeilP', email: 'npurcell6@gmail.com', phone: '(317) 965-5212', level: 'superuser', status: 1, notes: '', created_at: '2017-12-19 11:01:46', last_login: '2026-02-05 12:26:32' },
  { first_name: 'Scott', last_name: 'Thompson', username: 'scott', email: 'srt195428@gmail.com', phone: '', level: 'sales_rep', status: 0, notes: '', created_at: '2018-01-08 05:50:33', last_login: null },
  { first_name: 'John', last_name: 'Meyers', username: 'Johnm', email: 'john.meyers54@yahoo.com', phone: '', level: 'sales_rep', status: 1, notes: '', created_at: '2018-01-08 07:03:38', last_login: null },
  { first_name: 'Tami', last_name: 'Sprague', username: 'AFTamiS', email: 'tami.airfeet@gmail.com', phone: '(317) 317-3177', level: 'superuser', status: 1, notes: '', created_at: '2018-01-17 14:45:16', last_login: '2026-02-05 14:28:26' },
  { first_name: 'Ron', last_name: 'Robertson', username: 'ronrob18', email: 'water-works@live.com', phone: '', level: 'sales_rep', status: 1, notes: '', created_at: '2018-03-21 21:37:41', last_login: null },
  { first_name: 'Maralyn', last_name: 'Huber', username: 'mhuber', email: 'mhuber@doctorsofphysicaltherapy.com', phone: '', level: 'sales_rep', status: 1, notes: '', created_at: '2018-04-11 12:07:35', last_login: null },
  { first_name: 'Brandon', last_name: 'Robertson', username: 'BrandonR', email: 'brandon@dovetailmktg.com', phone: '', level: 'sales_rep', status: 1, notes: '', created_at: '2018-04-14 10:00:02', last_login: null },
  { first_name: 'Sherri', last_name: 'Purcell', username: 'SherriP', email: 'sherri926@hotmail.com', phone: '', level: 'sales_rep', status: 1, notes: '', created_at: '2018-05-02 12:53:05', last_login: null },
  { first_name: 'Misc.', last_name: 'Advisor', username: '123', email: 'neil@myairfeet1.com', phone: '', level: 'sales_rep', status: 1, notes: '', created_at: '2018-09-21 09:05:48', last_login: null },
  { first_name: 'Jeremy', last_name: 'Miller', username: 'JMtest', email: 'jeremy@zdevsolutions.com', phone: '', level: 'sales_rep', status: 1, notes: '', created_at: '2018-10-29 10:23:59', last_login: '2018-11-12 02:03:45' },
  { first_name: 'George', last_name: 'Sipos', username: 'GeorgeSipos', email: 'george.airfeet@gmail.com', phone: '', level: 'sales_rep', status: 1, notes: '', created_at: '2019-02-15 15:53:59', last_login: null },
  { first_name: 'Tom', last_name: 'Trocke', username: 'AFTomT', email: 'tomtrocke@hotmail.com', phone: '', level: 'sales_rep', status: 1, notes: '', created_at: '2019-02-25 10:58:43', last_login: null },
  { first_name: 'Cindy', last_name: 'Rednour', username: 'AFCindyR', email: 'cindy.airfeet@gmail.com', phone: '', level: 'sales_rep', status: 1, notes: '', created_at: '2019-02-28 14:46:16', last_login: null },
  { first_name: 'Cassidy', last_name: 'Weston', username: 'AFCassieW', email: 'Cass.weston34@gmail.com', phone: '', level: 'sales_rep', status: 1, notes: '', created_at: '2019-02-28 14:51:38', last_login: null },
  { first_name: 'Mark', last_name: 'Jesse', username: 'MarkJesse', email: 'mjessee29@gmail.com', phone: '', level: 'sales_rep', status: 1, notes: '', created_at: '2019-07-17 16:11:27', last_login: null },
  { first_name: 'Karen', last_name: 'Dubois', username: 'KarenD', email: 'kdpdubois@gmail.com', phone: '', level: 'sales_rep', status: 1, notes: '', created_at: '2019-11-05 13:57:24', last_login: null },
  { first_name: 'Stephen', last_name: 'Jackson', username: 'P&M01', email: 'sales@paddlesandmore.com', phone: '', level: 'sales_rep', status: 0, notes: '', created_at: '2020-02-28 14:04:59', last_login: null },
  { first_name: 'Mark', last_name: 'Bowell', username: 'MB0001', email: 'dmbowell@gmail.com', phone: '', level: 'sales_rep', status: 1, notes: '', created_at: '2020-05-15 09:14:05', last_login: null },
  { first_name: 'Ken', last_name: 'Kuhn', username: '16KH', email: 'kenkuhn@ameritech.net', phone: '', level: 'sales_rep', status: 1, notes: '', created_at: '2020-08-13 14:22:29', last_login: null },
  { first_name: 'Joe', last_name: 'Harpole', username: 'Harpole', email: 'jharpolejr@gmail.com', phone: '', level: 'sales_rep', status: 1, notes: '', created_at: '2020-10-03 07:17:20', last_login: null },
  { first_name: 'Scott', last_name: 'Moore', username: 'Smoore', email: 'pickleballscott@gmail.com', phone: '', level: 'sales_rep', status: 1, notes: '', created_at: '2021-01-22 07:47:23', last_login: null },
  { first_name: 'Jim', last_name: 'Terry', username: 'jimterry', email: 'jim@thejimterrygroup.com', phone: '', level: 'sales_rep', status: 1, notes: '', created_at: '2021-02-22 17:21:52', last_login: null },
  { first_name: 'Rick', last_name: 'Witsken', username: 'rickwitsken', email: 'rick@teamwitsken.com', phone: '', level: 'sales_rep', status: 1, notes: '', created_at: '2021-03-06 13:26:29', last_login: null },
  { first_name: 'Gena & Steve', last_name: 'Burgess', username: 'genaburgess', email: '100pickled@gmail.com', phone: '', level: 'sales_rep', status: 1, notes: '', created_at: '2021-03-14 14:37:22', last_login: null },
  { first_name: 'Angie', last_name: 'Voight', username: 'AngieV', email: 'angievo815@gmail.com', phone: '(317) 441-1817', level: 'Date Entry', status: 1, notes: '', created_at: '2021-03-31 17:25:29', last_login: '2021-04-07 09:25:36' },
  { first_name: 'stallioni', last_name: 'net solutions', username: 'stallioni', email: 'gomathi@stallioni.com', phone: '(740) 277-4295', level: 'sales_rep', status: 1, notes: '', created_at: '2021-04-01 08:56:08', last_login: '2021-04-06 22:08:35' },
  { first_name: 'Matthew', last_name: 'Boyett', username: 'Matthew', email: 'Matthewb827@comcast.net', phone: '', level: 'sales_rep', status: 1, notes: '', created_at: '2021-05-09 13:16:43', last_login: null },
  { first_name: 'Dr Eric', last_name: 'Lullove', username: 'lullove', email: 'drlullove@drlullove.com', phone: '', level: 'sales_rep', status: 1, notes: '', created_at: '2021-10-20 12:47:04', last_login: null },
  { first_name: 'Kelly', last_name: 'Walker', username: 'KellyWalker', email: 'kelly@rainierstrategic.com', phone: '', level: 'sales_rep', status: 1, notes: '', created_at: '2021-11-22 04:53:39', last_login: null },
  { first_name: 'John', last_name: 'Parsons', username: 'JohnParsons', email: 'jparsales@aol.com', phone: '', level: 'sales_rep', status: 1, notes: '', created_at: '2021-11-22 04:56:39', last_login: null },
  { first_name: 'Dave D', last_name: 'Vita Flow', username: 'restorezone', email: 'dave@vitaflowsport.com', phone: '', level: 'sales_rep', status: 1, notes: '', created_at: '2022-02-12 09:03:53', last_login: null },
  { first_name: 'Tina & James', last_name: 'Strickland', username: 'strickland', email: 'southernmagnolia18@gmail.com', phone: '', level: 'sales_rep', status: 1, notes: '', created_at: '2022-03-18 11:00:40', last_login: null },
  { first_name: 'Sandra', last_name: 'Brazelton', username: 'Sandra', email: 'sandraforhomes@gmail.com', phone: '', level: 'sales_rep', status: 1, notes: '', created_at: '2022-06-28 13:18:28', last_login: null },
  { first_name: 'Kirk', last_name: 'Maddock', username: 'kirk', email: 'kirkmaddock@gmail.com', phone: '', level: 'sales_rep', status: 1, notes: '', created_at: '2022-08-16 05:13:12', last_login: null },
  { first_name: 'Jeff', last_name: 'Chrisman', username: 'Jeffchrisman', email: 'jeffchrisman@RFi4.com', phone: '', level: 'sales_rep', status: 1, notes: '', created_at: '2024-01-29 12:58:02', last_login: null },
  { first_name: 'Mike', last_name: 'Ramirez', username: 'mikeramirez', email: 'mramirez@myaretetech.com', phone: '', level: 'sales_rep', status: 1, notes: '', created_at: '2024-04-21 16:07:11', last_login: null },
  { first_name: 'Winston', last_name: 'Miller', username: 'w.miller2024', email: 'w.myairfeet@gmail.com', phone: '', level: 'sales_rep', status: 1, notes: '', created_at: '2024-07-03 09:48:05', last_login: null },
  { first_name: 'Tony', last_name: 'Scelzo', username: 'tonyscelzo', email: 'tscelzo@ceemless.com', phone: '', level: 'sales_rep', status: 1, notes: '', created_at: '2024-07-04 08:09:59', last_login: null },
  { first_name: 'Jana', last_name: 'Hildreth', username: 'JanaHildreth', email: 'jhildreth@synutrapure.com', phone: '', level: 'sales_rep', status: 1, notes: '', created_at: '2024-08-07 13:27:31', last_login: null },
  { first_name: 'Amy', last_name: 'Yarborough', username: 'AmyYarborough', email: 'amyyarbrough.pb@gmail.com', phone: '', level: 'sales_rep', status: 1, notes: '', created_at: '2024-08-07 13:33:14', last_login: null },
  { first_name: 'Tommy - Tsunamihappy LLC.', last_name: 'Tsunami', username: 'tsunami', email: 'tj@th-llc.com', phone: '', level: 'sales_rep', status: 1, notes: '', created_at: '2024-08-14 14:55:49', last_login: null },
  { first_name: 'Brian', last_name: 'Newman', username: 'briannewman', email: 'bnewmanpga@gmail.com', phone: '', level: 'sales_rep', status: 1, notes: '', created_at: '2024-11-04 11:51:56', last_login: null },
  { first_name: 'David', last_name: 'Anderson', username: 'davidanderson', email: 'david@fieldoftalent.com', phone: '', level: 'sales_rep', status: 1, notes: '', created_at: '2025-02-25 12:11:34', last_login: null },
  { first_name: 'Sebastian', last_name: 'y', username: 'stallioniseba', email: 'SEBA@STALLIONI.COM', phone: '(638) 368-0419', level: 'sales_rep', status: 1, notes: '', created_at: '2026-02-12 07:56:17', last_login: null },
]

const itemTypes = [
  { name: 'INSOLES', status: 'active', created_at: '2017-08-16' },
  { name: 'OTHER', status: 'active', created_at: '2017-08-16' },
  { name: 'AirBoard', status: 'active', created_at: '2017-09-09' },
  { name: 'MAP Spray', status: 'active', created_at: '2018-01-01' },
  { name: 'Alignmed', status: 'active', created_at: '2018-02-09' },
  { name: 'Retail Packaging', status: 'active', created_at: '2018-03-03' },
  { name: 'Fees', status: 'active', created_at: '2018-04-16' },
  { name: 'Miscellaneous', status: 'active', created_at: '2018-04-17' },
  { name: 'Foot Care Products', status: 'active', created_at: '2018-11-12' },
  { name: 'RGH/FSA', status: 'active', created_at: '2018-12-31' },
  { name: 'Majestic', status: 'active', created_at: '2018-12-31' },
  { name: 'YO MES Buy', status: 'active', created_at: '2019-07-08' },
  { name: 'Promo', status: 'active', created_at: '2019-10-17' },
  { name: 'Art Craft - Matco', status: 'active', created_at: '2019-12-08' },
  { name: 'PPE', status: 'active', created_at: '2020-04-17' },
  { name: 'Caring Mill', status: 'active', created_at: '2020-11-13' },
  { name: 'AAFES Tactical O2', status: 'active', created_at: '2021-02-21' },
  { name: 'Clothing', status: 'active', created_at: '2021-10-27' },
  { name: 'Displays & Literature', status: 'active', created_at: '2021-10-27' },
]

const itemSizes = [
  { name: '1s', code: '1S', status: 'active' },
  { name: '2s', code: '2S', status: 'active' },
  { name: '1m', code: '1M', status: 'active' },
  { name: '2m', code: '2M', status: 'active' },
  { name: '1l', code: '1L', status: 'active' },
  { name: '2l', code: '2L', status: 'active' },
  { name: '1x', code: '1X', status: 'active' },
  { name: '2x', code: '2X', status: 'active' },
  { name: 'No Size', code: 'No Size', status: 'active' },
  { name: 's', code: 'S', status: 'active' },
  { name: 'l', code: 'L', status: 'active' },
  { name: 'S', code: 'Small', status: 'active' },
  { name: 'NG', code: 'Neon Green', status: 'active' },
  { name: 'NO', code: 'Neon Orange', status: 'active' },
  { name: 'Standard', code: '36" Floor Display', status: 'active' },
  { name: 'Golf', code: '36" Floor Display', status: 'active' },
  { name: 'Outdoor', code: '36" Floor Display', status: 'active' },
  { name: 'STD', code: 'Standard', status: 'active' },
  { name: 'OTD', code: 'Outdoor O2', status: 'active' },
  { name: 'GLF', code: 'Golf', status: 'active' },
  { name: 'M', code: 'Medium', status: 'active' },
  { name: 'M', code: 'M', status: 'active' },
  { name: 'X', code: 'X', status: 'active' },
  { name: 'SM', code: 'SM', status: 'active' },
  { name: 'ML', code: 'ML', status: 'active' },
]

// product_item table from SQL - id_item_type maps to itemTypes array index (1-based)
// prod_status: 1=active, 2=inactive/deleted
const productItems = [
  { sql_id: 1, name: 'CLASSIC Black', item_order: 74, id_item_type: 1, unit_price: 23.00, base_price: 17.00, created_at: '2017-08-19', notes: '', status: 1 },
  { sql_id: 2, name: 'CLASSIC Tan', item_order: 75, id_item_type: 1, unit_price: 23.00, base_price: 17.00, created_at: '2017-08-19', notes: '', status: 1 },
  { sql_id: 3, name: 'CLASSIC Tactical', item_order: 76, id_item_type: 1, unit_price: 23.00, base_price: 17.00, created_at: '2017-08-19', notes: '', status: 1 },
  { sql_id: 4, name: 'SPORTS', item_order: 78, id_item_type: 1, unit_price: 25.00, base_price: 18.00, created_at: '2017-08-19', notes: '', status: 1 },
  { sql_id: 5, name: 'DIABETES ETS', item_order: 77, id_item_type: 1, unit_price: 25.00, base_price: 18.00, created_at: '2017-08-19', notes: '', status: 1 },
  { sql_id: 6, name: 'CS Diabetes', item_order: 95, id_item_type: 1, unit_price: 23.00, base_price: 17.00, created_at: '2017-08-19', notes: '', status: 1 },
  { sql_id: 8, name: 'ESD ElectroStatic', item_order: 82, id_item_type: 1, unit_price: 27.00, base_price: 20.00, created_at: '2017-08-19', notes: '', status: 1 },
  { sql_id: 9, name: 'HD Industrial', item_order: 94, id_item_type: 1, unit_price: 29.00, base_price: 22.00, created_at: '2017-08-19', notes: '', status: 2 },
  { sql_id: 12, name: 'Clear Insole', item_order: 118, id_item_type: 2, unit_price: 6.00, base_price: 6.00, created_at: '2017-08-19', notes: '', status: 1 },
  { sql_id: 13, name: 'AirBoard - RELIEF - AF0ABRO2', item_order: 117, id_item_type: 11, unit_price: 45.00, base_price: 45.00, created_at: '2017-08-19', notes: '', status: 1 },
  { sql_id: 17, name: 'Alignmed CLASSIC Black', item_order: 104, id_item_type: 8, unit_price: 10.00, base_price: 8.00, created_at: '2017-12-28', notes: '', status: 1 },
  { sql_id: 18, name: 'RGH/FSA CLASSIC Black', item_order: 91, id_item_type: 13, unit_price: 22.00, base_price: 16.00, created_at: '2017-12-28', notes: '', status: 1 },
  { sql_id: 19, name: 'RGH/FSA ETS Diabetes', item_order: 90, id_item_type: 13, unit_price: 23.00, base_price: 17.00, created_at: '2017-12-28', notes: '', status: 1 },
  { sql_id: 21, name: 'FASHION', item_order: 79, id_item_type: 1, unit_price: 20.97, base_price: 17.97, created_at: '2018-01-01', notes: '', status: 1 },
  { sql_id: 22, name: 'MAP Leather Spray 3oz', item_order: 100, id_item_type: 12, unit_price: 7.00, base_price: 7.00, created_at: '2018-01-01', notes: '', status: 1 },
  { sql_id: 23, name: 'MAP Lavender Spray 3oz', item_order: 101, id_item_type: 12, unit_price: 7.00, base_price: 7.00, created_at: '2018-01-01', notes: '', status: 1 },
  { sql_id: 24, name: 'Alignmed Pkg.', item_order: 105, id_item_type: 8, unit_price: 1.00, base_price: 0.80, created_at: '2018-02-09', notes: '', status: 1 },
  { sql_id: 25, name: 'RGH/FSA CLASSIC Tan', item_order: 92, id_item_type: 13, unit_price: 22.00, base_price: 16.00, created_at: '2018-03-19', notes: '', status: 1 },
  { sql_id: 26, name: 'RGH/FSA - Tactical', item_order: 93, id_item_type: 13, unit_price: 22.00, base_price: 16.00, created_at: '2018-03-19', notes: '', status: 1 },
  { sql_id: 27, name: 'Fees', item_order: 120, id_item_type: 10, unit_price: 10.00, base_price: 10.00, created_at: '2018-04-16', notes: '', status: 1 },
  { sql_id: 28, name: 'Misc Adjustment', item_order: 125, id_item_type: 11, unit_price: 5.00, base_price: 5.00, created_at: '2018-04-17', notes: '', status: 1 },
  { sql_id: 29, name: 'Fees Returns', item_order: 124, id_item_type: 10, unit_price: 10.00, base_price: 10.00, created_at: '2018-04-17', notes: '', status: 1 },
  { sql_id: 31, name: 'StickeeZ 6 Pair', item_order: 99, id_item_type: 12, unit_price: 15.97, base_price: 15.97, created_at: '2018-04-21', notes: '', status: 1 },
  { sql_id: 32, name: 'RELIEF SM BOS', item_order: 81, id_item_type: 1, unit_price: 21.45, base_price: 16.05, created_at: '2018-09-06', notes: '', status: 1 },
  { sql_id: 33, name: 'RELIEF ML BOS', item_order: 80, id_item_type: 1, unit_price: 21.45, base_price: 16.05, created_at: '2018-09-06', notes: '', status: 1 },
  { sql_id: 34, name: 'Fees Sales Tax', item_order: 122, id_item_type: 10, unit_price: 10.00, base_price: 10.00, created_at: '2018-09-06', notes: '', status: 1 },
  { sql_id: 35, name: 'Fees Shipping', item_order: 123, id_item_type: 10, unit_price: 10.00, base_price: 10.00, created_at: '2018-09-06', notes: '', status: 1 },
  { sql_id: 37, name: 'Discounts', item_order: 121, id_item_type: 10, unit_price: 10.00, base_price: 10.00, created_at: '2018-09-07', notes: '', status: 1 },
  { sql_id: 38, name: 'AIRfeet FootFIXR SMOOTH', item_order: 97, id_item_type: 12, unit_price: 8.35, base_price: 6.70, created_at: '2018-11-12', notes: '', status: 1 },
  { sql_id: 39, name: 'AIRfeet FootFIXR DIMPLE', item_order: 96, id_item_type: 12, unit_price: 8.35, base_price: 6.70, created_at: '2018-11-12', notes: '', status: 1 },
  { sql_id: 40, name: 'AIRfeet FootFIXR BASE', item_order: 98, id_item_type: 12, unit_price: 4.15, base_price: 3.32, created_at: '2018-12-28', notes: '', status: 1 },
  { sql_id: 41, name: 'RGH/FSA FootFIXR SMOOTH 24case', item_order: 86, id_item_type: 13, unit_price: 7.80, base_price: 6.25, created_at: '2018-12-31', notes: '', status: 1 },
  { sql_id: 42, name: 'RGH/FSA FootFIXR DIMPLE 24case', item_order: 85, id_item_type: 13, unit_price: 7.80, base_price: 6.25, created_at: '2018-12-31', notes: '', status: 1 },
  { sql_id: 43, name: 'RGH/FSA RELIEF SM 20case', item_order: 83, id_item_type: 13, unit_price: 17.99, base_price: 14.49, created_at: '2018-12-31', notes: '', status: 1 },
  { sql_id: 44, name: 'RGH/FSA RELIEF ML 20case', item_order: 84, id_item_type: 13, unit_price: 17.99, base_price: 14.49, created_at: '2018-12-31', notes: '', status: 1 },
  { sql_id: 45, name: 'Majestic CLASSIC Black', item_order: 106, id_item_type: 14, unit_price: 15.75, base_price: 13.75, created_at: '2018-12-31', notes: '', status: 2 },
  { sql_id: 46, name: 'Majestic ESD', item_order: 107, id_item_type: 14, unit_price: 19.83, base_price: 15.83, created_at: '2018-12-31', notes: '', status: 2 },
  { sql_id: 47, name: 'Majestic SPORT', item_order: 108, id_item_type: 14, unit_price: 17.89, base_price: 14.89, created_at: '2018-12-31', notes: '', status: 2 },
  { sql_id: 48, name: 'Majestic HD', item_order: 109, id_item_type: 14, unit_price: 24.20, base_price: 18.00, created_at: '2018-12-31', notes: '', status: 2 },
  { sql_id: 49, name: 'Alignmed RELIEF ML', item_order: 103, id_item_type: 8, unit_price: 9.35, base_price: 8.00, created_at: '2019-01-19', notes: '', status: 1 },
  { sql_id: 50, name: 'Alignmed RELIEF SM', item_order: 102, id_item_type: 8, unit_price: 9.35, base_price: 8.00, created_at: '2019-01-19', notes: '', status: 1 },
  { sql_id: 51, name: 'Pull-Up Banner', item_order: 119, id_item_type: 2, unit_price: 100.00, base_price: 100.00, created_at: '2019-03-19', notes: '', status: 1 },
  { sql_id: 52, name: 'RGH/FSA CS Diabetes', item_order: 89, id_item_type: 13, unit_price: 22.00, base_price: 16.00, created_at: '2019-03-26', notes: '', status: 1 },
  { sql_id: 53, name: 'YO Home Sperm Test Kit for iPhone 6 and iPhone 6S', item_order: 111, id_item_type: 13, unit_price: 39.98, base_price: 35.98, created_at: '2019-07-08', notes: '', status: 2 },
  { sql_id: 54, name: 'YO Home Sperm Test Kit for iPhone X', item_order: 115, id_item_type: 13, unit_price: 39.98, base_price: 35.98, created_at: '2019-07-08', notes: '', status: 2 },
  { sql_id: 55, name: 'YO Home Sperm Test Kit for iPhone 8', item_order: 113, id_item_type: 13, unit_price: 39.98, base_price: 35.98, created_at: '2019-07-08', notes: '', status: 2 },
  { sql_id: 56, name: 'YO Home Sperm Test Kit for Universal 1.0', item_order: 110, id_item_type: 13, unit_price: 39.98, base_price: 35.98, created_at: '2019-07-08', notes: '', status: 2 },
  { sql_id: 57, name: 'YO Home Sperm Test Kit Refill Pack, 2 Count', item_order: 116, id_item_type: 13, unit_price: 22.98, base_price: 20.98, created_at: '2019-07-08', notes: '', status: 2 },
  { sql_id: 58, name: 'YO Home Sperm Test Kit for iPhone 7', item_order: 112, id_item_type: 13, unit_price: 39.98, base_price: 35.98, created_at: '2019-07-08', notes: '', status: 2 },
  { sql_id: 59, name: 'YO Sperm Test Kit Refill Pack, 2 Count', item_order: 73, id_item_type: 15, unit_price: 18.55, base_price: 18.55, created_at: '2019-07-19', notes: '', status: 2 },
  { sql_id: 60, name: 'YO Sperm Test Kit for iPhone 6 and iPhone 6S', item_order: 68, id_item_type: 15, unit_price: 32.50, base_price: 32.50, created_at: '2019-07-19', notes: '', status: 2 },
  { sql_id: 61, name: 'YO Sperm Test Kit for iPhone 7', item_order: 69, id_item_type: 15, unit_price: 32.50, base_price: 32.50, created_at: '2019-07-19', notes: '', status: 2 },
  { sql_id: 62, name: 'YO Sperm Test Kit for iPhone 8', item_order: 70, id_item_type: 15, unit_price: 32.50, base_price: 32.50, created_at: '2019-07-19', notes: '', status: 2 },
  { sql_id: 63, name: 'YO Sperm Test Kit for iPhone X', item_order: 72, id_item_type: 15, unit_price: 32.50, base_price: 32.50, created_at: '2019-07-19', notes: '', status: 2 },
  { sql_id: 64, name: 'YO Sperm Test Kit for Universal 1.0', item_order: 67, id_item_type: 15, unit_price: 32.50, base_price: 32.50, created_at: '2019-07-19', notes: '', status: 2 },
  { sql_id: 65, name: 'YO Sperm Test Kit for iPhone 8 plus', item_order: 71, id_item_type: 15, unit_price: 32.50, base_price: 32.50, created_at: '2019-07-29', notes: '', status: 2 },
  { sql_id: 66, name: 'YO Home Sperm Test Kit for iPhone 8 plus', item_order: 114, id_item_type: 13, unit_price: 39.98, base_price: 35.98, created_at: '2019-07-29', notes: '', status: 2 },
  { sql_id: 67, name: 'RGH/FSA NonAF SMOOTH 24case', item_order: 88, id_item_type: 13, unit_price: 6.15, base_price: 5.15, created_at: '2019-09-23', notes: '', status: 1 },
  { sql_id: 68, name: 'RGH/FSA NonAF DIMPLE 24case', item_order: 87, id_item_type: 13, unit_price: 6.15, base_price: 5.15, created_at: '2019-09-23', notes: '', status: 1 },
  { sql_id: 69, name: 'Matco RELIEF ML', item_order: 66, id_item_type: 16, unit_price: 13.48, base_price: 11.48, created_at: '2019-10-17', notes: '', status: 1 },
  { sql_id: 70, name: 'Matco RELIEF SM', item_order: 65, id_item_type: 16, unit_price: 13.48, base_price: 11.48, created_at: '2019-10-17', notes: '', status: 1 },
  { sql_id: 71, name: 'Promo RELIEF ML WOS', item_order: 64, id_item_type: 16, unit_price: 16.17, base_price: 13.17, created_at: '2019-10-31', notes: '', status: 1 },
  { sql_id: 72, name: 'Promo RELIEF SM WOS', item_order: 63, id_item_type: 16, unit_price: 16.17, base_price: 13.17, created_at: '2019-10-31', notes: '', status: 1 },
  { sql_id: 73, name: 'AIRfeet Foot & Body Roller', item_order: 62, id_item_type: 12, unit_price: 15.95, base_price: 9.95, created_at: '2020-04-17', notes: '', status: 1 },
  { sql_id: 74, name: 'AIRfeet ArchBand', item_order: 60, id_item_type: 12, unit_price: 12.49, base_price: 8.49, created_at: '2020-04-17', notes: '', status: 1 },
  { sql_id: 75, name: 'AF reLive Disposable Mask', item_order: 61, id_item_type: 18, unit_price: 0.41, base_price: 0.35, created_at: '2020-04-17', notes: '', status: 1 },
  { sql_id: 77, name: 'FSA AF reLive Medical Face Mask', item_order: 52, id_item_type: 18, unit_price: 0.79, base_price: 0.59, created_at: '2020-05-06', notes: '', status: 1 },
  { sql_id: 78, name: 'FSA AF reLive Disposable Face Mask', item_order: 53, id_item_type: 18, unit_price: 0.69, base_price: 0.52, created_at: '2020-05-07', notes: '', status: 1 },
  { sql_id: 79, name: 'FSA AF reLive KN95 Respirator', item_order: 54, id_item_type: 18, unit_price: 2.59, base_price: 1.99, created_at: '2020-05-07', notes: '', status: 1 },
  { sql_id: 80, name: 'reLive Oral Thermometer', item_order: 55, id_item_type: 18, unit_price: 6.88, base_price: 5.28, created_at: '2020-05-19', notes: '', status: 1 },
  { sql_id: 81, name: 'Caring Mill reLive Copper Imbued ArchBAND', item_order: 56, id_item_type: 19, unit_price: 5.05, base_price: 3.55, created_at: '2020-11-13', notes: '', status: 1 },
  { sql_id: 82, name: 'Caring Mill reLive Foot ROLLER', item_order: 57, id_item_type: 19, unit_price: 5.99, base_price: 4.89, created_at: '2020-11-13', notes: '', status: 1 },
  { sql_id: 83, name: 'Caring Mill Kit - 2 Archbands + 1 ROLLER', item_order: 58, id_item_type: 19, unit_price: 16.09, base_price: 11.99, created_at: '2020-11-13', notes: '', status: 1 },
  { sql_id: 84, name: 'Caring Mill Kit - 2 ArchBands + 1 Dimple FIXR', item_order: 59, id_item_type: 19, unit_price: 16.25, base_price: 12.25, created_at: '2020-11-13', notes: '', status: 1 },
  { sql_id: 86, name: 'AIRfeet TACTICAL-O2 Size S', item_order: 45, id_item_type: 20, unit_price: 20.00, base_price: 13.00, created_at: '2021-02-21', notes: '', status: 1 },
  { sql_id: 87, name: 'AIRfeet TACTICAL-O2 Size M', item_order: 46, id_item_type: 20, unit_price: 20.00, base_price: 13.00, created_at: '2021-02-21', notes: '', status: 1 },
  { sql_id: 89, name: 'AIRfeet TACTICAL-O2 Size XL', item_order: 48, id_item_type: 20, unit_price: 20.00, base_price: 13.00, created_at: '2021-02-21', notes: '', status: 1 },
  { sql_id: 90, name: 'AIRfeet TACTICAL O2 SHIPPER', item_order: 50, id_item_type: 20, unit_price: 0.01, base_price: 0.01, created_at: '2021-02-21', notes: '', status: 1 },
  { sql_id: 91, name: 'AIRfeet TACTICAL O2 SHIPPER 36pcs', item_order: 49, id_item_type: 20, unit_price: 720.00, base_price: 468.00, created_at: '2021-02-21', notes: '', status: 1 },
  { sql_id: 92, name: 'AIRfeet TACTICAL O2 AIRboard - AF0ABTO2', item_order: 51, id_item_type: 20, unit_price: 0.00, base_price: 0.00, created_at: '2021-02-21', notes: '', status: 1 },
  { sql_id: 95, name: 'AIRfeet TACTICAL-O2 Size L', item_order: 47, id_item_type: 20, unit_price: 20.00, base_price: 13.00, created_at: '2021-02-21', notes: '', status: 1 },
  { sql_id: 96, name: 'Caring Mill CLASSIC Black Insole', item_order: 17, id_item_type: 19, unit_price: 16.63, base_price: 12.63, created_at: '2021-02-23', notes: '', status: 1 },
  { sql_id: 97, name: 'RELIEF O2 SM - AF000RSMO2', item_order: 18, id_item_type: 1, unit_price: 15.00, base_price: 12.00, created_at: '2021-10-20', notes: '', status: 1 },
  { sql_id: 98, name: 'RELIEF O2 ML - AF000RMLO2', item_order: 19, id_item_type: 1, unit_price: 15.00, base_price: 12.00, created_at: '2021-10-20', notes: '', status: 1 },
  { sql_id: 99, name: 'OUTDOOR O2 size S - AF00TO2S', item_order: 21, id_item_type: 1, unit_price: 18.00, base_price: 13.00, created_at: '2021-10-27', notes: '', status: 1 },
  { sql_id: 100, name: 'OUTDOOR O2 size M - AF00TO2M', item_order: 22, id_item_type: 1, unit_price: 18.00, base_price: 13.00, created_at: '2021-10-27', notes: '', status: 1 },
  { sql_id: 101, name: 'OUTDOOR O2 size L - AF00TO2L', item_order: 23, id_item_type: 1, unit_price: 18.00, base_price: 13.00, created_at: '2021-10-27', notes: '', status: 1 },
  { sql_id: 102, name: 'OUTDOOR O2 size XL - AF00TO2X', item_order: 24, id_item_type: 1, unit_price: 18.00, base_price: 13.00, created_at: '2021-10-27', notes: '', status: 1 },
  { sql_id: 103, name: 'Ladies Neon Pink Shirt', item_order: 25, id_item_type: 21, unit_price: 29.95, base_price: 24.95, created_at: '2021-10-27', notes: '', status: 1 },
  { sql_id: 104, name: 'Mens Neon Pink Shirt', item_order: 26, id_item_type: 21, unit_price: 29.95, base_price: 24.95, created_at: '2021-10-27', notes: '', status: 1 },
  { sql_id: 105, name: 'Ladies Royal Blue Shirt', item_order: 27, id_item_type: 21, unit_price: 29.95, base_price: 24.95, created_at: '2021-10-27', notes: '', status: 1 },
  { sql_id: 106, name: 'Mens Royal Blue Shirt', item_order: 28, id_item_type: 21, unit_price: 29.95, base_price: 24.95, created_at: '2021-10-27', notes: '', status: 1 },
  { sql_id: 107, name: 'AIRfeet Folding Shelf Display - Green Label AF00FSDG', item_order: 29, id_item_type: 22, unit_price: 0.00, base_price: 0.00, created_at: '2021-10-27', notes: '', status: 1 },
  { sql_id: 108, name: 'AIRfeet Folding Shelf Display - OUTDOOR Label AF00FSDO', item_order: 30, id_item_type: 22, unit_price: 0.00, base_price: 0.00, created_at: '2021-10-27', notes: '', status: 1 },
  { sql_id: 109, name: 'AIRfeet Folding Countertop Display - TACTICAL Label', item_order: 31, id_item_type: 22, unit_price: 0.00, base_price: 0.00, created_at: '2021-10-27', notes: '', status: 1 },
  { sql_id: 110, name: 'AIRfeet Folding Tri-Fold Holder - Green Label', item_order: 32, id_item_type: 22, unit_price: 0.00, base_price: 0.00, created_at: '2021-10-27', notes: '', status: 1 },
  { sql_id: 111, name: 'AIRfeet Folding Tri-Fold Holder - OUTDOOR Label', item_order: 33, id_item_type: 22, unit_price: 0.00, base_price: 0.00, created_at: '2021-10-27', notes: '', status: 1 },
  { sql_id: 112, name: 'AIRfeet Folding Tri-Fold Holder - TACTICAL O2 Label', item_order: 34, id_item_type: 22, unit_price: 0.00, base_price: 0.00, created_at: '2021-10-27', notes: '', status: 1 },
  { sql_id: 113, name: 'Tri-Fold TACTICAL O2', item_order: 35, id_item_type: 22, unit_price: 0.00, base_price: 0.00, created_at: '2021-10-27', notes: '', status: 1 },
  { sql_id: 114, name: 'Tri-Fold PickleBall', item_order: 36, id_item_type: 22, unit_price: 0.00, base_price: 0.00, created_at: '2021-10-27', notes: '', status: 1 },
  { sql_id: 115, name: 'Tri-Fold Standard', item_order: 37, id_item_type: 22, unit_price: 0.00, base_price: 0.00, created_at: '2021-10-27', notes: '', status: 1 },
  { sql_id: 116, name: 'Header Card, Plastic 13.75 x 8.5', item_order: 38, id_item_type: 22, unit_price: 9.95, base_price: 9.95, created_at: '2021-10-27', notes: '', status: 1 },
  { sql_id: 117, name: 'Counter Top Card 8.5 x 11 - Foam', item_order: 39, id_item_type: 22, unit_price: 5.95, base_price: 5.95, created_at: '2021-10-27', notes: '', status: 1 },
  { sql_id: 118, name: 'Pre-Cut Single Samples - RELIEF - AF000RTS', item_order: 40, id_item_type: 11, unit_price: 10.50, base_price: 10.50, created_at: '2021-11-22', notes: '', status: 1 },
  { sql_id: 119, name: 'Pre-Cut Single Samples - OUTDOOR - AF000OTS', item_order: 41, id_item_type: 11, unit_price: 10.50, base_price: 10.50, created_at: '2021-11-22', notes: '', status: 1 },
  { sql_id: 120, name: 'Zipper Pull - Pickleball Paddle', item_order: 42, id_item_type: 16, unit_price: 0.29, base_price: 0.19, created_at: '2021-11-24', notes: '', status: 1 },
  { sql_id: 121, name: 'AirBoard - OUTDOOR O2 - AF0ABOO2', item_order: 43, id_item_type: 11, unit_price: 25.00, base_price: 25.00, created_at: '2021-12-15', notes: '', status: 1 },
  { sql_id: 122, name: 'Floor Display 36 inch', item_order: 44, id_item_type: 22, unit_price: 75.00, base_price: 75.00, created_at: '2021-12-15', notes: '', status: 1 },
  { sql_id: 123, name: 'SPORT O2 size S - AF00SO2S', item_order: 1, id_item_type: 1, unit_price: 21.50, base_price: 15.00, created_at: '2022-07-11', notes: '', status: 1 },
  { sql_id: 124, name: 'SPORT O2 size M - AF00SO2M', item_order: 2, id_item_type: 1, unit_price: 21.50, base_price: 15.00, created_at: '2022-07-11', notes: '', status: 1 },
  { sql_id: 125, name: 'SPORT O2 size L - AF00SO2L', item_order: 3, id_item_type: 1, unit_price: 21.50, base_price: 15.00, created_at: '2022-07-11', notes: '', status: 1 },
  { sql_id: 126, name: 'SPORT O2 size XL - AF00SO2X', item_order: 4, id_item_type: 1, unit_price: 21.50, base_price: 15.00, created_at: '2022-07-11', notes: '', status: 1 },
  { sql_id: 127, name: 'Pre-Cut Single Samples - SPORT - AF000STS', item_order: 5, id_item_type: 11, unit_price: 10.50, base_price: 10.50, created_at: '2022-08-02', notes: '', status: 1 },
  { sql_id: 128, name: 'CLASSIC O2 size S - Black AF00CO2S', item_order: 6, id_item_type: 1, unit_price: 19.00, base_price: 15.00, created_at: '2022-12-08', notes: '', status: 1 },
  { sql_id: 129, name: 'CLASSIC O2 size M - Black AF00CO2M', item_order: 7, id_item_type: 1, unit_price: 19.00, base_price: 15.00, created_at: '2022-12-08', notes: '', status: 1 },
  { sql_id: 130, name: 'CLASSIC O2 size L - Black AF00CO2L', item_order: 8, id_item_type: 1, unit_price: 19.00, base_price: 15.00, created_at: '2022-12-08', notes: '', status: 1 },
  { sql_id: 131, name: 'CLASSIC O2 size XL - Black AF00CO2X', item_order: 9, id_item_type: 1, unit_price: 19.00, base_price: 15.00, created_at: '2022-12-08', notes: '', status: 1 },
  { sql_id: 132, name: 'Plantar Fasciitis Kit SP00ABDF', item_order: 10, id_item_type: 2, unit_price: 8.75, base_price: 7.75, created_at: '2023-07-12', notes: '', status: 1 },
  { sql_id: 133, name: 'FASHION O2 SM - AF000FSM', item_order: 11, id_item_type: 1, unit_price: 12.98, base_price: 10.00, created_at: '2023-07-31', notes: '', status: 1 },
  { sql_id: 134, name: 'FASHION O2 ML - AF000FML', item_order: 12, id_item_type: 1, unit_price: 12.98, base_price: 10.00, created_at: '2023-07-31', notes: '', status: 1 },
  { sql_id: 135, name: 'Pre-Cut Single Samples - CLASSIC - AF000CTS', item_order: 13, id_item_type: 11, unit_price: 10.50, base_price: 10.50, created_at: '2024-12-31', notes: '', status: 1 },
  { sql_id: 136, name: 'PICKLEBALL O2 size S/M - AF00PBSM', item_order: 14, id_item_type: 1, unit_price: 18.75, base_price: 13.00, created_at: '2025-09-17', notes: '', status: 1 },
  { sql_id: 137, name: 'PICKLEBALL O2 size M/L - AF00PBML', item_order: 15, id_item_type: 1, unit_price: 18.75, base_price: 13.00, created_at: '2025-09-17', notes: '', status: 1 },
  { sql_id: 138, name: 'PICKLEBALL O2 size XL - AF00PBXL', item_order: 16, id_item_type: 1, unit_price: 18.75, base_price: 13.00, created_at: '2025-09-17', notes: '', status: 1 },
  { sql_id: 139, name: 'RELIEF O2 XL AF00CO2L', item_order: 20, id_item_type: 1, unit_price: 15.00, base_price: 12.00, created_at: '2025-09-23', notes: '', status: 1 },
]

// product_size table from SQL (different from item_size which is already migrated)
// These are the simpler sizes from product_size table
const productSizesSQL = [
  { name: '1S', desc: 'Size 1S', created_at: '2018-02-17 16:50:46', status: 1 },
  { name: '2S', desc: 'Size 2S', created_at: '2018-02-17 16:50:46', status: 1 },
  { name: '1M', desc: 'Size 1M', created_at: '2018-02-24 17:50:50', status: 1 },
  { name: '2M', desc: 'Size 2M', created_at: '2018-02-24 17:50:50', status: 1 },
  { name: '1L', desc: 'Size 1L', created_at: '2018-02-24 17:50:50', status: 1 },
  { name: '2L', desc: 'Size 2L', created_at: '2018-02-24 17:50:50', status: 1 },
  { name: '1X', desc: 'Size 1X', created_at: '2018-02-24 17:50:50', status: 1 },
  { name: '2X', desc: 'Size 2X', created_at: '2018-02-24 17:50:50', status: 1 },
]

// SQL item_type id -> name mapping (actual SQL IDs, not sequential)
const itemTypeIdMap = {
  1: 'INSOLES', 2: 'OTHER', 4: 'AirBoard', 7: 'MAP Spray', 8: 'Alignmed',
  9: 'Retail Packaging', 10: 'Fees', 11: 'Miscellaneous', 12: 'Foot Care Products',
  13: 'RGH/FSA', 14: 'Majestic', 15: 'YO MES Buy', 16: 'Promo',
  17: 'Art Craft - Matco', 18: 'PPE', 19: 'Caring Mill', 20: 'AAFES Tactical O2',
  21: 'Clothing', 22: 'Displays & Literature',
}

const groupProductItems = [
  { name: 'Floor Display Kit', items: '97,98,131,122,13,118,135,107,110,12,115,74,73,39', item_types: '1,1,1,22,11,11,11,22,22,2,22,12,12,12', status: 'active' },
  { name: 'Group4', items: '52,18', item_types: '13,13', status: 'active' },
  { name: 'Grouptest', items: '37,27,123,50,124,125', item_types: '10,10,,8,1,1', status: 'active' },
  { name: 'Chiro 20 Starter Pack', items: '97,98,131,118,13,107,110,115', item_types: '1,1,1,11,11,22,22,22', status: 'active' },
]

// ---- MIGRATION ----

async function migrate() {
  await mongoose.connect(MONGO_URI)
  console.log('Connected to MongoDB')
  const db = mongoose.connection.db

  // 1. privileges
  console.log('\n--- Migrating privileges ---')
  await db.collection('privileges').deleteMany({})
  const privResult = await db.collection('privileges').insertMany(accessPrivileges.map(p => ({
    ...p, created_at: new Date(), updated_at: new Date()
  })))
  console.log('Inserted', privResult.insertedCount, 'privileges')

  // 2. userlevels
  console.log('\n--- Migrating user levels ---')
  await db.collection('userlevels').deleteMany({})
  const lvlResult = await db.collection('userlevels').insertMany(userLevels.map(l => ({
    ...l, created_at: new Date(), updated_at: new Date()
  })))
  console.log('Inserted', lvlResult.insertedCount, 'user levels')

  // 3. app_users
  console.log('\n--- Migrating users ---')
  await db.collection('app_users').deleteMany({})
  const usersToInsert = userMaster.map(u => ({
    first_name: u.first_name.trim(),
    last_name: u.last_name.trim(),
    username: u.username,
    email: u.email,
    phone: u.phone || null,
    level: u.level === 'Date Entry' ? 'data-entry' : u.level === 'superuser' ? 'superuser' : u.level === 'sales_rep' ? 'sales-rep' : u.level === 'accountant' ? 'accountant' : 'data-entry',
    status: mapUserStatus(u.status),
    notes: u.notes || null,
    last_login: parseDate(u.last_login),
    created_at: parseDate(u.created_at) || new Date(),
    updated_at: new Date(),
  }))
  const userResult = await db.collection('app_users').insertMany(usersToInsert)
  console.log('Inserted', userResult.insertedCount, 'users')

  // 4. itemtypes
  console.log('\n--- Migrating item types ---')
  await db.collection('itemtypes').deleteMany({})
  const itResult = await db.collection('itemtypes').insertMany(itemTypes.map(t => ({
    name: t.name, status: t.status,
    created_at: parseDate(t.created_at) || new Date(), updated_at: new Date()
  })))
  console.log('Inserted', itResult.insertedCount, 'item types')

  // 5. (productsizes moved to step 8 - combined with product_size table)

  // 6. productgroups
  console.log('\n--- Migrating product groups ---')
  await db.collection('productgroups').deleteMany({})
  const pgResult = await db.collection('productgroups').insertMany(groupProductItems.map(g => ({
    name: g.name, items: g.items, item_types: g.item_types, status: g.status,
    created_at: new Date(), updated_at: new Date()
  })))
  console.log('Inserted', pgResult.insertedCount, 'product groups')

  // 7. productitems (product_item SQL table -> productitems collection)
  console.log('\n--- Migrating product items ---')
  // Build a name->ObjectId map from inserted itemtypes
  const insertedTypes = await db.collection('itemtypes').find({}).toArray()
  const typeNameToId = {}
  for (const t of insertedTypes) {
    typeNameToId[t.name] = t._id
  }
  await db.collection('productitems').deleteMany({})
  const prodItemDocs = productItems.map(p => {
    const typeName = itemTypeIdMap[p.id_item_type] || 'OTHER'
    const typeId = typeNameToId[typeName] || typeNameToId['OTHER']
    return {
      name: p.name,
      item_type: typeId,
      unit_price: p.unit_price,
      base_price: p.base_price,
      notes: p.notes || '',
      status: p.status === 1 ? 'active' : 'inactive',
      created_at: parseDate(p.created_at) || new Date(),
      updated_at: new Date(),
    }
  })
  const piResult = await db.collection('productitems').insertMany(prodItemDocs)
  console.log('Inserted', piResult.insertedCount, 'product items')

  // 8. productsizes (product_size SQL table -> productsizes collection)
  console.log('\n--- Migrating product sizes (from product_size table) ---')
  await db.collection('productsizes').deleteMany({})
  const combinedSizes = [
    // From product_size table
    ...productSizesSQL.map(s => ({
      name: s.name, code: s.name, sort_order: 0,
      status: s.status === 1 ? 'active' : 'inactive',
      created_at: parseDate(s.created_at) || new Date(), updated_at: new Date()
    })),
    // From item_size (already in the script)
    ...itemSizes.map((s, i) => ({
      name: s.name, code: s.code, sort_order: i + 1,
      status: s.status,
      created_at: new Date(), updated_at: new Date()
    })),
  ]
  // Deduplicate by code
  const seenCodes = new Set()
  const uniqueSizes = []
  for (const s of combinedSizes) {
    const key = s.code + '|' + s.name
    if (!seenCodes.has(key)) {
      seenCodes.add(key)
      uniqueSizes.push(s)
    }
  }
  const psResult2 = await db.collection('productsizes').insertMany(uniqueSizes)
  console.log('Inserted', psResult2.insertedCount, 'product sizes (combined)')

  console.log('\n=== Migration complete! ===')
  await mongoose.disconnect()
}

migrate().catch(err => {
  console.error('Migration failed:', err)
  process.exit(1)
})
