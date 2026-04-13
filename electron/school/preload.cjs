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
  onUpdateError: (callback) => subscribe('update-error', callback),
  onUpdateDownloaded: (callback) => subscribe('update-downloaded', callback),
  onDownloadProgress: (callback) => subscribe('download-progress', callback),
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  downloadUpdate: () => ipcRenderer.send('download-update'),
  installUpdate: () => ipcRenderer.invoke('install-update'),
})

contextBridge.exposeInMainWorld('schoolApi', {
  students: {
    list: (instituteId) => ipcRenderer.invoke('students:list', instituteId ?? null),
    get: (studentId) => ipcRenderer.invoke('students:get', studentId),
    count: (instituteId) => ipcRenderer.invoke('students:count', instituteId ?? null),
    recordLCPrint: (studentId) => ipcRenderer.invoke('students:recordLCPrint', studentId),
    getNextAdmissionNo: (instituteId) => ipcRenderer.invoke('students:getNextAdmissionNo', { instituteId }),
    create: (payload) => ipcRenderer.invoke('students:create', payload),
    update: (studentId, changes) => ipcRenderer.invoke('students:update', { studentId, changes }),
    delete: (studentId) => ipcRenderer.invoke('students:delete', studentId),
  },
  fees: {
    list: (instituteId) => ipcRenderer.invoke('fees:list', instituteId ?? null),
    update: (feeId, changes) => ipcRenderer.invoke('fees:update', { feeId, changes }),
    addInstallment: (studentId, payload) => ipcRenderer.invoke('fees:add-installment', { studentId, payload }),
  },
  receipts: {
    list: (instituteId) => ipcRenderer.invoke('receipts:list', instituteId ?? null),
    getData: (receiptId) => ipcRenderer.invoke('receipts:get-data', receiptId),
    cancel: (receiptId, cancelReason) => ipcRenderer.invoke('receipts:cancel', { receiptId, cancelReason }),
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
  schoolAuth: {
    getStatus: () => ipcRenderer.invoke('school-auth:get-status'),
    migrateLegacy: (record) => ipcRenderer.invoke('school-auth:migrate-legacy', record),
    setup: (password) => ipcRenderer.invoke('school-auth:setup', password),
    login: (password) => ipcRenderer.invoke('school-auth:login', password),
    validateSession: (sessionToken) => ipcRenderer.invoke('school-auth:validate-session', sessionToken),
    logout: (sessionToken) => ipcRenderer.invoke('school-auth:logout', sessionToken),
    changePassword: (currentPassword, newPassword) => ipcRenderer.invoke('school-auth:change-password', { currentPassword, newPassword }),
    regenerateRecoveryCode: (currentPassword) => ipcRenderer.invoke('school-auth:regenerate-recovery-code', currentPassword),
    verifyRecoveryCode: (code) => ipcRenderer.invoke('school-auth:verify-recovery-code', code),
    resetPasswordWithCode: (recoveryCode, newPassword) => ipcRenderer.invoke('school-auth:reset-password-with-code', { recoveryCode, newPassword }),
  },
  documents: {
    list: (instituteId) => ipcRenderer.invoke('documents:list', instituteId),
    create: (payload) => ipcRenderer.invoke('documents:create', payload),
    delete: (documentId) => ipcRenderer.invoke('documents:delete', documentId),
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
  backup: {
    getCounts: () => ipcRenderer.invoke('school:data:get-counts'),
    exportData: (params) => ipcRenderer.invoke('school:data:export-backup', params ?? {}),
    apply: (backup) => ipcRenderer.invoke('school:data:apply-backup', backup),
  },
  promotion: {
    getYears: (instituteId) => ipcRenderer.invoke('promotion:get-years', instituteId),
    getClasses: (instituteId, academicYear) => ipcRenderer.invoke('promotion:get-classes', { instituteId, academicYear }),
    listStudents: (instituteId, academicYear, filterClass = '') => ipcRenderer.invoke('promotion:list-students', { instituteId, academicYear, filterClass }),
    preview: (studentIds, targetClass, targetAcademicYear, instituteId) => ipcRenderer.invoke('promotion:preview', { studentIds, targetClass, targetAcademicYear, instituteId }),
    apply: (studentIds, targetClass, targetAcademicYear, instituteId, feeDefaults = {}) => ipcRenderer.invoke('promotion:apply', { studentIds, targetClass, targetAcademicYear, instituteId, feeDefaults }),
  },
  diagnostics: {
    getDbInfo: () => ipcRenderer.invoke('school:data:get-db-info'),
  },
  auth: {
    isConfigured: () => ipcRenderer.invoke('auth:is-configured'),
    setup: (password) => ipcRenderer.invoke('auth:setup-password', password),
    login: (password, deviceHash) => ipcRenderer.invoke('auth:login', { password, deviceHash }),
    validate: (sessionId, sessionToken, deviceHash) => ipcRenderer.invoke('auth:validate-session', { sessionId, sessionToken, deviceHash }),
    logout: (sessionId) => ipcRenderer.invoke('auth:logout', sessionId),
    changePassword: (oldPassword, newPassword) => ipcRenderer.invoke('auth:change-password', { oldPassword, newPassword }),
  },
})
