# Automação de Testes Salesforce — Playwright + Cucumber BDD

Suite de testes automatizados para Salesforce Lightning, construída com [Playwright](https://playwright.dev/), [playwright-bdd](https://vitalets.github.io/playwright-bdd/) e TypeScript. Cenários escritos em **Gherkin** (BDD) para documentar regras de negócio em linguagem natural. O projeto serve como **boilerplate** para testar qualquer objeto Salesforce.

---

## Sumário

- [Pré-requisitos](#pré-requisitos)
- [Início Rápido](#início-rápido)
- [Seu Primeiro Teste](#seu-primeiro-teste)
- [Comandos Disponíveis](#comandos-disponíveis)
- [Como o Projeto Funciona](#como-o-projeto-funciona)
- [Estrutura do Projeto](#estrutura-do-projeto)
- [Factories de Dados](#factories-de-dados)
- [Adicionando um Novo Objeto](#adicionando-um-novo-objeto)
- [CI/CD](#cicd)
- [Documentação Completa](#documentação-completa)

---

## Pré-requisitos

- [Node.js](https://nodejs.org/) 20 ou superior
- Acesso a uma org Salesforce

---

## Início Rápido

```bash
# 1. Instale as dependências
npm ci
npx playwright install --with-deps chromium

# 2. Copie o modelo de variáveis de ambiente
cp .env.standard.example .env    # preencha com suas credenciais

# 3. Faça login uma vez (abre o browser para você entrar)
npm run auth

# 4. Rode os testes
npm test
```

> Esse é o caminho mais simples (**Standard App** — login via browser). Para login 100% automático via API (ideal para CI/CD), veja o [guia de Connected App](docs/auth-connected-app.md).

---

## Seu Primeiro Teste

Nunca criou um teste Playwright para Salesforce? Começe pelo guia passo a passo:

> **[docs/first-test-guide.md](docs/first-test-guide.md)** — Cobre tudo: scaffold, seletores, Page Object, Factory, MCP Playwright e como pedir ajuda ao Copilot.

### Múltiplos ambientes (dev / qa)

Se sua equipe usa mais de um org, crie um `.env` para cada ambiente:

```bash
cp .env.standard.example .env.dev   # preencha com credenciais do dev
cp .env.standard.example .env.qa    # preencha com credenciais do qa
```

Rode os testes apontando para o ambiente desejado:

```bash
npm run auth:dev    # autentica no dev (somente Standard App)
npm run auth:qa     # autentica no qa (somente Standard App)
npm run test:dev    # usa .env.dev
npm run test:qa     # usa .env.qa
```

Cada ambiente salva sua sessão separadamente (`.auth/salesforce-dev.json`, `.auth/salesforce-qa.json`), então não há conflito entre orgs.

---

## Comandos Disponíveis

| Comando                                | O que faz                            |
| -------------------------------------- | ------------------------------------ |
| `npm test`                             | Roda todos os testes (headless)      |
| `npm run test:headed`                  | Roda com o browser visível           |
| `npm run test:ui`                      | Modo interativo do Playwright        |
| `npm run test:debug`                   | Depuração passo a passo              |
| `npm run test:smoke`                   | Apenas cenários `@smoke`             |
| `npm run test:regression`              | Apenas cenários `@regression`        |
| `npm run test:dev`                     | Roda contra o ambiente dev           |
| `npm run test:qa`                      | Roda contra o ambiente qa            |
| `npm run auth`                         | Autentica no ambiente padrão (.env)  |
| `npm run auth:dev`                     | Autentica no ambiente dev (.env.dev) |
| `npm run auth:qa`                      | Autentica no ambiente qa (.env.qa)   |
| `npm run test:report`                  | Abre o último relatório HTML         |
| `npm run scaffold -- --object Contact` | Gera arquivos para novo objeto       |
| `npm run lint`                         | Verifica erros de código             |
| `npm run format`                       | Formata todos os arquivos            |

---

## Como o Projeto Funciona

O projeto combina **BDD** (cenários em Gherkin) com **Page Object Model** (POM):

```
Feature (.feature)  →  Steps (.ts)  →  Page Objects  →  Salesforce Lightning
   Gherkin em PT         delega          BasePage         LWC / Shadow DOM
                         para POM        AccountPage
```

### Resumo rápido

1. Você escreve cenários em português nos arquivos `.feature`
2. Os **step definitions** traduzem cada passo para chamadas nos Page Objects
3. Os **Page Objects** encapsulam toda interação com o Salesforce
4. `npm test` gera os specs automaticamente e roda tudo

**Exemplo de cenário:**

```gherkin
Feature: Contas (Account)

  Background:
    Given que eu navego para a lista de Contas

  Scenario: Deve criar uma nova conta
    When eu crio uma conta com nome único
    Then o título da página deve conter o nome da conta
```

> Para entender a arquitetura em profundidade, veja [docs/architecture-bdd.md](docs/architecture-bdd.md).

---

## Estrutura do Projeto

```
tests/
  auth.setup.ts              # Login único — salva sessão
  features/                  # Cenários BDD em Gherkin
  steps/                     # Steps — traduz Gherkin → Page Objects
  factories/                 # Geração de dados com faker.js
  fixtures/bdd.ts            # Fixtures do Playwright + BDD bridge
  pages/
    BasePage.ts              # Operações comuns (New, Save, Delete, navegar)
    AccountPage.ts           # Interações de Account (28 campos tipados)
  utils/
    SalesforceFields.ts      # Classes tipadas para campos de formulário
    SalesforceAuth.ts        # OAuth 2.0 (Connected App)
    SalesforceApi.ts         # API REST wrapper
scripts/scaffold.ts          # CLI para gerar arquivos de novo objeto
```

> Para detalhes sobre herança de Page Objects, veja [docs/base-page-inheritance.md](docs/base-page-inheritance.md).

---

## Factories de Dados

Dados de teste são gerados por **factories** com valores aleatórios via [faker.js](https://fakerjs.dev/). Nunca escreva valores fixos nos testes.

| Método             | O que gera                         | Exemplo de uso                  |
| ------------------ | ---------------------------------- | ------------------------------- |
| `buildComplete()`  | Todos os campos com valores random | Preencher formulário inteiro    |
| `buildMinimal()`   | Só o campo obrigatório (`name`)    | Criar e deletar registro rápido |
| `buildPartial([])` | Campos escolhidos + `name`         | Preencher subset de campos      |

```typescript
const data = AccountFactory.buildMinimal();
await accountPage.createAccount(data.name);
```

> Para o guia completo (com analogia de hambúrguer), veja [docs/data-factories.md](docs/data-factories.md).

---

## Adicionando um Novo Objeto

```bash
npm run scaffold -- --object Contact
```

O comando gera automaticamente: Page Object, Factory, Feature, Steps e atualiza as fixtures.

> Guia completo em [docs/new-object-checklist.md](docs/new-object-checklist.md).

---

## CI/CD

O GitHub Actions roda os testes a cada push/PR usando **Connected App** (login via API, sem intervenção manual).

**Secrets necessários no repositório:**

| Secret              | Descrição                       |
| ------------------- | ------------------------------- |
| `SF_BASE_URL`       | URL da org Salesforce           |
| `SF_USERNAME`       | Usuário                         |
| `SF_PASSWORD`       | Senha                           |
| `SF_SECURITY_TOKEN` | Security Token                  |
| `SF_CLIENT_ID`      | Consumer Key (Connected App)    |
| `SF_CLIENT_SECRET`  | Consumer Secret (Connected App) |

> Veja [docs/auth-connected-app.md](docs/auth-connected-app.md) para como configurar a Connected App e os secrets.

---

## Documentação Completa

| Documento                                                | O que contém                                     |
| -------------------------------------------------------- | ------------------------------------------------ |
| [**Seu Primeiro Teste**](docs/first-test-guide.md)       | Guia passo a passo + MCP Playwright + Copilot    |
| [Autenticação Standard App](docs/auth-standard-app.md)   | Login via browser + MFA manual                   |
| [Autenticação Connected App](docs/auth-connected-app.md) | Login via API OAuth 2.0 + setup no Salesforce    |
| [Arquitetura BDD](docs/architecture-bdd.md)              | Fluxo de geração, convenção de idiomas, fixtures |
| [Herança de Page Objects](docs/base-page-inheritance.md) | Padrão BasePage → SubPage, DRY                   |
| [Factories de Dados](docs/data-factories.md)             | Como gerar dados de teste com faker.js           |
| [Novo Objeto (Checklist)](docs/new-object-checklist.md)  | Scaffold CLI + passo a passo manual              |
| [Desafios do Salesforce](docs/salesforce-pitfalls.md)    | Shadow DOM, LWC, locators, waits                 |
| [CSS não carregando](docs/errors/css-not-loading.md)     | Troubleshooting do Trace Viewer                  |
