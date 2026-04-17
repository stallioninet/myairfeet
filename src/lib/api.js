const API_URL = import.meta.env.VITE_API_URL || '/api'

async function request(endpoint, options = {}) {
  const res = await fetch(`${API_URL}${endpoint}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Request failed')
  return data
}

export const api = {
  // Users
  getUsers: () => request('/users'),
  getUser: (id) => request(`/users/${id}`),
  createUser: (data) => request('/users', { method: 'POST', body: JSON.stringify(data) }),
  updateUser: (id, data) => request(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteUser: (id) => request(`/users/${id}`, { method: 'DELETE' }),
  checkUniqueUser: (field, value, excludeId) => request(`/users/check-unique?field=${field}&value=${encodeURIComponent(value)}${excludeId ? '&exclude_id=' + excludeId : ''}`),
  loginUser: (email, password) => request('/users/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  getUserStats: () => request('/users/stats/counts'),
  seedUsers: () => request('/users/seed', { method: 'POST' }),

  // Privileges
  getPrivileges: () => request('/privileges'),
  getPrivilege: (id) => request(`/privileges/${id}`),
  createPrivilege: (data) => request('/privileges', { method: 'POST', body: JSON.stringify(data) }),
  updatePrivilege: (id, data) => request(`/privileges/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deactivatePrivilege: (id) => request(`/privileges/${id}/deactivate`, { method: 'PUT' }),
  activatePrivilege: (id) => request(`/privileges/${id}/activate`, { method: 'PUT' }),
  deletePrivilege: (id) => request(`/privileges/${id}`, { method: 'DELETE' }),
  seedPrivileges: () => request('/privileges/seed', { method: 'POST' }),

  // Item Types
  getItemTypes: () => request('/item-types'),
  getItemType: (id) => request(`/item-types/${id}`),
  createItemType: (data) => request('/item-types', { method: 'POST', body: JSON.stringify(data) }),
  updateItemType: (id, data) => request(`/item-types/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deactivateItemType: (id) => request(`/item-types/${id}/deactivate`, { method: 'PUT' }),
  activateItemType: (id) => request(`/item-types/${id}/activate`, { method: 'PUT' }),
  deleteItemType: (id) => request(`/item-types/${id}`, { method: 'DELETE' }),
  checkUniqueItemType: (name, excludeId) => request(`/item-types/check-unique?name=${encodeURIComponent(name)}${excludeId ? '&exclude_id=' + excludeId : ''}`),

  // Product Items
  getProducts: () => request('/products'),
  getProduct: (id) => request(`/products/${id}`),
  createProduct: (data) => request('/products', { method: 'POST', body: JSON.stringify(data) }),
  updateProduct: (id, data) => request(`/products/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  duplicateProduct: (id) => request(`/products/${id}/duplicate`, { method: 'POST' }),
  deactivateProduct: (id) => request(`/products/${id}/deactivate`, { method: 'PUT' }),
  activateProduct: (id) => request(`/products/${id}/activate`, { method: 'PUT' }),
  deleteProduct: (id) => request(`/products/${id}`, { method: 'DELETE' }),
  checkUniqueProduct: (field, value, excludeId) => request(`/products/check-unique?field=${field}&value=${encodeURIComponent(value)}${excludeId ? '&exclude_id=' + excludeId : ''}`),
  reorderProducts: (order) => request('/products/reorder/bulk', { method: 'PUT', body: JSON.stringify({ order }) }),

  // Product Sizes
  getProductSizes: () => request('/product-sizes'),
  getProductSize: (id) => request(`/product-sizes/${id}`),
  createProductSize: (data) => request('/product-sizes', { method: 'POST', body: JSON.stringify(data) }),
  updateProductSize: (id, data) => request(`/product-sizes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deactivateProductSize: (id) => request(`/product-sizes/${id}/deactivate`, { method: 'PUT' }),
  activateProductSize: (id) => request(`/product-sizes/${id}/activate`, { method: 'PUT' }),
  deleteProductSize: (id) => request(`/product-sizes/${id}`, { method: 'DELETE' }),

  // Item Size Maps
  getItemSizeMaps: (itemId) => request('/item-size-maps' + (itemId ? '?item_id=' + itemId : '')),
  createItemSizeMaps: (data) => request('/item-size-maps', { method: 'POST', body: JSON.stringify(data) }),
  updateItemSizeMap: (id, data) => request(`/item-size-maps/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteItemSizeMap: (id) => request(`/item-size-maps/${id}`, { method: 'DELETE' }),

  // Product Groups
  getProductGroups: () => request('/product-groups'),
  getProductGroup: (id) => request(`/product-groups/${id}`),
  createProductGroup: (data) => request('/product-groups', { method: 'POST', body: JSON.stringify(data) }),
  updateProductGroup: (id, data) => request(`/product-groups/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  duplicateProductGroup: (id) => request(`/product-groups/${id}/duplicate`, { method: 'POST' }),
  deactivateProductGroup: (id) => request(`/product-groups/${id}/deactivate`, { method: 'PUT' }),
  activateProductGroup: (id) => request(`/product-groups/${id}/activate`, { method: 'PUT' }),
  deleteProductGroup: (id) => request(`/product-groups/${id}`, { method: 'DELETE' }),

  // User Access
  getUserAccess: (userId) => request(`/user-access/${userId}`),
  saveUserAccess: (userId, access) => request(`/user-access/${userId}`, { method: 'PUT', body: JSON.stringify({ access }) }),
  getLevelAccess: (levelKey) => request(`/user-access/level/${levelKey}`),
  saveLevelAccess: (levelKey, access) => request(`/user-access/level/${levelKey}`, { method: 'PUT', body: JSON.stringify({ access }) }),
  getAllLevelDefaults: () => request('/user-access/levels/all'),

  // User Activity
  getUserActivities: (params = {}) => {
    const q = new URLSearchParams(params).toString()
    return request(`/user-activity${q ? '?' + q : ''}`)
  },
  getUserActivityStats: () => request('/user-activity/stats'),
  getUserActivityByUser: (userId) => request(`/user-activity/user/${userId}`),
  createUserActivity: (data) => request('/user-activity', { method: 'POST', body: JSON.stringify(data) }),
  clearOldActivities: () => request('/user-activity/clear-old', { method: 'DELETE' }),
  seedActivities: () => request('/user-activity/seed', { method: 'POST' }),

  // User Levels
  getUserLevels: () => request('/user-levels'),
  getUserLevel: (id) => request(`/user-levels/${id}`),
  createUserLevel: (data) => request('/user-levels', { method: 'POST', body: JSON.stringify(data) }),
  updateUserLevel: (id, data) => request(`/user-levels/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  duplicateUserLevel: (id) => request(`/user-levels/${id}/duplicate`, { method: 'POST' }),
  activateUserLevel: (id) => request(`/user-levels/${id}/activate`, { method: 'PUT' }),
  deactivateUserLevel: (id) => request(`/user-levels/${id}/deactivate`, { method: 'PUT' }),
  deleteUserLevel: (id) => request(`/user-levels/${id}`, { method: 'DELETE' }),
  seedUserLevels: () => request('/user-levels/seed', { method: 'POST' }),

  // Sales Reps
  getSalesReps: (status) => request('/sales-reps' + (status ? '?status=' + status : '')),
  getSalesRep: (id) => request(`/sales-reps/${id}`),
  getSalesRepCustomers: (id) => request(`/sales-reps/${id}/customers`),
  getSalesRepInvoices: (id) => request(`/sales-reps/${id}/invoices`),
  getSalesRepCommissions: (id) => request(`/sales-reps/${id}/commissions`),
  getSalesRepCommissionStats: (id) => request(`/sales-reps/${id}/commission-stats`),
  getInvoiceDetail: (invoiceId) => request(`/sales-reps/invoice/${invoiceId}`),
  getSalesRepStats: () => request('/sales-reps/stats'),
  createSalesRep: (data) => request('/sales-reps', { method: 'POST', body: JSON.stringify(data) }),
  updateSalesRep: (id, data) => request(`/sales-reps/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  activateSalesRep: (id) => request(`/sales-reps/${id}/activate`, { method: 'PUT' }),
  deactivateSalesRep: (id) => request(`/sales-reps/${id}/deactivate`, { method: 'PUT' }),
  deleteSalesRep: (id) => request(`/sales-reps/${id}`, { method: 'DELETE' }),
  checkUniqueSalesRep: (field, value, excludeId) => request(`/sales-reps/check-unique?field=${field}&value=${encodeURIComponent(value)}${excludeId ? '&exclude_id=' + excludeId : ''}`),
  seedSalesReps: () => request('/sales-reps/seed', { method: 'POST' }),

  // Events
  getEvents: (status) => request('/events' + (status ? '?status=' + status : '')),
  getEvent: (id) => request(`/events/${id}`),
  getEventStats: () => request('/events/stats'),
  createEvent: (data) => request('/events', { method: 'POST', body: JSON.stringify(data) }),
  updateEvent: (id, data) => request(`/events/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteEvent: (id) => request(`/events/${id}`, { method: 'DELETE' }),
  getEventTypes: () => request('/events/types'),
  createEventType: (data) => request('/events/types', { method: 'POST', body: JSON.stringify(data) }),
  updateEventType: (id, data) => request(`/events/types/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteEventType: (id) => request(`/events/types/${id}`, { method: 'DELETE' }),
  getEventItems: (id) => request(`/events/${id}/items`),
  addEventItem: (id, data) => request(`/events/${id}/items`, { method: 'POST', body: JSON.stringify(data) }),
  deleteEventItem: (itemId) => request(`/events/items/${itemId}`, { method: 'DELETE' }),
  getEventReceipts: (id) => request(`/events/${id}/receipts`),
  addEventReceipt: (id, data) => request(`/events/${id}/receipts`, { method: 'POST', body: JSON.stringify(data) }),
  checkUniqueEvent: (field, value, excludeId) => request(`/events/check-unique?field=${field}&value=${encodeURIComponent(value)}${excludeId ? '&exclude_id=' + excludeId : ''}`),
  getEventAdvisors: (id) => request(`/events/${id}/advisors`),
  addEventAdvisor: (id, data) => request(`/events/${id}/advisors`, { method: 'POST', body: JSON.stringify(data) }),
  removeEventAdvisor: (id, mapId) => request(`/events/${id}/advisors/${mapId}`, { method: 'DELETE' }),
  getEventBonuses: (id) => request(`/events/${id}/bonuses`),
  saveEventBonus: (id, data) => request(`/events/${id}/bonuses`, { method: 'POST', body: JSON.stringify(data) }),
  markBonusPaid: (bonusId, paidDate) => request(`/events/bonuses/${bonusId}/paid`, { method: 'PUT', body: JSON.stringify({ paid_date: paidDate }) }),
  updateEventReceipt: (receiptId, data) => request(`/events/receipts/${receiptId}`, { method: 'PUT', body: JSON.stringify(data) }),

  // Tax Rates
  getTaxRates: () => request('/tax-rates'),
  getTaxRate: (id) => request(`/tax-rates/${id}`),
  createTaxRate: (data) => request('/tax-rates', { method: 'POST', body: JSON.stringify(data) }),
  updateTaxRate: (id, data) => request(`/tax-rates/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteTaxRate: (id) => request(`/tax-rates/${id}`, { method: 'DELETE' }),

  // Product Styles (includes sizes from product_sizes collection)
  getEventProductSizes: () => request('/product-styles/sizes'),
  createEventProductSize: (data) => request('/product-styles/sizes', { method: 'POST', body: JSON.stringify(data) }),
  updateEventProductSize: (id, data) => request(`/product-styles/sizes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteEventProductSize: (id) => request(`/product-styles/sizes/${id}`, { method: 'DELETE' }),
  getProductStyles: () => request('/product-styles'),
  createProductStyle: (data) => request('/product-styles', { method: 'POST', body: JSON.stringify(data) }),
  updateProductStyle: (id, data) => request(`/product-styles/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteProductStyle: (id) => request(`/product-styles/${id}`, { method: 'DELETE' }),

  // Cost Info
  getCostInfo: () => request('/cost-info'),
  createCostInfo: (data) => request('/cost-info', { method: 'POST', body: JSON.stringify(data) }),
  updateCostInfo: (id, data) => request(`/cost-info/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCostInfo: (id) => request(`/cost-info/${id}`, { method: 'DELETE' }),

  // Customers
  getCustomers: (statusOrParams) => {
    if (!statusOrParams) return request('/customers')
    if (typeof statusOrParams === 'string') return request(`/customers?status=${statusOrParams}`)
    const q = new URLSearchParams(statusOrParams).toString()
    return request(`/customers${q ? '?' + q : ''}`)
  },
  getCustomer: (id) => request(`/customers/${id}`),
  getCustomerStats: (params) => {
    const q = params && Object.keys(params).length ? new URLSearchParams(params).toString() : ''
    return request(`/customers/stats${q ? '?' + q : ''}`)
  },
  getCustomerTypes: () => request('/customers/types'),
  createCustomer: (data) => request('/customers', { method: 'POST', body: JSON.stringify(data) }),
  updateCustomer: (id, data) => request(`/customers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  updateCustomerReps: (id, repIds) => request(`/customers/${id}/reps`, { method: 'PUT', body: JSON.stringify({ repIds }) }),
  createContact: (custId, data) => request(`/customers/${custId}/contacts`, { method: 'POST', body: JSON.stringify(data) }),
  updateContact: (custId, contactId, data) => request(`/customers/${custId}/contacts/${contactId}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteContact: (custId, contactId) => request(`/customers/${custId}/contacts/${contactId}`, { method: 'DELETE' }),
  updateAddress: (custId, addressId, data) => request(`/customers/${custId}/addresses/${addressId}`, { method: 'PUT', body: JSON.stringify(data) }),
  createAddress: (custId, data) => request(`/customers/${custId}/addresses`, { method: 'POST', body: JSON.stringify(data) }),
  deleteAddress: (custId, addressId) => request(`/customers/${custId}/addresses/${addressId}`, { method: 'DELETE' }),
  createEmails: (custId, emails) => request(`/customers/${custId}/emails`, { method: 'POST', body: JSON.stringify({ emails }) }),
  deleteEmail: (custId, emailId) => request(`/customers/${custId}/emails/${emailId}`, { method: 'DELETE' }),
  getCustomerInvoices: (id, year) => request(`/customers/${id}/invoices${year ? '?year=' + year : ''}`),
  getCustomerHistory: (id) => request(`/customers/${id}/history`),
  getCustomerCommissions: (id) => request(`/customers/${id}/commissions`),
  deactivateCustomer: (id) => request(`/customers/${id}/deactivate`, { method: 'PUT' }),
  activateCustomer: (id) => request(`/customers/${id}/activate`, { method: 'PUT' }),
  checkUniqueCustomer: (name, excludeId) => request(`/customers/check-unique?name=${encodeURIComponent(name)}${excludeId ? '&exclude_id=' + excludeId : ''}`),
  deleteCustomer: (id) => request(`/customers/${id}`, { method: 'DELETE' }),
  sendOverdueEmail: (id) => request(`/customers/${id}/send-overdue-email`, { method: 'POST' }),
  saveCustomerTerms: (id, data) => request(`/customers/${id}/terms`, { method: 'POST', body: JSON.stringify(data) }),
  saveCustomerAdditionalInfo: (id, info) => request(`/customers/${id}/additional-info`, { method: 'POST', body: JSON.stringify({ additional_info: info }) }),

  // Customer Types (CRUD)
  getCustomerTypesAll: () => request('/customer-types'),
  getCustomerType: (id) => request(`/customer-types/${id}`),
  createCustomerType: (data) => request('/customer-types', { method: 'POST', body: JSON.stringify(data) }),
  updateCustomerType: (id, data) => request(`/customer-types/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCustomerType: (id) => request(`/customer-types/${id}`, { method: 'DELETE' }),

  // Suppliers
  getSuppliers: (status) => request('/suppliers' + (status ? '?status=' + status : '')),
  getSupplier: (id) => request(`/suppliers/${id}`),
  getSupplierStats: () => request('/suppliers/stats'),
  createSupplier: (data) => request('/suppliers', { method: 'POST', body: JSON.stringify(data) }),
  updateSupplier: (id, data) => request(`/suppliers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteSupplier: (id) => request(`/suppliers/${id}`, { method: 'DELETE' }),
  getSupplierFull: (id) => request(`/suppliers/${id}/full`),
  checkUniqueSupplier: (name, excludeId) => request(`/suppliers/check-unique?name=${encodeURIComponent(name)}${excludeId ? '&exclude_id=' + excludeId : ''}`),
  addSupplierAddress: (id, data) => request(`/suppliers/${id}/addresses`, { method: 'POST', body: JSON.stringify(data) }),
  updateSupplierAddress: (id, addrId, data) => request(`/suppliers/${id}/addresses/${addrId}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteSupplierAddress: (id, addrId) => request(`/suppliers/${id}/addresses/${addrId}`, { method: 'DELETE' }),
  addSupplierContact: (id, data) => request(`/suppliers/${id}/contacts`, { method: 'POST', body: JSON.stringify(data) }),
  updateSupplierContact: (id, contactId, data) => request(`/suppliers/${id}/contacts/${contactId}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteSupplierContact: (id, contactId) => request(`/suppliers/${id}/contacts/${contactId}`, { method: 'DELETE' }),
  saveSupplierTerms: (id, data) => request(`/suppliers/${id}/terms`, { method: 'PUT', body: JSON.stringify(data) }),
  saveSupplierNotes: (id, notes) => request(`/suppliers/${id}/notes`, { method: 'PUT', body: JSON.stringify({ notes }) }),
  getSupplierAirfeetPos: (id) => request(`/suppliers/${id}/airfeet-pos`),
  getSupplierHistory: (id) => request(`/suppliers/${id}/history`),

  // Backups
  getBackups: () => request('/backups'),
  getBackupStats: () => request('/backups/stats'),
  createBackup: (type = 'full') => request('/backups/create', { method: 'POST', body: JSON.stringify({ type }) }),
  deleteBackup: (id) => request(`/backups/${id}`, { method: 'DELETE' }),
  restoreBackup: (id) => request(`/backups/${id}/restore`, { method: 'POST' }),
  getBackupSettings: () => request('/backups/settings/current'),
  saveBackupSettings: (data) => request('/backups/settings', { method: 'PUT', body: JSON.stringify(data) }),

  // Customer Import/Export
  importCustomers: async (file) => {
    const formData = new FormData()
    formData.append('file', file)
    const res = await fetch(`${API_URL}/customer-io/import`, { method: 'POST', body: formData })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Import failed')
    return data
  },
  exportCustomersUrl: () => `${API_URL}/customer-io/export`,
  templateUrl: () => `${API_URL}/customer-io/template`,

  // Airfeet PO
  getAirfeetPos: (status) => request('/airfeet-po' + (status ? '?status=' + status : '')),
  getAirfeetPoStats: () => request('/airfeet-po/stats'),
  getAirfeetPoSuppliers: () => request('/airfeet-po/suppliers'),
  getAirfeetPoFileMap: () => request('/airfeet-po/file-map'),
  getAirfeetPo: (id) => request(`/airfeet-po/${id}`),
  getAirfeetPoInvoice: (id) => request(`/airfeet-po/${id}/invoice`),
  createAirfeetPo: (data) => request('/airfeet-po', { method: 'POST', body: JSON.stringify(data) }),
  updateAirfeetPo: (id, data) => request(`/airfeet-po/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  updateAirfeetPoStatus: (id, inv_status) => request(`/airfeet-po/${id}/status`, { method: 'PUT', body: JSON.stringify({ inv_status }) }),
  copyAirfeetPo: (id) => request(`/airfeet-po/${id}/copy`, { method: 'POST' }),
  deleteAirfeetPo: (id) => request(`/airfeet-po/${id}`, { method: 'DELETE' }),
  getAirfeetPoFiles: (id) => request(`/airfeet-po/${id}/customer-po`),
  uploadAirfeetPoFiles: async (id, files) => {
    const formData = new FormData()
    files.forEach(f => formData.append('files', f))
    const res = await fetch(`${API_URL}/airfeet-po/${id}/customer-po`, { method: 'POST', body: formData })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Upload failed')
    return data
  },
  deleteAirfeetPoFile: (id, filename) => request(`/airfeet-po/${id}/customer-po/${encodeURIComponent(filename)}`, { method: 'DELETE' }),

  // Invoices
  getInvoices: (params = {}) => {
    const q = new URLSearchParams(params).toString()
    return request(`/invoices${q ? '?' + q : ''}`)
  },
  getInvoiceStats: () => request('/invoices/stats'),
  getInvoiceYears: () => request('/invoices/years'),
  getInvoiceFileMap: () => request('/invoices/file-map'),
  getInvoiceTopCustomers: (params) => {
    const q = params && Object.keys(params).length ? new URLSearchParams(params).toString() : ''
    return request(`/invoices/analytics/top-customers${q ? '?' + q : ''}`)
  },
  getInvoice: (id) => request(`/invoices/${id}`),
  getInvoiceView: (id) => request(`/invoices/${id}/invoice`),
  updateInvoiceStatus: (id, inv_status) => request(`/invoices/${id}/status`, { method: 'PUT', body: JSON.stringify({ inv_status }) }),
  updateInvoicePaid: (id, paid_value, paid_date) => request(`/invoices/${id}/paid`, { method: 'PUT', body: JSON.stringify({ paid_value, paid_date }) }),
  updateInvoiceDueDate: (id, due_date) => request(`/invoices/${id}/due-date`, { method: 'PUT', body: JSON.stringify({ due_date }) }),
  updateInvoiceTracking: (id, shipped_date, tracking_no) => request(`/invoices/${id}/tracking`, { method: 'PUT', body: JSON.stringify({ shipped_date, tracking_no }) }),
  deleteInvoice: (id) => request(`/invoices/${id}`, { method: 'DELETE' }),
  copyInvoice: (id) => request(`/invoices/${id}/copy`, { method: 'POST' }),
  bulkUpdateInvoices: (ids, paid, archive) => request('/invoices/bulk/update', { method: 'PUT', body: JSON.stringify({ ids, paid, archive }) }),
  getInvoiceCustomers: () => request('/invoices/lookup/customers'),
  createInvoice: (data) => request('/invoices', { method: 'POST', body: JSON.stringify(data) }),
  updateInvoice: (id, data) => request(`/invoices/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  // Commissions
  getCommissions: (params = {}) => {
    const q = new URLSearchParams(params).toString()
    return request(`/commissions${q ? '?' + q : ''}`)
  },
  getCommissionMap: () => request('/commissions/map'),
  getCommissionStats: () => request('/commissions/stats'),
  getCommission: (id) => request(`/commissions/${id}`),
  markCommissionPaid: (id) => request(`/commissions/${id}/paid`, { method: 'PUT' }),
  markCommissionUnpaid: (id) => request(`/commissions/${id}/unpaid`, { method: 'PUT' }),
  deleteCommission: (id) => request(`/commissions/${id}`, { method: 'DELETE' }),
  getCommissionReps: () => request('/commissions/lookup/reps'),
  getCommissionInvoices: () => request('/commissions/lookup/invoices'),
  createCommission: (data) => request('/commissions', { method: 'POST', body: JSON.stringify(data) }),
  updateCommission: (id, data) => request(`/commissions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  addCommissionPayment: (id, data) => request(`/commissions/${id}/payment`, { method: 'POST', body: JSON.stringify(data) }),
  getCommissionReport: (params = {}) => {
    const q = new URLSearchParams(params).toString()
    return request(`/commissions/report${q ? '?' + q : ''}`)
  },

  // Pilot Programs
  getPilotPrograms: (status) => request('/pilot-programs' + (status ? '?status=' + status : '')),
  getPilotProgramStats: () => request('/pilot-programs/stats'),
  getPilotProgramCustomers: () => request('/pilot-programs/lookup/customers'),
  getPilotProgramReps: () => request('/pilot-programs/lookup/reps'),
  getPilotProgram: (id) => request(`/pilot-programs/${id}`),
  createPilotProgram: (data) => request('/pilot-programs', { method: 'POST', body: JSON.stringify(data) }),
  updatePilotProgram: (id, data) => request(`/pilot-programs/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  markPilotProgramPaid: (id, data) => request(`/pilot-programs/${id}/paid`, { method: 'PUT', body: JSON.stringify(data) }),
  markPilotProgramUnpaid: (id) => request(`/pilot-programs/${id}/unpaid`, { method: 'PUT' }),
  updatePilotProgramStatus: (id, status) => request(`/pilot-programs/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),
  deletePilotProgram: (id) => request(`/pilot-programs/${id}`, { method: 'DELETE' }),
  uploadPilotProgramDocs: async (id, files, category) => {
    const formData = new FormData()
    files.forEach(f => formData.append('files', f))
    formData.append('category', category || 'reports')
    const res = await fetch(`${API_URL}/pilot-programs/${id}/documents`, { method: 'POST', body: formData })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Upload failed')
    return data
  },
  deletePilotProgramDoc: (id, docId) => request(`/pilot-programs/${id}/documents/${docId}`, { method: 'DELETE' }),
  pilotProgramFileUrl: (filename) => `${API_URL}/pilot-programs/file/${filename}`,

  // Reports
  getReportYear: () => request('/reports/year'),
  getReportMonth: (year) => request(`/reports/month${year ? '?year=' + year : ''}`),
  getReportSalesRepMonth: (year) => request(`/reports/sales-rep-month${year ? '?year=' + year : ''}`),
  getReportSalesRepYear: () => request('/reports/sales-rep-year'),
  getReportPaidInvoices: (from, to) => {
    const params = new URLSearchParams()
    if (from) params.set('from', from)
    if (to) params.set('to', to)
    const q = params.toString()
    return request(`/reports/paid-invoices${q ? '?' + q : ''}`)
  },
  getReportYears: () => request('/reports/years'),
}
