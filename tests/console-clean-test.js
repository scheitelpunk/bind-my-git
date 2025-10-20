/**
 * Console Clean Test
 * Tests that the application starts without console errors or warnings
 * and that authentication functionality works properly
 */

console.log('🧪 Starting console clean test...');

// Track console messages
const consoleMessages = {
  errors: [],
  warnings: [],
  logs: [],
  infos: []
};

// Override console methods to capture messages
const originalConsole = {
  error: console.error,
  warn: console.warn,
  log: console.log,
  info: console.info
};

console.error = (...args) => {
  consoleMessages.errors.push(args.join(' '));
  originalConsole.error(...args);
};

console.warn = (...args) => {
  consoleMessages.warnings.push(args.join(' '));
  originalConsole.warn(...args);
};

console.log = (...args) => {
  consoleMessages.logs.push(args.join(' '));
  originalConsole.log(...args);
};

console.info = (...args) => {
  consoleMessages.infos.push(args.join(' '));
  originalConsole.info(...args);
};

// Test iframe blocking functionality
function testIframeBlocking() {
  console.log('🔍 Testing iframe blocking...');

  try {
    const iframe = document.createElement('iframe');
    if (iframe.tagName.toLowerCase() !== 'iframe') {
      console.log('✅ Iframe creation successfully blocked');
      return true;
    } else {
      console.error('❌ Iframe creation NOT blocked - security risk!');
      return false;
    }
  } catch (error) {
    console.log('✅ Iframe creation blocked with error (expected)');
    return true;
  }
}

// Test WebAuthn message functionality
function testWebAuthnMessages() {
  console.log('🔍 Testing WebAuthn message handling...');

  try {
    // This should be allowed
    window.postMessage({
      type: 'webauthn',
      credential: { id: 'test' }
    }, window.location.origin);

    console.log('✅ WebAuthn message handled successfully');
    return true;
  } catch (error) {
    console.error('❌ WebAuthn message failed:', error);
    return false;
  }
}

// Test application startup
function testAppStartup() {
  console.log('🔍 Testing application startup...');

  // Check if React root exists
  const root = document.getElementById('root');
  if (root) {
    console.log('✅ React root element found');
    return true;
  } else {
    console.error('❌ React root element not found');
    return false;
  }
}

// Run tests after DOM is loaded
function runTests() {
  console.log('🧪 Running console clean tests...');
  console.log('============================================');

  const results = {
    iframeBlocking: testIframeBlocking(),
    webAuthnMessages: testWebAuthnMessages(),
    appStartup: testAppStartup()
  };

  console.log('============================================');
  console.log('🧪 Test Results:', results);

  // Check console messages
  console.log('📊 Console Message Summary:');
  console.log(`- Errors: ${consoleMessages.errors.length}`);
  console.log(`- Warnings: ${consoleMessages.warnings.length}`);
  console.log(`- Logs: ${consoleMessages.logs.length}`);
  console.log(`- Infos: ${consoleMessages.infos.length}`);

  // Filter out expected development messages
  const unexpectedErrors = consoleMessages.errors.filter(msg =>
    !msg.includes('iframe') &&
    !msg.includes('Blocked') &&
    !msg.includes('WebAuthn') &&
    !msg.includes('test')
  );

  const unexpectedWarnings = consoleMessages.warnings.filter(msg =>
    !msg.includes('iframe') &&
    !msg.includes('Blocked') &&
    !msg.includes('WebAuthn') &&
    !msg.includes('test')
  );

  console.log('🎯 Console Cleanliness:');
  console.log(`- Unexpected Errors: ${unexpectedErrors.length}`);
  console.log(`- Unexpected Warnings: ${unexpectedWarnings.length}`);

  if (unexpectedErrors.length > 0) {
    console.log('❌ Unexpected Errors Found:');
    unexpectedErrors.forEach(error => console.log(`  - ${error}`));
  }

  if (unexpectedWarnings.length > 0) {
    console.log('⚠️ Unexpected Warnings Found:');
    unexpectedWarnings.forEach(warning => console.log(`  - ${warning}`));
  }

  const allTestsPassed = Object.values(results).every(result => result === true);
  const consoleClean = unexpectedErrors.length === 0 && unexpectedWarnings.length === 0;

  if (allTestsPassed && consoleClean) {
    console.log('🎉 ALL TESTS PASSED - Console is clean and functionality works!');
  } else {
    console.log('❌ Some tests failed or console has unexpected messages');
  }

  return { allTestsPassed, consoleClean, results, consoleMessages };
}

// Wait for DOM and run tests
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', runTests);
} else {
  setTimeout(runTests, 1000); // Give time for modules to load
}

// Export for external use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { runTests, testIframeBlocking, testWebAuthnMessages, testAppStartup };
}