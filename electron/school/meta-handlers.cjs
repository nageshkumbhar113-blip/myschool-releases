const crypto = require('crypto')
const { ipcMain } = require('electron')
const { getDb, getNowIso } = require('./sqlite.cjs')

const BACKUP_TABLES = ['institutes', 'fields', 'templates', 'students', 'fees', 'receipts', 'counters', 'settings', 'audit_logs', 'documents']

function parseJson(value, fallback) {
  if (!value) return fallback
  try {
    return JSON.parse(value)
  } catch {
    return fallback
  }
}

function toNumber(value, fallback = 0) {
  const num = Number(value)
  return Number.isFinite(num) ? num : fallback
}

function mapInstitute(row) {
  if (!row) return null
  return {
    id: row.id,
    name: row.name,
    subscriptionPlan: row.subscription_plan ?? 'basic',
    expiryDate: row.expiry_date ?? '',
    maxStudents: Number(row.max_students ?? 0) || 0,
    address: row.address ?? '',
    location: row.location ?? '',
    phone: row.phone ?? '',
    email: row.email ?? '',
    principalName: row.principal_name ?? '',
    paymentAmount: Number(row.payment_amount ?? 0) || 0,
    paymentDate: row.payment_date ?? '',
    paymentStatus: row.payment_status ?? '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at ?? null,
  }
}

function mapField(row) {
  if (!row) return null
  return {
    id: row.id,
    instituteId: row.institute_id,
    label: row.label,
    key: row.field_key,
    type: row.field_type,
    options: parseJson(row.options_json, []),
    validation: parseJson(row.validation_json, {}),
    meta: parseJson(row.meta_json, {}),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at ?? null,
  }
}

function mapTemplate(row) {
  if (!row) return null
  return {
    id: row.id,
    instituteId: row.institute_id,
    name: row.name,
    type: row.template_type,
    pageSize: row.page_size ?? 'A4',
    backgroundImage: row.background_image ?? null,
    fieldMappings: parseJson(row.field_mappings_json, []),
    excludedFieldKeys: parseJson(row.excluded_field_keys_json, []),
    headerConfig: parseJson(row.header_config_json, {}),
    isLocked: Boolean(row.is_locked),
    isActive: Boolean(row.is_active),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at ?? null,
  }
}

function mapSettings(row) {
  if (!row) return null
  return {
    id: row.id,
    instituteId: row.institute_id,
    ...parseJson(row.data_json, {}),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapDocument(row) {
  if (!row) return null
  return {
    id: row.id,
    instituteId: row.institute_id,
    studentId: row.student_id,
    fileName: row.file_name,
    fileType: row.file_type ?? '',
    fileSize: Number(row.file_size ?? 0),
    docType: row.doc_type ?? 'Other',
    blob: row.blob,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at ?? null,
  }
}

function mapLicense(row) {
  if (!row) return null
  return { id: row.id, ...parseJson(row.data_json, {}) }
}

function mapStudent(row) {
  if (!row) return null
  const dynamicFields = parseJson(row.dynamic_fields, {})
  if (!dynamicFields.studentName) dynamicFields.studentName = row.full_name ?? ''
  return {
    id: row.id,
    instituteId: row.institute_id,
    rollNumber: row.roll_number ?? '',
    class: row.class_name ?? '',
    medium: row.medium ?? 'English',
    board: row.board ?? 'State Board',
    academicYear: row.academic_year ?? '',
    status: row.status ?? 'active',
    dynamicFields,
    fullName: row.full_name ?? dynamicFields.studentName ?? '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at ?? null,
  }
}

function mapFee(row) {
  if (!row) return null
  return {
    id: row.id,
    studentId: row.student_id,
    instituteId: row.institute_id,
    academicYear: row.academic_year ?? '',
    totalFee: toNumber(row.total_fee),
    discount: toNumber(row.discount),
    effectiveFee: toNumber(row.effective_fee),
    paidAmount: toNumber(row.paid_amount),
    remainingAmount: toNumber(row.remaining_amount),
    installments: parseJson(row.installments_json, []),
    dueDate: row.due_date ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at ?? null,
  }
}

function mapReceipt(row) {
  if (!row) return null
  return {
    id: row.id,
    studentId: row.student_id,
    instituteId: row.institute_id,
    receiptNumber: row.receipt_number,
    amount: toNumber(row.amount),
    paymentDate: row.payment_date ?? null,
    paymentMode: row.payment_mode ?? 'Cash',
    installmentNumber: row.installment_number ?? null,
    status: row.status ?? 'active',
    cancelReason: row.cancel_reason ?? '',
    cancelledAt: row.cancelled_at ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at ?? null,
  }
}

function mapCounter(row) {
  if (!row) return null
  return {
    id: row.id,
    instituteId: row.institute_id,
    key: row.key,
    value: Number(row.value ?? 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapAudit(row) {
  if (!row) return null
  return {
    id: row.id,
    instituteId: row.institute_id ?? null,
    action: row.action,
    tableName: row.table_name,
    recordId: row.record_id,
    before: parseJson(row.before_json, null),
    after: parseJson(row.after_json, null),
    timestamp: row.timestamp,
  }
}

function insertAudit(database, { instituteId = null, action, tableName, recordId, before = null, after = null }) {
  database.prepare(`
    INSERT INTO audit_logs (id, institute_id, action, table_name, record_id, before_json, after_json, timestamp)
    VALUES (@id, @institute_id, @action, @table_name, @record_id, @before_json, @after_json, @timestamp)
  `).run({
    id: crypto.randomUUID(),
    institute_id: instituteId,
    action,
    table_name: tableName,
    record_id: recordId,
    before_json: before ? JSON.stringify(before) : null,
    after_json: after ? JSON.stringify(after) : null,
    timestamp: getNowIso(),
  })
}

function upsertInstitute(database, record) {
  const now = record.updatedAt || getNowIso()
  const createdAt = record.createdAt || now
  database.prepare(`
    INSERT INTO institutes (
      id, name, subscription_plan, expiry_date, max_students,
      address, location, phone, email, principal_name,
      payment_amount, payment_date, payment_status,
      created_at, updated_at, deleted_at
    )
    VALUES (
      @id, @name, @subscription_plan, @expiry_date, @max_students,
      @address, @location, @phone, @email, @principal_name,
      @payment_amount, @payment_date, @payment_status,
      @created_at, @updated_at, @deleted_at
    )
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      subscription_plan = excluded.subscription_plan,
      expiry_date = excluded.expiry_date,
      max_students = excluded.max_students,
      address = excluded.address,
      location = excluded.location,
      phone = excluded.phone,
      email = excluded.email,
      principal_name = excluded.principal_name,
      payment_amount = excluded.payment_amount,
      payment_date = excluded.payment_date,
      payment_status = excluded.payment_status,
      created_at = excluded.created_at,
      updated_at = excluded.updated_at,
      deleted_at = excluded.deleted_at
  `).run({
    id: record.id,
    name: record.name || 'My School',
    subscription_plan: record.subscriptionPlan || 'basic',
    expiry_date: record.expiryDate || '',
    max_students: Number(record.maxStudents || 0) || 0,
    address: record.address ?? '',
    location: record.location ?? '',
    phone: record.phone ?? '',
    email: record.email ?? '',
    principal_name: record.principalName ?? '',
    payment_amount: Number(record.paymentAmount ?? 0) || 0,
    payment_date: record.paymentDate ?? '',
    payment_status: record.paymentStatus ?? '',
    created_at: createdAt,
    updated_at: now,
    deleted_at: record.deletedAt ?? null,
  })
}

function upsertField(database, record) {
  const now = record.updatedAt || getNowIso()
  const createdAt = record.createdAt || now
  database.prepare(`
    INSERT INTO fields (id, institute_id, label, field_key, field_type, options_json, validation_json, meta_json, created_at, updated_at, deleted_at)
    VALUES (@id, @institute_id, @label, @field_key, @field_type, @options_json, @validation_json, @meta_json, @created_at, @updated_at, @deleted_at)
    ON CONFLICT(id) DO UPDATE SET
      institute_id = excluded.institute_id,
      label = excluded.label,
      field_key = excluded.field_key,
      field_type = excluded.field_type,
      options_json = excluded.options_json,
      validation_json = excluded.validation_json,
      meta_json = excluded.meta_json,
      created_at = excluded.created_at,
      updated_at = excluded.updated_at,
      deleted_at = excluded.deleted_at
  `).run({
    id: record.id,
    institute_id: record.instituteId,
    label: record.label || '',
    field_key: record.key || '',
    field_type: record.type || 'text',
    options_json: JSON.stringify(record.options || []),
    validation_json: JSON.stringify(record.validation || {}),
    meta_json: JSON.stringify(record.meta || {}),
    created_at: createdAt,
    updated_at: now,
    deleted_at: record.deletedAt ?? null,
  })
}
function upsertTemplate(database, record) {
  const now = record.updatedAt || getNowIso()
  const createdAt = record.createdAt || now
  database.prepare(`
    INSERT INTO templates (id, institute_id, name, template_type, page_size, background_image, field_mappings_json, excluded_field_keys_json, header_config_json, is_locked, is_active, created_at, updated_at, deleted_at)
    VALUES (@id, @institute_id, @name, @template_type, @page_size, @background_image, @field_mappings_json, @excluded_field_keys_json, @header_config_json, @is_locked, @is_active, @created_at, @updated_at, @deleted_at)
    ON CONFLICT(id) DO UPDATE SET
      institute_id = excluded.institute_id,
      name = excluded.name,
      template_type = excluded.template_type,
      page_size = excluded.page_size,
      background_image = excluded.background_image,
      field_mappings_json = excluded.field_mappings_json,
      excluded_field_keys_json = excluded.excluded_field_keys_json,
      header_config_json = excluded.header_config_json,
      is_locked = excluded.is_locked,
      is_active = excluded.is_active,
      created_at = excluded.created_at,
      updated_at = excluded.updated_at,
      deleted_at = excluded.deleted_at
  `).run({
    id: record.id,
    institute_id: record.instituteId,
    name: record.name || 'New Template',
    template_type: record.type || 'admission',
    page_size: record.pageSize || 'A4',
    background_image: record.backgroundImage ?? null,
    field_mappings_json: JSON.stringify(record.fieldMappings || []),
    excluded_field_keys_json: JSON.stringify(record.excludedFieldKeys || []),
    header_config_json: JSON.stringify(record.headerConfig || {}),
    is_locked: record.isLocked ? 1 : 0,
    is_active: record.isActive ? 1 : 0,
    created_at: createdAt,
    updated_at: now,
    deleted_at: record.deletedAt ?? null,
  })
}

function upsertSettings(database, record) {
  const now = record.updatedAt || getNowIso()
  const createdAt = record.createdAt || now
  const { id, instituteId, createdAt: _ca, updatedAt: _ua, ...data } = record
  database.prepare(`
    INSERT INTO settings (id, institute_id, data_json, created_at, updated_at)
    VALUES (@id, @institute_id, @data_json, @created_at, @updated_at)
    ON CONFLICT(id) DO UPDATE SET
      institute_id = excluded.institute_id,
      data_json = excluded.data_json,
      created_at = excluded.created_at,
      updated_at = excluded.updated_at
  `).run({
    id: id || instituteId,
    institute_id: instituteId,
    data_json: JSON.stringify(data || {}),
    created_at: createdAt,
    updated_at: now,
  })
}

function upsertDocument(database, record) {
  const now = record.updatedAt || record.createdAt || getNowIso()
  const createdAt = record.createdAt || now
  database.prepare(`
    INSERT INTO documents (id, institute_id, student_id, file_name, file_type, file_size, doc_type, blob, created_at, updated_at, deleted_at)
    VALUES (@id, @institute_id, @student_id, @file_name, @file_type, @file_size, @doc_type, @blob, @created_at, @updated_at, @deleted_at)
    ON CONFLICT(id) DO UPDATE SET
      institute_id = excluded.institute_id,
      student_id = excluded.student_id,
      file_name = excluded.file_name,
      file_type = excluded.file_type,
      file_size = excluded.file_size,
      doc_type = excluded.doc_type,
      blob = excluded.blob,
      created_at = excluded.created_at,
      updated_at = excluded.updated_at,
      deleted_at = excluded.deleted_at
  `).run({
    id: record.id,
    institute_id: record.instituteId,
    student_id: record.studentId,
    file_name: record.fileName,
    file_type: record.fileType || '',
    file_size: Number(record.fileSize || 0),
    doc_type: record.docType || 'Other',
    blob: record.blob,
    created_at: createdAt,
    updated_at: now,
    deleted_at: record.deletedAt ?? null,
  })
}

function upsertStudent(database, record) {
  database.prepare(`
    INSERT INTO students (id, institute_id, roll_number, full_name, class_name, medium, board, academic_year, status, dynamic_fields, created_at, updated_at, deleted_at)
    VALUES (@id, @institute_id, @roll_number, @full_name, @class_name, @medium, @board, @academic_year, @status, @dynamic_fields, @created_at, @updated_at, @deleted_at)
    ON CONFLICT(id) DO UPDATE SET
      institute_id = excluded.institute_id,
      roll_number = excluded.roll_number,
      full_name = excluded.full_name,
      class_name = excluded.class_name,
      medium = excluded.medium,
      board = excluded.board,
      academic_year = excluded.academic_year,
      status = excluded.status,
      dynamic_fields = excluded.dynamic_fields,
      created_at = excluded.created_at,
      updated_at = excluded.updated_at,
      deleted_at = excluded.deleted_at
  `).run({
    id: record.id,
    institute_id: record.instituteId,
    roll_number: record.rollNumber ?? '',
    full_name: record.fullName || record.dynamicFields?.studentName || '',
    class_name: record.class ?? '',
    medium: record.medium ?? 'English',
    board: record.board ?? 'State Board',
    academic_year: record.academicYear ?? '',
    status: record.status ?? 'active',
    dynamic_fields: JSON.stringify(record.dynamicFields || {}),
    created_at: record.createdAt || getNowIso(),
    updated_at: record.updatedAt || getNowIso(),
    deleted_at: record.deletedAt ?? null,
  })
}

function upsertFee(database, record) {
  database.prepare(`
    INSERT INTO fees (id, student_id, institute_id, academic_year, total_fee, discount, effective_fee, paid_amount, remaining_amount, installments_json, due_date, created_at, updated_at, deleted_at)
    VALUES (@id, @student_id, @institute_id, @academic_year, @total_fee, @discount, @effective_fee, @paid_amount, @remaining_amount, @installments_json, @due_date, @created_at, @updated_at, @deleted_at)
    ON CONFLICT(id) DO UPDATE SET
      student_id = excluded.student_id,
      institute_id = excluded.institute_id,
      academic_year = excluded.academic_year,
      total_fee = excluded.total_fee,
      discount = excluded.discount,
      effective_fee = excluded.effective_fee,
      paid_amount = excluded.paid_amount,
      remaining_amount = excluded.remaining_amount,
      installments_json = excluded.installments_json,
      due_date = excluded.due_date,
      created_at = excluded.created_at,
      updated_at = excluded.updated_at,
      deleted_at = excluded.deleted_at
  `).run({
    id: record.id,
    student_id: record.studentId,
    institute_id: record.instituteId,
    academic_year: record.academicYear ?? '',
    total_fee: toNumber(record.totalFee),
    discount: toNumber(record.discount),
    effective_fee: toNumber(record.effectiveFee),
    paid_amount: toNumber(record.paidAmount),
    remaining_amount: toNumber(record.remainingAmount),
    installments_json: JSON.stringify(record.installments || []),
    due_date: record.dueDate ?? null,
    created_at: record.createdAt || getNowIso(),
    updated_at: record.updatedAt || getNowIso(),
    deleted_at: record.deletedAt ?? null,
  })
}

function upsertReceipt(database, record) {
  database.prepare(`
    INSERT INTO receipts (id, student_id, institute_id, receipt_number, amount, payment_date, payment_mode, installment_number, status, cancel_reason, cancelled_at, created_at, updated_at, deleted_at)
    VALUES (@id, @student_id, @institute_id, @receipt_number, @amount, @payment_date, @payment_mode, @installment_number, @status, @cancel_reason, @cancelled_at, @created_at, @updated_at, @deleted_at)
    ON CONFLICT(id) DO UPDATE SET
      student_id = excluded.student_id,
      institute_id = excluded.institute_id,
      receipt_number = excluded.receipt_number,
      amount = excluded.amount,
      payment_date = excluded.payment_date,
      payment_mode = excluded.payment_mode,
      installment_number = excluded.installment_number,
      status = excluded.status,
      cancel_reason = excluded.cancel_reason,
      cancelled_at = excluded.cancelled_at,
      created_at = excluded.created_at,
      updated_at = excluded.updated_at,
      deleted_at = excluded.deleted_at
  `).run({
    id: record.id,
    student_id: record.studentId,
    institute_id: record.instituteId,
    receipt_number: record.receiptNumber,
    amount: toNumber(record.amount),
    payment_date: record.paymentDate ?? null,
    payment_mode: record.paymentMode ?? 'Cash',
    installment_number: record.installmentNumber ?? null,
    status: record.status ?? 'active',
    cancel_reason: record.cancelReason ?? null,
    cancelled_at: record.cancelledAt ?? null,
    created_at: record.createdAt || getNowIso(),
    updated_at: record.updatedAt || getNowIso(),
    deleted_at: record.deletedAt ?? null,
  })
}

function upsertCounter(database, record) {
  database.prepare(`
    INSERT INTO counters (id, institute_id, key, value, created_at, updated_at)
    VALUES (@id, @institute_id, @key, @value, @created_at, @updated_at)
    ON CONFLICT(id) DO UPDATE SET
      institute_id = excluded.institute_id,
      key = excluded.key,
      value = excluded.value,
      created_at = excluded.created_at,
      updated_at = excluded.updated_at
  `).run({
    id: record.id,
    institute_id: record.instituteId,
    key: record.key,
    value: Number(record.value || 0),
    created_at: record.createdAt || getNowIso(),
    updated_at: record.updatedAt || getNowIso(),
  })
}

function upsertAudit(database, record) {
  database.prepare(`
    INSERT INTO audit_logs (id, institute_id, action, table_name, record_id, before_json, after_json, timestamp)
    VALUES (@id, @institute_id, @action, @table_name, @record_id, @before_json, @after_json, @timestamp)
    ON CONFLICT(id) DO UPDATE SET
      institute_id = excluded.institute_id,
      action = excluded.action,
      table_name = excluded.table_name,
      record_id = excluded.record_id,
      before_json = excluded.before_json,
      after_json = excluded.after_json,
      timestamp = excluded.timestamp
  `).run({
    id: record.id,
    institute_id: record.instituteId ?? null,
    action: record.action,
    table_name: record.tableName,
    record_id: record.recordId,
    before_json: record.before ? JSON.stringify(record.before) : null,
    after_json: record.after ? JSON.stringify(record.after) : null,
    timestamp: record.timestamp || getNowIso(),
  })
}

function saveLicense(database, record) {
  if (!record?.licenseKey) {
    database.prepare(`DELETE FROM license_data WHERE id = 'current'`).run()
    return null
  }
  const normalized = {
    id: 'current',
    licenseKey: record.licenseKey,
    payload: record.payload ?? null,
    deviceHash: record.deviceHash ?? null,
    activatedAt: record.activatedAt ?? getNowIso(),
    lastValidatedAt: record.lastValidatedAt ?? getNowIso(),
    lastOnlineAt: record.lastOnlineAt ?? getNowIso(),
  }
  database.prepare(`
    INSERT INTO license_data (id, data_json, updated_at)
    VALUES ('current', @data_json, @updated_at)
    ON CONFLICT(id) DO UPDATE SET
      data_json = excluded.data_json,
      updated_at = excluded.updated_at
  `).run({ data_json: JSON.stringify({ ...normalized, id: undefined }), updated_at: getNowIso() })
  return normalized
}

function getInstitute(database, instituteId) {
  return mapInstitute(database.prepare(`SELECT * FROM institutes WHERE id = ?`).get(instituteId))
}

function getLicense(database) {
  return mapLicense(database.prepare(`SELECT * FROM license_data WHERE id = 'current'`).get())
}

function getActiveTemplate(database, instituteId, type) {
  return mapTemplate(database.prepare(`
    SELECT * FROM templates
    WHERE institute_id = ? AND template_type = ? AND is_active = 1 AND deleted_at IS NULL
    ORDER BY updated_at DESC LIMIT 1
  `).get(instituteId, type))
}

function listFields(database, instituteId, includeDeleted = false) {
  return database.prepare(`SELECT * FROM fields WHERE institute_id = ? AND ${includeDeleted ? '1 = 1' : 'deleted_at IS NULL'}`).all(instituteId)
    .map(mapField)
    .sort((a, b) => (a.meta?.order ?? 0) - (b.meta?.order ?? 0) || a.label.localeCompare(b.label))
}

function listTemplates(database, instituteId, includeDeleted = false) {
  return database.prepare(`SELECT * FROM templates WHERE institute_id = ? AND ${includeDeleted ? '1 = 1' : 'deleted_at IS NULL'} ORDER BY created_at ASC`).all(instituteId).map(mapTemplate)
}

function listDocuments(database, instituteId, includeDeleted = false) {
  return database.prepare(`SELECT * FROM documents WHERE institute_id = ? AND ${includeDeleted ? '1 = 1' : 'deleted_at IS NULL'} ORDER BY created_at DESC`).all(instituteId).map(mapDocument)
}

function getCurrentCounts(database) {
  const counts = {}
  BACKUP_TABLES.forEach((table) => {
    counts[table] = Number(database.prepare(`SELECT count(*) AS total FROM ${table}`).get()?.total || 0)
  })
  return counts
}
function getBackupRows(database, table, instituteId = null) {
  switch (table) {
    case 'institutes':
      return instituteId ? [getInstitute(database, instituteId)].filter(Boolean) : database.prepare(`SELECT * FROM institutes`).all().map(mapInstitute)
    case 'fields':
      return instituteId ? listFields(database, instituteId, true) : database.prepare(`SELECT * FROM fields`).all().map(mapField)
    case 'templates':
      return instituteId ? listTemplates(database, instituteId, true) : database.prepare(`SELECT * FROM templates`).all().map(mapTemplate)
    case 'students': {
      const rows = instituteId ? database.prepare(`SELECT * FROM students WHERE institute_id = ?`).all(instituteId) : database.prepare(`SELECT * FROM students`).all()
      return rows.map(mapStudent)
    }
    case 'fees': {
      const rows = instituteId ? database.prepare(`SELECT * FROM fees WHERE institute_id = ?`).all(instituteId) : database.prepare(`SELECT * FROM fees`).all()
      return rows.map(mapFee)
    }
    case 'receipts': {
      const rows = instituteId ? database.prepare(`SELECT * FROM receipts WHERE institute_id = ?`).all(instituteId) : database.prepare(`SELECT * FROM receipts`).all()
      return rows.map(mapReceipt)
    }
    case 'counters': {
      const rows = instituteId ? database.prepare(`SELECT * FROM counters WHERE institute_id = ?`).all(instituteId) : database.prepare(`SELECT * FROM counters`).all()
      return rows.map(mapCounter)
    }
    case 'settings':
      return instituteId
        ? [mapSettings(database.prepare(`SELECT * FROM settings WHERE institute_id = ?`).get(instituteId))].filter(Boolean)
        : database.prepare(`SELECT * FROM settings`).all().map(mapSettings)
    case 'audit_logs': {
      const rows = instituteId ? database.prepare(`SELECT * FROM audit_logs WHERE institute_id = ?`).all(instituteId) : database.prepare(`SELECT * FROM audit_logs`).all()
      return rows.map(mapAudit)
    }
    case 'documents':
      return instituteId ? listDocuments(database, instituteId, true) : database.prepare(`SELECT * FROM documents`).all().map(mapDocument)
    default:
      return []
  }
}

function ensureRestoreCapacity(database, backup, instituteId) {
  if (!instituteId) return
  const institute = getInstitute(database, instituteId)
  const maxStudents = Number(institute?.maxStudents ?? 0)
  if (!maxStudents) return

  const currentCount = Number(database.prepare(`SELECT count(*) AS total FROM students WHERE institute_id = ? AND deleted_at IS NULL`).get(instituteId)?.total || 0)
  const existingIds = new Set(database.prepare(`SELECT id FROM students WHERE institute_id = ? AND deleted_at IS NULL`).all(instituteId).map((row) => row.id))
  const incoming = Array.isArray(backup?.data?.students) ? backup.data.students.filter((row) => !row.deletedAt && row.instituteId === instituteId) : []
  const incomingNew = incoming.filter((row) => !existingIds.has(row.id)).length
  if (currentCount + incomingNew > maxStudents) throw new Error('Student limit exceeded. Cannot restore backup.')
}

function applyBackup(database, backup) {
  const tx = database.transaction((payload) => {
    ensureRestoreCapacity(database, payload, payload.instituteId ?? null)
    const written = {}
    BACKUP_TABLES.forEach((table) => {
      const rows = Array.isArray(payload.data?.[table]) ? payload.data[table] : []
      written[table] = 0
      rows.forEach((row) => {
        if (table === 'institutes') upsertInstitute(database, row)
        if (table === 'fields') upsertField(database, row)
        if (table === 'templates') upsertTemplate(database, row)
        if (table === 'students') upsertStudent(database, row)
        if (table === 'fees') upsertFee(database, row)
        if (table === 'receipts') upsertReceipt(database, row)
        if (table === 'counters') upsertCounter(database, row)
        if (table === 'settings') upsertSettings(database, row)
        if (table === 'audit_logs') upsertAudit(database, row)
        if (table === 'documents') upsertDocument(database, row)
        written[table] += 1
      })
    })
    insertAudit(database, {
      instituteId: payload.instituteId ?? null,
      action: 'BACKUP_IMPORT',
      tableName: 'system',
      recordId: payload.instituteId || 'all',
      after: { written },
    })
    return written
  })
  return tx(backup)
}

function registerSchoolMetaHandlers() {
  ipcMain.handle('school:data:get-counts', async () => getCurrentCounts(getDb()))

  ipcMain.handle('school:data:export-backup', async (_event, params = {}) => {
    const database = getDb()
    const instituteId = params.instituteId ?? null
    const data = {}
    BACKUP_TABLES.forEach((table) => {
      data[table] = getBackupRows(database, table, instituteId)
    })
    const counts = Object.fromEntries(Object.entries(data).map(([key, rows]) => [key, Array.isArray(rows) ? rows.length : 0]))
    const payload = {
      version: '1.0',
      exportedAt: getNowIso(),
      instituteId,
      instituteName: params.instituteName || '',
      data,
    }
    insertAudit(database, { instituteId, action: 'BACKUP_EXPORT', tableName: 'system', recordId: instituteId || 'all', after: { counts } })
    return { payload, counts }
  })

  ipcMain.handle('school:data:apply-backup', async (_event, backup) => applyBackup(getDb(), backup))

  ipcMain.handle('institutes:list', async (_event, activeOnly = true) => {
    const query = activeOnly === false
      ? `SELECT * FROM institutes ORDER BY lower(name), created_at ASC`
      : `SELECT * FROM institutes WHERE deleted_at IS NULL ORDER BY lower(name), created_at ASC`
    return getDb().prepare(query).all().map(mapInstitute)
  })
  ipcMain.handle('institutes:get', async (_event, instituteId) => getInstitute(getDb(), instituteId))
  ipcMain.handle('institutes:upsert', async (_event, payload) => {
    const database = getDb()
    const before = getInstitute(database, payload.id)
    const record = { ...before, ...payload, createdAt: before?.createdAt || payload.createdAt || getNowIso(), updatedAt: getNowIso() }
    upsertInstitute(database, record)
    const after = getInstitute(database, payload.id)
    insertAudit(database, { instituteId: payload.id, action: before ? 'UPDATE' : 'CREATE', tableName: 'institutes', recordId: payload.id, before, after })
    return after
  })
  ipcMain.handle('institutes:delete', async (_event, instituteId) => {
    const database = getDb()
    const before = getInstitute(database, instituteId)
    if (!before) return { ok: true }
    upsertInstitute(database, { ...before, deletedAt: getNowIso(), updatedAt: getNowIso() })
    insertAudit(database, { instituteId, action: 'DELETE', tableName: 'institutes', recordId: instituteId, before, after: { ...before, deletedAt: getNowIso() } })
    return { ok: true }
  })

  ipcMain.handle('license:get-current', async () => getLicense(getDb()))
  ipcMain.handle('license:save-current', async (_event, record) => {
    const database = getDb()
    const before = getLicense(database)
    saveLicense(database, record)
    const after = getLicense(database)
    insertAudit(database, { instituteId: after?.payload?.instituteId ?? before?.payload?.instituteId ?? null, action: after ? (before ? 'UPDATE' : 'CREATE') : 'DELETE', tableName: 'license_data', recordId: 'current', before, after })
    return after
  })
  ipcMain.handle('license:delete-current', async () => {
    const database = getDb()
    const before = getLicense(database)
    saveLicense(database, null)
    insertAudit(database, { instituteId: before?.payload?.instituteId ?? null, action: 'DELETE', tableName: 'license_data', recordId: 'current', before, after: null })
    return { ok: true }
  })

  ipcMain.handle('fields:list', async (_event, instituteId) => listFields(getDb(), instituteId))
  ipcMain.handle('fields:create', async (_event, payload) => {
    const database = getDb()
    const record = { ...payload, id: payload.id || crypto.randomUUID(), createdAt: payload.createdAt || getNowIso(), updatedAt: getNowIso(), deletedAt: null }
    upsertField(database, record)
    const after = mapField(database.prepare(`SELECT * FROM fields WHERE id = ?`).get(record.id))
    insertAudit(database, { instituteId: record.instituteId, action: 'CREATE', tableName: 'fields', recordId: record.id, before: null, after })
    return after
  })
  ipcMain.handle('fields:update', async (_event, { fieldId, changes }) => {
    const database = getDb()
    const before = mapField(database.prepare(`SELECT * FROM fields WHERE id = ?`).get(fieldId))
    if (!before) throw new Error('Field not found')
    upsertField(database, { ...before, ...changes, options: changes?.options ?? before.options, validation: changes?.validation ?? before.validation, meta: changes?.meta ?? before.meta, updatedAt: getNowIso() })
    const after = mapField(database.prepare(`SELECT * FROM fields WHERE id = ?`).get(fieldId))
    insertAudit(database, { instituteId: before.instituteId, action: 'UPDATE', tableName: 'fields', recordId: fieldId, before, after })
    return after
  })
  ipcMain.handle('fields:delete', async (_event, fieldId) => {
    const database = getDb()
    const before = mapField(database.prepare(`SELECT * FROM fields WHERE id = ?`).get(fieldId))
    if (!before) return { ok: true }
    if (before.meta?.system) throw new Error('System fields cannot be deleted')
    upsertField(database, { ...before, deletedAt: getNowIso(), updatedAt: getNowIso() })
    insertAudit(database, { instituteId: before.instituteId, action: 'DELETE', tableName: 'fields', recordId: fieldId, before, after: { ...before, deletedAt: getNowIso() } })
    return { ok: true }
  })
  ipcMain.handle('fields:reorder', async (_event, { instituteId, fields }) => {
    const database = getDb()
    const tx = database.transaction((items) => {
      items.forEach((field, index) => {
        const current = mapField(database.prepare(`SELECT * FROM fields WHERE id = ?`).get(field.id))
        if (!current) return
        upsertField(database, { ...current, meta: { ...(field.meta || current.meta || {}), order: index }, updatedAt: getNowIso() })
      })
      return listFields(database, instituteId)
    })
    return tx(fields || [])
  })

  ipcMain.handle('templates:list', async (_event, instituteId) => listTemplates(getDb(), instituteId))
  ipcMain.handle('templates:get-active', async (_event, { instituteId, type }) => getActiveTemplate(getDb(), instituteId, type))
  ipcMain.handle('templates:create', async (_event, payload) => {
    const database = getDb()
    const record = { ...payload, id: payload.id || crypto.randomUUID(), createdAt: payload.createdAt || getNowIso(), updatedAt: getNowIso(), deletedAt: null }
    upsertTemplate(database, record)
    const after = mapTemplate(database.prepare(`SELECT * FROM templates WHERE id = ?`).get(record.id))
    insertAudit(database, { instituteId: record.instituteId, action: 'CREATE', tableName: 'templates', recordId: record.id, before: null, after })
    return after
  })
  ipcMain.handle('templates:save', async (_event, template) => {
    const database = getDb()
    const before = mapTemplate(database.prepare(`SELECT * FROM templates WHERE id = ?`).get(template.id))
    upsertTemplate(database, { ...before, ...template, createdAt: before?.createdAt || template.createdAt || getNowIso(), updatedAt: getNowIso() })
    const after = mapTemplate(database.prepare(`SELECT * FROM templates WHERE id = ?`).get(template.id))
    insertAudit(database, { instituteId: template.instituteId, action: before ? 'UPDATE' : 'CREATE', tableName: 'templates', recordId: template.id, before, after })
    return after
  })
  ipcMain.handle('templates:delete', async (_event, templateId) => {
    const database = getDb()
    const before = mapTemplate(database.prepare(`SELECT * FROM templates WHERE id = ?`).get(templateId))
    if (!before) return { ok: true }
    upsertTemplate(database, { ...before, isActive: false, deletedAt: getNowIso(), updatedAt: getNowIso() })
    insertAudit(database, { instituteId: before.instituteId, action: 'DELETE', tableName: 'templates', recordId: templateId, before, after: { ...before, deletedAt: getNowIso(), isActive: false } })
    return { ok: true }
  })
  ipcMain.handle('templates:mark-active', async (_event, templateId) => {
    const database = getDb()
    const target = mapTemplate(database.prepare(`SELECT * FROM templates WHERE id = ?`).get(templateId))
    if (!target) throw new Error('Template not found')
    const tx = database.transaction(() => {
      listTemplates(database, target.instituteId).filter((template) => template.type === target.type).forEach((template) => {
        upsertTemplate(database, { ...template, isActive: template.id === templateId, updatedAt: getNowIso() })
      })
      return mapTemplate(database.prepare(`SELECT * FROM templates WHERE id = ?`).get(templateId))
    })
    return tx()
  })
  ipcMain.handle('templates:clear-active', async (_event, templateId) => {
    const database = getDb()
    const target = mapTemplate(database.prepare(`SELECT * FROM templates WHERE id = ?`).get(templateId))
    if (!target) return { ok: true }
    database.transaction(() => {
      listTemplates(database, target.instituteId).filter((template) => template.type === target.type && template.isActive).forEach((template) => {
        upsertTemplate(database, { ...template, isActive: false, updatedAt: getNowIso() })
      })
    })()
    return { ok: true }
  })

  ipcMain.handle('settings:get', async (_event, instituteId) => mapSettings(getDb().prepare(`SELECT * FROM settings WHERE institute_id = ?`).get(instituteId)))
  ipcMain.handle('settings:save', async (_event, { instituteId, data }) => {
    const database = getDb()
    const before = mapSettings(database.prepare(`SELECT * FROM settings WHERE institute_id = ?`).get(instituteId))
    upsertSettings(database, { ...(before || {}), ...(data || {}), id: before?.id || instituteId, instituteId, createdAt: before?.createdAt || getNowIso(), updatedAt: getNowIso() })
    const after = mapSettings(database.prepare(`SELECT * FROM settings WHERE institute_id = ?`).get(instituteId))
    insertAudit(database, { instituteId, action: before ? 'UPDATE' : 'CREATE', tableName: 'settings', recordId: after?.id || instituteId, before, after })
    return after
  })

  ipcMain.handle('documents:list', async (_event, instituteId) => listDocuments(getDb(), instituteId))
  ipcMain.handle('documents:create', async (_event, payload) => {
    const database = getDb()
    const record = { ...payload, id: payload.id || crypto.randomUUID(), createdAt: payload.createdAt || getNowIso(), updatedAt: getNowIso(), deletedAt: null }
    upsertDocument(database, record)
    const after = mapDocument(database.prepare(`SELECT * FROM documents WHERE id = ?`).get(record.id))
    insertAudit(database, { instituteId: record.instituteId, action: 'CREATE', tableName: 'documents', recordId: record.id, before: null, after })
    return after
  })
  ipcMain.handle('documents:delete', async (_event, documentId) => {
    const database = getDb()
    const before = mapDocument(database.prepare(`SELECT * FROM documents WHERE id = ?`).get(documentId))
    if (!before) return { ok: true }
    upsertDocument(database, { ...before, deletedAt: getNowIso(), updatedAt: getNowIso() })
    insertAudit(database, { instituteId: before.instituteId, action: 'DELETE', tableName: 'documents', recordId: documentId, before, after: { ...before, deletedAt: getNowIso() } })
    return { ok: true }
  })

  ipcMain.handle('promotion:get-years', async (_event, instituteId) => getDb().prepare(`SELECT DISTINCT academic_year FROM students WHERE institute_id = ? AND deleted_at IS NULL AND academic_year IS NOT NULL AND academic_year <> '' ORDER BY academic_year DESC`).all(instituteId).map((row) => row.academic_year))
  ipcMain.handle('promotion:get-classes', async (_event, { instituteId, academicYear }) => getDb().prepare(`SELECT DISTINCT class_name FROM students WHERE institute_id = ? AND academic_year = ? AND deleted_at IS NULL AND class_name IS NOT NULL AND class_name <> '' ORDER BY class_name COLLATE NOCASE ASC`).all(instituteId, academicYear).map((row) => row.class_name))
  ipcMain.handle('promotion:list-students', async (_event, { instituteId, academicYear, filterClass = '' }) => {
    const sql = filterClass
      ? `SELECT * FROM students WHERE institute_id = ? AND academic_year = ? AND class_name = ? AND deleted_at IS NULL ORDER BY lower(full_name), created_at DESC`
      : `SELECT * FROM students WHERE institute_id = ? AND academic_year = ? AND deleted_at IS NULL ORDER BY lower(full_name), created_at DESC`
    const rows = filterClass ? getDb().prepare(sql).all(instituteId, academicYear, filterClass) : getDb().prepare(sql).all(instituteId, academicYear)
    return rows.map(mapStudent)
  })
  ipcMain.handle('promotion:preview', async (_event, { studentIds, targetClass, targetAcademicYear, instituteId }) => {
    const database = getDb()
    let wouldCreate = 0
    let wouldSkip = 0
    ;(studentIds || []).forEach((studentId) => {
      const source = mapStudent(database.prepare(`SELECT * FROM students WHERE id = ? AND deleted_at IS NULL`).get(studentId))
      if (!source) return
      const name = String(source.dynamicFields?.studentName || source.fullName || '').trim().toLowerCase()
      const total = Number(database.prepare(`SELECT count(*) AS total FROM students WHERE institute_id = ? AND academic_year = ? AND class_name = ? AND deleted_at IS NULL AND lower(trim(full_name)) = ?`).get(instituteId, targetAcademicYear, targetClass, name)?.total || 0)
      if (total > 0) wouldSkip += 1
      else wouldCreate += 1
    })
    return { wouldCreate, wouldSkip }
  })
  ipcMain.handle('promotion:apply', async (_event, { studentIds, targetClass, targetAcademicYear, instituteId, feeDefaults = {} }) => {
    const database = getDb()
    const tx = database.transaction((ids) => {
      const institute = getInstitute(database, instituteId)
      const maxStudents = Number(institute?.maxStudents ?? 0)
      let currentCount = Number(database.prepare(`SELECT count(*) AS total FROM students WHERE institute_id = ? AND deleted_at IS NULL`).get(instituteId)?.total || 0)
      const createdStudents = []
      const skippedNames = []
      const errors = []
      ids.forEach((studentId) => {
        try {
          const source = mapStudent(database.prepare(`SELECT * FROM students WHERE id = ? AND deleted_at IS NULL`).get(studentId))
          if (!source) return
          const name = String(source.dynamicFields?.studentName || source.fullName || '').trim().toLowerCase()
          const duplicate = Number(database.prepare(`SELECT count(*) AS total FROM students WHERE institute_id = ? AND academic_year = ? AND class_name = ? AND deleted_at IS NULL AND lower(trim(full_name)) = ?`).get(instituteId, targetAcademicYear, targetClass, name)?.total || 0)
          if (duplicate > 0) {
            skippedNames.push(source.dynamicFields?.studentName || source.id)
            return
          }
          if (maxStudents > 0 && currentCount + 1 > maxStudents) throw new Error(`Student limit reached for this institute (${currentCount}/${maxStudents}). Upgrade the license to add more students.`)
          const now = getNowIso()
          const newStudent = { ...source, id: crypto.randomUUID(), instituteId, class: targetClass, academicYear: targetAcademicYear, rollNumber: '', status: 'active', createdAt: now, updatedAt: now, deletedAt: null }
          const totalFee = Number(feeDefaults.totalFee ?? 0)
          const discount = Number(feeDefaults.discount ?? 0)
          const effective = Math.max(0, totalFee - discount)
          const newFee = { id: crypto.randomUUID(), studentId: newStudent.id, instituteId, academicYear: targetAcademicYear, totalFee, discount, effectiveFee: effective, paidAmount: 0, remainingAmount: effective, installments: [], dueDate: null, createdAt: now, updatedAt: now, deletedAt: null }
          upsertStudent(database, newStudent)
          upsertFee(database, newFee)
          createdStudents.push({ ...newStudent, fee: newFee })
          currentCount += 1
        } catch (error) {
          errors.push(`${studentId}: ${error.message}`)
        }
      })
      insertAudit(database, { instituteId, action: 'PROMOTE', tableName: 'students', recordId: instituteId, after: { promoted: createdStudents.length, skipped: skippedNames.length, targetClass, targetYear: targetAcademicYear } })
      return { created: createdStudents.length, skipped: skippedNames.length, errors, createdStudents, skippedNames }
    })
    return tx(studentIds || [])
  })
}

module.exports = { registerSchoolMetaHandlers }
