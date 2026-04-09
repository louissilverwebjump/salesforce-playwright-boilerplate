import { request } from '@playwright/test';

/**
 * OAuth 2.0 token response from Salesforce Connected App.
 */
export interface SalesforceToken {
  accessToken: string;
  instanceUrl: string;
}

/**
 * Authenticates against Salesforce using the OAuth 2.0 Resource Owner Password
 * Credentials flow (Connected App). Returns an access token and instance URL
 * that can be used for API calls or to build a browser session.
 *
 * Required environment variables:
 * - `SF_CLIENT_ID` — Consumer Key from the Connected App
 * - `SF_CLIENT_SECRET` — Consumer Secret from the Connected App
 * - `SF_USERNAME` — Salesforce username
 * - `SF_PASSWORD` — Salesforce password
 * - `SF_SECURITY_TOKEN` — Salesforce security token (appended to password)
 *
 * @returns Access token and instance URL.
 * @throws If any required env var is missing or the OAuth request fails.
 */
export async function authenticateConnectedApp(): Promise<SalesforceToken> {
  const clientId = process.env.SF_CLIENT_ID!;
  const clientSecret = process.env.SF_CLIENT_SECRET!;
  const username = process.env.SF_USERNAME!;
  const password = process.env.SF_PASSWORD!;
  const securityToken = process.env.SF_SECURITY_TOKEN ?? '';

  const context = await request.newContext();
  const response = await context.post('https://login.salesforce.com/services/oauth2/token', {
    form: {
      grant_type: 'password',
      client_id: clientId,
      client_secret: clientSecret,
      username,
      password: `${password}${securityToken}`,
    },
  });

  if (!response.ok()) {
    const body = await response.text();
    throw new Error(`Salesforce OAuth failed (${response.status()}): ${body}`);
  }

  const json = await response.json();
  await context.dispose();

  return {
    accessToken: json.access_token,
    instanceUrl: json.instance_url,
  };
}
