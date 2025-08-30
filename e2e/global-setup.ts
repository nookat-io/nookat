import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  const { baseURL } = config.projects[0].use;

  // Start browser and perform any global setup
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    // Wait for the app to be ready
    await page.goto(baseURL!);
    await page.waitForLoadState('networkidle');

    // Any global setup logic can go here
    // For example, setting up test data, authentication, etc.

    console.log('Global setup completed successfully');
  } catch (error) {
    console.error('Global setup failed:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

export default globalSetup;
