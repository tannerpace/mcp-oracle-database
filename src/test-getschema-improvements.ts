/**
 * Test script for getSchema improvements on copilot/improve-get-schema-errors branch.
 * Tests: happy path, not-found with fuzzy suggestions, list-all hint.
 */
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const serverPath = join(__dirname, '..', 'dist', 'server.js');

async function callSchema(client: Client, args: Record<string, unknown>) {
  const result = await client.callTool({ name: 'get_database_schema', arguments: args });
  const content = result.content as Array<{ text: string }>;
  return JSON.parse(content[0].text);
}

async function run() {
  const client = new Client({ name: 'schema-test', version: '1.0.0' });
  const transport = new StdioClientTransport({ command: 'node', args: [serverPath] });

  await client.connect(transport);
  console.log('Connected to MCP server\n');

  let passed = 0;
  let failed = 0;

  function assert(label: string, condition: boolean, detail?: unknown) {
    if (condition) {
      console.log(`  ✅ ${label}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${label}`, detail ?? '');
      failed++;
    }
  }

  // Test 1: Valid table returns columns + hints
  console.log('=== Test 1: Valid table (HELP) ===');
  const t1 = await callSchema(client, { tableName: 'HELP' });
  assert('success=true', t1.success === true);
  assert('has data with rows', t1.data?.rowCount > 0, t1.data?.rowCount);
  assert('has hint', typeof t1.hint === 'string' && t1.hint.includes('HELP'));
  assert('has optimization_note', typeof t1.optimization_note === 'string');

  // Test 2: List all tables returns hint with count
  console.log('\n=== Test 2: List all tables (no tableName) ===');
  const t2 = await callSchema(client, {});
  assert('success=true', t2.success === true);
  assert('rowCount > 0', t2.data?.rowCount > 0, t2.data?.rowCount);
  assert('hint mentions table count', typeof t2.hint === 'string' && t2.hint.includes('table'));
  assert('optimization_note present', typeof t2.optimization_note === 'string');

  // Test 3: Non-existent table returns failure with suggestions
  console.log('\n=== Test 3: Non-existent table (NONEXISTENT_TABLE_XYZ) ===');
  const t3 = await callSchema(client, { tableName: 'NONEXISTENT_TABLE_XYZ' });
  assert('success=false', t3.success === false);
  assert('has error message', typeof t3.error === 'string' && t3.error.includes('not found'));
  assert('has suggestions array', Array.isArray(t3.suggestions));
  assert('has hint field', typeof t3.hint === 'string');

  // Test 4: Misspelled table name gets fuzzy suggestions
  console.log('\n=== Test 4: Fuzzy match - misspelled "HALP" (should suggest HELP) ===');
  const t4 = await callSchema(client, { tableName: 'HALP' });
  assert('success=false', t4.success === false);
  assert('suggestions is array', Array.isArray(t4.suggestions));
  const suggestsHelp = t4.suggestions?.includes('HELP');
  assert('HELP suggested for HALP', suggestsHelp, `got: ${JSON.stringify(t4.suggestions)}`);
  assert('error contains "Did you mean"', t4.error?.includes('Did you mean'));

  // Test 5: Case insensitive - lowercase table name
  console.log('\n=== Test 5: Lowercase table name "help" ===');
  const t5 = await callSchema(client, { tableName: 'help' });
  assert('success=true (Oracle auto-uppercases)', t5.success === true, t5.error);
  assert('finds HELP columns', t5.data?.rowCount > 0);

  await client.close();

  console.log(`\n${'─'.repeat(40)}`);
  console.log(`Results: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

run().catch(err => {
  console.error('Test runner error:', err);
  process.exit(1);
});
