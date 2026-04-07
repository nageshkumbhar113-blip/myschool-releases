/**
 * deviceFingerprint.js
 *
 * Generates a stable SHA-256 fingerprint for the current device/browser.
 * Electron runtime uses a native device seed from the preload bridge.
 * License validation now uses STRICT exact matching only.
 */

import { getElectronDeviceInfo } from './electronBridge'

const DB_NAME = 'myschool_fp_store'
const STORE_NAME = 'anchor'
const ANCHOR_KEY = 'device_anchor_v1'

let electronDeviceInfoPromise = null
let fingerprintCache = null

function openAnchorDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = e => {
      e.target.result.createObjectStore(STORE_NAME)
    }
    req.onsuccess = e => resolve(e.target.result)
    req.onerror = () => reject(req.error)
  })
}

async function getNativeElectronSeed() {
  if (electronDeviceInfoPromise) return electronDeviceInfoPromise
  electronDeviceInfoPromise = getElectronDeviceInfo().catch(() => null)
  return electronDeviceInfoPromise
}

async function getOrCreateAnchor() {
  const electronInfo = await getNativeElectronSeed()
  if (electronInfo?.hash) return electronInfo.hash

  try {
    const db = await openAnchorDB()
    const existing = await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const req = tx.objectStore(STORE_NAME).get(ANCHOR_KEY)
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })

    if (existing) return existing

    const anchor = crypto.randomUUID
      ? crypto.randomUUID()
      : Array.from(crypto.getRandomValues(new Uint8Array(16)))
        .map(byte => byte.toString(16).padStart(2, '0'))
        .join('')

    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const req = tx.objectStore(STORE_NAME).put(anchor, ANCHOR_KEY)
      req.onsuccess = () => resolve()
      req.onerror = () => reject(req.error)
    })

    return anchor
  } catch {
    const lsKey = 'mslms_device_anchor'
    let anchor = localStorage.getItem(lsKey)
    if (!anchor) {
      anchor = Array.from(crypto.getRandomValues(new Uint8Array(16)))
        .map(byte => byte.toString(16).padStart(2, '0'))
        .join('')
      localStorage.setItem(lsKey, anchor)
    }
    return anchor
  }
}

function collectFingerprintSignals() {
  const timeZone = (() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone
    } catch {
      return 'unknown'
    }
  })()

  const userAgent = navigator.userAgent ?? ''
  const platformFamily = (() => {
    if (/Windows/i.test(userAgent)) return 'Windows'
    if (/Macintosh|Mac OS/i.test(userAgent)) return 'Mac'
    if (/Linux/i.test(userAgent)) return 'Linux'
    if (/Android/i.test(userAgent)) return 'Android'
    if (/iPhone|iPad/i.test(userAgent)) return 'iOS'
    return 'Unknown'
  })()

  const webglRenderer = (() => {
    try {
      const canvas = document.createElement('canvas')
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
      if (!gl) return 'no-webgl'
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info')
      if (!debugInfo) return 'no-ext'
      return gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) ?? 'unknown'
    } catch {
      return 'webgl-error'
    }
  })()

  return [
    `${screen.width}x${screen.height}`,
    String(screen.colorDepth ?? 24),
    String(navigator.hardwareConcurrency ?? 0),
    String(navigator.deviceMemory ?? 0),
    timeZone,
    platformFamily,
    (navigator.language ?? '').split('-')[0],
    String(navigator.maxTouchPoints ?? 0),
    webglRenderer,
  ].join('|')
}

async function sha256(str) {
  const encoded = new TextEncoder().encode(str)
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoded)
  return Array.from(new Uint8Array(hashBuffer))
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('')
}

export async function getDeviceFingerprint() {
  if (fingerprintCache) return fingerprintCache

  const electronInfo = await getNativeElectronSeed()
  if (electronInfo?.hash) {
    fingerprintCache = electronInfo.hash
    return fingerprintCache
  }

  const [anchor, signals] = await Promise.all([
    getOrCreateAnchor(),
    Promise.resolve(collectFingerprintSignals()),
  ])

  fingerprintCache = await sha256(`${signals}||${anchor}`)
  return fingerprintCache
}

export async function getShortDeviceId() {
  const electronInfo = await getNativeElectronSeed()
  if (electronInfo?.shortId) return electronInfo.shortId

  const fp = await getDeviceFingerprint()
  return formatShortDeviceId(fp)
}

export async function isCurrentDeviceHash(storedHash) {
  if (!storedHash || typeof storedHash !== 'string') return false
  const currentDeviceHash = await getDeviceFingerprint()
  return storedHash === currentDeviceHash
}

export function formatShortDeviceId(deviceHash) {
  const normalized = String(deviceHash ?? '').trim()
  return normalized.slice(0, 16).toUpperCase().match(/.{1,4}/g)?.join('-') ?? normalized.slice(0, 16)
}
