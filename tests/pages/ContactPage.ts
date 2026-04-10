import { Page } from '@playwright/test';
import { BasePage } from './BasePage';
import { TextField } from '../utils/SalesforceFields';
import { ContactData } from '../factories/contactFactory';

/**
 * Page object for the Salesforce Contact standard object.
 * Covers CRUD operations on the Contact list and record pages.
 */
export class ContactPage extends BasePage {
  // ── Contact Information ────────────────────────────────────────────────────

  /** "Last Name" required text field inside the New/Edit modal. */
  readonly lastNameField: TextField;
  /** "First Name" text field inside the New/Edit modal. */
  readonly firstNameField: TextField;
  /** "Phone" text field inside the New/Edit modal. */
  readonly phoneField: TextField;
  /** "Email" text field inside the New/Edit modal. */
  readonly emailField: TextField;

  constructor(page: Page) {
    super(page);
    this.lastNameField = new TextField(page, 'Last Name');
    this.firstNameField = new TextField(page, 'First Name');
    this.phoneField = new TextField(page, 'Phone');
    this.emailField = new TextField(page, 'Email');
  }

  /**
   * Navigates to the Contact list view.
   */
  async navigate() {
    await this.navigateToObject('Contact');
  }

  /**
   * Fills the Contact New/Edit modal fields with the provided data.
   * Only fields present in the data object are filled; absent fields are skipped.
   *
   * @param data - Contact data to fill. Use `ContactFactory.buildComplete()` or `buildMinimal()`.
   */
  async fillAllFields(data: ContactData) {
    await this.lastNameField.fill(data.lastName);
    if (data.firstName) await this.firstNameField.fill(data.firstName);
    if (data.phone) await this.phoneField.fill(data.phone);
    if (data.email) await this.emailField.fill(data.email);
  }

  /**
   * Creates a new Contact record end-to-end:
   * opens the modal, fills the fields, saves, and waits for the record page.
   *
   * @param data - Contact data to fill.
   */
  async createContact(data: ContactData) {
    await this.clickNew();
    await this.fillAllFields(data);
    await this.save();
    await this.waitForRecordPage();
  }

  /**
   * Deletes a Contact record end-to-end:
   * opens the record, triggers delete via the actions menu, confirms,
   * and waits for the list view to reload.
   *
   * @param name - Exact display name of the Contact to delete (e.g. `"Jane Doe"`).
   */
  async deleteContact(name: string) {
    await this.deleteRecord(name, 'Contact');
  }
}
