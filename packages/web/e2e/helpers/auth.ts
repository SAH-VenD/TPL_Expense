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
    email: 'approver@tekcellent.com',
    password: 'Approver@123',
  },
  finance: {
    email: 'finance@tekcellent.com',
    password: 'Finance@123',
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
  await page.fill('input[name="email"], input[type="email"]', email);
  await page.fill('input[name="password"], input[type="password"]', password);
  await page.click('button[type="submit"]');
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
  // Look for logout button or menu
  const logoutButton = page.locator('button:has-text("Logout"), a:has-text("Logout")');
  if (await logoutButton.isVisible()) {
    await logoutButton.click();
  } else {
    // May need to open user menu first
    const userMenu = page.locator('[data-testid="user-menu"], .user-menu');
    if (await userMenu.isVisible()) {
      await userMenu.click();
      await page.click('text=Logout');
    }
  }
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
