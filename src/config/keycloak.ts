/**
 * Keycloak configuration for OIDC authentication
 *
 * @deprecated Use services/keycloak.ts instead for CSP-compliant implementation
 */

import Keycloak from 'keycloak-js';

// Keycloak configuration with Vite environment variables
const keycloakConfig = {
  url: import.meta.env.VITE_KEYCLOAK_URL || 'http://localhost:8180',
  realm: import.meta.env.VITE_KEYCLOAK_REALM || 'project-management',
  clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID || 'pm-frontend',
};

// Initialize Keycloak instance
const keycloak = new Keycloak(keycloakConfig);

// CSP-compliant Keycloak initialization options
export const keycloakInitOptions = {
  onLoad: 'check-sso' as const,
  checkLoginIframe: false,
  checkLoginIframeInterval: 0,
  pkceMethod: 'S256' as const,
  responseMode: 'query' as const,
  enableBearerInterceptor: false,
  // Enable nonce for Keycloak 26+ (required for OIDC security)
  useNonce: true,
};

export { keycloakConfig };
export default keycloak;