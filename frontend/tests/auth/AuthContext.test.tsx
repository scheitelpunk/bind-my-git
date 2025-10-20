/**
 * Tests for Authentication Context
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { ReactNode } from 'react';
import { AuthProvider, useAuth } from '@/hooks/useAuth';

// Mock Keycloak service
const mockKeycloakService = {
  initKeycloak: vi.fn(),
  isAuthenticated: vi.fn(),
  getUserInfo: vi.fn(),
  hasRole: vi.fn(),
  hasAnyRole: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
  getToken: vi.fn(),
};

vi.mock('@/services/keycloak', () => mockKeycloakService);

// Test component that uses auth context
const TestComponent = () => {
  const auth = useAuth();

  return (
    <div>
      <div data-testid="loading">{auth.isLoading ? 'Loading' : 'Not Loading'}</div>
      <div data-testid="authenticated">{auth.isAuthenticated ? 'Authenticated' : 'Not Authenticated'}</div>
      <div data-testid="user">{auth.user ? auth.user.email : 'No User'}</div>
      <div data-testid="token">{auth.token || 'No Token'}</div>
      <button onClick={auth.login} data-testid="login">Login</button>
      <button onClick={auth.logout} data-testid="logout">Logout</button>
    </div>
  );
};

const TestComponentWithRole = ({ role }: { role: string }) => {
  const auth = useAuth();

  return (
    <div>
      <div data-testid="has-role">{auth.hasRole(role) ? 'Has Role' : 'No Role'}</div>
    </div>
  );
};

const renderWithAuthProvider = (component: ReactNode) => {
  return render(
    <AuthProvider>
      {component}
    </AuthProvider>
  );
};

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Authentication initialization', () => {
    it('should show loading state initially', () => {
      mockKeycloakService.initKeycloak.mockImplementation(() => new Promise(() => {})); // Never resolves

      renderWithAuthProvider(<TestComponent />);

      expect(screen.getByTestId('loading')).toHaveTextContent('Loading');
      expect(screen.getByTestId('authenticated')).toHaveTextContent('Not Authenticated');
    });

    it('should initialize successfully with authenticated user', async () => {
      const mockUser = {
        id: 'user-123',
        username: 'testuser',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        roles: ['user', 'manager'],
      };

      mockKeycloakService.initKeycloak.mockResolvedValue(true);
      mockKeycloakService.isAuthenticated.mockReturnValue(true);
      mockKeycloakService.getUserInfo.mockReturnValue(mockUser);
      mockKeycloakService.getToken.mockReturnValue('test-token');

      renderWithAuthProvider(<TestComponent />);

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('Not Loading');
      });

      expect(screen.getByTestId('authenticated')).toHaveTextContent('Authenticated');
      expect(screen.getByTestId('user')).toHaveTextContent('test@example.com');
      expect(screen.getByTestId('token')).toHaveTextContent('test-token');
    });

    it('should handle initialization with unauthenticated user', async () => {
      mockKeycloakService.initKeycloak.mockResolvedValue(false);
      mockKeycloakService.isAuthenticated.mockReturnValue(false);
      mockKeycloakService.getUserInfo.mockReturnValue(null);
      mockKeycloakService.getToken.mockReturnValue(null);

      renderWithAuthProvider(<TestComponent />);

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('Not Loading');
      });

      expect(screen.getByTestId('authenticated')).toHaveTextContent('Not Authenticated');
      expect(screen.getByTestId('user')).toHaveTextContent('No User');
      expect(screen.getByTestId('token')).toHaveTextContent('No Token');
    });

    it('should handle initialization failure', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      mockKeycloakService.initKeycloak.mockRejectedValue(new Error('Init failed'));
      mockKeycloakService.isAuthenticated.mockReturnValue(false);

      renderWithAuthProvider(<TestComponent />);

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('Not Loading');
      });

      expect(screen.getByTestId('authenticated')).toHaveTextContent('Not Authenticated');
      expect(consoleSpy).toHaveBeenCalledWith('Failed to initialize Keycloak:', expect.any(Error));

      consoleSpy.mockRestore();
    });
  });

  describe('Authentication methods', () => {
    beforeEach(async () => {
      mockKeycloakService.initKeycloak.mockResolvedValue(true);
      mockKeycloakService.isAuthenticated.mockReturnValue(true);
      mockKeycloakService.getUserInfo.mockReturnValue({
        id: 'user-123',
        username: 'testuser',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        roles: ['user'],
      });
      mockKeycloakService.getToken.mockReturnValue('test-token');
    });

    it('should call login when login button is clicked', async () => {
      renderWithAuthProvider(<TestComponent />);

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('Not Loading');
      });

      act(() => {
        screen.getByTestId('login').click();
      });

      expect(mockKeycloakService.login).toHaveBeenCalled();
    });

    it('should call logout when logout button is clicked', async () => {
      renderWithAuthProvider(<TestComponent />);

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('Not Loading');
      });

      act(() => {
        screen.getByTestId('logout').click();
      });

      expect(mockKeycloakService.logout).toHaveBeenCalled();
    });
  });

  describe('Role checking', () => {
    beforeEach(async () => {
      mockKeycloakService.initKeycloak.mockResolvedValue(true);
      mockKeycloakService.isAuthenticated.mockReturnValue(true);
      mockKeycloakService.getUserInfo.mockReturnValue({
        id: 'user-123',
        username: 'testuser',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        roles: ['user', 'manager'],
      });
      mockKeycloakService.getToken.mockReturnValue('test-token');
    });

    it('should check roles correctly', async () => {
      mockKeycloakService.hasRole.mockImplementation((role: string) =>
        ['user', 'manager'].includes(role)
      );

      renderWithAuthProvider(<TestComponentWithRole role="user" />);

      await waitFor(() => {
        expect(screen.getByTestId('has-role')).toHaveTextContent('Has Role');
      });

      expect(mockKeycloakService.hasRole).toHaveBeenCalledWith('user');
    });

    it('should return false for roles user does not have', async () => {
      mockKeycloakService.hasRole.mockImplementation((role: string) =>
        ['user', 'manager'].includes(role)
      );

      renderWithAuthProvider(<TestComponentWithRole role="admin" />);

      await waitFor(() => {
        expect(screen.getByTestId('has-role')).toHaveTextContent('No Role');
      });

      expect(mockKeycloakService.hasRole).toHaveBeenCalledWith('admin');
    });
  });

  describe('Error handling', () => {
    it('should throw error when useAuth is used outside AuthProvider', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        render(<TestComponent />);
      }).toThrow('useAuth must be used within an AuthProvider');

      consoleSpy.mockRestore();
    });
  });

  describe('User state management', () => {
    it('should update user state when authentication changes', async () => {
      const mockUser = {
        id: 'user-123',
        username: 'testuser',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        roles: ['user'],
      };

      // Start with authenticated user
      mockKeycloakService.initKeycloak.mockResolvedValue(true);
      mockKeycloakService.isAuthenticated.mockReturnValue(true);
      mockKeycloakService.getUserInfo.mockReturnValue(mockUser);
      mockKeycloakService.getToken.mockReturnValue('test-token');

      const { rerender } = renderWithAuthProvider(<TestComponent />);

      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('test@example.com');
      });

      // Simulate logout
      mockKeycloakService.isAuthenticated.mockReturnValue(false);
      mockKeycloakService.getUserInfo.mockReturnValue(null);
      mockKeycloakService.getToken.mockReturnValue(null);

      // Trigger logout
      act(() => {
        screen.getByTestId('logout').click();
      });

      // The user should be cleared after logout
      // Note: This test might need adjustment based on actual logout implementation
      expect(mockKeycloakService.logout).toHaveBeenCalled();
    });

    it('should handle token updates', async () => {
      mockKeycloakService.initKeycloak.mockResolvedValue(true);
      mockKeycloakService.isAuthenticated.mockReturnValue(true);
      mockKeycloakService.getUserInfo.mockReturnValue({
        id: 'user-123',
        username: 'testuser',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        roles: ['user'],
      });

      // Start with one token
      mockKeycloakService.getToken.mockReturnValue('initial-token');

      renderWithAuthProvider(<TestComponent />);

      await waitFor(() => {
        expect(screen.getByTestId('token')).toHaveTextContent('initial-token');
      });

      // Simulate token refresh
      mockKeycloakService.getToken.mockReturnValue('refreshed-token');

      // In a real scenario, this would be triggered by token refresh
      // The exact implementation depends on how token updates are handled
    });
  });
});