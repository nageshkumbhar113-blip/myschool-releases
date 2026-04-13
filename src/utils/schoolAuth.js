/**
 * schoolAuth.js
 *
 * Cryptographic utilities for school-level password authentication.
 * Uses Web Crypto API (PBKDF2) — works in browser + Electron, no external deps.
 */

// ── Helpers ────────────────────────────────────────────────────────────────

function bytesToHex(bytes) {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function hexToBytes(hex) {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16)
  }
  return bytes
}

// ── Salt / Token generation ────────────────────────────────────────────────

/** Generate a 16-byte random hex string (used as password salt or session token) */
export function generateSalt() {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return bytesToHex(bytes)
}

/** Alias — session token is same format as salt */
export const generateSessionToken = generateSalt

// ── Recovery Code ──────────────────────────────────────────────────────────

/**
 * Generate a human-readable recovery code.
 * Format: XXXXXXXX-XXXXXXXX-XXXXXXXX-XXXXXXXX (4 groups of 8 uppercase hex chars)
 */
export function generateRecoveryCode() {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  const hex = bytesToHex(bytes).toUpperCase()
  return `${hex.slice(0, 8)}-${hex.slice(8, 16)}-${hex.slice(16, 24)}-${hex.slice(24, 32)}`
}

/** Normalize recovery code input — remove dashes, uppercase, trim */
function normalizeCode(code) {
  return code.replace(/-/g, '').toUpperCase().trim()
}

// ── PBKDF2 Hashing ────────────────────────────────────────────────────────

const ITERATIONS = 100_000
const HASH_ALGO  = 'SHA-256'

/**
 * Hash a password (or recovery code) using PBKDF2.
 * @param {string} password - plaintext password
 * @param {string} salt     - hex string salt
 * @returns {Promise<string>} hex string hash
 */
export async function hashPassword(password, salt) {
  const enc        = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits'],
  )
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: hexToBytes(salt), iterations: ITERATIONS, hash: HASH_ALGO },
    keyMaterial,
    256,
  )
  return bytesToHex(new Uint8Array(bits))
}

/**
 * Verify a password against a stored hash + salt.
 * @returns {Promise<boolean>}
 */
export async function verifyPassword(password, storedHash, salt) {
  try {
    const hash = await hashPassword(password, salt)
    return hash === storedHash
  } catch {
    return false
  }
}

/**
 * Verify a recovery code against stored hash + salt.
 * Normalizes input (strips dashes, uppercases) before hashing.
 * @returns {Promise<boolean>}
 */
export async function verifyRecoveryCode(code, storedHash, salt) {
  return verifyPassword(normalizeCode(code), storedHash, salt)
}

// ── Password Rules ─────────────────────────────────────────────────────────

/**
 * Validate password against school rules.
 * @param {string} password
 * @returns {{ valid: boolean, error: string | null }}
 */
export function validatePasswordRules(password) {
  if (!password || password.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters.' }
  }
  if (!/\d/.test(password)) {
    return { valid: false, error: 'Password must contain at least 1 number.' }
  }
  return { valid: true, error: null }
}
