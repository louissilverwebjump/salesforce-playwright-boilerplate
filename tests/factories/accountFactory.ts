import { faker } from '@faker-js/faker';

/**
 * Represents data for a Salesforce Account record.
 * Only `name` is required; all other fields are optional.
 * When a field is present, `AccountPage.fillAllFields()` fills it;
 * when absent, the field is skipped.
 */
export interface AccountData {
  // Account Information
  name: string;
  rating?: string;
  phone?: string;
  fax?: string;
  accountNumber?: string;
  website?: string;
  accountSite?: string;
  tickerSymbol?: string;
  type?: string;
  ownership?: string;
  industry?: string;
  employees?: number;
  annualRevenue?: number;
  sicCode?: string;

  // Billing Address
  billingCountry?: string;
  billingState?: string;
  billingStreet?: string;
  billingCity?: string;
  billingZip?: string;

  // Shipping Address
  shippingCountry?: string;
  shippingState?: string;
  shippingStreet?: string;
  shippingCity?: string;
  shippingZip?: string;

  // Additional Information
  customerPriority?: string;
  sla?: string;
  slaExpirationDate?: string;
  slaSerialNumber?: string;
  numberOfLocations?: number;
  upsellOpportunity?: string;
  active?: string;

  // Description
  description?: string;
}

/** Valid Salesforce picklist values for Account fields. */
const PICKLIST_OPTIONS = {
  rating: ['Hot', 'Warm', 'Cold'],
  type: [
    'Prospect',
    'Customer - Direct',
    'Customer - Channel',
    'Channel Partner / Reseller',
    'Installation Partner',
    'Technology Partner',
    'Other',
  ],
  ownership: ['Public', 'Private', 'Subsidiary', 'Other'],
  industry: [
    'Agriculture',
    'Banking',
    'Consulting',
    'Education',
    'Technology',
    'Energy',
    'Finance',
    'Healthcare',
    'Manufacturing',
    'Retail',
  ],
  customerPriority: ['High', 'Low', 'Medium'],
  sla: ['Gold', 'Silver', 'Platinum', 'Bronze'],
  upsellOpportunity: ['Maybe', 'No', 'Yes'],
  active: ['No', 'Yes'],
} as const;

/**
 * Valid Brazilian state options grouped by country.
 * Used for dependent geo-picklist fields (Country → State).
 */
const BRAZIL_STATES = [
  'São Paulo',
  'Rio de Janeiro',
  'Minas Gerais',
  'Bahia',
  'Paraná',
  'Rio Grande do Sul',
  'Pernambuco',
  'Ceará',
] as const;

/**
 * Factory for generating Salesforce Account test data.
 *
 * @example
 * // Full Account with all fields
 * const data = AccountFactory.buildComplete();
 * await accountPage.fillAllFields(data);
 *
 * // Only required fields
 * const minimal = AccountFactory.buildMinimal();
 * await accountPage.fillAllFields(minimal);
 *
 * // Override specific fields
 * const custom = AccountFactory.buildComplete({ rating: 'Cold', employees: 10 });
 */
export class AccountFactory {
  /**
   * Builds an Account with all fields populated using random faker data.
   *
   * @param overrides - Partial data to override any generated values.
   * @returns A complete AccountData object.
   */
  static buildComplete(overrides: Partial<AccountData> = {}): AccountData {
    const billingState = faker.helpers.arrayElement([...BRAZIL_STATES]);
    const shippingState = faker.helpers.arrayElement([...BRAZIL_STATES]);
    const futureDate = faker.date.future({ years: 2 });
    const slaExpiration = [
      String(futureDate.getDate()).padStart(2, '0'),
      String(futureDate.getMonth() + 1).padStart(2, '0'),
      futureDate.getFullYear(),
    ].join('/');

    return {
      // Account Information
      name: `Account Test ${Date.now()}`,
      rating: faker.helpers.arrayElement([...PICKLIST_OPTIONS.rating]),
      phone: faker.phone.number({ style: 'international' }),
      fax: faker.phone.number({ style: 'international' }),
      accountNumber: `ACC-${faker.string.numeric(4)}`,
      website: faker.internet.url(),
      accountSite: faker.helpers.arrayElement(['Sede', 'Filial', 'Escritório']),
      tickerSymbol: faker.string.alpha({ length: 4, casing: 'upper' }),
      type: faker.helpers.arrayElement([...PICKLIST_OPTIONS.type]),
      ownership: faker.helpers.arrayElement([...PICKLIST_OPTIONS.ownership]),
      industry: faker.helpers.arrayElement([...PICKLIST_OPTIONS.industry]),
      employees: faker.number.int({ min: 1, max: 10000 }),
      annualRevenue: faker.number.int({ min: 10000, max: 10000000 }),
      sicCode: faker.string.numeric(4),

      // Billing Address
      billingCountry: 'Brazil',
      billingState,
      billingStreet: faker.location.streetAddress(),
      billingCity: faker.location.city(),
      billingZip: faker.location.zipCode('#####-###'),

      // Shipping Address
      shippingCountry: 'Brazil',
      shippingState,
      shippingStreet: faker.location.streetAddress(),
      shippingCity: faker.location.city(),
      shippingZip: faker.location.zipCode('#####-###'),

      // Additional Information
      customerPriority: faker.helpers.arrayElement([...PICKLIST_OPTIONS.customerPriority]),
      sla: faker.helpers.arrayElement([...PICKLIST_OPTIONS.sla]),
      slaExpirationDate: slaExpiration,
      slaSerialNumber: `SLA-${faker.string.numeric(4)}`,
      numberOfLocations: faker.number.int({ min: 1, max: 50 }),
      upsellOpportunity: faker.helpers.arrayElement([...PICKLIST_OPTIONS.upsellOpportunity]),
      active: faker.helpers.arrayElement([...PICKLIST_OPTIONS.active]),

      // Description
      description: faker.lorem.sentence(),

      ...overrides,
    };
  }

  /**
   * Builds an Account with only the required field (Account Name).
   *
   * @param overrides - Partial data to add optional fields with specific values.
   * @returns A minimal AccountData object.
   */
  static buildMinimal(overrides: Partial<AccountData> = {}): AccountData {
    return {
      name: `Account Test ${Date.now()}`,
      ...overrides,
    };
  }

  /**
   * Builds an Account with randomly generated data for the specified fields only.
   * Generates a complete record internally and picks only the requested keys
   * (plus the required `name` field).
   *
   * @param fields - Array of optional field names to include with random values.
   * @param overrides - Partial data to force specific values on any field.
   * @returns An AccountData with `name` + only the requested fields.
   *
   * @example
   * const data = AccountFactory.buildPartial(['rating', 'phone', 'industry']);
   * // → { name: 'Account Test 17...', rating: 'Hot', phone: '+1...', industry: 'Banking' }
   */
  static buildPartial(
    fields: (keyof Omit<AccountData, 'name'>)[],
    overrides: Partial<AccountData> = {},
  ): AccountData {
    const complete = AccountFactory.buildComplete(overrides);
    const result: AccountData = { name: complete.name };
    for (const field of fields) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (result as any)[field] = complete[field];
    }
    return result;
  }
}
