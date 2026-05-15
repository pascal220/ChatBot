import { test, expect } from '@playwright/test'

const USER = {
  email: `e2e-${Date.now()}@example.com`,
  username: `e2euser${Date.now()}`,
  password: 'testpassword123',
}

test.describe('Authentication', () => {
  test('user can register and is redirected to chat', async ({ page }) => {
    await page.goto('/register')
    await page.fill('input[type="email"]', USER.email)
    await page.fill('input[type="text"]', USER.username)
    await page.fill('input[type="password"]', USER.password)
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL('/')
  })

  test('user can log in after registering', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[type="email"]', USER.email)
    await page.fill('input[type="password"]', USER.password)
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL('/')
  })

  test('wrong password shows error', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[type="email"]', USER.email)
    await page.fill('input[type="password"]', 'wrongpassword')
    await page.click('button[type="submit"]')
    await expect(page.locator('text=Invalid')).toBeVisible()
  })
})
