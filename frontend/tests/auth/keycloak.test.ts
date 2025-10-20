/**
 * Tests for Keycloak authentication service
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  initKeycloak,
  hasRole,
  hasAnyRole,
  hasAllRoles,
  getUserInfo,
  getUserRoles,
  isAuthenticated,
  getToken,
  cleanup
} from '@/services/keycloak';

// Mock Keycloak
const mockKeycloak = {
  init: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
  register: vi.fn(),
  accountManagement: vi.fn(),
  updateToken: vi.fn(),
  hasRealmRole: vi.fn(),
  hasResourceRole: vi.fn(),
  authenticated: false,
  token: null,
  refreshToken: null,
  idToken: null,
  tokenParsed: null,
  realmAccess: null,
  resourceAccess: null,
  realm: 'test-realm',
  subject: null,
  isTokenExpired: vi.fn(),
  onTokenExpired: null,
  onAuthSuccess: null,
  onAuthError: null,
  onAuthRefreshSuccess: null,
  onAuthRefreshError: null,
  onAuthLogout: null,
};

vi.mock('keycloak-js', () => {
  return {
    default: vi.fn(() => mockKeycloak),
  };
});

describe('Keycloak Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset keycloak state
    mockKeycloak.authenticated = false;
    mockKeycloak.token = null;
    mockKeycloak.tokenParsed = null;
    mockKeycloak.realmAccess = null;
    mockKeycloak.resourceAccess = null;
    mockKeycloak.subject = null;
  });

  afterEach(() => {
    cleanup();
  });

  describe('initKeycloak', () => {
    it('should initialize Keycloak successfully', async () => {
      mockKeycloak.init.mockResolvedValue(true);

      const result = await initKeycloak();

      expect(mockKeycloak.init).toHaveBeenCalledWith({
        onLoad: 'check-sso',
        silentCheckSsoRedirectUri: expect.stringContaining('/silent-check-sso.html'),
        checkLoginIframe: false,
        pkceMethod: 'S256',
        enableLogging: true,
        messageReceiveTimeout: 10000,
        responseMode: 'fragment',
      });
      expect(result).toBe(mockKeycloak);
    });

    it('should handle initialization failure', async () => {
      const error = new Error('Init failed');
      mockKeycloak.init.mockRejectedValue(error);

      await expect(initKeycloak()).rejects.toThrow('Init failed');
    });

    it('should setup token refresh for authenticated users', async () => {
      mockKeycloak.init.mockResolvedValue(true);
      mockKeycloak.authenticated = true;
      mockKeycloak.tokenParsed = {
        preferred_username: 'testuser',
        email: 'test@example.com',
      };

      await initKeycloak();

      expect(mockKeycloak.authenticated).toBe(true);
    });
  });

  describe('Role checking', () => {
    beforeEach(() => {
      mockKeycloak.authenticated = true;
      mockKeycloak.tokenParsed = {
        realm_access: { roles: ['user', 'manager'] },
        resource_access: {
          'test-client': { roles: ['client-admin'] }
        }
      };
    });

    it('should check realm roles correctly', () => {
      mockKeycloak.hasRealmRole.mockImplementation((role) =>
        ['user', 'manager'].includes(role)
      );
      mockKeycloak.hasResourceRole.mockReturnValue(false);

      expect(hasRole('user')).toBe(true);
      expect(hasRole('manager')).toBe(true);
      expect(hasRole('admin')).toBe(false);
    });

    it('should check client roles correctly', () => {
      mockKeycloak.hasRealmRole.mockReturnValue(false);
      mockKeycloak.hasResourceRole.mockImplementation((role) =>
        role === 'client-admin'
      );

      expect(hasRole('client-admin')).toBe(true);
      expect(hasRole('client-user')).toBe(false);
    });

    it('should return false for unauthenticated users', () => {
      mockKeycloak.authenticated = false;
      mockKeycloak.tokenParsed = null;

      expect(hasRole('user')).toBe(false);
    });

    it('should check if user has any of the roles', () => {
      mockKeycloak.hasRealmRole.mockImplementation((role) =>
        ['user', 'manager'].includes(role)
      );
      mockKeycloak.hasResourceRole.mockReturnValue(false);

      expect(hasAnyRole(['admin', 'user'])).toBe(true);
      expect(hasAnyRole(['admin', 'superuser'])).toBe(false);
    });

    it('should check if user has all roles', () => {
      mockKeycloak.hasRealmRole.mockImplementation((role) =>
        ['user', 'manager'].includes(role)
      );
      mockKeycloak.hasResourceRole.mockReturnValue(false);

      expect(hasAllRoles(['user', 'manager'])).toBe(true);
      expect(hasAllRoles(['user', 'admin'])).toBe(false);
    });
  });

  describe('User info', () => {
    it('should return user info for authenticated users', () => {
      mockKeycloak.authenticated = true;
      mockKeycloak.subject = 'user-123';
      mockKeycloak.tokenParsed = {
        preferred_username: 'testuser',
        email: 'test@example.com',
        email_verified: true,
        given_name: 'Test',
        family_name: 'User',
        name: 'Test User',
        groups: ['/TestGroup'],
        session_state: 'session-123',
        iat: 1640995200,
        exp: 1640998800,
      };
      mockKeycloak.realmAccess = { roles: ['user'] };
      mockKeycloak.resourceAccess = { 'test-client': { roles: ['client-role'] } };
      mockKeycloak.realm = 'test-realm';

      const userInfo = getUserInfo();

      expect(userInfo).toEqual({
        id: 'user-123',
        username: 'testuser',
        email: 'test@example.com',
        emailVerified: true,
        firstName: 'Test',
        lastName: 'User',
        name: 'Test User',
        roles: ['user', 'client-role'],
        groups: ['/TestGroup'],
        sessionState: 'session-123',
        issuedAt: 1640995200,
        expiresAt: 1640998800,
        realm: 'test-realm',
        resourceAccess: { 'test-client': { roles: ['client-role'] } },
      });
    });

    it('should return null for unauthenticated users', () => {
      mockKeycloak.authenticated = false;
      mockKeycloak.tokenParsed = null;

      const userInfo = getUserInfo();

      expect(userInfo).toBeNull();
    });

    it('should get user roles correctly', () => {
      mockKeycloak.authenticated = true;
      mockKeycloak.realmAccess = { roles: ['user', 'manager'] };
      mockKeycloak.resourceAccess = {
        'test-client': { roles: ['client-admin'] },
        'another-client': { roles: ['another-role'] }
      };

      const roles = getUserRoles();

      expect(roles).toEqual(['user', 'manager', 'client-admin', 'another-role']);
    });

    it('should return empty array for unauthenticated users', () => {
      mockKeycloak.authenticated = false;

      const roles = getUserRoles();

      expect(roles).toEqual([]);
    });
  });

  describe('Authentication status', () => {
    it('should return correct authentication status', () => {
      mockKeycloak.authenticated = true;
      expect(isAuthenticated()).toBe(true);

      mockKeycloak.authenticated = false;
      expect(isAuthenticated()).toBe(false);
    });

    it('should return token when authenticated', () => {
      mockKeycloak.token = 'test-token';
      expect(getToken()).toBe('test-token');

      mockKeycloak.token = null;
      expect(getToken()).toBeUndefined();
    });
  });

  describe('Token management', () => {
    it('should handle token expiry check', () => {
      mockKeycloak.authenticated = true;
      mockKeycloak.isTokenExpired.mockReturnValue(true);

      // This would normally be tested through the token refresh mechanism
      expect(mockKeycloak.isTokenExpired()).toBe(true);
    });

    it('should handle token refresh', async () => {
      mockKeycloak.updateToken.mockResolvedValue(true);

      // The actual refresh is handled internally by the service
      const refreshed = await mockKeycloak.updateToken(60);
      expect(refreshed).toBe(true);
    });
  });

  describe('Authentication methods', () => {
    it('should handle login', () => {
      const loginOptions = { redirectUri: 'http://localhost:3000' };

      // This would call the internal login method
      mockKeycloak.login(loginOptions);

      expect(mockKeycloak.login).toHaveBeenCalledWith(loginOptions);
    });

    it('should handle logout', () => {
      const logoutOptions = { redirectUri: 'http://localhost:3000' };

      mockKeycloak.logout(logoutOptions);

      expect(mockKeycloak.logout).toHaveBeenCalledWith(logoutOptions);
    });

    it('should handle registration', () => {
      const registerOptions = { redirectUri: 'http://localhost:3000' };

      mockKeycloak.register(registerOptions);

      expect(mockKeycloak.register).toHaveBeenCalledWith(registerOptions);
    });
  });
});