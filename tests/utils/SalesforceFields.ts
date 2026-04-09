import { Page, Locator, expect } from '@playwright/test';

/**
 * Represents a Salesforce Text field (single-line input or multi-line textarea).
 *
 * Selector: `getByRole('dialog').getByRole('textbox', { name: label })`
 *
 * @example
 * const nameField = new TextField(page, 'Account Name');
 * await nameField.fill('Acme Corp');
 */
export class TextField {
  /** The underlying Playwright locator for this field. */
  readonly locator: Locator;
  /** Button that undoes the last change, restoring the field to its original value. */
  readonly undoButton: Locator;
  /** Inline validation error scoped to this field's listitem; visible only when invalid. */
  readonly inlineError: Locator;

  constructor(page: Page, label: string) {
    this.locator = page.getByRole('dialog').getByRole('textbox', { name: label });
    this.undoButton = page.getByRole('dialog').getByRole('button', { name: `Undo ${label}` });
    this.inlineError = page
      .getByRole('dialog')
      .getByRole('listitem')
      .filter({ has: page.getByRole('textbox', { name: label }) })
      .getByText('Complete this field.');
  }

  /**
   * Clears the field and types the given value.
   *
   * @param value - Text to enter.
   */
  async fill(value: string): Promise<void> {
    await this.locator.fill(value);
  }

  /**
   * Clears all text from the field.
   */
  async clear(): Promise<void> {
    await this.locator.clear();
  }

  /**
   * Asserts the field contains the given value.
   *
   * @param value - Expected text value.
   */
  async expectValue(value: string): Promise<void> {
    await expect(this.locator).toHaveValue(value);
  }

  /**
   * Asserts the field is empty (value is `''`).
   */
  async expectEmpty(): Promise<void> {
    await expect(this.locator).toHaveValue('');
  }
}

/**
 * Represents a Salesforce Picklist field (single-select Lightning dropdown).
 *
 * Selector: `getByRole('dialog').getByRole('combobox', { name: label })`
 * Interaction: click the combobox to open it, then click the desired option.
 *
 * @example
 * const ratingField = new PicklistField(page, 'Rating');
 * await ratingField.select('Hot');
 */
export class PicklistField {
  /** The underlying Playwright locator for the combobox trigger. */
  readonly locator: Locator;
  /** Button that undoes the last change, restoring the field to its original value. */
  readonly undoButton: Locator;
  /** Inline validation error scoped to this field's listitem; visible only when invalid. */
  readonly inlineError: Locator;
  private readonly page: Page;

  constructor(page: Page, label: string) {
    this.page = page;
    this.locator = page.getByRole('dialog').getByRole('combobox', { name: label });
    this.undoButton = page.getByRole('dialog').getByRole('button', { name: `Undo ${label}` });
    this.inlineError = page
      .getByRole('dialog')
      .getByRole('listitem')
      .filter({ has: page.getByRole('combobox', { name: label }) })
      .getByText('Complete this field.');
  }

  /**
   * Opens the picklist and clicks the matching option.
   * Retries the combobox click once if the Salesforce LWC component re-renders
   * during the first attempt and the dropdown does not open.
   *
   * @param option - Visible label of the option to select (e.g. `'Hot'`, `'Casal'`).
   */
  async select(option: string): Promise<void> {
    const optionLocator = this.page.getByRole('option', { name: option, exact: true });
    await this.locator.click();
    // If a concurrent LWC re-render swallowed the first click, the listbox will not
    // appear. Wait up to 3 s and retry once before falling through to the final click.
    const opened = await optionLocator
      .waitFor({ state: 'visible', timeout: 3_000 })
      .then(() => true)
      .catch(() => false);
    if (!opened) {
      await this.locator.click();
    }
    await optionLocator.click();
  }

  /**
   * Resets the picklist to its default empty state (`--None--`).
   */
  async clear(): Promise<void> {
    await this.select('--None--');
  }

  /**
   * Asserts the picklist displays the given option.
   *
   * @param option - Expected visible option label (e.g. `'Hot'`, `'Technology'`).
   */
  async expectValue(option: string): Promise<void> {
    await expect(this.locator).toContainText(option);
  }

  /**
   * Asserts the picklist is in its default empty state (displays `--None--`).
   */
  async expectEmpty(): Promise<void> {
    await expect(this.locator).toContainText('--None--');
  }
}

/**
 * Represents a Salesforce address geo-picklist field (Billing/Shipping Country and State/Province).
 *
 * These fields render as `<input role="combobox">` instead of `<button role="combobox">` like
 * standard Lightning picklists. Because `<input>` elements have no `textContent`, assertions
 * must use `toHaveValue` rather than `toContainText`.
 *
 * Extends `PicklistField`: inherits `locator`, `undoButton`, `inlineError`, `select()`, and `clear()`.
 *
 * @example
 * const billingCountry = new AddressPicklistField(page, 'Billing Country');
 * await billingCountry.select('Brazil');
 * await billingCountry.expectValue('Brazil');
 */
export class AddressPicklistField extends PicklistField {
  /**
   * Asserts the address picklist input contains the given option value.
   *
   * @param option - Expected option value (e.g. `'Brazil'`, `'São Paulo'`).
   */
  async expectValue(option: string): Promise<void> {
    await expect(this.locator).toHaveValue(option);
  }

  /**
   * Asserts the address picklist input is in its default empty state (`--None--`).
   */
  async expectEmpty(): Promise<void> {
    await expect(this.locator).toHaveValue('--None--');
  }
}

/**
 * Represents a Salesforce Lookup field (relationship search field).
 *
 * Selector: `getByRole('dialog').getByRole('combobox', { name: label })`
 * Interaction: type a search term, then click the matching suggestion from the dropdown.
 *
 * @example
 * const parentField = new LookupField(page, 'Parent Account');
 * await parentField.search('Acme');
 */
export class LookupField {
  /** The underlying Playwright locator for the search input. */
  readonly locator: Locator;
  /** Button that undoes the last change, restoring the field to its original value. */
  readonly undoButton: Locator;
  /** Inline validation error scoped to this field's listitem; visible only when invalid. */
  readonly inlineError: Locator;
  private readonly page: Page;

  constructor(page: Page, label: string) {
    this.page = page;
    this.locator = page.getByRole('dialog').getByRole('combobox', { name: label });
    this.undoButton = page.getByRole('dialog').getByRole('button', { name: `Undo ${label}` });
    this.inlineError = page
      .getByRole('dialog')
      .getByRole('listitem')
      .filter({ has: page.getByRole('combobox', { name: label }) })
      .getByText('Complete this field.');
  }

  /**
   * Types a search term into the lookup field and clicks the first matching
   * suggestion that appears in the dropdown.
   *
   * @param value - Text to search for. Must match (or partially match) a record name.
   */
  async search(value: string): Promise<void> {
    await this.locator.fill(value);
    await this.page.getByRole('option', { name: value }).first().click();
  }

  /**
   * Clears the lookup field, removing any typed or selected value.
   */
  async clear(): Promise<void> {
    await this.locator.clear();
  }

  /**
   * Asserts the lookup field contains the given search text or selected record name.
   *
   * @param value - Expected value in the search input.
   */
  async expectValue(value: string): Promise<void> {
    await expect(this.locator).toHaveValue(value);
  }

  /**
   * Asserts the lookup field is empty (no record selected and no search text typed).
   */
  async expectEmpty(): Promise<void> {
    await expect(this.locator).toHaveValue('');
  }
}

/**
 * Represents a Salesforce Number field (integer or decimal).
 *
 * Selector: `getByRole('dialog').getByRole('spinbutton', { name: label })`
 *
 * @example
 * const employeesField = new NumberField(page, 'Employees');
 * await employeesField.fill(500);
 */
export class NumberField {
  /** The underlying Playwright locator for this field. */
  readonly locator: Locator;
  /** Button that undoes the last change, restoring the field to its original value. */
  readonly undoButton: Locator;
  /** Inline validation error scoped to this field's listitem; visible only when invalid. */
  readonly inlineError: Locator;

  constructor(page: Page, label: string) {
    this.locator = page.getByRole('dialog').getByRole('spinbutton', { name: label });
    this.undoButton = page.getByRole('dialog').getByRole('button', { name: `Undo ${label}` });
    this.inlineError = page
      .getByRole('dialog')
      .getByRole('listitem')
      .filter({ has: page.getByRole('spinbutton', { name: label }) })
      .getByText('Complete this field.');
  }

  /**
   * Clears the field and types the given numeric value.
   *
   * @param value - Number to enter. Accepts `number` or a pre-formatted `string`.
   */
  async fill(value: number | string): Promise<void> {
    await this.locator.fill(String(value));
  }

  /**
   * Clears all content from the number field using keyboard selection.
   * Required for Salesforce currency/number LWC inputs whose format mask
   * prevents Playwright's `.clear()` from committing the empty state.
   */
  async clear(): Promise<void> {
    await this.locator.press('Control+a');
    await this.locator.press('Delete');
    await this.locator.press('Tab');
  }

  /**
   * Asserts the field contains the given numeric value.
   *
   * @param value - Expected numeric value (formatted as the org displays it).
   */
  async expectValue(value: number | string): Promise<void> {
    await expect(this.locator).toHaveValue(String(value));
  }

  /**
   * Asserts the field is empty.
   */
  async expectEmpty(): Promise<void> {
    await expect(this.locator).toHaveValue('');
  }
}

/**
 * Represents a Salesforce Date field.
 *
 * Selector: `getByRole('dialog').getByRole('textbox', { name: label })`
 * Also exposes a `pickerButton` locator for the calendar icon.
 *
 * @example
 * const expirationDate = new DateField(page, 'SLA Expiration Date');
 * await expirationDate.fill('31/12/2025');
 */
export class DateField {
  /** The underlying text input locator. */
  readonly locator: Locator;
  /**
   * The calendar icon button that opens the date picker.
   * Use this when you need to interact with the calendar UI instead of typing directly.
   */
  readonly pickerButton: Locator;
  /** Button that undoes the last change, restoring the field to its original value. */
  readonly undoButton: Locator;
  /** Inline validation error scoped to this field's listitem; visible only when invalid. */
  readonly inlineError: Locator;

  constructor(page: Page, label: string) {
    this.locator = page.getByRole('dialog').getByRole('textbox', { name: label });
    this.pickerButton = page
      .getByRole('dialog')
      .getByRole('button', { name: `Select a date for ${label}` });
    this.undoButton = page.getByRole('dialog').getByRole('button', { name: `Undo ${label}` });
    this.inlineError = page
      .getByRole('dialog')
      .getByRole('listitem')
      .filter({ has: page.getByRole('textbox', { name: label }) })
      .getByText('Complete this field.');
  }

  /**
   * Types a date directly into the field and confirms the entry with Tab
   * (required by Salesforce LWC date inputs to commit the value).
   *
   * @param value - Date string in the org's configured locale format (e.g. `'31/12/2025'`).
   */
  async fill(value: string): Promise<void> {
    await this.locator.fill(value);
    await this.locator.press('Tab');
  }

  /**
   * Clears the date field and presses Tab to commit the cleared state
   * (required by Salesforce LWC date inputs).
   */
  async clear(): Promise<void> {
    await this.locator.clear();
    await this.locator.press('Tab');
  }

  /**
   * Asserts the field contains the given date string.
   *
   * @param value - Expected date string in the org's locale format (e.g. `'31/12/2025'`).
   */
  async expectValue(value: string): Promise<void> {
    await expect(this.locator).toHaveValue(value);
  }

  /**
   * Asserts the date field is empty.
   */
  async expectEmpty(): Promise<void> {
    await expect(this.locator).toHaveValue('');
  }
}

/**
 * Represents a Salesforce Checkbox field.
 *
 * Selector: `getByRole('dialog').getByRole('checkbox', { name: label })`
 *
 * @example
 * const activeField = new CheckboxField(page, 'Active');
 * await activeField.check();
 */
export class CheckboxField {
  /** The underlying Playwright locator for the checkbox input. */
  readonly locator: Locator;
  /** Button that undoes the last change, restoring the field to its original value. */
  readonly undoButton: Locator;
  /** Inline validation error scoped to this field's listitem; visible only when invalid. */
  readonly inlineError: Locator;

  constructor(page: Page, label: string) {
    this.locator = page.getByRole('dialog').getByRole('checkbox', { name: label });
    this.undoButton = page.getByRole('dialog').getByRole('button', { name: `Undo ${label}` });
    this.inlineError = page
      .getByRole('dialog')
      .getByRole('listitem')
      .filter({ has: page.getByRole('checkbox', { name: label }) })
      .getByText('Complete this field.');
  }

  /**
   * Checks the checkbox (sets it to `true`).
   */
  async check(): Promise<void> {
    await this.locator.check();
  }

  /**
   * Unchecks the checkbox (sets it to `false`).
   */
  async uncheck(): Promise<void> {
    await this.locator.uncheck();
  }

  /**
   * Sets the checkbox to the given state.
   *
   * @param checked - `true` to check, `false` to uncheck.
   */
  async setChecked(checked: boolean): Promise<void> {
    await this.locator.setChecked(checked);
  }

  /**
   * Asserts the checkbox has the given checked state.
   *
   * @param checked - `true` to assert checked, `false` to assert unchecked.
   */
  async expectValue(checked: boolean): Promise<void> {
    await expect(this.locator).toBeChecked({ checked });
  }

  /**
   * Asserts the checkbox is unchecked (its empty/default state).
   */
  async expectEmpty(): Promise<void> {
    await expect(this.locator).not.toBeChecked();
  }
}

/**
 * Represents the Salesforce validation error summary panel ("We hit a snag.").
 * This panel appears when the user attempts to save a record with required fields
 * left empty or with invalid values.
 *
 * @example
 * await expect(page.validationError.dialog).toBeVisible();
 * await expect(page.validationError.getFieldLink('Account Name')).toBeVisible();
 * await page.validationError.close();
 */
export class SalesforceValidationError {
  /** The error summary dialog container. */
  readonly dialog: Locator;
  /** The button that dismisses the error summary panel. */
  readonly closeButton: Locator;

  constructor(page: Page) {
    this.dialog = page.getByRole('dialog', { name: 'We hit a snag.' });
    this.closeButton = page.getByRole('button', { name: 'Close error dialog' });
  }

  /**
   * Returns a locator for a specific required-field link inside the error summary.
   *
   * @param fieldLabel - Label of the field as shown in the error list (e.g. `'Account Name'`).
   * @returns Locator for the field link inside the error dialog.
   */
  getFieldLink(fieldLabel: string): Locator {
    return this.dialog.getByRole('link', { name: fieldLabel });
  }

  /**
   * Dismisses the error summary panel.
   */
  async close(): Promise<void> {
    await this.closeButton.click();
  }
}
