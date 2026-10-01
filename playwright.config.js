import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30000,
  expect: { timeout: 5000 },
  workers: 2,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: process.env.TUVAL_BASE_URL || 'http://127.0.0.1:4173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } }, testMatch: ['studio.spec.js', 'dock.spec.js'] },
    { name: 'touch', use: { ...devices['Pixel 7'], viewport: { width: 390, height: 844 } }, testMatch: ['studio.spec.js', 'dock.spec.js'] },
    { name: 'safari', use: { ...devices['iPad (gen 7)'] }, testMatch: 'safari.spec.js' },
  ],
  webServer: process.env.TUVAL_BASE_URL ? undefined : {
    command: 'npm run preview',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 30000,
  },
});
