'use strict'

const crypto = require('crypto')
const { ipcMain } = require('electron')
const { getDb, getNowIso } = require('./sqlite.cjs')

const SCHOOL_AUTH_ID = 'config'
const MAX_ATTEMPTS = 5
const LOCK_DURATION_MS = 5 * 60 * 1000
const PBKDF2_ITERATIONS = 100_000
const PBKDF2_KEYLEN = 32
const PBKDF2_DIGEST = 'sha256'

function pbkdf2Hex(password, salt) {
  return crypto.pbkdf2Sync(
    String(password ?? ''),
    Buffer.from(String(salt ?? ''), 'hex'),
    PBKDF2_ITERATIONS,
    PBKDF2_KEYLEN,
    PBKDF2_DIGEST,
  ).toString('hex')
}

function sha256Hex(input) {
  return crypto.createHash('sha256').update(String(input ?? ''), 'utf8').digest('hex')
}

function randomHex(size = 16) {
  return crypto.randomBytes(size).toString('hex')
}

function normalizeRecoveryCode(code) {
  return String(code ?? '').replace(/-/g, '').trim().toUpperCase()
}

function generateRecoveryCode() {
  const hex = crypto.randomBytes(16).toString('hex').toUpperCase()
  return `${hex.slice(0, 8)}-${hex.slice(8, 16)}-${hex.slice(16, 24)}-${hex.slice(24, 32)}`
}

function verifyHash(password, expectedHash, salt) {
  const actual = pbkdf2Hex(password, salt)
  const expected = Buffer.from(String(expectedHash ?? ''), 'hex')
  const actualBuffer = Buffer.from(actual, 'hex')
  if (expected.length !== actualBuffer.length) return false
  return crypto.timingSafeEqual(actualBuffer, expected)
}

function mapSchoolAuthRow(row) {
  if (!row) return null

  return {
    id: row.id,
    passwordHash: row.password_hash,
    salt: row.salt,
    recoveryCodeHash: row.recovery_code_hash,
    recoverySalt: row.recovery_salt,
    sessionTokenHash: row.session_token_hash,
    loginAttempts: Number(row.login_attempts ?? 0) || 0,
    lockUntil: row.lock_until ?? null,
    lastLoginAt: row.last_login_at ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function getSchoolAuthRecord(database) {
  return mapSchoolAuthRow(
    database.prepare('SELECT * FROM school_auth WHERE id = ?').get(SCHOOL_AUTH_ID)
  )
}

function clearExpiredLock(database, record) {
  if (!record?.lockUntil) return record
  if (new Date(record.lockUntil).getTime() > Date.now()) return record

  const updatedAt = getNowIso()
  database.prepare(`
    UPDATE school_auth
    SET login_attempts = 0, lock_until = NULL, updated_at = ?
    WHERE id = ?
  `).run(updatedAt, SCHOOL_AUTH_ID)

  return {
    ...record,
    loginAttempts: 0,
    lockUntil: null,
    updatedAt,
  }
}

function upsertSchoolAuth(database, record) {
  database.prepare(`
    INSERT INTO school_auth (
      id, password_hash, salt, recovery_code_hash, recovery_salt, session_token_hash,
      login_attempts, lock_until, last_login_at, created_at, updated_at
    ) VALUES (
      @id, @password_hash, @salt, @recovery_code_hash, @recovery_salt, @session_token_hash,
      @login_attempts, @lock_until, @last_login_at, @created_at, @updated_at
    )
    ON CONFLICT(id) DO UPDATE SET
      password_hash = excluded.password_hash,
      salt = excluded.salt,
      recovery_code_hash = excluded.recovery_code_hash,
      recovery_salt = excluded.recovery_salt,
      session_token_hash = excluded.session_token_hash,
      login_attempts = excluded.login_attempts,
      lock_until = excluded.lock_until,
      last_login_at = excluded.last_login_at,
      created_at = excluded.created_at,
      updated_at = excluded.updated_at
  `).run({
    id: SCHOOL_AUTH_ID,
    password_hash: record.passwordHash,
    salt: record.salt,
    recovery_code_hash: record.recoveryCodeHash,
    recovery_salt: record.recoverySalt,
    session_token_hash: record.sessionTokenHash ?? null,
    login_attempts: Number(record.loginAttempts ?? 0) || 0,
    lock_until: record.lockUntil ?? null,
    last_login_at: record.lastLoginAt ?? null,
    created_at: record.createdAt,
    updated_at: record.updatedAt,
  })
}

function getStatus(database) {
  const record = clearExpiredLock(database, getSchoolAuthRecord(database))
  return {
    configured: Boolean(record?.passwordHash && record?.salt),
    loginAttempts: record?.loginAttempts ?? 0,
    lockUntil: record?.lockUntil ? new Date(record.lockUntil).getTime() : null,
  }
}

function registerSchoolAuthHandlers() {
  ipcMain.handle('school-auth:get-status', async () => {
    const database = getDb()
    return getStatus(database)
  })

  ipcMain.handle('school-auth:migrate-legacy', async (_event, legacyRecord = {}) => {
    const database = getDb()
    const current = getSchoolAuthRecord(database)
    if (current?.passwordHash && current?.salt) {
      return getStatus(database)
    }

    if (!legacyRecord?.passwordHash || !legacyRecord?.salt) {
      return { configured: false, loginAttempts: 0, lockUntil: null }
    }

    const now = getNowIso()
    upsertSchoolAuth(database, {
      passwordHash: legacyRecord.passwordHash,
      salt: legacyRecord.salt,
      recoveryCodeHash: legacyRecord.recoveryCodeHash ?? null,
      recoverySalt: legacyRecord.recoverySalt ?? null,
      sessionTokenHash: legacyRecord.sessionToken ? sha256Hex(legacyRecord.sessionToken) : null,
      loginAttempts: Number(legacyRecord.loginAttempts ?? 0) || 0,
      lockUntil: legacyRecord.lockUntil
        ? new Date(Number.isFinite(legacyRecord.lockUntil) ? legacyRecord.lockUntil : legacyRecord.lockUntil).toISOString()
        : null,
      lastLoginAt: legacyRecord.lastLoginAt ?? null,
      createdAt: legacyRecord.createdAt ?? now,
      updatedAt: now,
    })

    return getStatus(database)
  })

  ipcMain.handle('school-auth:setup', async (_event, password) => {
    const trimmed = String(password ?? '').trim()
    if (trimmed.length < 8) throw new Error('Password must be at least 8 characters long.')

    const database = getDb()
    const recoveryCode = generateRecoveryCode()
    const salt = randomHex(16)
    const recoverySalt = randomHex(16)
    const sessionToken = randomHex(16)
    const now = getNowIso()

    upsertSchoolAuth(database, {
      passwordHash: pbkdf2Hex(trimmed, salt),
      salt,
      recoveryCodeHash: pbkdf2Hex(normalizeRecoveryCode(recoveryCode), recoverySalt),
      recoverySalt,
      sessionTokenHash: sha256Hex(sessionToken),
      loginAttempts: 0,
      lockUntil: null,
      lastLoginAt: now,
      createdAt: now,
      updatedAt: now,
    })

    return { ok: true, recoveryCode, sessionToken }
  })

  ipcMain.handle('school-auth:validate-session', async (_event, sessionToken) => {
    if (!sessionToken) return { valid: false }

    const database = getDb()
    const record = getSchoolAuthRecord(database)
    if (!record?.sessionTokenHash) return { valid: false }

    return {
      valid: sha256Hex(sessionToken) === record.sessionTokenHash,
    }
  })

  ipcMain.handle('school-auth:login', async (_event, password) => {
    const database = getDb()
    const record = clearExpiredLock(database, getSchoolAuthRecord(database))
    if (!record?.passwordHash || !record?.salt) {
      return { ok: false, error: 'Password is not set up yet.', loginAttempts: 0, lockUntil: null }
    }

    if (record.lockUntil && new Date(record.lockUntil).getTime() > Date.now()) {
      return {
        ok: false,
        error: 'Too many attempts. Try again in 5 minutes.',
        loginAttempts: record.loginAttempts,
        lockUntil: new Date(record.lockUntil).getTime(),
      }
    }

    if (!verifyHash(password, record.passwordHash, record.salt)) {
      const nextAttempts = record.loginAttempts + 1
      const nextLockUntil = nextAttempts >= MAX_ATTEMPTS
        ? new Date(Date.now() + LOCK_DURATION_MS).toISOString()
        : null
      const updatedAt = getNowIso()

      database.prepare(`
        UPDATE school_auth
        SET login_attempts = ?, lock_until = ?, updated_at = ?
        WHERE id = ?
      `).run(nextAttempts, nextLockUntil, updatedAt, SCHOOL_AUTH_ID)

      return {
        ok: false,
        error: nextLockUntil
          ? 'Too many attempts. Try again in 5 minutes.'
          : 'Incorrect password. Please try again.',
        loginAttempts: nextAttempts,
        lockUntil: nextLockUntil ? new Date(nextLockUntil).getTime() : null,
      }
    }

    const sessionToken = randomHex(16)
    const now = getNowIso()
    database.prepare(`
      UPDATE school_auth
      SET session_token_hash = ?, login_attempts = 0, lock_until = NULL, last_login_at = ?, updated_at = ?
      WHERE id = ?
    `).run(sha256Hex(sessionToken), now, now, SCHOOL_AUTH_ID)

    return {
      ok: true,
      sessionToken,
      loginAttempts: 0,
      lockUntil: null,
    }
  })

  ipcMain.handle('school-auth:logout', async (_event, sessionToken) => {
    const database = getDb()
    const record = getSchoolAuthRecord(database)
    if (!record) return { ok: true }

    if (!sessionToken || sha256Hex(sessionToken) === record.sessionTokenHash) {
      database.prepare(`
        UPDATE school_auth
        SET session_token_hash = NULL, updated_at = ?
        WHERE id = ?
      `).run(getNowIso(), SCHOOL_AUTH_ID)
    }

    return { ok: true }
  })

  ipcMain.handle('school-auth:change-password', async (_event, { currentPassword, newPassword }) => {
    const database = getDb()
    const record = getSchoolAuthRecord(database)
    if (!record?.passwordHash || !record?.salt) {
      return { ok: false, error: 'Auth record not found.' }
    }

    if (!verifyHash(currentPassword, record.passwordHash, record.salt)) {
      return { ok: false, error: 'Current password is incorrect.' }
    }

    const trimmed = String(newPassword ?? '').trim()
    if (trimmed.length < 8) {
      return { ok: false, error: 'Password must be at least 8 characters long.' }
    }

    const salt = randomHex(16)
    const sessionToken = randomHex(16)
    const now = getNowIso()
    database.prepare(`
      UPDATE school_auth
      SET password_hash = ?, salt = ?, session_token_hash = ?, login_attempts = 0, lock_until = NULL, updated_at = ?
      WHERE id = ?
    `).run(pbkdf2Hex(trimmed, salt), salt, sha256Hex(sessionToken), now, SCHOOL_AUTH_ID)

    return { ok: true, sessionToken }
  })

  ipcMain.handle('school-auth:regenerate-recovery-code', async (_event, currentPassword) => {
    const database = getDb()
    const record = getSchoolAuthRecord(database)
    if (!record?.passwordHash || !record?.salt) {
      return { ok: false, error: 'Auth record not found.' }
    }

    if (!verifyHash(currentPassword, record.passwordHash, record.salt)) {
      return { ok: false, error: 'Incorrect password.' }
    }

    const recoveryCode = generateRecoveryCode()
    const recoverySalt = randomHex(16)
    database.prepare(`
      UPDATE school_auth
      SET recovery_code_hash = ?, recovery_salt = ?, updated_at = ?
      WHERE id = ?
    `).run(
      pbkdf2Hex(normalizeRecoveryCode(recoveryCode), recoverySalt),
      recoverySalt,
      getNowIso(),
      SCHOOL_AUTH_ID,
    )

    return { ok: true, recoveryCode }
  })

  ipcMain.handle('school-auth:verify-recovery-code', async (_event, code) => {
    const database = getDb()
    const record = getSchoolAuthRecord(database)
    if (!record?.recoveryCodeHash || !record?.recoverySalt) return { valid: false }

    return {
      valid: verifyHash(normalizeRecoveryCode(code), record.recoveryCodeHash, record.recoverySalt),
    }
  })

  ipcMain.handle('school-auth:reset-password-with-code', async (_event, { recoveryCode, newPassword }) => {
    const database = getDb()
    const record = getSchoolAuthRecord(database)
    if (!record?.recoveryCodeHash || !record?.recoverySalt) {
      return { ok: false, error: 'Recovery code is not configured.' }
    }

    if (!verifyHash(normalizeRecoveryCode(recoveryCode), record.recoveryCodeHash, record.recoverySalt)) {
      return { ok: false, error: 'Invalid recovery code.' }
    }

    const trimmed = String(newPassword ?? '').trim()
    if (trimmed.length < 8) {
      return { ok: false, error: 'Password must be at least 8 characters long.' }
    }

    const salt = randomHex(16)
    const sessionToken = randomHex(16)
    const now = getNowIso()
    database.prepare(`
      UPDATE school_auth
      SET
        password_hash = ?,
        salt = ?,
        session_token_hash = ?,
        login_attempts = 0,
        lock_until = NULL,
        last_login_at = ?,
        updated_at = ?
      WHERE id = ?
    `).run(
      pbkdf2Hex(trimmed, salt),
      salt,
      sha256Hex(sessionToken),
      now,
      now,
      SCHOOL_AUTH_ID,
    )

    return { ok: true, sessionToken }
  })
}

module.exports = { registerSchoolAuthHandlers }
