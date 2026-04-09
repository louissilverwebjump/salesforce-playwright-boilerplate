# Copilot Instructions — Salesforce Playwright Automation

This project tests a Salesforce Lightning org using Playwright + TypeScript, following Page Object Model (POM). Always apply the rules below when writing or modifying any test code.

See [salesforce-pitfalls.md](../docs/salesforce-pitfalls.md) for the Salesforce-specific challenges and solutions guide.

---

## Language

All code must be written in **English**: method names, variable names, test descriptions, and comments. The Salesforce field labels (`'Account Name'`, `'Phone'`) come from the app and must match exactly — they are not subject to this rule.

---

## Project Structure

```
tests/
  auth.setup.ts          # One-time login — do not put test logic here
  features/              # Gherkin BDD scenarios — one .feature per Salesforce object
  steps/                 # Step definitions — thin layer delegating to page objects
  factories/             # Data factories using faker.js — one per Salesforce object
  fixtures/
    bdd.ts               # BDD bridge — createBdd(test) + testContext fixture
  pages/
    BasePage.ts          # Generic Salesforce operations — add shared logic here
    AccountPage.ts       # Account-specific interactions (reference implementation)
  utils/
    SalesforceFields.ts  # Typed field wrapper classes — use for ALL modal form fields
```

New Salesforce objects get their own `*Page.ts` extending `BasePage`, a `*Factory.ts` in `factories/`, a `.feature` in `features/`, and step definitions in `steps/`.

---

## Typed Field Classes (`SalesforceFields.ts`) — MANDATORY

**All modal form fields must be defined using the typed field classes from `tests/utils/SalesforceFields.ts`.** Never use raw Playwright locators directly inside page objects for form field interactions.

| Class                  | Salesforce field type                           | DOM element                              |
| ---------------------- | ----------------------------------------------- | ---------------------------------------- |
| `TextField`            | Text, textarea                                  | `<input type="text">` / `<textarea>`     |
| `PicklistField`        | Standard picklist (Rating, Type, Industry…)     | `<button role="combobox">`               |
| `AddressPicklistField` | Geo-picklist (Billing/Shipping Country & State) | `<input role="combobox">`                |
| `LookupField`          | Relationship lookup (Parent Account…)           | `<input role="combobox">`                |
| `NumberField`          | Number, currency, integer                       | `<input role="spinbutton">`              |
| `DateField`            | Date                                            | `<input type="text">` with LWC date mask |
| `CheckboxField`        | Checkbox                                        | `<input type="checkbox">`                |

Each class exposes a consistent API:

- **`locator`** — the underlying Playwright `Locator`
- **`undoButton`** — the "Undo" button for that field
- **`inlineError`** — the `'Complete this field.'` message scoped to that field's listitem
- **`fill(value)` / `select(option)` / `search(value)` / `check()` / `uncheck()`** — field interaction
- **`clear()`** — resets the field to its empty state
- **`expectValue(value)`** — web-first assertion: asserts the field displays the given value
- **`expectEmpty()`** — web-first assertion: asserts the field is in its default empty state

```typescript
// ✅ Correct — declare typed field properties in the constructor
import {
  TextField,
  PicklistField,
  AddressPicklistField,
  LookupField,
  NumberField,
  DateField,
} from '../utils/SalesforceFields';

export class AccountPage extends BasePage {
  readonly accountNameField: TextField;
  readonly ratingField: PicklistField;
  readonly billingCountryField: AddressPicklistField; // geo-picklist: <input role="combobox">
  readonly parentAccountField: LookupField;
  readonly employeesField: NumberField;
  readonly slaExpirationDateField: DateField;

  constructor(page: Page) {
    super(page);
    this.accountNameField = new TextField(page, 'Account Name');
    this.ratingField = new PicklistField(page, 'Rating');
    this.billingCountryField = new AddressPicklistField(page, 'Billing Country');
    this.parentAccountField = new LookupField(page, 'Parent Account');
    this.employeesField = new NumberField(page, 'Employees');
    this.slaExpirationDateField = new DateField(page, 'SLA Expiration Date');
  }
}

// Usage in specs:
await accountPage.accountNameField.fill('Acme Corp');
await accountPage.ratingField.select('Hot');
await accountPage.billingCountryField.select('Brazil');
await accountPage.employeesField.expectValue(500);
await accountPage.accountNameField.expectEmpty();
await expect(accountPage.accountNameField.inlineError).toBeVisible();

// ❌ Wrong — raw locators inside page objects for form fields
this.accountNameField = page.getByRole('dialog').getByRole('textbox', { name: 'Account Name' });
await this.accountNameField.fill('Acme Corp'); // skips clear(), no expectEmpty(), no inlineError
```

> **Why `AddressPicklistField` instead of `PicklistField` for address fields?**
> Billing/Shipping Country and State/Province render as `<input role="combobox">` (no `textContent`) while standard picklists render as `<button role="combobox">`. `toContainText` only works on elements with text content; `AddressPicklistField` overrides `expectValue` and `expectEmpty` to use `toHaveValue` instead.

---

## Page Object Rules (DRY)

- **Never duplicate logic** between page classes. Shared operations (modal, save, delete, navigation, waiting) belong in `BasePage`.
- If two page classes have the same method body, move it to `BasePage`.
- **Locators must be declared as `readonly` class properties** and initialized in the constructor — never built inline inside methods. This is the official Playwright POM pattern.

```typescript
// ✅ Correct — typed field class properties declared and initialized in constructor
export class AccountPage extends BasePage {
  readonly accountNameField: TextField;

  constructor(page: Page) {
    super(page);
    this.accountNameField = new TextField(page, 'Account Name');
  }

  async fillName(name: string) {
    await this.accountNameField.fill(name);
  }
}

// ❌ Wrong — raw Playwright locator for a form field
export class AccountPage extends BasePage {
  readonly accountNameField: Locator;

  constructor(page: Page) {
    super(page);
    // Raw locator gives no clear(), inlineError, or expectEmpty()
    this.accountNameField = page.getByRole('dialog').getByRole('textbox', { name: 'Account Name' });
  }
}
```

- `BasePage` declares shared element properties (`newButton`, `saveButton`, `deleteButton`, `actionsMenuButton`, `modal`) — subclasses inherit and use them directly.
- `getListItem(name)` lives in `BasePage` because it is used by every object page — do not redeclare it in subclasses.
- Subclass form field properties follow the pattern: `readonly <semanticName>Field: TextField | PicklistField | AddressPicklistField | LookupField | NumberField | DateField | CheckboxField`.

---

## JSDoc

Every class and every public method in a page object **must** have a JSDoc block. Follow TypeScript/JSDoc industry conventions:

- **Class**: one-line summary describing the object it represents.
- **Property**: single-line `/** ... */` comment describing the element.
- **Method**: summary line + `@param` for each parameter (when non-obvious) + `@returns` when the return type carries semantic meaning.

```typescript
/**
 * Page object for the Salesforce Account object.
 * Covers CRUD operations on the Account list and record pages.
 */
export class AccountPage extends BasePage {
  /** "Account Name" text field inside the New/Edit modal. */
  readonly accountNameField: Locator;

  /**
   * Creates a new Account record end-to-end:
   * opens the modal, fills the name, saves, and waits for the record page.
   *
   * @param name - Name for the new Account.
   */
  async createAccount(name: string) { ... }

  /**
   * Returns the name of the currently open record.
   *
   * @returns The record name extracted from the browser page title.
   */
  async getRecordTitle(): Promise<string> { ... }
}
```

Do **not** add JSDoc to:

- `constructor` (self-explanatory)
- Private/internal inline variables
- Spec files (`*.spec.ts`) — test descriptions already document intent

---

## Locator Priority (strictly in this order)

| Priority | Method                                                              | Use when                                              |
| -------- | ------------------------------------------------------------------- | ----------------------------------------------------- |
| 0        | `SalesforceFields.ts` typed class (`TextField`, `PicklistField`…)   | **All modal form fields — always use typed classes**  |
| 1        | `getByRole('button', { name: 'Save', exact: true })`                | Buttons, links, checkboxes, comboboxes                |
| 2        | `getByRole('dialog').getByRole('textbox', { name: 'Field Label' })` | Form fields inside modals (only inside field classes) |
| 3        | `getByLabel('Label text')`                                          | Native HTML inputs **outside** Shadow DOM only        |
| 4        | `getByText('...')`                                                  | Display-only text content                             |
| 5        | `locator('.slds-modal')`                                            | SLDS structural class for modal container detection   |
| 6        | `locator("[data-aura-class='AuraComponentName']")`                  | When no ARIA attribute is available                   |

**Never use:**

- CSS class selectors with dynamic/generated names (e.g., `.forceRecordLayout .slds-form-element input`)
- XPath
- CSS `id` selectors inside Lightning components (IDs are generated at runtime)
- `locator('input#emc')` style — only acceptable in `auth.setup.ts` for the MFA input

---

## Salesforce-Specific Locator Patterns

```typescript
// ✅ Buttons (toolbar, modal, header)
page.getByRole('button', { name: 'New' });
page.getByRole('button', { name: 'Save', exact: true });
page.getByRole('button', { name: 'Delete', exact: true });
page.getByRole('button', { name: 'Show more actions' });

// ✅ Modal text fields — always scope to dialog first
page.getByRole('dialog').getByRole('textbox', { name: 'Account Name' });
page.getByRole('dialog').getByRole('textbox', { name: 'Phone' });

// ✅ Modal container (structural anchor only — not for assertions)
page.locator('.slds-modal');

// ✅ Record title — Shadow DOM-safe
const title = await page.title(); // "Record Name | Object | Salesforce"
return title.split(' | ')[0];

// ✅ Record list item link
page.getByRole('link', { name: recordName, exact: true }).first();

// ❌ These break due to Salesforce Shadow DOM or dynamic classes
page.getByLabel('Account Name'); // 3+ matches via Shadow DOM
page.locator('.slds-page-header__title'); // 2+ elements in DOM
page.locator('main').getByRole('heading', { level: 1 }); // Shadow DOM scope failure
```

---

## Wait Strategy

**Never use `waitForTimeout`** — it is a fixed delay and makes tests flaky.

| Situation         | Correct wait                                                                    |
| ----------------- | ------------------------------------------------------------------------------- |
| List page ready   | `await page.getByRole('button', { name: 'New' }).waitFor({ state: 'visible' })` |
| Modal open        | `await page.locator('.slds-modal').waitFor({ state: 'visible' })`               |
| Record page ready | `waitForURL('**/lightning/r/**')` + `'Show more actions'` button visible        |
| After delete      | `waitForURL('**/lightning/o/{Object}/list**')` + `'New'` button visible         |
| Network operation | `Promise.all([page.waitForResponse(r => r.url().includes('/aura')), action()])` |

All state-changing operations (`save`, `delete`, navigation) must wait for a stable DOM anchor before returning. Do not leave a method without a wait postcondition.

---

## Assertions — Web-First Only

Always use Playwright web-first assertions. Never use `isVisible()` / `isEnabled()` inside `expect`.

```typescript
// ✅
await expect(page.getByRole('link', { name: recordName })).toBeVisible();
await expect(page.getByText('Record created')).toBeVisible();

// ❌
expect(await page.getByText('Record created').isVisible()).toBe(true);
```

---

## Test Isolation

- Every test must create its own data using a **factory** (see [Data Factories](#data-factories-mandatory) below). The factory generates unique names with `Date.now()` automatically.
- Every test that creates a record must delete it (or use `afterEach`). Do not leave test data in the org.
- Tests must not depend on execution order. Each test navigates to its starting point independently.
- Use `test.beforeEach` / `Background` only for navigation — never for data setup that another test relies on.

---

## Fixtures

Page objects are injected via fixtures — never instantiate them directly inside specs.

```typescript
// ✅
test('create account', async ({ accountPage }) => { ... });

// ❌
test('create account', async ({ page }) => {
  const accountPage = new AccountPage(page);
  ...
});
```

---

## Timeouts

Timeouts are configured globally in `playwright.config.ts`. Do not set per-action timeouts in page methods unless the operation is known to be slower than the global default (e.g., Apex-triggered saves).

```typescript
// Only override when justified
await this.page
  .getByRole('button', { name: 'Show more actions' })
  .waitFor({ state: 'visible', timeout: 30_000 }); // Apex callout may be slow
```

---

## Data Factories (`tests/factories/`) — MANDATORY

**All test data must be generated by factory classes using `@faker-js/faker`.** Never hardcode field values directly in step definitions or page objects. Each Salesforce object has its own factory file (`accountFactory.ts`, etc.).

A factory exports:

1. **A `Data` interface** (e.g. `AccountData`) — typed contract with only required fields as mandatory, all others optional.
2. **A `Factory` class** (e.g. `AccountFactory`) with static builder methods.

### Builder methods

| Method                             | Purpose                          | What it generates                                                                                |
| ---------------------------------- | -------------------------------- | ------------------------------------------------------------------------------------------------ |
| `buildComplete(overrides?)`        | All fields populated             | Every field with random faker data. Picklist values are constrained to valid Salesforce options. |
| `buildMinimal(overrides?)`         | Only required fields             | Just the mandatory field(s) (e.g. `name`).                                                       |
| `buildPartial(fields, overrides?)` | Specific fields with random data | Generates a complete record internally and returns only `name` + the requested keys.             |

### Choosing the right builder

- **`buildComplete()`** — test fills every field.
- **`buildPartial(['rating', 'phone', 'industry'])`** — test fills a subset of fields with **random** faker values.
- **`buildMinimal()`** — test fills only the required field(s).
- **`overrides`** (on any builder) — **force** a specific value when the test asserts against it (e.g. `{ rating: 'Cold' }`).

```typescript
// ✅ Correct — partial fill with random data
const data = AccountFactory.buildPartial([
  'rating',
  'phone',
  'industry',
  'billingCountry',
  'billingState',
]);
await accountPage.fillAllFields(data); // fills name + those 5 fields, all random

// ✅ Correct — complete data with one field forced
const data = AccountFactory.buildComplete({ rating: 'Cold' });
await accountPage.fillAllFields(data); // fills ALL fields, rating is always 'Cold'

// ✅ Correct — minimal + one forced override (when you need an exact value)
const data = AccountFactory.buildMinimal({ rating: 'Hot' });
await accountPage.fillAllFields(data); // fills name + rating only

// ❌ Wrong — hardcoded values in step definitions or page objects
await accountPage.accountNameField.fill('Acme Corp');
await accountPage.ratingField.select('Hot');
await accountPage.phoneField.fill('+55 11 99999-9999');
```

### Page Object integration

Page objects accept the `Data` interface in `fillAllFields(data)`. The method only fills fields present in the object — absent (undefined) fields are skipped. This allows a single method to handle complete, minimal, and partial fills.

### Creating a new factory

When adding a new Salesforce object:

1. Create `tests/factories/<object>Factory.ts`
2. Define the `<Object>Data` interface — required fields mandatory, rest optional
3. Map valid picklist values as `const` arrays
4. Implement `buildComplete()`, `buildMinimal()`, and `buildPartial()` with `overrides` parameter
5. Import the `Data` interface in the corresponding Page Object
6. Use the factory in step definitions — never hardcode values

---

## BDD with Cucumber (playwright-bdd)

Tests are written as Gherkin `.feature` files in `tests/features/` and executed via [playwright-bdd](https://vitalets.github.io/playwright-bdd/).

### Conventions

- **Keywords** in English: `Feature`, `Scenario`, `Given`, `When`, `Then`, `And`
- **Content** in Portuguese: scenario names, step text, descriptions
- **Background** handles navigation — do not put `Given` inside individual scenarios
- **Each scenario** must have exactly **1 `When`** and **1 `Then`** keyword (use `And` for additional steps)
- **Step definitions** in `tests/steps/` are a thin delegation layer — all logic belongs in page objects
- **Data generation** in steps must use factories, never inline values

```gherkin
# ✅ Correct — keywords EN, content PT, 1 When, 1 Then
Feature: Contas (Account)

  Background:
    Given que eu navego para a lista de Contas

  Scenario: Deve criar uma nova conta
    When eu crio uma conta com nome único
    Then o título da página deve conter o nome da conta
```

```typescript
// ✅ Correct — step delegates to page object, data from factory
When('eu preencho todos os campos da conta', async ({ accountPage, testContext }) => {
  const data = AccountFactory.buildComplete();
  testContext.name = data.name;
  await accountPage.fillAllFields(data);
});

// ❌ Wrong — logic and hardcoded data in step definition
When('eu preencho todos os campos da conta', async ({ accountPage }) => {
  await accountPage.accountNameField.fill('Acme Corp');
  await accountPage.ratingField.select('Hot');
  // ... 30 more hardcoded lines
});
```

---

## Authentication & Multi-Org

The project supports **two authentication modes** controlled by `SF_AUTH_MODE`:

| Mode          | `SF_AUTH_MODE`       | Use case                          | How it works                                            |
| ------------- | -------------------- | --------------------------------- | ------------------------------------------------------- |
| Standard App  | `standard` (default) | Local development, headed browser | Browser login + MFA `page.pause()` + cookies (~1 month) |
| Connected App | `connected-app`      | CI/CD, headless, API data mgmt    | OAuth 2.0 password grant → `frontdoor.jsp?sid=<token>`  |

### Multi-org support

The `ENV_FILE` environment variable selects the `.env` file (`.env.dev`, `.env.qa`). Auth state is saved per environment as `.auth/salesforce-<envName>.json`.

### Key files

- `tests/auth.setup.ts` — dispatches to standard or connected-app flow based on `SF_AUTH_MODE`
- `tests/utils/SalesforceAuth.ts` — shared OAuth 2.0 password grant for Connected App
- `tests/utils/SalesforceApi.ts` — REST API wrapper for test data (Connected App only)
- `playwright.global-setup.ts` — validates required env vars before test execution

---

## What Not to Change

- `auth.setup.ts`: authentication logic is intentional. The `page.pause()` for MFA is deliberate for local development (Standard App mode).
- `.auth/salesforce-*.json`: generated per-environment auth files, never commit or edit manually.
- `playwright.config.ts` timeout values: tuned for Salesforce LWC rendering speed — do not reduce them.
- `.features-gen/`: generated by `bddgen`, never edit manually. Add to `.gitignore`.
