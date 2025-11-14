#!/usr/bin/env node

/**
 * Project Renaming Script
 *
 * This script renames the project from "Quade" to any custom name throughout the codebase.
 *
 * Usage:
 *   node scripts/rename-project.js <new-name> [--dry-run]
 *   npm run rename <new-name> [--dry-run]
 *
 * Example:
 *   node scripts/rename-project.js "MyProject"
 *   node scripts/rename-project.js "MyProject" --dry-run
 */

const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  red: '\x1b[31m'
};

// Parse command line arguments
const args = process.argv.slice(2);
const newName = args[0];
const isDryRun = args.includes('--dry-run');

if (!newName || newName === '--dry-run') {
  console.error(`${colors.red}Error: Please provide a new project name${colors.reset}`);
  console.log(`\nUsage: node scripts/rename-project.js <new-name> [--dry-run]`);
  console.log(`Example: node scripts/rename-project.js "MyProject"\n`);
  process.exit(1);
}

// Validate the new name
if (!/^[a-zA-Z][a-zA-Z0-9\s-]*$/.test(newName)) {
  console.error(`${colors.red}Error: Project name must start with a letter and contain only letters, numbers, spaces, and hyphens${colors.reset}`);
  process.exit(1);
}

const currentName = 'Quade';
const rootDir = path.resolve(__dirname, '..');

console.log(`${colors.bright}${colors.blue}Project Renaming Script${colors.reset}`);
console.log(`${colors.blue}${'='.repeat(50)}${colors.reset}\n`);
console.log(`Current name: ${colors.yellow}${currentName}${colors.reset}`);
console.log(`New name:     ${colors.green}${newName}${colors.reset}`);
console.log(`Mode:         ${isDryRun ? colors.yellow + 'DRY RUN (no changes will be made)' + colors.reset : colors.green + 'LIVE' + colors.reset}\n`);

// Files and directories to process
const filesToProcess = [
  // Configuration files
  'config.json',
  'client/index.html',
  'README.md',

  // Application code
  'client/src/components/Login.tsx',
  'utils/auth.ts',

  // Specification files - capabilities
  'specifications/832930-capability.md',
  'specifications/725677-capability.md',
  'specifications/900012-capability.md',
  'specifications/800901-capability.md',
  'specifications/700890-capability.md',
  'specifications/600789-capability.md',
  'specifications/500678-capability.md',
  'specifications/400567-capability.md',
  'specifications/300456-capability.md',
  'specifications/200345-capability.md',
  'specifications/100234-capability.md',

  // Design system documentation
  'specifications/DESIGN_SYSTEM_COMPONENTS.md',
  'specifications/DESIGN_SYSTEM_SPACING.md',
  'specifications/DESIGN_SYSTEM_TYPOGRAPHY.md',
  'specifications/DESIGN_SYSTEM_COLOR_PALETTE.md',

  // Other specification files
  'specifications/DISCOVERY_SUMMARY.md',
  'specifications/300100-enabler.md',
  'specifications/300103-enabler.md',
];

// Replacement patterns
const replacements = [
  // Exact matches
  { pattern: new RegExp(`\\b${currentName}\\b`, 'g'), replacement: newName, description: 'Project name' },
  { pattern: new RegExp(`${currentName.toLowerCase()}-auth`, 'g'), replacement: `${newName.toLowerCase()}-auth`, description: 'JWT issuer' },
  { pattern: new RegExp(`"${currentName} Application"`, 'g'), replacement: `"${newName} Application"`, description: 'Application name in diagrams' },
  { pattern: new RegExp(`${currentName} Core`, 'g'), replacement: `${newName} Core`, description: 'System name' },
  { pattern: new RegExp(`the ${currentName}`, 'g'), replacement: `the ${newName}`, description: 'Lowercase references' },
  { pattern: new RegExp(`${currentName}'s`, 'g'), replacement: `${newName}'s`, description: 'Possessive form' },
];

let totalReplacements = 0;
let filesModified = 0;

/**
 * Process a single file
 */
function processFile(filePath) {
  const fullPath = path.join(rootDir, filePath);

  if (!fs.existsSync(fullPath)) {
    console.log(`${colors.yellow}⚠ Skipping (not found): ${filePath}${colors.reset}`);
    return;
  }

  try {
    const content = fs.readFileSync(fullPath, 'utf8');
    let newContent = content;
    let fileReplacements = 0;

    // Apply all replacement patterns
    replacements.forEach(({ pattern, replacement }) => {
      const matches = newContent.match(pattern);
      if (matches) {
        fileReplacements += matches.length;
        newContent = newContent.replace(pattern, replacement);
      }
    });

    if (fileReplacements > 0) {
      filesModified++;
      totalReplacements += fileReplacements;

      console.log(`${colors.green}✓ ${filePath}${colors.reset} (${fileReplacements} replacement${fileReplacements > 1 ? 's' : ''})`);

      if (!isDryRun) {
        fs.writeFileSync(fullPath, newContent, 'utf8');
      }
    } else {
      console.log(`  ${filePath} (no changes needed)`);
    }
  } catch (error) {
    console.error(`${colors.red}✗ Error processing ${filePath}: ${error.message}${colors.reset}`);
  }
}

/**
 * Create a backup of the project
 */
function createBackup() {
  if (isDryRun) return;

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
  const backupDir = path.join(rootDir, `backup-${timestamp}`);

  console.log(`${colors.blue}Creating backup in: ${backupDir}${colors.reset}\n`);

  try {
    // Create backup of critical files
    const criticalFiles = [
      'config.json',
      'client/index.html',
      'README.md',
      'client/src/components/Login.tsx',
      'utils/auth.ts'
    ];

    fs.ensureDirSync(backupDir);

    criticalFiles.forEach(file => {
      const srcPath = path.join(rootDir, file);
      const destPath = path.join(backupDir, file);

      if (fs.existsSync(srcPath)) {
        fs.ensureDirSync(path.dirname(destPath));
        fs.copyFileSync(srcPath, destPath);
      }
    });

    console.log(`${colors.green}✓ Backup created successfully${colors.reset}\n`);
  } catch (error) {
    console.error(`${colors.yellow}⚠ Warning: Could not create backup: ${error.message}${colors.reset}\n`);
  }
}

/**
 * Main execution
 */
async function main() {
  try {
    // Create backup before making changes
    if (!isDryRun) {
      createBackup();
    }

    console.log(`${colors.bright}Processing files...${colors.reset}\n`);

    // Process all files
    filesToProcess.forEach(processFile);

    // Summary
    console.log(`\n${colors.blue}${'='.repeat(50)}${colors.reset}`);
    console.log(`${colors.bright}Summary:${colors.reset}`);
    console.log(`  Files processed: ${filesToProcess.length}`);
    console.log(`  Files modified:  ${colors.green}${filesModified}${colors.reset}`);
    console.log(`  Total replacements: ${colors.green}${totalReplacements}${colors.reset}`);

    if (isDryRun) {
      console.log(`\n${colors.yellow}${colors.bright}This was a DRY RUN - no changes were made${colors.reset}`);
      console.log(`Run without --dry-run to apply changes.`);
    } else {
      console.log(`\n${colors.green}${colors.bright}✓ Project successfully renamed to "${newName}"${colors.reset}`);
      console.log(`\n${colors.yellow}Next steps:${colors.reset}`);
      console.log(`  1. Review the changes`);
      console.log(`  2. Restart the application: npm run restart`);
      console.log(`  3. Clear your browser cache if needed`);
    }

  } catch (error) {
    console.error(`\n${colors.red}${colors.bright}Error: ${error.message}${colors.reset}`);
    process.exit(1);
  }
}

// Run the script
main();
