/**
 * NUCLEAR AUTHENTICATION CONFIGURATION
 * Forces redirect-only authentication, disables all iframe/embedded flows
 */

export const NUCLEAR_AUTH_CONFIG = {
  // Force redirect flow - NO iframes allowed
  onLoad: 'login-required',
  flow: 'standard',
  responseMode: 'fragment',

  // Disable all iframe-based features
  checkLoginIframe: false,
  silentCheckSsoRedirectUri: undefined,
  enableLogging: import.meta.env.VITE_DEBUG === 'true',

  // Force full page redirects
  redirectUri: `${window.location.origin}/`,
  postLogoutRedirectUri: `${window.location.origin}/`,

  // Disable embedded features
  adapter: undefined, // No custom adapters

  // Nuclear security options
  pkceMethod: 'S256', // Force PKCE
  scope: 'openid profile email',

  // Iframe prevention
  messageReceiveTimeout: 0, // Disable message waiting
  silentCheckSsoFallback: false, // No fallback to iframe

  // Custom init with iframe blocking
  init: {
    onLoad: 'login-required',
    checkLoginIframe: false,
    silentCheckSsoRedirectUri: undefined,
    enableLogging: import.meta.env.VITE_DEBUG === 'true',
    adapter: 'nuclear-redirect', // Custom identifier
    flow: 'standard',
    responseMode: 'fragment',
    redirectUri: `${window.location.origin}/`,
    postLogoutRedirectUri: `${window.location.origin}/`,
    pkceMethod: 'S256'
  }
};

/**
 * NUCLEAR: Override Keycloak configuration to prevent iframe usage
 */
export const overrideKeycloakConfig = (keycloak: any) => {
  if (!keycloak) return;

  // Override iframe-related methods
  keycloak.checkLoginIframe = false;
  keycloak.silentCheckSsoRedirectUri = undefined;

  // Replace iframe methods with redirect alternatives
  if (keycloak.updateToken) {
    const originalUpdateToken = keycloak.updateToken;
    keycloak.updateToken = function(minValidity?: number) {
      console.error('🛡️ NUCLEAR: Token update redirected to login');
      return keycloak.login();
    };
  }

  if (keycloak.checkSso) {
    keycloak.checkSso = function() {
      console.error('🛡️ NUCLEAR: SSO check redirected to login');
      return keycloak.login();
    };
  }

  console.log('🛡️ NUCLEAR: Keycloak configured for redirect-only mode');
  return keycloak;
};

/**
 * NUCLEAR: Block any attempt to create Keycloak with iframe support
 */
export const createNuclearKeycloak = (config: any) => {
  // Force nuclear configuration
  const nuclearConfig = {
    ...config,
    ...NUCLEAR_AUTH_CONFIG
  };

  console.error('🛡️ NUCLEAR: Creating iframe-free Keycloak instance');
  console.error('🛡️ Nuclear config:', nuclearConfig);

  return nuclearConfig;
};

/**
 * NUCLEAR: Monitor and block auth-related iframe attempts
 */
export const monitorAuthIframes = () => {
  // Monitor for auth-related iframe creation attempts
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const element = node as Element;
          if (element.tagName?.toLowerCase() === 'iframe') {
            const src = element.getAttribute('src') || '';
            if (src.includes('auth') || src.includes('keycloak') ||
                src.includes('8180') || src.includes('8181') ||
                src.includes('sso') || src.includes('silent')) {
              console.error('🛡️ NUCLEAR: Destroyed auth iframe:', src);
              element.remove();

              // Force redirect to login instead
              if (window.location.pathname !== '/login') {
                window.location.href = '/login';
              }
            }
          }
        }
      });
    });
  });

  if (document.body) {
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  return observer;
};

// Auto-start monitoring
if (typeof window !== 'undefined') {
  monitorAuthIframes();
}