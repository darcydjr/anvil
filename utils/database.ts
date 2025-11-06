/*
 * User Database Schema and Operations
 * ENB-300102: SQLite database for user credentials
 */

import Database from 'better-sqlite3';
import * as fs from 'fs-extra';
import * as path from 'path';
import { hashPassword } from './password';

const DB_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DB_DIR, 'users.db');

export interface User {
  id: number;
  username: string;
  password_hash: string;
  created_at: string;
  updated_at: string;
  last_login: string | null;
  is_active: number;  // SQLite doesn't have boolean, uses 0/1
}

export interface UserWithoutPassword {
  id: number;
  username: string;
  created_at: string;
  updated_at: string;
  last_login: string | null;
  is_active: number;
}

let db: Database.Database | null = null;

/**
 * Initialize the users database and create tables
 */
export function initializeDatabase(): void {
  // Ensure data directory exists
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
    console.log('[AUTH-DB] Created data directory:', DB_DIR);
  }

  // Open database connection
  db = new Database(DB_PATH);
  console.log('[AUTH-DB] Connected to database:', DB_PATH);

  // Create users table
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_login DATETIME,
      is_active INTEGER DEFAULT 1
    );
  `;

  db.exec(createTableSQL);
  console.log('[AUTH-DB] Users table initialized');

  // Create index on username for faster lookups
  const createIndexSQL = `
    CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
  `;

  db.exec(createIndexSQL);
  console.log('[AUTH-DB] Username index created');

  // Create default admin user if no users exist
  const count = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };

  if (count.count === 0) {
    createDefaultAdminUser();
  }
}

/**
 * Create default admin user for first-time setup
 */
async function createDefaultAdminUser(): Promise<void> {
  try {
    const adminPassword = await hashPassword('admin123');
    const stmt = db!.prepare(
      'INSERT INTO users (username, password_hash) VALUES (?, ?)'
    );
    stmt.run('admin', adminPassword);
    console.log('[AUTH-DB] Default admin user created (username: admin, password: admin123)');
    console.log('[AUTH-DB] ⚠️  WARNING: Change default admin password in production!');
  } catch (error) {
    console.error('[AUTH-DB] Failed to create default admin user:', error);
  }
}

/**
 * Create a new user
 * @param username - Unique username
 * @param passwordHash - Bcrypt hash of password
 * @returns The new user's ID
 */
export function createUser(username: string, passwordHash: string): number {
  if (!db) throw new Error('Database not initialized');

  const stmt = db.prepare(
    'INSERT INTO users (username, password_hash) VALUES (?, ?)'
  );

  const result = stmt.run(username, passwordHash);
  return result.lastInsertRowid as number;
}

/**
 * Get user by username
 * @param username - Username to look up
 * @returns User object or null if not found
 */
export function getUserByUsername(username: string): User | null {
  if (!db) throw new Error('Database not initialized');

  const stmt = db.prepare(
    'SELECT * FROM users WHERE username = ? AND is_active = 1'
  );

  return stmt.get(username) as User | null;
}

/**
 * Get user by ID
 * @param userId - User ID to look up
 * @returns User object without password or null if not found
 */
export function getUserById(userId: number): UserWithoutPassword | null {
  if (!db) throw new Error('Database not initialized');

  const stmt = db.prepare(
    'SELECT id, username, created_at, updated_at, last_login, is_active FROM users WHERE id = ? AND is_active = 1'
  );

  return stmt.get(userId) as UserWithoutPassword | null;
}

/**
 * Update user's last login timestamp
 * @param userId - User ID
 */
export function updateLastLogin(userId: number): void {
  if (!db) throw new Error('Database not initialized');

  const stmt = db.prepare(
    'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?'
  );

  stmt.run(userId);
}

/**
 * Update user password
 * @param userId - User ID
 * @param newPasswordHash - New bcrypt password hash
 */
export function updateUserPassword(userId: number, newPasswordHash: string): void {
  if (!db) throw new Error('Database not initialized');

  const stmt = db.prepare(
    'UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
  );

  stmt.run(newPasswordHash, userId);
}

/**
 * Deactivate a user account
 * @param userId - User ID
 */
export function deactivateUser(userId: number): void {
  if (!db) throw new Error('Database not initialized');

  const stmt = db.prepare(
    'UPDATE users SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
  );

  stmt.run(userId);
}

/**
 * Get database instance (for advanced queries)
 */
export function getDatabase(): Database.Database {
  if (!db) throw new Error('Database not initialized');
  return db;
}

/**
 * Close database connection
 */
export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
    console.log('[AUTH-DB] Database connection closed');
  }
}
