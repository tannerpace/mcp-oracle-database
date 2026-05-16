import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

interface ToolCallContentItem {
  type: string;
  text?: string;
}

interface ToolCallResult {
  content: ToolCallContentItem[];
}

interface QueryToolPayload {
  success: boolean;
  error?: string;
  data?: {
    rowCount?: number;
    executionTime?: number;
    columns?: string[];
    rows?: Array<Record<string, unknown>>;
  };
}

function readQueryFromEnv(): string {
  const query = process.env.SQL_QUERY;
  if (!query || query.trim().length === 0) {
    throw new Error('SQL_QUERY is required. Provide it via VS Code task input.');
  }
  return query.trim();
}

function parsePayload(result: ToolCallResult): QueryToolPayload {
  const firstContent = result.content[0];
  if (!firstContent || typeof firstContent.text !== 'string') {
    throw new Error('Unexpected MCP response: missing text content');
  }

  const parsed = JSON.parse(firstContent.text) as unknown;
  if (!parsed || typeof parsed !== 'object' || !('success' in parsed)) {
    throw new Error('Unexpected MCP response payload');
  }

  return parsed as QueryToolPayload;
}

async function main(): Promise<void> {
  const query = readQueryFromEnv();

  const transport = new StdioClientTransport({
    command: 'node',
    args: ['dist/server.js'],
    stderr: 'inherit',
  });

  const client = new Client(
    {
      name: 'oracle-mcp-manual-query-client',
      version: '1.0.0',
    },
    {
      capabilities: {},
    }
  );

  try {
    console.log('Connecting to MCP server...');
    await client.connect(transport);
    console.log('Connected. Running query...');

    const rawResult = (await client.callTool({
      name: 'query_database',
      arguments: {
        query,
      },
    })) as ToolCallResult;

    const payload = parsePayload(rawResult);

    if (!payload.success) {
      console.error('Query failed:', payload.error || 'Unknown error');
      process.exitCode = 1;
      return;
    }

    const rowCount = payload.data?.rowCount ?? 0;
    const executionTime = payload.data?.executionTime ?? 0;
    console.log(`Rows: ${rowCount}`);
    console.log(`Execution time: ${executionTime}ms`);
    console.log(JSON.stringify(payload.data, null, 2));
  } finally {
    await client.close();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error('Manual query runner failed:', message);
  process.exit(1);
});
