import { test as base, createBdd } from 'playwright-bdd';
import { AccountPage } from '../pages/AccountPage';

type Fixtures = {
  accountPage: AccountPage;
  testContext: Record<string, any>;
};

export const test = base.extend<Fixtures>({
  accountPage: async ({ page }, use) => {
    await use(new AccountPage(page));
  },
  testContext: async ({}, use) => {
    await use({});
  },
});

export const { Given, When, Then } = createBdd(test);
