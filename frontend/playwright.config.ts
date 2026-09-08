import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/browser',
  timeout: 45000,
  workers: 2,
  use: {
    baseURL: process.env.TEST_BASE_URL || 'http://127.0.0.1:3100',
    viewport: { width: 1440, height: 900 },
    trace: 'retain-on-failure',
  },
  webServer: process.env.TEST_BASE_URL
    ? undefined
    : {
        command: 'npm run dev -- --hostname 127.0.0.1 --port 3100',
        url: 'http://127.0.0.1:3100',
        reuseExistingServer: !process.env.CI,
        env: { NEXT_PUBLIC_DATA_MODE: 'static' },
      },
});
