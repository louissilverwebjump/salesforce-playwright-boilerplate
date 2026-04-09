import { Page } from '@playwright/test';
import { BasePage } from './BasePage';
import {
  TextField,
  PicklistField,
  AddressPicklistField,
  LookupField,
  NumberField,
  DateField,
} from '../utils/SalesforceFields';
import { AccountData } from '../factories/accountFactory';

/**
 * Page object for the Salesforce Account standard object.
 * Covers CRUD operations and exposes all modal fields for the Account list
 * and record pages.
 */
export class AccountPage extends BasePage {
  // ── Account Information ────────────────────────────────────────────────────

  /** "Account Name" required text field inside the New/Edit modal. */
  readonly accountNameField: TextField;
  /** "Rating" picklist field inside the New/Edit modal. Options: Hot, Warm, Cold. */
  readonly ratingField: PicklistField;
  /** "Phone" text field inside the New/Edit modal. */
  readonly phoneField: TextField;
  /** "Parent Account" lookup field inside the New/Edit modal. */
  readonly parentAccountField: LookupField;
  /** "Fax" text field inside the New/Edit modal. */
  readonly faxField: TextField;
  /** "Account Number" text field inside the New/Edit modal. */
  readonly accountNumberField: TextField;
  /** "Website" text field inside the New/Edit modal. */
  readonly websiteField: TextField;
  /** "Account Site" text field inside the New/Edit modal. */
  readonly accountSiteField: TextField;
  /** "Ticker Symbol" text field inside the New/Edit modal. */
  readonly tickerSymbolField: TextField;
  /** "Type" picklist field inside the New/Edit modal. Options: Prospect, Customer - Direct, Customer - Channel, Channel Partner / Reseller, Installation Partner, Technology Partner, Other. */
  readonly typeField: PicklistField;
  /** "Ownership" picklist field inside the New/Edit modal. Options: Public, Private, Subsidiary, Other. */
  readonly ownershipField: PicklistField;
  /** "Industry" picklist field inside the New/Edit modal. Options: Agriculture, Banking, Consulting, Education, Technology, and more. */
  readonly industryField: PicklistField;
  /** "Employees" number (spinbutton) field inside the New/Edit modal. */
  readonly employeesField: NumberField;
  /** "Annual Revenue" number (spinbutton) field inside the New/Edit modal. */
  readonly annualRevenueField: NumberField;
  /** "SIC Code" text field inside the New/Edit modal. */
  readonly sicCodeField: TextField;

  // ── Billing Address ────────────────────────────────────────────────────────

  /** "Billing Country" geo-picklist field inside the New/Edit modal. */
  readonly billingCountryField: AddressPicklistField;
  /** "Billing Street" text field inside the New/Edit modal. */
  readonly billingStreetField: TextField;
  /** "Billing City" text field inside the New/Edit modal. */
  readonly billingCityField: TextField;
  /**
   * "Billing State/Province" geo-picklist field inside the New/Edit modal.
   * Options are populated after selecting a Billing Country.
   */
  readonly billingStateField: AddressPicklistField;
  /** "Billing Zip/Postal Code" text field inside the New/Edit modal. */
  readonly billingZipField: TextField;

  // ── Shipping Address ───────────────────────────────────────────────────────

  /** "Shipping Country" geo-picklist field inside the New/Edit modal. */
  readonly shippingCountryField: AddressPicklistField;
  /** "Shipping Street" text field inside the New/Edit modal. */
  readonly shippingStreetField: TextField;
  /** "Shipping City" text field inside the New/Edit modal. */
  readonly shippingCityField: TextField;
  /**
   * "Shipping State/Province" geo-picklist field inside the New/Edit modal.
   * Options are populated after selecting a Shipping Country.
   */
  readonly shippingStateField: AddressPicklistField;
  /** "Shipping Zip/Postal Code" text field inside the New/Edit modal. */
  readonly shippingZipField: TextField;

  // ── Additional Information ─────────────────────────────────────────────────

  /** "Customer Priority" picklist field inside the New/Edit modal. Options: High, Low, Medium. */
  readonly customerPriorityField: PicklistField;
  /** "SLA" picklist field inside the New/Edit modal. Options: Gold, Silver, Platinum, Bronze. */
  readonly slaField: PicklistField;
  /** "SLA Expiration Date" date field inside the New/Edit modal. Format: DD/MM/YYYY. */
  readonly slaExpirationDateField: DateField;
  /** "SLA Serial Number" text field inside the New/Edit modal. */
  readonly slaSerialNumberField: TextField;
  /** "Number of Locations" number (spinbutton) field inside the New/Edit modal. */
  readonly numberOfLocationsField: NumberField;
  /** "Upsell Opportunity" picklist field inside the New/Edit modal. Options: Maybe, No, Yes. */
  readonly upsellOpportunityField: PicklistField;
  /** "Active" picklist field inside the New/Edit modal. Options: No, Yes. */
  readonly activeField: PicklistField;

  // ── Description Information ────────────────────────────────────────────────

  /** "Description" textarea field inside the New/Edit modal. */
  readonly descriptionField: TextField;

  constructor(page: Page) {
    super(page);
    // Account Information
    this.accountNameField = new TextField(page, 'Account Name');
    this.ratingField = new PicklistField(page, 'Rating');
    this.phoneField = new TextField(page, 'Phone');
    this.parentAccountField = new LookupField(page, 'Parent Account');
    this.faxField = new TextField(page, 'Fax');
    this.accountNumberField = new TextField(page, 'Account Number');
    this.websiteField = new TextField(page, 'Website');
    this.accountSiteField = new TextField(page, 'Account Site');
    this.tickerSymbolField = new TextField(page, 'Ticker Symbol');
    this.typeField = new PicklistField(page, 'Type');
    this.ownershipField = new PicklistField(page, 'Ownership');
    this.industryField = new PicklistField(page, 'Industry');
    this.employeesField = new NumberField(page, 'Employees');
    this.annualRevenueField = new NumberField(page, 'Annual Revenue');
    this.sicCodeField = new TextField(page, 'SIC Code');
    // Billing Address
    this.billingCountryField = new AddressPicklistField(page, 'Billing Country');
    this.billingStreetField = new TextField(page, 'Billing Street');
    this.billingCityField = new TextField(page, 'Billing City');
    this.billingStateField = new AddressPicklistField(page, 'Billing State/Province');
    this.billingZipField = new TextField(page, 'Billing Zip/Postal Code');
    // Shipping Address
    this.shippingCountryField = new AddressPicklistField(page, 'Shipping Country');
    this.shippingStreetField = new TextField(page, 'Shipping Street');
    this.shippingCityField = new TextField(page, 'Shipping City');
    this.shippingStateField = new AddressPicklistField(page, 'Shipping State/Province');
    this.shippingZipField = new TextField(page, 'Shipping Zip/Postal Code');
    // Additional Information
    this.customerPriorityField = new PicklistField(page, 'Customer Priority');
    this.slaField = new PicklistField(page, 'SLA');
    this.slaExpirationDateField = new DateField(page, 'SLA Expiration Date');
    this.slaSerialNumberField = new TextField(page, 'SLA Serial Number');
    this.numberOfLocationsField = new NumberField(page, 'Number of Locations');
    this.upsellOpportunityField = new PicklistField(page, 'Upsell Opportunity');
    this.activeField = new PicklistField(page, 'Active');
    // Description Information
    this.descriptionField = new TextField(page, 'Description');
  }

  /**
   * Navigates to the Account list view.
   */
  async navigate() {
    await this.navigateToObject('Account');
  }

  /**
   * Fills the "Account Name" field in the open modal.
   *
   * @param name - Value to enter in the Account Name field.
   */
  async fillName(name: string) {
    await this.accountNameField.fill(name);
  }

  /**
   * Creates a new Account record end-to-end:
   * opens the modal, fills the name, saves, and waits for the record page.
   *
   * @param name - Name for the new Account.
   */
  async createAccount(name: string) {
    await this.clickNew();
    await this.fillName(name);
    await this.save();
    await this.waitForRecordPage();
  }

  /**
   * Opens an Account record from the list view by its name.
   *
   * @param name - Exact Account name as shown in the list.
   */
  async openAccount(name: string) {
    await this.openRecord(name);
  }

  /**
   * Deletes an Account record end-to-end:
   * opens the record, triggers delete via the actions menu, confirms,
   * and waits for the list view to reload.
   *
   * @param name - Exact Account name to delete.
   */
  async deleteAccount(name: string) {
    await this.deleteRecord(name, 'Account');
  }

  /**
   * Fills the Account New/Edit modal fields with the provided data.
   * Only fields present in the data object are filled; absent fields are skipped.
   *
   * @param data - Account data to fill. Use `AccountFactory.buildComplete()` or `buildMinimal()`.
   */
  async fillAllFields(data: AccountData) {
    // Account Information
    await this.accountNameField.fill(data.name);
    if (data.rating) await this.ratingField.select(data.rating);
    if (data.phone) await this.phoneField.fill(data.phone);
    if (data.fax) await this.faxField.fill(data.fax);
    if (data.accountNumber) await this.accountNumberField.fill(data.accountNumber);
    if (data.website) await this.websiteField.fill(data.website);
    if (data.accountSite) await this.accountSiteField.fill(data.accountSite);
    if (data.tickerSymbol) await this.tickerSymbolField.fill(data.tickerSymbol);
    if (data.type) await this.typeField.select(data.type);
    if (data.ownership) await this.ownershipField.select(data.ownership);
    if (data.industry) await this.industryField.select(data.industry);
    if (data.employees != null) await this.employeesField.fill(data.employees);
    if (data.annualRevenue != null) await this.annualRevenueField.fill(data.annualRevenue);
    if (data.sicCode) await this.sicCodeField.fill(data.sicCode);

    // Billing Address — country must be selected before state
    if (data.billingCountry) await this.billingCountryField.select(data.billingCountry);
    if (data.billingState) await this.billingStateField.select(data.billingState);
    if (data.billingStreet) await this.billingStreetField.fill(data.billingStreet);
    if (data.billingCity) await this.billingCityField.fill(data.billingCity);
    if (data.billingZip) await this.billingZipField.fill(data.billingZip);

    // Shipping Address — country must be selected before state
    if (data.shippingCountry) await this.shippingCountryField.select(data.shippingCountry);
    if (data.shippingState) await this.shippingStateField.select(data.shippingState);
    if (data.shippingStreet) await this.shippingStreetField.fill(data.shippingStreet);
    if (data.shippingCity) await this.shippingCityField.fill(data.shippingCity);
    if (data.shippingZip) await this.shippingZipField.fill(data.shippingZip);

    // Additional Information
    if (data.customerPriority) await this.customerPriorityField.select(data.customerPriority);
    if (data.sla) await this.slaField.select(data.sla);
    if (data.slaExpirationDate) await this.slaExpirationDateField.fill(data.slaExpirationDate);
    if (data.slaSerialNumber) await this.slaSerialNumberField.fill(data.slaSerialNumber);
    if (data.numberOfLocations != null)
      await this.numberOfLocationsField.fill(data.numberOfLocations);
    if (data.upsellOpportunity) await this.upsellOpportunityField.select(data.upsellOpportunity);
    if (data.active) await this.activeField.select(data.active);

    // Description
    if (data.description) await this.descriptionField.fill(data.description);
  }

  /**
   * Clears every field in the Account New/Edit modal.
   * State/Province fields are cleared before Country (dependent picklists).
   */
  async clearAllFields() {
    await this.accountNameField.clear();
    await this.ratingField.clear();
    await this.phoneField.clear();
    await this.faxField.clear();
    await this.accountNumberField.clear();
    await this.websiteField.clear();
    await this.accountSiteField.clear();
    await this.tickerSymbolField.clear();
    await this.typeField.clear();
    await this.ownershipField.clear();
    await this.industryField.clear();
    await this.employeesField.clear();
    await this.annualRevenueField.clear();
    await this.sicCodeField.clear();
    await this.billingStateField.clear();
    await this.billingCountryField.clear();
    await this.billingStreetField.clear();
    await this.billingCityField.clear();
    await this.billingZipField.clear();
    await this.shippingStateField.clear();
    await this.shippingCountryField.clear();
    await this.shippingStreetField.clear();
    await this.shippingCityField.clear();
    await this.shippingZipField.clear();
    await this.customerPriorityField.clear();
    await this.slaField.clear();
    await this.slaExpirationDateField.clear();
    await this.slaSerialNumberField.clear();
    await this.numberOfLocationsField.clear();
    await this.upsellOpportunityField.clear();
    await this.activeField.clear();
    await this.descriptionField.clear();
  }

  /**
   * Asserts every field in the Account modal is in its default empty state.
   */
  async expectAllFieldsEmpty() {
    await this.accountNameField.expectEmpty();
    await this.ratingField.expectEmpty();
    await this.phoneField.expectEmpty();
    await this.parentAccountField.expectEmpty();
    await this.faxField.expectEmpty();
    await this.accountNumberField.expectEmpty();
    await this.websiteField.expectEmpty();
    await this.accountSiteField.expectEmpty();
    await this.tickerSymbolField.expectEmpty();
    await this.typeField.expectEmpty();
    await this.ownershipField.expectEmpty();
    await this.industryField.expectEmpty();
    await this.employeesField.expectEmpty();
    await this.annualRevenueField.expectEmpty();
    await this.sicCodeField.expectEmpty();
    await this.billingCountryField.expectEmpty();
    await this.billingStreetField.expectEmpty();
    await this.billingCityField.expectEmpty();
    await this.billingStateField.expectEmpty();
    await this.billingZipField.expectEmpty();
    await this.shippingCountryField.expectEmpty();
    await this.shippingStreetField.expectEmpty();
    await this.shippingCityField.expectEmpty();
    await this.shippingStateField.expectEmpty();
    await this.shippingZipField.expectEmpty();
    await this.customerPriorityField.expectEmpty();
    await this.slaField.expectEmpty();
    await this.slaExpirationDateField.expectEmpty();
    await this.slaSerialNumberField.expectEmpty();
    await this.numberOfLocationsField.expectEmpty();
    await this.upsellOpportunityField.expectEmpty();
    await this.activeField.expectEmpty();
    await this.descriptionField.expectEmpty();
  }
}
