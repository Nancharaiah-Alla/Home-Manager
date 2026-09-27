import initSqlJs, { Database } from 'sql.js';
import fs from 'fs';
import path from 'path';
import { SQL_WASM_BASE64 } from './sqlWasmBase64';

const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const DATA_DIR = isServerless ? '/tmp/homemanager-data' : path.resolve(process.cwd(), 'data');
const DB_FILE = path.resolve(DATA_DIR, 'homemanager.sqlite');
const SEED_SOURCE_FILE = path.resolve(process.cwd(), 'data/homemanager.sqlite');

let dbInstance: Database | null = null;

export async function getDb(): Promise<Database> {
  if (dbInstance) return dbInstance;

  if (!fs.existsSync(DATA_DIR)) {
    try {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    } catch (e) {
      console.warn('Could not create DATA_DIR:', e);
    }
  }

  // In serverless, if /tmp doesn't have the db yet, copy from the repository build if present
  if (isServerless && !fs.existsSync(DB_FILE) && fs.existsSync(SEED_SOURCE_FILE)) {
    try {
      fs.copyFileSync(SEED_SOURCE_FILE, DB_FILE);
    } catch (e) {
      console.warn('Could not copy seed DB to /tmp:', e);
    }
  }

  // Decode the inlined WebAssembly binary so it works without any filesystem dependency
  const wasmBuffer = Buffer.from(SQL_WASM_BASE64, 'base64');
  const wasmArrayBuffer = wasmBuffer.buffer.slice(
    wasmBuffer.byteOffset,
    wasmBuffer.byteOffset + wasmBuffer.byteLength
  );

  const SQL = await initSqlJs({
    wasmBinary: wasmArrayBuffer,
  });

  let fileBuffer: Buffer | null = null;
  if (fs.existsSync(DB_FILE)) {
    try {
      fileBuffer = fs.readFileSync(DB_FILE);
    } catch (e) {
      console.error('Failed reading existing db file, creating new:', e);
    }
  }

  dbInstance = fileBuffer ? new SQL.Database(fileBuffer) : new SQL.Database();
  try {
    dbInstance.run('PRAGMA foreign_keys = ON;');
  } catch (e) {
    console.warn('Could not enable foreign keys pragma:', e);
  }
  
  initializeSchema(dbInstance);
  return dbInstance;
}

export function saveDb(): void {
  if (!dbInstance) return;
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const data = dbInstance.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_FILE, buffer);
  } catch (err) {
    console.error('Error saving SQLite database to disk:', err);
  }
}

export function queryAll<T = Record<string, unknown>>(sql: string, params: (string | number | null | undefined)[] = []): T[] {
  if (!dbInstance) throw new Error('Database not initialized');
  const stmt = dbInstance.prepare(sql);
  stmt.bind(params as (string | number | null)[]);
  const rows: T[] = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject() as T);
  }
  stmt.free();
  return rows;
}

export function queryOne<T = Record<string, unknown>>(sql: string, params: (string | number | null | undefined)[] = []): T | null {
  const rows = queryAll<T>(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

export function run(sql: string, params: (string | number | null | undefined)[] = []): void {
  if (!dbInstance) throw new Error('Database not initialized');
  const stmt = dbInstance.prepare(sql);
  stmt.bind(params as (string | number | null)[]);
  stmt.step();
  stmt.free();
  saveDb();
}

export function runTransaction(callback: () => void): void {
  if (!dbInstance) throw new Error('Database not initialized');
  try {
    callback();
    saveDb();
  } catch (e) {
    throw e;
  }
}

function initializeSchema(db: Database): void {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      avatar_color TEXT DEFAULT '#2563EB',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS homes (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      currency_symbol TEXT NOT NULL DEFAULT '₹',
      currency_code TEXT NOT NULL DEFAULT 'INR',
      created_by_user_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS home_members (
      id TEXT PRIMARY KEY,
      home_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'admin',
      nickname TEXT,
      color TEXT DEFAULT '#2563EB',
      joined_at TEXT NOT NULL,
      FOREIGN KEY (home_id) REFERENCES homes(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(home_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      home_id TEXT NOT NULL,
      name TEXT NOT NULL,
      color TEXT DEFAULT '#64748B',
      icon TEXT DEFAULT 'Tag',
      is_default INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY (home_id) REFERENCES homes(id) ON DELETE CASCADE,
      UNIQUE(home_id, name)
    );

    CREATE TABLE IF NOT EXISTS merchants (
      id TEXT PRIMARY KEY,
      home_id TEXT NOT NULL,
      name TEXT NOT NULL,
      default_category_id TEXT,
      default_expense_type TEXT DEFAULT 'variable',
      created_at TEXT NOT NULL,
      FOREIGN KEY (home_id) REFERENCES homes(id) ON DELETE CASCADE,
      FOREIGN KEY (default_category_id) REFERENCES categories(id) ON DELETE SET NULL,
      UNIQUE(home_id, name)
    );

    CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY,
      home_id TEXT NOT NULL,
      title TEXT NOT NULL,
      amount REAL NOT NULL,
      expense_date TEXT NOT NULL,
      category_id TEXT NOT NULL,
      merchant_id TEXT,
      expense_type TEXT NOT NULL DEFAULT 'variable',
      frequency TEXT,
      paid_by_member_id TEXT NOT NULL,
      split_type TEXT NOT NULL DEFAULT 'equal',
      notes TEXT,
      created_by_user_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (home_id) REFERENCES homes(id) ON DELETE CASCADE,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT,
      FOREIGN KEY (merchant_id) REFERENCES merchants(id) ON DELETE SET NULL,
      FOREIGN KEY (paid_by_member_id) REFERENCES home_members(id) ON DELETE RESTRICT,
      FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE RESTRICT
    );

    CREATE TABLE IF NOT EXISTS expense_splits (
      id TEXT PRIMARY KEY,
      expense_id TEXT NOT NULL,
      member_id TEXT NOT NULL,
      share_amount REAL NOT NULL,
      percentage REAL,
      exact_amount REAL,
      is_settled INTEGER DEFAULT 0,
      settled_at TEXT,
      FOREIGN KEY (expense_id) REFERENCES expenses(id) ON DELETE CASCADE,
      FOREIGN KEY (member_id) REFERENCES home_members(id) ON DELETE CASCADE,
      UNIQUE(expense_id, member_id)
    );

    CREATE TABLE IF NOT EXISTS settlements (
      id TEXT PRIMARY KEY,
      home_id TEXT NOT NULL,
      from_member_id TEXT NOT NULL,
      to_member_id TEXT NOT NULL,
      amount REAL NOT NULL,
      settlement_date TEXT NOT NULL,
      payment_method TEXT DEFAULT 'upi',
      reference_id TEXT,
      notes TEXT,
      created_by_user_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (home_id) REFERENCES homes(id) ON DELETE CASCADE,
      FOREIGN KEY (from_member_id) REFERENCES home_members(id) ON DELETE RESTRICT,
      FOREIGN KEY (to_member_id) REFERENCES home_members(id) ON DELETE RESTRICT,
      FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE RESTRICT
    );

    CREATE TABLE IF NOT EXISTS budgets (
      id TEXT PRIMARY KEY,
      home_id TEXT NOT NULL,
      month_year TEXT NOT NULL,
      category_id TEXT,
      budget_amount REAL NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (home_id) REFERENCES homes(id) ON DELETE CASCADE,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS recurring_rules (
      id TEXT PRIMARY KEY,
      home_id TEXT NOT NULL,
      title TEXT NOT NULL,
      amount REAL NOT NULL,
      category_id TEXT NOT NULL,
      merchant_id TEXT,
      expense_type TEXT NOT NULL DEFAULT 'fixed',
      frequency TEXT NOT NULL DEFAULT 'monthly',
      day_of_month INTEGER DEFAULT 1,
      paid_by_member_id TEXT NOT NULL,
      split_type TEXT NOT NULL DEFAULT 'equal',
      is_active INTEGER DEFAULT 1,
      last_generated_date TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (home_id) REFERENCES homes(id) ON DELETE CASCADE,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT,
      FOREIGN KEY (merchant_id) REFERENCES merchants(id) ON DELETE SET NULL,
      FOREIGN KEY (paid_by_member_id) REFERENCES home_members(id) ON DELETE RESTRICT
    );

    CREATE TABLE IF NOT EXISTS user_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      device_id TEXT,
      device_name TEXT,
      ip_address TEXT,
      user_agent TEXT,
      status TEXT NOT NULL DEFAULT 'active', -- 'active' | 'revoked' | 'logged_out'
      created_at TEXT NOT NULL,
      last_active_at TEXT NOT NULL,
      revoked_at TEXT,
      revoked_reason TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS phone_otp_verifications (
      id TEXT PRIMARY KEY,
      phone TEXT NOT NULL,
      otp_code TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      attempts INTEGER DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS session_conflict_requests (
      id TEXT PRIMARY KEY,
      conflict_token TEXT UNIQUE NOT NULL,
      user_id TEXT NOT NULL,
      phone TEXT NOT NULL,
      target_device_id TEXT,
      target_device_name TEXT,
      current_device_name TEXT,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS purchase_requests (
      id TEXT PRIMARY KEY,
      home_id TEXT NOT NULL,
      item_name TEXT NOT NULL,
      estimated_amount REAL,
      notes TEXT,
      requested_by_member_id TEXT NOT NULL,
      requested_by_name TEXT,
      status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'accepted' | 'rejected'
      accepted_by_name TEXT,
      expense_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (home_id) REFERENCES homes(id) ON DELETE CASCADE,
      FOREIGN KEY (requested_by_member_id) REFERENCES home_members(id) ON DELETE CASCADE
    );
  `);

  // Run non-destructive column migrations for existing databases
  try {
    db.run(`ALTER TABLE users ADD COLUMN phone TEXT;`);
  } catch {
    // Column already exists
  }
  try {
    db.run(`ALTER TABLE users ADD COLUMN active_session_id TEXT;`);
  } catch {
    // Column already exists
  }
  try {
    db.run(`ALTER TABLE users ADD COLUMN active_device_name TEXT;`);
  } catch {
    // Column already exists
  }
  try {
    db.run(`ALTER TABLE users ADD COLUMN session_created_at TEXT;`);
  } catch {
    // Column already exists
  }
  try {
    db.run(`ALTER TABLE home_members ADD COLUMN phone TEXT;`);
  } catch {
    // Column already exists
  }
  try {
    db.run(`ALTER TABLE home_members ADD COLUMN email TEXT;`);
  } catch {
    // Column already exists
  }
}
