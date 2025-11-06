# Project Renaming Guide

This guide explains how to rename your project from "Quade" to any custom name of your choice.

## Overview

The renaming scripts automatically update all references to the project name throughout:
- Configuration files (config.json, HTML)
- Application code (React components, utilities)
- Specification files (capabilities, enablers)
- Design system documentation
- README and documentation
- JWT authentication tokens
- Mermaid diagrams

## Quick Start

### Using npm (Recommended)

```bash
# Test the changes first (dry run)
npm run rename:dry-run "MyProjectName"

# Apply the changes
npm run rename "MyProjectName"
```

### Using Node.js directly

```bash
# Test the changes first (dry run)
node scripts/rename-project.js "MyProjectName" --dry-run

# Apply the changes
node scripts/rename-project.js "MyProjectName"
```

### Using Bash (Unix/Linux/Mac)

```bash
# Test the changes first (dry run)
./scripts/rename-project.sh "MyProjectName" --dry-run

# Apply the changes
./scripts/rename-project.sh "MyProjectName"
```

## Examples

```bash
# Rename to "Blueprint"
npm run rename "Blueprint"

# Rename to "ProjectHub"
npm run rename "ProjectHub"

# Rename to "Architect Pro"
npm run rename "Architect Pro"

# Test renaming to "MyApp" without making changes
npm run rename:dry-run "MyApp"
```

## Name Requirements

The project name must:
- Start with a letter (A-Z or a-z)
- Contain only letters, numbers, spaces, and hyphens
- Be at least one character long

### Valid Names
- ✅ "MyProject"
- ✅ "Project Manager"
- ✅ "App-Builder"
- ✅ "Blueprint2024"

### Invalid Names
- ❌ "123Project" (starts with number)
- ❌ "My_Project" (contains underscore)
- ❌ "Project@Home" (contains special characters)

## What Gets Changed

The script updates the following:

### Configuration Files
- `config.json` - UI title and workspace descriptions
- `client/index.html` - Page title

### Application Code
- `client/src/components/Login.tsx` - Login screen header
- `utils/auth.ts` - JWT issuer name

### Documentation
- `README.md` - All project name references

### Specification Files
All capability and enabler files in the `specifications/` directory:
- System metadata (e.g., "Quade Core" → "YourName Core")
- Mermaid diagrams (e.g., "Quade Application" → "YourName Application")
- Technical descriptions and documentation

## Backup

The script automatically creates a backup of critical files before making changes:
- Location: `backup-YYYY-MM-DD/`
- Includes: config.json, index.html, README.md, Login.tsx, auth.ts

**Note:** Backups are only created in live mode (not during dry runs).

## Dry Run Mode

Always test your changes first using dry run mode:

```bash
npm run rename:dry-run "NewName"
```

Dry run mode will:
- ✅ Show you exactly what would be changed
- ✅ Count the number of replacements in each file
- ✅ Display a summary of changes
- ❌ NOT modify any files
- ❌ NOT create backups

## After Renaming

Once you've renamed the project:

1. **Review the changes**
   ```bash
   git diff
   ```

2. **Restart the application**
   ```bash
   npm run restart
   # or
   npm start
   ```

3. **Clear browser cache**
   - Press Ctrl+Shift+Delete (or Cmd+Shift+Delete on Mac)
   - Clear cached images and files
   - Or open in incognito/private mode

4. **Verify the changes**
   - Check the browser title
   - Check the login screen
   - Check the application header
   - Review specification documents

## Troubleshooting

### Script not found
If you get "command not found" errors:

```bash
# Make scripts executable
chmod +x scripts/rename-project.sh
chmod +x scripts/rename-project.js
```

### Changes not appearing
1. Hard refresh your browser (Ctrl+F5 or Cmd+Shift+R)
2. Clear browser cache
3. Restart the application
4. Check if files were actually modified

### Want to undo changes
Restore from the backup:

```bash
# List backups
ls -la backup-*/

# Restore specific files from backup
cp backup-2025-01-04/config.json config.json
cp backup-2025-01-04/client/index.html client/index.html
# ... etc
```

Or use git:

```bash
# Revert all changes
git checkout .

# Or revert specific files
git checkout config.json
```

## Script Output

The script provides detailed output:

```
Project Renaming Script
==================================================

Current name: Quade
New name:     MyProject
Mode:         LIVE

Creating backup in: backup-2025-01-04

✓ Backup created successfully

Processing files...

✓ config.json (3 replacements)
✓ client/index.html (1 replacement)
✓ README.md (25 replacements)
✓ client/src/components/Login.tsx (1 replacement)
...

==================================================
Summary:
  Files processed: 21
  Files modified:  18
  Total replacements: 87

✓ Project successfully renamed to "MyProject"

Next steps:
  1. Review the changes
  2. Restart the application: npm run restart
  3. Clear your browser cache if needed
```

## Technical Details

### Replacement Patterns

The script applies the following replacements:
- Exact word matches: `Quade` → `YourName`
- JWT issuer: `quade-auth` → `yourname-auth`
- Diagram labels: `"Quade Application"` → `"YourName Application"`
- System names: `Quade Core` → `YourName Core`
- Possessive forms: `Quade's` → `YourName's`
- Lowercase references: `the Quade` → `the YourName`

### Files Processed

The script processes 21+ files including:
- 11 capability specification files
- 4 design system documentation files
- 2+ enabler files
- 4 core application/config files

## Notes

- The internal package name "anvil" remains unchanged for backwards compatibility
- Git repository references remain unchanged
- Node modules are not modified
- Database files and user data are not affected
- The script is idempotent (safe to run multiple times)

## Support

If you encounter issues:
1. Check this documentation
2. Run in dry-run mode first
3. Review the script output for errors
4. Check file permissions
5. Ensure Node.js is installed

## Examples of Use Cases

### Rebranding
Change the project name to match your company branding:
```bash
npm run rename "Acme Product Manager"
```

### Client Delivery
Customize for a specific client:
```bash
npm run rename "ClientName Requirements Hub"
```

### Internal Tools
Rename for internal use:
```bash
npm run rename "Engineering Docs"
```

### Testing
Test different names:
```bash
npm run rename:dry-run "TestName1"
npm run rename:dry-run "TestName2"
npm run rename "FinalName"
```
