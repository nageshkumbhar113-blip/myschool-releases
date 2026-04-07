import { APP_LICENSE_PUBLIC_KEY_JWK } from './licensePublicKey.js'

const SIGN_ALGORITHM = { name: 'ECDSA', namedCurve: 'P-256' }
const SIGN_PARAMS = { name: 'ECDSA', hash: 'SHA-256' }

function bytesToBinary(bytes) {
  let binary = ''
  const chunkSize = 0x8000
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.slice(i, i + chunkSize))
  }
  return binary
}

function encodeBase64Url(bytes) {
  const binary = bytesToBinary(bytes)
  const base64 = typeof btoa === 'function'
    ? btoa(binary)
    : Buffer.from(binary, 'binary').toString('base64')

  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

function decodeBase64Url(value) {
  const clean = String(value ?? '').replace(/\s/g, '')
  const padded = clean.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - clean.length % 4) % 4)
  const binary = typeof atob === 'function'
    ? atob(padded)
    : Buffer.from(padded, 'base64').toString('binary')
  return Uint8Array.from(binary, char => char.charCodeAt(0))
}

function normalizeValue(value) {
  if (Array.isArray(value)) {
    return value.map(normalizeValue)
  }
  if (value && typeof value === 'object') {
    return Object.keys(value)
      .sort()
      .reduce((acc, key) => {
        acc[key] = normalizeValue(value[key])
        return acc
      }, {})
  }
  return value
}

export function stableStringify(value) {
  return JSON.stringify(normalizeValue(value))
}

export async function generateKeyPair() {
  return crypto.subtle.generateKey(SIGN_ALGORITHM, true, ['sign', 'verify'])
}

export async function exportPublicKey(publicKey) {
  return crypto.subtle.exportKey('jwk', publicKey)
}

export async function exportPrivateKey(privateKey) {
  return crypto.subtle.exportKey('jwk', privateKey)
}

export async function importPublicKey(publicKeyJwk) {
  if (!publicKeyJwk) return null
  return crypto.subtle.importKey('jwk', publicKeyJwk, SIGN_ALGORITHM, true, ['verify'])
}

export async function importPrivateKey(privateKeyJwk) {
  if (!privateKeyJwk) return null
  return crypto.subtle.importKey('jwk', privateKeyJwk, SIGN_ALGORITHM, true, ['sign'])
}

export async function signLicense(payload, privateKey) {
  const normalizedPayload = normalizeValue(payload)
  const data = new TextEncoder().encode(stableStringify(normalizedPayload))
  const signature = await crypto.subtle.sign(SIGN_PARAMS, privateKey, data)
  return encodeBase64Url(new Uint8Array(signature))
}

export async function verifyLicense(payload, signature, publicKey) {
  try {
    if (!publicKey || !signature) return false
    const normalizedPayload = normalizeValue(payload)
    const data = new TextEncoder().encode(stableStringify(normalizedPayload))
    const signatureBytes = decodeBase64Url(signature)
    return crypto.subtle.verify(SIGN_PARAMS, publicKey, signatureBytes, data)
  } catch {
    return false
  }
}

export function cleanLicenseKey(key) {
  return String(key ?? '').replace(/\s/g, '')
}

export function formatLicenseKey(rawKey) {
  const clean = cleanLicenseKey(rawKey)
  return clean.match(/.{1,16}/g)?.join(' ') ?? clean
}

export function serializeLicense(payload, signature) {
  const doc = {
    payload: normalizeValue(payload),
    signature: String(signature ?? ''),
  }
  return encodeBase64Url(new TextEncoder().encode(JSON.stringify(doc)))
}

export function parseLicenseKey(rawLicense) {
  try {
    const clean = cleanLicenseKey(rawLicense)
    if (!clean) return null
    const decoded = new TextDecoder().decode(decodeBase64Url(clean))
    const parsed = JSON.parse(decoded)
    if (!parsed || typeof parsed !== 'object') return null
    if (!parsed.payload || typeof parsed.payload !== 'object') return null
    if (typeof parsed.signature !== 'string' || !parsed.signature.trim()) return null
    return {
      payload: normalizeValue(parsed.payload),
      signature: parsed.signature.trim(),
    }
  } catch {
    return null
  }
}

export async function getAppPublicKey() {
  return importPublicKey(APP_LICENSE_PUBLIC_KEY_JWK)
}
