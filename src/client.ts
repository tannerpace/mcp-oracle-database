import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

interface ToolResultPayload {
  success: boolean;
  error?: string;
  data?: {
    rowCount?: number;
    executionTime?: number;
    rows?: Array<Record<string, unknown>>;
  };
}

function parseToolPayload(rawResult: unknown): ToolResultPayload {
  if (
    !rawResult ||
    typeof rawResult !== 'object' ||
    !('content' in rawResult) ||
    !Array.isArray((rawResult as { content: unknown }).content)
  ) {
    throw new Error('Invalid MCP tool response shape');
  }

  const content = (rawResult as { content: unknown[] }).content;
  if (content.length === 0) {
    throw new Error('MCP tool response has no content items');
  }

  const firstItem = content[0];
  if (
    !firstItem ||
    typeof firstItem !== 'object' ||
    !('text' in firstItem) ||
    typeof (firstItem as { text?: unknown }).text !== 'string'
  ) {
    throw new Error('MCP tool response does not contain text content');
  }

  const parsed = JSON.parse((firstItem as { text: string }).text) as unknown;
  if (!parsed || typeof parsed !== 'object' || !('success' in parsed)) {
    throw new Error('Tool payload missing success field');
  }

  return parsed as ToolResultPayload;
}

function logToolFailure(testName: string, payload: ToolResultPayload): void {
  console.error(`❌ ${testName} failed: ${payload.error || 'Unknown error'}`);
}

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

  const results: Array<Record<string, unknown>> = [];

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
    const schemaData = parseToolPayload(schemaResult);
    if (!schemaData.success || !schemaData.data) {
      logToolFailure('Get All Tables', schemaData);
      results.push({
        test: 'Get All Tables',
        success: false,
        error: schemaData.error || 'Unknown error',
      });
    } else {
      const rowCount = schemaData.data.rowCount ?? 0;
      const executionTime = schemaData.data.executionTime ?? 0;
      const rows = schemaData.data.rows ?? [];
      console.log(`Found ${rowCount} tables`);
      console.log(`Execution time: ${executionTime}ms`);
      results.push({
        test: 'Get All Tables',
        success: true,
        rowCount,
        executionTime,
        sampleTables: rows.slice(0, 5),
      });
    }
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
    const versionData = parseToolPayload(versionResult);
    if (!versionData.success || !versionData.data || !versionData.data.rows || versionData.data.rows.length === 0) {
      logToolFailure('Query Database Version', versionData);
      results.push({
        test: 'Query Database Version',
        success: false,
        error: versionData.error || 'Unknown error',
      });
    } else {
      const firstRow = versionData.data.rows[0];
      console.log('Database version:', firstRow);
      results.push({
        test: 'Query Database Version',
        success: true,
        data: firstRow,
        executionTime: versionData.data.executionTime ?? 0,
      });
    }
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
    const userDateData = parseToolPayload(userDateResult);
    if (!userDateData.success || !userDateData.data || !userDateData.data.rows || userDateData.data.rows.length === 0) {
      logToolFailure('Query Current User and Date', userDateData);
      results.push({
        test: 'Query Current User and Date',
        success: false,
        error: userDateData.error || 'Unknown error',
      });
    } else {
      const firstRow = userDateData.data.rows[0];
      console.log('Current user/date row:', firstRow);
      results.push({
        test: 'Query Current User and Date',
        success: true,
        data: firstRow,
        executionTime: userDateData.data.executionTime ?? 0,
      });
    }
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
    const tablespaceData = parseToolPayload(tablespaceResult);
    if (!tablespaceData.success || !tablespaceData.data) {
      logToolFailure('Query Tablespaces', tablespaceData);
      results.push({
        test: 'Query Tablespaces',
        success: false,
        error: tablespaceData.error || 'Unknown error',
      });
    } else {
      const rows = tablespaceData.data.rows ?? [];
      console.log(`Found ${tablespaceData.data.rowCount ?? rows.length} tablespaces`);
      rows.forEach((row) => {
        console.log('  -', row);
      });
      results.push({
        test: 'Query Tablespaces',
        success: true,
        rowCount: tablespaceData.data.rowCount ?? rows.length,
        data: rows,
        executionTime: tablespaceData.data.executionTime ?? 0,
      });
    }
    console.log('\n');

    // Test 6: Get schema for HELP table
    console.log('📋 Test 6: Getting schema for HELP table...');
    const helpSchemaResult = await client.callTool({
      name: 'get_database_schema',
      arguments: {
        tableName: 'HELP',
      },
    });
    const helpSchemaData = parseToolPayload(helpSchemaResult);
    if (!helpSchemaData.success || !helpSchemaData.data) {
      logToolFailure('Get Table Schema (HELP)', helpSchemaData);
      results.push({
        test: 'Get Table Schema (HELP)',
        success: false,
        error: helpSchemaData.error || 'Unknown error',
      });
    } else {
      const rows = helpSchemaData.data.rows ?? [];
      console.log(`Found ${helpSchemaData.data.rowCount ?? rows.length} columns in HELP table`);
      rows.forEach((row) => {
        console.log('  -', row);
      });
      results.push({
        test: 'Get Table Schema (HELP)',
        success: true,
        rowCount: helpSchemaData.data.rowCount ?? rows.length,
        columns: rows,
        executionTime: helpSchemaData.data.executionTime ?? 0,
      });
    }
    console.log('\n');

    const failedCount = results.filter((result) => result.success === false).length;
    if (failedCount > 0) {
      throw new Error(`${failedCount} client test(s) failed`);
    }

    console.log('✅ All tests completed successfully!');

    // Return results for potential further processing
    return results;

  } catch (error) {
    console.error('❌ Error during MCP operations:', error);
    throw error;
  } finally {
    await client.close();
    console.log('\n✅ Client disconnected');
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
