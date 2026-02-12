/*
 * Password Hashing Service
 * ENB-300105: Provides secure password hashing using bcrypt
 */

import bcrypt from 'bcrypt';

const SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS || '10');

/**
 * Hash a plain text password using bcrypt
 * @param plainPassword - The plain text password to hash
 * @returns Promise resolving to the hashed password
 */
export async function hashPassword(plainPassword: string): Promise<string> {
  try {
    const hash = await bcrypt.hash(plainPassword, SALT_ROUNDS);
    return hash;
  } catch (error) {
    console.error('Password hashing failed:', error);
    throw new Error('Password hashing failed');
  }
}

/**
 * Verify a plain text password against a bcrypt hash
 * @param plainPassword - The plain text password to verify
 * @param hash - The bcrypt hash to compare against
 * @returns Promise resolving to true if password matches, false otherwise
 */
export async function verifyPassword(
  plainPassword: string,
  hash: string
): Promise<boolean> {
  try {
    const isValid = await bcrypt.compare(plainPassword, hash);
    return isValid;
  } catch (error) {
    console.error('Password verification failed:', error);
    return false;
  }
}

/**
 * Validate password strength (optional enhancement)
 * @param password - The password to validate
 * @returns Object with validation status and error messages
 */
export function validatePasswordStrength(password: string): {
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
