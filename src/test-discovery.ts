import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

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

  const results: any[] = [];

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
    const listTablesData = JSON.parse((listTablesResult as any).content[0].text);
    console.log(`Success: ${listTablesData.success}`);
    console.log(`Found ${listTablesData.data?.length || 0} tables`);
    console.log(`Cached: ${listTablesData.cached || false}`);
    if (listTablesData.data && listTablesData.data.length > 0) {
      console.log('Sample tables:');
      listTablesData.data.slice(0, 5).forEach((table: any) => {
        console.log(`  - ${table.tableName} (${table.tablespace || 'N/A'})`);
      });
    }
    results.push({
      test: 'List Tables (fast)',
      success: listTablesData.success,
      tableCount: listTablesData.data?.length || 0,
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
    const listTablesWithCountsData = JSON.parse((listTablesWithCountsResult as any).content[0].text);
    console.log(`Success: ${listTablesWithCountsData.success}`);
    console.log(`Found ${listTablesWithCountsData.data?.length || 0} tables`);
    if (listTablesWithCountsData.data && listTablesWithCountsData.data.length > 0) {
      console.log('Sample tables with row counts:');
      listTablesWithCountsData.data.slice(0, 5).forEach((table: any) => {
        console.log(`  - ${table.tableName}: ${table.rowCount} rows`);
      });
    }
    results.push({
      test: 'List Tables (with counts)',
      success: listTablesWithCountsData.success,
      tableCount: listTablesWithCountsData.data?.length || 0,
    });
    console.log('\n');

    // Get a table name for further tests
    let testTableName = 'HELP'; // Default fallback
    if (listTablesData.data && listTablesData.data.length > 0) {
      testTableName = listTablesData.data[0].tableName;
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
    const describeTableData = JSON.parse((describeTableResult as any).content[0].text);
    console.log(`Success: ${describeTableData.success}`);
    if (describeTableData.success && describeTableData.data) {
      console.log(`Table: ${describeTableData.data.tableName}`);
      console.log(`Columns: ${describeTableData.data.columns.length}`);
      console.log('Sample columns:');
      describeTableData.data.columns.slice(0, 5).forEach((col: any) => {
        console.log(`  - ${col.columnName}: ${col.dataType} (nullable: ${col.nullable})`);
      });
      if (describeTableData.data.constraints) {
        console.log(`Constraints: ${describeTableData.data.constraints.length}`);
      }
    }
    results.push({
      test: 'Describe Table',
      success: describeTableData.success,
      tableName: testTableName,
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
    const relationsData = JSON.parse((relationsResult as any).content[0].text);
    console.log(`Success: ${relationsData.success}`);
    if (relationsData.success && relationsData.data) {
      console.log(`Foreign Keys (outgoing): ${relationsData.data.foreignKeys.length}`);
      console.log(`Referenced By (incoming): ${relationsData.data.referencedBy.length}`);
      if (relationsData.data.foreignKeys.length > 0) {
        console.log('Sample FK:');
        const fk = relationsData.data.foreignKeys[0];
        console.log(`  ${fk.fromTable}(${fk.fromColumns.join(',')}) -> ${fk.toTable}(${fk.toColumns.join(',')})`);
      }
    }
    results.push({
      test: 'Get Table Relations',
      success: relationsData.success,
      tableName: testTableName,
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
    const sampleValuesData = JSON.parse((sampleValuesResult as any).content[0].text);
    console.log(`Success: ${sampleValuesData.success}`);
    if (sampleValuesData.success && sampleValuesData.data) {
      console.log(`Sampled ${sampleValuesData.data.length} columns`);
      console.log('Sample column data:');
      sampleValuesData.data.slice(0, 3).forEach((sample: any) => {
        console.log(`  - ${sample.columnName}:`);
        console.log(`    Values: ${JSON.stringify(sample.sampleValues).substring(0, 100)}`);
        if (sample.distinctCount !== undefined) {
          console.log(`    Distinct: ${sample.distinctCount}, Nulls: ${sample.nullCount}`);
        }
      });
    }
    results.push({
      test: 'Get Sample Values',
      success: sampleValuesData.success,
      tableName: testTableName,
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
    const suggestData = JSON.parse((suggestResult as any).content[0].text);
    console.log(`Success: ${suggestData.success}`);
    if (suggestData.success && suggestData.data) {
      console.log(`Found ${suggestData.data.length} related table suggestions`);
      suggestData.data.forEach((hint: any) => {
        console.log(`  - ${hint.tableName} (${hint.relationshipType}, confidence: ${hint.confidence})`);
        console.log(`    ${hint.description}`);
      });
    }
    results.push({
      test: 'Suggest Related Tables',
      success: suggestData.success,
      tableName: testTableName,
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
    const cachedListData = JSON.parse((cachedListResult as any).content[0].text);
    console.log(`Success: ${cachedListData.success}`);
    console.log(`Cached: ${cachedListData.cached || false} (should be true)`);
    results.push({
      test: 'Cache Test',
      success: cachedListData.success,
      cached: cachedListData.cached,
    });
    console.log('\n');

    console.log('✅ All discovery tool tests completed!');
    console.log('\n📊 Test Summary:');
    results.forEach((result, index) => {
      console.log(`${index + 1}. ${result.test}: ${result.success ? '✅' : '❌'}`);
    });

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
