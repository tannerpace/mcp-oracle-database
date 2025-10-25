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

  try {
    // List available tools
    console.log('📋 Listing available tools...');
    const toolsResponse = await client.listTools();
    console.log('Available tools:');
    toolsResponse.tools.forEach((tool) => {
      console.log(`  - ${tool.name}: ${tool.description}`);
    });
    console.log('\n');

    // Example 1: Get database schema (list all tables)
    console.log('📊 Getting database schema (all tables)...');
    const schemaResult = await client.callTool({
      name: 'get_database_schema',
      arguments: {},
    });
    console.log('Schema result:');
    console.log(JSON.stringify(schemaResult, null, 2));
    console.log('\n');

    // Example 2: Query a specific table
    // Uncomment and modify based on your actual database:
    /*
    console.log('🔍 Querying database...');
    const queryResult = await client.callTool({
      name: 'query_database',
      arguments: {
        query: 'SELECT * FROM your_table WHERE ROWNUM <= 5',
        maxRows: 5,
      },
    });
    console.log('Query result:');
    console.log(JSON.stringify(queryResult, null, 2));
    console.log('\n');
    */

    // Example 3: Get schema for a specific table
    // Uncomment and modify with your table name:
    /*
    console.log('📋 Getting schema for specific table...');
    const tableSchemaResult = await client.callTool({
      name: 'get_database_schema',
      arguments: {
        tableName: 'YOUR_TABLE_NAME',
      },
    });
    console.log('Table schema:');
    console.log(JSON.stringify(tableSchemaResult, null, 2));
    */

  } catch (error) {
    console.error('❌ Error during MCP operations:', error);
  } finally {
    // Close the connection
    await client.close();
    console.log('\n✅ Client disconnected');
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
