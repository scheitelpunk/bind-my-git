/**
 * Test utilities for verifying WebAuthn compatibility with iframe blocker
 */

export interface WebAuthnTestResult {
  success: boolean;
  message: string;
  details?: any;
}

/**
 * Test if WebAuthn postMessage communication works with iframe blocker
 */
export const testWebAuthnPostMessage = (): WebAuthnTestResult => {
  try {
    // Simulate WebAuthn credential response message
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

    // Test postMessage with WebAuthn content
    window.postMessage(webauthnMessage, window.location.origin);

    return {
      success: true,
      message: 'WebAuthn postMessage allowed successfully',
      details: webauthnMessage
    };
  } catch (error) {
    return {
      success: false,
      message: 'WebAuthn postMessage blocked',
      details: error
    };
  }
};

/**
 * Test if legitimate auth callback messages work
 */
export const testAuthCallbackMessage = (): WebAuthnTestResult => {
  try {
    // Simulate auth completion message
    const authMessage = 'auth-complete:token=test-token';

    // Test postMessage with auth callback content
    window.postMessage(authMessage, window.location.origin);

    return {
      success: true,
      message: 'Auth callback message allowed successfully',
      details: authMessage
    };
  } catch (error) {
    return {
      success: false,
      message: 'Auth callback message blocked',
      details: error
    };
  }
};

/**
 * Test if iframe-related messages are still blocked
 */
export const testIframeBlocking = (): WebAuthnTestResult => {
  try {
    // Simulate malicious iframe message
    const iframeMessage = 'iframe-injection:create-silent-sso';

    // This should be blocked
    window.postMessage(iframeMessage, window.location.origin);

    return {
      success: false,
      message: 'Security issue: Iframe message was NOT blocked',
      details: iframeMessage
    };
  } catch (error) {
    return {
      success: true,
      message: 'Security working: Iframe message properly blocked',
      details: error
    };
  }
};

/**
 * Test navigator.credentials API availability (WebAuthn core)
 */
export const testWebAuthnAPI = async (): Promise<WebAuthnTestResult> => {
  try {
    if (!navigator.credentials) {
      return {
        success: false,
        message: 'WebAuthn API not available (navigator.credentials missing)'
      };
    }

    if (!navigator.credentials.create) {
      return {
        success: false,
        message: 'WebAuthn create method not available'
      };
    }

    if (!navigator.credentials.get) {
      return {
        success: false,
        message: 'WebAuthn get method not available'
      };
    }

    // Check if PublicKeyCredential is available
    if (typeof PublicKeyCredential === 'undefined') {
      return {
        success: false,
        message: 'PublicKeyCredential interface not available'
      };
    }

    return {
      success: true,
      message: 'WebAuthn API fully available and functional'
    };
  } catch (error) {
    return {
      success: false,
      message: 'Error checking WebAuthn API',
      details: error
    };
  }
};

/**
 * Run comprehensive WebAuthn compatibility test suite
 */
export const runWebAuthnCompatibilityTests = async (): Promise<{
  overall: boolean;
  results: Record<string, WebAuthnTestResult>;
}> => {
  console.log('🧪 Running WebAuthn compatibility tests...');

  const results = {
    webauthnPostMessage: testWebAuthnPostMessage(),
    authCallbackMessage: testAuthCallbackMessage(),
    iframeBlocking: testIframeBlocking(),
    webauthnAPI: await testWebAuthnAPI()
  };

  const overall = Object.values(results).every(result => result.success);

  console.log('🧪 WebAuthn compatibility test results:', results);

  if (overall) {
    console.log('✅ All WebAuthn compatibility tests passed');
  } else {
    console.error('❌ Some WebAuthn compatibility tests failed');
  }

  return { overall, results };
};

/**
 * Test Keycloak-specific authentication flows
 */
export const testKeycloakCompatibility = (): WebAuthnTestResult => {
  try {
    // Test legitimate Keycloak token refresh message
    const keycloakMessage = 'token-refresh:success';
    window.postMessage(keycloakMessage, window.location.origin);

    // Test legitimate OIDC callback
    const oidcMessage = 'oidc-callback:state=test-state&code=test-code';
    window.postMessage(oidcMessage, window.location.origin);

    return {
      success: true,
      message: 'Keycloak auth messages allowed successfully'
    };
  } catch (error) {
    return {
      success: false,
      message: 'Keycloak auth messages blocked',
      details: error
    };
  }
};

// Auto-run tests in development mode
if (import.meta.env.DEV && typeof window !== 'undefined') {
  setTimeout(() => {
    runWebAuthnCompatibilityTests();
  }, 1000);
}