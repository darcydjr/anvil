# Authentication Toggle Feature

## Overview

This feature allows administrators to enable or disable the login authentication page. When authentication is disabled, users bypass the login page and go straight to the main application page with full admin privileges.

## ⚠️ Security Warning

**Disabling authentication is a security risk!** When authentication is disabled:
- Anyone can access the application without credentials
- All requests are processed as admin user
- No user tracking or audit logging occurs

Only disable authentication in:
- Development environments
- Trusted/isolated networks
- Testing scenarios
- Single-user deployments

## Usage

### Interactive Mode

Run the script without arguments for an interactive menu:

```bash
npm run toggle-auth
```

You'll see a menu with options to:
1. Enable authentication
2. Disable authentication
3. View current status
4. Exit

### Command Line Mode

#### Check Current Status
```bash
npm run toggle-auth status
```

#### Enable Authentication
```bash
npm run toggle-auth on
# or
npm run toggle-auth enable
```

#### Disable Authentication
```bash
npm run toggle-auth off
# or
npm run toggle-auth disable
```

**Note:** Disabling authentication requires confirmation.

## How It Works

### Configuration Storage

Authentication settings are stored in `/config/auth-config.json`:

```json
{
  "authenticationEnabled": true,
  "updatedAt": "2025-01-15T10:30:00.000Z",
  "updatedBy": "admin"
}
```

### Backend Implementation

- **Middleware:** `/utils/middleware.ts`
  - Checks authentication status before validating tokens
  - Bypasses authentication when disabled
  - Automatically assigns admin privileges

- **Configuration:** `/utils/authConfig.ts`
  - Manages reading/writing configuration
  - Provides utility functions for auth checks

- **Endpoint:** `GET /api/auth/status`
  - Returns current authentication status
  - Used by frontend to determine behavior

### Frontend Implementation

- **AuthContext:** `/client/src/contexts/AuthContext.tsx`
  - Checks authentication status on mount
  - Auto-authenticates as admin when disabled
  - Bypasses login flow

## After Toggling Authentication

**Important:** After changing the authentication setting, you must restart the server for changes to take effect:

```bash
npm run restart
# or
npm run dev
```

## Files Modified/Created

### New Files
- `/config/auth-config.json` - Configuration storage
- `/utils/authConfig.ts` - Configuration management utilities
- `/scripts/toggle-auth.ts` - Admin toggle script
- `/docs/AUTHENTICATION-TOGGLE.md` - This documentation

### Modified Files
- `/server.ts` - Added auth status endpoint
- `/utils/middleware.ts` - Added auth bypass logic
- `/client/src/contexts/AuthContext.tsx` - Added auth status check
- `/package.json` - Added toggle-auth npm script

## Examples

### Example 1: Disable Auth for Development

```bash
$ npm run toggle-auth off

════════════════════════════════════════════════════════
   AUTHENTICATION TOGGLE SCRIPT
════════════════════════════════════════════════════════

Current Authentication Status:
  Status: ENABLED ✓

⚠ WARNING ⚠
You are about to DISABLE authentication!
This will allow anyone to access the application without logging in.
All requests will be processed as admin user.

Are you sure you want to continue? (yes/no): yes
✓ Authentication has been DISABLED
  Users will bypass the login page and access the application directly.
  Please restart the server for changes to take effect.
```

### Example 2: Re-enable Auth for Production

```bash
$ npm run toggle-auth on

════════════════════════════════════════════════════════
   AUTHENTICATION TOGGLE SCRIPT
════════════════════════════════════════════════════════

Current Authentication Status:
  Status: DISABLED ✗
  Last Updated: 2025-01-15T10:30:00.000Z
  Updated By: admin

⚠ WARNING: Authentication is currently disabled!
  Users can access the application without logging in.
  All requests are processed as admin user.

✓ Authentication has been ENABLED
  Users will now be required to log in to access the application.
  Please restart the server for changes to take effect.
```

### Example 3: Check Status

```bash
$ npm run toggle-auth status

════════════════════════════════════════════════════════
   AUTHENTICATION TOGGLE SCRIPT
════════════════════════════════════════════════════════

Current Authentication Status:
  Status: ENABLED ✓
  Last Updated: 2025-01-15T14:45:00.000Z
  Updated By: admin
```

## Technical Details

### Default Behavior

- Authentication is **ENABLED** by default
- If config file is missing, it's created with auth enabled
- If config file is corrupted, auth defaults to enabled (fail-safe)

### Admin User Assignment

When authentication is disabled:
- User ID: 1
- Username: admin
- Role: admin

This ensures all API endpoints requiring authentication still function correctly.

### API Behavior

All protected API endpoints continue to work when auth is disabled:
- Admin routes (`/api/admin/*`)
- File operations (`/api/file/*`)
- Workspace management (`/api/workspaces/*`)
- All requests are processed as admin user

## Troubleshooting

### Changes Not Taking Effect

Make sure to restart the server after toggling authentication:
```bash
npm run restart
```

### Permission Denied

Ensure the script has execute permissions:
```bash
chmod +x scripts/toggle-auth.ts
```

### Config File Issues

If the config file becomes corrupted, delete it and run the script again:
```bash
rm config/auth-config.json
npm run toggle-auth status
```

The script will recreate it with default settings.

## Related Documentation

- [User Management](./USER-MANAGEMENT.md) - Managing users and roles
- [Authentication Guide](./AUTHENTICATION.md) - How authentication works
- [Admin Guide](./ADMIN.md) - Administrator documentation
