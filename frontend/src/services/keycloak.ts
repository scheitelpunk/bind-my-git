import Keycloak from 'keycloak-js';

// Keycloak configuration with environment variables
const keycloakConfig = {
  url: import.meta.env.VITE_KEYCLOAK_URL || 'http://localhost:8180',
  realm: import.meta.env.VITE_KEYCLOAK_REALM || 'project-management',
  clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID || 'pm-frontend',
};

// Global variables for token management
let tokenRefreshInterval: NodeJS.Timeout | null = null;

// Create Keycloak instance with enhanced configuration
const keycloak = new Keycloak(keycloakConfig);

// Event handlers for better user experience
keycloak.onTokenExpired = () => {
  console.log('Token expired, attempting refresh...');
  refreshToken();
};

keycloak.onAuthSuccess = () => {
  console.log('Authentication successful');
  setupTokenRefresh();
};

keycloak.onAuthError = (error) => {
  console.error('Authentication error:', error);
};

keycloak.onAuthRefreshSuccess = () => {
  console.log('Token refresh successful');
};

keycloak.onAuthRefreshError = () => {
  console.error('Token refresh failed, redirecting to login');
  keycloak.login();
};

keycloak.onAuthLogout = () => {
  console.log('User logged out');
  cleanupTokenRefresh();
};

// Token refresh management
const setupTokenRefresh = () => {
  cleanupTokenRefresh();

  if (keycloak.authenticated) {
    // Refresh token every 30 seconds if it expires within 60 seconds
    tokenRefreshInterval = setInterval(() => {
      refreshToken();
    }, 30000);
  }
};

const cleanupTokenRefresh = () => {
  if (tokenRefreshInterval) {
    clearInterval(tokenRefreshInterval);
    tokenRefreshInterval = null;
  }
};

const refreshToken = async () => {
  try {
    const refreshed = await keycloak.updateToken(60); // Refresh if expires within 60 seconds
    if (refreshed) {
      console.log('Token refreshed successfully');
      // Notify any listeners that the token was refreshed
      window.dispatchEvent(new CustomEvent('tokenRefreshed', { detail: keycloak.token }));
    }
  } catch (error) {
    console.error('Failed to refresh token:', error);
    // Force logout on refresh failure
    logout();
  }
};

// Prevent iframe creation at the window level
const preventIframeCreation = () => {
  const originalCreateElement = document.createElement;
  document.createElement = function(tagName: string) {
    if (tagName.toLowerCase() === 'iframe') {
      if (import.meta.env.DEV) {
        console.info('Blocked iframe creation from auth adapter');
      }
      // Return a dummy element instead of iframe
      return originalCreateElement.call(this, 'div') as any;
    }
    return originalCreateElement.call(this, tagName);
  };
};

// Allow legitimate Keycloak auth messages while blocking iframe exploitation
const allowLegitimateAuthMessages = () => {
  // Note: The main iframe blocker now handles postMessage filtering
  // This function can be used for additional Keycloak-specific protections
  if (import.meta.env.DEV) {
    console.log('✅ Using secure iframe blocker for auth message filtering');
  }

  // Allow WebAuthn credential events
  window.addEventListener('message', (event) => {
    if (event.data && typeof event.data === 'object') {
      if (event.data.type === 'webauthn' || event.data.credential) {
        if (import.meta.env.DEV) {
          console.log('✅ Allowing WebAuthn credential message');
        }
      }
    }
  });
};

// Enhanced Keycloak initialization with multiple iframe prevention layers
export const initKeycloak = (): Promise<Keycloak> => {
  return new Promise((resolve, reject) => {
    // Apply iframe prevention measures
    preventIframeCreation();
    allowLegitimateAuthMessages();

    const initOptions = {
      onLoad: 'check-sso' as const,
      // Explicitly disable ALL iframe-related features
      silentCheckSsoRedirectUri: undefined,
      silentCheckSsoFallback: false,
      checkLoginIframe: false,
      checkLoginIframeInterval: 0,
      pkceMethod: 'S256' as const,
      enableLogging: import.meta.env.DEV,
      // Force redirect mode to prevent any iframe usage
      responseMode: 'query' as const,
      flow: 'standard' as const,
      // Disable bearer interceptor that might use iframes
      enableBearerInterceptor: false,
      // Reduce timeout for better UX
      messageReceiveTimeout: 1000,
      // Force redirect login for CSP compliance
      redirectUri: window.location.origin,
      // Enable nonce for Keycloak 26+ (required for OIDC security)
      useNonce: true,
    };

    keycloak
      .init(initOptions)
      .then((authenticated) => {
        if (import.meta.env.DEV) {
          console.log(`Keycloak initialized. Authenticated: ${authenticated}`);
        }

        if (authenticated) {
          setupTokenRefresh();
          if (import.meta.env.DEV) {
            console.log('User details:', getUserInfo());
          }
        } else {
          // If not authenticated and not on login page, redirect to login
          const currentPath = window.location.pathname;
          if (currentPath !== '/login' && !currentPath.includes('/auth/callback')) {
            if (import.meta.env.DEV) {
              console.log('User not authenticated, redirecting to login...');
            }
            // Use timeout to prevent immediate redirect loops
            setTimeout(() => {
              if (!isAuthenticated()) {
                login();
              }
            }, 100);
          }
        }

        resolve(keycloak);
      })
      .catch((error) => {
        console.error('Keycloak initialization failed:', error);
        // On initialization failure, try to redirect to login
        if (!window.location.pathname.includes('/login')) {
          if (import.meta.env.DEV) {
            console.log('Initialization failed, redirecting to login...');
          }
          setTimeout(() => login(), 100);
        }
        reject(error);
      });
  });
};

// Alternative initialization method for environments with strict CSP
export const initKeycloakWithRedirect = (): Promise<Keycloak> => {
  return new Promise((resolve, reject) => {
    // Apply additional iframe prevention for redirect mode
    preventIframeCreation();
    allowLegitimateAuthMessages();

    const initOptions = {
      // Use login-required for stricter environments - forces redirect
      onLoad: 'login-required' as const,
      // Explicitly disable ALL iframe features
      checkLoginIframe: false,
      checkLoginIframeInterval: 0,
      silentCheckSsoRedirectUri: undefined,
      silentCheckSsoFallback: false,
      pkceMethod: 'S256' as const,
      responseMode: 'query' as const,
      flow: 'standard' as const,
      enableLogging: import.meta.env.DEV,
      enableBearerInterceptor: false,
      redirectUri: window.location.origin,
      // Enable nonce for Keycloak 26+ (required for OIDC security)
      useNonce: true,
    };

    keycloak
      .init(initOptions)
      .then((authenticated) => {
        if (import.meta.env.DEV) {
          console.log(`Keycloak (redirect mode) initialized. Authenticated: ${authenticated}`);
        }

        if (authenticated) {
          setupTokenRefresh();
          if (import.meta.env.DEV) {
            console.log('User details:', getUserInfo());
          }
        }

        resolve(keycloak);
      })
      .catch((error) => {
        console.error('Keycloak (redirect mode) initialization failed:', error);
        reject(error);
      });
  });
};

// CSP-safe initialization that completely avoids iframe usage
export const initKeycloakCSPSafe = (): Promise<Keycloak> => {
  return new Promise((resolve, reject) => {
    // Apply comprehensive iframe prevention
    preventIframeCreation();
    allowLegitimateAuthMessages();

    // Block any attempt to access iframe-related properties
    Object.defineProperty(window, 'frames', {
      get: () => {
        console.warn('Blocked access to window.frames');
        return [];
      },
      configurable: false
    });

    const initOptions = {
      // Use check-sso but with all iframe features disabled
      onLoad: 'check-sso' as const,
      // Comprehensive iframe disabling
      checkLoginIframe: false,
      checkLoginIframeInterval: 0,
      silentCheckSsoRedirectUri: undefined,
      silentCheckSsoFallback: false,
      // Force standard redirect flow
      pkceMethod: 'S256' as const,
      responseMode: 'query' as const,
      flow: 'standard' as const,
      enableLogging: import.meta.env.DEV,
      enableBearerInterceptor: false,
      redirectUri: window.location.origin,
      // Minimal timeout to prevent hanging
      messageReceiveTimeout: 500,
      // Enable nonce for Keycloak 26+ (required for OIDC security)
      useNonce: true,
    };

    if (import.meta.env.DEV) {
      console.log('Initializing Keycloak with CSP-safe configuration:', initOptions);
    }

    keycloak
      .init(initOptions)
      .then((authenticated) => {
        if (import.meta.env.DEV) {
          console.log(`Keycloak CSP-safe initialization completed. Authenticated: ${authenticated}`);
        }

        if (authenticated) {
          setupTokenRefresh();
          if (import.meta.env.DEV) {
            console.log('User details:', getUserInfo());
          }
        }

        resolve(keycloak);
      })
      .catch((error) => {
        console.error('Keycloak CSP-safe initialization failed:', error);
        reject(error);
      });
  });
};

// Smart initialization that uses the most CSP-compliant approach
export const initKeycloakSmart = async (): Promise<Keycloak> => {
  try {
    // Always use CSP-safe mode first
    return await initKeycloakCSPSafe();
  } catch (error) {
    console.warn('CSP-safe Keycloak initialization failed, trying redirect mode:', error);
    try {
      // Fall back to redirect-only mode
      return await initKeycloakWithRedirect();
    } catch (fallbackError) {
      console.error('All Keycloak initialization methods failed:', fallbackError);
      // As last resort, try basic initialization
      try {
        return await initKeycloak();
      } catch (finalError) {
        console.error('Final Keycloak initialization attempt failed:', finalError);
        throw finalError;
      }
    }
  }
};

// Enhanced role checking
export const hasRole = (role: string): boolean => {
  if (!keycloak.authenticated || !keycloak.tokenParsed) {
    return false;
  }

  return keycloak.hasRealmRole(role) || keycloak.hasResourceRole(role, keycloakConfig.clientId);
};

// Check if user has any of the roles
export const hasAnyRole = (roles: string[]): boolean => {
  return roles.some(role => hasRole(role));
};

// Check if user has all of the roles
export const hasAllRoles = (roles: string[]): boolean => {
  return roles.every(role => hasRole(role));
};

// Get user roles with enhanced details
export const getUserRoles = (): string[] => {
  if (!keycloak.authenticated || !keycloak.tokenParsed) {
    return [];
  }

  const realmRoles = keycloak.realmAccess?.roles || [];
  const clientRoles = keycloak.resourceAccess?.[keycloakConfig.clientId]?.roles || [];
  return [...new Set([...realmRoles, ...clientRoles])];
};

// Get all resource access information
export const getResourceAccess = () => {
  return keycloak.resourceAccess || {};
};

// Get user groups
export const getUserGroups = (): string[] => {
  return keycloak.tokenParsed?.groups || [];
};

// Get comprehensive user info
export const getUserInfo = () => {
  if (!keycloak.authenticated || !keycloak.tokenParsed) {
    return null;
  }

  return {
    id: keycloak.subject,
    username: keycloak.tokenParsed.preferred_username,
    email: keycloak.tokenParsed.email,
    emailVerified: keycloak.tokenParsed.email_verified,
    firstName: keycloak.tokenParsed.given_name,
    lastName: keycloak.tokenParsed.family_name,
    name: keycloak.tokenParsed.name,
    roles: getUserRoles(),
    groups: getUserGroups(),
    sessionState: keycloak.tokenParsed.session_state,
    issuedAt: keycloak.tokenParsed.iat,
    expiresAt: keycloak.tokenParsed.exp,
    realm: keycloak.realm,
    resourceAccess: getResourceAccess(),
  };
};

// Token management
export const getToken = (): string | undefined => {
  return keycloak.token;
};

export const getRefreshToken = (): string | undefined => {
  return keycloak.refreshToken;
};

export const getIdToken = (): string | undefined => {
  return keycloak.idToken;
};

// Enhanced authentication methods with CSP-safe options
export const login = (options?: any) => {
  const loginOptions = {
    redirectUri: window.location.origin,
    // Use standard redirect flow to avoid iframe issues
    prompt: 'login',
    ...options
  };

  if (import.meta.env.DEV) {
    console.log('Initiating login with options:', loginOptions);
  }
  return keycloak.login(loginOptions);
};

// Login with explicit redirect (CSP-safe)
export const loginWithRedirect = (redirectPath?: string) => {
  const redirectUri = redirectPath
    ? `${window.location.origin}${redirectPath}`
    : window.location.origin;

  const loginOptions = {
    redirectUri,
    prompt: 'login',
  };

  if (import.meta.env.DEV) {
    console.log('Initiating redirect login to:', redirectUri);
  }
  return keycloak.login(loginOptions);
};

export const logout = (options?: any) => {
  cleanupTokenRefresh();

  const logoutOptions = {
    redirectUri: window.location.origin,
    ...options
  };

  return keycloak.logout(logoutOptions);
};

export const register = (options?: any) => {
  const registerOptions = {
    redirectUri: window.location.origin,
    ...options
  };

  return keycloak.register(registerOptions);
};

// Authentication status
export const isAuthenticated = (): boolean => {
  return keycloak.authenticated || false;
};

export const isTokenExpired = (): boolean => {
  return !keycloak.authenticated || keycloak.isTokenExpired();
};

// Account management
export const accountManagement = () => {
  return keycloak.accountManagement();
};

// Force token refresh
export const forceRefreshToken = () => {
  return refreshToken();
};

// Utility functions
export const getTimeUntilExpiry = (): number => {
  if (!keycloak.tokenParsed?.exp) {
    return 0;
  }

  const now = Math.floor(Date.now() / 1000);
  return Math.max(0, keycloak.tokenParsed.exp - now);
};

export const isTokenExpiringSoon = (thresholdSeconds: number = 60): boolean => {
  return getTimeUntilExpiry() <= thresholdSeconds;
};

// Restore original browser functions when cleaning up
const restoreBrowserFunctions = () => {
  // Restore original createElement if we modified it
  if (document.createElement !== Element.prototype.createElement) {
    try {
      // This is a simplified restoration - in production you'd want to store the original
      document.createElement = Element.prototype.createElement;
    } catch (e) {
      console.warn('Could not restore original createElement:', e);
    }
  }
};

// Cleanup function for when component unmounts
export const cleanup = () => {
  cleanupTokenRefresh();
  restoreBrowserFunctions();
};

// Export a function to manually prevent iframe creation
export const forceDisableIframes = () => {
  preventIframeCreation();
  allowLegitimateAuthMessages();
};

// Export keycloak instance and configuration
export { keycloak, keycloakConfig };
export default keycloak;