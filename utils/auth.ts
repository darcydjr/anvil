/*
 * Session Management Service
 * ENB-300103: JWT token generation and validation
 */

import jwt from 'jsonwebtoken';
import { Request } from 'express';
import { UserRole } from './database';

// Ensure JWT_SECRET is set
if (!process.env.JWT_SECRET) {
  console.warn('WARNING: JWT_SECRET environment variable not set. Using default (INSECURE!)');
}

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-please-change-in-production';
const TOKEN_EXPIRATION = '24h';

export interface JWTPayload {
  userId: number;
  username: string;
  role: UserRole;
  iat?: number;  // Issued at
  exp?: number;  // Expiration
}

/**
 * Generate a JWT token for an authenticated user
 * @param userId - The user's database ID
 * @param username - The user's username
 * @param role - The user's role
 * @returns JWT token string
 */
export function generateToken(userId: number, username: string, role: UserRole): string {
  const payload: JWTPayload = {
    userId,
    username,
    role
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: TOKEN_EXPIRATION,
    issuer: 'ford anvil-auth'
  });
}

/**
 * Validate and decode a JWT token
 * @param token - The JWT token to validate
 * @returns Decoded payload if valid, null otherwise
 */
export function validateToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: 'ford anvil-auth'
    }) as JWTPayload;
    return decoded;
  } catch (error) {
    // Token is invalid or expired
    return null;
  }
}

/**
 * Extract JWT token from Authorization header
 * @param req - Express request object
 * @returns Token string if found, null otherwise
 */
export function extractToken(req: Request): string | null {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  return authHeader.substring(7); // Remove 'Bearer ' prefix
}

/**
 * Generate a secure random JWT secret (utility function)
 * @param length - Length of the secret (default: 32)
 * @returns Random string suitable for JWT_SECRET
 */
export function generateJWTSecret(length: number = 32): string {
  const crypto = require('crypto');
  return crypto.randomBytes(length).toString('hex');
}
