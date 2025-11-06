# Password Hashing Service

## Metadata
- **Name**: Password Hashing Service
- **Type**: Enabler
- **ID**: ENB-300105
- **Capability ID**: CAP-725677
- **Owner**: James Reynolds
- **Status**: Ready for Implementation
- **Approval**: Approved
- **Priority**: High
- **Analysis Review**: Required
- **Code Review**: Not Required

## Technical Overview
### Purpose
Provide secure password hashing and verification functionality using industry-standard bcrypt algorithm to protect user credentials.

## Functional Requirements
| ID | Name | Requirement | Status | Priority | Approval |
|----|------|-------------|--------|----------|----------|
| FR-300150 | Password Hashing | Hash passwords using bcrypt before storing in database | Ready for Implementation | High | Approved |
| FR-300151 | Password Verification | Verify entered passwords against stored hashes | Ready for Implementation | High | Approved |
| FR-300152 | Salt Generation | Generate unique salts for each password | Ready for Implementation | High | Approved |
| FR-300153 | Hash Configuration | Configure appropriate cost factor for hash generation | Ready for Implementation | Medium | Approved |

## Non-Functional Requirements
| ID | Name | Requirement | Type | Status | Priority | Approval |
|----|------|-------------|------|--------|----------|----------|
| NFR-300150 | Hashing Security | Use minimum cost factor of 10 for bcrypt | Security | Ready for Implementation | High | Approved |
| NFR-300151 | Hashing Performance | Password hashing should complete within 1 second | Performance | Ready for Implementation | Medium | Approved |

## Technical Specifications

### Implementation Details
- **Location**: `utils/password.ts` (new utility module)
- **Library**: bcrypt or bcryptjs
- **Salt Rounds**: 10 (configurable via environment variable)
- **Algorithm**: bcrypt adaptive hash function

### Password Hashing Function
```typescript
import bcrypt from 'bcrypt';

const SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS || '10');

async function hashPassword(plainPassword: string): Promise<string> {
  try {
    const hash = await bcrypt.hash(plainPassword, SALT_ROUNDS);
    return hash;
  } catch (error) {
    throw new Error('Password hashing failed');
  }
}
```

### Password Verification Function
```typescript
async function verifyPassword(
  plainPassword: string,
  hash: string
): Promise<boolean> {
  try {
    const isValid = await bcrypt.compare(plainPassword, hash);
    return isValid;
  } catch (error) {
    return false;
  }
}
```

### Usage in Authentication Flow

#### During User Registration
```typescript
async function createUser(username: string, password: string) {
  // Hash the password
  const passwordHash = await hashPassword(password);

  // Store in database
  const userId = await db.createUser(username, passwordHash);

  return userId;
}
```

#### During Login
```typescript
async function authenticateUser(username: string, password: string) {
  // Get user from database
  const user = await db.getUserByUsername(username);

  if (!user) {
    return null;  // User not found
  }

  // Verify password
  const isValid = await verifyPassword(password, user.password_hash);

  if (!isValid) {
    return null;  // Invalid password
  }

  return user;  // Authentication successful
}
```

### Security Considerations
- **Salt Rounds**: Cost factor of 10-12 provides good security/performance balance
- **Adaptive Function**: bcrypt automatically includes salt in hash
- **No Plain Text**: Never log or transmit plain text passwords
- **Timing Attack Prevention**: bcrypt has constant-time comparison
- **Future-Proof**: Cost factor can be increased as hardware improves

### Password Policy (Optional Enhancement)
```typescript
function validatePasswordStrength(password: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain an uppercase letter');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain a lowercase letter');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain a number');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}
```

### Environment Configuration
```
# .env file
BCRYPT_SALT_ROUNDS=10
```

## External Dependencies
- bcrypt (^5.1.0) or bcryptjs (if bcrypt has compilation issues)
- Node.js crypto module (automatic salt generation)
- dotenv (environment variables)

## Testing Strategy
### Unit Tests
- Password hashing generates valid bcrypt hash
- Hash format validation ($2b$ prefix)
- Password verification with correct password
- Password verification with incorrect password
- Salt uniqueness (same password → different hashes)
- Cost factor configuration

### Performance Tests
- Hashing time within acceptable range (<1s)
- Cost factor impact on performance

### Security Tests
- Plain text never stored
- Hash irreversibility
- Salt included in hash
- Timing attack resistance