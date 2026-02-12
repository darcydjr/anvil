#!/usr/bin/env ts-node

/*
 * Delete User CLI Tool
 * Deletes a user from the database
 */

import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs-extra';
import * as readline from 'readline';

const DB_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DB_DIR, 'users.db');

// Colors for output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function printError(message: string): void {
  console.error(`${colors.red}[ERROR]${colors.reset} ${message}`);
}

function printSuccess(message: string): void {
  console.log(`${colors.green}[SUCCESS]${colors.reset} ${message}`);
}

function printInfo(message: string): void {
  console.log(`${colors.blue}[INFO]${colors.reset} ${message}`);
}

function printWarning(message: string): void {
  console.log(`${colors.yellow}[WARNING]${colors.reset} ${message}`);
}

async function confirmAction(question: string): Promise<boolean> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.question(`${question} (yes/no): `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y');
    });
  });
}

async function deleteUser(username: string, force: boolean = false): Promise<void> {
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
    // Check if user exists
    const user = db.prepare('SELECT id, username, created_at, last_login FROM users WHERE username = ?').get(username) as any;

    if (!user) {
      printError(`User '${username}' not found`);
      db.close();
      process.exit(1);
    }

    // Display user information
    console.log('');
    printInfo('User Information:');
    console.log(`  Username:    ${user.username}`);
    console.log(`  User ID:     ${user.id}`);
    console.log(`  Created:     ${user.created_at}`);
    console.log(`  Last Login:  ${user.last_login || 'Never'}`);
    console.log('');

    // Confirm deletion
    if (!force) {
      printWarning('This action cannot be undone!');
      const confirmed = await confirmAction(`Are you sure you want to delete user '${username}'?`);

      if (!confirmed) {
        printInfo('Deletion cancelled');
        db.close();
        process.exit(0);
      }
    }

    // Delete user
    const stmt = db.prepare('DELETE FROM users WHERE username = ?');
    const result = stmt.run(username);

    if (result.changes > 0) {
      printSuccess(`User '${username}' has been deleted`);
    } else {
      printError(`Failed to delete user '${username}'`);
      process.exit(1);
    }

  } catch (error: any) {
    printError(`Failed to delete user: ${error.message}`);
    process.exit(1);
  } finally {
    db.close();
  }
}

// Main execution
async function main(): Promise<void> {
  console.log('');
  console.log('================================================');
  console.log('👤 Anvil User Management - Delete User');
  console.log('================================================');
  console.log('');

  const args = process.argv.slice(2);
  let username: string;
  let force = false;

  // Parse arguments
  if (args.includes('--force') || args.includes('-f')) {
    force = true;
    args.splice(args.indexOf('--force') !== -1 ? args.indexOf('--force') : args.indexOf('-f'), 1);
  }

  if (args.length === 0) {
    // Interactive mode
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    username = await new Promise((resolve) => {
      rl.question('Enter username to delete: ', (answer) => {
        resolve(answer.trim());
      });
    });

    rl.close();

  } else if (args.length === 1) {
    // Command-line argument mode
    username = args[0];
  } else {
    printError('Invalid arguments');
    console.log('');
    console.log('Usage:');
    console.log('  Interactive mode:  npm run delete-user');
    console.log('  Command line:      npm run delete-user <username>');
    console.log('  Or:                ./delete-user.sh <username>');
    console.log('  Force (no prompt): npm run delete-user <username> --force');
    console.log('');
    process.exit(1);
  }

  if (!username || username.trim().length === 0) {
    printError('Username cannot be empty');
    process.exit(1);
  }

  await deleteUser(username, force);
  console.log('');
}

main().catch((error) => {
  printError(`Unexpected error: ${error.message}`);
  process.exit(1);
});
