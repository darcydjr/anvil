#!/usr/bin/env ts-node

/*
 * Add User CLI Tool
 * Creates a new user with hashed password
 */

import Database from 'better-sqlite3';
import bcrypt from 'bcrypt';
import * as path from 'path';
import * as fs from 'fs-extra';
import * as readline from 'readline';

const DB_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DB_DIR, 'users.db');
const SALT_ROUNDS = 10;

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

async function promptPassword(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    // Hide password input
    const stdin = process.stdin as any;
    stdin.setRawMode(true);
    readline.emitKeypressEvents(process.stdin);

    let password = '';
    process.stdout.write(prompt);

    process.stdin.on('keypress', (char, key) => {
      if (key && key.name === 'return') {
        stdin.setRawMode(false);
        process.stdout.write('\n');
        rl.close();
        resolve(password);
      } else if (key && key.name === 'backspace') {
        if (password.length > 0) {
          password = password.slice(0, -1);
          process.stdout.write('\b \b');
        }
      } else if (char) {
        password += char;
        process.stdout.write('*');
      }
    });
  });
}

function validateUsername(username: string): { valid: boolean; error?: string } {
  if (!username || username.trim().length === 0) {
    return { valid: false, error: 'Username cannot be empty' };
  }

  if (username.length < 3) {
    return { valid: false, error: 'Username must be at least 3 characters' };
  }

  if (username.length > 50) {
    return { valid: false, error: 'Username must not exceed 50 characters' };
  }

  if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
    return { valid: false, error: 'Username can only contain letters, numbers, hyphens, and underscores' };
  }

  return { valid: true };
}

function validatePassword(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

async function addUser(username: string, password: string): Promise<void> {
  // Validate inputs
  const usernameValidation = validateUsername(username);
  if (!usernameValidation.valid) {
    printError(usernameValidation.error!);
    process.exit(1);
  }

  const passwordValidation = validatePassword(password);
  if (!passwordValidation.valid) {
    printError('Password does not meet requirements:');
    passwordValidation.errors.forEach(err => console.error(`  - ${err}`));
    process.exit(1);
  }

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
    // Check if username already exists
    const existingUser = db.prepare('SELECT username FROM users WHERE username = ?').get(username);

    if (existingUser) {
      printError(`User '${username}' already exists`);
      db.close();
      process.exit(1);
    }

    // Hash password
    printInfo('Hashing password...');
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // Insert user
    const stmt = db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)');
    const result = stmt.run(username, passwordHash);

    printSuccess(`User '${username}' created successfully`);
    printInfo(`User ID: ${result.lastInsertRowid}`);

  } catch (error: any) {
    printError(`Failed to create user: ${error.message}`);
    process.exit(1);
  } finally {
    db.close();
  }
}

// Main execution
async function main(): Promise<void> {
  console.log('');
  console.log('================================================');
  console.log('👤 Anvil User Management - Add User');
  console.log('================================================');
  console.log('');

  const args = process.argv.slice(2);

  let username: string;
  let password: string;

  if (args.length === 0) {
    // Interactive mode
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    username = await new Promise((resolve) => {
      rl.question('Enter username: ', (answer) => {
        resolve(answer.trim());
      });
    });

    rl.close();

    password = await promptPassword('Enter password: ');
    const confirmPassword = await promptPassword('Confirm password: ');

    if (password !== confirmPassword) {
      printError('Passwords do not match');
      process.exit(1);
    }

  } else if (args.length === 2) {
    // Command-line arguments mode
    username = args[0];
    password = args[1];
  } else {
    printError('Invalid arguments');
    console.log('');
    console.log('Usage:');
    console.log('  Interactive mode:  npm run add-user');
    console.log('  Command line:      npm run add-user <username> <password>');
    console.log('  Or:                ./add-user.sh <username> <password>');
    console.log('');
    process.exit(1);
  }

  await addUser(username, password);
  console.log('');
}

main().catch((error) => {
  printError(`Unexpected error: ${error.message}`);
  process.exit(1);
});
