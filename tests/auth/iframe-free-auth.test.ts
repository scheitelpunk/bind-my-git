/**
 * Comprehensive Test Suite for Iframe-Free Authentication
 */

import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import { IframeFreeAuth } from '../../src/auth-services/iframe-free-auth';
import { TokenInterceptor } from '../../src/auth-utils/token-interceptor';

// Mock dependencies
vi.mock('crypto', () => ({
  getRandomValues: vi.fn((arr) => {
    for (let i = 0; i < arr.length; i++) {
      arr[i] = Math.floor(Math.random() * 256);
    }
    return arr;
  }),
  subtle: {
    digest: vi.fn(() => Promise.resolve(new ArrayBuffer(32)))
  }
}));

// Mock fetch globally
const mockFetch = vi.fn() as Mock;
global.fetch = mockFetch;

// Mock window.location
Object.defineProperty(window, 'location', {
  value: {
    origin: 'http://localhost:3000',
    pathname: '/',
    search: '',
    href: 'http://localhost:3000/',
    assign: vi.fn(),
    replace: vi.fn()
  },
  writable: true
});

// Mock localStorage and sessionStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
};

const sessionStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
};

Object.defineProperty(window, 'localStorage', { value: localStorageMock });
Object.defineProperty(window, 'sessionStorage', { value: sessionStorageMock });

// Mock btoa and atob
Object.defineProperty(window, 'btoa', {
  value: vi.fn((str) => Buffer.from(str).toString('base64'))
});

Object.defineProperty(window, 'atob', {
  value: vi.fn((str) => Buffer.from(str, 'base64').toString())
});

describe('IframeFreeAuth', () => {
  let auth: IframeFreeAuth;
  const config = {
    keycloakUrl: 'http://localhost:8180',
    realm: 'test-realm',
    clientId: 'test-client'
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
    sessionStorageMock.getItem.mockReturnValue(null);
    
    auth = new IframeFreeAuth(config);
  });

  afterEach(() => {
    auth.removeAllListeners();
  });

  describe('Initialization', () => {
    it('should initialize with default configuration', () => {
      expect(auth).toBeInstanceOf(IframeFreeAuth);
    });

    it('should handle initialization without stored session', async () => {
      const result = await auth.init();
      expect(result).toBe(false);
      expect(auth.isAuthenticated()).toBe(false);
    });

    it('should detect auth callback from URL', async () => {
      // Mock URL with auth callback parameters
      Object.defineProperty(window.location, 'search', {
        value: '?code=test-code&state=test-state',
        writable: true
      });

      sessionStorageMock.getItem.mockImplementation((key) => {
        if (key === 'auth_state') return 'test-state';
        if (key === 'auth_code_verifier') return 'test-verifier';
        return null;
      });

      // Mock successful token exchange
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          access_token: 'test-access-token',
          refresh_token: 'test-refresh-token',
          id_token: 'test-id-token',
          token_type: 'Bearer',
          expires_in: 3600,
          refresh_expires_in: 1800
        })
      });

      // Mock userinfo response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          sub: 'test-user-id',
          email: 'test@example.com',
          preferred_username: 'testuser'
        })
      });

      const result = await auth.init();
      expect(result).toBe(true);
      expect(auth.isAuthenticated()).toBe(true);
    });
  });

  describe('PKCE Implementation', () => {
    it('should generate PKCE code verifier and challenge', async () => {
      // Access private method for testing
      const generatePKCE = (auth as any).generatePKCE.bind(auth);
      const { codeVerifier, codeChallenge } = await generatePKCE();
      
      expect(codeVerifier).toBeDefined();
      expect(codeChallenge).toBeDefined();
      expect(typeof codeVerifier).toBe('string');
      expect(typeof codeChallenge).toBe('string');
    });

    it('should build correct authorization URL with PKCE', async () => {
      const buildAuthUrl = (auth as any).buildAuthUrl.bind(auth);
      
      const url = buildAuthUrl({
        codeChallenge: 'test-challenge',
        state: 'test-state'
      });
      
      expect(url).toContain('response_type=code');
      expect(url).toContain('client_id=test-client');
      expect(url).toContain('code_challenge=test-challenge');
      expect(url).toContain('code_challenge_method=S256');
      expect(url).toContain('state=test-state');
    });
  });

  describe('Authentication Flow', () => {
    it('should initiate login with redirect', async () => {
      const originalLocation = window.location;
      const mockLocation = { href: '' };
      Object.defineProperty(window, 'location', {
        value: mockLocation,
        writable: true
      });

      await auth.login();
      
      expect(mockLocation.href).toContain('http://localhost:8180/realms/test-realm/protocol/openid-connect/auth');
      expect(sessionStorageMock.setItem).toHaveBeenCalledWith('auth_code_verifier', expect.any(String));
      expect(sessionStorageMock.setItem).toHaveBeenCalledWith('auth_state', expect.any(String));
      
      Object.defineProperty(window, 'location', { value: originalLocation });
    });

    it('should handle logout with redirect', async () => {
      const originalLocation = window.location;
      const mockLocation = { href: '' };
      Object.defineProperty(window, 'location', {
        value: mockLocation,
        writable: true
      });

      await auth.logout();
      
      expect(mockLocation.href).toContain('protocol/openid-connect/logout');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('auth_tokens');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('auth_user');
      
      Object.defineProperty(window, 'location', { value: originalLocation });
    });
  });

  describe('Token Management', () => {
    beforeEach(() => {
      // Set up a mock token for testing
      const mockToken = {
        accessToken: createMockJWT({ exp: Math.floor(Date.now() / 1000) + 3600 }),
        refreshToken: 'refresh-token',
        idToken: 'id-token',
        tokenType: 'Bearer',
        expiresIn: 3600,
        refreshExpiresIn: 1800
      };
      
      (auth as any).tokenSet = mockToken;
    });

    it('should detect when token is expired', () => {
      const expiredToken = createMockJWT({ exp: Math.floor(Date.now() / 1000) - 100 });
      (auth as any).tokenSet = { accessToken: expiredToken };
      
      const isExpired = (auth as any).isTokenExpired();
      expect(isExpired).toBe(true);
    });

    it('should detect when token is not expired', () => {
      const validToken = createMockJWT({ exp: Math.floor(Date.now() / 1000) + 3600 });
      (auth as any).tokenSet = { accessToken: validToken };
      
      const isExpired = (auth as any).isTokenExpired();
      expect(isExpired).toBe(false);
    });

    it('should refresh token successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          access_token: 'new-access-token',
          refresh_token: 'new-refresh-token',
          id_token: 'new-id-token',
          token_type: 'Bearer',
          expires_in: 3600,
          refresh_expires_in: 1800
        })
      });

      const result = await auth.refreshToken();
      expect(result).toBe(true);
      expect(auth.getAccessToken()).toBe('new-access-token');
    });

    it('should handle refresh token failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: () => Promise.resolve('Unauthorized')
      });

      const result = await auth.refreshToken();
      expect(result).toBe(false);
      expect(auth.isAuthenticated()).toBe(false);
    });
  });

  describe('User Information', () => {
    it('should parse roles from access token', () => {
      const tokenWithRoles = createMockJWT({
        realm_access: { roles: ['admin', 'user'] },
        resource_access: {
          'test-client': { roles: ['client-role'] }
        }
      });
      
      (auth as any).tokenSet = { accessToken: tokenWithRoles };
      
      const roles = (auth as any).parseRolesFromToken();
      expect(roles).toContain('admin');
      expect(roles).toContain('user');
      expect(roles).toContain('client-role');
    });

    it('should check user roles correctly', () => {
      const userInfo = {
        sub: 'test-user',
        email: 'test@example.com',
        roles: ['admin', 'user']
      };
      
      (auth as any).userInfo = userInfo;
      
      expect(auth.hasRole('admin')).toBe(true);
      expect(auth.hasRole('nonexistent')).toBe(false);
    });
  });

  describe('Session Storage', () => {
    it('should store session data in localStorage', () => {
      const tokenSet = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        idToken: 'id-token',
        tokenType: 'Bearer',
        expiresIn: 3600,
        refreshExpiresIn: 1800
      };
      
      const userInfo = {
        sub: 'test-user',
        email: 'test@example.com'
      };
      
      (auth as any).tokenSet = tokenSet;
      (auth as any).userInfo = userInfo;
      (auth as any).storeSession();
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith('auth_tokens', JSON.stringify(tokenSet));
      expect(localStorageMock.setItem).toHaveBeenCalledWith('auth_user', JSON.stringify(userInfo));
    });

    it('should load session data from localStorage', async () => {
      const tokenSet = {
        accessToken: createMockJWT({ exp: Math.floor(Date.now() / 1000) + 3600 }),
        refreshToken: 'refresh-token'
      };
      
      const userInfo = { sub: 'test-user', email: 'test@example.com' };
      
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'auth_tokens') return JSON.stringify(tokenSet);
        if (key === 'auth_user') return JSON.stringify(userInfo);
        return null;
      });
      
      await (auth as any).loadStoredSession();
      
      expect((auth as any).tokenSet).toEqual(tokenSet);
      expect((auth as any).userInfo).toEqual(userInfo);
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors during token exchange', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));
      
      Object.defineProperty(window.location, 'search', {
        value: '?code=test-code&state=test-state',
        writable: true
      });

      sessionStorageMock.getItem.mockImplementation((key) => {
        if (key === 'auth_state') return 'test-state';
        if (key === 'auth_code_verifier') return 'test-verifier';
        return null;
      });

      await expect(auth.init()).rejects.toThrow('Network error');
    });

    it('should handle state mismatch in callback', async () => {
      Object.defineProperty(window.location, 'search', {
        value: '?code=test-code&state=wrong-state',
        writable: true
      });

      sessionStorageMock.getItem.mockImplementation((key) => {
        if (key === 'auth_state') return 'correct-state';
        if (key === 'auth_code_verifier') return 'test-verifier';
        return null;
      });

      await expect(auth.init()).rejects.toThrow('State mismatch');
    });
  });

  describe('Event Emission', () => {
    it('should emit authentication events', async () => {
      const authenticatedHandler = vi.fn();
      auth.on('authenticated', authenticatedHandler);
      
      // Simulate successful authentication
      const userInfo = { sub: 'test-user', email: 'test@example.com' };
      auth.emit('authenticated', userInfo);
      
      expect(authenticatedHandler).toHaveBeenCalledWith(userInfo);
    });

    it('should emit error events', () => {
      const errorHandler = vi.fn();
      auth.on('error', errorHandler);
      
      const error = new Error('Test error');
      auth.emit('error', error);
      
      expect(errorHandler).toHaveBeenCalledWith(error);
    });
  });
});

describe('TokenInterceptor', () => {
  let auth: IframeFreeAuth;
  let interceptor: TokenInterceptor;
  
  beforeEach(() => {
    auth = new IframeFreeAuth({
      keycloakUrl: 'http://localhost:8180',
      realm: 'test-realm',
      clientId: 'test-client'
    });
    
    interceptor = new TokenInterceptor({
      auth,
      excludeUrls: ['/public/*'],
      tokenRefreshThreshold: 60
    });
    
    // Mock authenticated state
    vi.spyOn(auth, 'isAuthenticated').mockReturnValue(true);
    vi.spyOn(auth, 'getAccessToken').mockReturnValue('test-token');
  });

  it('should add authorization header to requests', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: 'test' })
    });

    await interceptor.fetch('/api/test');
    
    expect(mockFetch).toHaveBeenCalledWith('/api/test', {
      headers: expect.objectContaining({
        Authorization: 'Bearer test-token'
      })
    });
  });

  it('should exclude URLs from authentication', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: 'test' })
    });

    await interceptor.fetch('/public/test');
    
    expect(mockFetch).toHaveBeenCalledWith('/public/test', undefined);
  });

  it('should retry with refreshed token on 401', async () => {
    // First call returns 401
    mockFetch.mockResolvedValueOnce({ status: 401, ok: false });
    // Second call after refresh succeeds
    mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ data: 'test' }) });
    
    vi.spyOn(auth, 'refreshToken').mockResolvedValue(true);
    
    await interceptor.fetch('/api/test');
    
    expect(auth.refreshToken).toHaveBeenCalled();
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('should provide convenience methods', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: () => Promise.resolve({ data: 'test' })
    });

    const result = await interceptor.get('/api/test');
    expect(result.data).toEqual({ data: 'test' });
    
    await interceptor.post('/api/test', { name: 'test' });
    expect(mockFetch).toHaveBeenCalledWith('/api/test', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ name: 'test' })
    }));
  });
});

// Helper function to create mock JWT tokens
function createMockJWT(payload: any): string {
  const header = { alg: 'RS256', typ: 'JWT' };
  const encodedHeader = btoa(JSON.stringify(header));
  const encodedPayload = btoa(JSON.stringify(payload));
  const signature = 'mock-signature';
  
  return `${encodedHeader}.${encodedPayload}.${signature}`;
}
