function ensureSchoolApi() {
  const api = window.schoolApi
  if (!api) {
    throw new Error('window.schoolApi is unavailable. Check Electron preload configuration.')
  }
  return api
}

export const schoolDataService = {
  diagnostics: {
    getDbInfo() {
      return ensureSchoolApi().diagnostics.getDbInfo()
    },
  },
  students: {
    list(instituteId = null) {
      return ensureSchoolApi().students.list(instituteId)
    },
    get(studentId) {
      return ensureSchoolApi().students.get(studentId)
    },
    count(instituteId = null) {
      return ensureSchoolApi().students.count(instituteId)
    },
    recordLCPrint(studentId) {
      return ensureSchoolApi().students.recordLCPrint(studentId)
    },
    getNextAdmissionNo(instituteId) {
      return ensureSchoolApi().students.getNextAdmissionNo(instituteId)
    },
    create(payload) {
      return ensureSchoolApi().students.create(payload)
    },
    update(studentId, changes) {
      return ensureSchoolApi().students.update(studentId, changes)
    },
    delete(studentId) {
      return ensureSchoolApi().students.delete(studentId)
    },
  },
  fees: {
    list(instituteId = null) {
      return ensureSchoolApi().fees.list(instituteId)
    },
    update(feeId, changes) {
      return ensureSchoolApi().fees.update(feeId, changes)
    },
    addInstallment(studentId, payload) {
      return ensureSchoolApi().fees.addInstallment(studentId, payload)
    },
  },
  receipts: {
    list(instituteId = null) {
      return ensureSchoolApi().receipts.list(instituteId)
    },
    getData(receiptId) {
      return ensureSchoolApi().receipts.getData(receiptId)
    },
    cancel(receiptId, cancelReason = '') {
      return ensureSchoolApi().receipts.cancel(receiptId, cancelReason)
    },
  },
  fields: {
    list(instituteId) {
      return ensureSchoolApi().fields.list(instituteId)
    },
    create(payload) {
      return ensureSchoolApi().fields.create(payload)
    },
    update(fieldId, changes) {
      return ensureSchoolApi().fields.update(fieldId, changes)
    },
    delete(fieldId) {
      return ensureSchoolApi().fields.delete(fieldId)
    },
    reorder(instituteId, fields) {
      return ensureSchoolApi().fields.reorder(instituteId, fields)
    },
  },
  templates: {
    list(instituteId) {
      return ensureSchoolApi().templates.list(instituteId)
    },
    getActive(instituteId, type) {
      return ensureSchoolApi().templates.getActive(instituteId, type)
    },
    create(payload) {
      return ensureSchoolApi().templates.create(payload)
    },
    save(template) {
      return ensureSchoolApi().templates.save(template)
    },
    delete(templateId) {
      return ensureSchoolApi().templates.delete(templateId)
    },
    markActive(templateId) {
      return ensureSchoolApi().templates.markActive(templateId)
    },
    clearActive(templateId) {
      return ensureSchoolApi().templates.clearActive(templateId)
    },
  },
  settings: {
    get(instituteId) {
      return ensureSchoolApi().settings.get(instituteId)
    },
    save(instituteId, data) {
      return ensureSchoolApi().settings.save(instituteId, data)
    },
  },
  schoolAuth: {
    getStatus() {
      return ensureSchoolApi().schoolAuth.getStatus()
    },
    migrateLegacy(record) {
      return ensureSchoolApi().schoolAuth.migrateLegacy(record)
    },
    setup(password) {
      return ensureSchoolApi().schoolAuth.setup(password)
    },
    login(password) {
      return ensureSchoolApi().schoolAuth.login(password)
    },
    validateSession(sessionToken) {
      return ensureSchoolApi().schoolAuth.validateSession(sessionToken)
    },
    logout(sessionToken) {
      return ensureSchoolApi().schoolAuth.logout(sessionToken)
    },
    changePassword(currentPassword, newPassword) {
      return ensureSchoolApi().schoolAuth.changePassword(currentPassword, newPassword)
    },
    regenerateRecoveryCode(currentPassword) {
      return ensureSchoolApi().schoolAuth.regenerateRecoveryCode(currentPassword)
    },
    verifyRecoveryCode(code) {
      return ensureSchoolApi().schoolAuth.verifyRecoveryCode(code)
    },
    resetPasswordWithCode(recoveryCode, newPassword) {
      return ensureSchoolApi().schoolAuth.resetPasswordWithCode(recoveryCode, newPassword)
    },
  },
  documents: {
    list(instituteId) {
      return ensureSchoolApi().documents.list(instituteId)
    },
    create(payload) {
      return ensureSchoolApi().documents.create(payload)
    },
    delete(documentId) {
      return ensureSchoolApi().documents.delete(documentId)
    },
  },
  institutes: {
    list(activeOnly = true) {
      return ensureSchoolApi().institutes.list(activeOnly)
    },
    get(instituteId) {
      return ensureSchoolApi().institutes.get(instituteId)
    },
    upsert(payload) {
      return ensureSchoolApi().institutes.upsert(payload)
    },
    delete(instituteId) {
      return ensureSchoolApi().institutes.delete(instituteId)
    },
  },
  license: {
    getCurrent() {
      return ensureSchoolApi().license.getCurrent()
    },
    saveCurrent(record) {
      return ensureSchoolApi().license.saveCurrent(record)
    },
    deleteCurrent() {
      return ensureSchoolApi().license.deleteCurrent()
    },
  },
  backup: {
    getCounts() {
      return ensureSchoolApi().backup.getCounts()
    },
    exportData(params = {}) {
      return ensureSchoolApi().backup.exportData(params)
    },
    apply(backup) {
      return ensureSchoolApi().backup.apply(backup)
    },
  },
  promotion: {
    getYears(instituteId) {
      return ensureSchoolApi().promotion.getYears(instituteId)
    },
    getClasses(instituteId, academicYear) {
      return ensureSchoolApi().promotion.getClasses(instituteId, academicYear)
    },
    listStudents(instituteId, academicYear, filterClass = '') {
      return ensureSchoolApi().promotion.listStudents(instituteId, academicYear, filterClass)
    },
    preview(studentIds, targetClass, targetAcademicYear, instituteId) {
      return ensureSchoolApi().promotion.preview(studentIds, targetClass, targetAcademicYear, instituteId)
    },
    apply(studentIds, targetClass, targetAcademicYear, instituteId, feeDefaults = {}) {
      return ensureSchoolApi().promotion.apply(studentIds, targetClass, targetAcademicYear, instituteId, feeDefaults)
    },
  },
}

export default schoolDataService
