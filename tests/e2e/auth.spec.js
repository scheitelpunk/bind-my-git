import { test, expect } from '@playwright/test'

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Start fresh on each test
    await page.goto('/')
  })

  test('should redirect to login when not authenticated', async ({ page }) => {
    await expect(page).toHaveURL(/.*\/login/)
  })

  test('should login with valid credentials', async ({ page }) => {
    await page.goto('/login')

    // Fill login form
    await page.fill('[data-testid="email-input"]', 'test@example.com')
    await page.fill('[data-testid="password-input"]', 'testpassword')

    // Submit form
    await page.click('[data-testid="login-button"]')

    // Should redirect to dashboard
    await expect(page).toHaveURL(/.*\/dashboard/)

    // Should show user info
    await expect(page.locator('[data-testid="user-name"]')).toContainText('Test User')
  })

  test('should show error message with invalid credentials', async ({ page }) => {
    await page.goto('/login')

    // Fill login form with wrong credentials
    await page.fill('[data-testid="email-input"]', 'wrong@example.com')
    await page.fill('[data-testid="password-input"]', 'wrongpassword')

    // Submit form
    await page.click('[data-testid="login-button"]')

    // Should show error message
    await expect(page.locator('[data-testid="error-message"]')).toContainText('Incorrect username or password')

    // Should stay on login page
    await expect(page).toHaveURL(/.*\/login/)
  })

  test('should validate required fields', async ({ page }) => {
    await page.goto('/login')

    // Try to submit without filling fields
    await page.click('[data-testid="login-button"]')

    // Should show validation errors
    await expect(page.locator('[data-testid="email-error"]')).toContainText('Email is required')
    await expect(page.locator('[data-testid="password-error"]')).toContainText('Password is required')
  })

  test('should validate email format', async ({ page }) => {
    await page.goto('/login')

    // Fill invalid email
    await page.fill('[data-testid="email-input"]', 'invalid-email')
    await page.fill('[data-testid="password-input"]', 'password')

    await page.click('[data-testid="login-button"]')

    // Should show email format error
    await expect(page.locator('[data-testid="email-error"]')).toContainText('Please enter a valid email')
  })

  test('should logout successfully', async ({ page }) => {
    // Login first
    await page.goto('/login')
    await page.fill('[data-testid="email-input"]', 'test@example.com')
    await page.fill('[data-testid="password-input"]', 'testpassword')
    await page.click('[data-testid="login-button"]')

    // Wait for dashboard
    await expect(page).toHaveURL(/.*\/dashboard/)

    // Logout
    await page.click('[data-testid="user-menu-button"]')
    await page.click('[data-testid="logout-button"]')

    // Should redirect to login
    await expect(page).toHaveURL(/.*\/login/)
  })

  test('should persist authentication across page reloads', async ({ page }) => {
    // Login
    await page.goto('/login')
    await page.fill('[data-testid="email-input"]', 'test@example.com')
    await page.fill('[data-testid="password-input"]', 'testpassword')
    await page.click('[data-testid="login-button"]')

    await expect(page).toHaveURL(/.*\/dashboard/)

    // Reload page
    await page.reload()

    // Should still be authenticated
    await expect(page).toHaveURL(/.*\/dashboard/)
    await expect(page.locator('[data-testid="user-name"]')).toContainText('Test User')
  })

  test('should handle session expiration', async ({ page }) => {
    // Login
    await page.goto('/login')
    await page.fill('[data-testid="email-input"]', 'test@example.com')
    await page.fill('[data-testid="password-input"]', 'testpassword')
    await page.click('[data-testid="login-button"]')

    await expect(page).toHaveURL(/.*\/dashboard/)

    // Simulate expired token by clearing localStorage
    await page.evaluate(() => {
      localStorage.removeItem('auth_token')
    })

    // Try to access protected route
    await page.goto('/time-entries')

    // Should redirect to login
    await expect(page).toHaveURL(/.*\/login/)
  })

  test('should show loading state during login', async ({ page }) => {
    await page.goto('/login')

    await page.fill('[data-testid="email-input"]', 'test@example.com')
    await page.fill('[data-testid="password-input"]', 'testpassword')

    // Click login and check loading state
    await page.click('[data-testid="login-button"]')

    // Should show loading text
    await expect(page.locator('[data-testid="login-button"]')).toContainText('Logging in...')

    // Button should be disabled
    await expect(page.locator('[data-testid="login-button"]')).toBeDisabled()
  })

  test('should auto-focus email field on login page', async ({ page }) => {
    await page.goto('/login')

    // Email field should be focused
    await expect(page.locator('[data-testid="email-input"]')).toBeFocused()
  })

  test('should support keyboard navigation', async ({ page }) => {
    await page.goto('/login')

    // Tab through form fields
    await page.keyboard.press('Tab')
    await expect(page.locator('[data-testid="email-input"]')).toBeFocused()

    await page.keyboard.press('Tab')
    await expect(page.locator('[data-testid="password-input"]')).toBeFocused()

    await page.keyboard.press('Tab')
    await expect(page.locator('[data-testid="login-button"]')).toBeFocused()
  })

  test('should submit form with Enter key', async ({ page }) => {
    await page.goto('/login')

    await page.fill('[data-testid="email-input"]', 'test@example.com')
    await page.fill('[data-testid="password-input"]', 'testpassword')

    // Press Enter in password field
    await page.locator('[data-testid="password-input"]').press('Enter')

    // Should submit form and redirect
    await expect(page).toHaveURL(/.*\/dashboard/)
  })
})