# Automação de Testes Salesforce — Playwright + Cucumber BDD

Suite de testes automatizados para Salesforce, construída com [Playwright](https://playwright.dev/), [playwright-bdd](https://vitalets.github.io/playwright-bdd/) e TypeScript. Os cenários são escritos em **Gherkin** (BDD) para documentar regras de negócio em linguagem natural. Cobre operações de CRUD para o objeto **Account** (nativo) como referência — o projeto serve como **boilerplate** para testar qualquer objeto Salesforce.

---

## Pré-requisitos

- [Node.js](https://nodejs.org/) 20 ou superior
- Google Chrome (instalado automaticamente pelo Playwright)
- Acesso a uma org Salesforce

---

## Configuração

### 1. Instalar dependências

```bash
npm ci
npx playwright install --with-deps chromium
```

### 2. Escolher o modo de autenticação

O projeto suporta dois modos de autenticação. Escolha o que melhor se encaixa no seu cenário:

|                   | Standard App                                           | Connected App                                            |
| ----------------- | ------------------------------------------------------ | -------------------------------------------------------- |
| **Como funciona** | Login via browser + código MFA manual                  | Login 100% via API (OAuth 2.0)                           |
| **CI/CD**         | Exige intervenção manual                               | 100% automatizado                                        |
| **Sessão expira** | ~1 mês                                                 | Nunca (token renovado a cada execução)                   |
| **API de dados**  | Indisponível                                           | Disponível                                               |
| **Configuração**  | Simples (email + senha)                                | Requer criar Connected App no Salesforce                 |
| **Guia completo** | [docs/auth-standard-app.md](docs/auth-standard-app.md) | [docs/auth-connected-app.md](docs/auth-connected-app.md) |

### 3. Configurar variáveis de ambiente

Copie o modelo correspondente ao seu modo de autenticação:

```bash
# Standard App (login via browser, MFA manual)
cp .env.standard.example .env

# Connected App (login via API, sem MFA)
cp .env.connected.example .env
```

Abra o `.env` e preencha com suas credenciais. Veja o guia de autenticação correspondente para detalhes de cada campo.

### 4. Autenticar (somente Standard App)

Se você escolheu `SF_AUTH_MODE=standard`, execute uma vez para salvar a sessão:

```bash
npm run auth
```

> Para quem usa Connected App, pule este passo — o login é automático.

### 5. Múltiplos ambientes (dev / qa)

Para equipes com mais de um org, crie arquivos separados:

```bash
cp .env.connected.example .env.dev   # ambiente de desenvolvimento
cp .env.connected.example .env.qa    # ambiente de QA
```

Rode os testes apontando para o ambiente desejado:

```bash
npm run test:dev    # usa .env.dev
npm run test:qa     # usa .env.qa
```

Cada ambiente salva sua sessão separadamente (`.auth/salesforce-dev.json`, `.auth/salesforce-qa.json`) — então não há conflito.

---

## Executando os Testes

Todos os comandos executam `bddgen` automaticamente antes dos testes para gerar os specs a partir dos `.feature`.

| Comando                                | Descrição                       |
| -------------------------------------- | ------------------------------- |
| `npm test`                             | Execução headless (padrão CI)   |
| `npm run test:headed`                  | Execução com browser visível    |
| `npm run test:ui`                      | Modo interativo do Playwright   |
| `npm run test:debug`                   | Modo de depuração passo a passo |
| `npm run test:smoke`                   | Apenas cenários `@smoke`        |
| `npm run test:regression`              | Apenas cenários `@regression`   |
| `npm run test:dev`                     | Roda contra o ambiente dev      |
| `npm run test:qa`                      | Roda contra o ambiente qa       |
| `npm run test:report`                  | Abre o último relatório HTML    |
| `npm run scaffold -- --object Contact` | Gera arquivos para novo objeto  |

---

## Estrutura do Projeto

```
.github/
  workflows/
    playwright.yml           # Pipeline de CI com GitHub Actions
scripts/
  scaffold.ts                # CLI para gerar arquivos de novo objeto Salesforce
tests/
  auth.setup.ts              # Login único — salva sessão em .auth/
  features/                  # Cenários BDD em Gherkin
    accounts.feature         # Cenários de CRUD e validação de Account
  steps/                     # Implementação dos steps Gherkin
    account.steps.ts         # Steps de Account — delegam para AccountPage
  factories/                 # Geração de dados de teste com faker.js
    accountFactory.ts        # Factory de Account — buildComplete(), buildMinimal(), buildPartial()
  fixtures/
    bdd.ts                   # Bridge BDD — createBdd(test) + testContext + fixtures
  pages/
    BasePage.ts              # Operações comuns: New, Save, Delete, navegação, erros de validação
    AccountPage.ts           # Interações específicas de Account (28 campos tipados)
  utils/
    SalesforceFields.ts      # Classes tipadas para campos de formulário (TextField, PicklistField, etc.)
    SalesforceAuth.ts        # OAuth 2.0 para Connected App
    SalesforceApi.ts         # Wrapper da API REST (criar/deletar/consultar registros)
.features-gen/               # Specs gerados pelo bddgen (gitignore — não commitar)
.env.example                 # Modelo de variáveis de ambiente
.env.standard.example        # Modelo para Standard App
.env.connected.example       # Modelo para Connected App
playwright.config.ts         # Configuração do Playwright + defineBddConfig
playwright.global-setup.ts   # Validação de variáveis de ambiente
```

---

## Arquitetura

O projeto combina **BDD (Cucumber/Gherkin)** com o padrão **Page Object Model (POM)**:

```
Feature (.feature)  →  Step Definitions (.ts)  →  Page Objects  →  Salesforce Lightning
    Gherkin               delegates to POM          BasePage         LWC / Shadow DOM
    em português          via fixtures              AccountPage
```

### BDD com Cucumber — Keywords em Inglês, Steps em Português

Os cenários Gherkin utilizam **keywords em inglês** (`Feature`, `Scenario`, `Given`, `When`, `Then`) e **conteúdo em português** (nomes de cenários, texto dos steps, descrições). Essa convenção mantém compatibilidade com ferramentas e plugins do ecossistema Cucumber enquanto torna os cenários legíveis para o time de negócio.

**Exemplo de cenário (`tests/features/accounts.feature`):**

```gherkin
Feature: Contas (Account)

  Background:
    Given que eu navego para a lista de Contas

  Scenario: Deve criar uma nova conta
    When eu crio uma conta com nome único
    Then o título da página deve conter o nome da conta
```

**Exemplo de step definition (`tests/steps/account.steps.ts`):**

```typescript
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
```

### Como funciona

1. **`npx bddgen`** — lê os `.feature` e gera specs Playwright em `.features-gen/`
2. **`npx playwright test`** — executa os specs gerados com o runner do Playwright
3. O comando `npm test` executa ambos automaticamente

Os step definitions são uma **camada fina** que traduz a linguagem Gherkin para chamadas de métodos nos Page Objects. Toda a lógica de interação com o Salesforce permanece encapsulada nos Page Objects.

### Fixture `testContext`

Compartilha dados entre steps de um mesmo cenário (ex: o nome único gerado no `When` é consumido no `Then`). Cada cenário recebe uma instância isolada.

### Camadas do projeto

- **`BasePage`** — operações genéricas do Salesforce (navegar para lista, abrir modal, salvar, deletar, aguardar record/list page, erros de validação via `SalesforceValidationError`)
- **`AccountPage`** — estende `BasePage` com interações específicas de Account (modelo para novos objetos)
- **`SalesforceFields.ts`** — classes tipadas que encapsulam todos os campos de formulário modal do Salesforce LWC. Cada classe expõe `fill()`/`select()`/`search()`, `clear()`, `expectValue()`, `expectEmpty()` e `inlineError`. **Todo campo de formulário modal deve obrigatoriamente usar uma dessas classes**:

  | Classe                 | Tipo de campo                          | Elemento DOM                          |
  | ---------------------- | -------------------------------------- | ------------------------------------- |
  | `TextField`            | Texto, textarea                        | `<input type="text">` / `<textarea>`  |
  | `PicklistField`        | Picklist padrão (Rating, Type…)        | `<button role="combobox">`            |
  | `AddressPicklistField` | Geo-picklist de endereço (País/Estado) | `<input role="combobox">`             |
  | `LookupField`          | Lookup (Parent Account…)               | `<input role="combobox">`             |
  | `NumberField`          | Número, moeda, inteiro                 | `<input role="spinbutton">`           |
  | `DateField`            | Data                                   | `<input type="text">` com máscara LWC |
  | `CheckboxField`        | Checkbox                               | `<input type="checkbox">`             |

- **`fixtures/bdd.ts`** — registra os page objects e `testContext` no sistema de fixtures do Playwright, e exporta `Given/When/Then` via `createBdd(test)`

A autenticação utiliza `storageState` do Playwright. Dependendo do modo configurado (`SF_AUTH_MODE`), o login acontece via browser (Standard App) ou via API (Connected App). Veja os guias dedicados para detalhes:

- [docs/auth-standard-app.md](docs/auth-standard-app.md) — Login via browser + MFA manual
- [docs/auth-connected-app.md](docs/auth-connected-app.md) — Login via API OAuth 2.0

### Adicionando um Novo Objeto Salesforce

Use o scaffold CLI para gerar automaticamente todos os arquivos necessários:

```bash
npm run scaffold -- --object Contact
```

> Veja [docs/new-object-checklist.md](docs/new-object-checklist.md) para o guia completo.

> Para a documentação completa de arquitetura BDD, consulte [docs/architecture-bdd.md](docs/architecture-bdd.md).

---

## Factories de Dados (faker.js)

### O que é uma Factory?

Imagine que você está num restaurante de hambúrguer. Você pode pedir:

- **Completo** — vem com tudo: pão, carne, queijo, alface, tomate, cebola, maionese, ketchup...
- **Só o básico** — vem só o pão e a carne (o mínimo para ser um hambúrguer)
- **Personalizado** — você escolhe quais ingredientes quer: "quero pão, carne, queijo e bacon" — e cada ingrediente é escolhido pelo chef (aleatoriamente entre as opções do cardápio)

A **Factory** funciona exatamente assim, mas para dados de teste no Salesforce. Em vez de ingredientes, ela gera **campos** de um registro (Account, Acomodação, etc.) com valores aleatórios usando a biblioteca [faker.js](https://fakerjs.dev/).

> **Por que usar Factory?** Se todo teste usasse o mesmo valor fixo (ex.: `'Acme Corp'`), não testaríamos cenários reais. A Factory gera nomes, telefones, endereços e valores de picklist diferentes a cada execução — isso torna os testes mais confiáveis e evita conflitos entre execuções paralelas.

---

### Os 3 métodos da Factory

Cada Factory tem **3 métodos estáticos**. Você não precisa criar uma instância — basta chamar direto na classe:

#### 1. `buildComplete()` — Gera TODOS os campos

Equivalente ao hambúrguer completo. Todo campo do objeto é preenchido com um valor aleatório válido.

```typescript
const data = AccountFactory.buildComplete();
// data = {
//   name: 'Account Test 1712678400000',
//   rating: 'Hot',              ← valor aleatório entre Hot, Warm e Cold
//   phone: '+55 11 91234-5678', ← telefone fake
//   industry: 'Banking',        ← valor aleatório entre as opções válidas
//   billingCountry: 'Brazil',
//   billingState: 'São Paulo',  ← estado aleatório entre os mapeados
//   employees: 4521,            ← número aleatório
//   ... (todos os outros campos também preenchidos)
// }
```

**Quando usar:** quando o teste precisa preencher **todos** os campos do formulário.

```typescript
// No step definition:
When('eu preencho todos os campos da conta', async ({ accountPage, testContext }) => {
  const data = AccountFactory.buildComplete();
  testContext.name = data.name; // salva o nome para usar no Then
  await accountPage.fillAllFields(data);
});
```

---

#### 2. `buildMinimal()` — Gera só o campo obrigatório

Equivalente ao hambúrguer básico. Só gera o `name` (único campo obrigatório de Account).

```typescript
const data = AccountFactory.buildMinimal();
// data = {
//   name: 'Account Test 1712678400000'
//   ← nenhum outro campo, só o nome
// }
```

**Quando usar:** quando o teste só precisa do nome (ex.: criar e deletar uma conta rapidamente).

```typescript
When('eu crio uma conta com nome único', async ({ accountPage, testContext }) => {
  const data = AccountFactory.buildMinimal();
  testContext.name = data.name;
  await accountPage.createAccount(data.name);
});
```

---

#### 3. `buildPartial(campos)` — Gera campos específicos com valores aleatórios

Equivalente ao hambúrguer personalizado: você diz quais ingredientes quer e o chef escolhe cada um aleatoriamente. A Factory gera internamente um registro completo e **retorna só os campos que você pediu** (+ o `name` obrigatório).

```typescript
const data = AccountFactory.buildPartial(['rating', 'phone', 'industry']);
// data = {
//   name: 'Account Test 1712678400000',
//   rating: 'Warm',               ← aleatório entre Hot, Warm, Cold
//   phone: '+1 555-987-6543',     ← telefone aleatório gerado pelo faker
//   industry: 'Technology',       ← aleatório entre as opções válidas
//   ← SÓ esses 3 campos + name. Nenhum outro campo aparece.
// }
```

**Quando usar:** quando o teste precisa preencher **alguns** campos, mas não todos, e os valores não precisam ser exatos.

```typescript
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
  await accountPage.fillAllFields(data); // preenche SOMENTE name + os 5 campos acima
  await accountPage.save();
  await accountPage.waitForRecordPage();
});
```

---

### E quando eu preciso de um valor EXATO?

Todos os 3 métodos aceitam um parâmetro opcional chamado `overrides`. Ele serve para **forçar** um valor específico, sobrescrevendo o que o faker geraria. Use isso apenas quando o teste precisa **verificar** um valor exato.

```typescript
// Força o rating para 'Cold' — todo o resto continua aleatório
const data = AccountFactory.buildComplete({ rating: 'Cold' });
// data.rating será SEMPRE 'Cold', nunca outro valor

// Força o nome para um valor específico
const data = AccountFactory.buildMinimal({ name: 'Conta Especial' });
// data.name será 'Conta Especial' em vez de 'Account Test 17...'

// Parcial com 3 campos aleatórios, mas rating forçado
const data = AccountFactory.buildPartial(['rating', 'phone', 'industry'], { rating: 'Hot' });
// data.rating será SEMPRE 'Hot', phone e industry continuam aleatórios
```

---

### Tabela resumo

| Método                               | O que gera                 | Valores               | Quando usar                              |
| ------------------------------------ | -------------------------- | --------------------- | ---------------------------------------- |
| `buildComplete()`                    | Todos os campos            | Aleatórios (faker)    | Preencher formulário inteiro             |
| `buildMinimal()`                     | Só o `name`                | Aleatório             | Criar registro rápido, testar deleção    |
| `buildPartial(['campo1', 'campo2'])` | `name` + campos escolhidos | Aleatórios (faker)    | Preencher alguns campos específicos      |
| Qualquer um com `{ campo: 'valor' }` | Depende do método          | Forçado pelo override | Quando o teste precisa de um valor exato |

### Como a Factory se conecta com o Page Object

O método `fillAllFields(data)` do Page Object recebe o objeto gerado pela Factory e **só preenche os campos que existem no objeto**. Campos ausentes (que não foram gerados) são simplesmente ignorados.

```
Factory gera dados  →  fillAllFields(data) recebe  →  preenche só o que veio
─────────────────      ────────────────────────       ──────────────────────────
buildComplete()        { name, rating, phone, ... }   preenche TODOS os campos
buildMinimal()         { name }                        preenche SÓ o nome
buildPartial([...])    { name, rating, phone }         preenche nome + rating + phone
```

> **Regra importante:** nunca escreva valores fixos diretamente nos steps ou page objects. Sempre use a Factory para gerar os dados.

---

## CI/CD

O workflow do GitHub Actions (`.github/workflows/playwright.yml`) é executado a cada push e pull request para `main`/`master`. Ele usa o modo **Connected App** para login automático.

**Secrets necessários no repositório:**

| Secret              | Descrição                        |
| ------------------- | -------------------------------- |
| `SF_BASE_URL`       | URL completa da org Salesforce   |
| `SF_USERNAME`       | Usuário de login do Salesforce   |
| `SF_PASSWORD`       | Senha do Salesforce              |
| `SF_SECURITY_TOKEN` | Security Token do Salesforce     |
| `SF_CLIENT_ID`      | Consumer Key do Connected App    |
| `SF_CLIENT_SECRET`  | Consumer Secret do Connected App |

O relatório HTML é publicado como artefato do workflow (`playwright-report`, retido por 30 dias).

> Veja [docs/auth-connected-app.md](docs/auth-connected-app.md) para instruções de como configurar os secrets no GitHub Actions.

---

## Documentação

| Documento                                                        | O que contém                                                       |
| ---------------------------------------------------------------- | ------------------------------------------------------------------ |
| [docs/auth-standard-app.md](docs/auth-standard-app.md)           | Guia de login via browser + MFA manual                             |
| [docs/auth-connected-app.md](docs/auth-connected-app.md)         | Guia de login via API OAuth 2.0 + configuração no Salesforce Setup |
| [docs/new-object-checklist.md](docs/new-object-checklist.md)     | Como adicionar um novo objeto Salesforce (scaffold CLI + manual)   |
| [docs/architecture-bdd.md](docs/architecture-bdd.md)             | Arquitetura BDD: fluxo de geração, convenção de idiomas, fixtures  |
| [docs/base-page-inheritance.md](docs/base-page-inheritance.md)   | Padrão de herança BasePage: DRY, legibilidade, template            |
| [docs/salesforce-pitfalls.md](docs/salesforce-pitfalls.md)       | Desafios Salesforce: Shadow DOM, LWC, locators, waits              |
| [docs/errors/css-not-loading.md](docs/errors/css-not-loading.md) | Troubleshooting: CSS não carregando no Trace Viewer                |
