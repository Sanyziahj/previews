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
    baseURL: 'http://127.0.0.1:4219',
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 1,
    launchOptions: { args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-angle=swiftshader', '--enable-webgl'] },
  },
  webServer: {
    command: 'python3 -m http.server 4219',
    cwd: '/workspace',
    port: 4219,
    reuseExistingServer: true,
  },
});
