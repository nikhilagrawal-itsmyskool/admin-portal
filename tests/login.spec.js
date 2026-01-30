import { test, expect } from '@playwright/test';

// Test credentials loaded from .env.test.local (gitignored)
const TEST_EMPLOYEE = {
  username: process.env.TEST_EMPLOYEE_USERNAME,
  password: process.env.TEST_EMPLOYEE_PASSWORD,
};

const TEST_STUDENT = {
  username: process.env.TEST_STUDENT_USERNAME,
  password: process.env.TEST_STUDENT_PASSWORD,
};

test.describe('Login Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('should display login form with employee/student toggle', async ({ page }) => {
    // Check page title
    await expect(page.locator('text=ItsMySkool')).toBeVisible();
    await expect(page.locator('text=Admin Portal')).toBeVisible();

    // Check toggle buttons exist
    await expect(page.getByRole('button', { name: /employee/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /student/i })).toBeVisible();

    // Check form fields
    await expect(page.getByLabel(/username/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });

  test('should have employee selected by default', async ({ page }) => {
    const employeeButton = page.getByRole('button', { name: /employee/i });
    await expect(employeeButton).toHaveAttribute('aria-pressed', 'true');
  });

  test('should toggle between employee and student', async ({ page }) => {
    const employeeButton = page.getByRole('button', { name: /employee/i });
    const studentButton = page.getByRole('button', { name: /student/i });

    // Initially employee is selected
    await expect(employeeButton).toHaveAttribute('aria-pressed', 'true');
    await expect(studentButton).toHaveAttribute('aria-pressed', 'false');

    // Click student
    await studentButton.click();
    await expect(studentButton).toHaveAttribute('aria-pressed', 'true');
    await expect(employeeButton).toHaveAttribute('aria-pressed', 'false');

    // Click employee again
    await employeeButton.click();
    await expect(employeeButton).toHaveAttribute('aria-pressed', 'true');
    await expect(studentButton).toHaveAttribute('aria-pressed', 'false');
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.getByLabel(/username/i).fill('invalid_user');
    await page.getByLabel(/password/i).fill('wrong_password');
    await page.getByRole('button', { name: /sign in/i }).click();

    // Should show error message
    await expect(page.getByRole('alert')).toBeVisible({ timeout: 10000 });
  });

  test('employee login with valid credentials', async ({ page }) => {
    // Ensure employee is selected
    await page.getByRole('button', { name: /employee/i }).click();

    // Fill credentials
    await page.getByLabel(/username/i).fill(TEST_EMPLOYEE.username);
    await page.getByLabel(/password/i).fill(TEST_EMPLOYEE.password);

    // Submit
    await page.getByRole('button', { name: /sign in/i }).click();

    // Should redirect to dashboard on success
    // Note: This will fail if API is not running or credentials are invalid
    await expect(page).toHaveURL('/', { timeout: 10000 });
    await expect(page.locator('text=Welcome back')).toBeVisible();
  });

  test('student login with valid credentials', async ({ page }) => {
    // Select student
    await page.getByRole('button', { name: /student/i }).click();

    // Fill credentials
    await page.getByLabel(/username/i).fill(TEST_STUDENT.username);
    await page.getByLabel(/password/i).fill(TEST_STUDENT.password);

    // Submit
    await page.getByRole('button', { name: /sign in/i }).click();

    // Should redirect to dashboard on success
    await expect(page).toHaveURL('/', { timeout: 10000 });
    await expect(page.locator('text=Welcome back')).toBeVisible();
  });
});

test.describe('Protected Routes', () => {
  test('should redirect to login when not authenticated', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL('/login');
  });

  test('should redirect to login when accessing medical module', async ({ page }) => {
    await page.goto('/medical');
    await expect(page).toHaveURL('/login');
  });
});
