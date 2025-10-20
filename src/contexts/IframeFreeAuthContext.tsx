/**
 * Updated Authentication Context for Iframe-Free Implementation
 * Replaces the original AuthContext with iframe-free authentication
 */

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { 
  initAuth, 
  login, 
  logout, 
  isAuthenticated, 
  getUserInfo, 
  hasRole, 
  hasAnyRole, 
  getAccessToken,
  setupAuthEventListeners,
  cleanupAuth
} from '../services/iframe-free-keycloak';
import type { UserInfo } from '../../../src/auth-services/iframe-free-auth';

// Convert UserInfo to match existing User type
interface User {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: Array<{ id: string; name: string; description: string }>;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  token: string | null;
  login: (options?: { prompt?: string; loginHint?: string }) => Promise<void>;
  logout: () => Promise<void>;
  hasRole: (role: string) => boolean;
  hasAnyRole: (roles: string[]) => boolean;
  error: string | null;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

const convertUserInfo = (userInfo: UserInfo | null): User | null => {
  if (!userInfo) return null;
  
  return {
    id: userInfo.sub,
    username: userInfo.preferredUsername || userInfo.email || '',
    email: userInfo.email || '',
    firstName: userInfo.givenName || '',
    lastName: userInfo.familyName || '',
    roles: (userInfo.roles || []).map(role => ({ 
      id: role, 
      name: role, 
      description: '' 
    })),
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
};

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [authenticated, setAuthenticated] = useState(false);

  const clearError = () => {
    setError(null);
  };

  const handleLogin = async (options?: { prompt?: string; loginHint?: string }) => {
    try {
      setError(null);
      setIsLoading(true);
      await login(options);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Login failed';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      setError(null);
      await logout();
      setUser(null);
      setAuthenticated(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Logout failed';
      setError(errorMessage);
      console.error('Logout error:', err);
    }
  };

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Set up global event listeners
        setupAuthEventListeners();
        
        // Initialize authentication
        const isAuthd = await initAuth();
        setAuthenticated(isAuthd);
        
        if (isAuthd) {
          const userInfo = getUserInfo();
          setUser(convertUserInfo(userInfo));
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Authentication initialization failed';
        console.error('Auth initialization error:', err);
        setError(errorMessage);
        setAuthenticated(false);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    // Custom event listeners for auth state changes
    const handleAuthenticated = (event: CustomEvent) => {
      const userInfo = event.detail;
      setUser(convertUserInfo(userInfo));
      setAuthenticated(true);
      setIsLoading(false);
      setError(null);
    };

    const handleUnauthenticated = () => {
      setUser(null);
      setAuthenticated(false);
      setIsLoading(false);
    };

    const handleAuthError = (event: CustomEvent) => {
      const error = event.detail;
      setError(error.message || 'Authentication error');
      setIsLoading(false);
    };

    const handleLogoutEvent = () => {
      setUser(null);
      setAuthenticated(false);
      setError(null);
    };

    // Add event listeners
    window.addEventListener('auth:authenticated', handleAuthenticated as EventListener);
    window.addEventListener('auth:unauthenticated', handleUnauthenticated);
    window.addEventListener('auth:error', handleAuthError as EventListener);
    window.addEventListener('auth:logout', handleLogoutEvent);

    initializeAuth();

    return () => {
      // Cleanup event listeners
      window.removeEventListener('auth:authenticated', handleAuthenticated as EventListener);
      window.removeEventListener('auth:unauthenticated', handleUnauthenticated);
      window.removeEventListener('auth:error', handleAuthError as EventListener);
      window.removeEventListener('auth:logout', handleLogoutEvent);
      
      // Cleanup auth instance
      cleanupAuth();
    };
  }, []);

  const value: AuthContextType = {
    isAuthenticated: authenticated,
    isLoading,
    user,
    token: getAccessToken(),
    login: handleLogin,
    logout: handleLogout,
    hasRole,
    hasAnyRole,
    error,
    clearError,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthProvider;
