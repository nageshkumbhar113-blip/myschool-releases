const { contextBridge, ipcRenderer } = require('electron')

function subscribe(channel, callback) {
  if (typeof callback !== 'function') return () => {}
  const handler = (_event, payload) => callback(payload)
  ipcRenderer.on(channel, handler)
  return () => ipcRenderer.removeListener(channel, handler)
}

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  readLicense: () => ipcRenderer.invoke('read-license'),
  saveLicense: (data) => ipcRenderer.invoke('save-license', data ?? null),
  getDeviceId: () => ipcRenderer.invoke('get-device-id'),
  getVersion: () => ipcRenderer.invoke('get-version'),
  onUpdateAvailable: (callback) => subscribe('update-available', callback),
  onUpdateNotAvailable: (callback) => subscribe('update-not-available', callback),
  onUpdateDownloaded: (callback) => subscribe('update-downloaded', callback),
  onDownloadProgress: (callback) => subscribe('download-progress', callback),
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  downloadUpdate: () => ipcRenderer.send('download-update'),
  installUpdate: () => ipcRenderer.invoke('install-update'),
})

contextBridge.exposeInMainWorld('schoolApi', {
  auth: {
    isConfigured: () => ipcRenderer.invoke('auth:is-configured'),
    setup: (password) => ipcRenderer.invoke('auth:setup-password', password),
    login: (password, deviceHash) => ipcRenderer.invoke('auth:login', { password, deviceHash }),
    validate: (sessionId, sessionToken, deviceHash) => ipcRenderer.invoke('auth:validate-session', { sessionId, sessionToken, deviceHash }),
    logout: (sessionId) => ipcRenderer.invoke('auth:logout', sessionId),
    changePassword: (oldPassword, newPassword) => ipcRenderer.invoke('auth:change-password', { oldPassword, newPassword }),
  },
  institutes: {
    list: (activeOnly = true) => ipcRenderer.invoke('institutes:list', activeOnly),
    get: (instituteId) => ipcRenderer.invoke('institutes:get', instituteId),
    upsert: (payload) => ipcRenderer.invoke('institutes:upsert', payload),
    delete: (instituteId) => ipcRenderer.invoke('institutes:delete', instituteId),
  },
  license: {
    getCurrent: () => ipcRenderer.invoke('license:get-current'),
    saveCurrent: (record) => ipcRenderer.invoke('license:save-current', record),
    deleteCurrent: () => ipcRenderer.invoke('license:delete-current'),
  },
  fields: {
    list: (instituteId) => ipcRenderer.invoke('fields:list', instituteId),
    create: (payload) => ipcRenderer.invoke('fields:create', payload),
    update: (fieldId, changes) => ipcRenderer.invoke('fields:update', { fieldId, changes }),
    delete: (fieldId) => ipcRenderer.invoke('fields:delete', fieldId),
    reorder: (instituteId, fields) => ipcRenderer.invoke('fields:reorder', { instituteId, fields }),
  },
  templates: {
    list: (instituteId) => ipcRenderer.invoke('templates:list', instituteId),
    getActive: (instituteId, type) => ipcRenderer.invoke('templates:get-active', { instituteId, type }),
    create: (payload) => ipcRenderer.invoke('templates:create', payload),
    save: (template) => ipcRenderer.invoke('templates:save', template),
    delete: (templateId) => ipcRenderer.invoke('templates:delete', templateId),
    markActive: (templateId) => ipcRenderer.invoke('templates:mark-active', templateId),
    clearActive: (templateId) => ipcRenderer.invoke('templates:clear-active', templateId),
  },
  settings: {
    get: (instituteId) => ipcRenderer.invoke('settings:get', instituteId),
    save: (instituteId, data) => ipcRenderer.invoke('settings:save', { instituteId, data }),
  },
})

