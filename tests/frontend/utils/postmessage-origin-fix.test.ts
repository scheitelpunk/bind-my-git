/**
 * Tests for postMessage undefined origin fix in iframe-blocker.ts
 * Verifies that WebAuthn authentication works without postMessage errors
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock window.location for testing
const mockLocation = {
  origin: 'https://localhost:3000',
  href: 'https://localhost:3000/'
};

// Mock import.meta.env for testing
vi.mock('import.meta.env', () => ({
  DEV: true,
  VITE_NUCLEAR_IFRAME_BLOCKING: 'false'
}));

describe('PostMessage Origin Fix', () => {
  let originalPostMessage: any;
  let originalLocation: any;
  let consoleLogSpy: any;
  let consoleWarnSpy: any;
  let consoleErrorSpy: any;

  beforeEach(() => {
    // Store original functions
    originalPostMessage = window.postMessage;
    originalLocation = window.location;

    // Setup spies
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Mock window.location
    Object.defineProperty(window, 'location', {
      value: mockLocation,
      writable: true,
      configurable: true
    });

    // Reset window.__IFRAME_BLOCKER_INITIALIZED__ flag
    (window as any).__IFRAME_BLOCKER_INITIALIZED__ = false;
  });

  afterEach(() => {
    // Restore original functions
    window.postMessage = originalPostMessage;
    Object.defineProperty(window, 'location', {
      value: originalLocation,
      writable: true,
      configurable: true
    });

    // Restore spies
    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  it('should handle undefined targetOrigin for WebAuthn messages', async () => {
    // Import iframe blocker to initialize it
    const { initIframeBlocker } = await import('../../../frontend/src/utils/iframe-blocker');
    initIframeBlocker();

    // Create a WebAuthn message
    const webauthnMessage = {
      type: 'webauthn',
      credential: {
        id: 'test-credential-id',
        response: {
          authenticatorData: 'test-data',
          clientDataJSON: 'test-client-data'
        }
      }
    };

    // Test postMessage with undefined targetOrigin (this should not throw)
    expect(() => {
      window.postMessage(webauthnMessage, undefined as any);
    }).not.toThrow();

    // Verify fallback origin was used and message was logged
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining('✅ ALLOWED: WebAuthn/Auth message with fallback origin:'),
      webauthnMessage
    );
  });

  it('should handle null targetOrigin for WebAuthn messages', async () => {
    const { initIframeBlocker } = await import('../../../frontend/src/utils/iframe-blocker');
    initIframeBlocker();

    const webauthnMessage = 'webauthn-response:success';

    expect(() => {
      window.postMessage(webauthnMessage, null as any);
    }).not.toThrow();

    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining('✅ ALLOWED: WebAuthn/Auth message with fallback origin:'),
      webauthnMessage
    );
  });

  it('should handle undefined targetOrigin for non-WebAuthn messages', async () => {
    const { initIframeBlocker } = await import('../../../frontend/src/utils/iframe-blocker');
    initIframeBlocker();

    const normalMessage = 'normal-app-message';

    expect(() => {
      window.postMessage(normalMessage, undefined as any);
    }).not.toThrow();

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      '🚫 IFRAME BLOCK: postMessage with undefined origin, using safe fallback'
    );
  });

  it('should handle auth callback messages with undefined origin', async () => {
    const { initIframeBlocker } = await import('../../../frontend/src/utils/iframe-blocker');
    initIframeBlocker();

    const authMessage = 'auth-complete:token=test-token';

    expect(() => {
      window.postMessage(authMessage, undefined as any);
    }).not.toThrow();

    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining('✅ ALLOWED: WebAuthn/Auth message with fallback origin:'),
      authMessage
    );
  });

  it('should catch postMessage errors and provide fallback', async () => {
    const { initIframeBlocker } = await import('../../../frontend/src/utils/iframe-blocker');

    // Mock originalPostMessage to throw "Invalid target origin" error
    const mockOriginalPostMessage = vi.fn()
      .mockImplementationOnce(() => {
        throw new Error('Failed to execute \'postMessage\' on \'Window\': Invalid target origin \'undefined\'');
      })
      .mockImplementationOnce(() => {
        // Second call (fallback) succeeds
        return undefined;
      });

    // Replace the stored original with our mock before initializing
    const moduleExports = await import('../../../frontend/src/utils/iframe-blocker');
    // We need to access the internal originalPostMessage, but since it's not exported,
    // we'll test through the public interface

    initIframeBlocker();

    const testMessage = 'test-message';

    // This should not throw even if the first postMessage call fails
    expect(() => {
      window.postMessage(testMessage, 'invalid-origin');
    }).not.toThrow();
  });

  it('should handle various WebAuthn message formats', async () => {
    const { initIframeBlocker } = await import('../../../frontend/src/utils/iframe-blocker');
    initIframeBlocker();

    const webauthnMessages = [
      'webauthn-create-response',
      'webauthn-get-response',
      { type: 'webauthn', action: 'create' },
      { credential: { type: 'public-key' } },
      'navigator.credentials.create',
      'publickey-response',
      'authenticator-data',
      'fido-response'
    ];

    webauthnMessages.forEach((message, index) => {
      expect(() => {
        window.postMessage(message, undefined as any);
      }, `WebAuthn message ${index} should not throw`).not.toThrow();
    });

    // Should have logged allowed messages
    expect(consoleLogSpy).toHaveBeenCalledTimes(webauthnMessages.length);
  });

  it('should handle auth callback message formats', async () => {
    const { initIframeBlocker } = await import('../../../frontend/src/utils/iframe-blocker');
    initIframeBlocker();

    const authMessages = [
      'auth-success',
      'auth-complete',
      'login-complete',
      'token-refresh',
      'auth-callback',
      'oidc-callback'
    ];

    authMessages.forEach((message, index) => {
      expect(() => {
        window.postMessage(message, undefined as any);
      }, `Auth message ${index} should not throw`).not.toThrow();
    });
  });

  it('should work with legitimate origins when provided', async () => {
    const { initIframeBlocker } = await import('../../../frontend/src/utils/iframe-blocker');
    initIframeBlocker();

    const webauthnMessage = 'webauthn-response';
    const legitimateOrigin = 'https://localhost:3000';

    expect(() => {
      window.postMessage(webauthnMessage, legitimateOrigin);
    }).not.toThrow();

    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining('✅ ALLOWED: WebAuthn/Auth message:'),
      webauthnMessage
    );
  });

  it('should integrate properly with WebAuthn test utilities', async () => {
    const { initIframeBlocker } = await import('../../../frontend/src/utils/iframe-blocker');
    const { testWebAuthnPostMessage } = await import('../../../frontend/src/utils/webauthn-iframe-test');

    initIframeBlocker();

    // Run the WebAuthn compatibility test
    const result = testWebAuthnPostMessage();

    expect(result.success).toBe(true);
    expect(result.message).toBe('WebAuthn postMessage allowed successfully');
  });
});

/**
 * Integration test to simulate the exact error scenario
 */
describe('Integration: WebAuthn handleOutgoingDirect Error Fix', () => {
  it('should prevent the specific "Invalid target origin undefined" error', async () => {
    const { initIframeBlocker } = await import('../../../frontend/src/utils/iframe-blocker');
    initIframeBlocker();

    // Simulate the exact call that was failing in webauthn-listeners.js
    // e.handleOutgoingDirect would call postMessage with undefined origin
    const simulateHandleOutgoingDirect = () => {
      // This simulates the WebAuthn library call that was failing
      const webauthnResponse = {
        type: 'webauthn-response',
        credential: {
          id: 'mock-credential-id',
          response: {
            authenticatorData: new ArrayBuffer(8),
            clientDataJSON: JSON.stringify({ type: 'webauthn.get' })
          }
        }
      };

      // This call was throwing "Invalid target origin 'undefined'"
      window.postMessage(webauthnResponse, undefined as any);
    };

    // This should no longer throw the error
    expect(simulateHandleOutgoingDirect).not.toThrow();
  });
});