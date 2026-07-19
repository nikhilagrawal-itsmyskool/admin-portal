import { test, expect } from '@playwright/test';
import { loginAsEmployee } from '../helpers/auth';

/**
 * Assembly Module UI Smoke Test
 *
 * Happy path against the live local backend (gateway on :3000, school SS1):
 *   1. Login as employee
 *   2. Assembly → Plans list renders
 *   3. Create a plan → lands on the plan builder with all sections
 *   4. Add a block to the tree; it appears
 *   5. Themes page renders
 *
 * Prerequisites:
 *   - Backend running on http://localhost:3000 with the assembly module routed
 *   - Test credentials in .env.test.local (TEST_EMPLOYEE_USERNAME/PASSWORD)
 *   - App auto-started/reused by Playwright webServer on :5173
 */

const ts = Date.now();
const PLAN = `Smoke Assembly ${ts}`;
const BLOCK = `Opening ${ts}`;

test('assembly happy path: plans list, create plan, add block, themes', async ({ page }) => {
  await loginAsEmployee(page);

  // --- Plans list --- (wait for the academic-year load so create has a year)
  const yearsLoaded = page.waitForResponse((r) => r.url().includes('/academic-years/search'), { timeout: 20000 });
  await page.goto('/assembly');
  await expect(page.getByRole('heading', { name: 'Assembly Plans' })).toBeVisible({ timeout: 15000 });
  await yearsLoaded.catch(() => {});

  // --- Create a plan -> lands on the builder ---
  await page.getByRole('button', { name: /add plan/i }).click();
  await expect(page.getByRole('heading', { name: 'Add Assembly Plan' })).toBeVisible();
  await page.getByLabel(/plan name/i).fill(PLAN);
  await page.getByRole('button', { name: /create & build/i }).click();

  await expect(page.getByRole('heading', { name: PLAN })).toBeVisible({ timeout: 15000 });
  await expect(page.getByText('Assembly weekdays')).toBeVisible();
  await expect(page.getByText('Audience (classes)')).toBeVisible();
  await expect(page.getByText('Assembly structure')).toBeVisible();
  await expect(page.getByText('Special assemblies')).toBeVisible();
  await expect(page.getByText('Preview a date')).toBeVisible();

  // --- Add a block to the tree ---
  await page.getByRole('button', { name: /add block/i }).click();
  await expect(page.getByRole('heading', { name: 'Add block' })).toBeVisible();
  await page.getByLabel('Title').fill(BLOCK);
  await page.getByRole('button', { name: /^add$/i }).click();
  await expect(page.getByText(BLOCK)).toBeVisible({ timeout: 10000 });

  // --- Themes page renders ---
  await page.goto('/assembly/themes');
  await expect(page.getByRole('heading', { name: 'Assembly Themes' })).toBeVisible({ timeout: 15000 });

  // --- Schedule: This Week renders (wing selector + day columns) ---
  await page.goto('/assembly/week');
  await expect(page.getByRole('heading', { name: 'Assembly — This Week' })).toBeVisible({ timeout: 15000 });
  await expect(page.getByText(/Holidays aren't reflected yet/i)).toBeVisible();
  await expect(page.getByRole('combobox', { name: 'Wing' })).toBeVisible();

  // --- Schedule: Calendar renders (month grid + specials note) ---
  await page.goto('/assembly/calendar');
  await expect(page.getByRole('heading', { name: 'Assembly — Calendar' })).toBeVisible({ timeout: 15000 });
  await expect(page.getByText(/Badged days have a special assembly/i)).toBeVisible();
  await expect(page.getByText('Mon', { exact: true }).first()).toBeVisible(); // weekday header
});
