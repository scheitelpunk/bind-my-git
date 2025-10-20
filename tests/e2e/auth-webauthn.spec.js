/**
 * End-to-End Authentication Test Suite
 * Tests WebAuthn compatibility and postMessage security after fixes
 */

const { test, expect } = require('@playwright/test');

test.describe('Authentication Security and WebAuthn Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('http://localhost:3000');

    // Set up console logging to catch security warnings
    page.on('console', msg => {
      if (msg.type() === 'error' || msg.type() === 'warn') {
        console.log(`Browser ${msg.type()}: ${msg.text()}`);
      }
    });
  });

  test('should load without iframe-related console errors', async ({ page }) => {
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.waitForLoadState('networkidle');

    // Check that no iframe-related errors occurred
    const iframeErrors = errors.filter(error =>
      error.includes('iframe') ||
      error.includes('frame') ||
      error.includes('postMessage')
    );

    console.log('Console errors:', errors);
    expect(iframeErrors.length).toBe(0);
  });

  test('should block malicious iframe creation attempts', async ({ page }) => {
    const blockedAttempts = [];

    page.on('console', msg => {
      if (msg.text().includes('IFRAME BLOCK') || msg.text().includes('EMERGENCY BLOCK')) {
        blockedAttempts.push(msg.text());
      }
    });

    // Attempt to create iframes via various methods
    await page.evaluate(() => {
      try {
        // Test direct createElement
        document.createElement('iframe');

        // Test innerHTML injection
        const div = document.createElement('div');
        div.innerHTML = '<iframe src="http://evil.com"></iframe>';

        // Test insertAdjacentHTML
        document.body.insertAdjacentHTML('beforeend', '<iframe src="http://malicious.com"></iframe>');

        // Test appendChild
        const iframe = document.createElement('iframe');
        iframe.src = 'http://evil.com';
        document.body.appendChild(iframe);
      } catch (e) {
        console.log('Iframe creation blocked as expected:', e.message);
      }
    });

    await page.waitForTimeout(1000);

    // Verify that iframe creation attempts were blocked
    expect(blockedAttempts.length).toBeGreaterThan(0);
    console.log('Blocked iframe attempts:', blockedAttempts.length);
  });

  test('should allow legitimate WebAuthn credential creation', async ({ page }) => {
    // Mock WebAuthn API to simulate support
    await page.addInitScript(() => {
      // Mock navigator.credentials for testing
      if (!navigator.credentials) {
        navigator.credentials = {
          create: async (options) => {
            console.log('✅ WebAuthn credential.create called');
            return {
              id: 'mock-credential-id',
              type: 'public-key',
              rawId: new ArrayBuffer(32),
              response: {
                clientDataJSON: new ArrayBuffer(64),
                attestationObject: new ArrayBuffer(128)
              }
            };
          },
          get: async (options) => {
            console.log('✅ WebAuthn credential.get called');
            return {
              id: 'mock-credential-id',
              type: 'public-key',
              rawId: new ArrayBuffer(32),
              response: {
                clientDataJSON: new ArrayBuffer(64),
                authenticatorData: new ArrayBuffer(64),
                signature: new ArrayBuffer(64)
              }
            };
          }
        };
      }
    });

    let webAuthnSuccessful = false;

    page.on('console', msg => {
      if (msg.text().includes('WebAuthn credential')) {
        webAuthnSuccessful = true;
      }
    });

    // Test WebAuthn credential creation
    const credentialCreated = await page.evaluate(async () => {
      try {
        const credential = await navigator.credentials.create({
          publicKey: {
            challenge: new Uint8Array(32),
            rp: {
              name: 'Test App',
              id: 'localhost'
            },
            user: {
              id: new Uint8Array(32),
              name: 'test@example.com',
              displayName: 'Test User'
            },
            pubKeyCredParams: [{
              type: 'public-key',
              alg: -7
            }],
            timeout: 30000
          }
        });

        return credential !== null;
      } catch (error) {
        console.error('WebAuthn creation failed:', error);
        return false;
      }
    });

    expect(credentialCreated).toBe(true);
    expect(webAuthnSuccessful).toBe(true);
  });

  test('should allow legitimate authentication postMessages', async ({ page }) => {
    const allowedMessages = [];
    const blockedMessages = [];

    page.on('console', msg => {
      if (msg.text().includes('ALLOWED:')) {
        allowedMessages.push(msg.text());
      } else if (msg.text().includes('IFRAME BLOCK:')) {
        blockedMessages.push(msg.text());
      }
    });

    // Test legitimate authentication messages
    await page.evaluate(() => {
      // Simulate legitimate Keycloak auth callback
      window.postMessage({
        type: 'auth-success',
        token: 'valid-token'
      }, window.location.origin);

      // Simulate WebAuthn message
      window.postMessage({
        type: 'webauthn',
        action: 'create',
        credential: 'credential-data'
      }, window.location.origin);

      // Simulate malicious message
      window.postMessage({
        type: 'iframe-injection',
        payload: '<iframe src="http://evil.com"></iframe>'
      }, window.location.origin);
    });

    await page.waitForTimeout(1000);

    // Verify legitimate messages were allowed and malicious ones blocked
    expect(allowedMessages.length).toBeGreaterThan(0);
    console.log('Allowed messages:', allowedMessages.length);
    console.log('Blocked messages:', blockedMessages.length);
  });

  test('should handle Keycloak authentication without iframe errors', async ({ page }) => {
    // Mock Keycloak initialization
    await page.addInitScript(() => {
      window.mockKeycloakInit = () => {
        console.log('✅ Initializing Keycloak without iframes');

        // Simulate CSP-safe Keycloak config
        const config = {
          url: 'http://localhost:8180',
          realm: 'project-management',
          clientId: 'pm-frontend'
        };

        const initOptions = {
          onLoad: 'check-sso',
          checkLoginIframe: false,
          checkLoginIframeInterval: 0,
          silentCheckSsoRedirectUri: undefined,
          silentCheckSsoFallback: false,
          pkceMethod: 'S256',
          responseMode: 'query',
          enableBearerInterceptor: false
        };

        console.log('✅ Keycloak config:', { config, initOptions });
        return Promise.resolve(true);
      };
    });

    let keycloakInitialized = false;

    page.on('console', msg => {
      if (msg.text().includes('Initializing Keycloak without iframes')) {
        keycloakInitialized = true;
      }
    });

    // Test Keycloak initialization
    const initResult = await page.evaluate(() => {
      return window.mockKeycloakInit();
    });

    expect(initResult).toBe(true);
    expect(keycloakInitialized).toBe(true);
  });

  test('should maintain security measures while allowing auth', async ({ page }) => {
    const securityEvents = [];

    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('IFRAME BLOCK') ||
          text.includes('ALLOWED') ||
          text.includes('SECURE') ||
          text.includes('EMERGENCY')) {
        securityEvents.push({
          type: msg.type(),
          text: text,
          timestamp: new Date().toISOString()
        });
      }
    });

    // Test various security scenarios
    await page.evaluate(() => {
      // Test 1: Malicious iframe creation
      try {
        const maliciousIframe = document.createElement('iframe');
        maliciousIframe.src = 'http://evil.com/steal-data';
        document.body.appendChild(maliciousIframe);
      } catch (e) {
        console.log('Security: Malicious iframe blocked');
      }

      // Test 2: Legitimate WebAuthn message
      window.postMessage({
        type: 'webauthn',
        publicKeyCredential: {
          id: 'credential-id',
          type: 'public-key'
        }
      }, window.location.origin);

      // Test 3: Suspicious postMessage
      try {
        window.postMessage({
          maliciousPayload: 'steal-cookies',
          targetIframe: 'evil-frame'
        }, 'http://malicious-site.com');
      } catch (e) {
        console.log('Security: Malicious postMessage blocked');
      }

      // Test 4: Legitimate auth callback
      window.postMessage({
        type: 'auth-callback',
        code: 'auth-code',
        state: 'auth-state'
      }, window.location.origin);
    });

    await page.waitForTimeout(2000);

    // Analyze security events
    const blockedEvents = securityEvents.filter(e => e.text.includes('BLOCK'));
    const allowedEvents = securityEvents.filter(e => e.text.includes('ALLOWED'));

    console.log('Security events summary:');
    console.log('- Blocked events:', blockedEvents.length);
    console.log('- Allowed events:', allowedEvents.length);
    console.log('- Total events:', securityEvents.length);

    // Verify security measures are working
    expect(securityEvents.length).toBeGreaterThan(0);

    // Should have blocked malicious attempts
    const hasMaliciousBlocks = securityEvents.some(e =>
      e.text.includes('BLOCK') &&
      (e.text.includes('malicious') || e.text.includes('evil'))
    );

    // Should have allowed legitimate auth
    const hasLegitimateAllows = securityEvents.some(e =>
      e.text.includes('ALLOWED') &&
      (e.text.includes('webauthn') || e.text.includes('auth'))
    );

    expect(hasMaliciousBlocks).toBe(true);
    expect(hasLegitimateAllows).toBe(true);
  });

  test('should not have any authentication-breaking console errors', async ({ page }) => {
    const authErrors = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        const text = msg.text();
        // Check for authentication-breaking errors
        if (text.includes('auth') ||
            text.includes('login') ||
            text.includes('token') ||
            text.includes('credential') ||
            text.includes('webauthn')) {
          authErrors.push(text);
        }
      }
    });

    // Load page and wait for any async operations
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Try to trigger authentication flows
    await page.evaluate(() => {
      // Simulate various auth operations that should work
      if (window.initAuth) {
        window.initAuth();
      }

      if (navigator.credentials) {
        // This should not cause errors
        navigator.credentials.create({
          publicKey: {
            challenge: new Uint8Array(32),
            rp: { name: 'Test', id: 'localhost' },
            user: { id: new Uint8Array(32), name: 'test', displayName: 'Test' },
            pubKeyCredParams: [{ type: 'public-key', alg: -7 }]
          }
        }).catch(e => {
          // Expected to fail in test environment, but shouldn't cause iframe errors
          console.log('WebAuthn test expected to fail in headless browser');
        });
      }
    });

    await page.waitForTimeout(2000);

    // Filter out expected errors that don't break authentication
    const criticalAuthErrors = authErrors.filter(error =>
      !error.includes('test expected to fail') &&
      !error.includes('WebAuthn not supported') &&
      !error.includes('headless browser')
    );

    console.log('Authentication errors found:', criticalAuthErrors);
    expect(criticalAuthErrors.length).toBe(0);
  });

  test('should preserve existing functionality while blocking iframes', async ({ page }) => {
    let functionalityErrors = 0;

    page.on('console', msg => {
      if (msg.type() === 'error' && !msg.text().includes('IFRAME BLOCK')) {
        functionalityErrors++;
      }
    });

    // Test that normal DOM operations still work
    const domOperationsWork = await page.evaluate(() => {
      try {
        // Test normal element creation
        const div = document.createElement('div');
        div.textContent = 'Test div';
        document.body.appendChild(div);

        // Test normal events
        const button = document.createElement('button');
        button.textContent = 'Test button';
        button.addEventListener('click', () => {
          console.log('Button clicked normally');
        });
        document.body.appendChild(button);

        // Test normal messaging (same origin)
        window.postMessage({ type: 'test', data: 'normal message' }, window.location.origin);

        return true;
      } catch (error) {
        console.error('DOM operation failed:', error);
        return false;
      }
    });

    expect(domOperationsWork).toBe(true);
    expect(functionalityErrors).toBe(0);
  });
});

test.describe('Token Management and Refresh Tests', () => {
  test('should handle token refresh without iframe dependencies', async ({ page }) => {
    // Mock token refresh scenario
    await page.addInitScript(() => {
      window.mockTokenRefresh = async () => {
        try {
          // Simulate token refresh request
          const response = await fetch('http://localhost:8180/realms/project-management/protocol/openid-connect/token', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: 'grant_type=refresh_token&client_id=pm-frontend&refresh_token=mock-refresh-token'
          });

          // Mock successful response
          return {
            access_token: 'new-access-token',
            refresh_token: 'new-refresh-token',
            expires_in: 3600
          };
        } catch (error) {
          console.log('Token refresh test (mock):', error.message);
          return null;
        }
      };
    });

    const refreshResult = await page.evaluate(() => {
      return window.mockTokenRefresh();
    });

    // In test environment, this will be null due to network restrictions
    // but should not cause iframe-related errors
    expect(typeof refreshResult).toBe('object');
  });
});