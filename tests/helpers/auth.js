/**
 * Shared authentication helper for Playwright tests.
 * Provides reusable login functions for different user types.
 */

/**
 * Login as an employee using test credentials from environment variables.
 * @param {import('@playwright/test').Page} page - Playwright page object
 */
export async function loginAsEmployee(page) {
  const username = process.env.TEST_EMPLOYEE_USERNAME;
  const password = process.env.TEST_EMPLOYEE_PASSWORD;

  if (!username || !password) {
    throw new Error(
      'Missing test credentials. Please set TEST_EMPLOYEE_USERNAME and TEST_EMPLOYEE_PASSWORD in .env.test.local'
    );
  }

  await page.goto('/login');

  // Ensure employee toggle is selected
  await page.getByRole('button', { name: /employee/i }).click();

  // Fill credentials
  await page.getByLabel(/username/i).fill(username);
  await page.getByLabel(/password/i).fill(password);

  // Submit login form
  await page.getByRole('button', { name: /sign in/i }).click();

  // Wait for redirect to dashboard
  await page.waitForURL('/', { timeout: 15000 });
}

/**
 * Login as a student using test credentials from environment variables.
 * @param {import('@playwright/test').Page} page - Playwright page object
 */
export async function loginAsStudent(page) {
  const username = process.env.TEST_STUDENT_USERNAME;
  const password = process.env.TEST_STUDENT_PASSWORD;

  if (!username || !password) {
    throw new Error(
      'Missing test credentials. Please set TEST_STUDENT_USERNAME and TEST_STUDENT_PASSWORD in .env.test.local'
    );
  }

  await page.goto('/login');

  // Select student toggle
  await page.getByRole('button', { name: /student/i }).click();

  // Fill credentials
  await page.getByLabel(/username/i).fill(username);
  await page.getByLabel(/password/i).fill(password);

  // Submit login form
  await page.getByRole('button', { name: /sign in/i }).click();

  // Wait for redirect to dashboard
  await page.waitForURL('/', { timeout: 15000 });
}
