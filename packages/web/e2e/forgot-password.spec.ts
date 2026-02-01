import { test, expect } from '@playwright/test';
import { clearAuthState } from './helpers/auth';

test.describe('Forgot Password Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await clearAuthState(page);
  });

  test('PWD-01: Forgot password page loads', async ({ page }) => {
    // Click forgot password link from login page
    await page.click('text=Forgot your password');
    await expect(page).toHaveURL('/forgot-password');

    // Should display forgot password heading
    await expect(page.getByRole('heading', { name: /reset your password/i })).toBeVisible();
  });

  test('PWD-02: Forgot password form has email field', async ({ page }) => {
    await page.goto('/forgot-password');

    // Should have email input
    await expect(page.locator('input[type="email"], input[name="email"]').first()).toBeVisible();

    // Should have submit button
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('PWD-03: Submitting email shows success message', async ({ page }) => {
    await page.goto('/forgot-password');

    // Enter email
    await page.fill('input[type="email"], input[name="email"]', 'admin@tekcellent.com');

    // Submit form
    await page.click('button[type="submit"]');

    // Should show success message (always shows for security)
    await expect(page.locator('text=/check your email/i')).toBeVisible({ timeout: 5000 });
  });

  test('PWD-04: Success message shows for any email (prevents enumeration)', async ({ page }) => {
    await page.goto('/forgot-password');

    // Enter non-existent email
    await page.fill('input[type="email"], input[name="email"]', 'nonexistent@tekcellent.com');

    // Submit form
    await page.click('button[type="submit"]');

    // Should still show success message (security best practice)
    await expect(page.locator('text=/check your email/i')).toBeVisible({ timeout: 5000 });
  });

  test('PWD-05: Link back to login exists', async ({ page }) => {
    await page.goto('/forgot-password');

    // Should have link back to login
    await expect(page.getByRole('link', { name: /sign in/i })).toBeVisible();
  });

  test('PWD-06: After submission, can navigate back to login', async ({ page }) => {
    await page.goto('/forgot-password');

    // Submit form
    await page.fill('input[type="email"], input[name="email"]', 'test@tekcellent.com');
    await page.click('button[type="submit"]');

    // Wait for success message
    await expect(page.locator('text=/check your email/i')).toBeVisible({ timeout: 5000 });

    // Click back to login
    await page.click('text=/back to sign in|sign in/i');
    await expect(page).toHaveURL('/login');
  });
});
