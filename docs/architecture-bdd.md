# Arquitetura BDD — Salesforce Playwright com Cucumber

Este documento descreve a arquitetura de testes BDD (Behavior-Driven Development) do projeto, utilizando [playwright-bdd](https://vitalets.github.io/playwright-bdd/) para integrar cenários Gherkin ao runner do Playwright.

---

## Visão Geral

O projeto adota BDD para expressar regras de negócio em linguagem natural (português), mantendo toda a automação Salesforce nos Page Objects existentes. A biblioteca `playwright-bdd` gera arquivos de teste Playwright a partir dos `.feature`, preservando o runner completo — fixtures, traces, screenshots, paralelização e auto-waits.

```
┌─────────────────────────────────────────────────────────────┐
│                     Feature Files (.feature)                │
│         Cenários Gherkin em português                       │
│         Keywords em inglês (Given/When/Then)                │
└────────────────────────┬────────────────────────────────────┘
                         │ npx bddgen
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              .features-gen/ (arquivos gerados)              │
│         Specs Playwright gerados automaticamente            │
│         NÃO commitados (gitignore)                          │
└────────────────────────┬────────────────────────────────────┘
                         │ npx playwright test
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    Step Definitions (.ts)                   │
│         Implementação dos steps — delegam para POM          │
│         Usam fixtures Playwright (accountPage, etc.)        │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    Page Objects (POM)                       │
│         BasePage → AccountPage                              │
│         SalesforceFields.ts (campos tipados)                │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    Salesforce Lightning                     │
│         LWC / Shadow DOM / Aura Components                  │
└─────────────────────────────────────────────────────────────┘
```

---

## Estrutura de Diretórios

```
tests/
  auth.setup.ts              # Login único — salva sessão em .auth/
  features/                  # Cenários BDD em Gherkin
    accounts.feature         # Cenários de Account (7 cenários)
  steps/                     # Implementação dos steps
    account.steps.ts         # Steps de Account
  fixtures/
    bdd.ts                   # Bridge BDD — createBdd(test) + testContext
  pages/
    BasePage.ts              # Operações genéricas Salesforce
    AccountPage.ts           # Page Object de Account
  utils/
    SalesforceFields.ts      # Classes tipadas para campos de formulário
.features-gen/               # Specs gerados pelo bddgen (gitignore)
playwright.config.ts         # Configuração com defineBddConfig
```

---

## Fluxo de Execução

### 1. Geração (`npx bddgen`)

O comando `bddgen` lê os arquivos `.feature` e os step definitions, e gera arquivos `.spec.js` na pasta `.features-gen/`. Cada `.feature` produz um `.feature.spec.js` que importa os steps e fixtures.

### 2. Execução (`npx playwright test`)

O Playwright runner executa os specs gerados como testes normais. O projeto `setup` roda primeiro (autenticação), seguido pelo projeto `chromium` que aponta para `.features-gen/`.

### 3. Pipeline completa

```bash
npm test  # equivale a: npx bddgen && playwright test
```

---

## Convenção de Idiomas

O projeto adota uma convenção bilíngue:

| Elemento                               | Idioma         | Exemplo                                         |
| -------------------------------------- | -------------- | ----------------------------------------------- |
| Keywords Gherkin                       | Inglês         | `Feature`, `Scenario`, `Given`, `When`, `Then`  |
| Nomes de features e cenários           | Português      | `Contas (Account)`, `Deve criar uma nova conta` |
| Texto dos steps                        | Português      | `que eu navego para a lista de Contas`          |
| Labels Salesforce                      | Conforme o org | `Account Name`, `Phone`                         |
| Código TypeScript (variáveis, métodos) | Inglês         | `accountPage`, `testContext`, `createAccount()` |

### Por que essa convenção?

- **Keywords em inglês**: são universais no ecossistema Cucumber/Gherkin e facilitam ferramentas, IDEs e plugins
- **Conteúdo em português**: cenários BDD são documentação viva de regras de negócio — devem ser legíveis pelo time de negócio, QA e stakeholders
- **Código em inglês**: segue as convenções do projeto e da comunidade TypeScript/Playwright

### Exemplo completo

```gherkin
Feature: Contas (Account)

  Background:
    Given que eu navego para a lista de Contas

  Scenario: Deve criar uma nova conta
    When eu crio uma conta com nome único
    Then o título da página deve conter o nome da conta
```

```typescript
// tests/steps/account.steps.ts
import { AccountFactory } from '../factories/accountFactory';

Given('que eu navego para a lista de Contas', async ({ accountPage }) => {
  await accountPage.navigate();
});

When('eu crio uma conta com nome único', async ({ accountPage, testContext }) => {
  const data = AccountFactory.buildMinimal();
  testContext.name = data.name;
  await accountPage.createAccount(data.name);
});
```

---

## Fixtures BDD

O arquivo `tests/fixtures/bdd.ts` é o ponto central da integração BDD:

```typescript
import { test as base, createBdd } from 'playwright-bdd';

export const test = base.extend<Fixtures>({
  accountPage: async ({ page }, use) => { ... },
  testContext: async ({}, use) => { await use({ name: '' }); },
});

export const { Given, When, Then } = createBdd(test);
```

### `testContext`

Fixture para compartilhar estado entre steps de um mesmo cenário (ex: o nome único gerado no `When` é consumido no `Then`). Cada cenário recebe uma instância isolada — não há vazamento de dados entre testes.

---

## Page Objects (inalterados)

Os Page Objects não foram modificados para a integração BDD. Os step definitions funcionam como uma **camada fina** que traduz a linguagem Gherkin para chamadas de métodos POM:

```
Feature step:  "eu crio uma conta com nome único"
     ↓
Step def:      accountPage.createAccount(name)
     ↓
AccountPage:   clickNew() → fillName() → save() → waitForRecordPage()
     ↓
BasePage:      newButton.click(), modal.waitFor(), saveButton.click()
     ↓
Salesforce:    interação real com Lightning LWC
```

### Granularidade dos Steps

Steps BDD expressam **intenção de negócio**, não mecânica de UI:

| Step BDD                                      | O que faz internamente              |
| --------------------------------------------- | ----------------------------------- |
| `eu preencho todos os campos da conta`        | Preenche 30+ campos via page object |
| `eu limpo todos os campos da conta`           | Limpa 30+ campos com clear()        |
| `todos os campos da conta devem estar vazios` | Valida 30+ campos com expectEmpty() |

Detalhes de cada campo ficam encapsulados nos step definitions e page objects — o `.feature` permanece limpo e focado na regra de negócio.

---

## Configuração Playwright

```typescript
// playwright.config.ts
import { defineBddConfig } from 'playwright-bdd';

const testDir = defineBddConfig({
  features: './tests/features/**/*.feature',
  steps: ['./tests/steps/**/*.ts', './tests/fixtures/bdd.ts'],
});

export default defineConfig({
  projects: [
    { name: 'setup', testMatch: '**/auth.setup.ts' },
    {
      name: 'chromium',
      testDir, // aponta para .features-gen/
      testMatch: '**/*.feature.spec.js', // specs gerados
      dependencies: ['setup'],
      use: { storageState: `.auth/salesforce-${envName}.json` },
    },
  ],
});
```

### Autenticação

A autenticação continua funcionando via Playwright project dependencies:

1. Projeto `setup` executa `auth.setup.ts` → salva sessão em `.auth/salesforce-<env>.json`
2. Projeto `chromium` depende de `setup` → usa `storageState` salvo (por ambiente)
3. Nenhum hook BDD necessário para autenticação

---

## Adicionando Novos Objetos Salesforce

Para adicionar testes BDD de um novo objeto:

1. **Criar Page Object**: `tests/pages/NovoObjetoPage.ts` estendendo `BasePage`
2. **Registrar fixture**: adicionar `novoObjetoPage` em `tests/fixtures/bdd.ts`
3. **Criar feature**: `tests/features/novo-objeto.feature` com cenários em Gherkin
4. **Criar steps**: `tests/steps/novo-objeto.steps.ts` importando `Given/When/Then` de `fixtures/bdd`
5. **Gerar e testar**: `npm test`

---

## Ferramentas e Dependências

| Pacote             | Versão | Propósito                                                  |
| ------------------ | ------ | ---------------------------------------------------------- |
| `@playwright/test` | ^1.59  | Runner de testes e assertions                              |
| `playwright-bdd`   | ^8.5   | Integração BDD — gera specs Playwright a partir de Gherkin |
| `dotenv`           | ^17.4  | Carrega variáveis de ambiente do `.env`                    |
