# Salesforce + Playwright: Desafios e Soluções

> Baseado na experiência prática do projeto e no artigo  
> [Salesforce Test Automation With Playwright: Challenges, Setup, and Proven Strategies](https://www.testrigtechnologies.com/salesforce-test-automation-with-playwright-challenges-setup-and-proven-strategies/) — Testrig Technologies

Este documento registra os **problemas técnicos reais** encontrados ao testar Salesforce Lightning com Playwright — e as soluções que funcionaram. Para guias de configuração e uso, veja:

| Assunto                           | Documento                                            |
| --------------------------------- | ---------------------------------------------------- |
| Autenticação (Standard App)       | [auth-standard-app.md](auth-standard-app.md)         |
| Autenticação (Connected App / CI) | [auth-connected-app.md](auth-connected-app.md)       |
| Page Objects e herança            | [base-page-inheritance.md](base-page-inheritance.md) |
| Arquitetura BDD                   | [architecture-bdd.md](architecture-bdd.md)           |
| Adicionar novo objeto             | [new-object-checklist.md](new-object-checklist.md)   |

## Sumário

1. [Por que automatizar testes no Salesforce é difícil?](#1-por-que-automatizar-testes-no-salesforce-é-difícil)
2. [Por que Playwright para Salesforce?](#2-por-que-playwright-para-salesforce)
3. [Métodos que não funcionaram](#3-métodos-que-não-funcionaram)
4. [Locators: o que funciona e o que não funciona](#4-locators-o-que-funciona-e-o-que-não-funciona)
5. [Esperas (Waits): como lidar com LWC](#5-esperas-waits-como-lidar-com-lwc)
6. [Validação híbrida: API + UI](#6-validação-híbrida-api--ui)
7. [Dicas extras](#7-dicas-extras)

---

## 1. Por que automatizar testes no Salesforce é difícil?

O Salesforce apresenta desafios únicos em comparação com aplicações web convencionais:

### 1.1 DOM Lightning dinâmico (Shadow DOM)

O Salesforce Lightning gera IDs em tempo de execução (ex: `id="21:1886;a"`) e usa Shadow DOM extensivamente via LWC. Locators baseados em IDs ou XPath absolutos **quebram a cada release**. Toda estratégia de seleção deve ser construída sobre atributos estáveis.

### 1.2 Três releases por ano

O Salesforce lança atualizações três vezes ao ano (Spring, Summer, Winter). Cada release pode alterar estruturas de DOM, rótulos e fluxos. Os testes precisam ser modulares e desacoplados da implementação visual.

### 1.3 Workflows multi-módulo complexos

Fluxos reais abrangem múltiplos objetos (Leads → Opportunities → Accounts), abas, verificações de sincronização em tempo real e validações baseadas em perfil de usuário.

### 1.4 Acesso baseado em papéis (Role-Based Access)

Layouts e campos disponíveis diferem por perfil (Admin, Sales Rep, Agent). A automação precisa considerar renderização condicional e permissões que mudam a UI.

### 1.5 Integrações de terceiros

O Salesforce se conecta com ERPs, CRMs e sistemas de pagamento. Uma cobertura completa exige combinar validação de UI com chamadas de API.

---

## 2. Por que Playwright para Salesforce?

### 2.1 Suporte nativo a Shadow DOM

O Salesforce Lightning depende fortemente de Shadow DOM. Frameworks tradicionais como Selenium exigem execução de JavaScript customizado para acessar elementos dentro de Shadow Roots:

```javascript
// Selenium — requer JS manual para piercing de Shadow DOM
WebElement shadowHost = driver.findElement(By.cssSelector("lightning-input"));
WebElement shadowRoot = (WebElement) ((JavascriptExecutor) driver)
    .executeScript("return arguments[0].shadowRoot", shadowHost);
WebElement input = shadowRoot.findElement(By.cssSelector("input"));
```

O Playwright acessa a árvore de acessibilidade (ARIA) nativamente, que já atravessa os Shadow Roots do browser:

```typescript
// Playwright — sem JavaScript manual, funciona nativamente
await page.getByRole('dialog').getByRole('textbox', { name: 'Account Name' }).fill('Meu Hotel');
```

### 2.2 Auto-waiting integrado

Salesforce executa operações assíncronas pesadas (Apex, SOQL, REST API). O Playwright aguarda automaticamente que os elementos estejam prontos antes de interagir, eliminando `sleep()` frágeis.

### 2.3 Integração nativa de API + UI

É possível combinar chamadas REST ao Salesforce com validações de UI no mesmo teste e no mesmo contexto, sem bibliotecas externas.

### 2.4 Execução paralela para regressão em escala

O runner nativo do Playwright permite executar grandes suítes de regressão em paralelo no CI/CD.

### 2.5 Suporte multi-browser

Chrome, Firefox, WebKit (Safari) e emulação mobile — tudo com a mesma API.

---

## 3. Métodos que não funcionaram

### 3.1 `waitForLoadState('domcontentloaded')` após navegação

```typescript
// ❌ Não funciona — evento dispara antes do LWC renderizar os componentes
await page.goto(`/lightning/o/${objectApiName}/list`);
await page.waitForLoadState('domcontentloaded');
// Aqui os botões e tabelas ainda não existem no DOM
```

**Motivo:** O Salesforce Lightning usa **Lightning Web Components (LWC)** com renderização assíncrona. O evento `domcontentloaded` e até `networkidle` disparam antes dos componentes ficarem visíveis. Ao tentar interagir logo depois, os elementos ainda não estão prontos.

**Solução:** Aguardar explicitamente um elemento-âncora confiável como o botão "New":

```typescript
// ✅ Funciona — botão "New" aparece apenas quando o LWC terminou de renderizar
await page.getByRole('button', { name: 'New' }).waitFor({ state: 'visible' });
```

---

### 3.2 `div[role="dialog"]` como locator para o modal

```typescript
// ❌ Falha com "strict mode violation: resolved to 2 elements"
await page.locator('div[role="dialog"]').waitFor({ state: 'visible' });
```

**Motivo:** O Salesforce sempre tem um elemento `div[role="dialog"]` invisível no DOM chamado `auraError` — um container de erros que fica presente o tempo todo, mesmo quando não há erro. Portanto, ao aguardar `div[role="dialog"]`, o Playwright encontra 2 elementos: o modal real + o `auraError`.

**Solução:** Usar `.slds-modal` que identifica apenas modais visuais do SLDS (Salesforce Lightning Design System):

```typescript
// ✅ Funciona — .slds-modal existe apenas quando o modal real está aberto
await page.locator('.slds-modal').waitFor({ state: 'visible' });
```

---

### 3.3 `getByLabel('Account Name')` dentro do modal

```typescript
// ❌ Falha — encontra 3+ elementos diferentes no DOM
await page.getByLabel('Account Name').fill('Meu Hotel');
```

**Motivo:** O Playwright resolve `getByLabel` buscando por:

- `<label for="...">` → rótulo de input
- `aria-label="..."` → atributo diretamente no elemento
- `aria-labelledby="..."` → aponta para outro elemento pelo ID

No Salesforce, todos esses matches ocorrem simultaneamente para "Account Name":

1. O `<th aria-label="Account Name">` da coluna da **tabela da lista** (que ainda está no DOM em background)
2. O slider de redimensionamento da coluna (`<input type="range" aria-label="Account Name">`)
3. O botão de edição inline (`<button aria-label="Account Name">`)
4. O campo real no modal

O Playwright entra em **strict mode** e recusa executar a ação quando há mais de 1 match.

```typescript
// ❌ Ainda falha mesmo com exact — o <th aria-label> também é match exato
await page.getByLabel('Account Name', { exact: true }).fill('Meu Hotel');

// ❌ Falha — Shadow DOM impede que a busca de label percorra os roots corretamente
await page.locator('.slds-modal').getByLabel('Account Name').fill('Meu Hotel');
```

**Por que `.slds-modal + getByLabel` também falha:**

Dentro do modal Salesforce, os `<input>` vivem em Shadow Roots separados dos seus `<label>`. A associação `<label for="id">` não funciona atravessando Shadow DOM boundaries. O `getByLabel` em escopo CSS não consegue percorrer esses limites.

**Solução:** `getByRole('dialog').getByRole('textbox', { name })` usa a **árvore de acessibilidade** (ARIA), que é processada pelo browser de forma a atravessar Shadow DOM:

```typescript
// ✅ Funciona — getByRole usa a árvore de acessibilidade, que atravessa Shadow DOM
await page.getByRole('dialog').getByRole('textbox', { name: 'Account Name' }).fill('Meu Hotel');
await page.getByRole('dialog').getByRole('textbox', { name: 'Phone' }).fill('+55 11 99999-9999');
```

---

### 3.4 `locator('main').getByRole('heading', { level: 1 })` para aguardar o detalhe do registro

```typescript
// ❌ Timeout — elemento existe mas não é encontrado via busca de role no DOM
await page.locator('main').getByRole('heading', { level: 1 }).waitFor({ state: 'visible' });
```

**Motivo:** O `<h1>` do título do registro fica dentro de múltiplos níveis de Shadow DOM aninhados dentro de `<main>`. A combinação `locator('main')` faz uma busca CSS que não atravessa Shadow Roots, então o `getByRole('heading')` subsequente não encontra o `<h1>` real.

Confirmado via MCP Playwright: o elemento existe e está visível no snapshot, mas o Playwright falsa o timeout porque o `locator()` CSS scope não expõe os filhos de Shadow Root para o `.getByRole()` seguinte.

**Solução 1 — `page.title()`** (adotada): O Salesforce configura o `<title>` da página como `"NomeDoRegistro | TipoDoObjeto | Salesforce"` — sem Shadow DOM, completamente acessível:

```typescript
// ✅ Funciona — page.title() não tem Shadow DOM
const title = await this.page.title();
return title.split(' | ')[0]; // "Acme Corp 1719438291"
```

**Solução 2 — aguardar um elemento âncora confiável**: O botão "Show more actions" sempre aparece no header do registro e não vive em Shadow DOM profundo:

```typescript
// ✅ Funciona — botão comprovado por estar no topo do DOM do record page
await page.getByRole('button', { name: 'Show more actions' }).waitFor({ state: 'visible' });
```

---

## 4. Locators: o que funciona e o que não funciona

### Resumo

| Locator                                            | Contexto                  | Resultado | Motivo                                           |
| -------------------------------------------------- | ------------------------- | --------- | ------------------------------------------------ |
| `getByLabel('Account Name')`                       | Modal de criação          | ❌        | 3+ matches (th, slider, botão de edição)         |
| `getByLabel('Account Name', {exact:true})`         | Modal                     | ❌        | `<th aria-label>` também é match exato           |
| `locator('.slds-modal').getByLabel(...)`           | Modal                     | ❌        | Shadow DOM quebra associação `<label for>`       |
| `getByRole('dialog').getByRole('textbox', {name})` | Modal                     | ✅        | ARIA tree atravessa Shadow DOM                   |
| `locator('div[role="dialog"]')`                    | Modal                     | ❌        | `auraError` sempre presente no DOM               |
| `locator('.slds-modal')`                           | Modal (aguardar abertura) | ✅        | Só existe quando modal SLDS está aberto          |
| `locator('main').getByRole('heading', {level:1})`  | Record page               | ❌        | `<h1>` aninhado em Shadow DOM profundo           |
| `page.title()`                                     | Record page               | ✅        | `<title>` é nativo do document, sem Shadow DOM   |
| `getByRole('button', {name:'Show more actions'})`  | Record page               | ✅        | No topo do DOM, fora de Shadow Root problemático |
| `getByRole('button', {name:'New'})`                | List page                 | ✅        | Renderizado no DOM acessível                     |
| `getByRole('link', {name, exact:true}).first()`    | List page                 | ✅        | Links de registro são acessíveis na tabela       |
| `getByRole('menuitem', {name:'Delete'})`           | Menu de ações             | ✅        | Menu renderizado no DOM principal                |

---

### Por que Shadow DOM é o grande vilão no Salesforce Cada componente LWC tem seu próprio Shadow Root isolado. Isso significa:

```
document
└─ <main>
   └─ #shadow-root (lightning-record-view-form)
      └─ <div>
         └─ #shadow-root (lightning-record-edit-form)
            └─ <div>
               └─ <label>Account Name</label>   ← em um shadow root
               └─ #shadow-root (lightning-input)
                  └─ <input>                    ← em outro shadow root
```

A `<label>` e o `<input>` estão em **Shadow Roots diferentes**. A associação `<label for="inputId">` não funciona através de Shadow DOM boundaries (é uma limitação da especificação HTML). Por isso:

- `getByLabel` falha em escopo dentro do modal
- `locator('.slds-modal').getByLabel(...)` não encontra o input

O `getByRole('textbox', {name})` funciona porque ele usa a **árvore de acessibilidade do browser** (que os browsers expõem piercing Shadow DOM via ARIA) em vez de usar o DOM diretamente.

---

## 5. Esperas (Waits): como lidar com LWC

### Regra geral

**Nunca confie em `waitForLoadState`** para componentes LWC. Use sempre esperas por elementos-âncora específicos.

### Padrão de espera por página

```typescript
// Aguardar lista pronta
await page.getByRole('button', { name: 'New' }).waitFor({ state: 'visible' });

// Aguardar modal aberto
await page.locator('.slds-modal').waitFor({ state: 'visible' });

// Aguardar record page carregada
await page.waitForURL('**/lightning/r/**', { timeout: 30_000 });
await page.getByRole('button', { name: 'Show more actions' }).waitFor({ state: 'visible' });

// Aguardar retorno para lista após delete
await page.waitForURL('**/lightning/o/{ObjectName}/list**', {
  timeout: 30_000,
});
await page.getByRole('button', { name: 'New' }).waitFor({ state: 'visible' });
```

### Aguardar resposta de API Salesforce (`waitForResponse`)

Para operações que disparam chamadas Apex ou Aura, use `waitForResponse` para garantir que o servidor processou antes de prosseguir:

```typescript
// Aguardar a resposta da ação Salesforce antes de verificar o resultado
const [response] = await Promise.all([
  page.waitForResponse((resp) => resp.url().includes('/aura') && resp.status() === 200),
  page.getByRole('button', { name: 'Save', exact: true }).click(),
]);

// ⚠️ Anti-padrão — evite waitForTimeout
// await page.waitForTimeout(3000); // quebrável, não espera o servidor de fato
```

### Timeouts recomendados para Salesforce

```typescript
// playwright.config.ts
export default defineConfig({
  timeout: 90_000, // timeout total por teste (LWC é lento)
  expect: { timeout: 15_000 }, // assertions tentam por 15s antes de falhar

  use: {
    actionTimeout: 30_000, // click, fill, etc. — aguarda até 30s
    navigationTimeout: 60_000, // page.goto, waitForURL — aguarda até 60s
  },
});
```

---

## 6. Validação híbrida: API + UI

Uma técnica poderosa é combinar chamadas de API REST com asserções de UI no mesmo teste. Isso reduz dependência de renderização e acelera a limpeza de dados.

### Exemplo: criar via UI, validar via API, limpar via API

```typescript
test('Account criada aparece na lista', async ({ page, request }) => {
  const accountPage = new AccountPage(page);
  const data = AccountFactory.buildMinimal();

  // 1. Criar via UI
  await accountPage.navigateToObject('Account');
  await accountPage.clickNew();
  await accountPage.fillName(data.name);
  await accountPage.save();
  await accountPage.waitForRecordPage();

  // 2. Validar via API REST Salesforce
  const query = `SELECT Id, Name FROM Account WHERE Name = '${data.name}' LIMIT 1`;
  const res = await request.get(`/services/data/v59.0/query?q=${encodeURIComponent(query)}`);
  expect(res.ok()).toBeTruthy();
  const result = await res.json();
  expect(result.records).toHaveLength(1);
  const accountId = result.records[0].Id;

  // 3. Limpar via API (mais rápido que navegar pela UI)
  const del = await request.delete(`/services/data/v59.0/sobjects/Account/${accountId}`);
  expect(del.status()).toBe(204);
});
```

> **Dica**: o objeto `request` do Playwright herda automaticamente os cookies da sessão carregada via `storageState`, portanto a autenticação já está incluída.

---

## 7. Dicas extras

### 7.1 Seletores estáveis com `data-aura-class`

Evite seletores frágeis baseados em classes geradas dinamicamente. Prefira atributos de acessibilidade e atributos Aura:

```typescript
// ✅ Estável — usa aria-label e data-aura-class
page.locator("[data-aura-class='forceOutputLookup']");
page.getByRole('button', { name: 'Save', exact: true });
page.getByRole('dialog').getByRole('textbox', { name: 'Account Name' });

// ❌ Frágil — classes CSS geradas podem mudar a cada release
page.locator('.forceRecordLayout .slds-form-element input');
```

### 7.2 Testes de acessibilidade com axe-core

```typescript
import AxeBuilder from '@axe-core/playwright';

test('página de Account é acessível', async ({ page }) => {
  await page.goto('/lightning/o/Account/list');
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});
```

Instale com: `npm install --save-dev @axe-core/playwright`

---

## Referências

- [Playwright storageState docs](https://playwright.dev/docs/auth)
- [Playwright Shadow DOM](https://playwright.dev/docs/locators#locate-in-shadow-dom)
- [Salesforce LWC & Shadow DOM](https://developer.salesforce.com/docs/component-library/documentation/en/lwc/lwc.create_components_shadow_dom)
- [SLDS Component Library](https://www.lightningdesignsystem.com/)
- [Testrig Technologies — Salesforce Test Automation with Playwright](https://www.testrigtechnologies.com/salesforce-test-automation-with-playwright-challenges-setup-and-proven-strategies/)
- [axe-core para Playwright](https://github.com/dequelabs/axe-core-npm/tree/develop/packages/playwright)
