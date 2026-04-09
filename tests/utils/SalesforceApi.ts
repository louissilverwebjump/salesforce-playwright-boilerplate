import { request, APIRequestContext } from '@playwright/test';
import { authenticateConnectedApp } from './SalesforceAuth';

const SF_API_VERSION = 'v62.0';

/**
 * Wrapper around the Salesforce REST API for creating, querying, and deleting
 * records during tests. Requires Connected App credentials.
 *
 * @example
 * const api = await SalesforceApi.create();
 * const id = await api.createRecord('Account', { Name: 'Acme' });
 * await api.deleteRecord('Account', id);
 */
export class SalesforceApi {
  private constructor(
    private context: APIRequestContext,
    private instanceUrl: string,
    private accessToken: string,
  ) {}

  /**
   * Authenticates via Connected App OAuth and returns a ready-to-use API client.
   * Throws a clear error if Connected App credentials are not configured.
   */
  static async create(): Promise<SalesforceApi> {
    if (process.env.SF_AUTH_MODE !== 'connected-app') {
      throw new Error(
        'SalesforceApi requires SF_AUTH_MODE=connected-app.\n' +
          'API data management is only available with Connected App credentials.\n' +
          'See docs/auth-connected-app.md for setup instructions.',
      );
    }

    const { accessToken, instanceUrl } = await authenticateConnectedApp();
    const context = await request.newContext({
      baseURL: `${instanceUrl}/services/data/${SF_API_VERSION}`,
      extraHTTPHeaders: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    return new SalesforceApi(context, instanceUrl, accessToken);
  }

  /**
   * Creates a record via the Salesforce REST API.
   *
   * @param objectName - Salesforce API name (e.g. `'Account'`, `'Contact'`).
   * @param data - Field values as key-value pairs (API field names, not labels).
   * @returns The ID of the newly created record.
   */
  async createRecord(objectName: string, data: Record<string, unknown>): Promise<string> {
    const response = await this.context.post(`/sobjects/${objectName}`, { data });
    if (!response.ok()) {
      const body = await response.text();
      throw new Error(`Failed to create ${objectName}: ${response.status()} ${body}`);
    }
    const json = await response.json();
    return json.id;
  }

  /**
   * Deletes a record via the Salesforce REST API.
   *
   * @param objectName - Salesforce API name (e.g. `'Account'`).
   * @param recordId - The 18-character Salesforce record ID.
   */
  async deleteRecord(objectName: string, recordId: string): Promise<void> {
    const response = await this.context.delete(`/sobjects/${objectName}/${recordId}`);
    if (!response.ok()) {
      const body = await response.text();
      throw new Error(`Failed to delete ${objectName}/${recordId}: ${response.status()} ${body}`);
    }
  }

  /**
   * Executes a SOQL query and returns the result records.
   *
   * @param soql - A valid SOQL query string.
   * @returns Array of record objects.
   */
  async query(soql: string): Promise<Record<string, unknown>[]> {
    const response = await this.context.get(`/query?q=${encodeURIComponent(soql)}`);
    if (!response.ok()) {
      const body = await response.text();
      throw new Error(`SOQL query failed: ${response.status()} ${body}`);
    }
    const json = await response.json();
    return json.records;
  }

  /**
   * Disposes the underlying HTTP context. Call this when done with API calls.
   */
  async dispose(): Promise<void> {
    await this.context.dispose();
  }
}
