import { test, expect } from '@playwright/test'

test.describe('Time Tracking', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login')
    await page.fill('[data-testid="email-input"]', 'test@example.com')
    await page.fill('[data-testid="password-input"]', 'testpassword')
    await page.click('[data-testid="login-button"]')
    await expect(page).toHaveURL(/.*\/dashboard/)

    // Navigate to time tracking
    await page.click('[data-testid="time-tracking-nav"]')
    await expect(page).toHaveURL(/.*\/time-tracking/)
  })

  test('should display time tracker interface', async ({ page }) => {
    // Should show timer display
    await expect(page.locator('[data-testid="timer-display"]')).toBeVisible()
    await expect(page.locator('[data-testid="timer-display"]')).toContainText('00:00:00')

    // Should show start controls
    await expect(page.locator('[data-testid="start-controls"]')).toBeVisible()
    await expect(page.locator('[data-testid="description-input"]')).toBeVisible()
    await expect(page.locator('[data-testid="project-select"]')).toBeVisible()
    await expect(page.locator('[data-testid="start-button"]')).toBeVisible()
  })

  test('should start a time entry', async ({ page }) => {
    // Fill in task details
    await page.fill('[data-testid="description-input"]', 'Working on feature X')
    await page.selectOption('[data-testid="project-select"]', '1')

    // Start timer
    await page.click('[data-testid="start-button"]')

    // Should show stop controls
    await expect(page.locator('[data-testid="stop-controls"]')).toBeVisible()
    await expect(page.locator('[data-testid="stop-button"]')).toBeVisible()

    // Should hide start controls
    await expect(page.locator('[data-testid="start-controls"]')).not.toBeVisible()

    // Should show active task description
    await expect(page.locator('[data-testid="active-description"]')).toContainText('Working on feature X')

    // Timer should start counting
    await page.waitForTimeout(2000)
    await expect(page.locator('[data-testid="timer-display"]')).toContainText('00:00:0')
  })

  test('should stop a time entry', async ({ page }) => {
    // Start a timer first
    await page.fill('[data-testid="description-input"]', 'Test task')
    await page.selectOption('[data-testid="project-select"]', '1')
    await page.click('[data-testid="start-button"]')

    // Wait a bit
    await page.waitForTimeout(2000)

    // Stop timer
    await page.click('[data-testid="stop-button"]')

    // Should return to start controls
    await expect(page.locator('[data-testid="start-controls"]')).toBeVisible()
    await expect(page.locator('[data-testid="stop-controls"]')).not.toBeVisible()

    // Timer should reset
    await expect(page.locator('[data-testid="timer-display"]')).toContainText('00:00:00')

    // Form should be cleared
    await expect(page.locator('[data-testid="description-input"]')).toHaveValue('')
    await expect(page.locator('[data-testid="project-select"]')).toHaveValue('')
  })

  test('should validate required fields', async ({ page }) => {
    // Try to start without description
    await page.selectOption('[data-testid="project-select"]', '1')
    await expect(page.locator('[data-testid="start-button"]')).toBeDisabled()

    // Try to start without project
    await page.fill('[data-testid="description-input"]', 'Test task')
    await page.selectOption('[data-testid="project-select"]', '')
    await expect(page.locator('[data-testid="start-button"]')).toBeDisabled()

    // Should enable when both filled
    await page.selectOption('[data-testid="project-select"]', '1')
    await expect(page.locator('[data-testid="start-button"]')).not.toBeDisabled()
  })

  test('should display time entries list', async ({ page }) => {
    // Should show time entries section
    await expect(page.locator('[data-testid="time-entry-list"]')).toBeVisible()

    // Should show existing entries
    await expect(page.locator('[data-testid="time-entry-1"]')).toBeVisible()
    await expect(page.locator('[data-testid="time-entry-2"]')).toBeVisible()

    // Should show entry details
    await expect(page.locator('[data-testid="description-1"]')).toContainText('Test task 1')
    await expect(page.locator('[data-testid="description-2"]')).toContainText('Test task 2')
  })

  test('should show active entry badge', async ({ page }) => {
    // Active entry should have badge
    await expect(page.locator('[data-testid="active-badge-2"]')).toBeVisible()
    await expect(page.locator('[data-testid="active-badge-2"]')).toContainText('Active')

    // Completed entry should not have badge
    await expect(page.locator('[data-testid="active-badge-1"]')).not.toBeVisible()
  })

  test('should display time formatting correctly', async ({ page }) => {
    // Should show formatted start time
    await expect(page.locator('[data-testid="start-time-1"]')).toContainText('Started:')

    // Should show formatted duration
    await expect(page.locator('[data-testid="duration-1"]')).toContainText('8h 0m')
    await expect(page.locator('[data-testid="duration-2"]')).toContainText('Active')

    // Should show hourly rate
    await expect(page.locator('[data-testid="rate-1"]')).toContainText('$50.00/hr')

    // Should show total cost
    await expect(page.locator('[data-testid="cost-1"]')).toContainText('Total: $400.00')
  })

  test('should edit time entry', async ({ page }) => {
    // Click edit button for completed entry
    await page.click('[data-testid="edit-button-1"]')

    // Should open edit modal/form
    await expect(page.locator('[data-testid="edit-modal"]')).toBeVisible()

    // Update description
    await page.fill('[data-testid="edit-description"]', 'Updated task description')
    await page.fill('[data-testid="edit-rate"]', '75.00')

    // Save changes
    await page.click('[data-testid="save-button"]')

    // Should update entry
    await expect(page.locator('[data-testid="description-1"]')).toContainText('Updated task description')
    await expect(page.locator('[data-testid="rate-1"]')).toContainText('$75.00/hr')
  })

  test('should delete time entry', async ({ page }) => {
    // Click delete button
    await page.click('[data-testid="delete-button-1"]')

    // Should show confirmation dialog
    await expect(page.locator('[data-testid="confirm-dialog"]')).toBeVisible()
    await expect(page.locator('[data-testid="confirm-message"]')).toContainText('delete this time entry')

    // Confirm deletion
    await page.click('[data-testid="confirm-delete"]')

    // Entry should be removed
    await expect(page.locator('[data-testid="time-entry-1"]')).not.toBeVisible()
  })

  test('should disable actions for active entries', async ({ page }) => {
    // Active entry buttons should be disabled
    await expect(page.locator('[data-testid="edit-button-2"]')).toBeDisabled()
    await expect(page.locator('[data-testid="delete-button-2"]')).toBeDisabled()

    // Completed entry buttons should be enabled
    await expect(page.locator('[data-testid="edit-button-1"]')).not.toBeDisabled()
    await expect(page.locator('[data-testid="delete-button-1"]')).not.toBeDisabled()
  })

  test('should handle timer accuracy', async ({ page }) => {
    // Start timer
    await page.fill('[data-testid="description-input"]', 'Timer test')
    await page.selectOption('[data-testid="project-select"]', '1')
    await page.click('[data-testid="start-button"]')

    // Wait exactly 3 seconds
    await page.waitForTimeout(3000)

    // Should show approximately 3 seconds
    await expect(page.locator('[data-testid="timer-display"]')).toContainText('00:00:0')

    // Wait for 4th second
    await page.waitForTimeout(1000)
    await expect(page.locator('[data-testid="timer-display"]')).toContainText('00:00:04')
  })

  test('should handle browser refresh during active timer', async ({ page }) => {
    // Start timer
    await page.fill('[data-testid="description-input"]', 'Refresh test')
    await page.selectOption('[data-testid="project-select"]', '1')
    await page.click('[data-testid="start-button"]')

    // Wait a bit
    await page.waitForTimeout(2000)

    // Refresh page
    await page.reload()

    // Should restore timer state
    await expect(page.locator('[data-testid="stop-controls"]')).toBeVisible()
    await expect(page.locator('[data-testid="active-description"]')).toContainText('Refresh test')

    // Timer should continue counting
    await expect(page.locator('[data-testid="timer-display"]')).not.toContainText('00:00:00')
  })

  test('should handle multiple project selection', async ({ page }) => {
    // Should have multiple project options
    const projectOptions = await page.locator('[data-testid="project-select"] option').all()
    expect(projectOptions.length).toBeGreaterThan(2) // Default + actual projects

    // Should be able to select different projects
    await page.selectOption('[data-testid="project-select"]', '1')
    await expect(page.locator('[data-testid="project-select"]')).toHaveValue('1')

    await page.selectOption('[data-testid="project-select"]', '2')
    await expect(page.locator('[data-testid="project-select"]')).toHaveValue('2')
  })

  test('should handle long task descriptions', async ({ page }) => {
    const longDescription = 'This is a very long task description that should be handled properly by the interface without breaking the layout or functionality of the time tracking component'

    await page.fill('[data-testid="description-input"]', longDescription)
    await page.selectOption('[data-testid="project-select"]', '1')
    await page.click('[data-testid="start-button"]')

    // Should display full description
    await expect(page.locator('[data-testid="active-description"]')).toContainText(longDescription)
  })

  test('should show empty state when no time entries', async ({ page }) => {
    // Mock empty response
    await page.route('**/time-entries/', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([])
      })
    })

    await page.reload()

    // Should show empty state
    await expect(page.locator('[data-testid="empty-state"]')).toBeVisible()
    await expect(page.locator('[data-testid="empty-state"]')).toContainText('No time entries found')
  })
})