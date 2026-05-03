import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

interface ToolPayload {
  success: boolean;
  error?: string;
  data?: unknown;
  cached?: boolean;
}

function parseToolPayload(rawResult: unknown): ToolPayload {
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

  return JSON.parse((firstItem as { text: string }).text) as ToolPayload;
}

function printToolError(testName: string, payload: ToolPayload): void {
  if (!payload.success) {
    console.error(`❌ ${testName} failed: ${payload.error || 'Unknown error'}`);
  }
}

/**
 * Test client for schema discovery tools
 */
async function main() {
  console.log('Starting MCP Schema Discovery Test Client...\n');

  // Create stdio transport (it will spawn the server process)
  const transport = new StdioClientTransport({
    command: 'node',
    args: ['dist/server.js'],
    stderr: 'inherit', // Show server logs in console
  });

  // Create MCP client
  const client = new Client(
    {
      name: 'oracle-mcp-discovery-test-client',
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
      console.log(`  - ${tool.name}: ${tool.description?.substring(0, 80)}...`);
    });
    results.push({
      test: 'List Tools',
      success: true,
      toolCount: toolsResponse.tools.length,
    });
    console.log('\n');

    // Test 2: List all tables (without row counts for speed)
    console.log('📊 Test 2: Listing all tables (fast mode)...');
    const listTablesResult = await client.callTool({
      name: 'listTables',
      arguments: {
        includeRowCounts: false,
      },
    });
    const listTablesData = parseToolPayload(listTablesResult);
    console.log(`Success: ${listTablesData.success}`);
    printToolError('List Tables (fast)', listTablesData);
    const listTablesRows = Array.isArray(listTablesData.data) ? listTablesData.data : [];
    console.log(`Found ${listTablesRows.length} tables`);
    console.log(`Cached: ${listTablesData.cached || false}`);
    if (listTablesRows.length > 0) {
      console.log('Sample tables:');
      listTablesRows.slice(0, 5).forEach((table) => {
        console.log('  -', table);
      });
    }
    results.push({
      test: 'List Tables (fast)',
      success: listTablesData.success,
      tableCount: listTablesRows.length,
      error: listTablesData.error,
    });
    console.log('\n');

    // Test 3: List all tables with row counts
    console.log('📊 Test 3: Listing all tables (with row counts)...');
    const listTablesWithCountsResult = await client.callTool({
      name: 'listTables',
      arguments: {
        includeRowCounts: true,
      },
    });
    const listTablesWithCountsData = parseToolPayload(listTablesWithCountsResult);
    console.log(`Success: ${listTablesWithCountsData.success}`);
    printToolError('List Tables (with counts)', listTablesWithCountsData);
    const listTablesWithCountsRows = Array.isArray(listTablesWithCountsData.data)
      ? listTablesWithCountsData.data
      : [];
    console.log(`Found ${listTablesWithCountsRows.length} tables`);
    if (listTablesWithCountsRows.length > 0) {
      console.log('Sample tables with row counts:');
      listTablesWithCountsRows.slice(0, 5).forEach((table) => {
        console.log('  -', table);
      });
    }
    results.push({
      test: 'List Tables (with counts)',
      success: listTablesWithCountsData.success,
      tableCount: listTablesWithCountsRows.length,
      error: listTablesWithCountsData.error,
    });
    console.log('\n');

    // Get a table name for further tests
    let testTableName = 'HELP'; // Default fallback
    if (
      listTablesRows.length > 0 &&
      typeof listTablesRows[0] === 'object' &&
      listTablesRows[0] !== null &&
      'tableName' in (listTablesRows[0] as Record<string, unknown>) &&
      typeof (listTablesRows[0] as Record<string, unknown>).tableName === 'string'
    ) {
      testTableName = (listTablesRows[0] as Record<string, string>).tableName;
    }

    // Test 4: Describe a table
    console.log(`📋 Test 4: Describing table ${testTableName}...`);
    const describeTableResult = await client.callTool({
      name: 'describeTable',
      arguments: {
        tableName: testTableName,
        includeConstraints: true,
      },
    });
    const describeTableData = parseToolPayload(describeTableResult);
    console.log(`Success: ${describeTableData.success}`);
    printToolError('Describe Table', describeTableData);
    if (describeTableData.success) {
      console.log('Describe payload:', describeTableData.data);
    }
    results.push({
      test: 'Describe Table',
      success: describeTableData.success,
      tableName: testTableName,
      error: describeTableData.error,
    });
    console.log('\n');

    // Test 5: Get table relations
    console.log(`🔗 Test 5: Getting relations for table ${testTableName}...`);
    const relationsResult = await client.callTool({
      name: 'getTableRelations',
      arguments: {
        tableName: testTableName,
      },
    });
    const relationsData = parseToolPayload(relationsResult);
    console.log(`Success: ${relationsData.success}`);
    printToolError('Get Table Relations', relationsData);
    if (relationsData.success) {
      console.log('Relations payload:', relationsData.data);
    }
    results.push({
      test: 'Get Table Relations',
      success: relationsData.success,
      tableName: testTableName,
      error: relationsData.error,
    });
    console.log('\n');

    // Test 6: Get sample values
    console.log(`📝 Test 6: Getting sample values for table ${testTableName}...`);
    const sampleValuesResult = await client.callTool({
      name: 'getSampleValues',
      arguments: {
        tableName: testTableName,
        sampleSize: 3,
      },
    });
    const sampleValuesData = parseToolPayload(sampleValuesResult);
    console.log(`Success: ${sampleValuesData.success}`);
    printToolError('Get Sample Values', sampleValuesData);
    if (sampleValuesData.success) {
      console.log('Sample values payload:', sampleValuesData.data);
    }
    results.push({
      test: 'Get Sample Values',
      success: sampleValuesData.success,
      tableName: testTableName,
      error: sampleValuesData.error,
    });
    console.log('\n');

    // Test 7: Suggest related tables
    console.log(`🔍 Test 7: Suggesting related tables for ${testTableName}...`);
    const suggestResult = await client.callTool({
      name: 'suggestRelatedTables',
      arguments: {
        tableName: testTableName,
        maxSuggestions: 5,
      },
    });
    const suggestData = parseToolPayload(suggestResult);
    console.log(`Success: ${suggestData.success}`);
    printToolError('Suggest Related Tables', suggestData);
    if (suggestData.success) {
      console.log('Suggestions payload:', suggestData.data);
    }
    results.push({
      test: 'Suggest Related Tables',
      success: suggestData.success,
      tableName: testTableName,
      error: suggestData.error,
    });
    console.log('\n');

    // Test 8: Test caching - call listTables again
    console.log('💾 Test 8: Testing cache (calling listTables again)...');
    const cachedListResult = await client.callTool({
      name: 'listTables',
      arguments: {
        includeRowCounts: false,
      },
    });
    const cachedListData = parseToolPayload(cachedListResult);
    console.log(`Success: ${cachedListData.success}`);
    printToolError('Cache Test', cachedListData);
    console.log(`Cached: ${cachedListData.cached || false} (should be true)`);
    results.push({
      test: 'Cache Test',
      success: cachedListData.success,
      cached: cachedListData.cached,
      error: cachedListData.error,
    });
    console.log('\n');

    console.log('✅ All discovery tool tests completed!');
    console.log('\n📊 Test Summary:');
    results.forEach((result, index) => {
      console.log(`${index + 1}. ${result.test}: ${result.success ? '✅' : '❌'}`);
    });

    const failedCount = results.filter((result) => result.success === false).length;
    if (failedCount > 0) {
      throw new Error(`${failedCount} discovery test(s) failed`);
    }

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
