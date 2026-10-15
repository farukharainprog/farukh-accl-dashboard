import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { ORIGINAL_TASKS } from './seedData.js';

// Determine if running in Vercel Serverless Function or AWS Lambda
const isServerless = Boolean(
  process.env.VERCEL || 
  process.env.AWS_LAMBDA_FUNCTION_NAME || 
  process.env.LAMBDA_TASK_ROOT
);

let DB_PATH: string;

if (isServerless) {
  const tmpDbPath = path.resolve('/tmp', 'academy.db');
  const projectDbPath = path.resolve(process.cwd(), 'academy.db');

  // Copy existing seeded academy.db to /tmp if it exists and /tmp doesn't have it yet
  if (!fs.existsSync(tmpDbPath) && fs.existsSync(projectDbPath)) {
    try {
      fs.copyFileSync(projectDbPath, tmpDbPath);
    } catch (err) {
      console.warn('[Database] Could not copy initial academy.db to /tmp:', err);
    }
  }
  DB_PATH = tmpDbPath;
} else {
  DB_PATH = path.resolve(process.cwd(), 'academy.db');
}

export const db = new DatabaseSync(DB_PATH);

let dbInitialized = false;
export function ensureDatabaseInitialized(): void {
  if (dbInitialized) return;
  initDatabase();
  dbInitialized = true;
}

// Type-safe DB helper wrappers
export function queryAll<T = any>(sql: string, ...params: any[]): T[] {
  const stmt = db.prepare(sql);
  return (stmt.all(...params) as unknown) as T[];
}

export function queryOne<T = any>(sql: string, ...params: any[]): T | undefined {
  const stmt = db.prepare(sql);
  return (stmt.get(...params) as unknown) as T | undefined;
}

export function execute(sql: string, ...params: any[]): any {
  const stmt = db.prepare(sql);
  return stmt.run(...params);
}

// Helper for Pakistan Standard Time (Asia/Karachi)
export function getKarachiTimeString(date = new Date()): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Karachi',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  }).format(date) + ' PKT';
}

export function getKarachiDateKey(date = new Date()): string {
  // Returns YYYY-MM-DD in Asia/Karachi
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Karachi',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
  return parts;
}

export function getSetting(key: string, defaultValue = ''): string {
  const row = queryOne<{ value: string }>('SELECT value FROM academy_settings WHERE key = ?', key);
  return row ? row.value : defaultValue;
}

export function setSetting(key: string, value: string): void {
  execute('INSERT INTO academy_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value', key, value);
}

export function logAudit(userId: string, userName: string, userRole: string, action: string, details: string): void {
  const id = crypto.randomUUID();
  const timestamp = new Date().toISOString();
  execute(`
    INSERT INTO audit_logs (id, user_id, user_name, user_role, action, details, timestamp)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `, id, userId, userName, userRole, action, details, timestamp);
}

export function initDatabase(): void {
  // WAL mode & foreign keys
  db.exec('PRAGMA foreign_keys = ON;');

  // Academy Settings table
  db.exec(`
    CREATE TABLE IF NOT EXISTS academy_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  // Users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL COLLATE NOCASE,
      password_hash TEXT NOT NULL,
      salt TEXT NOT NULL,
      full_name TEXT NOT NULL,
      father_name TEXT,
      whatsapp TEXT,
      role TEXT NOT NULL DEFAULT 'student',
      status TEXT NOT NULL DEFAULT 'pending',
      learning_level TEXT DEFAULT 'Book 1',
      assigned_teacher_id TEXT,
      can_approve INTEGER DEFAULT 0,
      can_admit INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
    CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
  `);

  // Tasks table
  db.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      book TEXT NOT NULL,
      day_number INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      category TEXT NOT NULL,
      required_links TEXT NOT NULL,
      allows_text INTEGER DEFAULT 1,
      allows_file INTEGER DEFAULT 1,
      status TEXT DEFAULT 'active',
      source_flag TEXT,
      order_index INTEGER NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_tasks_book ON tasks(book);
    CREATE INDEX IF NOT EXISTS idx_tasks_day ON tasks(day_number);
  `);

  // Submissions table
  db.exec(`
    CREATE TABLE IF NOT EXISTS submissions (
      id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL,
      task_id TEXT NOT NULL,
      version INTEGER NOT NULL DEFAULT 1,
      status TEXT NOT NULL DEFAULT 'submitted',
      fb_link TEXT,
      yt_link TEXT,
      li_link TEXT,
      insta_link TEXT,
      other_link TEXT,
      file_url TEXT,
      file_name TEXT,
      student_notes TEXT,
      reviewer_id TEXT,
      reviewer_name TEXT,
      reviewer_feedback TEXT,
      reviewed_at TEXT,
      submitted_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
      UNIQUE(student_id, task_id, version)
    );
    CREATE INDEX IF NOT EXISTS idx_subs_student ON submissions(student_id);
    CREATE INDEX IF NOT EXISTS idx_subs_status ON submissions(status);
  `);

  // Submission History table
  db.exec(`
    CREATE TABLE IF NOT EXISTS submission_history (
      id TEXT PRIMARY KEY,
      submission_id TEXT NOT NULL,
      student_id TEXT NOT NULL,
      task_id TEXT NOT NULL,
      version INTEGER NOT NULL,
      status TEXT NOT NULL,
      links_json TEXT NOT NULL,
      student_notes TEXT,
      reviewer_id TEXT,
      reviewer_name TEXT,
      reviewer_feedback TEXT,
      timestamp TEXT NOT NULL
    );
  `);

  // Attendance Sessions table
  db.exec(`
    CREATE TABLE IF NOT EXISTS attendance_sessions (
      id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL,
      check_in_time TEXT NOT NULL,
      check_in_local TEXT NOT NULL,
      check_out_time TEXT,
      check_out_local TEXT,
      duration_minutes INTEGER DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'active',
      date_key TEXT NOT NULL,
      FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_att_student ON attendance_sessions(student_id);
    CREATE INDEX IF NOT EXISTS idx_att_date ON attendance_sessions(date_key);
  `);

  // Teacher Applications table
  db.exec(`
    CREATE TABLE IF NOT EXISTS teacher_applications (
      id TEXT PRIMARY KEY,
      full_name TEXT NOT NULL,
      email TEXT NOT NULL COLLATE NOCASE,
      whatsapp TEXT NOT NULL,
      subjects TEXT NOT NULL,
      introduction TEXT NOT NULL,
      experience TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      reviewer_notes TEXT,
      created_at TEXT NOT NULL,
      reviewed_at TEXT
    );
  `);

  // Student Admissions table
  db.exec(`
    CREATE TABLE IF NOT EXISTS student_admissions (
      id TEXT PRIMARY KEY,
      full_name TEXT NOT NULL,
      father_name TEXT NOT NULL,
      whatsapp TEXT NOT NULL,
      email TEXT NOT NULL COLLATE NOCASE,
      learning_level TEXT NOT NULL,
      assigned_teacher_id TEXT,
      registered_by_id TEXT,
      notes TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL,
      reviewed_at TEXT
    );
  `);

  // Batches table
  db.exec(`
    CREATE TABLE IF NOT EXISTS batches (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      teacher_id TEXT,
      teacher_name TEXT,
      schedule TEXT NOT NULL,
      zoom_link TEXT,
      max_students INTEGER DEFAULT 25,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL
    );
  `);

  // Batch Enrollments table
  db.exec(`
    CREATE TABLE IF NOT EXISTS batch_enrollments (
      id TEXT PRIMARY KEY,
      batch_id TEXT NOT NULL,
      student_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'enrolled',
      enrolled_at TEXT NOT NULL,
      FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE CASCADE,
      FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(batch_id, student_id)
    );
  `);

  // Student Feedback table
  db.exec(`
    CREATE TABLE IF NOT EXISTS student_feedback (
      id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL,
      student_name TEXT NOT NULL,
      category TEXT NOT NULL,
      rating INTEGER NOT NULL,
      comment TEXT NOT NULL,
      admin_response TEXT,
      created_at TEXT NOT NULL,
      responded_at TEXT,
      FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // Audit Logs table
  db.exec(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      user_name TEXT NOT NULL,
      user_role TEXT NOT NULL,
      action TEXT NOT NULL,
      details TEXT NOT NULL,
      timestamp TEXT NOT NULL
    );
  `);

  // Seed default settings
  const defaultSettings: Record<string, string> = {
    dashboard_title: 'Farukh Businessman Wala ACCL Dashboard',
    academy_name: 'Rehan School Tuition Academy',
    footer_credit: 'Created by FARUKH BUSINESSMAN WALA',
    whatsapp_primary: '0345 3967083',
    whatsapp_second: '03421336388',
    whatsapp_primary_link: 'https://wa.me/923453967083',
    whatsapp_second_link: 'https://wa.me/923421336388',
    academy_timezone: 'Asia/Karachi',
    logo_url: '',
    require_student_approval: 'true',
    require_teacher_approval: 'true',
  };

  for (const [key, val] of Object.entries(defaultSettings)) {
    const existing = queryOne('SELECT key FROM academy_settings WHERE key = ?', key);
    if (!existing) {
      execute('INSERT INTO academy_settings (key, value) VALUES (?, ?)', key, val);
    }
  }

  // Seed tasks if empty
  const countRow = queryOne<{ count: number }>('SELECT COUNT(*) as count FROM tasks');
  if (!countRow || countRow.count === 0) {
    ORIGINAL_TASKS.forEach((t, idx) => {
      const taskId = `task-${t.book.toLowerCase().replace(/\s+/g, '')}-d${t.day_number}-${idx + 1}`;
      execute(`
        INSERT INTO tasks (id, book, day_number, title, description, category, required_links, allows_text, allows_file, status, source_flag, order_index, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
        taskId,
        t.book,
        t.day_number,
        t.title,
        t.description,
        t.category,
        JSON.stringify(t.required_links || ['Facebook Post', 'YouTube Content']),
        t.allows_text !== false ? 1 : 0,
        t.allows_file ? 1 : 0,
        'active',
        t.source_flag || null,
        idx + 1,
        new Date().toISOString()
      );
    });
    console.log(`[Database] Successfully seeded ${ORIGINAL_TASKS.length} tasks from original dashboard.`);
  }

  // Seed sample batch if empty
  const batchCount = queryOne<{ count: number }>('SELECT COUNT(*) as count FROM batches');
  if (!batchCount || batchCount.count === 0) {
    execute(`
      INSERT INTO batches (id, title, description, teacher_name, schedule, zoom_link, max_students, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
      'batch-foundation-01',
      'Foundation Level 1 - Morning Batch',
      'Daily morning guidance, task reviews, live English conversation practice with Call Annie and interview preparation.',
      'Sir Farukh (Lead Facilitator)',
      'Monday to Friday: 10:00 AM - 11:30 AM PKT',
      'https://us04web.zoom.us/j/rehan-school-accl',
      30,
      'active',
      new Date().toISOString()
    );
  }
}
