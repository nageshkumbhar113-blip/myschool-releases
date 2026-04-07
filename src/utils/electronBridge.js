export function getElectronAPI() {
  if (typeof window === 'undefined') return null
  return window.electronAPI ?? null
}

export function isElectronRuntime() {
  return Boolean(getElectronAPI())
}

export async function readElectronLicense() {
  const api = getElectronAPI()
  if (!api?.readLicense) return null

  try {
    return await api.readLicense()
  } catch {
    return null
  }
}

export async function saveElectronLicense(record) {
  const api = getElectronAPI()
  if (!api?.saveLicense) return null

  try {
    return await api.saveLicense(record ?? null)
  } catch {
    return null
  }
}

export async function getElectronDeviceInfo() {
  const api = getElectronAPI()
  if (!api?.getDeviceId) return null

  try {
    return await api.getDeviceId()
  } catch {
    return null
  }
}
