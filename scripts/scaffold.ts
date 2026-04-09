import fs from 'fs';
import path from 'path';

// ─── Parse CLI arguments ─────────────────────────────────────────
const args = process.argv.slice(2);
const objectFlag = args.indexOf('--object');
if (objectFlag === -1 || !args[objectFlag + 1]) {
  console.error('Usage: npm run scaffold -- --object <ObjectName>');
  console.error('Example: npm run scaffold -- --object Contact');
  process.exit(1);
}

const objectName = args[objectFlag + 1]; // e.g. "Contact"
const objectLower = objectName.charAt(0).toLowerCase() + objectName.slice(1); // "contact"
const objectKebab = objectName.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase(); // "contact"

const root = path.resolve(__dirname, '..');

// ─── Helpers ─────────────────────────────────────────────────────
function writeFile(filePath: string, content: string) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (fs.existsSync(filePath)) {
    console.log(`  ⚠️  SKIP (already exists): ${path.relative(root, filePath)}`);
    return;
  }
  fs.writeFileSync(filePath, content, 'utf-8');
  console.log(`  ✅ Created: ${path.relative(root, filePath)}`);
}

// ─── 1. Page Object ─────────────────────────────────────────────
const pageContent = `import { Page } from '@playwright/test';
import { BasePage } from './BasePage';
// TODO: Import field classes you need from '../utils/SalesforceFields'
// import { TextField, PicklistField, NumberField } from '../utils/SalesforceFields';

/**
 * Page object for the Salesforce ${objectName} object.
 * Covers CRUD operations on the ${objectName} list and record pages.
 */
export class ${objectName}Page extends BasePage {
  // TODO: Declare typed field properties here. Example:
  // /** "${objectName} Name" text field inside the New/Edit modal. */
  // readonly nameField: TextField;

  constructor(page: Page) {
    super(page);
    // TODO: Initialize typed field properties here. Example:
    // this.nameField = new TextField(page, '${objectName} Name');
  }

  /**
   * Navigates to the ${objectName} list view.
   */
  async navigate() {
    await this.navigateToObject('${objectName}');
    // TODO: If this is a custom object, use the API name instead:
    // await this.navigateToObject('${objectName}__c');
  }

  /**
   * Creates a new ${objectName} record end-to-end:
   * opens the modal, fills required fields, saves, and waits for the record page.
   *
   * @param name - Name for the new ${objectName}.
   */
  async create${objectName}(name: string) {
    await this.clickNew();
    // TODO: Fill the required name field. Example:
    // await this.nameField.fill(name);
    await this.save();
    await this.waitForRecordPage();
  }

  /**
   * Opens a ${objectName} record from the list view by its name.
   *
   * @param name - Exact record name as shown in the list.
   */
  async open${objectName}(name: string) {
    await this.openRecord(name);
  }

  /**
   * Deletes a ${objectName} record end-to-end.
   *
   * @param name - Exact record name to delete.
   */
  async delete${objectName}(name: string) {
    await this.deleteRecord(name, '${objectName}');
    // TODO: If this is a custom object, use the API name instead:
    // await this.deleteRecord(name, '${objectName}__c');
  }

  // TODO: Add fillAllFields(data), clearAllFields(), expectAllFieldsEmpty()
  // following the AccountPage pattern.
}
`;

// ─── 2. Factory ──────────────────────────────────────────────────
const factoryContent = `import { faker } from '@faker-js/faker';

/**
 * Represents data for a Salesforce ${objectName} record.
 * Only \`name\` is required; all other fields are optional.
 */
export interface ${objectName}Data {
  name: string;
  // TODO: Add optional fields matching your Salesforce object. Example:
  // email?: string;
  // phone?: string;
  // status?: string;
}

// TODO: Define valid picklist values. Example:
// const PICKLIST_OPTIONS = {
//   status: ['New', 'Active', 'Closed'],
// } as const;

/**
 * Factory for generating Salesforce ${objectName} test data.
 *
 * @example
 * const data = ${objectName}Factory.buildComplete();
 * await ${objectLower}Page.fillAllFields(data);
 */
export class ${objectName}Factory {
  /**
   * Builds a ${objectName} with all fields populated using random faker data.
   *
   * @param overrides - Partial data to override any generated values.
   */
  static buildComplete(overrides: Partial<${objectName}Data> = {}): ${objectName}Data {
    return {
      name: \`${objectName} Test \${Date.now()}\`,
      // TODO: Add all fields with faker-generated values. Example:
      // email: faker.internet.email(),
      // phone: faker.phone.number({ style: 'international' }),
      // status: faker.helpers.arrayElement([...PICKLIST_OPTIONS.status]),
      ...overrides,
    };
  }

  /**
   * Builds a ${objectName} with only the required field (name).
   *
   * @param overrides - Partial data to add optional fields with specific values.
   */
  static buildMinimal(overrides: Partial<${objectName}Data> = {}): ${objectName}Data {
    return {
      name: \`${objectName} Test \${Date.now()}\`,
      ...overrides,
    };
  }

  /**
   * Builds a ${objectName} with only the specified fields (+ name) populated
   * with random faker data.
   *
   * @param fields - Array of field names to include.
   * @param overrides - Partial data to override specific values.
   */
  static buildPartial(
    fields: (keyof Omit<${objectName}Data, 'name'>)[],
    overrides: Partial<${objectName}Data> = {},
  ): ${objectName}Data {
    const complete = this.buildComplete(overrides);
    const result: ${objectName}Data = { name: complete.name };
    for (const field of fields) {
      if (complete[field] !== undefined) {
        (result as any)[field] = complete[field];
      }
    }
    return { ...result, ...overrides };
  }
}
`;

// ─── 3. Feature file ─────────────────────────────────────────────
const featureContent = `Feature: ${objectName}

  Background:
    Given que eu navego para a lista de ${objectName}

  @smoke
  Scenario: Deve criar um novo registro de ${objectName}
    When eu crio um ${objectLower} com nome único
    Then o título da página deve conter o nome do ${objectLower}
    And eu excluo o ${objectLower} criado

  @smoke
  Scenario: Deve exibir ${objectLower} criado na lista
    When eu crio um ${objectLower} com nome único
    And eu navego para a lista de ${objectName}
    Then o ${objectLower} deve estar visível na lista
    And eu excluo o ${objectLower}

  @smoke
  Scenario: Deve excluir um ${objectLower}
    When eu crio um ${objectLower} com nome único
    And eu navego para a lista de ${objectName}
    And eu excluo o ${objectLower}
    Then o ${objectLower} não deve estar visível na lista
`;

// ─── 4. Steps file ───────────────────────────────────────────────
const stepsContent = `import { expect } from '@playwright/test';
import { Given, When, Then } from '../fixtures/bdd';
import { ${objectName}Factory } from '../factories/${objectLower}Factory';

Given('que eu navego para a lista de ${objectName}', async ({ ${objectLower}Page }) => {
  await ${objectLower}Page.navigate();
});

When('eu crio um ${objectLower} com nome único', async ({ ${objectLower}Page, testContext }) => {
  const data = ${objectName}Factory.buildMinimal();
  testContext.name = data.name;
  await ${objectLower}Page.create${objectName}(data.name);
});

When('eu navego para a lista de ${objectName}', async ({ ${objectLower}Page }) => {
  await ${objectLower}Page.navigate();
});

When('eu excluo o ${objectLower}', async ({ ${objectLower}Page, testContext }) => {
  await ${objectLower}Page.delete${objectName}(testContext.name);
});

Then('o título da página deve conter o nome do ${objectLower}', async ({ ${objectLower}Page, testContext }) => {
  const titulo = await ${objectLower}Page.getRecordTitle();
  expect(titulo).toContain(testContext.name);
});

Then('o ${objectLower} deve estar visível na lista', async ({ ${objectLower}Page, testContext }) => {
  await expect(${objectLower}Page.getListItem(testContext.name)).toBeVisible();
});

Then('o ${objectLower} não deve estar visível na lista', async ({ ${objectLower}Page, testContext }) => {
  await expect(${objectLower}Page.getListItem(testContext.name)).not.toBeVisible();
});

Then('eu excluo o ${objectLower} criado', async ({ ${objectLower}Page, testContext }) => {
  await ${objectLower}Page.delete${objectName}(testContext.name);
});
`;

// ─── 5. Auto-update bdd.ts fixtures ─────────────────────────────
function updateBddFixtures() {
  const bddPath = path.join(root, 'tests', 'fixtures', 'bdd.ts');
  let content = fs.readFileSync(bddPath, 'utf-8');

  const importLine = `import { ${objectName}Page } from '../pages/${objectName}Page';`;
  if (content.includes(importLine)) {
    console.log(`  ⚠️  SKIP fixture update (${objectName}Page already registered in bdd.ts)`);
    return;
  }

  // Add import after the last existing import
  const lastImportIdx = content.lastIndexOf('import ');
  const lineEnd = content.indexOf('\n', lastImportIdx);
  content = content.slice(0, lineEnd + 1) + importLine + '\n' + content.slice(lineEnd + 1);

  // Add to Fixtures type
  content = content.replace(
    /testContext: Record<string, any>;/,
    `${objectLower}Page: ${objectName}Page;\n  testContext: Record<string, any>;`,
  );

  // Add fixture definition
  content = content.replace(
    /testContext: async \(\{},/,
    `${objectLower}Page: async ({ page }, use) => {\n    await use(new ${objectName}Page(page));\n  },\n  testContext: async ({},`,
  );

  fs.writeFileSync(bddPath, content, 'utf-8');
  console.log(`  ✅ Updated: tests/fixtures/bdd.ts (registered ${objectName}Page fixture)`);
}

// ─── Execute ─────────────────────────────────────────────────────
console.log(`\n🏗️  Scaffolding files for Salesforce object: ${objectName}\n`);

writeFile(path.join(root, 'tests', 'pages', `${objectName}Page.ts`), pageContent);
writeFile(path.join(root, 'tests', 'factories', `${objectLower}Factory.ts`), factoryContent);
writeFile(path.join(root, 'tests', 'features', `${objectKebab}s.feature`), featureContent);
writeFile(path.join(root, 'tests', 'steps', `${objectLower}.steps.ts`), stepsContent);
updateBddFixtures();

console.log(`\n✅ Scaffold complete! Next steps:`);
console.log(`   1. Open tests/pages/${objectName}Page.ts and add your field declarations`);
console.log(`   2. Open tests/factories/${objectLower}Factory.ts and add your field definitions`);
console.log(`   3. Run: npm test`);
console.log('');
