# Factories de Dados (faker.js)

## O que é uma Factory?

Imagine que você está num restaurante de hambúrguer. Você pode pedir:

- **Completo** — vem com tudo: pão, carne, queijo, alface, tomate, cebola, maionese, ketchup...
- **Só o básico** — vem só o pão e a carne (o mínimo para ser um hambúrguer)
- **Personalizado** — você escolhe quais ingredientes quer: "quero pão, carne, queijo e bacon" — e cada ingrediente é escolhido pelo chef (aleatoriamente entre as opções do cardápio)

A **Factory** funciona exatamente assim, mas para dados de teste no Salesforce. Em vez de ingredientes, ela gera **campos** de um registro (Account, Contact, etc.) com valores aleatórios usando a biblioteca [faker.js](https://fakerjs.dev/).

> **Por que usar Factory?** Se todo teste usasse o mesmo valor fixo (ex.: `'Acme Corp'`), não testaríamos cenários reais. A Factory gera nomes, telefones, endereços e valores de picklist diferentes a cada execução — isso torna os testes mais confiáveis e evita conflitos entre execuções paralelas.

---

## Os 3 métodos da Factory

Cada Factory tem **3 métodos estáticos**. Você não precisa criar uma instância — basta chamar direto na classe:

### 1. `buildComplete()` — Gera TODOS os campos

Equivalente ao hambúrguer completo. Todo campo do objeto é preenchido com um valor aleatório válido.

```typescript
const data = AccountFactory.buildComplete();
// data = {
//   name: 'Account Test 1712678400000',
//   rating: 'Hot',              ← valor aleatório entre Hot, Warm e Cold
//   phone: '+55 11 91234-5678', ← telefone fake
//   industry: 'Banking',        ← valor aleatório entre as opções válidas
//   billingCountry: 'Brazil',
//   billingState: 'São Paulo',  ← estado aleatório entre os mapeados
//   employees: 4521,            ← número aleatório
//   ... (todos os outros campos também preenchidos)
// }
```

**Quando usar:** quando o teste precisa preencher **todos** os campos do formulário.

```typescript
// No step definition:
When('eu preencho todos os campos da conta', async ({ accountPage, testContext }) => {
  const data = AccountFactory.buildComplete();
  testContext.name = data.name; // salva o nome para usar no Then
  await accountPage.fillAllFields(data);
});
```

---

### 2. `buildMinimal()` — Gera só o campo obrigatório

Equivalente ao hambúrguer básico. Só gera o `name` (único campo obrigatório de Account).

```typescript
const data = AccountFactory.buildMinimal();
// data = {
//   name: 'Account Test 1712678400000'
//   ← nenhum outro campo, só o nome
// }
```

**Quando usar:** quando o teste só precisa do nome (ex.: criar e deletar uma conta rapidamente).

```typescript
When('eu crio uma conta com nome único', async ({ accountPage, testContext }) => {
  const data = AccountFactory.buildMinimal();
  testContext.name = data.name;
  await accountPage.createAccount(data.name);
});
```

---

### 3. `buildPartial(campos)` — Gera campos específicos com valores aleatórios

Equivalente ao hambúrguer personalizado: você diz quais ingredientes quer e o chef escolhe cada um aleatoriamente. A Factory gera internamente um registro completo e **retorna só os campos que você pediu** (+ o `name` obrigatório).

```typescript
const data = AccountFactory.buildPartial(['rating', 'phone', 'industry']);
// data = {
//   name: 'Account Test 1712678400000',
//   rating: 'Warm',               ← aleatório entre Hot, Warm, Cold
//   phone: '+1 555-987-6543',     ← telefone aleatório gerado pelo faker
//   industry: 'Technology',       ← aleatório entre as opções válidas
//   ← SÓ esses 3 campos + name. Nenhum outro campo aparece.
// }
```

**Quando usar:** quando o teste precisa preencher **alguns** campos, mas não todos, e os valores não precisam ser exatos.

```typescript
When('eu crio uma conta com informações parciais', async ({ accountPage, testContext }) => {
  const data = AccountFactory.buildPartial([
    'rating',
    'phone',
    'industry',
    'billingCountry',
    'billingState',
  ]);
  testContext.name = data.name;
  await accountPage.clickNew();
  await accountPage.fillAllFields(data); // preenche SOMENTE name + os 5 campos acima
  await accountPage.save();
  await accountPage.waitForRecordPage();
});
```

---

## E quando eu preciso de um valor EXATO?

Todos os 3 métodos aceitam um parâmetro opcional chamado `overrides`. Ele serve para **forçar** um valor específico, sobrescrevendo o que o faker geraria. Use isso apenas quando o teste precisa **verificar** um valor exato.

```typescript
// Força o rating para 'Cold' — todo o resto continua aleatório
const data = AccountFactory.buildComplete({ rating: 'Cold' });
// data.rating será SEMPRE 'Cold', nunca outro valor

// Força o nome para um valor específico
const data = AccountFactory.buildMinimal({ name: 'Conta Especial' });
// data.name será 'Conta Especial' em vez de 'Account Test 17...'

// Parcial com 3 campos aleatórios, mas rating forçado
const data = AccountFactory.buildPartial(['rating', 'phone', 'industry'], { rating: 'Hot' });
// data.rating será SEMPRE 'Hot', phone e industry continuam aleatórios
```

---

## Tabela resumo

| Método                               | O que gera                 | Valores               | Quando usar                              |
| ------------------------------------ | -------------------------- | --------------------- | ---------------------------------------- |
| `buildComplete()`                    | Todos os campos            | Aleatórios (faker)    | Preencher formulário inteiro             |
| `buildMinimal()`                     | Só o `name`                | Aleatório             | Criar registro rápido, testar deleção    |
| `buildPartial(['campo1', 'campo2'])` | `name` + campos escolhidos | Aleatórios (faker)    | Preencher alguns campos específicos      |
| Qualquer um com `{ campo: 'valor' }` | Depende do método          | Forçado pelo override | Quando o teste precisa de um valor exato |

## Como a Factory se conecta com o Page Object

O método `fillAllFields(data)` do Page Object recebe o objeto gerado pela Factory e **só preenche os campos que existem no objeto**. Campos ausentes (que não foram gerados) são simplesmente ignorados.

```
Factory gera dados  →  fillAllFields(data) recebe  →  preenche só o que veio
─────────────────      ────────────────────────       ──────────────────────────
buildComplete()        { name, rating, phone, ... }   preenche TODOS os campos
buildMinimal()         { name }                        preenche SÓ o nome
buildPartial([...])    { name, rating, phone }         preenche nome + rating + phone
```

> **Regra importante:** nunca escreva valores fixos diretamente nos steps ou page objects. Sempre use a Factory para gerar os dados.

---

## Criando uma Factory para um novo objeto

Ao adicionar um novo objeto Salesforce, crie `tests/factories/<objeto>Factory.ts` seguindo o padrão:

1. Defina a interface `<Objeto>Data` — campos obrigatórios são `required`, resto `optional`
2. Mapeie os valores válidos de picklist como arrays `const`
3. Implemente `buildComplete()`, `buildMinimal()` e `buildPartial()` com parâmetro `overrides`
4. Use a factory nos step definitions — nunca escreva valores fixos

O scaffold CLI (`npm run scaffold -- --object NomeDoObjeto`) já gera uma factory de exemplo.
