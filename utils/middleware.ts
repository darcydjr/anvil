/*
 * Authorization Middleware
 * Role-based access control for protected routes
 */

import { Request, Response, NextFunction } from 'express';
import { extractToken, validateToken } from './auth';
import { UserRole } from './database';

// Extend Express Request to include user info
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: number;
        username: string;
        role: UserRole;
      };
    }
  }
}

/**
 * Middleware to authenticate and attach user to request
 */
export function authenticateToken(req: Request, res: Response, next: NextFunction): void {
  const token = extractToken(req);

  if (!token) {
    res.status(401).json({ success: false, error: 'Authentication required' });
    return;
  }

  const payload = validateToken(token);

  if (!payload) {
    res.status(401).json({ success: false, error: 'Invalid or expired token' });
    return;
  }

  // Attach user info to request
  req.user = {
    userId: payload.userId,
    username: payload.username,
    role: payload.role
  };

  next();
}

/**
 * Middleware to check if user has admin role
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ success: false, error: 'Authentication required' });
    return;
  }

  if (req.user.role !== 'admin') {
    res.status(403).json({ success: false, error: 'Admin access required' });
    return;
  }

  next();
}

/**
 * Middleware to check if user has one of the specified roles
 */
export function requireRole(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ success: false, error: `Access denied. Required role: ${roles.join(' or ')}` });
      return;
    }

    next();
  };
}
