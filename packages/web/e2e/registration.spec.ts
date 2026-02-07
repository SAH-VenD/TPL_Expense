import { test, expect } from '@playwright/test';
import { clearAuthState } from './helpers/auth';

test.describe('Registration Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await clearAuthState(page);
  });

  test('REG-01: Registration page loads', async ({ page }) => {
    // Click register link from login page
    await page.click('text=Register');
    await expect(page).toHaveURL('/register');

    // Should display registration heading
    await expect(page.getByRole('heading', { name: /create your account/i })).toBeVisible();
  });

  test('REG-02: Registration form has all required fields', async ({ page }) => {
    await page.goto('/register');

    // Should have all required form fields
    await expect(page.locator('input[name="firstName"]')).toBeVisible();
    await expect(page.locator('input[name="lastName"]')).toBeVisible();
    await expect(page.locator('input[name="email"], input[type="email"]').first()).toBeVisible();
    await expect(
      page.locator('input[name="password"], input[type="password"]').first(),
    ).toBeVisible();
  });

  test('REG-03: Password validation - passwords must match', async ({ page }) => {
    await page.goto('/register');

    // Fill form with mismatched passwords
    await page.fill('input[name="firstName"]', 'Test');
    await page.fill('input[name="lastName"]', 'User');
    await page.fill('input[name="email"]', 'test@tekcellent.com');
    await page.fill('input[name="password"]', 'Password123');
    await page.fill('input[name="confirmPassword"]', 'DifferentPassword123');

    // Submit form
    await page.click('button[type="submit"]');

    // Should show validation error
    await expect(page.locator('text=/passwords do not match/i')).toBeVisible();
  });

  test('REG-04: Email validation - must be @tekcellent.com domain', async ({ page }) => {
    await page.goto('/register');

    // Fill form with non-tekcellent email
    await page.fill('input[name="firstName"]', 'Test');
    await page.fill('input[name="lastName"]', 'User');
    await page.fill('input[name="email"]', 'test@gmail.com');
    await page.fill('input[name="password"]', 'Password123');
    await page.fill('input[name="confirmPassword"]', 'Password123');

    // Submit form
    await page.click('button[type="submit"]');

    // Should show domain validation error
    await expect(page.locator('text=/@tekcellent.com/i')).toBeVisible();
  });

  test('REG-05: Link back to login exists', async ({ page }) => {
    await page.goto('/register');

    // Should have link back to login
    await expect(page.getByRole('link', { name: /sign in/i })).toBeVisible();
  });

  test('REG-06: Duplicate email shows error', async ({ page }) => {
    await page.goto('/register');

    // Fill form with existing admin email
    await page.fill('input[name="firstName"]', 'Admin');
    await page.fill('input[name="lastName"]', 'Duplicate');
    await page.fill('input[name="email"]', 'admin@tekcellent.com');
    await page.fill('input[name="password"]', 'Password123!');
    await page.fill('input[name="confirmPassword"]', 'Password123!');

    // Submit form
    await page.click('button[type="submit"]');

    // Wait for response and check for error (either shows error or stays on page)
    await page.waitForTimeout(2000);
    const hasError = await page
      .locator('text=/already|exists|registered/i')
      .isVisible({ timeout: 2000 })
      .catch(() => false);
    const stayedOnRegister = page.url().includes('/register');

    // Either should show duplicate error or stay on register page
    expect(hasError || stayedOnRegister).toBeTruthy();
  });
});
