import { faker } from '@faker-js/faker';

/**
 * Represents data for a Salesforce Contact record.
 * Only `lastName` is required; all other fields are optional.
 * When a field is present, `ContactPage.fillAllFields()` fills it;
 * when absent, the field is skipped.
 */
export interface ContactData {
  lastName: string;
  firstName?: string;
  phone?: string;
  email?: string;
}

/**
 * Factory for generating Salesforce Contact test data.
 *
 * @example
 * // Full Contact with all fields
 * const data = ContactFactory.buildComplete();
 * await contactPage.fillAllFields(data);
 *
 * // Only required fields
 * const minimal = ContactFactory.buildMinimal();
 * await contactPage.fillAllFields(minimal);
 *
 * // Override specific fields
 * const custom = ContactFactory.buildComplete({ firstName: 'Jane' });
 */
export class ContactFactory {
  /**
   * Returns the display name of a Contact as it will appear in the Salesforce record title.
   *
   * @param data - Contact data object.
   * @returns `"FirstName LastName"` when firstName is present, otherwise `"LastName"`.
   */
  static getDisplayName(data: ContactData): string {
    return data.firstName ? `${data.firstName} ${data.lastName}` : data.lastName;
  }

  /**
   * Builds a Contact with all fields populated using random faker data.
   *
   * @param overrides - Partial data to override any generated values.
   * @returns A complete ContactData object.
   */
  static buildComplete(overrides: Partial<ContactData> = {}): ContactData {
    return {
      lastName: `Contact Test ${Date.now()}`,
      firstName: faker.person.firstName(),
      phone: faker.phone.number({ style: 'international' }),
      email: faker.internet.email(),
      ...overrides,
    };
  }

  /**
   * Builds a Contact with only the required field (Last Name).
   *
   * @param overrides - Partial data to add optional fields with specific values.
   * @returns A minimal ContactData object.
   */
  static buildMinimal(overrides: Partial<ContactData> = {}): ContactData {
    return {
      lastName: `Contact Test ${Date.now()}`,
      ...overrides,
    };
  }

  /**
   * Builds a Contact with randomly generated data for the specified fields only.
   * Generates a complete record internally and picks only the requested keys
   * (plus the required `lastName` field).
   *
   * @param fields - Array of optional field names to include with random values.
   * @param overrides - Partial data to force specific values on any field.
   * @returns A ContactData with `lastName` + only the requested fields.
   *
   * @example
   * const data = ContactFactory.buildPartial(['phone', 'email']);
   * // → { lastName: 'Contact Test 17...', phone: '+1...', email: 'user@example.com' }
   */
  static buildPartial(
    fields: (keyof Omit<ContactData, 'lastName'>)[],
    overrides: Partial<ContactData> = {},
  ): ContactData {
    const complete = ContactFactory.buildComplete(overrides);
    const result: ContactData = { lastName: complete.lastName };
    for (const field of fields) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (result as any)[field] = complete[field];
    }
    return result;
  }
}
