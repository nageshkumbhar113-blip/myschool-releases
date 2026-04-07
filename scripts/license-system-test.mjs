import { webcrypto } from 'node:crypto'

if (!globalThis.crypto) {
  globalThis.crypto = webcrypto
}

if (!globalThis.atob) {
  globalThis.atob = (value) => Buffer.from(value, 'base64').toString('binary')
}

if (!globalThis.btoa) {
  globalThis.btoa = (value) => Buffer.from(value, 'binary').toString('base64')
}

const {
  generateKeyPair,
  signLicense,
  serializeLicense,
  parseLicenseKey,
} = await import('../src/utils/licenseSigner.js')
const { validateSignedLicenseDocument } = await import('../src/utils/licenseValidationCore.js')

function assert(condition, message) {
  if (!condition) {
    throw new Error(message)
  }
}

function encodeLicenseDoc(doc) {
  return Buffer.from(JSON.stringify(doc), 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

const { publicKey, privateKey } = await generateKeyPair()
const validPayload = {
  instituteId: 'inst-1',
  instituteName: 'NKS Education',
  deviceHash: 'DEVICE-ABC-123',
  expiresAt: '2099-12-31',
  maxStudents: 500,
  featureTier: 'pro',
  generatedAt: '2026-04-05T00:00:00.000Z',
}

const validSignature = await signLicense(validPayload, privateKey)
const validLicense = serializeLicense(validPayload, validSignature)

const validResult = await validateSignedLicenseDocument(validLicense, {
  publicKey,
  currentDeviceHash: validPayload.deviceHash,
  studentCount: 100,
})
assert(validResult.valid, 'Test 1 failed: valid license should pass')

const tamperedDoc = parseLicenseKey(validLicense)
tamperedDoc.payload.maxStudents = 9999
const tamperedLicense = encodeLicenseDoc(tamperedDoc)
const tamperedResult = await validateSignedLicenseDocument(tamperedLicense, {
  publicKey,
  currentDeviceHash: validPayload.deviceHash,
  studentCount: 100,
})
assert(!tamperedResult.valid && tamperedResult.code === 'INVALID_SIGNATURE', 'Test 2 failed: modified payload should fail signature check')

const wrongDeviceResult = await validateSignedLicenseDocument(validLicense, {
  publicKey,
  currentDeviceHash: 'DEVICE-WRONG-999',
  studentCount: 100,
})
assert(!wrongDeviceResult.valid && wrongDeviceResult.code === 'DEVICE_MISMATCH', 'Test 3 failed: wrong device should fail')

const expiredPayload = {
  ...validPayload,
  expiresAt: '2020-01-01',
}
const expiredSignature = await signLicense(expiredPayload, privateKey)
const expiredLicense = serializeLicense(expiredPayload, expiredSignature)
const expiredResult = await validateSignedLicenseDocument(expiredLicense, {
  publicKey,
  currentDeviceHash: expiredPayload.deviceHash,
  studentCount: 100,
})
assert(!expiredResult.valid && expiredResult.code === 'EXPIRED', 'Test 4 failed: expired license should fail')

const fakeSignatureLicense = serializeLicense(validPayload, 'fake-signature')
const fakeSignatureResult = await validateSignedLicenseDocument(fakeSignatureLicense, {
  publicKey,
  currentDeviceHash: validPayload.deviceHash,
  studentCount: 100,
})
assert(!fakeSignatureResult.valid && fakeSignatureResult.code === 'INVALID_SIGNATURE', 'Test 5 failed: fake signature should fail')

const wildcardPayload = {
  ...validPayload,
  deviceHash: '*',
}
const wildcardSignature = await signLicense(wildcardPayload, privateKey)
const wildcardLicense = serializeLicense(wildcardPayload, wildcardSignature)
const wildcardResult = await validateSignedLicenseDocument(wildcardLicense, {
  publicKey,
  currentDeviceHash: validPayload.deviceHash,
  studentCount: 100,
})
assert(!wildcardResult.valid && wildcardResult.code === 'DEVICE_MISMATCH', 'Test 6 failed: wildcard device hash must not pass')

console.log('Test 1: Valid license -> PASS')
console.log('Test 2: Modified payload -> FAIL as expected')
console.log('Test 3: Wrong device -> FAIL as expected')
console.log('Test 4: Expired -> FAIL as expected')
console.log('Test 5: Fake signature -> FAIL as expected')
console.log('Test 6: Wildcard device hash -> FAIL as expected')
