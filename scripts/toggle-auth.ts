#!/usr/bin/env ts-node

/*
 * Admin Script: Toggle Authentication
 *
 * This script allows administrators to enable or disable login authentication.
 * When disabled, users bypass the login page and go straight to the main application.
 *
 * Usage:
 *   npm run toggle-auth          # Interactive mode
 *   npm run toggle-auth on       # Enable authentication
 *   npm run toggle-auth off      # Disable authentication
 *   npm run toggle-auth status   # Check current status
 */

import * as readline from 'readline';
import { getAuthConfig, setAuthConfig, isAuthEnabled } from '../utils/authConfig';

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function printHeader(): void {
  console.log('\n' + colors.bright + colors.blue + '═'.repeat(60) + colors.reset);
  console.log(colors.bright + colors.blue + '   AUTHENTICATION TOGGLE SCRIPT' + colors.reset);
  console.log(colors.bright + colors.blue + '═'.repeat(60) + colors.reset + '\n');
}

function printStatus(): void {
  const config = getAuthConfig();
  const enabled = config.authenticationEnabled;

  console.log(colors.bright + 'Current Authentication Status:' + colors.reset);
  console.log('  Status: ' + (enabled
    ? colors.green + 'ENABLED ✓' + colors.reset
    : colors.red + 'DISABLED ✗' + colors.reset));

  if (config.updatedAt) {
    console.log('  Last Updated: ' + colors.cyan + config.updatedAt + colors.reset);
    console.log('  Updated By: ' + colors.cyan + config.updatedBy + colors.reset);
  }

  console.log();

  if (!enabled) {
    console.log(colors.yellow + '⚠ WARNING: Authentication is currently disabled!' + colors.reset);
    console.log(colors.yellow + '  Users can access the application without logging in.' + colors.reset);
    console.log(colors.yellow + '  All requests are processed as admin user.' + colors.reset);
    console.log();
  }
}

function enableAuth(updatedBy: string = 'admin'): void {
  const wasEnabled = isAuthEnabled();

  if (wasEnabled) {
    console.log(colors.yellow + 'Authentication is already enabled.' + colors.reset);
    return;
  }

  if (setAuthConfig(true, updatedBy)) {
    console.log(colors.green + '✓ Authentication has been ENABLED' + colors.reset);
    console.log('  Users will now be required to log in to access the application.');
    console.log('  Please restart the server for changes to take effect.');
  } else {
    console.log(colors.red + '✗ Failed to enable authentication' + colors.reset);
    process.exit(1);
  }
}

function disableAuth(updatedBy: string = 'admin'): void {
  const wasEnabled = isAuthEnabled();

  if (!wasEnabled) {
    console.log(colors.yellow + 'Authentication is already disabled.' + colors.reset);
    return;
  }

  console.log(colors.red + colors.bright + '⚠ WARNING ⚠' + colors.reset);
  console.log(colors.red + 'You are about to DISABLE authentication!' + colors.reset);
  console.log('This will allow anyone to access the application without logging in.');
  console.log('All requests will be processed as admin user.');
  console.log();

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  rl.question('Are you sure you want to continue? (yes/no): ', (answer) => {
    rl.close();

    if (answer.toLowerCase() === 'yes') {
      if (setAuthConfig(false, updatedBy)) {
        console.log(colors.red + '✓ Authentication has been DISABLED' + colors.reset);
        console.log('  Users will bypass the login page and access the application directly.');
        console.log('  Please restart the server for changes to take effect.');
      } else {
        console.log(colors.red + '✗ Failed to disable authentication' + colors.reset);
        process.exit(1);
      }
    } else {
      console.log('Operation cancelled.');
    }
  });
}

function interactiveMode(): void {
  printStatus();

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  console.log('What would you like to do?');
  console.log('  1) Enable authentication');
  console.log('  2) Disable authentication');
  console.log('  3) View status only');
  console.log('  4) Exit');
  console.log();

  rl.question('Enter your choice (1-4): ', (answer) => {
    rl.close();

    switch (answer.trim()) {
      case '1':
        enableAuth();
        break;
      case '2':
        disableAuth();
        break;
      case '3':
        // Status already printed
        break;
      case '4':
        console.log('Goodbye!');
        break;
      default:
        console.log(colors.red + 'Invalid choice.' + colors.reset);
        process.exit(1);
    }
  });
}

// Main execution
function main(): void {
  printHeader();

  const args = process.argv.slice(2);
  const command = args[0]?.toLowerCase();

  switch (command) {
    case 'on':
    case 'enable':
      printStatus();
      enableAuth();
      break;

    case 'off':
    case 'disable':
      printStatus();
      disableAuth();
      break;

    case 'status':
      printStatus();
      break;

    case undefined:
      // No command provided - interactive mode
      interactiveMode();
      break;

    default:
      console.log(colors.red + 'Invalid command: ' + command + colors.reset);
      console.log();
      console.log('Usage:');
      console.log('  npm run toggle-auth          # Interactive mode');
      console.log('  npm run toggle-auth on       # Enable authentication');
      console.log('  npm run toggle-auth off      # Disable authentication');
      console.log('  npm run toggle-auth status   # Check current status');
      console.log();
      process.exit(1);
  }
}

main();
