# Autenticação via Connected App (OAuth 2.0)

## O que é isso?

Imagine que um hotel tem dois tipos de chave:

- **Chave normal** (Standard App): você vai até a recepção, mostra seu documento, e recebe uma chave que funciona por um tempo. Se perder, precisa ir à recepção de novo.
- **Chave-mestra programável** (Connected App): o hotel te dá um cartão especial que gera chaves automaticamente. Você nunca precisa ir à recepção — o cartão gera uma nova chave toda vez que você precisa.

O **Connected App** funciona como essa chave-mestra. Ele permite que o projeto faça login no Salesforce **automaticamente, sem abrir navegador, sem digitar código MFA**. Isso é perfeito para:

- Pipelines de CI/CD (GitHub Actions, Jenkins, etc.)
- Equipes que compartilham ambientes de teste
- Criar e deletar dados de teste via API (muito mais rápido que pela tela)

---

## Quando usar este modo?

- Você quer rodar testes em **CI/CD** sem intervenção manual
- Sua equipe usa **ambientes compartilhados** (dev, qa)
- Você quer usar a **API do Salesforce** para criar/deletar dados de teste rapidamente
- Seu administrador Salesforce pode criar um Connected App para você

---

## Pré-requisito: Criar um Connected App no Salesforce

> Você precisa de permissão de **Administrador** no Salesforce para fazer isso. Se não tiver, peça para o admin da sua org.

### Passo 1 — Abrir o App Manager

1. No Salesforce, clique na **engrenagem** (⚙️) no canto superior direito
2. Clique em **Setup**
3. No campo de busca à esquerda, digite **App Manager**
4. Clique em **App Manager** nos resultados

### Passo 2 — Criar um novo Connected App

1. Clique no botão **New Connected App** (canto superior direito)
2. Preencha os campos básicos:
   - **Connected App Name**: `Playwright Tests` (ou o nome que preferir)
   - **API Name**: será preenchido automaticamente
   - **Contact Email**: seu email
3. Na seção **API (Enable OAuth Settings)**:
   - Marque o checkbox **Enable OAuth Settings**
   - **Callback URL**: digite `https://login.salesforce.com/services/oauth2/callback`
   - **Selected OAuth Scopes**: adicione estes dois:
     - `Full access (full)`
     - `Perform requests at any time (refresh_token, offline_access)`
4. Clique em **Save**
5. O Salesforce vai avisar que pode levar até 10 minutos para ativar — clique **Continue**

### Passo 3 — Obter as credenciais

1. Na página do Connected App, clique em **Manage Consumer Details**
2. O Salesforce pode pedir uma verificação — siga as instruções
3. Copie dois valores:
   - **Consumer Key** → este é o `SF_CLIENT_ID`
   - **Consumer Secret** → este é o `SF_CLIENT_SECRET`

### Passo 4 — Obter o Security Token

1. No Salesforce, clique na **sua foto** (canto superior direito) → **Settings**
2. No menu lateral, clique em **Reset My Security Token**
3. Clique em **Reset Security Token**
4. O Salesforce envia o token por email → este é o `SF_SECURITY_TOKEN`

---

## Configuração no projeto

### 1. Configure o arquivo `.env`

Copie o modelo:

```bash
cp .env.connected.example .env
```

Preencha com os dados obtidos:

```env
SF_AUTH_MODE=connected-app
SF_BASE_URL=https://sua-org.my.salesforce.com
SF_USERNAME=seu-email@exemplo.com
SF_PASSWORD=sua-senha
SF_SECURITY_TOKEN=o-token-que-veio-por-email
SF_CLIENT_ID=o-consumer-key-do-connected-app
SF_CLIENT_SECRET=o-consumer-secret-do-connected-app
```

> **O que é cada campo novo?**
>
> - `SF_AUTH_MODE=connected-app` — diz ao projeto para usar OAuth 2.0 (sem navegador)
> - `SF_SECURITY_TOKEN` — token de segurança que o Salesforce exige junto com a senha
> - `SF_CLIENT_ID` — identifica o Connected App (como um "nome de usuário" do app)
> - `SF_CLIENT_SECRET` — a "senha" do Connected App

### 2. Rode os testes normalmente

```bash
npm test
```

O login acontece **automaticamente via API** — nenhum navegador é aberto para login, nenhum código MFA é pedido. O Playwright obtém um token de acesso e usa ele para criar uma sessão no navegador de teste.

---

## Como funciona por baixo dos panos

```
npm test
  │
  ▼
auth.setup.ts detecta SF_AUTH_MODE=connected-app
  │
  ▼
SalesforceAuth.ts faz POST para /services/oauth2/token
  com: client_id, client_secret, username, password+token
  │
  ▼
Salesforce retorna: access_token + instance_url
  │
  ▼
auth.setup.ts abre o navegador em: /secur/frontdoor.jsp?sid=<token>
  (frontdoor.jsp é uma URL especial que faz login usando o token)
  │
  ▼
Navegador está logado! Cookies são salvos em .auth/
  │
  ▼
Testes rodam normalmente usando os cookies salvos
```

---

## Configuração no CI/CD (GitHub Actions)

No GitHub, vá em **Settings** → **Secrets and variables** → **Actions** e adicione estes secrets:

| Secret              | Valor           |
| ------------------- | --------------- |
| `SF_BASE_URL`       | URL da sua org  |
| `SF_USERNAME`       | Email de login  |
| `SF_PASSWORD`       | Senha           |
| `SF_SECURITY_TOKEN` | Security token  |
| `SF_CLIENT_ID`      | Consumer Key    |
| `SF_CLIENT_SECRET`  | Consumer Secret |

O workflow `.github/workflows/playwright.yml` já está configurado para usar esses secrets com `SF_AUTH_MODE=connected-app`.

---

## API de Dados de Teste

Com Connected App, você ganha acesso à classe `SalesforceApi` (`tests/utils/SalesforceApi.ts`), que permite:

```typescript
// Criar um registro via API (muito mais rápido que via UI)
const api = await SalesforceApi.create();
const id = await api.createRecord('Account', { Name: 'Conta Teste' });

// Consultar registros
const records = await api.query("SELECT Id, Name FROM Account WHERE Name = 'Conta Teste'");

// Deletar um registro via API
await api.deleteRecord('Account', id);

// Liberar a conexão ao terminar
await api.dispose();
```

Isso é útil para:

- Criar massa de teste antes dos testes (mais rápido que preencher formulários)
- Limpar dados após os testes (funciona mesmo se o teste falhar no meio)
- Verificar dados criados pela UI via SOQL

> **Esta funcionalidade só está disponível com Connected App.** Se você está usando Standard App, a classe `SalesforceApi` vai lançar um erro explicando o que precisa configurar.

---

## Vantagens vs Standard App

| Aspecto              | Standard App             | Connected App                                  |
| -------------------- | ------------------------ | ---------------------------------------------- |
| Login                | Browser + MFA manual     | API automática                                 |
| CI/CD                | Exige intervenção manual | 100% automatizado                              |
| Velocidade do login  | ~10-15 segundos          | ~2-3 segundos                                  |
| API de dados         | Indisponível             | Disponível                                     |
| Sessão expira        | ~1 mês (cookies)         | Nunca (token renovado a cada execução)         |
| Configuração inicial | Simples (email + senha)  | Requer criar Connected App no Salesforce Setup |
