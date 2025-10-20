import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { initKeycloakSmart, getUserInfo, hasRole, hasAnyRole, isAuthenticated, login, logout, getToken } from '@/services/keycloak';
import { usersApi } from '@/services/users';
import type { User } from '@/types';

interface AuthContextType {
  isLoading: boolean;
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  login: () => void;
  logout: () => void;
  hasRole: (role: string) => boolean;
  hasAnyRole: (roles: string[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    initKeycloakSmart()
      .then(() => {
        if (isAuthenticated()) {
          const userInfo = getUserInfo();
          if (userInfo) {
            setUser({
              id: userInfo.id || '',
              keycloak_id: userInfo.id || '',  // Keycloak subject ID
              username: userInfo.username || '',
              email: userInfo.email || '',
              first_name: userInfo.firstName || '',
              last_name: userInfo.lastName || '',
              roles: userInfo.roles.map(role => ({ id: role, name: role, description: '' })),
              active: true,
              createdAt: '',
              updatedAt: '',
            });
            // Per requirement: call the /users/ endpoint upon successful login/auth init
            // Fire-and-forget; we don't block login UX on this
            usersApi.createUser(userInfo.id || '').catch((err) => {
              console.warn('Failed to call /users/ after login:', err);
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
    login: () => login(),
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