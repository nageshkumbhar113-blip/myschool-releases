const path = require('path')
const { app } = require('electron')
const Database = require('better-sqlite3')

let db = null

function getNowIso() {
  return new Date().toISOString()
}

function getDbPath() {
  return path.join(app.getPath('userData'), 'school.db')
}

function ensureSchema(database) {
  database.pragma('journal_mode = WAL')
  database.pragma('foreign_keys = ON')
  database.pragma('synchronous = NORMAL')

  database.exec(`
    CREATE TABLE IF NOT EXISTS institutes (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      subscription_plan TEXT,
      expiry_date TEXT,
      max_students INTEGER NOT NULL DEFAULT 0,
      address TEXT,
      location TEXT,
      phone TEXT,
      email TEXT,
      principal_name TEXT,
      payment_amount REAL,
      payment_date TEXT,
      payment_status TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_institutes_deleted_at
      ON institutes(deleted_at);

    CREATE TABLE IF NOT EXISTS license_data (
      id TEXT PRIMARY KEY,
      data_json TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS fields (
      id TEXT PRIMARY KEY,
      institute_id TEXT NOT NULL,
      label TEXT NOT NULL,
      field_key TEXT NOT NULL,
      field_type TEXT NOT NULL,
      options_json TEXT NOT NULL DEFAULT '[]',
      validation_json TEXT NOT NULL DEFAULT '{}',
      meta_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_fields_institute_id
      ON fields(institute_id);
    CREATE INDEX IF NOT EXISTS idx_fields_institute_order
      ON fields(institute_id, deleted_at, updated_at);

    CREATE TABLE IF NOT EXISTS templates (
      id TEXT PRIMARY KEY,
      institute_id TEXT NOT NULL,
      name TEXT NOT NULL,
      template_type TEXT NOT NULL,
      page_size TEXT NOT NULL DEFAULT 'A4',
      background_image TEXT,
      field_mappings_json TEXT NOT NULL DEFAULT '[]',
      excluded_field_keys_json TEXT NOT NULL DEFAULT '[]',
      is_locked INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_templates_institute_id
      ON templates(institute_id);
    CREATE INDEX IF NOT EXISTS idx_templates_active
      ON templates(institute_id, template_type, is_active, deleted_at);

    CREATE TABLE IF NOT EXISTS settings (
      id TEXT PRIMARY KEY,
      institute_id TEXT NOT NULL UNIQUE,
      data_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_settings_institute_id
      ON settings(institute_id);

    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      institute_id TEXT NOT NULL,
      student_id TEXT NOT NULL,
      file_name TEXT NOT NULL,
      file_type TEXT,
      file_size INTEGER NOT NULL DEFAULT 0,
      doc_type TEXT,
      blob TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_documents_institute_id
      ON documents(institute_id, deleted_at);
    CREATE INDEX IF NOT EXISTS idx_documents_student_id
      ON documents(student_id, deleted_at);

    CREATE TABLE IF NOT EXISTS students (
      id TEXT PRIMARY KEY,
      institute_id TEXT NOT NULL,
      admission_no TEXT,
      roll_number TEXT,
      full_name TEXT NOT NULL,
      class_name TEXT,
      medium TEXT,
      board TEXT,
      academic_year TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      dynamic_fields TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_students_institute_id
      ON students(institute_id);
    CREATE INDEX IF NOT EXISTS idx_students_academic_year
      ON students(institute_id, academic_year);

    CREATE TABLE IF NOT EXISTS fees (
      id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL,
      institute_id TEXT NOT NULL,
      academic_year TEXT,
      total_fee REAL NOT NULL DEFAULT 0,
      discount REAL NOT NULL DEFAULT 0,
      effective_fee REAL NOT NULL DEFAULT 0,
      paid_amount REAL NOT NULL DEFAULT 0,
      remaining_amount REAL NOT NULL DEFAULT 0,
      installments_json TEXT NOT NULL DEFAULT '[]',
      due_date TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT,
      FOREIGN KEY(student_id) REFERENCES students(id)
    );

    CREATE INDEX IF NOT EXISTS idx_fees_student_id
      ON fees(student_id);
    CREATE INDEX IF NOT EXISTS idx_fees_institute_id
      ON fees(institute_id);

    CREATE TABLE IF NOT EXISTS receipts (
      id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL,
      institute_id TEXT NOT NULL,
      receipt_number TEXT NOT NULL UNIQUE,
      amount REAL NOT NULL DEFAULT 0,
      payment_date TEXT,
      payment_mode TEXT,
      installment_number INTEGER,
      status TEXT NOT NULL DEFAULT 'active',
      cancel_reason TEXT,
      cancelled_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT,
      FOREIGN KEY(student_id) REFERENCES students(id)
    );

    CREATE INDEX IF NOT EXISTS idx_receipts_student_id
      ON receipts(student_id);
    CREATE INDEX IF NOT EXISTS idx_receipts_institute_id
      ON receipts(institute_id);

    CREATE TABLE IF NOT EXISTS counters (
      id TEXT PRIMARY KEY,
      institute_id TEXT NOT NULL,
      key TEXT NOT NULL,
      value INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE (institute_id, key)
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      institute_id TEXT,
      action TEXT NOT NULL,
      table_name TEXT NOT NULL,
      record_id TEXT NOT NULL,
      before_json TEXT,
      after_json TEXT,
      timestamp TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS super_admin_config (
      id TEXT PRIMARY KEY,
      password_hash TEXT NOT NULL,
      salt TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS super_admin_sessions (
      id TEXT PRIMARY KEY,
      token_hash TEXT NOT NULL,
      device_hash TEXT NOT NULL,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS school_auth (
      id TEXT PRIMARY KEY,
      password_hash TEXT NOT NULL,
      salt TEXT NOT NULL,
      recovery_code_hash TEXT,
      recovery_salt TEXT,
      session_token_hash TEXT,
      login_attempts INTEGER NOT NULL DEFAULT 0,
      lock_until TEXT,
      last_login_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_expires
      ON super_admin_sessions(expires_at);
  `)

  // Additive migrations — safely add new columns to existing DBs.
  // SQLite throws if a column already exists, so each is wrapped in try/catch.
  const addCol = (sql) => { try { database.exec(sql) } catch {} }
  addCol('ALTER TABLE institutes ADD COLUMN address TEXT')
  addCol('ALTER TABLE institutes ADD COLUMN location TEXT')
  addCol('ALTER TABLE institutes ADD COLUMN phone TEXT')
  addCol('ALTER TABLE institutes ADD COLUMN email TEXT')
  addCol('ALTER TABLE institutes ADD COLUMN principal_name TEXT')
  addCol('ALTER TABLE institutes ADD COLUMN payment_amount REAL')
  addCol('ALTER TABLE institutes ADD COLUMN payment_date TEXT')
  addCol('ALTER TABLE institutes ADD COLUMN payment_status TEXT')
  addCol('ALTER TABLE students ADD COLUMN lc_printed_at TEXT')
  addCol('ALTER TABLE students ADD COLUMN transferred_at TEXT')
  addCol('ALTER TABLE students ADD COLUMN admission_no TEXT')
  addCol("ALTER TABLE templates ADD COLUMN header_config_json TEXT NOT NULL DEFAULT '{}'")
  addCol("ALTER TABLE templates ADD COLUMN excluded_field_keys_json TEXT NOT NULL DEFAULT '[]'")
  try {
    database.exec(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_students_admission_unique
        ON students(institute_id, admission_no)
        WHERE deleted_at IS NULL AND admission_no IS NOT NULL AND trim(admission_no) <> '';
    `)
  } catch {}
  database.prepare(`
    UPDATE students
    SET admission_no = json_extract(dynamic_fields, '$.admissionNo')
    WHERE (admission_no IS NULL OR trim(admission_no) = '')
      AND deleted_at IS NULL
      AND json_extract(dynamic_fields, '$.admissionNo') IS NOT NULL
      AND trim(json_extract(dynamic_fields, '$.admissionNo')) <> ''
  `).run()
}

function getDb() {
  if (db) return db
  db = new Database(getDbPath())
  ensureSchema(db)
  return db
}

function closeDb() {
  if (!db) return
  db.close()
  db = null
}

module.exports = {
  closeDb,
  getDb,
  getDbPath,
  getNowIso,
}
