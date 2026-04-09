# Autenticação via Aplicativo Padrão (Standard App)

## O que é isso?

Quando você acessa o Salesforce pelo navegador normalmente (digitando email e senha), você está usando um **Aplicativo Padrão** (Standard App). É a forma mais simples de se conectar.

O problema é que o Salesforce pode pedir uma **verificação extra** chamada **MFA** (Multi-Factor Authentication) — você recebe um código por email e precisa digitá-lo para provar que é realmente você. Como um robô de teste não consegue ler seu email sozinho, precisamos de um truque: **pausar o teste, você digita o código manualmente, e depois o teste continua.**

A boa notícia é que os **cookies** (pequenos arquivos que o navegador salva para lembrar que você já fez login) duram cerca de **1 mês**. Isso significa que você só precisa fazer esse processo manual uma vez a cada mês.

---

## Quando usar este modo?

- Você está começando agora e quer rodar testes rápido, sem configuração extra
- Você está usando um sandbox pessoal para aprender ou fazer POCs
- Seu org **não tem** um Connected App configurado (ou você não tem permissão para criar um)

---

## Passo a passo

### 1. Configure o arquivo `.env`

Copie o modelo para criar seu arquivo de configuração:

```bash
cp .env.standard.example .env
```

Abra o arquivo `.env` e preencha com seus dados:

```env
SF_AUTH_MODE=standard
SF_BASE_URL=https://sua-org.my.salesforce.com
SF_USERNAME=seu-email@exemplo.com
SF_PASSWORD=sua-senha
```

> **O que é cada campo?**
>
> - `SF_AUTH_MODE=standard` — diz ao projeto para usar login via navegador
> - `SF_BASE_URL` — o endereço da sua org Salesforce (aquele que aparece na barra do navegador quando você está logado)
> - `SF_USERNAME` — seu email de login do Salesforce
> - `SF_PASSWORD` — sua senha do Salesforce

### 2. Execute o comando de autenticação

```bash
npm run auth
```

Isso vai:

1. Abrir o navegador do Chrome automaticamente
2. Navegar até a tela de login do Salesforce
3. Preencher seu email e senha automaticamente
4. Clicar em "Log In"

### 3. Se aparecer a tela de verificação (MFA)

Quando o Salesforce pedir o código de verificação, você verá uma mensagem no terminal parecida com esta:

```
⚠️  Código de verificação solicitado pelo Salesforce.
   1. Verifique seu e-mail e insira o código no browser.
   2. Clique em "Verify".
   3. Pressione o botão "Resume" no Playwright Inspector para continuar.
```

**O que fazer:**

1. Vá ao seu email e copie o código de 6 dígitos que o Salesforce enviou
2. No navegador que o Playwright abriu, digite o código e clique em "Verify"
3. No Playwright Inspector (a janela pequena que abriu junto), clique no botão verde **"Resume"**

### 4. Pronto! Sessão salva

Depois de clicar em Resume, o teste vai:

1. Esperar o Salesforce Lightning carregar completamente
2. Salvar os cookies em um arquivo `.auth/salesforce-default.json`
3. Mostrar no terminal: `Sessão salva em: .auth/salesforce-default.json`

A partir de agora, todo `npm test` usa esses cookies automaticamente — sem abrir navegador para login novamente.

---

## Quando a sessão expira

Após ~1 mês, os cookies expiram e os testes começam a falhar com erros de login. Quando isso acontecer:

1. **Delete o arquivo de sessão:**

   ```bash
   rm .auth/salesforce-default.json
   ```

2. **Execute o login novamente:**

   ```bash
   npm run auth
   ```

3. Repita o processo do MFA descrito acima

---

## Limitações

| Limitação                             | Por que acontece                                             |
| ------------------------------------- | ------------------------------------------------------------ |
| Precisa de navegador visível (headed) | O MFA exige que você digite o código manualmente             |
| Não funciona em CI/CD automaticamente | Pipelines rodam sem monitor — ninguém pode digitar o código  |
| Sessão expira em ~1 mês               | Cookies do Salesforce têm prazo de validade                  |
| Sem acesso à API Salesforce           | Standard App não gera tokens OAuth para requisições REST API |

> **Se você precisa rodar testes em CI/CD ou quer acesso à API**, veja o guia [Autenticação via Connected App](auth-connected-app.md).
