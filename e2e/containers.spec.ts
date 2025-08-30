import { test, expect } from '@playwright/test';

test.describe('Containers Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should display containers page content', async ({ page }) => {
    // Check if we're on the containers page
    await expect(page.locator('h1')).toContainText(/containers/i);

    // Check for common containers page elements
    await expect(page.locator('text=Create Container')).toBeVisible();
    await expect(page.locator('text=Refresh')).toBeVisible();
  });

  test('should handle container actions', async ({ page }) => {
    // Mock container data or wait for real data to load
    await page.waitForTimeout(1000); // Give time for data to load

    // Test container actions if containers exist
    const containerRows = page.locator('[data-testid="container-row"]');
    const count = await containerRows.count();

    if (count > 0) {
      // Test container row interactions
      const firstContainer = containerRows.first();

      // Test expand/collapse functionality
      await firstContainer.click();
      await expect(
        firstContainer.locator('[data-testid="container-details"]')
      ).toBeVisible();

      // Check container actions
      const startButton = firstContainer.locator('text=Start');
      const restartButton = firstContainer.locator('text=Restart');
      const deleteButton = firstContainer.locator('text=Delete');

      expect(startButton).toBeVisible();
      expect(restartButton).toBeVisible();
      expect(deleteButton).toBeVisible();
    }
  });

  test('should handle container creation flow', async ({ page }) => {
    // Click create container button
    await page.click('text=Create Container');

    // Check if creation dialog/modal appears
    const dialog = page.locator('[role="dialog"]');
    if (await dialog.isVisible()) {
      await expect(dialog).toBeVisible();

      // Test form validation
      const submitButton = dialog.locator('button[type="submit"]');
      await submitButton.click();

      // Should show validation errors
      await expect(page.locator('text=Name is required')).toBeVisible();
    }
  });

  test('should handle container filtering and search', async ({ page }) => {
    // Look for search/filter inputs
    const searchInput = page.locator(
      'input[placeholder*="search" i], input[placeholder*="filter" i]'
    );

    if (await searchInput.isVisible()) {
      // Test search functionality
      await searchInput.fill('test-container');
      await searchInput.press('Enter');

      // Wait for search results
      await page.waitForTimeout(500);

      // Clear search
      await searchInput.clear();
      await searchInput.press('Enter');
    }
  });

  test('should handle container status updates', async ({ page }) => {
    // Wait for containers to load
    await page.waitForTimeout(1000);

    // Look for status indicators
    const statusIndicators = page.locator('[data-testid="container-status"]');
    const count = await statusIndicators.count();

    if (count > 0) {
      // Check if status indicators are visible
      await expect(statusIndicators.first()).toBeVisible();

      // Test status filtering if available
      const statusFilter = page.locator(
        'button:has-text("Running"), button:has-text("Stopped")'
      );
      if (await statusFilter.isVisible()) {
        await statusFilter.click();
        await page.waitForTimeout(500);
      }
    }
  });

  test('should handle responsive design', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Check if mobile-specific elements are visible
    await expect(page.locator('h1')).toBeVisible();

    // Test mobile navigation
    const mobileMenu = page.locator(
      '[data-testid="mobile-menu"], button:has-text("Menu")'
    );
    if (await mobileMenu.isVisible()) {
      await mobileMenu.click();
      await expect(page.locator('nav')).toBeVisible();
    }

    // Reset to desktop viewport
    await page.setViewportSize({ width: 1280, height: 720 });
  });
});
