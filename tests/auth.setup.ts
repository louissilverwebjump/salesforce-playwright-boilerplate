import { test as setup, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { authenticateConnectedApp } from './utils/SalesforceAuth';

const envName = (process.env.ENV_FILE ?? '.env').replace(/^\.env\.?/, '') || 'default';
const authFile = path.join(__dirname, `../.auth/salesforce-${envName}.json`);
const authMode = process.env.SF_AUTH_MODE ?? 'standard';

setup('authenticate', async ({ page }) => {
  // Reutiliza sessão salva sem fazer login novamente.
  if (fs.existsSync(authFile)) {
    console.log('Sessão salva encontrada, pulando login.');
    return;
  }

  const authDir = path.dirname(authFile);
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  if (authMode === 'connected-app') {
    // Connected App: OAuth 2.0 API login — fully headless, no MFA needed.
    const { accessToken, instanceUrl } = await authenticateConnectedApp();
    const frontdoorUrl = `${instanceUrl}/secur/frontdoor.jsp?sid=${accessToken}`;
    await page.goto(frontdoorUrl);
    await page.waitForURL('**/lightning/**', { timeout: 120_000 });
    await expect(page.getByTitle('App Launcher')).toBeVisible();
  } else {
    // Standard App: browser login with manual MFA.
    // Execute "npm run auth" quando a sessão expirar (~1 mês).
    await page.goto('https://login.salesforce.com');

    await page.getByLabel('Username').fill(process.env.SF_USERNAME!);
    await page.getByLabel('Password').fill(process.env.SF_PASSWORD!);
    await page.getByRole('button', { name: 'Log In' }).click();

    // Aguarda possível tela de verificação por e-mail (MFA)
    const verificationInput = page.locator('input#emc').first();
    const hasMfa = await verificationInput.isVisible({ timeout: 5_000 }).catch(() => false);

    if (hasMfa) {
      console.log('\n⚠️  Código de verificação solicitado pelo Salesforce.');
      console.log('   1. Verifique seu e-mail e insira o código no browser.');
      console.log('   2. Clique em "Verify".');
      console.log('   3. Pressione o botão "Resume" no Playwright Inspector para continuar.\n');
      await page.pause();
    }

    await page.waitForURL('**/lightning/**', { timeout: 120_000 });
    await expect(page.getByTitle('App Launcher')).toBeVisible();
  }

  await page.context().storageState({ path: authFile });
  console.log(`Sessão salva em: ${authFile} (modo: ${authMode})`);
});
