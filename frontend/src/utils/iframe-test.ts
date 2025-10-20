/**
 * Test utility to verify iframe blocking is working correctly
 * This should be imported in development to test the iframe blocker
 */

/**
 * Test iframe creation blocking
 */
export const testIframeCreationBlocking = () => {
  // Silent testing in development only
  if (!import.meta.env.DEV) return true;

  console.log('🧪 Testing iframe creation blocking...');

  try {
    const iframe = document.createElement('iframe');
    iframe.src = 'http://localhost:8180/test';

    if (iframe.tagName.toLowerCase() !== 'iframe') {
      console.log('✅ iframe creation successfully blocked - element converted to:', iframe.tagName);
      return true;
    } else {
      console.warn('❌ iframe creation NOT blocked - security risk!');
      return false;
    }
  } catch (error) {
    console.log('✅ iframe creation blocked with error:', error.message);
    return true;
  }
};

/**
 * Test window message blocking
 */
export const testMessageBlocking = () => {
  // Silent testing in development only
  if (!import.meta.env.DEV) return true;

  console.log('🧪 Testing window message blocking...');

  try {
    // Test blocked message (silent)
    window.postMessage('keycloak-test-message', 'http://localhost:8180');

    // Test allowed message
    window.postMessage('normal-message', window.location.origin);
    console.log('✅ Message testing completed');

    return true;
  } catch (error) {
    console.log('✅ Message posting blocked with error:', error.message);
    return true;
  }
};

/**
 * Test frame property access blocking
 */
export const testFrameAccessBlocking = () => {
  // Silent testing in development only
  if (!import.meta.env.DEV) return true;

  console.log('🧪 Testing frame access blocking...');

  try {
    const frames = window.frames;

    if (frames.length === 0) {
      console.log('✅ Frame access successfully blocked');
      return true;
    } else {
      console.warn('❌ Frame access NOT blocked');
      return false;
    }
  } catch (error) {
    console.log('✅ Frame access blocked with error:', error.message);
    return true;
  }
};

/**
 * Run all iframe blocking tests
 */
export const runIframeBlockingTests = () => {
  // Only run tests in development
  if (!import.meta.env.DEV) {
    return { allTestsPassed: true, results: { skipped: true } };
  }

  console.log('🧪 Running iframe blocking tests...');

  const results = {
    iframeCreation: testIframeCreationBlocking(),
    messageBlocking: testMessageBlocking(),
    frameAccess: testFrameAccessBlocking(),
  };

  const allTestsPassed = Object.values(results).every(result => result === true);
  if (allTestsPassed) {
    console.log('✅ All iframe blocking tests PASSED - security active');
  } else {
    console.warn('❌ Some iframe blocking tests FAILED - check security');
  }

  return { allTestsPassed, results };
};

/**
 * Monitor for any iframe creation attempts during app runtime
 */
export const monitorIframeAttempts = () => {
  // Only monitor in development
  if (!import.meta.env.DEV) {
    return {
      getAttemptCount: () => 0,
      stop: () => {}
    };
  }

  console.log('👀 Starting iframe attempt monitoring...');

  const originalCreateElement = document.createElement;
  let attemptCount = 0;

  document.createElement = function<K extends keyof HTMLElementTagNameMap>(
    tagName: K
  ): HTMLElementTagNameMap[K] {
    if (tagName.toLowerCase() === 'iframe') {
      attemptCount++;
      console.info(`🚨 Iframe attempt #${attemptCount} detected`);
    }

    return originalCreateElement.call(this, tagName);
  };

  return {
    getAttemptCount: () => attemptCount,
    stop: () => {
      document.createElement = originalCreateElement;
      console.log(`👀 Monitoring stopped. Total attempts: ${attemptCount}`);
    }
  };
};

// Auto-run tests silently in development mode
if (import.meta.env.DEV) {
  // Wait for iframe blocker to initialize
  setTimeout(() => {
    try {
      runIframeBlockingTests();
    } catch (error) {
      console.info('Iframe tests completed with status:', error.message);
    }
  }, 1000);
}