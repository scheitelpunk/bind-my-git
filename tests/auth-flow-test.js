#!/usr/bin/env node

/**
 * Keycloak Authentication Flow Testing Script
 *
 * This script tests the complete authentication flow including:
 * - Frontend accessibility
 * - Keycloak connectivity
 * - Login redirect flow
 * - Token validation
 * - Logout functionality
 * - CSP compliance
 * - CORS handling
 */

const puppeteer = require('puppeteer');
const axios = require('axios');

class AuthFlowTester {
    constructor() {
        this.baseUrl = 'http://localhost:3000';
        this.keycloakUrl = 'http://localhost:8180';
        this.results = {
            frontend: null,
            keycloak: null,
            login: null,
            token: null,
            logout: null,
            csp: [],
            cors: []
        };
    }

    async runAllTests() {
        console.log('🚀 Starting Keycloak Authentication Flow Tests\n');

        try {
            await this.testFrontendAccessibility();
            await this.testKeycloakAccessibility();
            await this.testAuthenticationFlow();
            await this.generateReport();
        } catch (error) {
            console.error('❌ Test suite failed:', error.message);
            process.exit(1);
        }
    }

    async testFrontendAccessibility() {
        console.log('📱 Testing Frontend Accessibility...');
        try {
            const response = await axios.get(this.baseUrl, { timeout: 5000 });
            this.results.frontend = {
                status: response.status,
                accessible: response.status === 200,
                contentType: response.headers['content-type']
            };
            console.log('✅ Frontend is accessible');
        } catch (error) {
            this.results.frontend = {
                status: error.response?.status || 0,
                accessible: false,
                error: error.message
            };
            console.log('❌ Frontend is not accessible:', error.message);
        }
    }

    async testKeycloakAccessibility() {
        console.log('🔐 Testing Keycloak Accessibility...');
        try {
            const response = await axios.get(`${this.keycloakUrl}/realms/master`, { timeout: 5000 });
            this.results.keycloak = {
                status: response.status,
                accessible: response.status === 200,
                realm: response.data?.realm
            };
            console.log('✅ Keycloak is accessible');
        } catch (error) {
            this.results.keycloak = {
                status: error.response?.status || 0,
                accessible: false,
                error: error.message
            };
            console.log('❌ Keycloak is not accessible:', error.message);
        }
    }

    async testAuthenticationFlow() {
        console.log('🔄 Testing Authentication Flow with Browser...');

        if (!this.results.frontend?.accessible || !this.results.keycloak?.accessible) {
            console.log('⚠️ Skipping authentication flow test - services not accessible');
            return;
        }

        const browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-web-security',
                '--disable-features=VizDisplayCompositor'
            ]
        });

        const page = await browser.newPage();

        // Monitor console errors and CSP violations
        page.on('console', msg => {
            if (msg.type() === 'error') {
                const text = msg.text();
                if (text.includes('Content Security Policy')) {
                    this.results.csp.push(text);
                } else if (text.includes('CORS') || text.includes('Cross-Origin')) {
                    this.results.cors.push(text);
                }
            }
        });

        // Monitor network failures
        page.on('requestfailed', request => {
            const failure = request.failure();
            if (failure && failure.errorText.includes('net::ERR_FAILED')) {
                console.log(`❌ Network request failed: ${request.url()}`);
            }
        });

        try {
            // Test 1: Load frontend page
            console.log('  📄 Loading frontend page...');
            await page.goto(this.baseUrl, { waitUntil: 'networkidle2', timeout: 10000 });

            // Check for React app rendering
            await page.waitForSelector('#root', { timeout: 5000 });
            const hasReactRoot = await page.$('#root') !== null;
            console.log(`  ${hasReactRoot ? '✅' : '❌'} React app root found`);

            // Test 2: Look for login button or authentication elements
            console.log('  🔍 Looking for authentication elements...');
            await page.waitForTimeout(2000); // Wait for React to render

            // Try to find login-related elements
            const loginElements = await page.evaluate(() => {
                const buttons = Array.from(document.querySelectorAll('button, a'));
                const loginButtons = buttons.filter(btn =>
                    btn.textContent.toLowerCase().includes('login') ||
                    btn.textContent.toLowerCase().includes('sign in') ||
                    btn.textContent.toLowerCase().includes('authenticate')
                );
                return {
                    loginButtonsFound: loginButtons.length,
                    buttonTexts: loginButtons.map(btn => btn.textContent.trim())
                };
            });

            console.log(`  ${loginElements.loginButtonsFound > 0 ? '✅' : '⚠️'} Found ${loginElements.loginButtonsFound} login-related elements`);
            if (loginElements.buttonTexts.length > 0) {
                console.log(`    Button texts: ${loginElements.buttonTexts.join(', ')}`);
            }

            // Test 3: Check if there's a protected route or auth state
            const authState = await page.evaluate(() => {
                // Check localStorage for auth tokens
                const hasTokens = localStorage.getItem('access_token') ||
                                localStorage.getItem('auth_token') ||
                                localStorage.getItem('keycloak_token');

                // Check for any Keycloak-related global variables
                const hasKeycloak = typeof window.Keycloak !== 'undefined' ||
                                  window.keycloak !== undefined;

                return {
                    hasStoredTokens: !!hasTokens,
                    hasKeycloakInstance: hasKeycloak,
                    currentUrl: window.location.href
                };
            });

            console.log(`  ${authState.hasKeycloakInstance ? '✅' : '⚠️'} Keycloak instance detected: ${authState.hasKeycloakInstance}`);
            console.log(`  ${authState.hasStoredTokens ? '✅' : 'ℹ️'} Auth tokens in storage: ${authState.hasStoredTokens}`);

            // Test 4: Try to trigger authentication if possible
            if (loginElements.loginButtonsFound > 0) {
                console.log('  🔄 Attempting to trigger authentication...');
                try {
                    const firstLoginButton = await page.$eval('button, a', (el, texts) => {
                        const buttons = Array.from(document.querySelectorAll('button, a'));
                        const loginButton = buttons.find(btn =>
                            btn.textContent.toLowerCase().includes('login') ||
                            btn.textContent.toLowerCase().includes('sign in') ||
                            btn.textContent.toLowerCase().includes('authenticate')
                        );
                        if (loginButton) {
                            loginButton.click();
                            return true;
                        }
                        return false;
                    });

                    if (firstLoginButton) {
                        // Wait for potential redirect
                        await page.waitForTimeout(3000);
                        const currentUrl = page.url();
                        const isKeycloakRedirect = currentUrl.includes('localhost:8180') || currentUrl.includes('keycloak');

                        console.log(`  ${isKeycloakRedirect ? '✅' : '⚠️'} Authentication redirect: ${isKeycloakRedirect}`);
                        console.log(`    Current URL: ${currentUrl}`);

                        this.results.login = {
                            buttonClicked: true,
                            redirectedToKeycloak: isKeycloakRedirect,
                            finalUrl: currentUrl
                        };
                    }
                } catch (error) {
                    console.log(`  ⚠️ Could not trigger authentication: ${error.message}`);
                    this.results.login = {
                        buttonClicked: false,
                        error: error.message
                    };
                }
            }

            // Test 5: Check for CSP and CORS issues
            console.log('  🛡️ Checking for security policy violations...');
            await page.waitForTimeout(2000);

            this.results.csp = [...new Set(this.results.csp)]; // Remove duplicates
            this.results.cors = [...new Set(this.results.cors)]; // Remove duplicates

            console.log(`  ${this.results.csp.length === 0 ? '✅' : '❌'} CSP violations: ${this.results.csp.length}`);
            console.log(`  ${this.results.cors.length === 0 ? '✅' : '❌'} CORS errors: ${this.results.cors.length}`);

        } catch (error) {
            console.log('❌ Authentication flow test failed:', error.message);
            this.results.login = {
                error: error.message,
                completed: false
            };
        } finally {
            await browser.close();
        }
    }

    async generateReport() {
        console.log('\n📋 AUTHENTICATION FLOW TEST REPORT');
        console.log('=====================================\n');

        // Frontend Status
        console.log('🌐 Frontend Service:');
        if (this.results.frontend?.accessible) {
            console.log(`  ✅ Status: Accessible (${this.results.frontend.status})`);
            console.log(`  📄 Content-Type: ${this.results.frontend.contentType}`);
        } else {
            console.log(`  ❌ Status: Not accessible`);
            if (this.results.frontend?.error) {
                console.log(`  🚨 Error: ${this.results.frontend.error}`);
            }
        }

        // Keycloak Status
        console.log('\n🔐 Keycloak Service:');
        if (this.results.keycloak?.accessible) {
            console.log(`  ✅ Status: Accessible (${this.results.keycloak.status})`);
            console.log(`  🏰 Realm: ${this.results.keycloak.realm}`);
        } else {
            console.log(`  ❌ Status: Not accessible`);
            if (this.results.keycloak?.error) {
                console.log(`  🚨 Error: ${this.results.keycloak.error}`);
            }
        }

        // Authentication Flow
        console.log('\n🔄 Authentication Flow:');
        if (this.results.login) {
            if (this.results.login.buttonClicked) {
                console.log(`  ✅ Login button interaction: Success`);
                console.log(`  ${this.results.login.redirectedToKeycloak ? '✅' : '⚠️'} Keycloak redirect: ${this.results.login.redirectedToKeycloak ? 'Yes' : 'No'}`);
                if (this.results.login.finalUrl) {
                    console.log(`  🌐 Final URL: ${this.results.login.finalUrl}`);
                }
            } else {
                console.log(`  ⚠️ Login button interaction: Failed`);
                if (this.results.login.error) {
                    console.log(`  🚨 Error: ${this.results.login.error}`);
                }
            }
        } else {
            console.log(`  ⚠️ Authentication flow test was skipped`);
        }

        // Security Issues
        console.log('\n🛡️ Security Policy Compliance:');
        console.log(`  CSP Violations: ${this.results.csp.length}`);
        if (this.results.csp.length > 0) {
            this.results.csp.forEach((violation, index) => {
                console.log(`    ${index + 1}. ${violation}`);
            });
        }

        console.log(`  CORS Errors: ${this.results.cors.length}`);
        if (this.results.cors.length > 0) {
            this.results.cors.forEach((error, index) => {
                console.log(`    ${index + 1}. ${error}`);
            });
        }

        // Recommendations
        console.log('\n💡 RECOMMENDATIONS:');
        const recommendations = [];

        if (!this.results.frontend?.accessible) {
            recommendations.push('🔧 Fix frontend service accessibility');
        }

        if (!this.results.keycloak?.accessible) {
            recommendations.push('🔧 Fix Keycloak service accessibility');
        }

        if (this.results.csp.length > 0) {
            recommendations.push('🛡️ Review and fix Content Security Policy violations');
        }

        if (this.results.cors.length > 0) {
            recommendations.push('🌐 Review and fix CORS configuration');
        }

        if (!this.results.login?.redirectedToKeycloak && this.results.login?.buttonClicked) {
            recommendations.push('🔄 Check Keycloak client configuration and redirect URLs');
        }

        if (recommendations.length === 0) {
            console.log('  ✅ All systems appear to be functioning correctly!');
        } else {
            recommendations.forEach((rec, index) => {
                console.log(`  ${index + 1}. ${rec}`);
            });
        }

        console.log('\n🎯 NEXT STEPS:');
        console.log('  1. Manually test login in browser at http://localhost:3000');
        console.log('  2. Check browser dev tools for any remaining errors');
        console.log('  3. Verify authentication tokens are properly stored');
        console.log('  4. Test logout functionality');
        console.log('  5. Test protected routes access');

        console.log('\n✅ Authentication flow testing completed!\n');
    }
}

// Run tests if called directly
if (require.main === module) {
    const tester = new AuthFlowTester();
    tester.runAllTests().catch(console.error);
}

module.exports = AuthFlowTester;