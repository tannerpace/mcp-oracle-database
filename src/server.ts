#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import getConfig from './config.js';
import { closePool } from './database/oracleConnection.js';
import logger from './utils/logger.js';
import { getDatabaseSchema, GetSchemaSchema } from './tools/getSchema.js';
import { queryDatabase, QueryDatabaseSchema } from './tools/queryDatabase.js';
import {
  listTables,
  ListTablesSchema,
  describeTable,
  DescribeTableSchema,
  getTableRelations,
  GetTableRelationsSchema,
  getSampleValues,
  GetSampleValuesSchema,
  suggestRelatedTables,
  SuggestRelatedTablesSchema,
} from './tools/discovery/index.js';

const config = getConfig();

async function start() {
  logger.info('Starting MCP server', {
    name: config.SERVER_NAME,
    version: config.SERVER_VERSION,
  });

  // Create the MCP server
  const server = new Server(
    {
      name: config.SERVER_NAME,
      version: config.SERVER_VERSION,
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Define available tools
  const tools: Tool[] = [
    {
      name: 'query_database',
      description:
        'Execute a read-only SQL SELECT query against the Oracle database. Returns rows, column names, and execution metrics.',
      inputSchema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'The SQL query to execute (SELECT statements only)',
          },
          maxRows: {
            type: 'number',
            description: 'Maximum number of rows to return (optional)',
          },
          timeout: {
            type: 'number',
            description: 'Query timeout in milliseconds (optional)',
          },
        },
        required: ['query'],
      },
    },
    {
      name: 'get_database_schema',
      description:
        'Get database schema information. If tableName is provided, returns column details for that table. Otherwise, returns a list of all accessible tables.',
      inputSchema: {
        type: 'object',
        properties: {
          tableName: {
            type: 'string',
            description: 'Optional table name to get column information for',
          },
        },
      },
    },
    {
      name: 'listTables',
      description:
        'Get a summary of all accessible tables with optional row counts and modification timestamps. Includes table comments for semantic hints. Use this before querying to discover available tables.',
      inputSchema: {
        type: 'object',
        properties: {
          includeRowCounts: {
            type: 'boolean',
            description: 'Whether to include approximate row counts (slower but more informative)',
          },
        },
      },
    },
    {
      name: 'describeTable',
      description:
        'Get detailed column-level metadata for a specific table including data types, nullable constraints, default values, and column comments. Also returns table constraints like primary keys, foreign keys, and unique constraints.',
      inputSchema: {
        type: 'object',
        properties: {
          tableName: {
            type: 'string',
            description: 'Name of the table to describe',
          },
          includeConstraints: {
            type: 'boolean',
            description: 'Whether to include constraint information (default: true)',
          },
        },
        required: ['tableName'],
      },
    },
    {
      name: 'getTableRelations',
      description:
        'Get foreign key relationships for a table in an easily parseable JSON format. Returns both outgoing foreign keys (to other tables) and incoming references (from other tables). Helpful for understanding table relationships before writing JOIN queries.',
      inputSchema: {
        type: 'object',
        properties: {
          tableName: {
            type: 'string',
            description: 'Name of the table to get relationships for',
          },
        },
        required: ['tableName'],
      },
    },
    {
      name: 'getSampleValues',
      description:
        'Get sample values from table columns to understand data patterns and formats. Includes distinct counts and null counts. SAFETY: Strictly limited to max 10 rows per column to prevent resource exhaustion.',
      inputSchema: {
        type: 'object',
        properties: {
          tableName: {
            type: 'string',
            description: 'Name of the table to get sample values from',
          },
          columnNames: {
            type: 'array',
            items: { type: 'string' },
            description: 'Optional array of specific column names to sample (if omitted, samples all columns)',
          },
          sampleSize: {
            type: 'number',
            description: 'Number of sample rows to retrieve per column (1-10, default: 3)',
          },
        },
        required: ['tableName'],
      },
    },
    {
      name: 'suggestRelatedTables',
      description:
        'Suggest tables that may be related to the given table based on foreign keys, naming patterns, or shared columns. Returns suggestions with confidence scores and relationship descriptions. Useful for discovering relevant tables when building complex queries.',
      inputSchema: {
        type: 'object',
        properties: {
          tableName: {
            type: 'string',
            description: 'Name of the table to find related tables for',
          },
          maxSuggestions: {
            type: 'number',
            description: 'Maximum number of suggestions to return (1-20, default: 10)',
          },
        },
        required: ['tableName'],
      },
    },
  ];

  // Handle tools/list request
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    logger.debug('Handling tools/list request');
    return { tools };
  });

  // Handle tools/call request
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    logger.info('Tool called', { name, args });

    try {
      if (name === 'query_database') {
        const validated = QueryDatabaseSchema.parse(args);
        const result = await queryDatabase(validated);

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } else if (name === 'get_database_schema') {
        const validated = GetSchemaSchema.parse(args || {});
        const result = await getDatabaseSchema(validated);

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } else if (name === 'listTables') {
        const validated = ListTablesSchema.parse(args || {});
        const result = await listTables(validated);

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } else if (name === 'describeTable') {
        const validated = DescribeTableSchema.parse(args);
        const result = await describeTable(validated);

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } else if (name === 'getTableRelations') {
        const validated = GetTableRelationsSchema.parse(args);
        const result = await getTableRelations(validated);

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } else if (name === 'getSampleValues') {
        const validated = GetSampleValuesSchema.parse(args);
        const result = await getSampleValues(validated);

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } else if (name === 'suggestRelatedTables') {
        const validated = SuggestRelatedTablesSchema.parse(args);
        const result = await suggestRelatedTables(validated);

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } else {
        throw new Error(`Unknown tool: ${name}`);
      }
    } catch (error: any) {
      logger.error('Tool execution failed', { name, error: error.message });
      return {
        content: [
          {
            type: 'text' as const,
            text: `Error: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  });

  // Create stdio transport and connect
  const transport = new StdioServerTransport();
  await server.connect(transport);

  logger.info('MCP server connected via stdio');

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    logger.info('Shutting down gracefully (SIGINT)');
    await closePool();
    await server.close();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    logger.info('Shutting down gracefully (SIGTERM)');
    await closePool();
    await server.close();
    process.exit(0);
  });
}

start().catch((err) => {
  logger.error('Fatal error starting server', { error: err });
  process.exit(1);
});
