# User Database Schema

## Metadata
- **Name**: User Database Schema
- **Type**: Enabler
- **ID**: ENB-300102
- **Capability ID**: CAP-725677
- **Owner**: James Reynolds
- **Status**: Ready for Implementation
- **Approval**: Approved
- **Priority**: High
- **Analysis Review**: Required
- **Code Review**: Not Required

## Technical Overview
### Purpose
Define and implement the database schema for storing user credentials in a local SQLite database.

## Functional Requirements
| ID | Name | Requirement | Status | Priority | Approval |
|----|------|-------------|--------|----------|----------|
| FR-300120 | User Table Schema | Create users table with username, password hash, and metadata fields | Ready for Implementation | High | Approved |
| FR-300121 | Unique Usernames | Ensure usernames are unique across all users | Ready for Implementation | High | Approved |
| FR-300122 | Password Storage | Store password hashes, never plain text passwords | Ready for Implementation | High | Approved |
| FR-300123 | User CRUD Operations | Support create, read, update, delete operations for users | Ready for Implementation | Medium | Approved |
| FR-300124 | Database Initialization | Initialize database and tables on first application startup | Ready for Implementation | High | Approved |

## Non-Functional Requirements
| ID | Name | Requirement | Type | Status | Priority | Approval |
|----|------|-------------|------|--------|----------|----------|
| NFR-300120 | Data Persistence | User data must persist across application restarts | Reliability | Ready for Implementation | High | Approved |
| NFR-300121 | Query Performance | User lookups must complete within 100ms | Performance | Ready for Implementation | Medium | Approved |

## Technical Specifications

### Implementation Details
- **Database**: SQLite3
- **Location**: `./data/users.db`
- **ORM**: Direct SQL queries using better-sqlite3 or sqlite3 npm package
- **Initialization**: Database created on first server startup

### Database Schema

#### Users Table
```sql
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_login DATETIME,
  is_active BOOLEAN DEFAULT 1
);

CREATE INDEX idx_users_username ON users(username);
```

### Field Descriptions
- **id**: Auto-incrementing primary key
- **username**: Unique username (3-50 characters)
- **password_hash**: bcrypt hash of user password
- **created_at**: Timestamp when user was created
- **updated_at**: Timestamp of last update
- **last_login**: Timestamp of last successful login
- **is_active**: Flag to enable/disable user accounts

### Database Operations

#### Initialize Database
```typescript
function initializeDatabase(): void {
  const db = new Database('./data/users.db');
  db.exec(CREATE_USERS_TABLE_SQL);

  // Create default admin user if no users exist
  const count = db.prepare('SELECT COUNT(*) as count FROM users').get();
  if (count.count === 0) {
    createDefaultAdminUser(db);
  }
}
```

#### Create User
```typescript
function createUser(username: string, passwordHash: string): number {
  const stmt = db.prepare(
    'INSERT INTO users (username, password_hash) VALUES (?, ?)'
  );
  const result = stmt.run(username, passwordHash);
  return result.lastInsertRowid;
}
```

#### Get User by Username
```typescript
function getUserByUsername(username: string): User | null {
  const stmt = db.prepare(
    'SELECT * FROM users WHERE username = ? AND is_active = 1'
  );
  return stmt.get(username) || null;
}
```

#### Update Last Login
```typescript
function updateLastLogin(userId: number): void {
  const stmt = db.prepare(
    'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?'
  );
  stmt.run(userId);
}
```

### Default Admin User
- Username: `admin`
- Password: `admin123` (MUST be changed on first login in production)
- Created automatically if no users exist

### Data Directory
- Ensure `./data/` directory exists
- Add `./data/` to `.gitignore` to prevent committing user data
- Database file permissions: Read/write for application only

## External Dependencies
- better-sqlite3 (Recommended) or sqlite3
- bcrypt (for password hashing)
- Node.js fs module (for directory creation)

## Testing Strategy
### Unit Tests
- Database initialization
- User creation with unique constraint
- Password hash storage (never plain text)
- User lookup by username
- Update operations

### Integration Tests
- Complete user lifecycle (create, read, update)
- Concurrent user creation (unique constraint testing)
- Database persistence across server restarts

### Migration Tests
- Schema upgrades (future versions)
- Data migration procedures
