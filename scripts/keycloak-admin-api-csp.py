#!/usr/bin/env python3
"""
Keycloak Administration API CSP Configuration Script
Sets CSP headers via Keycloak Admin REST API as alternative to environment variables
"""

import requests
import json
import sys
import time
from typing import Dict, Any

class KeycloakAdminAPI:
    def __init__(self, base_url: str = "http://localhost:8180", admin_user: str = "admin", admin_password: str = "admin123"):
        self.base_url = base_url.rstrip('/')
        self.admin_user = admin_user
        self.admin_password = admin_password
        self.access_token = None
        self.realm_name = "project-management"

    def get_admin_token(self) -> bool:
        """Get admin access token for API calls"""
        try:
            token_url = f"{self.base_url}/realms/master/protocol/openid-connect/token"

            data = {
                'grant_type': 'password',
                'client_id': 'admin-cli',
                'username': self.admin_user,
                'password': self.admin_password
            }

            response = requests.post(token_url, data=data, timeout=30)
            response.raise_for_status()

            token_data = response.json()
            self.access_token = token_data.get('access_token')

            if self.access_token:
                print("✅ Successfully obtained admin access token")
                return True
            else:
                print("❌ Failed to get access token from response")
                return False

        except requests.exceptions.RequestException as e:
            print(f"❌ Error getting admin token: {e}")
            return False

    def get_headers(self) -> Dict[str, str]:
        """Get headers with authorization token"""
        return {
            'Authorization': f'Bearer {self.access_token}',
            'Content-Type': 'application/json'
        }

    def get_realm_config(self) -> Dict[str, Any]:
        """Get current realm configuration"""
        try:
            url = f"{self.base_url}/admin/realms/{self.realm_name}"
            response = requests.get(url, headers=self.get_headers(), timeout=30)
            response.raise_for_status()

            print("✅ Successfully retrieved realm configuration")
            return response.json()

        except requests.exceptions.RequestException as e:
            print(f"❌ Error getting realm config: {e}")
            return {}

    def update_realm_security_headers(self) -> bool:
        """Update realm with proper CSP security headers"""
        try:
            # Get current realm configuration
            realm_config = self.get_realm_config()
            if not realm_config:
                return False

            # Define new security headers with proper CSP
            new_security_headers = {
                "contentSecurityPolicy": "frame-ancestors 'self' http://localhost:3000 https://localhost:3000; frame-src 'self'; object-src 'none'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';",
                "xFrameOptions": "SAMEORIGIN",
                "xContentTypeOptions": "nosniff",
                "xXSSProtection": "1; mode=block",
                "referrerPolicy": "strict-origin-when-cross-origin",
                "strictTransportSecurity": "max-age=31536000; includeSubDomains"
            }

            # Update the realm configuration
            realm_config["browserSecurityHeaders"] = new_security_headers

            # Make the update request
            url = f"{self.base_url}/admin/realms/{self.realm_name}"
            response = requests.put(url, headers=self.get_headers(), json=realm_config, timeout=30)
            response.raise_for_status()

            print("✅ Successfully updated realm security headers via Admin API")
            print(f"🔧 Applied CSP: {new_security_headers['contentSecurityPolicy']}")
            return True

        except requests.exceptions.RequestException as e:
            print(f"❌ Error updating realm security headers: {e}")
            return False

    def verify_security_headers(self) -> bool:
        """Verify that security headers are properly set"""
        try:
            # Test the auth endpoint directly
            auth_url = f"{self.base_url}/realms/{self.realm_name}/protocol/openid-connect/auth"
            response = requests.head(auth_url, timeout=30, allow_redirects=True)

            headers_to_check = [
                'Content-Security-Policy',
                'X-Frame-Options',
                'X-Content-Type-Options',
                'X-XSS-Protection'
            ]

            print("\n🔍 Verifying security headers:")
            success = True

            for header in headers_to_check:
                value = response.headers.get(header, 'Not Set')
                print(f"  {header}: {value}")

                if header == 'Content-Security-Policy' and 'localhost:3000' not in value:
                    print(f"  ⚠️  CSP doesn't include localhost:3000")
                    success = False

            return success

        except requests.exceptions.RequestException as e:
            print(f"❌ Error verifying headers: {e}")
            return False

def wait_for_keycloak(max_attempts: int = 30) -> bool:
    """Wait for Keycloak to be ready"""
    print("⏳ Waiting for Keycloak to be ready...")

    for attempt in range(max_attempts):
        try:
            response = requests.get("http://localhost:8180/health/ready", timeout=5)
            if response.status_code == 200:
                print("✅ Keycloak is ready")
                return True
        except:
            pass

        print(f"  Attempt {attempt + 1}/{max_attempts} - waiting...")
        time.sleep(2)

    print("❌ Keycloak didn't become ready in time")
    return False

def main():
    """Main execution function"""
    print("🚀 Keycloak CSP Configuration via Admin API")
    print("=" * 50)

    # Wait for Keycloak to be ready
    if not wait_for_keycloak():
        sys.exit(1)

    # Initialize API client
    api = KeycloakAdminAPI()

    # Get admin token
    if not api.get_admin_token():
        print("❌ Failed to authenticate with Keycloak admin")
        sys.exit(1)

    # Update security headers
    if not api.update_realm_security_headers():
        print("❌ Failed to update security headers")
        sys.exit(1)

    # Wait a moment for changes to take effect
    print("⏳ Waiting for changes to take effect...")
    time.sleep(3)

    # Verify the changes
    if api.verify_security_headers():
        print("\n✅ CSP configuration completed successfully!")
        print("🎯 Frontend at localhost:3000 should now be able to embed Keycloak iframes")
    else:
        print("\n⚠️  Configuration applied but verification failed")
        print("   Try restarting Keycloak services")

    print("\n📋 Next steps:")
    print("  1. Test iframe embedding from your frontend")
    print("  2. Check browser console for CSP errors")
    print("  3. If issues persist, try the nginx proxy solution")

if __name__ == "__main__":
    main()