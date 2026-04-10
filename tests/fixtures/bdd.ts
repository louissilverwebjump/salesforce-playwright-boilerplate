import { test as base, createBdd } from 'playwright-bdd';
import { AccountPage } from '../pages/AccountPage';
import { ContactPage } from '../pages/ContactPage';

type Fixtures = {
  accountPage: AccountPage;
  contactPage: ContactPage;
  testContext: Record<string, any>;
};

export const test = base.extend<Fixtures>({
  accountPage: async ({ page }, use) => {
    await use(new AccountPage(page));
  },
  contactPage: async ({ page }, use) => {
    await use(new ContactPage(page));
  },
  testContext: async ({}, use) => {
    await use({});
  },
});

export const { Given, When, Then } = createBdd(test);
