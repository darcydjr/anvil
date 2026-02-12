#!/usr/bin/env ts-node

/*
 * List Users CLI Tool
 * Displays all users in the database
 */

import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs-extra';

const DB_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DB_DIR, 'users.db');

// Colors for output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  gray: '\x1b[90m',
};

function printError(message: string): void {
  console.error(`${colors.red}[ERROR]${colors.reset} ${message}`);
}

function printInfo(message: string): void {
  console.log(`${colors.blue}[INFO]${colors.reset} ${message}`);
}

function formatDate(dateString: string | null): string {
  if (!dateString) return 'Never';

  const date = new Date(dateString);
  return date.toLocaleString();
}

function listUsers(): void {
  // Ensure database exists
  if (!fs.existsSync(DB_DIR)) {
    printError(`Database directory not found: ${DB_DIR}`);
    printInfo('Please start the server at least once to initialize the database');
    process.exit(1);
  }

  if (!fs.existsSync(DB_PATH)) {
    printError(`Database file not found: ${DB_PATH}`);
    printInfo('Please start the server at least once to initialize the database');
    process.exit(1);
  }

  // Connect to database
  const db = new Database(DB_PATH);

  try {
    // Get all users
    const users = db.prepare(`
      SELECT id, username, role, created_at, last_login, is_active
      FROM users
      ORDER BY id ASC
    `).all() as any[];

    if (users.length === 0) {
      printInfo('No users found in the database');
      db.close();
      return;
    }

    console.log('');
    console.log('='.repeat(110));
    console.log(`${colors.blue}Total Users: ${users.length}${colors.reset}`);
    console.log('='.repeat(110));
    console.log('');

    // Table header
    console.log(
      `${colors.blue}${'ID'.padEnd(6)} | ` +
      `${'Username'.padEnd(20)} | ` +
      `${'Role'.padEnd(8)} | ` +
      `${'Status'.padEnd(10)} | ` +
      `${'Created'.padEnd(22)} | ` +
      `${'Last Login'.padEnd(22)}${colors.reset}`
    );
    console.log('-'.repeat(110));

    // Table rows
    users.forEach((user) => {
      const status = user.is_active === 1 ?
        `${colors.green}Active${colors.reset}` :
        `${colors.red}Inactive${colors.reset}`;

      const role = user.role === 'admin' ?
        `${colors.yellow}${user.role}${colors.reset}` :
        user.role;

      const createdAt = formatDate(user.created_at);
      const lastLogin = formatDate(user.last_login);

      console.log(
        `${user.id.toString().padEnd(6)} | ` +
        `${user.username.padEnd(20)} | ` +
        `${role.padEnd(18)} | ` +
        `${status.padEnd(20)} | ` +
        `${createdAt.padEnd(22)} | ` +
        `${lastLogin.padEnd(22)}`
      );
    });

    console.log('-'.repeat(110));
    console.log('');

    // Summary statistics
    const activeUsers = users.filter(u => u.is_active === 1).length;
    const inactiveUsers = users.filter(u => u.is_active === 0).length;
    const usersWithLogin = users.filter(u => u.last_login !== null).length;
    const adminUsers = users.filter(u => u.role === 'admin').length;

    console.log(`${colors.blue}Summary:${colors.reset}`);
    console.log(`  Active users:     ${colors.green}${activeUsers}${colors.reset}`);
    console.log(`  Inactive users:   ${colors.red}${inactiveUsers}${colors.reset}`);
    console.log(`  Admin users:      ${colors.yellow}${adminUsers}${colors.reset}`);
    console.log(`  Users with login: ${colors.blue}${usersWithLogin}${colors.reset}`);
    console.log('');

  } catch (error: any) {
    printError(`Failed to list users: ${error.message}`);
    process.exit(1);
  } finally {
    db.close();
  }
}

// Main execution
function main(): void {
  console.log('');
  console.log('================================================');
  console.log('👤 Anvil User Management - List Users');
  console.log('================================================');

  listUsers();
}

main();
