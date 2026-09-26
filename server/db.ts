import initSqlJs, { Database } from 'sql.js';
import fs from 'fs';
import path from 'path';

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

  const SQL = await initSqlJs({
    locateFile: (file) => {
      try {
        const localPath = path.resolve(process.cwd(), 'node_modules/sql.js/dist', file);
        if (fs.existsSync(localPath)) return localPath;
      } catch {
        // ignore
      }
      return file;
    },
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
  dbInstance.run('PRAGMA foreign_keys = ON;');
  
  initializeSchema(dbInstance);
  return dbInstance;
}

export function saveDb(): void {
  if (!dbInstance) return;
  try {
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
      color TEXT NOT NULL,
      icon TEXT NOT NULL,
      is_default INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY (home_id) REFERENCES homes(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS merchants (
      id TEXT PRIMARY KEY,
      home_id TEXT NOT NULL,
      name TEXT NOT NULL,
      default_category_id TEXT,
      default_expense_type TEXT DEFAULT 'variable',
      created_at TEXT NOT NULL,
      FOREIGN KEY (home_id) REFERENCES homes(id) ON DELETE CASCADE,
      FOREIGN KEY (default_category_id) REFERENCES categories(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS recurring_expenses (
      id TEXT PRIMARY KEY,
      home_id TEXT NOT NULL,
      merchant_id TEXT NOT NULL,
      category_id TEXT NOT NULL,
      name TEXT NOT NULL,
      amount REAL NOT NULL,
      frequency TEXT NOT NULL DEFAULT 'monthly',
      due_day INTEGER NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      notes TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (home_id) REFERENCES homes(id) ON DELETE CASCADE,
      FOREIGN KEY (merchant_id) REFERENCES merchants(id) ON DELETE CASCADE,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY,
      home_id TEXT NOT NULL,
      merchant_id TEXT NOT NULL,
      category_id TEXT NOT NULL,
      amount REAL NOT NULL,
      description TEXT NOT NULL,
      expense_type TEXT NOT NULL,
      date TEXT NOT NULL,
      paid_by_member_id TEXT,
      recurring_expense_id TEXT,
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (home_id) REFERENCES homes(id) ON DELETE CASCADE,
      FOREIGN KEY (merchant_id) REFERENCES merchants(id) ON DELETE RESTRICT,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT,
      FOREIGN KEY (paid_by_member_id) REFERENCES home_members(id) ON DELETE SET NULL,
      FOREIGN KEY (recurring_expense_id) REFERENCES recurring_expenses(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS monthly_limits (
      id TEXT PRIMARY KEY,
      home_id TEXT NOT NULL,
      category_id TEXT,
      limit_amount REAL NOT NULL,
      month TEXT,
      alert_threshold REAL DEFAULT 80.0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (home_id) REFERENCES homes(id) ON DELETE CASCADE,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_expenses_home_date ON expenses(home_id, date);
    CREATE INDEX IF NOT EXISTS idx_expenses_merchant ON expenses(merchant_id);
    CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category_id);
    CREATE INDEX IF NOT EXISTS idx_merchants_home ON merchants(home_id);
    CREATE INDEX IF NOT EXISTS idx_recurring_home ON recurring_expenses(home_id);
    CREATE INDEX IF NOT EXISTS idx_limits_home ON monthly_limits(home_id);
  `);
  saveDb();
}
