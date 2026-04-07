import { parseLicenseKey, verifyLicense } from './licenseSigner.js'

const REQUIRED_FIELDS = [
  'instituteId',
  'instituteName',
  'deviceHash',
  'expiresAt',
  'featureTier',
  'maxStudents',
  'generatedAt',
]

export async function validateSignedLicenseDocument(licenseInput, {
  studentCount = 0,
  currentDeviceHash = '',
  publicKey = null,
} = {}) {
  const licenseDoc = typeof licenseInput === 'string'
    ? parseLicenseKey(licenseInput)
    : licenseInput

  if (!licenseDoc?.payload || !licenseDoc?.signature) {
    return {
      valid: false,
      code: 'MALFORMED',
      error: 'Invalid license key. Please check and try again.',
    }
  }

  const payload = licenseDoc.payload
  for (const field of REQUIRED_FIELDS) {
    if (payload[field] === undefined || payload[field] === null || payload[field] === '') {
      const deviceBindingError = field === 'deviceHash'
      return {
        valid: false,
        code: deviceBindingError ? 'DEVICE_INVALID' : 'MALFORMED',
        error: deviceBindingError ? 'Invalid device binding' : 'License key is malformed or incomplete.',
        payload,
      }
    }
  }

  if (typeof payload.deviceHash !== 'string' || payload.deviceHash.trim().length === 0) {
    return {
      valid: false,
      code: 'DEVICE_INVALID',
      error: 'Invalid device binding',
      payload,
    }
  }

  if (!publicKey) {
    return {
      valid: false,
      code: 'SIGNING_KEY_MISSING',
      error: 'License signing key unavailable on this device.',
      payload,
    }
  }

  const signatureValid = await verifyLicense(payload, licenseDoc.signature, publicKey)
  if (!signatureValid) {
    return {
      valid: false,
      code: 'INVALID_SIGNATURE',
      error: 'License tampered or invalid',
      payload,
    }
  }

  if (!currentDeviceHash || payload.deviceHash !== currentDeviceHash) {
    return {
      valid: false,
      code: 'DEVICE_MISMATCH',
      error: 'Invalid device binding',
      payload,
    }
  }

  const expiresAt = new Date(payload.expiresAt)
  const now = new Date()

  if (Number.isNaN(expiresAt.getTime())) {
    return {
      valid: false,
      code: 'MALFORMED',
      error: 'License has an invalid expiry date.',
      payload,
    }
  }

  if (expiresAt < now) {
    return {
      valid: false,
      code: 'EXPIRED',
      error: `License expired on ${expiresAt.toLocaleDateString('en-IN')}.`,
      payload,
      expiresAt,
    }
  }

  const warnings = []
  const maxStudents = Number(payload.maxStudents ?? Infinity)
  if (Number.isFinite(maxStudents) && maxStudents > 0) {
    if (studentCount >= maxStudents) {
      warnings.push(`Student limit reached (${studentCount}/${maxStudents}). Cannot add more students.`)
    } else if (studentCount >= maxStudents * 0.9) {
      warnings.push(`Approaching student limit: ${studentCount}/${maxStudents} used.`)
    }
  }

  const msLeft = expiresAt.getTime() - now.getTime()
  const daysLeft = Math.floor(msLeft / (1000 * 60 * 60 * 24))
  if (daysLeft <= 30) {
    warnings.push(`License expires in ${daysLeft} day${daysLeft === 1 ? '' : 's'}.`)
  }

  return {
    valid: true,
    payload,
    expiresAt,
    daysLeft,
    warnings,
  }
}
