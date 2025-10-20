#!/usr/bin/env node

/**
 * Simple Keycloak Authentication Flow Testing Script
 *
 * Tests basic connectivity and configuration without browser automation
 */

const axios = require('axios');

class SimpleAuthTester {
    constructor() {
        this.baseUrl = 'http://localhost:3000';
        this.keycloakUrl = 'http://localhost:8180';
        this.apiUrl = 'http://localhost:8000';
    }

    async runTests() {
        console.log('🚀 Starting Simple Authentication Flow Tests\n');

        const results = {
            frontend: await this.testFrontend(),
            keycloak: await this.testKeycloak(),
            api: await this.testAPI(),
            keycloakConfig: await this.testKeycloakConfig(),
            wellKnown: await this.testWellKnownEndpoints()
        };

        this.generateReport(results);
        return results;
    }

    async testFrontend() {
        console.log('📱 Testing Frontend Service...');
        try {
            const response = await axios.get(this.baseUrl, { timeout: 5000 });
            const hasReactRoot = response.data.includes('id="root"');
            const hasVite = response.data.includes('vite');

            console.log('  ✅ Frontend accessible');
            return {
                accessible: true,
                status: response.status,
                hasReactRoot,
                hasVite,
                contentType: response.headers['content-type']
            };
        } catch (error) {
            console.log('  ❌ Frontend not accessible:', error.message);
            return {
                accessible: false,
                error: error.message
            };
        }
    }

    async testKeycloak() {
        console.log('🔐 Testing Keycloak Service...');
        try {
            const response = await axios.get(`${this.keycloakUrl}/realms/master`, { timeout: 5000 });

            console.log('  ✅ Keycloak accessible');
            return {
                accessible: true,
                status: response.status,
                realm: response.data.realm,
                tokenService: response.data['token-service'],
                accountService: response.data['account-service']
            };
        } catch (error) {
            console.log('  ❌ Keycloak not accessible:', error.message);
            return {
                accessible: false,
                error: error.message
            };
        }
    }

    async testAPI() {
        console.log('🔧 Testing API Service...');
        try {
            const response = await axios.get(`${this.apiUrl}/health`, { timeout: 5000 });
            console.log('  ✅ API accessible');
            return {
                accessible: true,
                status: response.status,
                health: response.data
            };
        } catch (error) {
            console.log('  ❌ API not accessible:', error.message);
            return {
                accessible: false,
                error: error.message
            };
        }
    }

    async testKeycloakConfig() {
        console.log('⚙️ Testing Keycloak Configuration...');
        try {
            // Check admin console
            const adminResponse = await axios.get(`${this.keycloakUrl}/admin/master/console/`, {
                timeout: 5000,
                maxRedirects: 0,
                validateStatus: () => true
            });

            // Check if our realm exists (try projectflow realm)
            let realmResponse;
            try {
                realmResponse = await axios.get(`${this.keycloakUrl}/realms/projectflow`, { timeout: 5000 });
            } catch (realmError) {
                // Realm might not exist yet, that's ok
                realmResponse = { status: 404, data: { error: 'realm not found' } };
            }

            console.log('  ✅ Keycloak configuration checked');
            return {
                adminConsole: {
                    status: adminResponse.status,
                    accessible: adminResponse.status < 400
                },
                projectflowRealm: {
                    status: realmResponse.status,
                    exists: realmResponse.status === 200,
                    data: realmResponse.data
                }
            };
        } catch (error) {
            console.log('  ❌ Keycloak configuration check failed:', error.message);
            return {
                error: error.message
            };
        }
    }

    async testWellKnownEndpoints() {
        console.log('🔍 Testing Well-Known Endpoints...');
        const endpoints = [
            '/realms/master/.well-known/openid_configuration',
            '/realms/projectflow/.well-known/openid_configuration'
        ];

        const results = {};

        for (const endpoint of endpoints) {
            try {
                const response = await axios.get(`${this.keycloakUrl}${endpoint}`, { timeout: 5000 });
                const realmName = endpoint.includes('master') ? 'master' : 'projectflow';
                results[realmName] = {
                    accessible: true,
                    status: response.status,
                    issuer: response.data.issuer,
                    authorizationEndpoint: response.data.authorization_endpoint,
                    tokenEndpoint: response.data.token_endpoint,
                    userInfoEndpoint: response.data.userinfo_endpoint,
                    endSessionEndpoint: response.data.end_session_endpoint
                };
                console.log(`  ✅ ${realmName} realm well-known endpoint accessible`);
            } catch (error) {
                const realmName = endpoint.includes('master') ? 'master' : 'projectflow';
                results[realmName] = {
                    accessible: false,
                    error: error.message
                };
                console.log(`  ❌ ${realmName} realm well-known endpoint not accessible`);
            }
        }

        return results;
    }

    generateReport(results) {
        console.log('\n📋 AUTHENTICATION SERVICES TEST REPORT');
        console.log('========================================\n');

        // Service Status Summary
        console.log('🟢 SERVICE STATUS SUMMARY:');
        console.log(`  Frontend (React):     ${results.frontend.accessible ? '✅ UP' : '❌ DOWN'}`);
        console.log(`  Keycloak:            ${results.keycloak.accessible ? '✅ UP' : '❌ DOWN'}`);
        console.log(`  API Backend:         ${results.api.accessible ? '✅ UP' : '❌ DOWN'}`);

        // Detailed Frontend Info
        if (results.frontend.accessible) {
            console.log('\n🌐 FRONTEND DETAILS:');
            console.log(`  URL: ${this.baseUrl}`);
            console.log(`  Status: ${results.frontend.status}`);
            console.log(`  React Root: ${results.frontend.hasReactRoot ? '✅' : '❌'}`);
            console.log(`  Vite Build: ${results.frontend.hasVite ? '✅' : '❌'}`);
        }

        // Detailed Keycloak Info
        if (results.keycloak.accessible) {
            console.log('\n🔐 KEYCLOAK DETAILS:');
            console.log(`  URL: ${this.keycloakUrl}`);
            console.log(`  Status: ${results.keycloak.status}`);
            console.log(`  Master Realm: ${results.keycloak.realm}`);
            console.log(`  Token Service: ${results.keycloak.tokenService}`);

            if (results.keycloakConfig.adminConsole) {
                console.log(`  Admin Console: ${results.keycloakConfig.adminConsole.accessible ? '✅' : '❌'}`);
            }

            if (results.keycloakConfig.projectflowRealm) {
                console.log(`  ProjectFlow Realm: ${results.keycloakConfig.projectflowRealm.exists ? '✅ EXISTS' : '⚠️ NOT FOUND'}`);
            }
        }

        // Well-Known Endpoints
        console.log('\n🔍 OPENID CONNECT ENDPOINTS:');
        if (results.wellKnown.master?.accessible) {
            console.log('  Master Realm:');
            console.log(`    Issuer: ${results.wellKnown.master.issuer}`);
            console.log(`    Auth Endpoint: ${results.wellKnown.master.authorizationEndpoint}`);
            console.log(`    Token Endpoint: ${results.wellKnown.master.tokenEndpoint}`);
        }

        if (results.wellKnown.projectflow?.accessible) {
            console.log('  ProjectFlow Realm:');
            console.log(`    Issuer: ${results.wellKnown.projectflow.issuer}`);
            console.log(`    Auth Endpoint: ${results.wellKnown.projectflow.authorizationEndpoint}`);
            console.log(`    Token Endpoint: ${results.wellKnown.projectflow.tokenEndpoint}`);
        } else {
            console.log('  ProjectFlow Realm: ⚠️ Not configured yet');
        }

        // Recommendations
        console.log('\n💡 MANUAL TESTING STEPS:');
        console.log('  1. Open browser and navigate to: http://localhost:3000');
        console.log('  2. Open browser dev tools (F12) and check Console tab');
        console.log('  3. Look for login/authentication buttons');
        console.log('  4. Click login and verify redirect to Keycloak');
        console.log('  5. Check for CSP violations in console');
        console.log('  6. Monitor Network tab for CORS errors');
        console.log('  7. Verify successful authentication and token storage');

        console.log('\n🔧 KEYCLOAK ADMIN TASKS:');
        console.log('  1. Access admin console: http://localhost:8180/admin');
        console.log('  2. Login with admin/admin credentials');
        console.log('  3. Create "projectflow" realm if not exists');
        console.log('  4. Configure client with correct redirect URIs');
        console.log('  5. Set up proper CORS settings');

        const allServicesUp = results.frontend.accessible &&
                            results.keycloak.accessible &&
                            results.api.accessible;

        console.log(`\n${allServicesUp ? '🎉' : '⚠️'} OVERALL STATUS: ${allServicesUp ? 'READY FOR TESTING' : 'SERVICES NEED ATTENTION'}\n`);
    }
}

// Run tests if called directly
if (require.main === module) {
    const tester = new SimpleAuthTester();
    tester.runTests().catch(console.error);
}

module.exports = SimpleAuthTester;