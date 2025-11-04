# Authentication API Endpoints

## Metadata
- **Name**: Authentication API Endpoints
- **Type**: Enabler
- **ID**: ENB-300101
- **Capability ID**: CAP-725677
- **Owner**: James Reynolds
- **Status**: Ready for Implementation
- **Approval**: Approved
- **Priority**: High
- **Analysis Review**: Required
- **Code Review**: Not Required

## Technical Overview
### Purpose
Provide backend API endpoints for user authentication including login, logout, and session validation functionality.

## Functional Requirements
| ID | Name | Requirement | Status | Priority | Approval |
|----|------|-------------|--------|----------|----------|
| FR-300110 | Login Endpoint | Provide POST /api/auth/login endpoint to authenticate users | Ready for Implementation | High | Approved |
| FR-300111 | Logout Endpoint | Provide POST /api/auth/logout endpoint to end user sessions | Ready for Implementation | High | Approved |
| FR-300112 | Session Validation | Provide GET /api/auth/verify endpoint to validate active sessions | Ready for Implementation | High | Approved |
| FR-300113 | Credential Verification | Verify username and password against database records | Ready for Implementation | High | Approved |
| FR-300114 | Token Generation | Generate authentication tokens for successful logins | Ready for Implementation | High | Approved |

## Non-Functional Requirements
| ID | Name | Requirement | Type | Status | Priority | Approval |
|----|------|-------------|------|--------|----------|----------|
| NFR-300110 | API Response Time | Authentication requests must complete within 500ms | Performance | Ready for Implementation | High | Approved |
| NFR-300111 | Security | All authentication endpoints must use secure practices | Security | Ready for Implementation | High | Approved |

## Technical Specifications

### Implementation Details
- **Location**: server.ts (Express routes section)
- **Router Prefix**: `/api/auth`
- **Authentication Strategy**: JWT (JSON Web Tokens)
- **Token Storage**: HTTP-only cookies or Authorization header

### API Endpoints

#### 1. POST /api/auth/login
**Purpose**: Authenticate user and return JWT token

**Request**:
```typescript
{
  username: string;  // 3-50 characters
  password: string;  // 8-128 characters
}
```

**Response (Success - 200)**:
```typescript
{
  success: true;
  token: string;
  user: {
    username: string;
    id: number;
  }
}
```

**Response (Failure - 401)**:
```typescript
{
  success: false;
  message: string; // "Invalid credentials"
}
```

**Implementation Flow**:
1. Validate request body (username and password present)
2. Query user from database by username
3. Verify password hash using bcrypt
4. Generate JWT token with user ID and username
5. Return token and user info

#### 2. POST /api/auth/logout
**Purpose**: Invalidate user session

**Request**:
```typescript
{
  // No body required, uses token from Authorization header
}
```

**Response (Success - 200)**:
```typescript
{
  success: true;
  message: "Logged out successfully"
}
```

**Implementation**:
- Clear HTTP-only cookie (if using cookies)
- Client removes token from localStorage
- Optional: Add token to blacklist (for early expiration)

#### 3. GET /api/auth/verify
**Purpose**: Verify if current token is valid

**Request**: Authorization header with Bearer token

**Response (Success - 200)**:
```typescript
{
  success: true;
  user: {
    username: string;
    id: number;
  }
}
```

**Response (Failure - 401)**:
```typescript
{
  success: false;
  message: "Invalid or expired token"
}
```

**Implementation**:
1. Extract token from Authorization header
2. Verify token signature and expiration
3. Return user info from token payload

### Security Considerations
- Rate limiting: Max 5 login attempts per minute per IP
- Password validation before database query (prevent timing attacks)
- Constant-time comparison for passwords
- Secure JWT secret (min 32 characters)
- Token expiration: 24 hours
- HTTPS required in production

## External Dependencies
- jsonwebtoken (JWT generation and verification)
- bcrypt (Password hashing and comparison)
- Express.js (HTTP server)
- SQLite3 (User database)
- express-rate-limit (Rate limiting)

## Testing Strategy
### Unit Tests
- Login endpoint with valid credentials
- Login endpoint with invalid credentials
- Token generation and validation
- Error handling for missing fields
- Rate limiting functionality

### Integration Tests
- Complete authentication flow
- Token persistence across requests
- Logout functionality
- Database interaction

### Security Tests
- SQL injection prevention
- Timing attack prevention
- Rate limiting enforcement
- Token tampering detection
