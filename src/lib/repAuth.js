// Shared utility for sales-rep role detection and rep-id resolution

let _repIdCache = undefined // undefined=not fetched, null=not found, number=found

export function isSalesRepUser(user) {
  return user?.level === 'sales-rep'
}

export function getStoredUser() {
  try { return JSON.parse(localStorage.getItem('ct_user') || '{}') } catch { return {} }
}

export async function resolveRepId(userEmail) {
  if (_repIdCache !== undefined) return _repIdCache
  const { api } = await import('./api.js')
  const reps = await api.getSalesReps('active')
  const mine = (reps || []).find(r => r.email === userEmail)
  _repIdCache = mine?.legacy_id ?? null
  return _repIdCache
}

export function clearRepIdCache() {
  _repIdCache = undefined
}
