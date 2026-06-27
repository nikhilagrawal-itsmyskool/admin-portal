import { test, expect } from '@playwright/test';
import { loginAsEmployee } from '../helpers/auth';

/**
 * Student Module UI Smoke Test
 *
 * End-to-end happy path against the live local backend (gateway on :3000, school SS1):
 *   1. Login as employee
 *   2. Create a House
 *   3. Admit a student (assigning that House)
 *   4. Land on the student's profile; verify identity + House
 *   5. Add a guardian; verify it renders
 *   6. Search the list by admission number; verify the row appears
 *   7. Open the Promote Class dialog; verify it renders
 *
 * Prerequisites:
 *   - Backend running on http://localhost:3000 (auth, student, classes, academic-years)
 *   - Test credentials in .env.test.local
 *   - App auto-started by Playwright webServer on :5173
 */

const ts = Date.now();
const HOUSE_NAME = `Tagore ${ts}`;
const STUDENT_NAME = `Smoke Student ${ts}`;
const ADM_NO = `SMK-${ts}`;
const GUARDIAN_NAME = `Rajesh ${ts}`;

test('student admin happy path: house, admit, guardian, search, promote', async ({ page }) => {
  await loginAsEmployee(page);

  // --- 1. Create a House ---
  await page.goto('/students/houses');
  await expect(page.getByRole('heading', { name: 'Houses' })).toBeVisible();
  await page.getByRole('button', { name: /add house/i }).click();
  await page.getByLabel(/name/i).first().fill(HOUSE_NAME);
  await page.getByRole('button', { name: /^save$/i }).click();
  await expect(page.getByText(HOUSE_NAME)).toBeVisible({ timeout: 10000 });

  // --- 2. Admit a student (with initial enrollment + a communication preference) ---
  await page.goto('/students/new');
  await expect(page.getByRole('heading', { name: 'Admit Student' })).toBeVisible();
  await page.getByLabel(/^Name/).first().fill(STUDENT_NAME);
  await page.getByLabel(/Admission #/i).fill(ADM_NO);

  // Assign the House via the autocomplete
  const houseInput = page.getByRole('combobox', { name: 'House' });
  await houseInput.click();
  await houseInput.fill(HOUSE_NAME.slice(0, 12));
  await page.getByRole('option', { name: HOUSE_NAME }).click();

  // Initial enrollment: pick the first academic year + class (so the grid shows a class).
  await page.getByRole('combobox', { name: 'Academic year' }).click();
  await page.getByRole('option').first().click();
  await page.getByRole('combobox', { name: 'Class' }).click();
  const firstClassOption = page.getByRole('option').first();
  const className = ((await firstClassOption.textContent()) || '').trim();
  await firstClassOption.click();

  // Communication preference: Mother first / WhatsApp -> stored as "mother:whatsapp".
  await page.getByRole('combobox', { name: 'Contact preference' }).click();
  await page.getByRole('option', { name: 'Mother first' }).click();

  await page.getByRole('button', { name: /admit student/i }).click();

  // --- 3. Land on profile; verify identity + House + class + comm preference ---
  await expect(page.getByRole('heading', { name: STUDENT_NAME })).toBeVisible({ timeout: 10000 });
  await expect(page.getByText(ADM_NO)).toBeVisible();
  await expect(page.getByText(HOUSE_NAME)).toBeVisible();
  await expect(page.getByText('Mother first (WhatsApp)')).toBeVisible();
  if (className) await expect(page.getByText(className, { exact: false }).first()).toBeVisible();

  // --- 4. Add a guardian with a phone; as god the contact shows UNMASKED ---
  await page.getByRole('button', { name: /^add$/i }).click();
  await expect(page.getByRole('heading', { name: 'Add Guardian' })).toBeVisible();
  // relation defaults to 'father'; fill name + mobile and save
  await page.getByLabel('Name').fill(GUARDIAN_NAME);
  await page.getByLabel('Mobile').fill('9810054521');
  await page.getByRole('button', { name: /^save$/i }).click();
  await expect(page.getByText(GUARDIAN_NAME)).toBeVisible({ timeout: 10000 });
  await expect(page.getByText('9810054521')).toBeVisible(); // god/admin sees full, unmasked

  // --- 5. Search the list by admission number; class column is populated ---
  await page.goto('/students');
  await expect(page.getByRole('heading', { name: 'Students' })).toBeVisible();
  await page.getByRole('textbox', { name: 'Adm #' }).fill(ADM_NO);
  await page.getByRole('button', { name: /^search$/i }).click();
  await expect(page.getByText(STUDENT_NAME)).toBeVisible({ timeout: 10000 });
  if (className) await expect(page.getByText(className, { exact: false }).first()).toBeVisible();

  // --- 6. Open the Promote Class dialog (renders source/target controls) ---
  await page.getByRole('button', { name: /promote class/i }).click();
  await expect(page.getByRole('heading', { name: 'Promote Class' })).toBeVisible();
  await expect(page.getByLabel('From class')).toBeVisible();
  await expect(page.getByLabel('To class')).toBeVisible();
});
