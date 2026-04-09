import dotenv from 'dotenv';
import path from 'path';

const envFile = process.env.ENV_FILE ?? '.env';
dotenv.config({ path: path.resolve(__dirname, envFile) });

function requireEnv(name: string): void {
  if (!process.env[name]) {
    throw new Error(
      `❌ Variável de ambiente "${name}" não está definida.\n` +
        `   Verifique o arquivo "${envFile}" ou exporte a variável antes de rodar os testes.\n` +
        `   Exemplo: ${name}=valor npm test`,
    );
  }
}

export default function globalSetup(): void {
  const authMode = process.env.SF_AUTH_MODE ?? 'standard';

  requireEnv('SF_BASE_URL');
  requireEnv('SF_USERNAME');
  requireEnv('SF_PASSWORD');

  if (authMode === 'connected-app') {
    requireEnv('SF_CLIENT_ID');
    requireEnv('SF_CLIENT_SECRET');
  }

  console.log(`✅ Variáveis de ambiente validadas (modo: ${authMode}, env: ${envFile})`);
}
