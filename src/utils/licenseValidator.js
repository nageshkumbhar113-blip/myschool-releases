import { getDeviceFingerprint } from './deviceFingerprint.js'
import { getAppPublicKey } from './licenseSigner.js'
import { validateSignedLicenseDocument } from './licenseValidationCore.js'

export async function validateLicense(licenseKey, studentCount = 0) {
  const [currentDeviceHash, publicKey] = await Promise.all([
    getDeviceFingerprint(),
    getAppPublicKey(),
  ])

  return validateSignedLicenseDocument(licenseKey, {
    studentCount,
    currentDeviceHash,
    publicKey,
  })
}

export function daysUntilExpiry(expiresAt) {
  const ms = new Date(expiresAt).getTime() - Date.now()
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)))
}
