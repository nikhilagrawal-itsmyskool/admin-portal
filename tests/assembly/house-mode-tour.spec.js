import { test, expect } from '@playwright/test';
import { loginAsEmployee } from '../helpers/auth';

/**
 * HOUSE-MODE guided tour — best watched headed & slow:
 *   cross-env HEADED=1 npx playwright test tests/assembly/house-mode-tour --headed
 *   (playwright.config sets slowMo:1000 when HEADED is set)
 *
 * Prerequisites:
 *   - Local stack on :3000 with the house-mode demo seeded
 *     (core-api: node scripts/seed-house-demo.js)
 *   - TEST_EMPLOYEE_USERNAME/PASSWORD in .env.test.local (an assembly.manage login)
 *
 * It walks every house-mode screen and pauses so a human can watch. Assertions
 * are lenient (headings + seeded content) so it reads as a demo, not a gate.
 */

const WING = 'The Morning Meridian';
// Linger on each screen so it's watchable; override with BEAT=<ms> (default 3500).
const beat = (page) => page.waitForTimeout(Number(process.env.BEAT) || 3500);

// Select an option in a MUI <TextField select> by its label.
async function selectByLabel(page, label, optionName) {
  await page.getByLabel(label, { exact: false }).first().click();
  await page.getByRole('option', { name: optionName, exact: false }).first().click();
}

test('house mode tour: settings → houses → roster → checklist → grading → leaderboard', async ({ page }) => {
  test.setTimeout(300000);
  await loginAsEmployee(page);

  // 1. Plans → open the Morning Meridian and show the tree + a roster slot.
  await page.goto('/assembly');
  await expect(page.getByRole('heading', { name: 'Assembly Plans' })).toBeVisible({ timeout: 15000 });
  await expect(page.getByText(WING).first()).toBeVisible();
  await beat(page);
  // Open the plan via its row's first action button ("Open / build").
  await page.getByRole('row', { name: new RegExp(WING) }).getByRole('button').first().click();
  await expect(page.getByRole('heading', { name: WING })).toBeVisible({ timeout: 15000 });
  await expect(page.getByText('Block I: The Harmonic Dawn')).toBeVisible();
  await expect(page.getByText('The Pulse Point')).toBeVisible();
  await beat(page);

  // 2. Settings — confirm house mode.
  await page.goto('/assembly/settings');
  await expect(page.getByRole('heading', { name: 'Assembly Settings' })).toBeVisible({ timeout: 15000 });
  await expect(page.getByText('House mode', { exact: true })).toBeVisible();
  await beat(page);

  // 3. Houses & Rotation — houses, leadership, rotation order, week pins.
  await page.goto('/assembly/houses');
  await expect(page.getByRole('heading', { name: /Houses & Rotation/ })).toBeVisible({ timeout: 15000 });
  await expect(page.getByText('Aravali').first()).toBeVisible();
  await expect(page.getByText('Rotation order')).toBeVisible();
  await beat(page);

  // 4. Roster — pick the wing; the current week's approved roster shows.
  await page.goto('/assembly/roster');
  await expect(page.getByRole('heading', { name: 'Weekly Roster' })).toBeVisible({ timeout: 15000 });
  await selectByLabel(page, 'Wing (plan)', WING);
  await expect(page.getByText(/House on duty|No house on duty/)).toBeVisible({ timeout: 15000 });
  // Expand the first day accordion to reveal anchors + slots.
  await page.getByText('Anchors (MCs)').first().waitFor({ timeout: 15000 }).catch(() => {});
  await beat(page);

  // 5. Checklist — configured items + per-week ticking.
  await page.goto('/assembly/checklist');
  await expect(page.getByRole('heading', { name: 'Assembly Checklist' })).toBeVisible({ timeout: 15000 });
  await expect(page.getByText(/roster approved/i)).toBeVisible();
  await beat(page);

  // 6. Grading — rubric + evaluators + a grade.
  await page.goto('/assembly/grading');
  await expect(page.getByRole('heading', { name: 'Assembly Grading' })).toBeVisible({ timeout: 15000 });
  await expect(page.getByText('Discipline').first()).toBeVisible();
  await expect(page.getByText('Evaluators').first()).toBeVisible();
  await beat(page);

  // 7. Leaderboard — house-of-the-month + chart.
  await page.goto('/assembly/leaderboard');
  await expect(page.getByRole('heading', { name: /House-of-the-Month/ })).toBeVisible({ timeout: 15000 });
  await expect(page.getByText('Standings')).toBeVisible();
  await beat(page);
});
