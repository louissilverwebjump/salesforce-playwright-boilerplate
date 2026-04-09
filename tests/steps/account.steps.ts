import { expect } from '@playwright/test';
import { Given, When, Then } from '../fixtures/bdd';
import { AccountFactory } from '../factories/accountFactory';

Given('que eu navego para a lista de Contas', async ({ accountPage }) => {
  await accountPage.navigate();
});

When('eu crio uma conta com nome único', async ({ accountPage, testContext }) => {
  const data = AccountFactory.buildMinimal();
  testContext.name = data.name;
  await accountPage.createAccount(data.name);
});

When('eu navego para a lista de Contas', async ({ accountPage }) => {
  await accountPage.navigate();
});

When('eu excluo a conta', async ({ accountPage, testContext }) => {
  await accountPage.deleteAccount(testContext.name);
});

When('eu abro o modal de nova conta', async ({ accountPage }) => {
  await accountPage.clickNew();
});

When('eu preencho todos os campos da conta', async ({ accountPage, testContext }) => {
  const data = AccountFactory.buildComplete();
  testContext.name = data.name;
  await accountPage.fillAllFields(data);
});

When('eu crio uma conta com informações parciais', async ({ accountPage, testContext }) => {
  const data = AccountFactory.buildPartial([
    'rating',
    'phone',
    'industry',
    'billingCountry',
    'billingState',
  ]);
  testContext.name = data.name;
  await accountPage.clickNew();
  await accountPage.fillAllFields(data);
  await accountPage.save();
  await accountPage.waitForRecordPage();
});

When('eu salvo o registro', async ({ accountPage }) => {
  await accountPage.save();
});

When('eu aguardo a página do registro', async ({ accountPage }) => {
  await accountPage.waitForRecordPage();
});

When(
  'eu preencho e limpo todos os campos de uma nova conta',
  async ({ accountPage, testContext }) => {
    const data = AccountFactory.buildComplete();
    testContext.name = data.name;
    await accountPage.clickNew();
    await accountPage.fillAllFields(data);
    await accountPage.clearAllFields();
  },
);

When(
  'eu tenta salvar uma conta com campos obrigatórios vazios',
  async ({ accountPage, testContext }) => {
    const data = AccountFactory.buildComplete();
    testContext.name = data.name;
    await accountPage.clickNew();
    await accountPage.fillAllFields(data);
    await accountPage.clearAllFields();
    await accountPage.save();
  },
);

When('eu fecho o erro de validação e cancelo', async ({ accountPage, page }) => {
  await accountPage.validationError.close();
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
});

Then('o título da página deve conter o nome da conta', async ({ accountPage, testContext }) => {
  const titulo = await accountPage.getRecordTitle();
  expect(titulo).toContain(testContext.name);
});

Then('a conta deve estar visível na lista', async ({ accountPage, testContext }) => {
  await expect(accountPage.getListItem(testContext.name)).toBeVisible();
});

Then('a conta não deve estar visível na lista', async ({ accountPage, testContext }) => {
  await expect(accountPage.getListItem(testContext.name)).toBeHidden();
});

Then('o título da página deve ser igual ao nome da conta', async ({ accountPage, testContext }) => {
  const title = await accountPage.getRecordTitle();
  expect(title).toBe(testContext.name);
});

Then('eu excluo a conta criada', async ({ accountPage, testContext }) => {
  await accountPage.deleteAccount(testContext.name);
});

Then('todos os campos da conta devem estar vazios', async ({ accountPage }) => {
  await accountPage.expectAllFieldsEmpty();
});

Then('o erro inline do campo Account Name deve estar visível', async ({ accountPage }) => {
  await expect(accountPage.accountNameField.inlineError).toBeVisible();
});

Then('o diálogo de erro de validação deve estar visível', async ({ accountPage }) => {
  await expect(accountPage.validationError.dialog).toBeVisible();
});

Then(
  'o erro de validação deve mostrar link para {string}',
  async ({ accountPage }, fieldName: string) => {
    await expect(accountPage.validationError.getFieldLink(fieldName)).toBeVisible();
  },
);
