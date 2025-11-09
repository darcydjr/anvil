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

export type UserRole = 'admin' | 'user';

export interface User {
  id: number;
  username: string;
  password_hash: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
  last_login: string | null;
  is_active: number;  // SQLite doesn't have boolean, uses 0/1
}

export interface UserWithoutPassword {
  id: number;
  username: string;
  role: UserRole;
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
      role TEXT NOT NULL DEFAULT 'user',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_login DATETIME,
      is_active INTEGER DEFAULT 1
    );
  `;

  db.exec(createTableSQL);
  console.log('[AUTH-DB] Users table initialized');

  // Migrate existing database to add role column if it doesn't exist
  try {
    db.exec(`
      ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user';
    `);
    console.log('[AUTH-DB] Added role column to existing users table');
  } catch (error: any) {
    // Column already exists, ignore error
    if (!error.message.includes('duplicate column name')) {
      console.error('[AUTH-DB] Migration error:', error);
    }
  }

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
      'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)'
    );
    stmt.run('admin', adminPassword, 'admin');
    console.log('[AUTH-DB] Default admin user created (username: admin, password: admin123)');
    console.log('[AUTH-DB] ⚠️  WARNING: Change default admin password in production!');
  } catch (error) {
    console.error('[AUTH-DB] Failed to create default admin user:', error);
  }
}

/**
 * Update the admin user to have admin role (for migration)
 */
export function updateAdminRole(): void {
  if (!db) throw new Error('Database not initialized');

  const stmt = db.prepare(
    'UPDATE users SET role = ? WHERE username = ?'
  );

  stmt.run('admin', 'admin');
  console.log('[AUTH-DB] Updated admin user role to admin');
}

/**
 * Create a new user
 * @param username - Unique username
 * @param passwordHash - Bcrypt hash of password
 * @param role - User role (admin or user)
 * @returns The new user's ID
 */
export function createUser(username: string, passwordHash: string, role: UserRole = 'user'): number {
  if (!db) throw new Error('Database not initialized');

  const stmt = db.prepare(
    'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)'
  );

  const result = stmt.run(username, passwordHash, role);
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
    'SELECT id, username, role, created_at, updated_at, last_login, is_active FROM users WHERE id = ? AND is_active = 1'
  );

  return stmt.get(userId) as UserWithoutPassword | null;
}

/**
 * Get all users (admin only)
 * @returns Array of users without passwords
 */
export function getAllUsers(): UserWithoutPassword[] {
  if (!db) throw new Error('Database not initialized');

  const stmt = db.prepare(
    'SELECT id, username, role, created_at, updated_at, last_login, is_active FROM users ORDER BY created_at DESC'
  );

  return stmt.all() as UserWithoutPassword[];
}

/**
 * Update user role
 * @param userId - User ID
 * @param role - New role
 */
export function updateUserRole(userId: number, role: UserRole): void {
  if (!db) throw new Error('Database not initialized');

  const stmt = db.prepare(
    'UPDATE users SET role = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
  );

  stmt.run(role, userId);
}

/**
 * Update user information
 * @param userId - User ID
 * @param updates - Fields to update
 */
export function updateUser(userId: number, updates: { username?: string; role?: UserRole; is_active?: number }): void {
  if (!db) throw new Error('Database not initialized');

  const fields: string[] = [];
  const values: any[] = [];

  if (updates.username !== undefined) {
    fields.push('username = ?');
    values.push(updates.username);
  }
  if (updates.role !== undefined) {
    fields.push('role = ?');
    values.push(updates.role);
  }
  if (updates.is_active !== undefined) {
    fields.push('is_active = ?');
    values.push(updates.is_active);
  }

  if (fields.length === 0) return;

  fields.push('updated_at = CURRENT_TIMESTAMP');
  values.push(userId);

  const sql = `UPDATE users SET ${fields.join(', ')} WHERE id = ?`;
  const stmt = db.prepare(sql);
  stmt.run(...values);
}

/**
 * Delete user permanently
 * @param userId - User ID
 */
export function deleteUser(userId: number): void {
  if (!db) throw new Error('Database not initialized');

  const stmt = db.prepare('DELETE FROM users WHERE id = ?');
  stmt.run(userId);
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
