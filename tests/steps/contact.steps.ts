import { expect } from '@playwright/test';
import { Given, When, Then } from '../fixtures/bdd';
import { ContactFactory } from '../factories/contactFactory';

Given('que eu navego para a lista de Contatos', async ({ contactPage }) => {
  await contactPage.navigate();
});

When('eu crio um contato com nome único', async ({ contactPage, testContext }) => {
  const data = ContactFactory.buildMinimal();
  testContext.name = ContactFactory.getDisplayName(data);
  await contactPage.createContact(data);
});

When('eu navego para a lista de Contatos', async ({ contactPage }) => {
  await contactPage.navigate();
});

When('eu excluo o contato', async ({ contactPage, testContext }) => {
  await contactPage.deleteContact(testContext.name);
});

When('eu tento salvar um contato com campos obrigatórios vazios', async ({ contactPage }) => {
  await contactPage.clickNew();
  await contactPage.save();
});

Then('o título da página deve conter o nome do contato', async ({ contactPage, testContext }) => {
  const title = await contactPage.getRecordTitle();
  expect(title).toContain(testContext.name);
});

Then('o contato deve estar visível na lista', async ({ contactPage, testContext }) => {
  await expect(contactPage.getListItem(testContext.name)).toBeVisible();
});

Then('o contato não deve estar visível na lista', async ({ contactPage, testContext }) => {
  await expect(contactPage.getListItem(testContext.name)).toBeHidden();
});

Then('eu excluo o contato criado', async ({ contactPage, testContext }) => {
  await contactPage.deleteContact(testContext.name);
});
