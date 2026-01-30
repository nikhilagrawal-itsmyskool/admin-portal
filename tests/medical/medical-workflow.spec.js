import { test, expect } from '@playwright/test';
import { loginAsEmployee } from '../helpers/auth';

/**
 * Medical Module UI Tests
 *
 * This test file runs a comprehensive workflow through the medical module:
 * 1. Login as employee
 * 2. Create medical items
 * 3. Add purchase logs
 * 4. Verify purchase search filters
 * 5. Test item action buttons (Purchase Log, Issue Log icons)
 * 6. Add issue logs for both Employee and Student
 * 7. Verify issue search filters
 *
 * Prerequisites:
 * - Backend API running with at least 1 student and 1 employee record
 * - Test credentials configured in .env.test.local
 * - App running on http://localhost:5173
 */

// Test data - unique names to avoid conflicts
const testTimestamp = Date.now();
const testItems = [
  {
    name: `Paracetamol 500mg (Test ${testTimestamp})`,
    unit: 'Tablets',
    reorderLevel: '50',
  },
  {
    name: `Bandage Roll (Test ${testTimestamp})`,
    unit: 'Rolls',
    reorderLevel: '20',
  },
  {
    name: `Antiseptic Cream (Test ${testTimestamp})`,
    unit: 'Tubes',
    reorderLevel: '10',
  },
];

// Store created item UUIDs for later use
const createdItems = {};

// Helper to get today's date in YYYY-MM-DD format
function getDateString(daysOffset = 0) {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  return date.toISOString().split('T')[0];
}

test.describe('Medical Module Workflow', () => {
  // Use serial mode to ensure tests run in order
  test.describe.configure({ mode: 'serial' });

  test.beforeAll(async ({ browser }) => {
    // This runs once before all tests in this describe block
    console.log('Starting Medical Module UI Tests...');
  });

  test('Step 1: Login as employee', async ({ page }) => {
    await loginAsEmployee(page);

    // Verify we're on the dashboard
    await expect(page.locator('text=Welcome back')).toBeVisible();
    console.log('Login successful');
  });

  test('Step 2: Create medical items', async ({ page }) => {
    // Login first (each test gets a fresh page)
    await loginAsEmployee(page);

    // Navigate to items page
    await page.goto('/medical/items');
    await expect(page.getByRole('heading', { name: 'Inventory Items' })).toBeVisible();

    // Create each test item
    for (const item of testItems) {
      console.log(`Creating item: ${item.name}`);

      // Click Add Item button
      await page.getByRole('button', { name: /add item/i }).click();

      // Wait for form to load
      await expect(page.locator('text=Add New Item')).toBeVisible();

      // Fill in the form
      await page.getByLabel(/item name/i).fill(item.name);

      // Select unit from dropdown
      await page.getByLabel(/unit/i).click();
      await page.getByRole('option', { name: item.unit }).click();

      // Fill reorder level
      await page.getByLabel(/reorder level/i).fill(item.reorderLevel);

      // Submit the form
      await page.getByRole('button', { name: /create item/i }).click();

      // Wait for redirect back to list
      await page.waitForURL('/medical/items');

      // Verify item appears in grid
      await expect(page.getByRole('cell', { name: item.name })).toBeVisible({ timeout: 10000 });
      console.log(`Item created: ${item.name}`);
    }

    // Verify all 3 items are visible
    for (const item of testItems) {
      await expect(page.getByRole('cell', { name: item.name })).toBeVisible();
    }
    console.log('All 3 items created successfully');
  });

  test('Step 3: Add purchase logs', async ({ page }) => {
    await loginAsEmployee(page);

    // Navigate to purchases page
    await page.goto('/medical/purchases');
    await expect(page.getByRole('heading', { name: 'Purchase Log' })).toBeVisible();

    // Add purchase for first item (Paracetamol)
    console.log('Adding purchase for Paracetamol...');
    await page.getByRole('button', { name: /add purchase/i }).click();
    await expect(page.locator('text=Add New Purchase')).toBeVisible();

    // Select item from autocomplete
    await page.getByLabel(/item/i).click();
    await page.getByRole('option', { name: new RegExp(testItems[0].name.replace(/[()]/g, '\\$&')) }).click();

    // Fill purchase details
    await page.getByLabel(/purchase date/i).fill(getDateString());
    await page.getByLabel(/quantity/i).fill('100');
    await page.getByLabel(/batch number/i).fill('BATCH001');
    await page.getByLabel(/expiry date/i).fill(getDateString(365)); // 1 year from now
    await page.getByLabel(/supplier/i).fill('Test Supplier A');

    // Submit
    await page.getByRole('button', { name: /create purchase/i }).click();
    await page.waitForURL('/medical/purchases');
    console.log('Paracetamol purchase created');

    // Add purchase for second item (Bandage)
    console.log('Adding purchase for Bandage...');
    await page.getByRole('button', { name: /add purchase/i }).click();
    await expect(page.locator('text=Add New Purchase')).toBeVisible();

    // Select item
    await page.getByLabel(/item/i).click();
    await page.getByRole('option', { name: new RegExp(testItems[1].name.replace(/[()]/g, '\\$&')) }).click();

    // Fill purchase details - yesterday's date
    await page.getByLabel(/purchase date/i).fill(getDateString(-1));
    await page.getByLabel(/quantity/i).fill('50');
    await page.getByLabel(/batch number/i).fill('BATCH002');
    await page.getByLabel(/expiry date/i).fill(getDateString(180)); // 6 months from now
    await page.getByLabel(/supplier/i).fill('Test Supplier B');

    // Submit
    await page.getByRole('button', { name: /create purchase/i }).click();
    await page.waitForURL('/medical/purchases');
    console.log('Bandage purchase created');

    // Verify both purchases appear in grid
    await expect(page.getByRole('cell', { name: /BATCH001/i })).toBeVisible();
    await expect(page.getByRole('cell', { name: /BATCH002/i })).toBeVisible();
    console.log('Both purchases verified in grid');
  });

  test('Step 4: Verify purchase search panel', async ({ page }) => {
    await loginAsEmployee(page);
    await page.goto('/medical/purchases');

    // Wait for grid to load
    await expect(page.getByRole('heading', { name: 'Purchase Log' })).toBeVisible();
    await page.waitForTimeout(1000); // Wait for data to load

    // Test item filter - select Paracetamol
    console.log('Testing item filter...');
    const itemAutocomplete = page.locator('[role="combobox"]').first();
    await itemAutocomplete.click();
    await page.getByRole('option', { name: new RegExp(testItems[0].name.replace(/[()]/g, '\\$&')) }).click();

    // Wait for filter to apply
    await page.waitForTimeout(500);

    // Verify only Paracetamol purchase shown (BATCH001)
    await expect(page.getByRole('cell', { name: /BATCH001/i })).toBeVisible();
    // BATCH002 should not be visible
    await expect(page.getByRole('cell', { name: /BATCH002/i })).not.toBeVisible();
    console.log('Item filter working correctly');

    // Test date range filter
    console.log('Testing date range filter...');
    await page.getByLabel(/start date/i).fill(getDateString());
    await page.getByLabel(/end date/i).fill(getDateString());
    await page.getByRole('button', { name: /search/i }).click();
    await page.waitForTimeout(500);

    // Should still show BATCH001 (today's date)
    await expect(page.getByRole('cell', { name: /BATCH001/i })).toBeVisible();
    console.log('Date filter working correctly');

    // Test clear button
    console.log('Testing clear button...');
    await page.getByRole('button', { name: /clear/i }).click();
    await page.waitForTimeout(500);

    // All purchases should be visible again
    await expect(page.getByRole('cell', { name: /BATCH001/i })).toBeVisible();
    await expect(page.getByRole('cell', { name: /BATCH002/i })).toBeVisible();
    console.log('Clear button working correctly - all purchases visible');
  });

  test('Step 5: Verify item action buttons', async ({ page }) => {
    await loginAsEmployee(page);
    await page.goto('/medical/items');

    // Wait for grid to load
    await expect(page.getByRole('heading', { name: 'Inventory Items' })).toBeVisible();
    await page.waitForTimeout(1000);

    // Find the row with Paracetamol
    const paracetamolRow = page.locator('div[data-field="actions"]').filter({
      has: page.locator('..').filter({
        has: page.locator(`text=${testItems[0].name}`)
      })
    });

    // Since we can't easily filter, let's use a different approach
    // Find the Purchase Log icon button and click it
    console.log('Testing Purchase Log action button...');

    // Get all rows and find the one with our item
    const rows = page.locator('.MuiDataGrid-row');
    const paracetamolRowLocator = rows.filter({
      hasText: testItems[0].name
    });

    // Click the Purchase Log icon (second icon button in the actions cell)
    await paracetamolRowLocator.locator('button[title="View Purchase Log"]').click();

    // Verify navigation to purchases with item filter
    await expect(page).toHaveURL(/\/medical\/purchases\?item=/);
    console.log('Navigated to purchases with item filter');

    // Verify the filter shows our item
    await page.waitForTimeout(500);
    await expect(page.getByRole('cell', { name: /BATCH001/i })).toBeVisible();
    console.log('Purchase Log icon working correctly');

    // Go back to items
    await page.goto('/medical/items');
    await page.waitForTimeout(1000);

    // Test Issue Log icon
    console.log('Testing Issue Log action button...');
    const paracetamolRow2 = page.locator('.MuiDataGrid-row').filter({
      hasText: testItems[0].name
    });
    await paracetamolRow2.locator('button[title="View Issue Log"]').click();

    // Verify navigation to issues with item filter
    await expect(page).toHaveURL(/\/medical\/issues\?item=/);
    console.log('Issue Log icon working correctly');
  });

  test('Step 6: Add issue logs (Employee and Student flows)', async ({ page }) => {
    await loginAsEmployee(page);

    // Navigate to issue form
    await page.goto('/medical/issues/add');
    await expect(page.locator('text=Issue Medical Item')).toBeVisible();

    // ---- TEST EMPLOYEE FLOW ----
    console.log('Testing Employee issue flow...');

    // Select item (Paracetamol)
    await page.getByLabel(/item/i).click();
    await page.getByRole('option', { name: new RegExp(testItems[0].name.replace(/[()]/g, '\\$&')) }).click();

    // Select "Employee" as entity type
    await page.getByLabel(/issue to/i).click();
    await page.getByRole('option', { name: /employee/i }).click();

    // Verify Parent Consent is NOT visible for employees
    await expect(page.locator('text=Parent/Guardian Consent')).not.toBeVisible();
    console.log('Parent consent NOT shown for employee (correct)');

    // Click search icon to open Employee Search Dialog
    const employeeSearchBtn = page.locator('label:has-text("Employee")').locator('..').locator('button');
    await employeeSearchBtn.click();

    // Wait for dialog
    await expect(page.locator('text=Search Employee')).toBeVisible();
    console.log('Employee Search Dialog opened');

    // Search by clicking search with empty fields should show error
    await page.getByRole('button', { name: /search/i }).click();
    await expect(page.locator('text=Please enter a name or select a department')).toBeVisible();

    // Enter a search term (search for any employee)
    await page.getByLabel(/employee name/i).fill('a'); // Search for any name containing 'a'
    await page.getByRole('button', { name: /search/i }).click();

    // Wait for results
    await page.waitForTimeout(1000);

    // Select the first employee in results
    const selectBtn = page.locator('table').locator('button:has-text("Select")').first();
    if (await selectBtn.isVisible()) {
      await selectBtn.click();
      console.log('Employee selected from search');
    } else {
      // If no results, search with different term
      await page.getByLabel(/employee name/i).clear();
      await page.getByLabel(/employee name/i).fill('e');
      await page.getByRole('button', { name: /search/i }).click();
      await page.waitForTimeout(1000);
      await page.locator('table').locator('button:has-text("Select")').first().click();
      console.log('Employee selected from search (second attempt)');
    }

    // Verify employee info displays
    await expect(page.locator('text=Name:')).toBeVisible();
    console.log('Employee info displayed');

    // Fill quantity and remarks
    await page.getByLabel(/quantity/i).fill('2');
    await page.getByLabel(/remarks/i).fill('Test issue for employee - headache');

    // Submit the form
    await page.getByRole('button', { name: /issue item/i }).click();

    // Wait for redirect to issue list
    await page.waitForURL('/medical/issues');
    console.log('Employee issue created successfully');

    // ---- TEST STUDENT FLOW ----
    console.log('Testing Student issue flow...');

    // Click Add Issue to create another
    await page.getByRole('button', { name: /add issue/i }).click();
    await expect(page.locator('text=Issue Medical Item')).toBeVisible();

    // Select item (Bandage)
    await page.getByLabel(/item/i).click();
    await page.getByRole('option', { name: new RegExp(testItems[1].name.replace(/[()]/g, '\\$&')) }).click();

    // Student is selected by default, verify it
    await expect(page.getByLabel(/issue to/i)).toHaveValue('student');

    // Verify Parent Consent warning IS visible for students
    await expect(page.locator('text=please ensure parent/guardian consent')).toBeVisible();
    await expect(page.locator('text=Parent/Guardian Consent Obtained')).toBeVisible();
    console.log('Parent consent warning shown for student (correct)');

    // Click search icon to open Student Search Dialog
    const studentSearchBtn = page.locator('label:has-text("Student")').locator('..').locator('button');
    await studentSearchBtn.click();

    // Wait for dialog
    await expect(page.locator('text=Search Student')).toBeVisible();
    console.log('Student Search Dialog opened');

    // Enter a search term
    await page.getByLabel(/student name/i).fill('a');
    await page.getByRole('button', { name: /search/i }).click();

    // Wait for results
    await page.waitForTimeout(1000);

    // Select the first student
    const studentSelectBtn = page.locator('table').locator('button:has-text("Select")').first();
    if (await studentSelectBtn.isVisible()) {
      await studentSelectBtn.click();
      console.log('Student selected from search');
    } else {
      // Try different search
      await page.getByLabel(/student name/i).clear();
      await page.getByLabel(/student name/i).fill('e');
      await page.getByRole('button', { name: /search/i }).click();
      await page.waitForTimeout(1000);
      await page.locator('table').locator('button:has-text("Select")').first().click();
    }

    // Verify student info displays
    await expect(page.locator('text=Class:')).toBeVisible();
    console.log('Student info displayed');

    // Fill quantity
    await page.getByLabel(/quantity/i).fill('1');

    // Check parent consent checkbox
    await page.getByLabel(/Parent\/Guardian Consent Obtained/i).check();
    console.log('Parent consent checkbox checked');

    // Fill remarks
    await page.getByLabel(/remarks/i).fill('Test issue for student - minor scrape');

    // Submit the form
    await page.getByRole('button', { name: /issue item/i }).click();

    // Wait for redirect to issue list
    await page.waitForURL('/medical/issues');
    console.log('Student issue created successfully');
  });

  test('Step 7: Verify issue search panel', async ({ page }) => {
    await loginAsEmployee(page);
    await page.goto('/medical/issues');

    // Wait for grid to load
    await expect(page.getByRole('heading', { name: 'Issue Log' })).toBeVisible();
    await page.waitForTimeout(1000);

    // Verify both issues appear
    console.log('Verifying both issues appear in grid...');
    await expect(page.getByRole('cell', { name: /test issue for employee/i })).toBeVisible();
    await expect(page.getByRole('cell', { name: /test issue for student/i })).toBeVisible();
    console.log('Both issues visible in grid');

    // Test entity type filter - select Student
    console.log('Testing entity type filter - Student...');
    await page.getByLabel(/issue to/i).click();
    await page.getByRole('option', { name: /student/i }).click();
    await page.waitForTimeout(500);

    // Should only show student issue
    await expect(page.getByRole('cell', { name: /test issue for student/i })).toBeVisible();
    await expect(page.getByRole('cell', { name: /test issue for employee/i })).not.toBeVisible();
    console.log('Student filter working correctly');

    // Test entity type filter - select Employee
    console.log('Testing entity type filter - Employee...');
    await page.getByLabel(/issue to/i).click();
    await page.getByRole('option', { name: /employee/i }).click();
    await page.waitForTimeout(500);

    // Should only show employee issue
    await expect(page.getByRole('cell', { name: /test issue for employee/i })).toBeVisible();
    await expect(page.getByRole('cell', { name: /test issue for student/i })).not.toBeVisible();
    console.log('Employee filter working correctly');

    // Clear filters
    console.log('Testing clear button...');
    await page.getByRole('button', { name: /clear/i }).click();
    await page.waitForTimeout(500);

    // Both should be visible again
    await expect(page.getByRole('cell', { name: /test issue for employee/i })).toBeVisible();
    await expect(page.getByRole('cell', { name: /test issue for student/i })).toBeVisible();
    console.log('Clear button working correctly - all issues visible');

    // Test item filter
    console.log('Testing item filter...');
    const itemAutocomplete = page.locator('[role="combobox"]').first();
    await itemAutocomplete.click();
    await page.getByRole('option', { name: new RegExp(testItems[0].name.replace(/[()]/g, '\\$&')) }).click();
    await page.waitForTimeout(500);

    // Should only show Paracetamol issue (employee)
    await expect(page.getByRole('cell', { name: /test issue for employee/i })).toBeVisible();
    await expect(page.getByRole('cell', { name: /test issue for student/i })).not.toBeVisible();
    console.log('Item filter working correctly');

    console.log('\n=== ALL TESTS PASSED ===');
    console.log('Medical module workflow completed successfully!');
  });
});
