/**
 * Iframe-Free Keycloak Service
 * Wrapper around the iframe-free authentication service for Keycloak integration
 */

import { IframeFreeAuth, AuthConfig } from '../../../src/auth-services/iframe-free-auth';
import { createTokenInterceptor, enableGlobalAuthentication } from '../../../src/auth-utils/token-interceptor';

// Keycloak configuration from environment variables
const getKeycloakConfig = (): AuthConfig => ({
  keycloakUrl: import.meta.env.VITE_KEYCLOAK_URL || 'http://localhost:8180',
  realm: import.meta.env.VITE_KEYCLOAK_REALM || 'project-management',
  clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID || 'pm-frontend',
  redirectUri: window.location.origin,
  postLogoutRedirectUri: window.location.origin,
  scope: 'openid profile email roles',
  responseType: 'code',
  pkceMethod: 'S256',
});

// Global instance
let authInstance: IframeFreeAuth | null = null;
let interceptorInstance: any = null;

/**
 * Get or create the global authentication instance
 */
export const getAuthInstance = (): IframeFreeAuth => {
  if (!authInstance) {
    authInstance = new IframeFreeAuth(getKeycloakConfig());
    
    // Set up HTTP interceptor for automatic token management
    interceptorInstance = createTokenInterceptor({
      auth: authInstance,
      excludeUrls: [
        '/auth/*',
        '/realms/*',
        '*/protocol/openid-connect/*',
        '*/userinfo',
        '*/token',
        '*/logout'
      ],
      tokenRefreshThreshold: 60, // Refresh 1 minute before expiry
      maxRetries: 1
    });
    
    // Enable global fetch interception for seamless token management
    enableGlobalAuthentication({
      auth: authInstance,
      excludeUrls: [
        '/auth/*',
        '/realms/*',
        '*/protocol/openid-connect/*'
      ]
    });
  }
  return authInstance;
};

/**
 * Initialize the authentication system
 */
export const initAuth = async (): Promise<boolean> => {
  const auth = getAuthInstance();
  return await auth.init();
};

/**
 * Login with optional parameters
 */
export const login = async (options?: { prompt?: string; loginHint?: string }): Promise<void> => {
  const auth = getAuthInstance();
  return await auth.login(options);
};

/**
 * Logout and redirect to Keycloak
 */
export const logout = async (): Promise<void> => {
  const auth = getAuthInstance();
  return await auth.logout();
};

/**
 * Check if user is authenticated
 */
export const isAuthenticated = (): boolean => {
  const auth = getAuthInstance();
  return auth.isAuthenticated();
};

/**
 * Get access token
 */
export const getAccessToken = (): string | null => {
  const auth = getAuthInstance();
  return auth.getAccessToken();
};

/**
 * Get user information
 */
export const getUserInfo = () => {
  const auth = getAuthInstance();
  return auth.getUserInfo();
};

/**
 * Check if user has specific role
 */
export const hasRole = (role: string): boolean => {
  const auth = getAuthInstance();
  return auth.hasRole(role);
};

/**
 * Check if user has any of the specified roles
 */
export const hasAnyRole = (roles: string[]): boolean => {
  return roles.some(role => hasRole(role));
};

/**
 * Check if user has all of the specified roles
 */
export const hasAllRoles = (roles: string[]): boolean => {
  return roles.every(role => hasRole(role));
};

/**
 * Manually refresh the access token
 */
export const refreshToken = async (): Promise<boolean> => {
  const auth = getAuthInstance();
  return await auth.refreshToken();
};

/**
 * Get HTTP interceptor instance for manual use
 */
export const getHttpInterceptor = () => {
  return interceptorInstance;
};

/**
 * Create an authenticated fetch function
 */
export const createAuthenticatedFetch = () => {
  if (!interceptorInstance) {
    getAuthInstance(); // This will create the interceptor
  }
  return interceptorInstance?.createAuthenticatedFetch() || fetch;
};

/**
 * Utility function to make authenticated API calls
 */
export const apiCall = async <T = any>(
  url: string,
  options: RequestInit = {}
): Promise<T> => {
  if (!interceptorInstance) {
    getAuthInstance(); // This will create the interceptor
  }
  
  const response = await interceptorInstance.fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });
  
  if (!response.ok) {
    throw new Error(`API call failed: ${response.status} ${response.statusText}`);
  }
  
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return await response.json();
  }
  
  return await response.text() as unknown as T;
};

/**
 * Setup event listeners for authentication events
 */
export const setupAuthEventListeners = () => {
  const auth = getAuthInstance();
  
  auth.on('authenticated', (userInfo) => {
    console.log('User authenticated:', userInfo);
    // Dispatch custom event for other parts of the app
    window.dispatchEvent(new CustomEvent('auth:authenticated', { detail: userInfo }));
  });
  
  auth.on('unauthenticated', () => {
    console.log('User unauthenticated');
    window.dispatchEvent(new CustomEvent('auth:unauthenticated'));
  });
  
  auth.on('tokenRefreshed', (tokenSet) => {
    console.log('Token refreshed');
    window.dispatchEvent(new CustomEvent('auth:tokenRefreshed', { detail: tokenSet }));
  });
  
  auth.on('logout', () => {
    console.log('User logged out');
    window.dispatchEvent(new CustomEvent('auth:logout'));
  });
  
  auth.on('error', (error) => {
    console.error('Auth error:', error);
    window.dispatchEvent(new CustomEvent('auth:error', { detail: error }));
  });
};

/**
 * Cleanup authentication instance and interceptors
 */
export const cleanupAuth = () => {
  if (authInstance) {
    authInstance.removeAllListeners();
    authInstance = null;
  }
  
  if (interceptorInstance) {
    interceptorInstance = null;
  }
  
  // Restore original fetch if it was replaced
  if ((window as any).restoreOriginalFetch) {
    (window as any).restoreOriginalFetch();
  }
};

// Export the auth instance getter for advanced usage
export { getAuthInstance as getAuth };
export default {
  initAuth,
  login,
  logout,
  isAuthenticated,
  getAccessToken,
  getUserInfo,
  hasRole,
  hasAnyRole,
  hasAllRoles,
  refreshToken,
  apiCall,
  setupAuthEventListeners,
  cleanupAuth,
};
