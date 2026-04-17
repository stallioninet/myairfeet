import { createHash } from 'crypto'

/**
 * Hash a plain-text password with SHA1.
 * This matches the existing stored format in the database.
 */
export function hashPassword(plain) {
  return createHash('sha1').update(String(plain)).digest('hex')
}

/**
 * Compare a plain-text password against a stored SHA1 hash.
 */
export function verifyPassword(plain, stored) {
  if (!plain || !stored) return false
  return hashPassword(plain) === stored
}
