'use strict'

const crypto = require('crypto')
const { ipcMain } = require('electron')
const { getDb, getNowIso } = require('./sqlite.cjs')

const CONFIG_ID = 'primary'
const SESSION_TTL_MS = 12 * 60 * 60 * 1000

function sha256Hex(input) {
  return crypto.createHash('sha256').update(String(input ?? ''), 'utf8').digest('hex')
}

function hashPassword(password, salt) {
  return sha256Hex(`${salt}:${password}`)
}

function registerAuthHandlers() {
  ipcMain.handle('auth:is-configured', () => {
    const db = getDb()
    const row = db.prepare('SELECT id FROM super_admin_config WHERE id = ?').get(CONFIG_ID)
    return { configured: Boolean(row) }
  })

  ipcMain.handle('auth:setup-password', (_event, password) => {
    const trimmed = String(password ?? '').trim()
    if (trimmed.length < 8) throw new Error('Password must be at least 8 characters long.')

    const db = getDb()
    const salt = crypto.randomBytes(16).toString('hex')
    const passwordHash = hashPassword(trimmed, salt)
    const now = getNowIso()

    db.prepare(`
      INSERT INTO super_admin_config (id, password_hash, salt, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        password_hash = excluded.password_hash,
        salt = excluded.salt,
        updated_at = excluded.updated_at
    `).run(CONFIG_ID, passwordHash, salt, now, now)

    return { ok: true }
  })

  ipcMain.handle('auth:login', (_event, { password, deviceHash }) => {
    const db = getDb()
    const config = db.prepare('SELECT * FROM super_admin_config WHERE id = ?').get(CONFIG_ID)
    if (!config) return { ok: false }

    const passwordHash = hashPassword(String(password ?? ''), config.salt)
    if (passwordHash !== config.password_hash) return { ok: false }

    const sessionId = crypto.randomUUID()
    const sessionToken = crypto.randomBytes(32).toString('hex')
    const tokenHash = sha256Hex(sessionToken)
    const now = new Date()
    const expiresAt = new Date(now.getTime() + SESSION_TTL_MS).toISOString()

    db.prepare(`
      INSERT INTO super_admin_sessions (id, token_hash, device_hash, created_at, expires_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(sessionId, tokenHash, String(deviceHash ?? ''), now.toISOString(), expiresAt)

    return { ok: true, sessionId, sessionToken }
  })

  ipcMain.handle('auth:validate-session', (_event, { sessionId, sessionToken, deviceHash }) => {
    if (!sessionId || !sessionToken) return { valid: false }

    const db = getDb()
    const session = db.prepare('SELECT * FROM super_admin_sessions WHERE id = ?').get(sessionId)
    if (!session) return { valid: false }

    if (new Date(session.expires_at) <= new Date()) {
      db.prepare('DELETE FROM super_admin_sessions WHERE id = ?').run(sessionId)
      return { valid: false }
    }

    const tokenHash = sha256Hex(sessionToken)
    if (tokenHash !== session.token_hash || String(deviceHash ?? '') !== session.device_hash) {
      return { valid: false }
    }

    return { valid: true }
  })

  ipcMain.handle('auth:logout', (_event, sessionId) => {
    if (sessionId) {
      const db = getDb()
      db.prepare('DELETE FROM super_admin_sessions WHERE id = ?').run(sessionId)
    }
    return { ok: true }
  })

  ipcMain.handle('auth:change-password', (_event, { oldPassword, newPassword }) => {
    const db = getDb()
    const config = db.prepare('SELECT * FROM super_admin_config WHERE id = ?').get(CONFIG_ID)
    if (!config) throw new Error('Super admin not configured.')

    const oldHash = hashPassword(String(oldPassword ?? ''), config.salt)
    if (oldHash !== config.password_hash) throw new Error('Current password is incorrect.')

    const trimmed = String(newPassword ?? '').trim()
    if (trimmed.length < 8) throw new Error('New password must be at least 8 characters long.')

    const salt = crypto.randomBytes(16).toString('hex')
    const passwordHash = hashPassword(trimmed, salt)
    const now = getNowIso()

    db.prepare(`
      UPDATE super_admin_config SET password_hash = ?, salt = ?, updated_at = ? WHERE id = ?
    `).run(passwordHash, salt, now, CONFIG_ID)

    db.prepare('DELETE FROM super_admin_sessions').run()

    return { ok: true }
  })
}

module.exports = { registerAuthHandlers }
