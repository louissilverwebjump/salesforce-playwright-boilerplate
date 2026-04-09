# Como Adicionar um Novo Objeto Salesforce

## Método Rápido: Scaffold CLI (Recomendado)

O projeto inclui um comando que gera automaticamente todos os 5 arquivos necessários para testar um novo objeto Salesforce. Basta rodar:

```bash
npm run scaffold -- --object Contact
```

> Substitua `Contact` pelo nome do seu objeto. Para objetos customizados, use o nome sem o `__c` (ex: `Reservation` para `Reservation__c`).

O comando vai criar:

| Arquivo criado                      | O que é                                           |
| ----------------------------------- | ------------------------------------------------- |
| `tests/pages/ContactPage.ts`        | Page Object com métodos CRUD básicos              |
| `tests/factories/contactFactory.ts` | Factory para gerar dados de teste                 |
| `tests/features/contacts.feature`   | 3 cenários BDD básicos (criar, listar, deletar)   |
| `tests/steps/contact.steps.ts`      | Step definitions delegando para o Page Object     |
| `tests/fixtures/bdd.ts`             | **Atualizado automaticamente** com a nova fixture |

### Depois de rodar o scaffold

Cada arquivo gerado tem comentários `// TODO:` indicando exatamente o que precisa preencher:

1. **Abra o Page Object** (`tests/pages/ContactPage.ts`):
   - Declare os campos do formulário (ex: `readonly emailField: TextField`)
   - Inicialize no construtor (ex: `this.emailField = new TextField(page, 'Email')`)
   - Se for objeto customizado, corrija o `navigateToObject('Contact__c')` e `deleteRecord(name, 'Contact__c')`

2. **Abra a Factory** (`tests/factories/contactFactory.ts`):
   - Adicione campos opcionais na interface `ContactData`
   - Preencha o `buildComplete()` com valores faker para cada campo
   - Defina os arrays de valores válidos para picklists

3. **Rode os testes:**
   ```bash
   npm test
   ```

---

## Método Manual (Passo a Passo)

Se preferir criar os arquivos manualmente, siga este checklist:

### Checklist

- [ ] **1. Page Object**: `tests/pages/<Objeto>Page.ts`
  - Estende `BasePage`
  - Declara campos como `readonly` com classes tipadas de `SalesforceFields.ts`
  - Método `navigate()` com o API name do objeto
  - Métodos `create<Objeto>()`, `open<Objeto>()`, `delete<Objeto>()`
  - Método `fillAllFields(data)` aceitando a interface da Factory

- [ ] **2. Factory**: `tests/factories/<objeto>Factory.ts`
  - Interface `<Objeto>Data` com `name` obrigatório
  - Arrays de picklist values válidos
  - `buildComplete()`, `buildMinimal()`, `buildPartial()`

- [ ] **3. Feature**: `tests/features/<objetos>.feature`
  - `Background` com navegação
  - Cenários com tags `@smoke` / `@regression`
  - Cleanup (delete) em cenários que criam registros

- [ ] **4. Steps**: `tests/steps/<objeto>.steps.ts`
  - Importa `Given/When/Then` de `../fixtures/bdd`
  - Importa Factory
  - Usa `testContext` para compartilhar dados entre steps

- [ ] **5. Fixture**: `tests/fixtures/bdd.ts`
  - Importa o novo Page Object
  - Adiciona ao tipo `Fixtures`
  - Registra a fixture no `test.extend<Fixtures>()`

---

## Referência: AccountPage como modelo

O `AccountPage.ts` é a implementação referência do projeto. Ele demonstra:

- 28 campos tipados usando todas as classes de `SalesforceFields.ts`
- `fillAllFields(data)` que respeita picklists dependentes (Country→State)
- `clearAllFields()` limpando dependentes na ordem correta (State antes de Country)
- `expectAllFieldsEmpty()` validando o estado vazio de todos os campos

Use-o como modelo ao implementar seu novo objeto.
