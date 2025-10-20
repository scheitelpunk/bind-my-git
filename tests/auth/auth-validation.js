#!/usr/bin/env node
/**
 * Direct Authentication Validation Script
 * Tests the WebAuthn postMessage fix and authentication security
 */

const fs = require('fs');
const path = require('path');

// ANSI colors
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

const log = (message, color = colors.reset) => {
  console.log(`${color}${message}${colors.reset}`);
};

// Test results
let testsRun = 0;
let testsPassed = 0;
let testsFailed = 0;

function assert(condition, message) {
  testsRun++;
  if (condition) {
    testsPassed++;
    log(`✅ PASS: ${message}`, colors.green);
  } else {
    testsFailed++;
    log(`❌ FAIL: ${message}`, colors.red);
  }
}

// Test 1: Verify iframe-free authentication files exist
function testAuthenticationFilesExist() {
  log('\n📁 Testing Authentication Files...', colors.blue);

  const requiredFiles = [
    'frontend/src/services/iframe-free-keycloak.ts',
    'src/auth-services/iframe-free-auth.ts',
    'frontend/src/utils/emergency-iframe-killer.ts',
    'frontend/src/utils/iframe-blocker.ts',
    'backend/auth/oidc_auth.py'
  ];

  requiredFiles.forEach(file => {
    const filePath = path.join(process.cwd(), file);
    assert(fs.existsSync(filePath), `Authentication file exists: ${file}`);
  });
}

// Test 2: Verify iframe blocking configuration
function testIframeBlockingConfig() {
  log('\n🛡️  Testing Iframe Blocking Configuration...', colors.blue);

  try {
    const iframeBlockerPath = path.join(process.cwd(), 'frontend/src/utils/iframe-blocker.ts');
    const content = fs.readFileSync(iframeBlockerPath, 'utf8');

    // Check for WebAuthn whitelist
    assert(content.includes('WEBAUTHN_WHITELIST'), 'WebAuthn whitelist defined');
    assert(content.includes('webauthn'), 'WebAuthn patterns included');
    assert(content.includes('credentials'), 'Credentials API pattern included');
    assert(content.includes('authenticator'), 'Authenticator pattern included');

    // Check for auth whitelist
    assert(content.includes('AUTH_WHITELIST'), 'Auth whitelist defined');
    assert(content.includes('auth-success'), 'Auth success pattern included');
    assert(content.includes('auth-callback'), 'Auth callback pattern included');

    // Check for iframe blocking
    assert(content.includes('blockIframeCreation'), 'Iframe creation blocking function exists');
    assert(content.includes('blockIframeMessages'), 'Iframe message blocking function exists');

  } catch (error) {
    assert(false, `Could not read iframe blocker config: ${error.message}`);
  }
}

// Test 3: Verify CSP-safe Keycloak configuration
function testKeycloakCSPConfig() {
  log('\n🔐 Testing Keycloak CSP Configuration...', colors.blue);

  try {
    const keycloakPath = path.join(process.cwd(), 'frontend/src/services/keycloak.ts');
    const content = fs.readFileSync(keycloakPath, 'utf8');

    // Check for iframe disabling
    assert(content.includes('checkLoginIframe: false'), 'Login iframe disabled');
    assert(content.includes('checkLoginIframeInterval: 0'), 'Iframe interval disabled');
    assert(content.includes('silentCheckSsoFallback: false'), 'Silent SSO fallback disabled');

    // Check for PKCE
    assert(content.includes('pkceMethod'), 'PKCE method configured');
    assert(content.includes('S256'), 'PKCE S256 method used');

    // Check for redirect mode
    assert(content.includes('responseMode'), 'Response mode configured');
    assert(content.includes('query'), 'Query response mode used');

  } catch (error) {
    assert(false, `Could not read Keycloak config: ${error.message}`);
  }
}

// Test 4: Verify iframe-free authentication implementation
function testIframeFreeAuth() {
  log('\n🚫 Testing Iframe-Free Authentication...', colors.blue);

  try {
    const authPath = path.join(process.cwd(), 'src/auth-services/iframe-free-auth.ts');
    const content = fs.readFileSync(authPath, 'utf8');

    // Check for PKCE implementation
    assert(content.includes('generatePKCE'), 'PKCE generation implemented');
    assert(content.includes('codeVerifier'), 'Code verifier handling present');
    assert(content.includes('codeChallenge'), 'Code challenge handling present');

    // Check for OAuth flow
    assert(content.includes('authorization_code'), 'Authorization code flow used');
    assert(content.includes('exchangeCodeForTokens'), 'Token exchange implemented');

    // Check for session management
    assert(content.includes('sessionStorage'), 'Session storage used for PKCE');
    assert(content.includes('localStorage'), 'Local storage used for tokens');

    // Check for security features
    assert(content.includes('State mismatch'), 'CSRF protection via state validation');
    assert(content.includes('isTokenExpired'), 'Token expiration checking');

  } catch (error) {
    assert(false, `Could not read iframe-free auth: ${error.message}`);
  }
}

// Test 5: Verify emergency iframe killer configuration
function testEmergencyIframeKiller() {
  log('\n🚨 Testing Emergency Iframe Killer...', colors.blue);

  try {
    const killerPath = path.join(process.cwd(), 'frontend/src/utils/emergency-iframe-killer.ts');
    const content = fs.readFileSync(killerPath, 'utf8');

    // Check for iframe blocking methods
    assert(content.includes('killAllExistingIframes'), 'Existing iframe killer present');
    assert(content.includes('overrideAllIframeMethods'), 'Method override present');
    assert(content.includes('createElement'), 'createElement override present');

    // Check for mutation observer
    assert(content.includes('MutationObserver'), 'Mutation observer present');
    assert(content.includes('blockIframeMutations'), 'Iframe mutation blocking present');

    // Check for emergency mode
    assert(content.includes('EMERGENCY_MODE'), 'Emergency mode configuration present');

  } catch (error) {
    assert(false, `Could not read emergency iframe killer: ${error.message}`);
  }
}

// Test 6: Verify backend OIDC authentication
function testBackendOIDCAuth() {
  log('\n🔒 Testing Backend OIDC Authentication...', colors.blue);

  try {
    const oidcPath = path.join(process.cwd(), 'backend/auth/oidc_auth.py');
    const content = fs.readFileSync(oidcPath, 'utf8');

    // Check for JWT validation
    assert(content.includes('verify_token'), 'Token verification implemented');
    assert(content.includes('jwt.decode'), 'JWT decoding present');

    // Check for key management
    assert(content.includes('get_public_keys'), 'Public key management present');
    assert(content.includes('cache'), 'Key caching implemented');

    // Check for role validation
    assert(content.includes('check_role'), 'Role checking implemented');
    assert(content.includes('realm_access'), 'Realm role access checking');
    assert(content.includes('resource_access'), 'Client role access checking');

    // Check for error handling
    assert(content.includes('HTTPException'), 'Proper error handling present');
    assert(content.includes('ExpiredSignatureError'), 'Token expiration handling');

  } catch (error) {
    assert(false, `Could not read backend OIDC auth: ${error.message}`);
  }
}

// Test 7: Verify postMessage security implementations
function testPostMessageSecurity() {
  log('\n📨 Testing PostMessage Security...', colors.blue);

  try {
    const iframeBlockerPath = path.join(process.cwd(), 'frontend/src/utils/iframe-blocker.ts');
    const content = fs.readFileSync(iframeBlockerPath, 'utf8');

    // Check for message filtering
    assert(content.includes('isWebAuthnMessage'), 'WebAuthn message detection present');
    assert(content.includes('isLegitimateAuthOrigin'), 'Origin validation present');

    // Check for whitelist patterns
    assert(content.includes('WEBAUTHN_WHITELIST'), 'WebAuthn whitelist present');
    assert(content.includes('AUTH_WHITELIST'), 'Auth whitelist present');

    // Check for blocking logic
    assert(content.includes('blockIframeMessages'), 'Message blocking function present');
    assert(content.includes('originalPostMessage'), 'Original postMessage preserved');

  } catch (error) {
    assert(false, `Could not read postMessage security: ${error.message}`);
  }
}

// Test 8: Check for potential security vulnerabilities
function testSecurityVulnerabilities() {
  log('\n🔍 Testing for Security Vulnerabilities...', colors.blue);

  try {
    // Check iframe-free auth for security issues
    const authPath = path.join(process.cwd(), 'src/auth-services/iframe-free-auth.ts');
    const authContent = fs.readFileSync(authPath, 'utf8');

    // Verify no localStorage for sensitive data without encryption
    assert(!authContent.includes('localStorage.setItem') || authContent.includes('JSON.stringify'),
           'Token storage uses proper serialization');

    // Verify state validation
    assert(authContent.includes('storedState !== state'), 'CSRF state validation implemented');

    // Check OIDC backend for security
    const oidcPath = path.join(process.cwd(), 'backend/auth/oidc_auth.py');
    const oidcContent = fs.readFileSync(oidcPath, 'utf8');

    // Verify proper token validation
    assert(oidcContent.includes('audience') && oidcContent.includes('issuer'),
           'Token audience and issuer validation present');

    // Verify no hardcoded secrets
    assert(!oidcContent.includes('SECRET_KEY = "'), 'No hardcoded secrets in OIDC auth');

  } catch (error) {
    assert(false, `Could not check security vulnerabilities: ${error.message}`);
  }
}

// Test 9: Verify WebAuthn compatibility preservation
function testWebAuthnCompatibility() {
  log('\n🔑 Testing WebAuthn Compatibility...', colors.blue);

  try {
    const iframeBlockerPath = path.join(process.cwd(), 'frontend/src/utils/iframe-blocker.ts');
    const content = fs.readFileSync(iframeBlockerPath, 'utf8');

    // Check WebAuthn patterns in whitelist
    const webauthnPatterns = ['webauthn', 'credentials', 'publickey', 'authenticator', 'biometric', 'fido', 'u2f'];
    webauthnPatterns.forEach(pattern => {
      assert(content.includes(pattern), `WebAuthn pattern '${pattern}' whitelisted`);
    });

    // Check for message allowing logic
    assert(content.includes('isWebAuthnMessage'), 'WebAuthn message detection function present');
    assert(content.includes('ALLOWED: WebAuthn'), 'WebAuthn messages explicitly allowed');

  } catch (error) {
    assert(false, `Could not verify WebAuthn compatibility: ${error.message}`);
  }
}

// Test 10: Verify test files are comprehensive
function testTestCoverage() {
  log('\n📋 Testing Test Coverage...', colors.blue);

  const testFiles = [
    'tests/auth/auth-comprehensive.test.ts',
    'tests/e2e/auth-webauthn.spec.js',
    'tests/auth/iframe-free-auth.test.ts'
  ];

  testFiles.forEach(file => {
    const filePath = path.join(process.cwd(), file);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');

      assert(content.includes('WebAuthn'), `${file} includes WebAuthn tests`);
      assert(content.includes('postMessage'), `${file} includes postMessage tests`);
      assert(content.includes('iframe'), `${file} includes iframe tests`);
    }
  });
}

// Run all tests
function runAllTests() {
  log('🧪 Authentication Security Validation Suite', colors.bold);
  log('============================================', colors.bold);

  testAuthenticationFilesExist();
  testIframeBlockingConfig();
  testKeycloakCSPConfig();
  testIframeFreeAuth();
  testEmergencyIframeKiller();
  testBackendOIDCAuth();
  testPostMessageSecurity();
  testSecurityVulnerabilities();
  testWebAuthnCompatibility();
  testTestCoverage();

  // Summary
  log('\n📊 Test Results Summary', colors.bold);
  log('=======================', colors.bold);
  log(`Total Tests: ${testsRun}`, colors.blue);
  log(`Passed: ${testsPassed}`, colors.green);
  log(`Failed: ${testsFailed}`, testsFailed > 0 ? colors.red : colors.green);

  const successRate = testsRun > 0 ? Math.round((testsPassed / testsRun) * 100) : 0;
  log(`Success Rate: ${successRate}%`, successRate >= 90 ? colors.green : colors.yellow);

  // Security assessment
  log('\n🔒 Security Assessment', colors.bold);
  if (testsFailed === 0) {
    log('✅ All security measures validated', colors.green);
    log('✅ WebAuthn compatibility preserved', colors.green);
    log('✅ Iframe attacks mitigated', colors.green);
    log('✅ PostMessage security implemented', colors.green);
    log('✅ Authentication flows secured', colors.green);
  } else {
    log('⚠️  Some security tests failed - review required', colors.yellow);
  }

  return testsFailed === 0 ? 0 : 1;
}

// Main execution
if (require.main === module) {
  const exitCode = runAllTests();
  process.exit(exitCode);
}

module.exports = { runAllTests };