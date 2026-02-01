import { Page, expect } from '@playwright/test';

/**
 * Test user credentials - should match seed data
 */
export const TEST_USERS = {
  admin: {
    email: 'admin@tekcellent.com',
    password: 'Admin@123',
  },
  employee: {
    email: 'employee@tekcellent.com',
    password: 'Employee@123',
  },
  approver: {
    email: 'manager@tekcellent.com',
    password: 'Admin@123',
  },
  finance: {
    email: 'finance@tekcellent.com',
    password: 'Admin@123',
  },
};

/**
 * Login helper function
 */
export async function login(
  page: Page,
  email: string,
  password: string
): Promise<void> {
  await page.goto('/login');
  await page.waitForLoadState('networkidle');

  await page.fill('input[name="email"], input[type="email"]', email);
  await page.fill('input[name="password"], input[type="password"]', password);
  await page.click('button[type="submit"]');

  // Wait for navigation to complete after login
  await page.waitForURL('/', { timeout: 10000 });
  await page.waitForLoadState('networkidle');
}

/**
 * Login as admin user
 */
export async function loginAsAdmin(page: Page): Promise<void> {
  await login(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
  await expect(page).toHaveURL('/');
}

/**
 * Login as employee user
 */
export async function loginAsEmployee(page: Page): Promise<void> {
  await login(page, TEST_USERS.employee.email, TEST_USERS.employee.password);
  await expect(page).toHaveURL('/');
}

/**
 * Logout helper
 */
export async function logout(page: Page): Promise<void> {
  // Look for Sign out button (visible in sidebar)
  const signOutButton = page.locator('text=Sign out');
  await signOutButton.click();
  await expect(page).toHaveURL('/login');
}

/**
 * Check if user is logged in by looking for dashboard elements
 */
export async function isLoggedIn(page: Page): Promise<boolean> {
  try {
    await page.waitForSelector('text=Welcome', { timeout: 3000 });
    return true;
  } catch {
    return false;
  }
}

/**
 * Clear auth state (localStorage)
 */
export async function clearAuthState(page: Page): Promise<void> {
  await page.evaluate(() => {
    localStorage.clear();
  });
}
