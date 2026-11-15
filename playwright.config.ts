import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.SUT_PORT ?? 4173);
const baseURL = process.env.BASE_URL ?? `http://localhost:${PORT}`;
const isCI = !!process.env.CI;

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  workers: isCI ? 2 : undefined,
  reporter: isCI
    ? [['list'], ['html', { open: 'never' }], ['junit', { outputFile: 'test-results/junit.xml' }], ['github']]
    : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL,
    channel: 'chrome',
    testIdAttribute: 'data-testid',
    locale: 'de-DE',
    timezoneId: 'Europe/Berlin',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    acceptDownloads: true,
  },
  projects: [
    { name: 'ui', use: { ...devices['Desktop Chrome'], channel: 'chrome' }, testIgnore: /api\// },
    { name: 'api', testMatch: /api\/.*\.spec\.ts/ },
  ],
  webServer: process.env.BASE_URL
    ? undefined
    : { command: 'node sut/server.mjs', url: `${baseURL}/health`, reuseExistingServer: !isCI, env: { SUT_PORT: String(PORT) } },
});
