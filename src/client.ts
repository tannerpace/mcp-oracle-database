import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

/**
 * Simple MCP client for testing the Oracle database MCP server
 */
async function main() {
  console.log('Starting MCP client...\n');

  // Create stdio transport (it will spawn the server process)
  const transport = new StdioClientTransport({
    command: 'node',
    args: ['dist/server.js'],
    stderr: 'inherit', // Show server logs in console
  });

  // Create MCP client
  const client = new Client(
    {
      name: 'oracle-mcp-test-client',
      version: '1.0.0',
    },
    {
      capabilities: {},
    }
  );

  // Connect to the server
  console.log('Connecting to MCP server...');
  await client.connect(transport);
  console.log('✅ Connected to MCP server\n');

  const results: any[] = [];

  try {
    // Test 1: List available tools
    console.log('📋 Test 1: Listing available tools...');
    const toolsResponse = await client.listTools();
    console.log('Available tools:');
    toolsResponse.tools.forEach((tool) => {
      console.log(`  - ${tool.name}: ${tool.description}`);
    });
    results.push({
      test: 'List Tools',
      success: true,
      data: toolsResponse.tools,
    });
    console.log('\n');

    // Test 2: Get database schema (list all tables)
    console.log('📊 Test 2: Getting database schema (all tables)...');
    const schemaResult = await client.callTool({
      name: 'get_database_schema',
      arguments: {},
    });
    const schemaData = JSON.parse((schemaResult as any).content[0].text);
    console.log(`Found ${schemaData.data.rowCount} tables`);
    console.log(`Execution time: ${schemaData.data.executionTime}ms`);
    results.push({
      test: 'Get All Tables',
      success: schemaData.success,
      rowCount: schemaData.data.rowCount,
      executionTime: schemaData.data.executionTime,
      sampleTables: schemaData.data.rows.slice(0, 5),
    });
    console.log('\n');

    // Test 3: Query database version
    console.log('🔍 Test 3: Querying Oracle database version...');
    const versionResult = await client.callTool({
      name: 'query_database',
      arguments: {
        query: 'SELECT * FROM v$version WHERE ROWNUM = 1',
        maxRows: 1,
      },
    });
    const versionData = JSON.parse((versionResult as any).content[0].text);
    console.log('Database version:', versionData.data.rows[0]);
    results.push({
      test: 'Query Database Version',
      success: versionData.success,
      data: versionData.data.rows[0],
      executionTime: versionData.data.executionTime,
    });
    console.log('\n');

    // Test 4: Query current user and date
    console.log('🔍 Test 4: Querying current user and date...');
    const userDateResult = await client.callTool({
      name: 'query_database',
      arguments: {
        query: 'SELECT USER as current_user, SYSDATE as current_date FROM DUAL',
        maxRows: 1,
      },
    });
    const userDateData = JSON.parse((userDateResult as any).content[0].text);
    console.log('Current user:', userDateData.data.rows[0].CURRENT_USER);
    console.log('Current date:', userDateData.data.rows[0].CURRENT_DATE);
    results.push({
      test: 'Query Current User and Date',
      success: userDateData.success,
      data: userDateData.data.rows[0],
      executionTime: userDateData.data.executionTime,
    });
    console.log('\n');

    // Test 5: Query tablespace information
    console.log('🔍 Test 5: Querying tablespace information...');
    const tablespaceResult = await client.callTool({
      name: 'query_database',
      arguments: {
        query: `SELECT tablespace_name, status, contents 
                FROM dba_tablespaces 
                ORDER BY tablespace_name`,
        maxRows: 10,
      },
    });
    const tablespaceData = JSON.parse((tablespaceResult as any).content[0].text);
    console.log(`Found ${tablespaceData.data.rowCount} tablespaces`);
    tablespaceData.data.rows.forEach((row: any) => {
      console.log(`  - ${row.TABLESPACE_NAME}: ${row.STATUS} (${row.CONTENTS})`);
    });
    results.push({
      test: 'Query Tablespaces',
      success: tablespaceData.success,
      rowCount: tablespaceData.data.rowCount,
      data: tablespaceData.data.rows,
      executionTime: tablespaceData.data.executionTime,
    });
    console.log('\n');

    // Test 6: Get schema for HELP table
    console.log('📋 Test 6: Getting schema for HELP table...');
    const helpSchemaResult = await client.callTool({
      name: 'get_database_schema',
      arguments: {
        tableName: 'HELP',
      },
    });
    const helpSchemaData = JSON.parse((helpSchemaResult as any).content[0].text);
    console.log(`Found ${helpSchemaData.data.rowCount} columns in HELP table`);
    helpSchemaData.data.rows.forEach((row: any) => {
      console.log(`  - ${row.COLUMN_NAME}: ${row.DATA_TYPE}(${row.DATA_LENGTH}) ${row.NULLABLE}`);
    });
    results.push({
      test: 'Get Table Schema (HELP)',
      success: helpSchemaData.success,
      rowCount: helpSchemaData.data.rowCount,
      columns: helpSchemaData.data.rows,
      executionTime: helpSchemaData.data.executionTime,
    });
    console.log('\n');

    console.log('✅ All tests completed successfully!');

    // Return results for potential further processing
    return results;

  } catch (error) {
    console.error('❌ Error during MCP operations:', error);
    throw error;
  } finally {
    // Close the connection
    setTimeout(async () => {
      await client.close();
      console.log('\n✅ Client disconnected');

      // Exit cleanly
      process.exit(0);
    }, 500);
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
