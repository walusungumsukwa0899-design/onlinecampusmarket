// Wolf Marketplace — Smoke Tests (Playwright)
// Install: npm install -D @playwright/test && npx playwright install chromium
// Run: npm test

import { test, expect } from '@playwright/test'

const BASE = process.env.TEST_URL || 'http://localhost:5173'

test.describe('Landing Page', () => {
  test('shows sign in / create account', async ({ page }) => {
    await page.goto(BASE + '/')
    await expect(page.getByText('Wolf Marketplace').first()).toBeVisible()
    await expect(page.getByText('Sign In').first()).toBeVisible()
    await expect(page.getByText('Create Account')).toBeVisible()
  })

  test('browse as guest goes to /home', async ({ page }) => {
    await page.goto(BASE + '/')
    await page.getByText('Browse as guest').click()
    await expect(page).toHaveURL(BASE + '/home')
  })

  test('password strength meter works', async ({ page }) => {
    await page.goto(BASE + '/')
    await page.getByText('Create Account').click()
    const pwInput = page.getByPlaceholder('Min 8 chars, include a number')
    await pwInput.fill('weak')
    await expect(page.getByText('Weak')).toBeVisible()
    await pwInput.fill('StrongPass1!')
    await expect(page.getByText('Strong')).toBeVisible()
  })
})

test.describe('Home Page', () => {
  test('loads and shows discover strip', async ({ page }) => {
    await page.goto(BASE + '/home')
    await expect(page.getByText('Trending Now')).toBeVisible()
    await expect(page.getByText('New Arrivals')).toBeVisible()
  })

  test('search navigates correctly', async ({ page }) => {
    await page.goto(BASE + '/home')
    const searchInput = page.getByPlaceholder(/Search products/i)
    await searchInput.fill('laptop')
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/\/search\?q=laptop/)
  })
})

test.describe('Search Page', () => {
  test('shows suggestions when empty', async ({ page }) => {
    await page.goto(BASE + '/search')
    await expect(page.getByText('Popular Searches')).toBeVisible()
    await expect(page.getByText('Browse by Category')).toBeVisible()
  })

  test('suggestion chip triggers search', async ({ page }) => {
    await page.goto(BASE + '/search')
    await page.getByText('🔍 Laptop').click()
    await page.waitForTimeout(600)
    await expect(page.locator('.products-grid, .empty-state')).toBeVisible()
  })

  test('category filter works', async ({ page }) => {
    await page.goto(BASE + '/search')
    await page.getByText('Electronics').click()
    await page.waitForTimeout(600)
    await expect(page.locator('.products-grid, .empty-state')).toBeVisible()
  })
})

test.describe('Vendors Page', () => {
  test('renders vendor cards or empty state', async ({ page }) => {
    await page.goto(BASE + '/vendors')
    await page.waitForTimeout(2000)
    const hasCards = await page.locator('.vendor-card').count() > 0
    const hasEmpty = await page.locator('.empty-state').isVisible().catch(() => false)
    expect(hasCards || hasEmpty).toBe(true)
  })
})

test.describe('Trending Page', () => {
  test('shows all three tabs', async ({ page }) => {
    await page.goto(BASE + '/trending')
    await expect(page.getByText('🔥 Trending')).toBeVisible()
    await expect(page.getByText('✨ New Arrivals')).toBeVisible()
    await expect(page.getByText('🏷️ On Sale')).toBeVisible()
  })

  test('tab switching works', async ({ page }) => {
    await page.goto(BASE + '/trending')
    await page.getByText('✨ New Arrivals').click()
    await page.waitForTimeout(500)
    await expect(page.locator('.products-grid, .empty-state')).toBeVisible()
  })
})

test.describe('404 Page', () => {
  test('shows 404 with quick links', async ({ page }) => {
    await page.goto(BASE + '/xyz-does-not-exist-123')
    await expect(page.getByText('404')).toBeVisible()
    await expect(page.getByText('Browse Vendors')).toBeVisible()
    await expect(page.getByText('← Go Home')).toBeVisible()
  })

  test('go home button navigates to /home', async ({ page }) => {
    await page.goto(BASE + '/xyz-does-not-exist-123')
    await page.getByText('← Go Home').click()
    await expect(page).toHaveURL(BASE + '/home')
  })
})

test.describe('Cart', () => {
  test('shows empty state', async ({ page }) => {
    await page.goto(BASE + '/cart')
    await expect(page.getByText('Your cart is empty')).toBeVisible()
    await expect(page.getByText('Browse Products')).toBeVisible()
  })
})

test.describe('PWA Assets', () => {
  test('manifest is valid', async ({ page }) => {
    const res = await page.goto(BASE + '/manifest.webmanifest')
    expect(res.status()).toBe(200)
    const json = JSON.parse(await res.text())
    expect(json.name).toBe('Wolf Marketplace')
    expect(json.icons.length).toBeGreaterThanOrEqual(2)
    expect(json.theme_color).toBe('#E8630A')
  })

  test('offline page exists', async ({ page }) => {
    const res = await page.goto(BASE + '/offline.html')
    expect(res.status()).toBe(200)
    await expect(page.getByText("You're Offline")).toBeVisible()
  })

  test('robots.txt exists', async ({ page }) => {
    const res = await page.goto(BASE + '/robots.txt')
    expect(res.status()).toBe(200)
    const text = await res.text()
    expect(text).toContain('User-agent')
    expect(text).toContain('Sitemap')
  })
})
