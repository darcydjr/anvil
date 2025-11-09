/*
 * Authentication Context
 * ENB-300104: Frontend authentication state management
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axios from 'axios';

export type UserRole = 'admin' | 'user';

interface User {
  id: number;
  username: string;
  role: UserRole;
}

interface AuthContextType {
  isAuthenticated: boolean;
  loading: boolean;
  user: User | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  isAdmin: () => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps): JSX.Element {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [user, setUser] = useState<User | null>(null);

  // Check for existing token on mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('auth_token');

      if (!token) {
        setLoading(false);
        return;
      }

      try {
        // Verify token with server
        const response = await axios.get('/api/auth/verify', {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        if (response.data.success) {
          setIsAuthenticated(true);
          setUser(response.data.user);
        } else {
          // Invalid token
          localStorage.removeItem('auth_token');
        }
      } catch (error) {
        // Token verification failed
        localStorage.removeItem('auth_token');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (username: string, password: string): Promise<void> => {
    try {
      const response = await axios.post('/api/auth/login', {
        username,
        password
      });

      if (response.data.success) {
        const { token, user } = response.data;

        // Store token in localStorage
        localStorage.setItem('auth_token', token);

        // Update state
        setIsAuthenticated(true);
        setUser(user);
      } else {
        throw new Error(response.data.message || 'Login failed');
      }
    } catch (error: any) {
      if (error.response?.status === 429) {
        throw new Error('Too many login attempts. Please try again later.');
      }
      throw new Error(error.response?.data?.message || 'Login failed');
    }
  };

  const logout = (): void => {
    // Remove token from localStorage
    localStorage.removeItem('auth_token');

    // Update state
    setIsAuthenticated(false);
    setUser(null);

    // Optional: Call logout endpoint
    axios.post('/api/auth/logout').catch(() => {
      // Ignore errors on logout
    });
  };

  const isAdmin = (): boolean => {
    return user?.role === 'admin';
  };

  const value: AuthContextType = {
    isAuthenticated,
    loading,
    user,
    login,
    logout,
    isAdmin
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
