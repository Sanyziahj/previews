import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  timeout: 180000,
  expect: { timeout: 20000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    channel: 'chrome',
    baseURL: 'http://127.0.0.1:4175',
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 1,
    launchOptions: { args: ['--no-sandbox', '--disable-dev-shm-usage'] },
  },
  webServer: {
    command: 'python3 -m http.server 4175',
    cwd: '/agent/repos/previews',
    port: 4175,
    reuseExistingServer: true,
  },
});
