# Guia: Desenvolvendo seu Primeiro Teste

Este guia te acompanha passo a passo na criação do seu primeiro teste para um objeto Salesforce. Não importa se você nunca usou Playwright — vamos explicar cada parte.

---

## Sumário

- [1. Antes de Começar](#1-antes-de-começar)
- [2. Gerando os Arquivos com Scaffold](#2-gerando-os-arquivos-com-scaffold)
- [3. Entendendo os Seletores do Salesforce](#3-entendendo-os-seletores-do-salesforce)
- [4. Montando o Page Object](#4-montando-o-page-object)
- [5. Criando a Factory de Dados](#5-criando-a-factory-de-dados)
- [6. Escrevendo o Cenário Gherkin](#6-escrevendo-o-cenário-gherkin)
- [7. Implementando os Steps](#7-implementando-os-steps)
- [8. Rodando o Teste](#8-rodando-o-teste)
- [9. Usando o MCP Playwright para Inspecionar Elementos](#9-usando-o-mcp-playwright-para-inspecionar-elementos)
- [10. Pedindo Ajuda ao Copilot](#10-pedindo-ajuda-ao-copilot)

---

## 1. Antes de Começar

Certifique-se de que:

- O projeto já está configurado (`npm ci` + `npx playwright install --with-deps chromium`)
- Você já consegue rodar `npm test` e os testes de Account passam
- Você sabe qual **objeto Salesforce** vai testar (ex.: `Contact`, `Opportunity`, `Lead`)

---

## 2. Gerando os Arquivos com Scaffold

O scaffold gera automaticamente os 5 arquivos necessários para um novo objeto:

```bash
npm run scaffold -- --object Contact
```

Isso cria:

| Arquivo gerado                      | O que é                                         |
| ----------------------------------- | ----------------------------------------------- |
| `tests/pages/ContactPage.ts`        | Page Object — onde ficam os seletores e métodos |
| `tests/factories/contactFactory.ts` | Factory — gera dados de teste aleatórios        |
| `tests/features/contacts.feature`   | Feature — cenários BDD em Gherkin               |
| `tests/steps/contact.steps.ts`      | Steps — cola entre Gherkin e Page Object        |
| `tests/fixtures/bdd.ts`             | (atualizado) — registra a fixture `contactPage` |

Após o scaffold, abra cada arquivo e personalize — eles vêm com um exemplo básico de CRUD.

---

## 3. Entendendo os Seletores do Salesforce

### O problema: Shadow DOM

No Salesforce Lightning, os elementos ficam escondidos dentro de **Shadow DOM** — uma barreira que impede seletores CSS normais de enxergar os campos. Por isso, seletores como `page.locator('#inputField')` ou `page.getByLabel('Account Name')` **não funcionam** no Salesforce.

### A solução: `getByRole()` com ARIA

O Playwright consegue atravessar Shadow DOM usando a **árvore de acessibilidade** (ARIA). O padrão que funciona no Salesforce é:

```typescript
// ✅ Funciona — usa ARIA, que atravessa Shadow DOM
page.getByRole('dialog').getByRole('textbox', { name: 'Account Name' });

// ❌ Não funciona — Shadow DOM bloqueia
page.getByLabel('Account Name');
page.locator('#inputField');
```

### Tabela de referência rápida

| O que você quer localizar             | Seletor                                                          | Exemplo                           |
| ------------------------------------- | ---------------------------------------------------------------- | --------------------------------- |
| Campo de texto no modal               | `getByRole('dialog').getByRole('textbox', { name: 'Label' })`    | `'Account Name'`, `'Phone'`       |
| Campo numérico no modal               | `getByRole('dialog').getByRole('spinbutton', { name: 'Label' })` | `'Employees'`, `'Annual Revenue'` |
| Picklist (dropdown) no modal          | `getByRole('dialog').getByRole('combobox', { name: 'Label' })`   | `'Rating'`, `'Industry'`          |
| Botão                                 | `getByRole('button', { name: 'Texto' })`                         | `'New'`, `'Save'`, `'Delete'`     |
| Link na lista de registros            | `getByRole('link', { name: 'Nome', exact: true }).first()`       | Nome do registro                  |
| Modal do Salesforce                   | `locator('.slds-modal')`                                         | Container do modal                |
| Item de menu após "Show more actions" | `getByRole('menuitem', { name: 'Texto' })`                       | `'Delete'`, `'Edit'`              |

### Como descobrir o seletor certo?

Existem três caminhos (do mais fácil ao mais avançado):

1. **Use o MCP Playwright** (seção 9) — ele inspeciona a página e retorna os seletores prontos
2. **Peça ao Copilot** (seção 10) — descreva o campo e ele sugere o seletor baseado nas regras do projeto
3. **Playwright Inspector** — rode `npm run test:debug` e use a ferramenta "Pick locator" para clicar no elemento

---

## 4. Montando o Page Object

O scaffold gera um Page Object de exemplo. Você precisa adicionar os **campos do formulário** do seu objeto. No Salesforce, cada tipo de campo usa uma classe diferente:

| Tipo do campo no Salesforce | Classe no projeto      | Método principal        |
| --------------------------- | ---------------------- | ----------------------- |
| Texto, textarea             | `TextField`            | `fill('valor')`         |
| Picklist (Rating, Type...)  | `PicklistField`        | `select('Opção')`       |
| País/Estado (geo-picklist)  | `AddressPicklistField` | `select('Brazil')`      |
| Lookup (relacionamento)     | `LookupField`          | `search('termo')`       |
| Número, moeda               | `NumberField`          | `fill(123)`             |
| Data                        | `DateField`            | `fill('01/15/2025')`    |
| Checkbox                    | `CheckboxField`        | `check()` / `uncheck()` |

### Exemplo: adicionando campos ao ContactPage

```typescript
import { Page } from '@playwright/test';
import { BasePage } from './BasePage';
import { TextField, PicklistField, LookupField } from '../utils/SalesforceFields';

export class ContactPage extends BasePage {
  // Declare cada campo como propriedade readonly
  readonly firstNameField: TextField;
  readonly lastNameField: TextField;
  readonly emailField: TextField;
  readonly leadSourceField: PicklistField;
  readonly accountField: LookupField;

  constructor(page: Page) {
    super(page);
    // O label deve ser EXATAMENTE como aparece no Salesforce
    this.firstNameField = new TextField(page, 'First Name');
    this.lastNameField = new TextField(page, 'Last Name');
    this.emailField = new TextField(page, 'Email');
    this.leadSourceField = new PicklistField(page, 'Lead Source');
    this.accountField = new LookupField(page, 'Account Name');
  }
}
```

> **Dica:** o label que você passa para o construtor (ex: `'First Name'`) deve ser **exatamente** o que aparece no formulário do Salesforce. Letras maiúsculas/minúsculas importam.

### Métodos que você já herda do BasePage

Não precisa reescrever — eles já estão prontos:

| Método                        | O que faz                                                      |
| ----------------------------- | -------------------------------------------------------------- |
| `navigate()`                  | Navega para a lista do objeto                                  |
| `clickNew()`                  | Clica em "New" e aguarda o modal abrir                         |
| `save()`                      | Clica em "Save" e aguarda a resposta do servidor               |
| `waitForRecordPage()`         | Aguarda a página de detalhe do registro carregar               |
| `getRecordTitle()`            | Retorna o nome do registro (extraído do `<title>`)             |
| `openRecord(name)`            | Abre um registro na lista pelo nome                            |
| `deleteRecord(name, apiName)` | Deleta um registro (abre, Show more actions, Delete, confirma) |

---

## 5. Criando a Factory de Dados

A factory gera dados aleatórios para cada execução. O scaffold já cria uma de exemplo — personalize com os campos do seu objeto.

```typescript
import { faker } from '@faker-js/faker';

export interface ContactData {
  firstName: string; // obrigatório
  lastName: string; // obrigatório
  email?: string; // opcional
  leadSource?: string; // opcional
}

const LEAD_SOURCE_OPTIONS = ['Web', 'Phone Inquiry', 'Partner Referral'] as const;

export class ContactFactory {
  static buildMinimal(overrides?: Partial<ContactData>): ContactData {
    return {
      firstName: `Test ${Date.now()}`,
      lastName: faker.person.lastName(),
      ...overrides,
    };
  }
}
```

> Guia completo de factories em [data-factories.md](data-factories.md).

---

## 6. Escrevendo o Cenário Gherkin

Abra o arquivo `.feature` gerado pelo scaffold e escreva seus cenários. Lembre-se:

- **Keywords em inglês** (`Given`, `When`, `Then`)
- **Conteúdo em português** (texto dos steps)

```gherkin
Feature: Contatos (Contact)

  Background:
    Given que eu navego para a lista de Contatos

  @smoke
  Scenario: Deve criar um novo contato
    When eu crio um contato com nome único
    Then o título da página deve conter o nome do contato
    And eu excluo o contato criado
```

---

## 7. Implementando os Steps

Os steps são uma **camada fina** — não coloque lógica aqui. Apenas delegue para o Page Object:

```typescript
import { Given, When, Then } from '../fixtures/bdd';
import { ContactFactory } from '../factories/contactFactory';

Given('que eu navego para a lista de Contatos', async ({ contactPage }) => {
  await contactPage.navigate();
});

When('eu crio um contato com nome único', async ({ contactPage, testContext }) => {
  const data = ContactFactory.buildMinimal();
  testContext.name = `${data.firstName} ${data.lastName}`;
  await contactPage.clickNew();
  await contactPage.firstNameField.fill(data.firstName);
  await contactPage.lastNameField.fill(data.lastName);
  await contactPage.save();
  await contactPage.waitForRecordPage();
});

Then('eu excluo o contato criado', async ({ contactPage, testContext }) => {
  await contactPage.navigate();
  await contactPage.deleteRecord(testContext.name, 'Contact');
});
```

---

## 8. Rodando o Teste

```bash
# Gere os specs e rode tudo
npm test

# Rode só o seu objeto (por nome da feature)
npx bddgen && npx playwright test --grep "Contatos"

# Rode com browser visível (útil para ver o que está acontecendo)
npm run test:headed

# Rode em modo debug (passo a passo com Playwright Inspector)
npm run test:debug
```

Se o teste falhar, use o **Trace Viewer** para ver exatamente o que aconteceu:

```bash
npm run test:report
```

---

## 9. Usando o MCP Playwright para Inspecionar Elementos

O **MCP Playwright** é um servidor que permite ao GitHub Copilot **controlar um browser real**. Com ele, o Copilot consegue:

- Navegar até uma página do Salesforce
- Tirar screenshots
- Inspecionar elementos e retornar seletores prontos
- Clicar, preencher campos e testar interações

### O servidor já está configurado

O projeto já inclui o arquivo `.vscode/mcp.json` com o servidor Playwright configurado. Você só precisa:

1. Abra o VS Code neste projeto
2. Abra o **Copilot Chat** (Ctrl+Shift+I)
3. Na lista de ferramentas do chat (ícone de ferramenta), verifique que **"playwright"** aparece como servidor MCP disponível
4. Se não aparecer, clique em **"Start"** ao lado do servidor `playwright` no painel de MCP

### Como usar na prática

Com o servidor MCP rodando, peça ao Copilot no chat:

```
Abra o Salesforce em https://minha-org.lightning.force.com/lightning/o/Contact/list
e tire um snapshot da página. Quais seletores Playwright eu devo usar para os
campos do formulário de criação de Contact?
```

O Copilot vai:

1. Abrir o browser (Chrome)
2. Navegar até a URL
3. Tirar um screenshot ou snapshot da acessibilidade
4. Analisar os elementos e te retornar os seletores corretos

> **Dica:** o MCP Playwright abre um browser **real** (headed). Certifique-se de que está autenticado no Salesforce ou faça login manualmente quando o browser abrir.

### Executando o servidor MCP manualmente (terminal)

Se preferir rodar o servidor fora do VS Code:

```bash
npx @playwright/mcp --browser chrome --caps vision
```

O servidor fica escutando via stdin/stdout (protocolo MCP). No uso normal via VS Code + Copilot, **você não precisa rodar manualmente** — o VS Code inicia automaticamente pelo `.vscode/mcp.json`.

---

## 10. Pedindo Ajuda ao Copilot

O GitHub Copilot conhece todas as regras do projeto (via `.github/copilot-instructions.md`). Você pode pedir ajuda diretamente no chat:

### Exemplos de perguntas úteis

**Gerar um Page Object:**

```
Crie o Page Object para o objeto Salesforce "Opportunity".
Os campos são: Name (texto), Amount (número), Close Date (data),
Stage (picklist com valores: Prospecting, Qualification, Closed Won).
```

**Descobrir um seletor:**

```
Qual seletor Playwright devo usar para o campo "Lead Source"
que é uma picklist dentro do modal do Salesforce?
```

**Gerar uma Factory:**

```
Crie uma factory para o objeto Contact com os campos:
firstName (obrigatório), lastName (obrigatório), email (opcional),
phone (opcional), leadSource (picklist: Web, Phone, Partner).
```

**Gerar cenários Gherkin:**

```
Escreva cenários Gherkin para CRUD completo do objeto Opportunity.
Siga a convenção do projeto: keywords em inglês, conteúdo em português.
```

**Depurar um erro:**

```
Meu teste está falhando com "strict mode violation: resolved to 2 elements"
no campo "Account Name". O que pode ser?
```

### Dicas para melhores respostas do Copilot

1. **Seja específico** — diga o nome exato do objeto, dos campos e dos tipos
2. **Mencione o tipo do campo** — "picklist", "lookup", "text", "date" — isso muda a classe usada
3. **Referencie os arquivos** — use `@AccountPage.ts` para que o Copilot veja o exemplo de referência
4. **Peça para seguir o padrão** — diga "siga o padrão do AccountPage" para garantir consistência

---

## Checklist Rápido

Antes de considerar seu teste pronto, confira:

- [ ] Os campos usam classes tipadas (`TextField`, `PicklistField`, etc.) — nunca locators crus
- [ ] Os labels dos campos estão **exatamente** iguais ao Salesforce
- [ ] Os dados vêm da Factory — nada hardcoded nos steps
- [ ] Todo registro criado é deletado no final do cenário
- [ ] O teste passa em headless (`npm test`) — não só em headed
- [ ] O cenário tem tags (`@smoke` ou `@regression`)
