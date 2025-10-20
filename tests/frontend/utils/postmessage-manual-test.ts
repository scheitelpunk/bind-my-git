/**
 * Manual test file to verify postMessage origin fix works in browser
 * Run this in browser console after iframe blocker is loaded
 */

declare global {
  interface Window {
    testPostMessageOriginFix: () => void;
  }
}

export const testPostMessageOriginFix = () => {
  console.log('🧪 Testing postMessage origin fix...');

  // Test 1: WebAuthn message with undefined origin
  try {
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

    window.postMessage(webauthnMessage, undefined as any);
    console.log('✅ Test 1 PASSED: WebAuthn message with undefined origin');
  } catch (error) {
    console.error('❌ Test 1 FAILED: WebAuthn message with undefined origin', error);
  }

  // Test 2: Auth callback with null origin
  try {
    window.postMessage('auth-complete:success', null as any);
    console.log('✅ Test 2 PASSED: Auth callback with null origin');
  } catch (error) {
    console.error('❌ Test 2 FAILED: Auth callback with null origin', error);
  }

  // Test 3: Regular message with undefined origin
  try {
    window.postMessage('regular-message', undefined as any);
    console.log('✅ Test 3 PASSED: Regular message with undefined origin');
  } catch (error) {
    console.error('❌ Test 3 FAILED: Regular message with undefined origin', error);
  }

  // Test 4: WebAuthn with various patterns
  const webauthnPatterns = [
    'webauthn-create',
    'webauthn-get',
    'navigator.credentials',
    'publickey-credential',
    'authenticator-response',
    'fido-response'
  ];

  webauthnPatterns.forEach((pattern, index) => {
    try {
      window.postMessage(pattern, undefined as any);
      console.log(`✅ Test 4.${index + 1} PASSED: ${pattern} with undefined origin`);
    } catch (error) {
      console.error(`❌ Test 4.${index + 1} FAILED: ${pattern} with undefined origin`, error);
    }
  });

  console.log('🧪 PostMessage origin fix test completed');
};

// Make test available globally for manual browser testing
if (typeof window !== 'undefined') {
  window.testPostMessageOriginFix = testPostMessageOriginFix;
  console.log('🧪 Manual test function available: window.testPostMessageOriginFix()');
}

export default testPostMessageOriginFix;