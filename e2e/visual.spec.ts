import { test, expect } from '@playwright/test';

test.describe('Visual Regression Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should match containers page screenshot', async ({ page }) => {
    // Wait for any loading states to complete
    await page.waitForTimeout(2000);

    // Take screenshot of the entire page
    await expect(page).toHaveScreenshot('containers-page.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('should match navigation header screenshot', async ({ page }) => {
    // Focus on the header/navigation area
    const header = page.locator('header, nav, [role="navigation"]').first();

    if (await header.isVisible()) {
      await expect(header).toHaveScreenshot('navigation-header.png', {
        animations: 'disabled',
      });
    }
  });

  test('should match button variants screenshot', async ({ page }) => {
    // Navigate to a page with buttons or create a test scenario
    await page.click('text=Create Container');

    const dialog = page.locator('[role="dialog"]');
    if (await dialog.isVisible()) {
      // Wait for dialog to fully render
      await page.waitForTimeout(500);

      await expect(dialog).toHaveScreenshot('create-container-dialog.png', {
        animations: 'disabled',
      });
    }
  });

  test('should match responsive design screenshots', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(1000);

    await expect(page).toHaveScreenshot('containers-page-mobile.png', {
      fullPage: true,
      animations: 'disabled',
    });

    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(1000);

    await expect(page).toHaveScreenshot('containers-page-tablet.png', {
      fullPage: true,
      animations: 'disabled',
    });

    // Reset to desktop viewport
    await page.setViewportSize({ width: 1280, height: 720 });
  });

  test('should match theme variations', async ({ page }) => {
    // Test light theme (default)
    await expect(page).toHaveScreenshot('containers-page-light-theme.png', {
      fullPage: true,
      animations: 'disabled',
    });

    // Look for theme toggle and switch to dark theme
    const themeToggle = page.locator(
      '[data-testid="theme-toggle"], button:has-text("Theme")'
    );
    if (await themeToggle.isVisible()) {
      await themeToggle.click();
      await page.waitForTimeout(500);

      await expect(page).toHaveScreenshot('containers-page-dark-theme.png', {
        fullPage: true,
        animations: 'disabled',
      });
    }
  });

  test('should match loading states', async ({ page }) => {
    // Trigger a refresh or action that shows loading state
    const refreshButton = page.locator(
      'text=Refresh, button[aria-label*="refresh" i]'
    );

    if (await refreshButton.isVisible()) {
      await refreshButton.click();

      // Wait for loading state to appear
      await page.waitForTimeout(100);

      // Look for loading indicators
      const loadingIndicator = page.locator(
        '[data-testid="loading"], .loading, [aria-busy="true"]'
      );
      if (await loadingIndicator.isVisible()) {
        await expect(loadingIndicator).toHaveScreenshot('loading-state.png', {
          animations: 'disabled',
        });
      }
    }
  });
});
