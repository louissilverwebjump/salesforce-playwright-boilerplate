# Padrão de Herança com BasePage

## Visão Geral

Este projeto utiliza uma hierarquia de herança de classes para compartilhar a lógica de automação específica do Salesforce entre todos os page objects. Toda página de objeto (`AccountPage`, etc.) estende `BasePage`, que centraliza as operações comuns a todas as páginas do Salesforce Lightning.

```
BasePage
└── AccountPage
```

---

## Como Funciona

### `BasePage` — a base compartilhada

`BasePage` contém tudo que é idêntico para todos os objetos Salesforce Lightning:

| O quê                        | Onde                | Descrição                                          |
| ---------------------------- | ------------------- | -------------------------------------------------- |
| `newButton`                  | Propriedade Locator | Botão "New" na barra de ferramentas                |
| `saveButton`                 | Propriedade Locator | Botão "Save" no modal                              |
| `deleteButton`               | Propriedade Locator | Botão "Delete" no diálogo de confirmação           |
| `actionsMenuButton`          | Propriedade Locator | Menu kebab no cabeçalho do registro                |
| `modal`                      | Propriedade Locator | Contêiner `.slds-modal`                            |
| `navigateToObject(apiName)`  | Método              | Navega para a lista e aguarda renderização         |
| `clickNew()`                 | Método              | Abre o modal de criação                            |
| `save()`                     | Método              | Clica em Save no modal                             |
| `confirmDelete()`            | Método              | Confirma o diálogo de exclusão                     |
| `openActionsMenu()`          | Método              | Abre o menu de ações do registro                   |
| `clickActionMenuItem(label)` | Método              | Clica em um item dentro do menu                    |
| `getListItem(name)`          | Método              | Localiza um link de registro na lista              |
| `getRecordTitle()`           | Método              | Lê o nome do registro a partir do título da página |
| `waitForRecordPage()`        | Método              | Aguarda a renderização da página de registro       |
| `waitForListPage(apiName)`   | Método              | Aguarda o recarregamento da lista                  |

### Subclasses — a camada específica do objeto

Cada subclasse adiciona apenas o que é único para aquele objeto Salesforce: locators dos campos do modal e um atalho `navigate()` que define o nome de API do objeto.

```typescript
// BasePage — compartilhado
async navigateToObject(objectApiName: string) { ... }

// AccountPage — atalho específico
async navigate() {
  await this.navigateToObject('Account');  // nome de API fixo
}
```

O construtor da subclasse chama `super(page)` para inicializar o `BasePage` e depois declara seus próprios locators de campo:

```typescript
export class AccountPage extends BasePage {
  readonly accountNameField: Locator;

  constructor(page: Page) {
    super(page); // inicializa newButton, saveButton, modal, etc.
    this.accountNameField = page.getByRole('dialog').getByRole('textbox', { name: 'Account Name' });
  }
}
```

Como todos os locators compartilhados vivem no `BasePage`, um método da subclasse pode usar `this.clickNew()`, `this.save()`, `this.getListItem()` diretamente — sem nenhuma duplicação:

```typescript
async createAccount(name: string) {
  await this.clickNew();           // BasePage
  await this.fillName(name);       // AccountPage — usa this.accountNameField
  await this.save();               // BasePage
  await this.waitForRecordPage();  // BasePage
}
```

---

## Benefícios

### 1. DRY — sem implementação repetida

Sem herança, cada classe de página precisaria reimplementar `clickNew`, `save`, `confirmDelete`, `waitForRecordPage`, etc. Com herança, uma correção de bug ou melhoria na estratégia de espera no `BasePage` se propaga automaticamente para todos os page objects.

**Antes (sem herança — hipotético):**

```typescript
// AccountPage
async createAccount(name: string) {
  await this.page.getByRole('button', { name: 'New' }).click();
  await this.page.locator('.slds-modal').waitFor({ state: 'visible' });
  await this.page.getByRole('dialog').getByRole('textbox', { name: 'Account Name' }).fill(name);
  await this.page.getByRole('button', { name: 'Save', exact: true }).click();
  await this.page.waitForURL('**/lightning/r/**');
  await this.page.getByRole('button', { name: 'Show more actions' }).waitFor({ state: 'visible' });
}

// AccountPage — mesmo boilerplate duplicado
async createAccount2(name: string) {
  await this.page.getByRole('button', { name: 'New' }).click();         // copia-cola
  await this.page.locator('.slds-modal').waitFor({ state: 'visible' }); // copia-cola
  // ...
}
```

**Depois (com herança):**

```typescript
// AccountPage
async createAccount(name: string) {
  await this.clickNew();           // compartilhado, definido uma vez
  await this.fillName(name);       // específico do objeto
  await this.save();               // compartilhado, definido uma vez
  await this.waitForRecordPage();  // compartilhado, definido uma vez
}

// ContactPage — mesma estrutura, zero duplicação
async createContact(name: string) {
  await this.clickNew();
  await this.fillName(name);
  await this.save();
  await this.waitForRecordPage();
}
```

### 2. Ponto único de mudança para lógica específica do Salesforce

O Salesforce Lightning altera seu DOM entre versões. Quando a estratégia de espera para uma página de registro precisou ser atualizada (como aconteceu com `getByRole('heading')` → `page.title()`), a correção aconteceu em um único lugar — `BasePage` — e todos os page objects se beneficiaram imediatamente.

### 3. Specs legíveis

Como os nomes dos métodos expressam intenção (`createAccount`, `deleteAccount`) em vez de implementação (`getByRole(...).click()`), os specs se leem como fluxos estruturados de usuário:

```typescript
test('deve excluir uma conta', async ({ accountPage }) => {
  const data = AccountFactory.buildMinimal();
  await accountPage.createAccount(data.name);
  await accountPage.navigate();
  await accountPage.deleteAccount(data.name);
  await expect(accountPage.getListItem(data.name)).not.toBeVisible();
});
```

### 4. Estratégia de espera consistente em todos os objetos

Cada método compartilhado no `BasePage` já inclui a pós-condição de espera correta para aquela operação. Métodos de subclasse que chamam `this.clickNew()` recebem automaticamente a espera pelo modal. Métodos que chamam `this.waitForRecordPage()` recebem automaticamente as esperas de URL e de elemento. Isso previne a causa mais comum de flakiness nos testes do Salesforce — agir antes que o LWC tenha re-renderizado.

---

## Impacto na Legibilidade

### O que melhora

- **Specs são curtos e revelam intenção.** Um leitor que não conhece Playwright ainda consegue entender o fluxo do teste.
- **Novas páginas têm um template claro.** O padrão de extensão do `BasePage` é o mesmo sempre.
- **Locators são declarados como propriedades nomeadas.** `this.accountNameField` é mais legível do que a cadeia de locator bruta no ponto de uso.

### O que requer atenção

- **Métodos herdados são implícitos.** Um desenvolvedor novo no projeto pode não ver imediatamente onde `clickNew()` é definido. IDEs (VS Code + TypeScript) resolvem isso com "Go to Definition".
- **A profundidade de herança deve permanecer em um nível.** `BasePage → ObjectPage` é o máximo. Nunca estenda uma classe de página concreta (ex.: não crie `SpecialAccountPage extends AccountPage`) — use composição para esse caso.
- **Métodos do BasePage devem permanecer verdadeiramente genéricos.** Se um método é específico de um objeto (ex.: um fluxo de confirmação de exclusão customizado), ele deve ficar na subclasse — não ser absorvido pelo `BasePage`.

---

## Como Adicionar um Novo Objeto Salesforce

Siga estes passos sempre que um novo objeto Salesforce precisar de cobertura de testes.

### Passo 1 — Criar a classe de página

Crie `tests/pages/<NomeObjeto>Page.ts` estendendo `BasePage`.

```typescript
import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Page object for the Salesforce <LabelObjeto> object.
 * Covers CRUD operations on the <LabelObjeto> list and record pages.
 */
export class <NomeObjeto>Page extends BasePage {
  /** "<Label do Campo>" text field inside the New/Edit modal. */
  readonly <nomeCampo>Field: Locator;

  constructor(page: Page) {
    super(page);
    this.<nomeCampo>Field = page
      .getByRole('dialog')
      .getByRole('textbox', { name: '<Label do Campo no Salesforce>' });
  }

  /** Navigates to the <NomeObjeto> list view. */
  async navigate() {
    await this.navigateToObject('<Nome_API_Objeto__c>');
  }

  /**
   * Fills the "<Label do Campo>" field in the open modal.
   *
   * @param value - Value to enter.
   */
  async fill<NomeCampo>(value: string) {
    await this.<nomeCampo>Field.fill(value);
  }

  /**
   * Creates a new <NomeObjeto> record end-to-end.
   *
   * @param name - Name for the new record.
   */
  async create<NomeObjeto>(name: string) {
    await this.clickNew();
    await this.fill<NomeCampo>(name);
    await this.save();
    await this.waitForRecordPage();
  }

  /**
   * Opens a <NomeObjeto> record from the list view by its name.
   *
   * @param name - Exact record name as shown in the list.
   */
  async open<NomeObjeto>(name: string) {
    await this.getListItem(name).click();
    await this.waitForRecordPage();
  }

  /**
   * Deletes a <NomeObjeto> record end-to-end.
   *
   * @param name - Exact record name to delete.
   */
  async delete<NomeObjeto>(name: string) {
    await this.open<NomeObjeto>(name);
    await this.openActionsMenu();
    await this.clickActionMenuItem('Delete');
    await this.confirmDelete();
    await this.waitForListPage('<Nome_API_Objeto__c>');
  }
}
```

### Passo 2 — Registrar nos fixtures

Abra `tests/fixtures/bdd.ts` e adicione o novo page object junto aos existentes:

```typescript
import { <NomeObjeto>Page } from '../pages/<NomeObjeto>Page';

type Fixtures = {
  accountPage: AccountPage;
  <nomeObjeto>Page: <NomeObjeto>Page;  // adicione esta linha
  testContext: Record<string, any>;
};

export const test = base.extend<Fixtures>({
  // fixtures existentes...
  <nomeObjeto>Page: async ({ page }, use) => {
    await use(new <NomeObjeto>Page(page));
  },
});
```

### Passo 3 — Criar o arquivo de spec

Crie `tests/specs/<nomeObjeto>s.spec.ts`. Cada teste deve criar seus próprios dados e limpar ao final:

```typescript
import { test, expect } from '../fixtures';

test.describe('<LabelObjeto> (<Nome_API_Objeto__c>)', () => {
  test.beforeEach(async ({ <nomeObjeto>Page }) => {
    await <nomeObjeto>Page.navigate();
  });

  test('deve criar um novo <labelObjeto>', async ({ <nomeObjeto>Page }) => {
    const name = `<LabelObjeto> Teste ${Date.now()}`;
    await <nomeObjeto>Page.create<NomeObjeto>(name);
    const title = await <nomeObjeto>Page.getRecordTitle();
    expect(title).toContain(name);
    // limpeza
    await <nomeObjeto>Page.navigate();
    await <nomeObjeto>Page.delete<NomeObjeto>(name);
  });
});
```

### Passo 4 — Verificar

Execute o novo spec em modo headed para confirmar que os locators estão corretos antes de fazer commit:

```bash
npx playwright test tests/specs/<nomeObjeto>s.spec.ts --headed
```

---

## O que Vai em BasePage vs Subclasse

| Critério                                 | Coloque em `BasePage` | Coloque na subclasse |
| ---------------------------------------- | --------------------- | -------------------- |
| Usado por 2 ou mais classes de página    | ✅                    | ❌                   |
| Específico de um objeto Salesforce       | ❌                    | ✅                   |
| Localiza um campo dentro de um modal     | ❌                    | ✅                   |
| Faz parte do fluxo padrão de CRUD        | ✅                    | ❌                   |
| Exige o nome de API do objeto fixo       | ❌                    | ✅                   |
| Estratégia de espera para lista/registro | ✅                    | ❌                   |

Na dúvida: se remover o método do `BasePage` exigiria copiá-lo para duas ou mais subclasses, ele pertence ao `BasePage`.
