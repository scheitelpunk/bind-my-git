#!/bin/sh

# Generate env-config.js with runtime environment variables
cat <<EOF > /usr/share/nginx/html/env-config.js
window._env_ = {
  VITE_API_URL: "${VITE_API_URL:-http://localhost:8080/api}",
  VITE_KEYCLOAK_URL: "${VITE_KEYCLOAK_URL:-http://localhost:8180}",
  VITE_KEYCLOAK_REALM: "${VITE_KEYCLOAK_REALM:-project-management}",
  VITE_KEYCLOAK_CLIENT_ID: "${VITE_KEYCLOAK_CLIENT_ID:-project-management-frontend}"
};
EOF

# Execute the original command
exec "$@"
