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
import logger from './logging/logger.js';
import { getDatabaseSchema, GetSchemaSchema } from './tools/getSchema.js';
import { queryDatabase, QueryDatabaseSchema } from './tools/queryDatabase.js';

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
