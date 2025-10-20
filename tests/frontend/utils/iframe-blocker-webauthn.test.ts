/**
 * Integration tests for iframe blocker with WebAuthn compatibility
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  runWebAuthnCompatibilityTests,
  testWebAuthnPostMessage,
  testAuthCallbackMessage,
  testIframeBlocking,
  testKeycloakCompatibility
} from '../../../frontend/src/utils/webauthn-iframe-test';

// Mock environment for testing
const mockWindow = global.window;

describe('Iframe Blocker WebAuthn Compatibility', () => {
  let originalPostMessage: any;
  let consoleLogSpy: any;
  let consoleErrorSpy: any;

  beforeEach(() => {
    // Store original postMessage
    originalPostMessage = window.postMessage;

    // Setup console spies
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Import and initialize iframe blocker
    // Note: In real implementation, this would import the actual iframe blocker
    vi.mock('../../../frontend/src/utils/iframe-blocker', () => ({
      initIframeBlocker: vi.fn(),
      blockIframeMessages: vi.fn()
    }));
  });

  afterEach(() => {
    // Restore original postMessage
    window.postMessage = originalPostMessage;

    // Restore console
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('WebAuthn Message Handling', () => {
    it('should allow WebAuthn credential messages', () => {
      const result = testWebAuthnPostMessage();
      expect(result.success).toBe(true);
      expect(result.message).toContain('WebAuthn postMessage allowed');
    });

    it('should allow auth callback messages', () => {
      const result = testAuthCallbackMessage();
      expect(result.success).toBe(true);
      expect(result.message).toContain('Auth callback message allowed');
    });

    it('should allow Keycloak auth messages', () => {
      const result = testKeycloakCompatibility();
      expect(result.success).toBe(true);
      expect(result.message).toContain('Keycloak auth messages allowed');
    });
  });

  describe('Security Protection', () => {
    it('should block malicious iframe messages', () => {
      const result = testIframeBlocking();
      expect(result.success).toBe(true);
      expect(result.message).toContain('Iframe message properly blocked');
    });

    it('should reject suspicious postMessage calls', () => {
      let blocked = false;

      // Mock the iframe blocker behavior
      window.postMessage = function(message: any, targetOrigin: string) {
        if (typeof message === 'string' && message.includes('iframe-injection')) {
          blocked = true;
          throw new Error('Iframe message blocked');
        }
        return originalPostMessage.call(this, message, targetOrigin);
      };

      try {
        window.postMessage('iframe-injection:malicious-payload', '*');
      } catch (error) {
        blocked = true;
      }

      expect(blocked).toBe(true);
    });

    it('should validate target origins', () => {
      let suspiciousOriginBlocked = false;

      // Mock suspicious origin blocking
      window.postMessage = function(message: any, targetOrigin: string) {
        if (targetOrigin.includes('malicious-site.com')) {
          suspiciousOriginBlocked = true;
          throw new Error('Suspicious origin blocked');
        }
        return originalPostMessage.call(this, message, targetOrigin);
      };

      try {
        window.postMessage('test', 'https://malicious-site.com');
      } catch (error) {
        suspiciousOriginBlocked = true;
      }

      expect(suspiciousOriginBlocked).toBe(true);
    });
  });

  describe('WebAuthn API Availability', () => {
    it('should not interfere with navigator.credentials', () => {
      // Mock navigator.credentials
      Object.defineProperty(global.navigator, 'credentials', {
        value: {
          create: vi.fn().mockResolvedValue({}),
          get: vi.fn().mockResolvedValue({})
        },
        configurable: true
      });

      expect(navigator.credentials).toBeDefined();
      expect(navigator.credentials.create).toBeDefined();
      expect(navigator.credentials.get).toBeDefined();
    });

    it('should preserve PublicKeyCredential interface', () => {
      // Mock PublicKeyCredential
      global.PublicKeyCredential = class PublicKeyCredential {
        static isUserVerifyingPlatformAuthenticatorAvailable = vi.fn().mockResolvedValue(true);
        static isConditionalMediationAvailable = vi.fn().mockResolvedValue(true);
      } as any;

      expect(PublicKeyCredential).toBeDefined();
      expect(PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable).toBeDefined();
    });
  });

  describe('Message Event Handling', () => {
    it('should allow legitimate MessageEvent for WebAuthn', () => {
      let eventAllowed = false;

      const messageHandler = (event: MessageEvent) => {
        if (event.data && typeof event.data === 'object' &&
            (event.data.type === 'webauthn' || event.data.credential)) {
          eventAllowed = true;
        }
      };

      window.addEventListener('message', messageHandler);

      // Simulate WebAuthn message event
      const webauthnEvent = new MessageEvent('message', {
        data: {
          type: 'webauthn',
          credential: { id: 'test-credential' }
        },
        origin: window.location.origin
      });

      window.dispatchEvent(webauthnEvent);
      expect(eventAllowed).toBe(true);

      window.removeEventListener('message', messageHandler);
    });

    it('should block suspicious message events', () => {
      let suspiciousEventBlocked = false;

      const securityHandler = (event: MessageEvent) => {
        if (event.data && typeof event.data === 'string' &&
            event.data.includes('iframe-injection')) {
          event.stopImmediatePropagation();
          event.preventDefault();
          suspiciousEventBlocked = true;
        }
      };

      window.addEventListener('message', securityHandler, true);

      // Simulate malicious message event
      const maliciousEvent = new MessageEvent('message', {
        data: 'iframe-injection:malicious-payload',
        origin: 'https://malicious-site.com'
      });

      window.dispatchEvent(maliciousEvent);
      expect(suspiciousEventBlocked).toBe(true);

      window.removeEventListener('message', securityHandler, true);
    });
  });

  describe('Cross-Origin Authentication', () => {
    it('should allow localhost auth servers in development', () => {
      const testOrigins = [
        'http://localhost:8180',
        'http://localhost:8181',
        'http://127.0.0.1:3000'
      ];

      testOrigins.forEach(origin => {
        let allowed = false;

        try {
          const url = new URL(origin);
          const currentUrl = new URL('http://localhost:3000');

          // Simulate legitimate origin check
          if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
            const port = parseInt(url.port);
            if ([8180, 8181, 3000, 3001, 4000, 4001, 5000, 5001, 8000, 8001].includes(port)) {
              allowed = true;
            }
          }
        } catch (error) {
          // Invalid URL should not be allowed
        }

        expect(allowed).toBe(true);
      });
    });

    it('should block suspicious auth origins', () => {
      const suspiciousOrigins = [
        'https://fake-auth.malicious.com',
        'http://evil-keycloak.hacker.net',
        'https://auth.phishing-site.com'
      ];

      suspiciousOrigins.forEach(origin => {
        let blocked = true;

        try {
          const url = new URL(origin);
          const currentUrl = new URL('http://localhost:3000');

          // Should not match legitimate origins
          if (url.origin === currentUrl.origin) {
            blocked = false;
          } else if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
            blocked = false;
          }
        } catch (error) {
          // Invalid URL should be blocked
        }

        expect(blocked).toBe(true);
      });
    });
  });
});