import { create } from 'zustand'
import { validateLicense } from '../utils/licenseValidator'
import { getDeviceFingerprint } from '../utils/deviceFingerprint'
import { cleanLicenseKey, parseLicenseKey } from '../utils/licenseSigner'
import { readElectronLicense, saveElectronLicense } from '../utils/electronBridge'
import schoolDataService from '../services/schoolDataService'
import useAppStore from './useAppStore'

const RECORD_ID = 'current'
const OFFLINE_GRACE_DAYS = 30
const REVALIDATE_DAYS = 7
const NON_LOCKING_INVALID_CODES = new Set([
  'MALFORMED',
  'INVALID_SIGNATURE',
  'SIGNING_KEY_MISSING',
  'DEVICE_INVALID',
])

async function isOnline() {
  if (!navigator.onLine) return false
  try {
    const ctrl = new AbortController()
    const tid = setTimeout(() => ctrl.abort(), 4000)
    await fetch('https://connectivity.gstatic.com/generate_204', {
      method: 'HEAD',
      mode: 'no-cors',
      cache: 'no-cache',
      signal: ctrl.signal,
    })
    clearTimeout(tid)
    return true
  } catch {
    return navigator.onLine
  }
}

function nowISO() {
  return new Date().toISOString()
}

async function countStudentsForLicense(licenseKey, fallbackPayload = null) {
  try {
    const payload = fallbackPayload ?? parseLicenseKey(licenseKey)?.payload
    const instituteId = payload?.instituteId
    if (!instituteId) return 0
    return schoolDataService.students.count(instituteId)
  } catch {
    return 0
  }
}

async function reconcileInstitute(payload) {
  const { instituteId, instituteName, expiresAt, featureTier, maxStudents } = payload
  if (!instituteId) return

  try {
    await schoolDataService.institutes.upsert({
      id: instituteId,
      name: instituteName ?? 'My School',
      subscriptionPlan: featureTier ?? 'basic',
      expiryDate: expiresAt ?? '',
      maxStudents: Number(maxStudents ?? 0) || 0,
    })
  } catch (err) {
    console.warn('Institute upsert failed (non-fatal):', err)
  }

  useAppStore.getState().setInstituteContext({
    id: instituteId,
    name: instituteName ?? 'My School',
    expiry: expiresAt ?? null,
  })
}

function normalizeStoredRecord(record) {
  if (!record?.licenseKey) return null
  return {
    id: RECORD_ID,
    licenseKey: record.licenseKey,
    payload: record.payload ?? null,
    deviceHash: record.deviceHash ?? null,
    activatedAt: record.activatedAt ?? nowISO(),
    lastValidatedAt: record.lastValidatedAt ?? nowISO(),
    lastOnlineAt: record.lastOnlineAt ?? nowISO(),
  }
}

async function loadStoredLicenseRecord() {
  const record = await schoolDataService.license.getCurrent()
  if (record?.licenseKey) {
    await saveElectronLicense(normalizeStoredRecord(record))
    return record
  }

  const electronRecord = normalizeStoredRecord(await readElectronLicense())
  if (!electronRecord) return null

  await schoolDataService.license.saveCurrent(electronRecord)
  return electronRecord
}

const useLicenseStore = create((set) => ({
  status: 'checking',
  lockReason: null,
  payload: null,
  warnings: [],
  daysLeft: null,
  activateError: null,
  activating: false,

  init: async () => {
    set({ status: 'checking', activateError: null })

    try {
      const record = await loadStoredLicenseRecord()
      if (!record?.licenseKey) {
        set({ status: 'unlicensed', payload: null })
        return
      }

      const online = await isOnline()
      if (online) {
        await schoolDataService.license.saveCurrent({ ...record, lastOnlineAt: nowISO() })
      }

      const studentCount = await countStudentsForLicense(record.licenseKey, record.payload)
      const lastValidated = record.lastValidatedAt ?? record.activatedAt ?? ''
      const daysSinceCheck = (Date.now() - new Date(lastValidated).getTime()) / 86400000

      let result
      if (daysSinceCheck >= REVALIDATE_DAYS || !record.payload) {
        result = await validateLicense(record.licenseKey, studentCount)
        if (result.valid) {
          const refreshedRecord = {
            ...record,
            payload: result.payload,
            lastValidatedAt: nowISO(),
          }
          await schoolDataService.license.saveCurrent(refreshedRecord)
          await saveElectronLicense(refreshedRecord)
        }
      } else {
        result = await validateLicense(record.licenseKey, studentCount)
      }

      if (result.code === 'EXPIRED') {
        set({ status: 'locked', lockReason: 'expired', payload: result.payload ?? record.payload })
        return
      }

      const lastOnline = record.lastOnlineAt ?? record.activatedAt ?? nowISO()
      const daysOffline = (Date.now() - new Date(lastOnline).getTime()) / 86400000
      const expiresAt = record.payload?.expiresAt ?? result.payload?.expiresAt
      const alreadyExpired = expiresAt && new Date(expiresAt) < new Date()

      if (!online && daysOffline > OFFLINE_GRACE_DAYS && alreadyExpired) {
        set({ status: 'locked', lockReason: 'offline-grace', payload: result.payload ?? record.payload })
        return
      }

      if (result.code === 'DEVICE_MISMATCH') {
        set({ status: 'locked', lockReason: 'device-mismatch', payload: result.payload ?? record.payload })
        return
      }

      if (NON_LOCKING_INVALID_CODES.has(result.code)) {
        set({ status: 'unlicensed', payload: null, warnings: [] })
        return
      }

      if (result.valid) {
        const activePayload = result.payload ?? record.payload
        if (!activePayload?.instituteId) {
          set({ status: 'unlicensed', payload: null })
          return
        }

        await reconcileInstitute(activePayload)

        set({
          status: 'valid',
          payload: activePayload,
          warnings: result.warnings ?? [],
          daysLeft: result.daysLeft,
          lockReason: null,
        })
        return
      }

      set({ status: 'unlicensed', payload: null })
    } catch (err) {
      console.error('License init error:', err)
      set({ status: 'unlicensed', payload: null, warnings: ['License check failed. Please restart the app.'] })
    }
  },

  activate: async (rawKey) => {
    set({ activating: true, activateError: null })

    try {
      const key = cleanLicenseKey(rawKey)
      if (!key) {
        set({ activateError: 'Please enter a license key.', activating: false })
        return false
      }

      const parsed = parseLicenseKey(key)
      const studentCount = await countStudentsForLicense(key, parsed?.payload ?? null)
      const result = await validateLicense(key, studentCount)

      if (!result.valid) {
        set({ activateError: result.error, activating: false })
        return false
      }

      if (!result.payload?.instituteId) {
        set({ activateError: 'Invalid license: instituteId is missing. Please contact your administrator.', activating: false })
        return false
      }

      const deviceHash = await getDeviceFingerprint()
      const now = nowISO()
      const existing = await schoolDataService.license.getCurrent()
      const persistedRecord = {
        id: RECORD_ID,
        licenseKey: key,
        payload: result.payload,
        deviceHash,
        activatedAt: existing?.activatedAt ?? now,
        lastValidatedAt: now,
        lastOnlineAt: now,
      }

      await schoolDataService.license.saveCurrent(persistedRecord)
      await schoolDataService.institutes.upsert({
        id: result.payload.instituteId,
        name: result.payload.instituteName ?? 'My School',
        subscriptionPlan: result.payload.featureTier ?? 'basic',
        expiryDate: result.payload.expiresAt ?? '',
        maxStudents: Number(result.payload.maxStudents ?? 0) || 0,
      })

      await saveElectronLicense(persistedRecord)

      useAppStore.getState().setInstituteContext({
        id: result.payload.instituteId,
        name: result.payload.instituteName ?? 'My School',
        expiry: result.payload.expiresAt ?? null,
      })

      set({
        status: 'valid',
        payload: result.payload,
        warnings: result.warnings ?? [],
        daysLeft: result.daysLeft,
        activateError: null,
        activating: false,
        lockReason: null,
      })
      return true
    } catch (err) {
      console.error('Activate license error:', err)
      set({ activateError: err.message ?? 'An unexpected error occurred.', activating: false })
      return false
    }
  },

  clear: async () => {
    try {
      await schoolDataService.license.deleteCurrent()
      await saveElectronLicense(null)
    } catch {
      // ignore
    }

    useAppStore.getState().clearInstituteContext()
    set({ status: 'unlicensed', payload: null, warnings: [], daysLeft: null, lockReason: null })
  },

  clearActivateError: () => set({ activateError: null }),
}))

export default useLicenseStore
