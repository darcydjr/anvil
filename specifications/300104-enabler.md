# Protected Route Middleware

## Metadata
- **Name**: Protected Route Middleware
- **Type**: Enabler
- **ID**: ENB-300104
- **Capability ID**: CAP-725677
- **Owner**: James Reynolds
- **Status**: Ready for Implementation
- **Approval**: Approved
- **Priority**: High
- **Analysis Review**: Required
- **Code Review**: Not Required

## Technical Overview
### Purpose
Provide Express middleware and React route guards to protect application routes ensuring only authenticated users can access protected resources.

## Functional Requirements
| ID | Name | Requirement | Status | Priority | Approval |
|----|------|-------------|--------|----------|----------|
| FR-300140 | Backend Middleware | Create Express middleware to verify authentication tokens | Ready for Implementation | High | Approved |
| FR-300141 | Frontend Route Guard | Implement React Router guards to redirect unauthenticated users | Ready for Implementation | High | Approved |
| FR-300142 | Authentication Check | Check authentication status before rendering protected routes | Ready for Implementation | High | Approved |
| FR-300143 | Redirect to Login | Redirect unauthenticated requests to login page | Ready for Implementation | High | Approved |
| FR-300144 | Public Route Exception | Allow access to login route without authentication | Ready for Implementation | High | Approved |

## Non-Functional Requirements
| ID | Name | Requirement | Type | Status | Priority | Approval |
|----|------|-------------|------|--------|----------|----------|
| NFR-300140 | Minimal Performance Impact | Route protection should add minimal latency to requests | Performance | Ready for Implementation | Medium | Approved |
| NFR-300141 | Security Enforcement | All routes except login must require authentication | Security | Ready for Implementation | High | Approved |

## Technical Specifications

### Backend Middleware Implementation

#### Auth Middleware (server.ts)
```typescript
import { Request, Response, NextFunction } from 'express';
import { validateToken, extractToken } from './utils/auth';

interface AuthRequest extends Request {
  user?: {
    userId: number;
    username: string;
  };
}

function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const token = extractToken(req);

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  const payload = validateToken(token);

  if (!payload) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token'
    });
  }

  // Attach user info to request
  req.user = {
    userId: payload.userId,
    username: payload.username
  };

  next();
}
```

#### Apply Middleware to Protected Routes
```typescript
// Public routes (no auth required)
app.post('/api/auth/login', loginHandler);

// Protected routes (auth required)
app.use('/api/file/*', authMiddleware);
app.use('/api/capabilities*', authMiddleware);
app.use('/api/workspaces*', authMiddleware);
app.use('/api/config*', authMiddleware);
// ... all other API routes
```

### Frontend Route Guard Implementation

#### PrivateRoute Component
```typescript
import { Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';

interface PrivateRouteProps {
  children: React.ReactNode;
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};
```

#### Auth Context
```typescript
interface AuthContextType {
  isAuthenticated: boolean;
  loading: boolean;
  user: { username: string; id: number } | null;
  login: (token: string, user: any) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Check for existing token on mount
    const token = localStorage.getItem('auth_token');
    if (token) {
      verifyToken(token);
    } else {
      setLoading(false);
    }
  }, []);

  // ... implementation
}
```

#### Update App.tsx Routes
```typescript
<Routes>
  <Route path="/login" element={<Login />} />
  <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
  <Route path="/view/:type/:path" element={<PrivateRoute><DocumentView /></PrivateRoute>} />
  {/* All other routes wrapped in PrivateRoute */}
</Routes>
```

### Axios Interceptor for Token Injection
```typescript
// client/src/services/apiService.ts
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid - redirect to login
      localStorage.removeItem('auth_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
```

## External Dependencies
- Express.js (backend)
- React Router v6 (frontend)
- React Context API (state management)
- localStorage (token storage)

## Testing Strategy
### Backend Tests
- Middleware blocks requests without token
- Middleware allows requests with valid token
- Middleware rejects expired tokens
- Protected routes require authentication

### Frontend Tests
- PrivateRoute redirects unauthenticated users
- PrivateRoute allows authenticated users
- Auth context manages state correctly
- Token injection in API calls
- Logout clears authentication state