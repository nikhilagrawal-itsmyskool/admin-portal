import { test, expect } from '@playwright/test';
import { loginAsEmployee } from '../helpers/auth';

/**
 * Transport Module UI Smoke Test
 *
 * End-to-end happy path against the live local backend (gateway on :3000, school SS1):
 *   1. Login as employee
 *   2. Dashboard shows the Hiring + Transport module cards
 *   3. Transport card navigates to the Transport module landing page
 *   4. Stops: bulk-add via the grid dialog; the new stops appear
 *   5. Vehicles: add a vehicle; it appears in the list
 *   6. Routes: create a morning route with that vehicle (driver/conductor prefill),
 *      then add a stop to the route
 *
 * Prerequisites:
 *   - Backend running on http://localhost:3000 with the transport module routed
 *   - Test credentials in .env.test.local
 *   - App auto-started/reused by Playwright webServer on :5173
 */

const ts = Date.now();
const STOP_A = `Smoke Gate ${ts}`;
const STOP_B = `Smoke Market ${ts}`;
const REG_NO = `SMK-${ts}`;
const ROUTE_NAME = `Smoke Route ${ts}`;
const DRIVER = `Driver ${ts}`;

test('transport happy path: dashboard cards, stops grid, vehicle, route + prefill', async ({ page }) => {
  await loginAsEmployee(page);

  // --- 1. Dashboard shows Hiring + Transport cards ---
  await page.goto('/');
  await expect(page.getByText('Welcome back')).toBeVisible({ timeout: 15000 });
  await expect(page.getByRole('heading', { name: 'Hiring', exact: true })).toBeVisible();
  const transportCard = page.getByRole('heading', { name: 'Transport', exact: true });
  await expect(transportCard).toBeVisible();

  // --- 2. Transport card navigates to the module ---
  await transportCard.click();
  await expect(page).toHaveURL(/\/transport$/);
  await expect(page.getByRole('heading', { name: 'Transport Module' })).toBeVisible();

  // --- 3. Stops: bulk-add via the grid ---
  await page.goto('/transport/stops');
  await expect(page.getByRole('heading', { name: 'Stops' })).toBeVisible();
  await page.getByRole('button', { name: /bulk add/i }).click();
  await expect(page.getByRole('heading', { name: 'Bulk add stops' })).toBeVisible();

  const nameInputs = page.getByPlaceholder('Name');
  await nameInputs.nth(0).fill(STOP_A);
  await nameInputs.nth(1).fill(STOP_B);
  const kmInputs = page.getByPlaceholder('Km');
  await kmInputs.nth(0).fill('1.5');
  await kmInputs.nth(1).fill('3.2');
  await page.getByRole('button', { name: /save all/i }).click();

  await expect(page.getByText(/created/i)).toBeVisible({ timeout: 10000 });
  await page.getByLabel(/search stop name/i).fill(STOP_A);
  await page.getByRole('button', { name: /^search$/i }).click();
  await expect(page.getByText(STOP_A)).toBeVisible({ timeout: 10000 });

  // --- 4. Vehicles: add a vehicle ---
  await page.goto('/transport/vehicles/add');
  await expect(page.getByRole('heading', { name: 'Add Vehicle' })).toBeVisible();
  await page.getByLabel(/registration number/i).fill(REG_NO);
  await page.getByLabel(/driver name/i).fill(DRIVER);
  await page.getByLabel(/driver phone/i).fill('9990001111');
  await page.getByRole('button', { name: /save vehicle/i }).click();
  await expect(page.getByRole('heading', { name: 'Vehicles' })).toBeVisible({ timeout: 10000 });
  await expect(page.getByText(REG_NO)).toBeVisible({ timeout: 10000 });

  // --- 5. Routes: create a morning route with the vehicle (prefill driver) ---
  await page.goto('/transport/routes/new');
  await expect(page.getByRole('heading', { name: 'Add Route' })).toBeVisible();
  await page.getByLabel(/route name/i).fill(ROUTE_NAME);
  // Vehicle autocomplete
  const vehicleInput = page.getByRole('combobox', { name: 'Vehicle' });
  await vehicleInput.click();
  await vehicleInput.fill(REG_NO);
  await page.getByRole('option', { name: new RegExp(REG_NO) }).click();
  // The vehicle's driver should be shown as the prefill hint
  await expect(page.getByText(DRIVER)).toBeVisible();
  await page.getByRole('button', { name: /create route & add stops/i }).click();

  // Lands on the manage page for the new route
  await expect(page.getByRole('heading', { name: 'Manage Route' })).toBeVisible({ timeout: 10000 });
  // Driver snapshot was prefilled from the vehicle on the server
  await expect(page.getByLabel(/driver name/i)).toHaveValue(DRIVER);

  // --- 6. Add a stop to the route ---
  const addStopInput = page.getByRole('combobox', { name: 'Add a stop' });
  await addStopInput.click();
  await addStopInput.fill(STOP_A.slice(0, 14));
  await page.getByRole('option', { name: new RegExp(STOP_A) }).click();
  await page.getByRole('button', { name: /^add$/i }).click();
  await expect(page.getByRole('cell', { name: STOP_A })).toBeVisible({ timeout: 10000 });
});
