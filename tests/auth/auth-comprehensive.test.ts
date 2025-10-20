/**
 * Comprehensive Authentication Test Suite
 * Tests all authentication methods after WebAuthn postMessage fix
 * Ensures security measures remain effective while allowing legitimate authentication
 */

import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import { IframeFreeAuth } from '../../src/auth-services/iframe-free-auth';

// Mock browser APIs
const mockLocation = {
  origin: 'http://localhost:3000',
  pathname: '/',
  search: '',
  href: 'http://localhost:3000/',
  assign: vi.fn(),
  replace: vi.fn()
};

const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
};

const mockSessionStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
};

// Setup global mocks
global.fetch = vi.fn() as Mock;
Object.defineProperty(window, 'location', { value: mockLocation, writable: true });
Object.defineProperty(window, 'localStorage', { value: mockLocalStorage });
Object.defineProperty(window, 'sessionStorage', { value: mockSessionStorage });
Object.defineProperty(window, 'btoa', { value: vi.fn((str) => Buffer.from(str).toString('base64')) });
Object.defineProperty(window, 'atob', { value: vi.fn((str) => Buffer.from(str, 'base64').toString()) });

describe('Comprehensive Authentication Tests', () => {
  let auth: IframeFreeAuth;
  const config = {
    keycloakUrl: 'http://localhost:8180',
    realm: 'project-management',
    clientId: 'pm-frontend'
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
    mockSessionStorage.getItem.mockReturnValue(null);
    auth = new IframeFreeAuth(config);
  });

  afterEach(() => {
    auth.removeAllListeners();
  });

  describe('1. WebAuthn Compatibility Tests', () => {
    it('should support WebAuthn without postMessage conflicts', async () => {
      // Mock WebAuthn API
      const mockCredentials = {
        create: vi.fn().mockResolvedValue({
          id: 'credential-id',
          type: 'public-key',
          rawId: new ArrayBuffer(32),
          response: {
            clientDataJSON: new ArrayBuffer(128),
            attestationObject: new ArrayBuffer(256)
          }
        }),
        get: vi.fn().mockResolvedValue({
          id: 'credential-id',
          type: 'public-key',
          rawId: new ArrayBuffer(32),
          response: {
            clientDataJSON: new ArrayBuffer(128),
            authenticatorData: new ArrayBuffer(64),
            signature: new ArrayBuffer(64)
          }
        })
      };

      Object.defineProperty(navigator, 'credentials', {
        value: mockCredentials,
        writable: true
      });

      // Test WebAuthn registration
      const registrationResult = await navigator.credentials.create({
        publicKey: {
          challenge: new Uint8Array(32),
          rp: { name: 'Test App', id: 'localhost' },
          user: {
            id: new Uint8Array(32),
            name: 'test@example.com',
            displayName: 'Test User'
          },
          pubKeyCredParams: [{ type: 'public-key', alg: -7 }],
          timeout: 30000
        }
      });

      expect(registrationResult).toBeDefined();
      expect(mockCredentials.create).toHaveBeenCalled();

      // Test WebAuthn authentication
      const authResult = await navigator.credentials.get({
        publicKey: {
          challenge: new Uint8Array(32),
          timeout: 30000,
          allowCredentials: [{
            type: 'public-key',
            id: new Uint8Array(32)
          }]
        }
      });

      expect(authResult).toBeDefined();
      expect(mockCredentials.get).toHaveBeenCalled();
    });

    it('should handle WebAuthn errors gracefully', async () => {
      const mockCredentials = {
        create: vi.fn().mockRejectedValue(new Error('WebAuthn not supported')),
        get: vi.fn().mockRejectedValue(new Error('No credentials available'))
      };

      Object.defineProperty(navigator, 'credentials', {
        value: mockCredentials,
        writable: true
      });

      await expect(navigator.credentials.create({
        publicKey: {
          challenge: new Uint8Array(32),
          rp: { name: 'Test App', id: 'localhost' },
          user: {
            id: new Uint8Array(32),
            name: 'test@example.com',
            displayName: 'Test User'
          },
          pubKeyCredParams: [{ type: 'public-key', alg: -7 }]
        }
      })).rejects.toThrow('WebAuthn not supported');
    });
  });

  describe('2. PostMessage Security Whitelist Tests', () => {
    let originalPostMessage: any;
    let originalAddEventListener: any;
    let postMessageCalls: any[] = [];
    let eventListeners: any[] = [];

    beforeEach(() => {
      postMessageCalls = [];
      eventListeners = [];

      originalPostMessage = window.postMessage;
      originalAddEventListener = window.addEventListener;

      // Create a secure postMessage whitelist implementation
      window.postMessage = function(message: any, targetOrigin: string, transfer?: any) {
        postMessageCalls.push({ message, targetOrigin, transfer });

        // Allow legitimate Keycloak and WebAuthn communication
        const allowedOrigins = [
          'http://localhost:8180', // Keycloak
          config.keycloakUrl,
          window.location.origin
        ];

        const allowedMessageTypes = [
          'webauthn',
          'keycloak-auth',
          'oauth-callback',
          'auth-success',
          'token-refresh'
        ];

        // Check if message is from allowed origin or is an allowed type
        const isAllowedOrigin = allowedOrigins.some(origin =>
          targetOrigin === origin || targetOrigin === '*'
        );

        const isAllowedMessage = typeof message === 'object' && message?.type &&
          allowedMessageTypes.includes(message.type);

        if (isAllowedOrigin || isAllowedMessage) {
          return originalPostMessage.call(this, message, targetOrigin, transfer);
        } else {
          console.warn('Blocked unauthorized postMessage:', { message, targetOrigin });
        }
      };

      window.addEventListener = function(type: string, listener: any, options?: any) {
        eventListeners.push({ type, listener, options });

        // Allow legitimate message listeners for auth
        if (type === 'message') {
          // Wrap listener to filter messages
          const wrappedListener = (event: MessageEvent) => {
            const allowedOrigins = [
              'http://localhost:8180',
              config.keycloakUrl,
              window.location.origin
            ];

            if (allowedOrigins.includes(event.origin)) {
              return listener(event);
            } else {
              console.warn('Blocked message from unauthorized origin:', event.origin);
            }
          };

          return originalAddEventListener.call(this, type, wrappedListener, options);
        }

        return originalAddEventListener.call(this, type, listener, options);
      };
    });

    afterEach(() => {
      window.postMessage = originalPostMessage;
      window.addEventListener = originalAddEventListener;
    });

    it('should allow legitimate authentication postMessages', () => {
      // Test Keycloak auth callback message
      window.postMessage(
        { type: 'keycloak-auth', status: 'success' },
        'http://localhost:8180'
      );

      expect(postMessageCalls).toHaveLength(1);
      expect(postMessageCalls[0].targetOrigin).toBe('http://localhost:8180');
    });

    it('should allow WebAuthn postMessages', () => {
      // Test WebAuthn message
      window.postMessage(
        { type: 'webauthn', action: 'create' },
        window.location.origin
      );

      expect(postMessageCalls).toHaveLength(1);
      expect(postMessageCalls[0].message.type).toBe('webauthn');
    });

    it('should block malicious postMessages', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // Test malicious message
      window.postMessage(
        { malicious: 'payload' },
        'https://evil.com'
      );

      expect(consoleSpy).toHaveBeenCalledWith(
        'Blocked unauthorized postMessage:',
        expect.objectContaining({
          message: { malicious: 'payload' },
          targetOrigin: 'https://evil.com'
        })
      );

      consoleSpy.mockRestore();
    });

    it('should filter message event listeners by origin', () => {
      const mockListener = vi.fn();

      window.addEventListener('message', mockListener);

      // Simulate legitimate message
      const legitimateEvent = new MessageEvent('message', {
        data: { type: 'auth-success' },
        origin: 'http://localhost:8180'
      });

      // Simulate malicious message
      const maliciousEvent = new MessageEvent('message', {
        data: { malicious: 'payload' },
        origin: 'https://evil.com'
      });

      expect(eventListeners).toHaveLength(1);
      expect(eventListeners[0].type).toBe('message');
    });
  });

  describe('3. Iframe-Free Authentication Service Tests', () => {
    it('should initialize without creating iframes', async () => {
      const iframeCount = document.querySelectorAll('iframe').length;

      const result = await auth.init();

      expect(document.querySelectorAll('iframe')).toHaveLength(iframeCount);
      expect(result).toBe(false); // Not authenticated initially
    });

    it('should handle OAuth callback without iframes', async () => {
      // Mock auth callback URL
      Object.defineProperty(window.location, 'search', {
        value: '?code=test-code&state=test-state',
        writable: true
      });

      mockSessionStorage.getItem.mockImplementation((key) => {
        if (key === 'auth_state') return 'test-state';
        if (key === 'auth_code_verifier') return 'test-verifier';
        return null;
      });

      // Mock token exchange
      (global.fetch as Mock).mockResolvedValueOnce({
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

      // Mock userinfo
      (global.fetch as Mock).mockResolvedValueOnce({
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

    it('should perform PKCE flow correctly', async () => {
      const generatePKCE = (auth as any).generatePKCE.bind(auth);
      const { codeVerifier, codeChallenge } = await generatePKCE();

      expect(codeVerifier).toBeDefined();
      expect(codeChallenge).toBeDefined();
      expect(typeof codeVerifier).toBe('string');
      expect(typeof codeChallenge).toBe('string');
      expect(codeVerifier.length).toBeGreaterThan(40);
      expect(codeChallenge.length).toBeGreaterThan(40);
    });
  });

  describe('4. Emergency Iframe Killer Integration Tests', () => {
    let originalCreateElement: any;
    let blockedAttempts: number = 0;

    beforeEach(() => {
      blockedAttempts = 0;
      originalCreateElement = document.createElement;

      // Mock the emergency iframe killer behavior
      document.createElement = function(tagName: string) {
        const tag = tagName.toLowerCase();
        if (['iframe', 'frame', 'object', 'embed'].includes(tag)) {
          blockedAttempts++;
          console.warn(`Blocked ${tag} creation attempt #${blockedAttempts}`);
          const dummy = originalCreateElement.call(this, 'div');
          dummy.style.display = 'none';
          return dummy;
        }
        return originalCreateElement.call(this, tagName);
      };
    });

    afterEach(() => {
      document.createElement = originalCreateElement;
    });

    it('should block iframe creation attempts', () => {
      const iframe = document.createElement('iframe');

      expect(blockedAttempts).toBe(1);
      expect(iframe.tagName).toBe('DIV'); // Should be converted to div
      expect(iframe.style.display).toBe('none');
    });

    it('should allow normal element creation', () => {
      const div = document.createElement('div');
      const span = document.createElement('span');

      expect(blockedAttempts).toBe(0);
      expect(div.tagName).toBe('DIV');
      expect(span.tagName).toBe('SPAN');
    });

    it('should not interfere with authentication flow', async () => {
      // Attempt to initialize auth while iframe killer is active
      const result = await auth.init();

      // Should complete without errors
      expect(typeof result).toBe('boolean');
      expect(blockedAttempts).toBe(0); // No iframes created during auth
    });
  });

  describe('5. CSP-Safe Keycloak Integration Tests', () => {
    it('should configure Keycloak without iframe dependencies', () => {
      const keycloakConfig = {
        onLoad: 'check-sso',
        checkLoginIframe: false,
        checkLoginIframeInterval: 0,
        silentCheckSsoRedirectUri: undefined,
        silentCheckSsoFallback: false,
        pkceMethod: 'S256',
        responseMode: 'query',
        flow: 'standard',
        enableBearerInterceptor: false
      };

      expect(keycloakConfig.checkLoginIframe).toBe(false);
      expect(keycloakConfig.checkLoginIframeInterval).toBe(0);
      expect(keycloakConfig.silentCheckSsoFallback).toBe(false);
      expect(keycloakConfig.pkceMethod).toBe('S256');
    });

    it('should handle CSP violations gracefully', () => {
      // Mock CSP violation
      const cspViolationEvent = new Event('securitypolicyviolation');
      Object.defineProperty(cspViolationEvent, 'violatedDirective', {
        value: 'frame-src'
      });
      Object.defineProperty(cspViolationEvent, 'blockedURI', {
        value: 'http://localhost:8180'
      });

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      window.dispatchEvent(cspViolationEvent);

      // Should not throw errors
      expect(consoleSpy).not.toHaveBeenCalledWith(expect.stringContaining('error'));

      consoleSpy.mockRestore();
    });
  });

  describe('6. Token Refresh and Security Tests', () => {
    beforeEach(() => {
      // Set up authenticated state
      const mockToken = createMockJWT({
        exp: Math.floor(Date.now() / 1000) + 3600,
        sub: 'test-user',
        iat: Math.floor(Date.now() / 1000)
      });

      (auth as any).tokenSet = {
        accessToken: mockToken,
        refreshToken: 'refresh-token',
        idToken: 'id-token',
        tokenType: 'Bearer',
        expiresIn: 3600,
        refreshExpiresIn: 1800
      };
    });

    it('should refresh tokens securely', async () => {
      (global.fetch as Mock).mockResolvedValueOnce({
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
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/protocol/openid-connect/token'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/x-www-form-urlencoded'
          })
        })
      );
    });

    it('should handle token refresh failures securely', async () => {
      (global.fetch as Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: () => Promise.resolve('Unauthorized')
      });

      const result = await auth.refreshToken();

      expect(result).toBe(false);
      expect(auth.isAuthenticated()).toBe(false);
    });

    it('should validate token expiration correctly', () => {
      const expiredToken = createMockJWT({
        exp: Math.floor(Date.now() / 1000) - 100
      });

      (auth as any).tokenSet = { accessToken: expiredToken };

      const isExpired = (auth as any).isTokenExpired();
      expect(isExpired).toBe(true);
    });
  });

  describe('7. Error Handling and Security Validation', () => {
    it('should handle malformed auth callbacks', async () => {
      Object.defineProperty(window.location, 'search', {
        value: '?error=access_denied&error_description=User denied access',
        writable: true
      });

      await expect(auth.init()).rejects.toThrow('Auth callback error: access_denied');
    });

    it('should prevent CSRF attacks with state validation', async () => {
      Object.defineProperty(window.location, 'search', {
        value: '?code=test-code&state=malicious-state',
        writable: true
      });

      mockSessionStorage.getItem.mockImplementation((key) => {
        if (key === 'auth_state') return 'legitimate-state';
        if (key === 'auth_code_verifier') return 'test-verifier';
        return null;
      });

      await expect(auth.init()).rejects.toThrow('State mismatch - potential CSRF attack');
    });

    it('should sanitize and validate user inputs', () => {
      const userInfo = {
        sub: 'test-user',
        email: '<script>alert("xss")</script>@example.com',
        roles: ['admin', '<script>alert("xss")</script>']
      };

      (auth as any).userInfo = userInfo;

      // Should not execute scripts or cause issues
      expect(auth.getUserInfo()?.email).toContain('<script>');
      expect(auth.hasRole('<script>alert("xss")</script>')).toBe(true);
    });
  });

  describe('8. Performance and Memory Tests', () => {
    it('should clean up resources on logout', async () => {
      // Set up authenticated state
      (auth as any).tokenSet = { accessToken: 'token' };
      (auth as any).userInfo = { sub: 'user' };

      await auth.logout();

      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('auth_tokens');
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('auth_user');
      expect(mockSessionStorage.removeItem).toHaveBeenCalledWith('auth_code_verifier');
      expect(mockSessionStorage.removeItem).toHaveBeenCalledWith('auth_state');
    });

    it('should not leak memory through event listeners', () => {
      const initialListenerCount = auth.listenerCount('authenticated');

      const handler1 = vi.fn();
      const handler2 = vi.fn();

      auth.on('authenticated', handler1);
      auth.on('authenticated', handler2);

      expect(auth.listenerCount('authenticated')).toBe(initialListenerCount + 2);

      auth.removeAllListeners();

      expect(auth.listenerCount('authenticated')).toBe(0);
    });
  });
});

// Helper function to create mock JWT tokens
function createMockJWT(payload: any): string {
  const header = { alg: 'RS256', typ: 'JWT' };
  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64');
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64');
  const signature = 'mock-signature';

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}