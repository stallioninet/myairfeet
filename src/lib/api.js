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
  loginUser: (email) => request('/users/login', { method: 'POST', body: JSON.stringify({ email }) }),
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

  // Product Items
  getProducts: () => request('/products'),
  getProduct: (id) => request(`/products/${id}`),
  createProduct: (data) => request('/products', { method: 'POST', body: JSON.stringify(data) }),
  updateProduct: (id, data) => request(`/products/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  duplicateProduct: (id) => request(`/products/${id}/duplicate`, { method: 'POST' }),
  deactivateProduct: (id) => request(`/products/${id}/deactivate`, { method: 'PUT' }),
  activateProduct: (id) => request(`/products/${id}/activate`, { method: 'PUT' }),
  deleteProduct: (id) => request(`/products/${id}`, { method: 'DELETE' }),

  // Product Sizes
  getProductSizes: () => request('/product-sizes'),
  getProductSize: (id) => request(`/product-sizes/${id}`),
  createProductSize: (data) => request('/product-sizes', { method: 'POST', body: JSON.stringify(data) }),
  updateProductSize: (id, data) => request(`/product-sizes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deactivateProductSize: (id) => request(`/product-sizes/${id}/deactivate`, { method: 'PUT' }),
  activateProductSize: (id) => request(`/product-sizes/${id}/activate`, { method: 'PUT' }),
  deleteProductSize: (id) => request(`/product-sizes/${id}`, { method: 'DELETE' }),

  // Item Size Maps
  getItemSizeMaps: () => request('/item-size-maps'),
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
  getSalesRepStats: () => request('/sales-reps/stats'),
  createSalesRep: (data) => request('/sales-reps', { method: 'POST', body: JSON.stringify(data) }),
  updateSalesRep: (id, data) => request(`/sales-reps/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  activateSalesRep: (id) => request(`/sales-reps/${id}/activate`, { method: 'PUT' }),
  deactivateSalesRep: (id) => request(`/sales-reps/${id}/deactivate`, { method: 'PUT' }),
  deleteSalesRep: (id) => request(`/sales-reps/${id}`, { method: 'DELETE' }),
  seedSalesReps: () => request('/sales-reps/seed', { method: 'POST' }),

  // Backups
  getBackups: () => request('/backups'),
  getBackupStats: () => request('/backups/stats'),
  createBackup: (type = 'full') => request('/backups/create', { method: 'POST', body: JSON.stringify({ type }) }),
  deleteBackup: (id) => request(`/backups/${id}`, { method: 'DELETE' }),
  restoreBackup: (id) => request(`/backups/${id}/restore`, { method: 'POST' }),
  getBackupSettings: () => request('/backups/settings/current'),
  saveBackupSettings: (data) => request('/backups/settings', { method: 'PUT', body: JSON.stringify(data) }),
}
