# Anvil User Management Guide

This guide explains how to manage user accounts for the Anvil application.

## Overview

Anvil uses a SQLite database (`data/users.db`) to store user credentials with bcrypt password hashing. User management scripts are provided for easy command-line administration.

---

## Quick Reference

### Add a New User
```bash
# Interactive mode (recommended for security - password not shown in history)
./add-user.sh
# OR
npm run add-user

# Command line mode
./add-user.sh <username> <password>
# OR
npm run add-user <username> <password>
```

### Delete a User
```bash
# Interactive mode with confirmation
./delete-user.sh
# OR
npm run delete-user

# Command line mode with confirmation
./delete-user.sh <username>
# OR
npm run delete-user <username>

# Force delete without confirmation
./delete-user.sh <username> --force
# OR
npm run delete-user <username> -- --force
```

### List All Users
```bash
./list-users.sh
# OR
npm run list-users
```

---

## User Management Scripts

### 1. Add User (`add-user.sh`)

Creates a new user account with a securely hashed password.

**Interactive Mode (Recommended):**
```bash
./add-user.sh
```
- Prompts for username
- Prompts for password (hidden input)
- Prompts for password confirmation
- More secure as passwords are not saved in bash history

**Command Line Mode:**
```bash
./add-user.sh john Passw0rd123
```

**Using npm:**
```bash
# Interactive
npm run add-user

# Command line
npm run add-user john Passw0rd123
```

**Username Requirements:**
- Minimum 3 characters
- Maximum 50 characters
- Only letters, numbers, hyphens, and underscores
- Must be unique

**Password Requirements:**
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number

**Example Output:**
```
================================================
👤 Anvil User Management - Add User
================================================

[INFO] Hashing password...
[SUCCESS] User 'john' created successfully
[INFO] User ID: 2
```

---

### 2. Delete User (`delete-user.sh`)

Deletes a user account from the database.

**Interactive Mode:**
```bash
./delete-user.sh
```
- Prompts for username
- Shows user information
- Asks for confirmation

**Command Line Mode:**
```bash
./delete-user.sh john
```
- Shows user information
- Asks for confirmation

**Force Delete (No Confirmation):**
```bash
./delete-user.sh john --force
```
- Deletes immediately without asking
- Useful for scripts

**Using npm:**
```bash
# Interactive
npm run delete-user

# With confirmation
npm run delete-user john

# Force (note the -- before --force)
npm run delete-user john -- --force
```

**Example Output:**
```
================================================
👤 Anvil User Management - Delete User
================================================

[INFO] User Information:
  Username:    john
  User ID:     2
  Created:     11/4/2025, 6:30:00 AM
  Last Login:  Never

[WARNING] This action cannot be undone!
Are you sure you want to delete user 'john'? (yes/no): yes
[SUCCESS] User 'john' has been deleted
```

---

### 3. List Users (`list-users.sh`)

Displays all users in the database with their status.

**Usage:**
```bash
./list-users.sh
# OR
npm run list-users
```

**Example Output:**
```
================================================
👤 Anvil User Management - List Users
================================================

====================================================================================================
Total Users: 2
====================================================================================================

ID     | Username             | Status     | Created                | Last Login
----------------------------------------------------------------------------------------------------
1      | admin                | Active     | 11/3/2025, 10:56:33 PM | 11/4/2025, 6:01:19 AM
2      | john                 | Active     | 11/4/2025, 6:30:00 AM  | Never
----------------------------------------------------------------------------------------------------

Summary:
  Active users:     2
  Inactive users:   0
  Users with login: 1
```

**Information Displayed:**
- User ID (database primary key)
- Username
- Status (Active/Inactive)
- Account creation timestamp
- Last login timestamp (or "Never")

---

## Security Best Practices

### Password Management

1. **Use Strong Passwords**
   - Minimum 8 characters (enforced)
   - Mix of uppercase, lowercase, and numbers (enforced)
   - Consider using special characters
   - Avoid common words or patterns

2. **Interactive Mode for Sensitive Operations**
   - Use interactive mode when adding users to avoid passwords in bash history
   - Passwords are hidden with `*` characters during input
   - Password confirmation prevents typos

3. **Change Default Credentials**
   - Default admin user (admin/admin123) is created automatically
   - Change this password immediately in production
   - Or delete it and create a new admin user

### Account Management

1. **Regular Audits**
   - Run `npm run list-users` regularly
   - Review who has access
   - Check last login times
   - Remove inactive accounts

2. **Principle of Least Privilege**
   - Only create accounts for authorized users
   - Remove accounts when users no longer need access

3. **Database Backup**
   - The user database is located at `data/users.db`
   - Back up this file regularly
   - Store backups securely

---

## Common Workflows

### Initial Setup

```bash
# 1. Start the server to initialize the database
npm start

# 2. List users to see the default admin
npm run list-users

# 3. Add your own admin account
./add-user.sh myusername

# 4. Delete the default admin (optional)
npm run delete-user admin -- --force

# 5. Verify the change
npm run list-users
```

### Adding Multiple Users

```bash
# Create a simple script to add multiple users
./add-user.sh alice AlicePass123
./add-user.sh bob BobSecure456
./add-user.sh charlie Charlie789Pass

# Verify all were created
npm run list-users
```

### User Cleanup

```bash
# List all users
npm run list-users

# Delete inactive users
npm run delete-user inactive_user1
npm run delete-user inactive_user2

# Verify cleanup
npm run list-users
```

---

## Database Information

### Location
```
data/users.db
```

### Schema
```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_login DATETIME,
  is_active INTEGER DEFAULT 1
);
```

### Password Hashing
- Algorithm: bcrypt
- Salt Rounds: 10 (configurable via `BCRYPT_SALT_ROUNDS` environment variable)
- Passwords are never stored in plain text
- Password verification uses constant-time comparison

---

## Troubleshooting

### "Database not found" Error

**Problem:**
```
[ERROR] Database file not found: /path/to/data/users.db
[INFO] Please start the server at least once to initialize the database
```

**Solution:**
```bash
# Start the server to create the database
npm start
# Stop with Ctrl+C after it starts
# Then try the user management command again
```

### "User already exists" Error

**Problem:**
```
[ERROR] User 'john' already exists
```

**Solution:**
```bash
# Check existing users
npm run list-users

# Use a different username, or delete the existing user first
npm run delete-user john
npm run add-user john NewPassword123
```

### "Password does not meet requirements" Error

**Problem:**
```
[ERROR] Password does not meet requirements:
  - Password must contain at least one uppercase letter
  - Password must contain at least one number
```

**Solution:**
Use a password that meets all requirements:
- At least 8 characters
- At least one uppercase letter (A-Z)
- At least one lowercase letter (a-z)
- At least one number (0-9)

Example valid passwords:
- `Password123`
- `MySecure1Pass`
- `Admin2024Secure`

### Scripts Not Executable

**Problem:**
```
bash: ./add-user.sh: Permission denied
```

**Solution:**
```bash
chmod +x add-user.sh delete-user.sh list-users.sh
```

---

## Advanced Usage

### Programmatic Access

The user management scripts are TypeScript files that can be imported:

```typescript
// Example: Custom user management script
import Database from 'better-sqlite3';
import { hashPassword } from './utils/password';

const db = new Database('data/users.db');

// Add user programmatically
const hash = await hashPassword('MyPassword123');
db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)')
  .run('customuser', hash);

db.close();
```

### Batch Operations

Create a script to add multiple users from a file:

```bash
#!/bin/bash
# batch-add-users.sh

while IFS=, read -r username password; do
  echo "Adding user: $username"
  ./add-user.sh "$username" "$password"
done < users.csv
```

Where `users.csv` contains:
```
alice,AlicePass123
bob,BobSecure456
charlie,Charlie789Pass
```

---

## Files Overview

### Scripts
- `scripts/add-user.ts` - TypeScript implementation of add-user
- `scripts/delete-user.ts` - TypeScript implementation of delete-user
- `scripts/list-users.ts` - TypeScript implementation of list-users

### Bash Wrappers
- `add-user.sh` - Easy wrapper for adding users
- `delete-user.sh` - Easy wrapper for deleting users
- `list-users.sh` - Easy wrapper for listing users

### npm Scripts (package.json)
```json
{
  "scripts": {
    "add-user": "ts-node scripts/add-user.ts",
    "delete-user": "ts-node scripts/delete-user.ts",
    "list-users": "ts-node scripts/list-users.ts"
  }
}
```

---

## Security Notes

⚠️ **Important Security Considerations:**

1. **Default Credentials**: The default admin account (admin/admin123) should be changed or removed in production
2. **Database Access**: The `data/users.db` file contains sensitive password hashes - protect it with appropriate file permissions
3. **Backup Security**: When backing up the database, ensure backups are encrypted and stored securely
4. **Password History**: Avoid using command-line mode for adding users as passwords will appear in bash history
5. **Production Environment**: Set the `BCRYPT_SALT_ROUNDS` environment variable to at least 12 for production
6. **HTTPS**: Always use HTTPS in production to protect credentials during transmission

---

## Support

For issues or questions:
1. Check this documentation first
2. Review the troubleshooting section
3. Check server logs: `tail -f /tmp/anvil-server.log`
4. Check the GitHub repository: https://github.com/darcydjr/anvil
