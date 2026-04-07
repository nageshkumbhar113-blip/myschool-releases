import { getDeviceFingerprint } from './deviceFingerprint'

const SESSION_TOKEN_KEY = 'superAdminSessionToken'
const SESSION_ID_KEY = 'superAdminSessionId'

function getAuthApi() {
  return window.schoolApi?.auth ?? null
}

export async function isSuperAdminConfigured() {
  const api = getAuthApi()
  if (!api) return false
  const result = await api.isConfigured()
  return result.configured
}

export async function setupSuperAdminPassword(password) {
  const api = getAuthApi()
  if (!api) throw new Error('Super admin auth is only available in the desktop app.')
  const trimmed = String(password ?? '').trim()
  if (trimmed.length < 8) {
    throw new Error('Password must be at least 8 characters long.')
  }
  await api.setup(trimmed)
}

export async function loginSuperAdmin(password) {
  const api = getAuthApi()
  if (!api) return false
  const deviceHash = await getDeviceFingerprint()
  const result = await api.login(String(password ?? ''), deviceHash)
  if (!result.ok) return false

  sessionStorage.setItem(SESSION_ID_KEY, result.sessionId)
  sessionStorage.setItem(SESSION_TOKEN_KEY, result.sessionToken)
  return true
}

export async function validateSuperAdminSession() {
  const sessionId = sessionStorage.getItem(SESSION_ID_KEY)
  const sessionToken = sessionStorage.getItem(SESSION_TOKEN_KEY)

  if (!sessionId || !sessionToken) return false

  const api = getAuthApi()
  if (!api) return false

  const deviceHash = await getDeviceFingerprint()
  const result = await api.validate(sessionId, sessionToken, deviceHash)

  if (!result.valid) {
    clearSuperAdminSession()
    return false
  }

  return true
}

export async function logoutSuperAdmin() {
  const sessionId = sessionStorage.getItem(SESSION_ID_KEY)
  const api = getAuthApi()
  if (sessionId && api) {
    await api.logout(sessionId).catch(() => {})
  }
  clearSuperAdminSession()
}

export function clearSuperAdminSession() {
  sessionStorage.removeItem(SESSION_ID_KEY)
  sessionStorage.removeItem(SESSION_TOKEN_KEY)
}
