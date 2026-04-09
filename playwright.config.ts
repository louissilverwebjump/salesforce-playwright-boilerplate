import { defineConfig, devices } from '@playwright/test';
import { defineBddConfig } from 'playwright-bdd';
import dotenv from 'dotenv';
import path from 'path';

const envFile = process.env.ENV_FILE ?? '.env';
dotenv.config({ path: path.resolve(__dirname, envFile) });

const envName = envFile.replace(/^\.env\.?/, '') || 'default';
const storageStatePath = `.auth/salesforce-${envName}.json`;

const testDir = defineBddConfig({
  features: './tests/features/**/*.feature',
  steps: ['./tests/steps/**/*.ts', './tests/fixtures/bdd.ts'],
});

export default defineConfig({
  globalSetup: './playwright.global-setup.ts',
  testDir: './tests',
  timeout: 60_000,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [['html'], ['list']],

  expect: {
    timeout: 15_000,
    toHaveScreenshot: { maxDiffPixelRatio: 0.01 },
  },

  snapshotPathTemplate: `{testDir}/__screenshots__/${envName}/{testFilePath}/{arg}{ext}`,

  use: {
    baseURL:
      process.env.SF_BASE_URL ?? 'https://orgfarm-4823e5f7b8-dev-ed.develop.my.salesforce.com',
    trace: 'on',
    screenshot: 'only-on-failure',
    video: 'off',
    actionTimeout: 15_000,
    navigationTimeout: 60_000,
    bypassCSP: true,
  },

  projects: [
    {
      name: 'setup',
      testMatch: '**/auth.setup.ts',
    },
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: storageStatePath,
      },
      dependencies: ['setup'],
      testDir,
      testMatch: '**/*.feature.spec.js',
    },
  ],
});
