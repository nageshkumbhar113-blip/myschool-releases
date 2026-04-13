const crypto = require('crypto')
const { ipcMain } = require('electron')
const { getDb, getNowIso, getDbPath } = require('./sqlite.cjs')

function safeParseJson(value, fallback) {
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

function computeFee(totalFee, discount = 0, paidAmount = 0) {
  const total = Math.max(0, toNumber(totalFee))
  const disc = Math.min(Math.max(0, toNumber(discount)), total)
  const effective = total - disc
  const paid = Math.min(Math.max(0, toNumber(paidAmount)), effective)
  const remaining = Math.max(0, effective - paid)

  return {
    totalFee: total,
    discount: disc,
    effectiveFee: effective,
    paidAmount: paid,
    remainingAmount: remaining,
  }
}

function normalizeAdmissionNo(value) {
  return String(value ?? '').trim()
}

function sumInstallments(installments = []) {
  return (installments ?? []).reduce((sum, item) => sum + toNumber(item?.amount), 0)
}

function computeFeeSnapshot({ totalFee, discount, installments = [] }) {
  const paidAmount = sumInstallments(installments)
  const total = Math.max(0, toNumber(totalFee))
  const disc = Math.min(Math.max(0, toNumber(discount)), total)
  const effectiveFee = total - disc

  if (paidAmount > effectiveFee) {
    throw new Error(`Paid amount (Rs ${paidAmount}) exceeds effective fee (Rs ${effectiveFee}).`)
  }

  return computeFee(total, disc, paidAmount)
}

function mapStudentPersistenceError(error) {
  const message = String(error?.message ?? '')
  if (message.includes('students.institute_id, students.admission_no')) {
    return new Error('Admission number already exists for this school.')
  }
  return error
}

function assertAdmissionNoAvailable(database, instituteId, admissionNo, currentStudentId = null) {
  if (!admissionNo) return

  const row = database.prepare(`
    SELECT id
    FROM students
    WHERE institute_id = ?
      AND admission_no = ?
      AND deleted_at IS NULL
      AND (? IS NULL OR id <> ?)
    LIMIT 1
  `).get(instituteId, admissionNo, currentStudentId, currentStudentId)

  if (row?.id) {
    throw new Error('Admission number already exists for this school.')
  }
}

function getInstituteCode(name) {
  if (!name) return 'SCH'
  const words = String(name).trim().split(/\s+/).filter(Boolean)
  if (words.length === 1) return words[0].slice(0, 4).toUpperCase()
  return words.map((word) => word[0].toUpperCase()).join('').slice(0, 4)
}

function insertAuditLog(database, {
  instituteId = null,
  action,
  tableName,
  recordId,
  before = null,
  after = null,
}) {
  database.prepare(`
    INSERT INTO audit_logs (
      id, institute_id, action, table_name, record_id, before_json, after_json, timestamp
    ) VALUES (
      @id, @institute_id, @action, @table_name, @record_id, @before_json, @after_json, @timestamp
    )
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

function mapFeeRow(row) {
  if (!row?.fee_id) return null

  return {
    id: row.fee_id,
    studentId: row.student_id,
    instituteId: row.institute_id,
    academicYear: row.fee_academic_year ?? '',
    totalFee: toNumber(row.total_fee),
    discount: toNumber(row.discount),
    effectiveFee: toNumber(row.effective_fee),
    paidAmount: toNumber(row.paid_amount),
    remainingAmount: toNumber(row.remaining_amount),
    installments: safeParseJson(row.installments_json, []),
    dueDate: row.due_date ?? null,
    createdAt: row.fee_created_at,
    updatedAt: row.fee_updated_at,
    deletedAt: row.fee_deleted_at ?? null,
  }
}

function mapStudentRow(row) {
  if (!row?.student_id) return null

  const dynamicFields = safeParseJson(row.dynamic_fields, {})
  if (!dynamicFields.studentName) dynamicFields.studentName = row.full_name ?? ''

  return {
    id: row.student_id,
    instituteId: row.institute_id,
    rollNumber: row.roll_number ?? '',
    class: row.class_name ?? '',
    medium: row.medium ?? 'English',
    board: row.board ?? 'State Board',
    academicYear: row.academic_year ?? '',
    status: row.status ?? 'active',
    dynamicFields,
    fullName: row.full_name ?? dynamicFields.studentName ?? '',
    lcPrintedAt: row.lc_printed_at ?? null,
    transferredAt: row.transferred_at ?? null,
    createdAt: row.student_created_at,
    updatedAt: row.student_updated_at,
    deletedAt: row.student_deleted_at ?? null,
    fee: mapFeeRow(row),
  }
}

function mapReceiptRow(row) {
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

function getStudentSelectSql() {
  return `
    SELECT
      s.id AS student_id,
      s.institute_id,
      s.roll_number,
      s.full_name,
      s.class_name,
      s.medium,
      s.board,
      s.academic_year,
      s.status,
      s.dynamic_fields,
      s.lc_printed_at,
      s.transferred_at,
      s.created_at AS student_created_at,
      s.updated_at AS student_updated_at,
      s.deleted_at AS student_deleted_at,
      f.id AS fee_id,
      f.student_id,
      f.academic_year AS fee_academic_year,
      f.total_fee,
      f.discount,
      f.effective_fee,
      f.paid_amount,
      f.remaining_amount,
      f.installments_json,
      f.due_date,
      f.created_at AS fee_created_at,
      f.updated_at AS fee_updated_at,
      f.deleted_at AS fee_deleted_at
    FROM students s
    LEFT JOIN fees f
      ON f.student_id = s.id
     AND f.deleted_at IS NULL
  `
}

function listStudents(database, instituteId = null) {
  // Auto-transfer: students whose LC was printed 10+ days ago
  const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
  const now = getNowIso()
  const autoTransferSql = `
    UPDATE students
    SET status = 'transferred', transferred_at = ?, updated_at = ?
    WHERE lc_printed_at IS NOT NULL
      AND lc_printed_at <= ?
      AND status != 'transferred'
      AND deleted_at IS NULL
      ${instituteId ? 'AND institute_id = ?' : ''}
  `
  const autoTransferParams = instituteId
    ? [now, now, tenDaysAgo, instituteId]
    : [now, now, tenDaysAgo]
  database.prepare(autoTransferSql).run(...autoTransferParams)

  const rows = instituteId
    ? database.prepare(`
        ${getStudentSelectSql()}
        WHERE s.deleted_at IS NULL
          AND s.institute_id = ?
        ORDER BY lower(s.full_name), s.created_at DESC
      `).all(instituteId)
    : database.prepare(`
        ${getStudentSelectSql()}
        WHERE s.deleted_at IS NULL
        ORDER BY lower(s.full_name), s.created_at DESC
      `).all()

  return rows.map(mapStudentRow)
}

function getStudent(database, studentId) {
  const row = database.prepare(`
    ${getStudentSelectSql()}
    WHERE s.id = ?
      AND s.deleted_at IS NULL
  `).get(studentId)

  return mapStudentRow(row)
}

function listFees(database, instituteId = null) {
  const rows = instituteId
    ? database.prepare(`
        SELECT *
        FROM fees
        WHERE deleted_at IS NULL
          AND institute_id = ?
        ORDER BY created_at DESC
      `).all(instituteId)
    : database.prepare(`
        SELECT *
        FROM fees
        WHERE deleted_at IS NULL
        ORDER BY created_at DESC
      `).all()

  return rows.map((row) => ({
    id: row.id,
    studentId: row.student_id,
    instituteId: row.institute_id,
    academicYear: row.academic_year ?? '',
    totalFee: toNumber(row.total_fee),
    discount: toNumber(row.discount),
    effectiveFee: toNumber(row.effective_fee),
    paidAmount: toNumber(row.paid_amount),
    remainingAmount: toNumber(row.remaining_amount),
    installments: safeParseJson(row.installments_json, []),
    dueDate: row.due_date ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at ?? null,
  }))
}

function getFeeById(database, feeId) {
  const row = database.prepare(`
    SELECT *
    FROM fees
    WHERE id = ?
      AND deleted_at IS NULL
  `).get(feeId)

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
    installments: safeParseJson(row.installments_json, []),
    dueDate: row.due_date ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at ?? null,
  }
}

function getActiveFeeByStudent(database, studentId) {
  const row = database.prepare(`
    SELECT *
    FROM fees
    WHERE student_id = ?
      AND deleted_at IS NULL
    ORDER BY created_at DESC
    LIMIT 1
  `).get(studentId)

  return row ? getFeeById(database, row.id) : null
}

function listReceipts(database, instituteId = null) {
  const rows = instituteId
    ? database.prepare(`
        SELECT
          r.*,
          s.class_name,
          s.dynamic_fields
        FROM receipts r
        LEFT JOIN students s
          ON s.id = r.student_id
        WHERE r.deleted_at IS NULL
          AND r.institute_id = ?
        ORDER BY coalesce(r.payment_date, r.created_at) DESC, r.created_at DESC
      `).all(instituteId)
    : database.prepare(`
        SELECT
          r.*,
          s.class_name,
          s.dynamic_fields
        FROM receipts r
        LEFT JOIN students s
          ON s.id = r.student_id
        WHERE r.deleted_at IS NULL
        ORDER BY coalesce(r.payment_date, r.created_at) DESC, r.created_at DESC
      `).all()

  return rows.map((row) => {
    const receipt = mapReceiptRow(row)
    const dynamicFields = safeParseJson(row.dynamic_fields, {})
    if (row.class_name || Object.keys(dynamicFields).length) {
      receipt.student = {
        id: row.student_id,
        class: row.class_name ?? '',
        dynamicFields,
      }
    } else {
      receipt.student = null
    }
    return receipt
  })
}

function getReceiptData(database, receiptId) {
  const receiptRow = database.prepare(`
    SELECT *
    FROM receipts
    WHERE id = ?
      AND deleted_at IS NULL
  `).get(receiptId)

  if (!receiptRow) return null

  const student = getStudent(database, receiptRow.student_id)
  const fee = getActiveFeeByStudent(database, receiptRow.student_id)
  return {
    receipt: mapReceiptRow(receiptRow),
    student,
    fee,
  }
}

function getNextReceiptNumber(database, instituteId, instituteName) {
  if (!instituteId) throw new Error('instituteId is required')

  const now = getNowIso()
  const year = new Date().getFullYear()
  const counterKey = `receipt_${year}`
  const code = getInstituteCode(instituteName)

  const row = database.prepare(`
    SELECT *
    FROM counters
    WHERE institute_id = ?
      AND key = ?
    LIMIT 1
  `).get(instituteId, counterKey)

  let seq = 1
  if (!row) {
    database.prepare(`
      INSERT INTO counters (
        id, institute_id, key, value, created_at, updated_at
      ) VALUES (
        @id, @institute_id, @key, @value, @created_at, @updated_at
      )
    `).run({
      id: crypto.randomUUID(),
      institute_id: instituteId,
      key: counterKey,
      value: seq,
      created_at: now,
      updated_at: now,
    })
  } else {
    seq = Number(row.value || 0) + 1
    database.prepare(`
      UPDATE counters
      SET value = ?, updated_at = ?
      WHERE id = ?
    `).run(seq, now, row.id)
  }

  return `${code}-${year}-${String(seq).padStart(4, '0')}`
}

function registerSchoolDataHandlers() {
  ipcMain.handle('school:data:get-db-info', async () => ({
    path: getDbPath(),
  }))

  ipcMain.handle('students:list', async (_event, instituteId = null) => {
    const database = getDb()
    return listStudents(database, instituteId || null)
  })

  ipcMain.handle('students:get', async (_event, studentId) => {
    const database = getDb()
    return getStudent(database, studentId)
  })

  ipcMain.handle('students:count', async (_event, instituteId = null) => {
    const database = getDb()
    if (instituteId) {
      const row = database.prepare(`
        SELECT count(*) AS total
        FROM students
        WHERE deleted_at IS NULL
          AND institute_id = ?
      `).get(instituteId)
      return Number(row?.total || 0)
    }

    const row = database.prepare(`
      SELECT count(*) AS total
      FROM students
      WHERE deleted_at IS NULL
    `).get()
    return Number(row?.total || 0)
  })

  ipcMain.handle('students:recordLCPrint', async (_event, studentId) => {
    const database = getDb()
    const now = getNowIso()
    database.prepare(`
      UPDATE students SET lc_printed_at = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL
    `).run(now, now, studentId)
    return true
  })

  ipcMain.handle('students:getNextAdmissionNo', async (_event, { instituteId }) => {
    const database = getDb()
    const year = new Date().getFullYear()
    const prefix = `ADM-${year}-`

    const rows = database.prepare(`
      SELECT admission_no, dynamic_fields FROM students
      WHERE institute_id = ? AND deleted_at IS NULL
    `).all(instituteId)

    let maxSeq = 0
    for (const row of rows) {
      const df = safeParseJson(row.dynamic_fields, {})
      const admNo = normalizeAdmissionNo(row.admission_no || df.admissionNo || '')
      if (admNo.startsWith(prefix)) {
        const seq = parseInt(admNo.slice(prefix.length), 10)
        if (!isNaN(seq) && seq > maxSeq) maxSeq = seq
      }
    }

    return `${prefix}${String(maxSeq + 1).padStart(3, '0')}`
  })

  ipcMain.handle('students:create', async (_event, payload) => {
    const database = getDb()

    const createStudentTx = database.transaction((input) => {
      const now = getNowIso()
      const dynamicFields = { ...(input.dynamicFields || {}) }
      const fullName = String(dynamicFields.studentName || '').trim()
      const admissionNo = normalizeAdmissionNo(dynamicFields.admissionNo)

      if (!input.instituteId) throw new Error('instituteId is required')
      if (!fullName) throw new Error('studentName is required')
      assertAdmissionNoAvailable(database, input.instituteId, admissionNo)

      const studentId = crypto.randomUUID()
      const feeId = crypto.randomUUID()
      const fee = computeFee(input.totalFee, input.discount, 0)

      database.prepare(`
        INSERT INTO students (
          id, institute_id, admission_no, roll_number, full_name, class_name, medium, board,
          academic_year, status, dynamic_fields, created_at, updated_at, deleted_at
        ) VALUES (
          @id, @institute_id, @admission_no, @roll_number, @full_name, @class_name, @medium, @board,
          @academic_year, @status, @dynamic_fields, @created_at, @updated_at, NULL
        )
      `).run({
        id: studentId,
        institute_id: input.instituteId,
        admission_no: admissionNo || null,
        roll_number: input.rollNumber ?? '',
        full_name: fullName,
        class_name: input.class ?? '',
        medium: input.medium ?? 'English',
        board: input.board ?? 'State Board',
        academic_year: input.academicYear ?? '',
        status: input.status ?? 'active',
        dynamic_fields: JSON.stringify(dynamicFields),
        created_at: now,
        updated_at: now,
      })

      database.prepare(`
        INSERT INTO fees (
          id, student_id, institute_id, academic_year, total_fee, discount,
          effective_fee, paid_amount, remaining_amount, installments_json, due_date,
          created_at, updated_at, deleted_at
        ) VALUES (
          @id, @student_id, @institute_id, @academic_year, @total_fee, @discount,
          @effective_fee, @paid_amount, @remaining_amount, @installments_json, @due_date,
          @created_at, @updated_at, NULL
        )
      `).run({
        id: feeId,
        student_id: studentId,
        institute_id: input.instituteId,
        academic_year: input.academicYear ?? '',
        total_fee: fee.totalFee,
        discount: fee.discount,
        effective_fee: fee.effectiveFee,
        paid_amount: fee.paidAmount,
        remaining_amount: fee.remainingAmount,
        installments_json: JSON.stringify([]),
        due_date: null,
        created_at: now,
        updated_at: now,
      })

      const created = getStudent(database, studentId)
      insertAuditLog(database, {
        instituteId: input.instituteId,
        action: 'CREATE',
        tableName: 'students',
        recordId: studentId,
        before: null,
        after: created,
      })
      return created
    })

    try {
      return createStudentTx(payload)
    } catch (error) {
      throw mapStudentPersistenceError(error)
    }
  })

  ipcMain.handle('students:update', async (_event, { studentId, changes }) => {
    const database = getDb()
    const updateStudentTx = database.transaction((targetStudentId, nextChanges) => {
      const before = getStudent(database, targetStudentId)
      if (!before) throw new Error('Student not found')

      const dynamicFields = { ...(nextChanges?.dynamicFields ?? before.dynamicFields ?? {}) }
      const fullName = String(dynamicFields.studentName || before.fullName || '').trim()
      const admissionNo = normalizeAdmissionNo(dynamicFields.admissionNo)
      if (!fullName) throw new Error('studentName is required')
      assertAdmissionNoAvailable(database, before.instituteId, admissionNo, targetStudentId)

      const updatedAt = getNowIso()

      database.prepare(`
        UPDATE students
        SET
          admission_no = @admission_no,
          roll_number = @roll_number,
          full_name = @full_name,
          class_name = @class_name,
          medium = @medium,
          board = @board,
          academic_year = @academic_year,
          status = @status,
          dynamic_fields = @dynamic_fields,
          updated_at = @updated_at
        WHERE id = @id
          AND deleted_at IS NULL
      `).run({
        id: targetStudentId,
        admission_no: admissionNo || null,
        roll_number: nextChanges?.rollNumber ?? before.rollNumber ?? '',
        full_name: fullName,
        class_name: nextChanges?.class ?? before.class ?? '',
        medium: nextChanges?.medium ?? before.medium ?? 'English',
        board: nextChanges?.board ?? before.board ?? 'State Board',
        academic_year: nextChanges?.academicYear ?? before.academicYear ?? '',
        status: nextChanges?.status ?? before.status ?? 'active',
        dynamic_fields: JSON.stringify(dynamicFields),
        updated_at: updatedAt,
      })

      const feeChanges = nextChanges?.feeChanges ?? null
      if (feeChanges && before.fee?.id) {
        const currentInstallments = before.fee.installments ?? []
        const computed = computeFeeSnapshot({
          totalFee: feeChanges.totalFee ?? before.fee.totalFee,
          discount: feeChanges.discount ?? before.fee.discount,
          installments: currentInstallments,
        })

        database.prepare(`
          UPDATE fees
          SET
            academic_year = @academic_year,
            total_fee = @total_fee,
            discount = @discount,
            effective_fee = @effective_fee,
            paid_amount = @paid_amount,
            remaining_amount = @remaining_amount,
            installments_json = @installments_json,
            due_date = @due_date,
            updated_at = @updated_at
          WHERE id = @id
            AND deleted_at IS NULL
        `).run({
          id: before.fee.id,
          academic_year: feeChanges.academicYear ?? before.fee.academicYear ?? '',
          total_fee: computed.totalFee,
          discount: computed.discount,
          effective_fee: computed.effectiveFee,
          paid_amount: computed.paidAmount,
          remaining_amount: computed.remainingAmount,
          installments_json: JSON.stringify(currentInstallments),
          due_date: feeChanges.dueDate !== undefined ? feeChanges.dueDate : before.fee.dueDate ?? null,
          updated_at: updatedAt,
        })
      }

      const after = getStudent(database, targetStudentId)
      insertAuditLog(database, {
        instituteId: before.instituteId,
        action: 'UPDATE',
        tableName: 'students',
        recordId: targetStudentId,
        before,
        after,
      })

      if (before.fee?.id && nextChanges?.feeChanges) {
        insertAuditLog(database, {
          instituteId: before.instituteId,
          action: 'UPDATE',
          tableName: 'fees',
          recordId: before.fee.id,
          before: before.fee,
          after: after?.fee ?? null,
        })
      }

      return after
    })

    try {
      return updateStudentTx(studentId, changes)
    } catch (error) {
      throw mapStudentPersistenceError(error)
    }
  })

  ipcMain.handle('students:delete', async (_event, studentId) => {
    const database = getDb()

    const deleteStudentTx = database.transaction((id) => {
      const before = getStudent(database, id)
      if (!before) throw new Error('Student not found')

      const now = getNowIso()

      database.prepare(`
        UPDATE students
        SET deleted_at = ?, updated_at = ?, status = 'inactive'
        WHERE id = ?
      `).run(now, now, id)

      database.prepare(`
        UPDATE fees
        SET deleted_at = ?, updated_at = ?
        WHERE student_id = ?
          AND deleted_at IS NULL
      `).run(now, now, id)

      database.prepare(`
        UPDATE receipts
        SET
          status = 'cancelled',
          cancel_reason = 'Student deleted',
          cancelled_at = ?,
          updated_at = ?
        WHERE student_id = ?
          AND deleted_at IS NULL
          AND status <> 'cancelled'
      `).run(now, now, id)

      insertAuditLog(database, {
        instituteId: before.instituteId,
        action: 'DELETE',
        tableName: 'students',
        recordId: id,
        before,
        after: { ...before, deletedAt: now, updatedAt: now, status: 'inactive' },
      })

      return { ok: true }
    })

    return deleteStudentTx(studentId)
  })

  ipcMain.handle('fees:list', async (_event, instituteId = null) => {
    const database = getDb()
    return listFees(database, instituteId || null)
  })

  ipcMain.handle('fees:update', async (_event, { feeId, changes }) => {
    const database = getDb()
    const before = getFeeById(database, feeId)
    if (!before) throw new Error('Fee record not found')

    const dueDate = changes?.dueDate !== undefined ? changes.dueDate : before.dueDate
    const computed = computeFeeSnapshot({
      totalFee: changes?.totalFee ?? before.totalFee,
      discount: changes?.discount ?? before.discount,
      installments: before.installments ?? [],
    })

    database.prepare(`
      UPDATE fees
      SET
        academic_year = @academic_year,
        total_fee = @total_fee,
        discount = @discount,
        effective_fee = @effective_fee,
        paid_amount = @paid_amount,
        remaining_amount = @remaining_amount,
        installments_json = @installments_json,
        due_date = @due_date,
        updated_at = @updated_at
      WHERE id = @id
        AND deleted_at IS NULL
    `).run({
      id: feeId,
      academic_year: changes?.academicYear ?? before.academicYear ?? '',
      total_fee: computed.totalFee,
      discount: computed.discount,
      effective_fee: computed.effectiveFee,
      paid_amount: computed.paidAmount,
      remaining_amount: computed.remainingAmount,
      installments_json: JSON.stringify(before.installments ?? []),
      due_date: dueDate ?? null,
      updated_at: getNowIso(),
    })

    const after = getFeeById(database, feeId)
    insertAuditLog(database, {
      instituteId: before.instituteId,
      action: 'UPDATE',
      tableName: 'fees',
      recordId: feeId,
      before,
      after,
    })
    return after
  })

  ipcMain.handle('fees:add-installment', async (_event, { studentId, payload }) => {
    const database = getDb()

    const addInstallmentTx = database.transaction((targetStudentId, input) => {
      const feeRecord = getActiveFeeByStudent(database, targetStudentId)
      if (!feeRecord) throw new Error('Fee record not found')

      const amount = toNumber(input?.amount)
      if (amount <= 0) throw new Error('Amount must be greater than zero')
      if (amount > feeRecord.remainingAmount) {
        throw new Error(`Amount (Rs ${amount}) exceeds remaining Rs ${feeRecord.remainingAmount}`)
      }

      const now = getNowIso()
      const receiptId = crypto.randomUUID()
      const receiptNumber = getNextReceiptNumber(
        database,
        feeRecord.instituteId,
        input?.instituteName || 'School',
      )

      const installment = {
        id: crypto.randomUUID(),
        amount,
        date: input?.date || now.slice(0, 10),
        paymentMode: input?.paymentMode || 'Cash',
        receiptNumber,
        receiptId,
      }

      const installments = [...(feeRecord.installments ?? []), installment]
      const paidAmount = installments.reduce((sum, item) => sum + toNumber(item.amount), 0)
      const computed = computeFee(feeRecord.totalFee, feeRecord.discount, paidAmount)

      database.prepare(`
        UPDATE fees
        SET
          paid_amount = @paid_amount,
          remaining_amount = @remaining_amount,
          installments_json = @installments_json,
          updated_at = @updated_at
        WHERE id = @id
          AND deleted_at IS NULL
      `).run({
        id: feeRecord.id,
        paid_amount: computed.paidAmount,
        remaining_amount: computed.remainingAmount,
        installments_json: JSON.stringify(installments),
        updated_at: now,
      })

      database.prepare(`
        INSERT INTO receipts (
          id, student_id, institute_id, receipt_number, amount, payment_date, payment_mode,
          installment_number, status, cancel_reason, cancelled_at, created_at, updated_at, deleted_at
        ) VALUES (
          @id, @student_id, @institute_id, @receipt_number, @amount, @payment_date, @payment_mode,
          @installment_number, 'active', NULL, NULL, @created_at, @updated_at, NULL
        )
      `).run({
        id: receiptId,
        student_id: targetStudentId,
        institute_id: feeRecord.instituteId,
        receipt_number: receiptNumber,
        amount,
        payment_date: installment.date,
        payment_mode: installment.paymentMode,
        installment_number: installments.length,
        created_at: now,
        updated_at: now,
      })

      const updatedFee = getFeeById(database, feeRecord.id)
      insertAuditLog(database, {
        instituteId: feeRecord.instituteId,
        action: 'UPDATE',
        tableName: 'fees',
        recordId: feeRecord.id,
        before: feeRecord,
        after: updatedFee,
      })

      return {
        installment,
        receiptNumber,
        fee: updatedFee,
      }
    })

    return addInstallmentTx(studentId, payload)
  })

  ipcMain.handle('receipts:list', async (_event, instituteId = null) => {
    const database = getDb()
    return listReceipts(database, instituteId || null)
  })

  ipcMain.handle('receipts:get-data', async (_event, receiptId) => {
    const database = getDb()
    return getReceiptData(database, receiptId)
  })

  ipcMain.handle('receipts:cancel', async (_event, { receiptId, cancelReason = '' }) => {
    const database = getDb()

    const cancelReceiptTx = database.transaction((targetReceiptId, reason) => {
      const receiptRow = database.prepare(`
        SELECT *
        FROM receipts
        WHERE id = ?
          AND deleted_at IS NULL
      `).get(targetReceiptId)

      if (!receiptRow) throw new Error('Receipt not found')
      if (receiptRow.status === 'cancelled') throw new Error('Already cancelled')

      const feeRecord = getActiveFeeByStudent(database, receiptRow.student_id)
      if (!feeRecord) throw new Error('Fee record not found')

      const now = getNowIso()
      const installments = (feeRecord.installments ?? []).filter((item) => item.receiptId !== targetReceiptId)
      const paidAmount = installments.reduce((sum, item) => sum + toNumber(item.amount), 0)
      const computed = computeFee(feeRecord.totalFee, feeRecord.discount, paidAmount)

      database.prepare(`
        UPDATE receipts
        SET
          status = 'cancelled',
          cancel_reason = ?,
          cancelled_at = ?,
          updated_at = ?
        WHERE id = ?
      `).run(reason, now, now, targetReceiptId)

      database.prepare(`
        UPDATE fees
        SET
          paid_amount = ?,
          remaining_amount = ?,
          installments_json = ?,
          updated_at = ?
        WHERE id = ?
      `).run(
        computed.paidAmount,
        computed.remainingAmount,
        JSON.stringify(installments),
        now,
        feeRecord.id,
      )

      const updatedFee = getFeeById(database, feeRecord.id)
      const updatedReceipt = mapReceiptRow(database.prepare(`
        SELECT *
        FROM receipts
        WHERE id = ?
      `).get(targetReceiptId))

      insertAuditLog(database, {
        instituteId: receiptRow.institute_id,
        action: 'UPDATE',
        tableName: 'receipts',
        recordId: targetReceiptId,
        before: mapReceiptRow(receiptRow),
        after: updatedReceipt,
      })

      return {
        ok: true,
        fee: updatedFee,
        receipt: updatedReceipt,
      }
    })

    return cancelReceiptTx(receiptId, cancelReason)
  })
}

module.exports = {
  registerSchoolDataHandlers,
}
