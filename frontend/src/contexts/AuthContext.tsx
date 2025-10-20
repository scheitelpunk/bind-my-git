/**
 * Authentication Context with Keycloak OIDC integration
 */

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { initKeycloakSmart, getUserInfo, hasRole, hasAnyRole, isAuthenticated, login, logout, getToken, forceDisableIframes } from '../services/keycloak';
import { api } from '../services/api';
import type { User } from '../types';


interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  token: string | null;
  login: () => void;
  logout: () => void;
  hasRole: (role: string) => boolean;
  hasAnyRole: (roles: string[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Force disable iframe creation before any Keycloak initialization
    forceDisableIframes();

    initKeycloakSmart()
      .then(() => {
        if (isAuthenticated()) {
          const userInfo = getUserInfo();
          if (userInfo) {
            setUser({
              id: userInfo.id || '',
              username: userInfo.username || '',
              email: userInfo.email || '',
              firstName: userInfo.firstName || '',
              lastName: userInfo.lastName || '',
              roles: userInfo.roles.map(role => ({ id: role, name: role, description: '' })),
              active: true,
              createdAt: '',
              updatedAt: '',
            });
          }
        }
      })
      .catch((error) => {
        console.error('Failed to initialize Keycloak:', error);
        // Don't throw error here, let the app handle unauthenticated state
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);


  const value: AuthContextType = {
    isLoading,
    isAuthenticated: isAuthenticated(),
    user,
    token: getToken() || null,
    login,
    logout: () => {
      logout();
      setUser(null);
    },
    hasRole,
    hasAnyRole,
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