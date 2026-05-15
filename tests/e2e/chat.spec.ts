import { test, expect } from '@playwright/test'

// Assumes the e2e user from auth.spec.ts already exists.
// Run auth tests first, or adjust credentials as needed.
const CREDS = {
  email: 'e2e-fixed@example.com',
  password: 'testpassword123',
}

test.describe('Chat', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[type="email"]', CREDS.email)
    await page.fill('input[type="password"]', CREDS.password)
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL('/')
  })

  test('can create a new chat session', async ({ page }) => {
    await page.click('[title="New chat"]')
    await expect(page.locator('textarea[placeholder*="Message"]')).toBeVisible()
  })

  test('can type and send a message', async ({ page }) => {
    await page.click('[title="New chat"]')
    const textarea = page.locator('textarea[placeholder*="Message"]')
    await textarea.fill('Hello, this is a test message')
    await page.click('[title="Send"]')
    await expect(page.locator('text=Hello, this is a test message')).toBeVisible()
  })
})
