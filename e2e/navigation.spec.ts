import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test('should navigate between main pages', async ({ page }) => {
    await page.goto('/');

    // Wait for the app to load
    await page.waitForLoadState('networkidle');

    // Check if we're on the containers page by default
    await expect(page.locator('h1')).toContainText(/containers/i);

    // Navigate to Images page
    await page.click('text=Images');
    await expect(page.locator('h1')).toContainText(/images/i);

    // Navigate to Networks page
    await page.click('text=Networks');
    await expect(page.locator('h1')).toContainText(/networks/i);

    // Navigate to Volumes page
    await page.click('text=Volumes');
    await expect(page.locator('h1')).toContainText(/volumes/i);

    // Navigate to Settings page
    await page.click('text=Settings');
    await expect(page.locator('h1')).toContainText(/settings/i);

    // Navigate back to Containers page
    await page.click('text=Containers');
    await expect(page.locator('h1')).toContainText(/containers/i);
  });

  test('should maintain navigation state', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Navigate to Images page
    await page.click('text=Images');
    await expect(page.locator('h1')).toContainText(/images/i);

    // Refresh the page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Should still be on Images page
    await expect(page.locator('h1')).toContainText(/images/i);
  });
});
